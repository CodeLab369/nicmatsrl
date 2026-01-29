import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Obtener inventario de una tienda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiendaId = searchParams.get('tiendaId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const marca = searchParams.get('marca') || '';
    const amperaje = searchParams.get('amperaje') || '';
    const noPagination = searchParams.get('noPagination') === 'true';

    if (!tiendaId) {
      return NextResponse.json({ error: 'tiendaId requerido' }, { status: 400 });
    }

    // Si noPagination, traer todos los items sin paginación
    if (noPagination) {
      const { data: items, error } = await supabase
        .from('tienda_inventario')
        .select('id, tienda_id, marca, amperaje, cantidad, costo, precio_venta')
        .eq('tienda_id', tiendaId)
        .order('marca')
        .order('amperaje');

      if (error) throw error;

      return NextResponse.json({ items: items || [] });
    }

    const offset = (page - 1) * limit;

    // Query principal con filtros
    let query = supabase
      .from('tienda_inventario')
      .select('id, marca, amperaje, cantidad, costo, precio_venta', { count: 'exact' })
      .eq('tienda_id', tiendaId);

    if (marca && marca !== '_all') {
      query = query.eq('marca', marca);
    }
    if (amperaje && amperaje !== '_all') {
      query = query.eq('amperaje', amperaje);
    }

    // Ejecutar ambas queries en paralelo
    const [mainResult, allItemsResult] = await Promise.all([
      query.order('marca').order('amperaje').range(offset, offset + limit - 1),
      supabase
        .from('tienda_inventario')
        .select('marca, amperaje, cantidad, costo, precio_venta')
        .eq('tienda_id', tiendaId)
    ]);

    if (mainResult.error) throw mainResult.error;

    const allItems = allItemsResult.data || [];

    // Filtrar items para stats según filtros aplicados
    let filteredItems = allItems;
    if (marca && marca !== '_all') {
      filteredItems = filteredItems.filter(i => i.marca === marca);
    }
    if (amperaje && amperaje !== '_all') {
      filteredItems = filteredItems.filter(i => i.amperaje === amperaje);
    }

    // Stats basados en items filtrados
    const stats = {
      totalProductos: filteredItems.length,
      totalUnidades: filteredItems.reduce((sum, i) => sum + (i.cantidad || 0), 0),
      valorCosto: filteredItems.reduce((sum, i) => sum + ((i.cantidad || 0) * (i.costo || 0)), 0),
      valorVenta: filteredItems.reduce((sum, i) => sum + ((i.cantidad || 0) * (i.precio_venta || 0)), 0),
    };

    // Marcas únicas (sin filtrar)
    const marcas = Array.from(new Set(allItems.map(i => i.marca))).filter(Boolean).sort();
    
    // Amperajes filtrados por marca
    let amperajes: string[] = [];
    if (marca && marca !== '_all') {
      amperajes = Array.from(new Set(allItems.filter(i => i.marca === marca).map(i => i.amperaje))).filter(Boolean).sort() as string[];
    } else {
      amperajes = Array.from(new Set(allItems.map(i => i.amperaje))).filter(Boolean).sort() as string[];
    }

    return NextResponse.json({
      items: mainResult.data || [],
      total: mainResult.count || 0,
      page,
      totalPages: Math.ceil((mainResult.count || 0) / limit),
      stats,
      marcas,
      amperajes
    });

  } catch (error) {
    console.error('Error fetching tienda inventario:', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST - Enviar productos a tienda (transferencia masiva OPTIMIZADA)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiendaId, productos } = body;
    // productos: [{ inventoryId, marca, amperaje, cantidad, costo, precio_venta }]

    if (!tiendaId || !productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json({ error: 'tiendaId y productos son requeridos' }, { status: 400 });
    }

    // 1. Obtener todos los inventarios centrales necesarios en UNA sola consulta
    const inventoryIds = productos.map(p => p.inventoryId);
    const { data: inventoryItems } = await supabase
      .from('inventory')
      .select('*')
      .in('id', inventoryIds);

    const inventoryMap = new Map(inventoryItems?.map(i => [i.id, i]) || []);

    // 2. Obtener todos los items existentes en la tienda en UNA sola consulta
    const { data: existingTiendaItems } = await supabase
      .from('tienda_inventario')
      .select('*')
      .eq('tienda_id', tiendaId);

    const tiendaMap = new Map(
      existingTiendaItems?.map(i => [`${i.marca}-${i.amperaje}`, i]) || []
    );

    // 3. Preparar operaciones en batch
    const inventoryUpdates: { id: string; cantidad: number }[] = [];
    const tiendaInserts: any[] = [];
    const tiendaUpdates: { id: string; cantidad: number; costo: number; precio_venta: number }[] = [];
    const errores: string[] = [];
    let exitosos = 0;

    for (const producto of productos) {
      const inventoryItem = inventoryMap.get(producto.inventoryId);
      
      if (!inventoryItem || inventoryItem.cantidad < producto.cantidad) {
        errores.push(`${producto.marca} ${producto.amperaje}: Stock insuficiente`);
        continue;
      }

      // Preparar actualización de inventario central
      inventoryUpdates.push({
        id: producto.inventoryId,
        cantidad: inventoryItem.cantidad - producto.cantidad
      });

      // Verificar si existe en tienda
      const key = `${producto.marca}-${producto.amperaje}`;
      const existingItem = tiendaMap.get(key);

      if (existingItem) {
        tiendaUpdates.push({
          id: existingItem.id,
          cantidad: existingItem.cantidad + producto.cantidad,
          costo: producto.costo || existingItem.costo,
          precio_venta: producto.precio_venta || existingItem.precio_venta
        });
        // Actualizar el map para manejar duplicados en la misma transferencia
        tiendaMap.set(key, { ...existingItem, cantidad: existingItem.cantidad + producto.cantidad });
      } else {
        tiendaInserts.push({
          tienda_id: tiendaId,
          marca: producto.marca,
          amperaje: producto.amperaje,
          cantidad: producto.cantidad,
          costo: producto.costo || inventoryItem.costo,
          precio_venta: producto.precio_venta || inventoryItem.precio_venta,
        });
        // Agregar al map para manejar duplicados
        tiendaMap.set(key, { marca: producto.marca, amperaje: producto.amperaje, cantidad: producto.cantidad });
      }
      
      exitosos++;
    }

    // 4. Ejecutar todas las operaciones en paralelo
    const operations = [];

    // Actualizar inventario central (todas las updates en paralelo)
    if (inventoryUpdates.length > 0) {
      operations.push(
        Promise.all(inventoryUpdates.map(u => 
          supabase.from('inventory').update({ cantidad: u.cantidad, updated_at: new Date().toISOString() }).eq('id', u.id)
        ))
      );
    }

    // Insertar nuevos items en tienda (batch insert)
    if (tiendaInserts.length > 0) {
      operations.push(supabase.from('tienda_inventario').insert(tiendaInserts));
    }

    // Actualizar items existentes en tienda (todas las updates en paralelo)
    if (tiendaUpdates.length > 0) {
      operations.push(
        Promise.all(tiendaUpdates.map(u => 
          supabase.from('tienda_inventario').update({ 
            cantidad: u.cantidad, 
            costo: u.costo, 
            precio_venta: u.precio_venta,
            updated_at: new Date().toISOString() 
          }).eq('id', u.id)
        ))
      );
    }

    await Promise.all(operations);

    return NextResponse.json({
      message: `Transferencia completada: ${exitosos} productos enviados`,
      resultados: { exitosos, errores }
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

// DELETE - Eliminar producto de tienda (devolver a inventario central) OPTIMIZADO
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { tiendaId, returnAll, id, returnToInventory } = body;

    // Devolver TODO el inventario de una tienda (OPTIMIZADO)
    if (returnAll && tiendaId) {
      // 1. Obtener todos los items de la tienda en UNA consulta
      const { data: tiendaItems, error: fetchError } = await supabase
        .from('tienda_inventario')
        .select('*')
        .eq('tienda_id', tiendaId);

      if (fetchError) throw fetchError;

      if (!tiendaItems || tiendaItems.length === 0) {
        return NextResponse.json({ message: 'No hay inventario para devolver' });
      }

      // 2. Obtener todos los items del inventario central en UNA consulta
      const { data: inventoryItems } = await supabase
        .from('inventory')
        .select('*');

      const inventoryMap = new Map(
        inventoryItems?.map(i => [`${i.marca}-${i.amperaje}`, i]) || []
      );

      // 3. Preparar operaciones en batch
      const inventoryUpdates: { id: string; cantidad: number }[] = [];
      const inventoryInserts: any[] = [];

      for (const item of tiendaItems) {
        const key = `${item.marca}-${item.amperaje}`;
        const existingInventory = inventoryMap.get(key);

        if (existingInventory) {
          // Acumular cantidad si hay duplicados
          const existing = inventoryUpdates.find(u => u.id === existingInventory.id);
          if (existing) {
            existing.cantidad += item.cantidad;
          } else {
            inventoryUpdates.push({
              id: existingInventory.id,
              cantidad: existingInventory.cantidad + item.cantidad
            });
          }
        } else {
          // Verificar si ya está en inserts
          const existingInsert = inventoryInserts.find(
            i => i.marca === item.marca && i.amperaje === item.amperaje
          );
          if (existingInsert) {
            existingInsert.cantidad += item.cantidad;
          } else {
            inventoryInserts.push({
              marca: item.marca,
              amperaje: item.amperaje,
              cantidad: item.cantidad,
              costo: item.costo,
              precio_venta: item.precio_venta,
            });
          }
        }
      }

      // 4. Ejecutar todas las operaciones en paralelo
      const operations = [];

      // Updates en paralelo
      if (inventoryUpdates.length > 0) {
        operations.push(
          Promise.all(inventoryUpdates.map(u => 
            supabase.from('inventory').update({ 
              cantidad: u.cantidad, 
              updated_at: new Date().toISOString() 
            }).eq('id', u.id)
          ))
        );
      }

      // Batch insert
      if (inventoryInserts.length > 0) {
        operations.push(supabase.from('inventory').insert(inventoryInserts));
      }

      // Eliminar todo de la tienda en UNA operación
      operations.push(
        supabase.from('tienda_inventario').delete().eq('tienda_id', tiendaId)
      );

      await Promise.all(operations);

      return NextResponse.json({ 
        message: `Se devolvieron ${tiendaItems.length} productos al inventario principal`,
        devueltos: tiendaItems.length,
        errores: []
      });
    }

    // Eliminar un solo producto
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
