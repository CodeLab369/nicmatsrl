import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const offset = (page - 1) * limit;

    let query = supabase
      .from('inventory')
      .select('*', { count: 'exact' });

    // Búsqueda general
    if (search) {
      query = query.or(`marca.ilike.%${search}%,amperaje.ilike.%${search}%`);
    }

    // Filtro por marca
    if (marca) {
      query = query.ilike('marca', `%${marca}%`);
    }

    // Filtro por amperaje
    if (amperaje) {
      query = query.ilike('amperaje', `%${amperaje}%`);
    }

    // Filtro por cantidad
    if (cantidadOp && cantidadVal) {
      const val = parseInt(cantidadVal);
      switch (cantidadOp) {
        case 'eq':
          query = query.eq('cantidad', val);
          break;
        case 'gt':
          query = query.gt('cantidad', val);
          break;
        case 'lt':
          query = query.lt('cantidad', val);
          break;
        case 'gte':
          query = query.gte('cantidad', val);
          break;
        case 'lte':
          query = query.lte('cantidad', val);
          break;
      }
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Obtener estadísticas
    const { data: statsData } = await supabase
      .from('inventory')
      .select('cantidad, costo, precio_venta');

    const stats = {
      productos: statsData?.length || 0,
      unidadesTotales: statsData?.reduce((acc, item) => acc + (item.cantidad || 0), 0) || 0,
      costoTotal: statsData?.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.costo || 0)), 0) || 0,
      valorVenta: statsData?.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precio_venta || 0)), 0) || 0,
    };

    return NextResponse.json({
      items: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      stats,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Si es importación masiva
    if (Array.isArray(body)) {
      const items = body.map(item => ({
        marca: item.marca || item.Marca,
        amperaje: item.amperaje || item.Amperaje,
        cantidad: parseInt(item.cantidad || item.Cantidad) || 0,
        costo: parseFloat(item.costo || item.Costo) || 0,
        precio_venta: parseFloat(item.precio_venta || item['Precio de Venta'] || item.PrecioVenta) || 0,
      }));

      const { data, error } = await supabase
        .from('inventory')
        .insert(items)
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, count: data?.length });
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
    const { id, marca, amperaje, cantidad, costo, precioVenta } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

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
