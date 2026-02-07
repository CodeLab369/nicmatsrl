import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener operaciones de deuda + stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const tipo = searchParams.get('tipo');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Obtener saldo inicial
    const { data: config } = await supabase
      .from('deuda_config')
      .select('*')
      .limit(1)
      .single();

    const saldoInicial = parseFloat(config?.saldo_inicial) || 0;

    // Stats: totales por tipo
    const { data: allOps } = await supabase
      .from('deuda_operaciones')
      .select('tipo, importe');

    const totalDepositos = allOps?.filter(o => o.tipo === 'deposito').reduce((s, o) => s + parseFloat(o.importe), 0) || 0;
    const totalCamiones = allOps?.filter(o => o.tipo === 'camion').reduce((s, o) => s + parseFloat(o.importe), 0) || 0;
    const totalCompras = allOps?.filter(o => o.tipo === 'compra').reduce((s, o) => s + parseFloat(o.importe), 0) || 0;
    const saldoActual = saldoInicial + totalCompras - totalDepositos - totalCamiones;

    const countDepositos = allOps?.filter(o => o.tipo === 'deposito').length || 0;
    const countCamiones = allOps?.filter(o => o.tipo === 'camion').length || 0;
    const countCompras = allOps?.filter(o => o.tipo === 'compra').length || 0;

    // Operaciones paginadas
    let query = supabase
      .from('deuda_operaciones')
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
      saldo_inicial: saldoInicial,
      saldo_actual: saldoActual,
      stats: {
        total_depositos: totalDepositos,
        total_camiones: totalCamiones,
        total_compras: totalCompras,
        count_depositos: countDepositos,
        count_camiones: countCamiones,
        count_compras: countCompras,
      },
      operaciones: operaciones || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error en deuda GET:', error);
    return NextResponse.json({ error: 'Error al obtener datos de deuda' }, { status: 500 });
  }
}

// POST - Crear operación o actualizar saldo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Actualizar saldo inicial
    if (action === 'setSaldo') {
      const { saldo } = body;
      // Buscar config existente
      const { data: existing } = await supabase
        .from('deuda_config')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('deuda_config')
          .update({ saldo_inicial: saldo })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deuda_config')
          .insert({ saldo_inicial: saldo });
        if (error) throw error;
      }

      return NextResponse.json({ success: true, message: 'Saldo actualizado' });
    }

    // Crear operación
    const { tipo, detalle, entidad_financiera, metodo_pago, kilos, precio_unitario, importe } = body;

    if (!tipo || !['deposito', 'camion', 'compra'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de operación no válido' }, { status: 400 });
    }

    const finalImporte = tipo === 'camion'
      ? (parseFloat(kilos) || 0) * (parseFloat(precio_unitario) || 0)
      : parseFloat(importe) || 0;

    const { data, error } = await supabase
      .from('deuda_operaciones')
      .insert({
        tipo,
        detalle: detalle || '',
        entidad_financiera: entidad_financiera || '',
        metodo_pago: metodo_pago || '',
        kilos: parseFloat(kilos) || 0,
        precio_unitario: parseFloat(precio_unitario) || 0,
        importe: finalImporte,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error en deuda POST:', error);
    return NextResponse.json({ error: 'Error al crear operación' }, { status: 500 });
  }
}

// PATCH - Editar operación
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, tipo, detalle, entidad_financiera, metodo_pago, kilos, precio_unitario, importe } = body;

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (detalle !== undefined) updates.detalle = detalle;
    if (entidad_financiera !== undefined) updates.entidad_financiera = entidad_financiera;
    if (metodo_pago !== undefined) updates.metodo_pago = metodo_pago;
    if (kilos !== undefined) updates.kilos = parseFloat(kilos) || 0;
    if (precio_unitario !== undefined) updates.precio_unitario = parseFloat(precio_unitario) || 0;

    if (tipo === 'camion' && kilos !== undefined && precio_unitario !== undefined) {
      updates.importe = (parseFloat(kilos) || 0) * (parseFloat(precio_unitario) || 0);
    } else if (importe !== undefined) {
      updates.importe = parseFloat(importe) || 0;
    }

    const { data, error } = await supabase
      .from('deuda_operaciones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en deuda PATCH:', error);
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
      .from('deuda_operaciones')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en deuda DELETE:', error);
    return NextResponse.json({ error: 'Error al eliminar operación' }, { status: 500 });
  }
}
