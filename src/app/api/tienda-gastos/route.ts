import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Obtener gastos de tienda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tiendaId = searchParams.get('tiendaId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const categoria = searchParams.get('categoria');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const getCategorias = searchParams.get('getCategorias') === 'true';

    // Obtener categorías únicas de gastos (para sugerencias)
    if (getCategorias) {
      const { data } = await supabase
        .from('tienda_gastos')
        .select('categoria')
        .order('categoria');
      
      const categorias = Array.from(new Set(data?.map(g => g.categoria) || []));
      return NextResponse.json({ categorias });
    }

    if (!tiendaId) {
      return NextResponse.json({ error: 'tiendaId requerido' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    let query = supabase
      .from('tienda_gastos')
      .select('*', { count: 'exact' })
      .eq('tienda_id', tiendaId);

    if (fechaDesde) query = query.gte('fecha', fechaDesde);
    if (fechaHasta) query = query.lte('fecha', fechaHasta);
    if (categoria && categoria !== '_all') query = query.eq('categoria', categoria);

    const { data: gastos, count, error } = await query
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Calcular total de gastos del período
    let totalsQuery = supabase
      .from('tienda_gastos')
      .select('monto, categoria')
      .eq('tienda_id', tiendaId);

    if (fechaDesde) totalsQuery = totalsQuery.gte('fecha', fechaDesde);
    if (fechaHasta) totalsQuery = totalsQuery.lte('fecha', fechaHasta);
    if (categoria && categoria !== '_all') totalsQuery = totalsQuery.eq('categoria', categoria);

    const { data: totalsData } = await totalsQuery;

    const totalGastos = totalsData?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0;

    // Gastos por categoría
    const gastosPorCategoria: Record<string, number> = {};
    totalsData?.forEach(g => {
      gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.monto;
    });

    return NextResponse.json({
      gastos: gastos || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      totalGastos,
      gastosPorCategoria
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 });
  }
}

// POST - Registrar gasto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tiendaId, categoria, descripcion, monto, fecha } = body;

    if (!tiendaId || !categoria || !monto) {
      return NextResponse.json({ error: 'tiendaId, categoria y monto son requeridos' }, { status: 400 });
    }

    const { data: gasto, error } = await supabase
      .from('tienda_gastos')
      .insert({
        tienda_id: tiendaId,
        categoria: categoria.trim(),
        descripcion: descripcion?.trim() || null,
        monto: parseFloat(monto),
        fecha: fecha || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Gasto registrado correctamente',
      gasto
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al registrar gasto' }, { status: 500 });
  }
}

// PATCH - Actualizar gasto
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, categoria, descripcion, monto, fecha } = body;

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const updateData: any = {};
    if (categoria) updateData.categoria = categoria.trim();
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
    if (monto) updateData.monto = parseFloat(monto);
    if (fecha) updateData.fecha = fecha;

    const { error } = await supabase
      .from('tienda_gastos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Gasto actualizado'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 });
  }
}

// DELETE - Eliminar gasto
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tienda_gastos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Gasto eliminado'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 });
  }
}
