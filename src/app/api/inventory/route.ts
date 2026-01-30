import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar inventario
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const search = searchParams.get('search') || '';
    const marca = searchParams.get('marca') || '';
    const amperaje = searchParams.get('amperaje') || '';
    const cantidadOp = searchParams.get('cantidadOp') || '';
    const cantidadVal = searchParams.get('cantidadVal') || '';
    const getMarcas = searchParams.get('getMarcas') === 'true';
    const getAmperajes = searchParams.get('getAmperajes') === 'true';
    const searchExact = searchParams.get('searchExact') === 'true';
    const minStock = searchParams.get('minStock');

    // Buscar producto exacto por marca y amperaje (para detección de existentes)
    if (searchExact && marca && amperaje) {
      const { data } = await supabase
        .from('inventory')
        .select('*')
        .ilike('marca', marca)
        .ilike('amperaje', amperaje)
        .limit(1);
      
      return NextResponse.json({ product: data?.[0] || null });
    }

    // Obtener marcas únicas
    if (getMarcas) {
      const { data } = await supabase
        .from('inventory')
        .select('marca')
        .order('marca');
      const uniqueMarcas = Array.from(new Set(data?.map(item => item.marca) || []));
      return NextResponse.json({ marcas: uniqueMarcas });
    }

    // Obtener amperajes por marca
    if (getAmperajes && marca) {
      const { data } = await supabase
        .from('inventory')
        .select('amperaje')
        .eq('marca', marca)
        .order('amperaje');
      const uniqueAmperajes = Array.from(new Set(data?.map(item => item.amperaje) || []));
      return NextResponse.json({ amperajes: uniqueAmperajes });
    }

    const offset = (page - 1) * limit;
    const noPagination = searchParams.get('noPagination') === 'true';

    // Función para aplicar filtros a una query
    const applyFilters = (query: any, includeMinStock = false) => {
      if (search) {
        query = query.or(`marca.ilike.%${search}%,amperaje.ilike.%${search}%`);
      }
      if (marca) {
        query = query.eq('marca', marca);
      }
      if (amperaje) {
        query = query.eq('amperaje', amperaje);
      }
      if (cantidadOp && cantidadVal) {
        const val = parseInt(cantidadVal);
        switch (cantidadOp) {
          case 'eq': query = query.eq('cantidad', val); break;
          case 'gt': query = query.gt('cantidad', val); break;
          case 'lt': query = query.lt('cantidad', val); break;
          case 'gte': query = query.gte('cantidad', val); break;
          case 'lte': query = query.lte('cantidad', val); break;
        }
      }
      // Filtro de stock mínimo (para transferencias)
      if (includeMinStock && minStock) {
        query = query.gte('cantidad', parseInt(minStock));
      }
      return query;
    };

    // Si es consulta sin paginación (para exportación o transferencias masivas)
    if (noPagination) {
      let allQuery = supabase
        .from('inventory')
        .select('id, marca, amperaje, cantidad, costo, precio_venta');
      
      // Aplicar TODOS los filtros también en modo sin paginación
      allQuery = applyFilters(allQuery, true);
      
      const { data: allItems, error: allError } = await allQuery.order('marca');
      
      if (allError) throw allError;
      
      // Obtener marcas únicas directamente
      const marcas = Array.from(new Set((allItems || []).map((i: { marca: string }) => i.marca))).sort();
      
      return NextResponse.json({
        items: allItems || [],
        total: (allItems || []).length,
        marcas
      });
    }

    let query = supabase
      .from('inventory')
      .select('id, marca, amperaje, cantidad, costo, precio_venta, created_at', { count: 'exact' });

    query = applyFilters(query, true);

    // Ejecutar queries en paralelo para máxima velocidad
    const [mainResult, statsResult, globalStatsResult] = await Promise.all([
      query.order('marca', { ascending: true }).order('amperaje', { ascending: true }).range(offset, offset + limit - 1),
      applyFilters(supabase.from('inventory').select('cantidad, costo, precio_venta'), false),
      supabase.from('inventory').select('cantidad, costo, precio_venta')
    ]);

    if (mainResult.error) throw mainResult.error;

    const statsData = statsResult.data || [];
    const stats = {
      productos: statsData.length,
      unidadesTotales: statsData.reduce((acc: number, item: { cantidad?: number }) => acc + (item.cantidad || 0), 0),
      costoTotal: statsData.reduce((acc: number, item: { cantidad?: number; costo?: number }) => acc + ((item.cantidad || 0) * (item.costo || 0)), 0),
      valorVenta: statsData.reduce((acc: number, item: { cantidad?: number; precio_venta?: number }) => acc + ((item.cantidad || 0) * (item.precio_venta || 0)), 0),
    };

    const globalStatsData = globalStatsResult.data || [];
    const totalProducts = globalStatsData.length;
    const totalUnits = globalStatsData.reduce((acc: number, item: { cantidad?: number }) => acc + (item.cantidad || 0), 0);
    const totalCost = globalStatsData.reduce((acc: number, item: { cantidad?: number; costo?: number }) => acc + ((item.cantidad || 0) * (item.costo || 0)), 0);
    const totalSaleValue = globalStatsData.reduce((acc: number, item: { cantidad?: number; precio_venta?: number }) => acc + ((item.cantidad || 0) * (item.precio_venta || 0)), 0);

    return NextResponse.json({
      items: mainResult.data || [],
      total: mainResult.count || 0,
      page,
      limit,
      totalPages: Math.ceil((mainResult.count || 0) / limit),
      stats,
      totalProducts,
      totalUnits,
      totalCost,
      totalSaleValue,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST - Crear producto o importación inteligente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Si es importación masiva inteligente
    if (Array.isArray(body)) {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('mode'); // 'analyze', 'import'
      const updateMode = searchParams.get('updateMode') || 'sum'; // 'sum' o 'replace'
      const updatePrices = searchParams.get('updatePrices') === 'true';

      // Normalizar datos del Excel
      const items = body.map(item => ({
        marca: (item.marca || item.Marca || '').toString().trim(),
        amperaje: (item.amperaje || item.Amperaje || '').toString().trim(),
        cantidad: parseInt(item.cantidad || item.Cantidad) || 0,
        costo: parseFloat(item.costo || item.Costo) || 0,
        precio_venta: parseFloat(item.precio_venta || item['Precio de Venta'] || item.PrecioVenta || item.precioVenta) || 0,
      })).filter(item => item.marca && item.amperaje);

      if (items.length === 0) {
        return NextResponse.json({ error: 'No se encontraron productos válidos en el archivo' }, { status: 400 });
      }

      // Obtener todos los productos existentes
      const { data: existing } = await supabase
        .from('inventory')
        .select('id, marca, amperaje, cantidad, costo, precio_venta');

      // Crear mapa de productos existentes (Marca + Amperaje como key)
      const existingMap = new Map();
      (existing || []).forEach(item => {
        const key = `${item.marca.toLowerCase()}|${item.amperaje.toLowerCase()}`;
        existingMap.set(key, item);
      });

      // Clasificar productos
      const newItems: any[] = [];
      const updateItems: any[] = [];

      items.forEach(item => {
        const key = `${item.marca.toLowerCase()}|${item.amperaje.toLowerCase()}`;
        const existingItem = existingMap.get(key);
        
        if (existingItem) {
          updateItems.push({
            ...item,
            existingId: existingItem.id,
            existingCantidad: existingItem.cantidad,
            existingCosto: existingItem.costo,
            existingPrecioVenta: existingItem.precio_venta,
          });
        } else {
          newItems.push(item);
        }
      });

      // Modo análisis: solo devolver información
      if (mode === 'analyze') {
        return NextResponse.json({
          success: true,
          analysis: {
            total: items.length,
            new: newItems.length,
            existing: updateItems.length,
            newItems: newItems.slice(0, 10), // Preview primeros 10
            updateItems: updateItems.slice(0, 10), // Preview primeros 10
          }
        });
      }

      // Modo importación: ejecutar cambios
      let insertedCount = 0;
      let updatedCount = 0;

      // Insertar nuevos productos
      if (newItems.length > 0) {
        const { data, error } = await supabase
          .from('inventory')
          .insert(newItems)
          .select();
        if (error) throw error;
        insertedCount = data?.length || 0;
      }

      // Actualizar productos existentes
      for (const item of updateItems) {
        const newCantidad = updateMode === 'sum' 
          ? item.existingCantidad + item.cantidad 
          : item.cantidad;

        const updateData: any = { cantidad: newCantidad };
        
        if (updatePrices) {
          updateData.costo = item.costo;
          updateData.precio_venta = item.precio_venta;
        }

        const { error } = await supabase
          .from('inventory')
          .update(updateData)
          .eq('id', item.existingId);

        if (!error) updatedCount++;
      }

      return NextResponse.json({ 
        success: true, 
        inserted: insertedCount,
        updated: updatedCount,
        total: insertedCount + updatedCount
      });
    }

    // Producto individual
    const { marca, amperaje, cantidad, costo, precioVenta } = body;

    if (!marca || !amperaje) {
      return NextResponse.json({ error: 'Marca y amperaje son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        marca,
        amperaje,
        cantidad: parseInt(cantidad) || 0,
        costo: parseFloat(costo) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

// DELETE - Eliminar producto(s)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      // Eliminar todo el inventario
      const { error } = await supabase
        .from('inventory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Truco para eliminar todo

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Inventario vaciado' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

// PATCH - Actualizar producto
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, marca, amperaje, cantidad, costo, precioVenta, onlyQuantity } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Si solo se actualiza cantidad (para ventas)
    if (onlyQuantity) {
      const { error } = await supabase
        .from('inventory')
        .update({
          cantidad: parseInt(cantidad) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Actualización completa
    const { error } = await supabase
      .from('inventory')
      .update({
        marca,
        amperaje,
        cantidad: parseInt(cantidad) || 0,
        costo: parseFloat(costo) || 0,
        precio_venta: parseFloat(precioVenta) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
