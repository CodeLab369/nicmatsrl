import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar envíos pendientes de una tienda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiendaId = searchParams.get('tiendaId');
    const envioId = searchParams.get('envioId');
    const estado = searchParams.get('estado');

    // Si se pide un envío específico con sus items
    if (envioId) {
      const { data: envio, error: envioError } = await supabase
        .from('tienda_envios')
        .select('*')
        .eq('id', envioId)
        .single();

      if (envioError) throw envioError;

      const { data: items, error: itemsError } = await supabase
        .from('tienda_envio_items')
        .select('*')
        .eq('envio_id', envioId)
        .order('marca', { ascending: true });

      if (itemsError) throw itemsError;

      return NextResponse.json({ envio, items });
    }

    // Listar envíos de una tienda
    if (!tiendaId) {
      return NextResponse.json({ error: 'tiendaId es requerido' }, { status: 400 });
    }

    let query = supabase
      .from('tienda_envios')
      .select('*')
      .eq('tienda_id', tiendaId)
      .order('created_at', { ascending: false });

    if (estado && estado !== '_all') {
      query = query.eq('estado', estado);
    }

    const { data: envios, error } = await query;

    if (error) throw error;

    return NextResponse.json({ envios });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al obtener envíos' }, { status: 500 });
  }
}

