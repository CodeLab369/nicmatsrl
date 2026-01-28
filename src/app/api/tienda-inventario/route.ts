import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener inventario de una tienda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiendaId = searchParams.get('tiendaId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const marca = searchParams.get('marca') || '';

    if (!tiendaId) {
      return NextResponse.json({ error: 'tiendaId requerido' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('tienda_inventario')
      .select('*', { count: 'exact' })
      .eq('tienda_id', tiendaId);

    if (search) {
      query = query.or(`marca.ilike.%${search}%,amperaje.ilike.%${search}%`);
    }
    if (marca && marca !== '_all') {
      query = query.eq('marca', marca);
    }

    const { data, error, count } = await query
      .order('marca', { ascending: true })
      .order('amperaje', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Estadísticas de la tienda (incluir marca para filtrar)
    const { data: allItems } = await supabase
      .from('tienda_inventario')
      .select('marca, cantidad, costo, precio_venta')
      .eq('tienda_id', tiendaId);

    const stats = {
      totalProductos: allItems?.length || 0,
      totalUnidades: allItems?.reduce((sum, i) => sum + (i.cantidad || 0), 0) || 0,
      valorCosto: allItems?.reduce((sum, i) => sum + ((i.cantidad || 0) * (i.costo || 0)), 0) || 0,
      valorVenta: allItems?.reduce((sum, i) => sum + ((i.cantidad || 0) * (i.precio_venta || 0)), 0) || 0,
    };

    // Obtener marcas únicas de la tienda
    const marcas = Array.from(new Set(allItems?.map(i => i.marca) || [])).filter(Boolean).sort();

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
      marcas
    });

  } catch (error) {
    console.error('Error fetching tienda inventario:', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST - Enviar productos a tienda (transferencia masiva desde inventario central)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiendaId, productos } = body;
    // productos: [{ inventoryId, marca, amperaje, cantidad, costo, precio_venta }]

    if (!tiendaId || !productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: 'tiendaId y productos son requeridos' }, { status: 400 });
    }

    const resultados = {
      exitosos: 0,
      errores: [] as string[],
    };

    for (const producto of productos) {
      try {
        // 1. Verificar stock en inventario central
        const { data: inventoryItem } = await supabase
          .from('inventory')
          .select('*')
          .eq('id', producto.inventoryId)
          .single();

        if (!inventoryItem || inventoryItem.cantidad < producto.cantidad) {
          resultados.errores.push(`${producto.marca} ${producto.amperaje}: Stock insuficiente`);
          continue;
        }

        // 2. Restar del inventario central
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ 
            cantidad: inventoryItem.cantidad - producto.cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', producto.inventoryId);

        if (updateError) {
          resultados.errores.push(`${producto.marca} ${producto.amperaje}: Error al actualizar inventario central`);
          continue;
        }

        // 3. Verificar si ya existe en la tienda
        const { data: existingItem } = await supabase
          .from('tienda_inventario')
          .select('*')
          .eq('tienda_id', tiendaId)
          .eq('marca', producto.marca)
          .eq('amperaje', producto.amperaje)
          .single();

        if (existingItem) {
          // Sumar cantidad existente
          const { error: tiendaUpdateError } = await supabase
            .from('tienda_inventario')
            .update({
              cantidad: existingItem.cantidad + producto.cantidad,
              costo: producto.costo || existingItem.costo,
              precio_venta: producto.precio_venta || existingItem.precio_venta,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingItem.id);

          if (tiendaUpdateError) {
            // Revertir el cambio en inventario central
            await supabase
              .from('inventory')
              .update({ cantidad: inventoryItem.cantidad })
              .eq('id', producto.inventoryId);
            resultados.errores.push(`${producto.marca} ${producto.amperaje}: Error al actualizar tienda`);
            continue;
          }
        } else {
          // Crear nuevo registro en tienda
          const { error: insertError } = await supabase
            .from('tienda_inventario')
            .insert({
              tienda_id: tiendaId,
              marca: producto.marca,
              amperaje: producto.amperaje,
              cantidad: producto.cantidad,
              costo: producto.costo || inventoryItem.costo,
              precio_venta: producto.precio_venta || inventoryItem.precio_venta,
            });

          if (insertError) {
            // Revertir el cambio en inventario central
            await supabase
              .from('inventory')
              .update({ cantidad: inventoryItem.cantidad })
              .eq('id', producto.inventoryId);
            resultados.errores.push(`${producto.marca} ${producto.amperaje}: Error al crear en tienda`);
            continue;
          }
        }

        resultados.exitosos++;
      } catch (err) {
        resultados.errores.push(`${producto.marca} ${producto.amperaje}: Error inesperado`);
      }
    }

    return NextResponse.json({
      message: `Transferencia completada: ${resultados.exitosos} productos enviados`,
      resultados
    });

  } catch (error) {
    console.error('Error en transferencia:', error);
    return NextResponse.json({ error: 'Error en la transferencia' }, { status: 500 });
  }
}

// PATCH - Actualizar producto en tienda
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, cantidad, costo, precio_venta, onlyQuantity } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    if (onlyQuantity) {
      const { error } = await supabase
        .from('tienda_inventario')
        .update({
          cantidad: parseInt(cantidad) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('tienda_inventario')
      .update({
        cantidad: parseInt(cantidad) || 0,
        costo: parseFloat(costo) || 0,
        precio_venta: parseFloat(precio_venta) || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating tienda inventario:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

// DELETE - Eliminar producto de tienda (devolver a inventario central)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const returnToInventory = searchParams.get('returnToInventory') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Obtener el item de la tienda
    const { data: tiendaItem } = await supabase
      .from('tienda_inventario')
      .select('*')
      .eq('id', id)
      .single();

    if (!tiendaItem) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Si se debe devolver al inventario central
    if (returnToInventory && tiendaItem.cantidad > 0) {
      const { data: inventoryItem } = await supabase
        .from('inventory')
        .select('*')
        .eq('marca', tiendaItem.marca)
        .eq('amperaje', tiendaItem.amperaje)
        .single();

      if (inventoryItem) {
        await supabase
          .from('inventory')
          .update({
            cantidad: inventoryItem.cantidad + tiendaItem.cantidad,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryItem.id);
      } else {
        // Crear nuevo en inventario central
        await supabase
          .from('inventory')
          .insert({
            marca: tiendaItem.marca,
            amperaje: tiendaItem.amperaje,
            cantidad: tiendaItem.cantidad,
            costo: tiendaItem.costo,
            precio_venta: tiendaItem.precio_venta,
          });
      }
    }

    // Eliminar de la tienda
    const { error } = await supabase
      .from('tienda_inventario')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ 
      message: returnToInventory 
        ? 'Producto devuelto al inventario central' 
        : 'Producto eliminado de la tienda' 
    });

  } catch (error) {
    console.error('Error deleting tienda inventario:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}
