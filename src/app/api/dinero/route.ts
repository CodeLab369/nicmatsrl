import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener operaciones de dinero + stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // 1. Ventas Directas: cotizaciones convertidas (automático)
    const { data: cotizaciones } = await supabase
      .from('cotizaciones')
      .select('total')
      .eq('estado', 'convertida');

    const ventasDirectas = cotizaciones?.reduce((s, c) => s + (parseFloat(c.total) || 0), 0) || 0;
    const countVentas = cotizaciones?.length || 0;

    // 2. Stats de operaciones manuales
    const { data: allOps } = await supabase
      .from('dinero_operaciones')
      .select('tipo, importe');

    const totalIngresosTiendas = allOps?.filter(o => o.tipo === 'ingreso_tienda').reduce((s, o) => s + parseFloat(o.importe), 0) || 0;
    const totalSalidas = allOps?.filter(o => o.tipo === 'salida_efectivo').reduce((s, o) => s + parseFloat(o.importe), 0) || 0;
    const countIngresos = allOps?.filter(o => o.tipo === 'ingreso_tienda').length || 0;
    const countSalidas = allOps?.filter(o => o.tipo === 'salida_efectivo').length || 0;

    const balance = ventasDirectas + totalIngresosTiendas - totalSalidas;

    // 3. Operaciones paginadas
    let query = supabase
      .from('dinero_operaciones')
      .select('*', { count: 'exact' });

    if (tipo && tipo !== 'todos') {
      query = query.eq('tipo', tipo);
    }

    if (search) {
      query = query.ilike('detalle', `%${search}%`);
    }

    const { data: operaciones, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      ventas_directas: ventasDirectas,
      count_ventas: countVentas,
      balance,
      stats: {
        total_ingresos_tiendas: totalIngresosTiendas,
        total_salidas: totalSalidas,
        count_ingresos: countIngresos,
        count_salidas: countSalidas,
      },
      operaciones: operaciones || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error en dinero GET:', error);
    return NextResponse.json({ error: 'Error al obtener datos de dinero' }, { status: 500 });
  }
}

// POST - Crear operación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, detalle, tienda_id, tienda_nombre, importe } = body;

    if (!tipo || !['ingreso_tienda', 'salida_efectivo'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('dinero_operaciones')
      .insert({
        tipo,
        detalle: detalle || '',
        tienda_id: tienda_id || null,
        tienda_nombre: tienda_nombre || '',
        importe: parseFloat(importe) || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en dinero POST:', error);
    return NextResponse.json({ error: 'Error al crear operación' }, { status: 500 });
  }
}

// PATCH - Editar operación
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, detalle, tienda_id, tienda_nombre, importe } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (detalle !== undefined) updates.detalle = detalle;
    if (tienda_id !== undefined) updates.tienda_id = tienda_id || null;
    if (tienda_nombre !== undefined) updates.tienda_nombre = tienda_nombre;
    if (importe !== undefined) updates.importe = parseFloat(importe) || 0;

    const { data, error } = await supabase
      .from('dinero_operaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en dinero PATCH:', error);
    return NextResponse.json({ error: 'Error al actualizar operación' }, { status: 500 });
  }
}

// DELETE - Eliminar operación
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const { error } = await supabase
      .from('dinero_operaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en dinero DELETE:', error);
    return NextResponse.json({ error: 'Error al eliminar operación' }, { status: 500 });
  }
}