// POST - Crear nuevo envío pendiente
export async function POST(request: NextRequest) {
  try {
    const { tiendaId, productos, createdBy } = await request.json();

    if (!tiendaId || !productos || productos.length === 0) {
      return NextResponse.json(
        { error: 'tiendaId y productos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar stock disponible antes de crear el envío
    const inventoryIds = productos.map((p: { inventoryId: string }) => p.inventoryId);
    const { data: stockActual, error: stockError } = await supabase
      .from('inventory')
      .select('id, cantidad, marca, amperaje')
      .in('id', inventoryIds);

    if (stockError) throw stockError;

    const stockMap = new Map(stockActual?.map(s => [s.id, s]) || []);
    const errores: string[] = [];

    for (const prod of productos) {
      const stock = stockMap.get(prod.inventoryId);
      if (!stock) {
        errores.push(`Producto ${prod.marca} ${prod.amperaje} no encontrado`);
      } else if (stock.cantidad < prod.cantidad) {
        errores.push(`${prod.marca} ${prod.amperaje}: stock insuficiente (disponible: ${stock.cantidad}, solicitado: ${prod.cantidad})`);
      }
    }

    if (errores.length > 0) {
      return NextResponse.json({ error: errores.join('. ') }, { status: 400 });
    }

    // Crear el envío
    const totalProductos = productos.length;
    const totalUnidades = productos.reduce((sum: number, p: { cantidad: number }) => sum + p.cantidad, 0);

    const { data: envio, error: envioError } = await supabase
      .from('tienda_envios')
      .insert({
        tienda_id: tiendaId,
        estado: 'pendiente',
        total_productos: totalProductos,
        total_unidades: totalUnidades,
        created_by: createdBy || null
      })
      .select()
      .single();

    if (envioError) throw envioError;

    // Crear los items del envío
    const items = productos.map((p: {
      inventoryId: string;
      marca: string;
      amperaje: string;
      cantidad: number;
      costo: number;
      precio_venta: number;
    }) => ({
      envio_id: envio.id,
      inventory_id: p.inventoryId,
      marca: p.marca,
      amperaje: p.amperaje,
      cantidad: p.cantidad,
      costo_original: p.costo,
      precio_venta_original: p.precio_venta,
      precio_tienda: null
    }));

    const { error: itemsError } = await supabase
      .from('tienda_envio_items')
      .insert(items);

    if (itemsError) throw itemsError;

    // Restar del inventario principal inmediatamente
    for (const prod of productos) {
      const stock = stockMap.get(prod.inventoryId);
      if (stock) {
        await supabase
          .from('inventory')
          .update({ cantidad: stock.cantidad - prod.cantidad })
          .eq('id', prod.inventoryId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Envío creado con ${totalProductos} productos (${totalUnidades} unidades)`,
      envio
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al crear envío' }, { status: 500 });
  }
}

// PATCH - Actualizar envío (importar precios o cambiar estado)
export async function PATCH(request: NextRequest) {
  try {
    const { envioId, action, items, estado } = await request.json();

    if (!envioId) {
      return NextResponse.json({ error: 'envioId es requerido' }, { status: 400 });
    }

    // Acción: importar precios
    if (action === 'importar_precios' && items) {
      // Actualizar precios de los items
      for (const item of items) {
        if (item.id && item.precio_tienda !== undefined) {
          await supabase
            .from('tienda_envio_items')
            .update({ precio_tienda: item.precio_tienda })
            .eq('id', item.id);
        }
      }

      // Verificar si todos tienen precio asignado
      const { data: allItems } = await supabase
        .from('tienda_envio_items')
        .select('precio_tienda')
        .eq('envio_id', envioId);

      const todosConPrecio = allItems?.every(i => i.precio_tienda !== null);

      if (todosConPrecio) {
        await supabase
          .from('tienda_envios')
          .update({ estado: 'precios_asignados' })
          .eq('id', envioId);
      }

      return NextResponse.json({ success: true, message: 'Precios importados correctamente' });
    }

    // Acción: confirmar envío (mover a inventario de tienda)
    if (action === 'confirmar') {
      // Obtener el envío y sus items
      const { data: envio, error: envioError } = await supabase
        .from('tienda_envios')
        .select('*, tienda_id')
        .eq('id', envioId)
        .single();

      if (envioError || !envio) {
        return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
      }

      if (envio.estado === 'completado') {
        return NextResponse.json({ error: 'Este envío ya fue completado' }, { status: 400 });
      }

      const { data: items, error: itemsError } = await supabase
        .from('tienda_envio_items')
        .select('*')
        .eq('envio_id', envioId);

      if (itemsError) throw itemsError;

      // Verificar que todos los items tengan precio asignado
      const sinPrecio = items?.filter(i => i.precio_tienda === null);
      if (sinPrecio && sinPrecio.length > 0) {
        return NextResponse.json({
          error: `Hay ${sinPrecio.length} productos sin precio asignado. Importa los precios primero.`
        }, { status: 400 });
      }

      // Mover cada item al inventario de la tienda
      for (const item of items || []) {
        // Verificar si ya existe en el inventario de la tienda
        const { data: existing } = await supabase
          .from('tienda_inventario')
          .select('id, cantidad')
          .eq('tienda_id', envio.tienda_id)
          .eq('marca', item.marca)
          .eq('amperaje', item.amperaje)
          .single();

        if (existing) {
          // Actualizar cantidad y precio
          await supabase
            .from('tienda_inventario')
            .update({
              cantidad: existing.cantidad + item.cantidad,
              precio_venta: item.precio_tienda,
              costo: item.costo_original
            })
            .eq('id', existing.id);
        } else {
          // Crear nuevo registro
          await supabase
            .from('tienda_inventario')
            .insert({
              tienda_id: envio.tienda_id,
              marca: item.marca,
              amperaje: item.amperaje,
              cantidad: item.cantidad,
              costo: item.costo_original,
              precio_venta: item.precio_tienda
            });
        }
      }

      // Marcar envío como completado
      await supabase
        .from('tienda_envios')
        .update({ estado: 'completado', completado_at: new Date().toISOString() })
        .eq('id', envioId);

      return NextResponse.json({
        success: true,
        message: `Envío completado. ${items?.length} productos agregados al inventario de la tienda.`
      });
    }

    // Cambiar estado manualmente
    if (estado) {
      await supabase
        .from('tienda_envios')
        .update({ estado })
        .eq('id', envioId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al actualizar envío' }, { status: 500 });
  }
}

// DELETE - Cancelar/eliminar envío y devolver stock
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envioId = searchParams.get('envioId');

    if (!envioId) {
      return NextResponse.json({ error: 'envioId es requerido' }, { status: 400 });
    }

    // Obtener el envío
    const { data: envio, error: envioError } = await supabase
      .from('tienda_envios')
      .select('*')
      .eq('id', envioId)
      .single();

    if (envioError || !envio) {
      return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 });
    }

    if (envio.estado === 'completado') {
      return NextResponse.json({ error: 'No se puede eliminar un envío completado' }, { status: 400 });
    }

    // Obtener los items para devolver al inventario
    const { data: items } = await supabase
      .from('tienda_envio_items')
      .select('*')
      .eq('envio_id', envioId);

    // Devolver stock al inventario principal
    for (const item of items || []) {
      if (item.inventory_id) {
        const { data: stock } = await supabase
          .from('inventory')
          .select('cantidad')
          .eq('id', item.inventory_id)
          .single();

        if (stock) {
          await supabase
            .from('inventory')
            .update({ cantidad: stock.cantidad + item.cantidad })
            .eq('id', item.inventory_id);
        }
      }
    }

    // Eliminar el envío (cascade elimina los items)
    await supabase
      .from('tienda_envios')
      .delete()
      .eq('id', envioId);

    return NextResponse.json({
      success: true,
      message: `Envío cancelado. ${items?.length || 0} productos devueltos al inventario.`
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al eliminar envío' }, { status: 500 });
  }
}
