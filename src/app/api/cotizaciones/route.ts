import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar cotizaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const search = searchParams.get('search') || '';
    const estado = searchParams.get('estado') || '';
    const getStats = searchParams.get('getStats') === 'true';
    const id = searchParams.get('id') || '';

    // Obtener una cotización específica
    if (id) {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ cotizacion: data });
    }

    // Obtener estadísticas
    if (getStats) {
      const { data: all } = await supabase.from('cotizaciones').select('estado, total');
      
      const stats = {
        pendientes: all?.filter(c => c.estado === 'pendiente').length || 0,
        aceptadas: all?.filter(c => c.estado === 'aceptada').length || 0,
        convertidas: all?.filter(c => c.estado === 'convertida').length || 0,
        rechazadas: all?.filter(c => c.estado === 'rechazada').length || 0,
        total: all?.length || 0,
        valorTotal: all?.reduce((sum, c) => sum + parseFloat(c.total || 0), 0) || 0
      };
      
      return NextResponse.json({ stats });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('cotizaciones')
      .select('*', { count: 'exact' });

    // Filtros
    if (search) {
      query = query.or(`numero.ilike.%${search}%,cliente_nombre.ilike.%${search}%`);
    }
    if (estado && estado !== '_all') {
      query = query.eq('estado', estado);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      cotizaciones: data,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error fetching cotizaciones:', error);
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 });
  }
}

// POST - Crear cotización
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      cliente_nombre,
      cliente_telefono,
      cliente_email,
      cliente_direccion,
      productos,
      descuento = 0,
      vigencia_dias = 7,
      terminos
    } = body;

    // Calcular totales
    const total_unidades = productos.reduce((sum: number, p: any) => sum + (parseInt(p.cantidad) || 0), 0);
    const subtotal = productos.reduce((sum: number, p: any) => sum + (parseFloat(p.total) || 0), 0);
    const total = subtotal - (parseFloat(descuento) || 0);

    // Calcular fecha de vencimiento
    const fecha = new Date();
    const fecha_vencimiento = new Date(fecha);
    fecha_vencimiento.setDate(fecha_vencimiento.getDate() + vigencia_dias);

    const { data, error } = await supabase
      .from('cotizaciones')
      .insert({
        cliente_nombre,
        cliente_telefono,
        cliente_email,
        cliente_direccion,
        productos,
        total_unidades,
        subtotal,
        descuento: parseFloat(descuento) || 0,
        total,
        vigencia_dias,
        fecha_vencimiento: fecha_vencimiento.toISOString().split('T')[0],
        terminos,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ cotizacion: data, message: 'Cotización creada exitosamente' });

  } catch (error) {
    console.error('Error creating cotizacion:', error);
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 });
  }
}

// PATCH - Actualizar cotización (estado)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, estado, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const updates: any = { ...updateData, updated_at: new Date().toISOString() };
    if (estado) updates.estado = estado;

    const { data, error } = await supabase
      .from('cotizaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ cotizacion: data, message: 'Cotización actualizada' });

  } catch (error) {
    console.error('Error updating cotizacion:', error);
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 });
  }
}

// DELETE - Eliminar cotización
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('cotizaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Cotización eliminada' });

  } catch (error) {
    console.error('Error deleting cotizacion:', error);
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 });
  }
}
