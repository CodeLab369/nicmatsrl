import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar tiendas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const getAll = searchParams.get('getAll') === 'true';

    // Obtener una tienda específica
    if (id) {
      const { data, error } = await supabase
        .from('tiendas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json({ tienda: data });
    }

    // Obtener todas las tiendas (para selects)
    if (getAll) {
      const { data, error } = await supabase
        .from('tiendas')
        .select('id, nombre, tipo')
        .order('nombre', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ tiendas: data || [] });
    }

    // Listar con paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const tipo = searchParams.get('tipo') || '';
    const ciudad = searchParams.get('ciudad') || '';

    const offset = (page - 1) * limit;

    // Query principal
    let query = supabase
      .from('tiendas')
      .select('*', { count: 'exact' });

    if (tipo && tipo !== '_all') {
      query = query.eq('tipo', tipo);
    }
    if (ciudad && ciudad !== '_all') {
      query = query.eq('ciudad', ciudad);
    }

    // Ejecutar ambas queries en paralelo
    const [mainResult, statsResult] = await Promise.all([
      query.order('created_at', { ascending: false }).range(offset, offset + limit - 1),
      supabase.from('tiendas').select('tipo, ciudad')
    ]);

    if (mainResult.error) throw mainResult.error;

    const allTiendas = statsResult.data || [];
    const stats = {
      total: allTiendas.length,
      casaMatriz: allTiendas.filter(t => t.tipo === 'casa_matriz').length,
      sucursales: allTiendas.filter(t => t.tipo === 'sucursal').length,
    };

    // Ciudades únicas para el filtro
    const ciudades = Array.from(new Set(allTiendas.map(t => t.ciudad).filter(Boolean))).sort() as string[];

    return NextResponse.json({
      tiendas: mainResult.data || [],
      total: mainResult.count || 0,
      page,
      totalPages: Math.ceil((mainResult.count || 0) / limit),
      stats,
      ciudades
    });

  } catch (error) {
    console.error('Error fetching tiendas:', error);
    return NextResponse.json({ error: 'Error al obtener tiendas' }, { status: 500 });
  }
}

// POST - Crear tienda
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, tipo, encargado, ciudad, direccion } = body;

    if (!nombre || !tipo) {
      return NextResponse.json({ error: 'Nombre y tipo son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tiendas')
      .insert({
        nombre,
        tipo,
        encargado: encargado || null,
        ciudad: ciudad || null,
        direccion: direccion || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ tienda: data, message: 'Tienda creada exitosamente' });

  } catch (error) {
    console.error('Error creating tienda:', error);
    return NextResponse.json({ error: 'Error al crear tienda' }, { status: 500 });
  }
}

// PATCH - Actualizar tienda
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tiendas')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ tienda: data, message: 'Tienda actualizada' });

  } catch (error) {
    console.error('Error updating tienda:', error);
    return NextResponse.json({ error: 'Error al actualizar tienda' }, { status: 500 });
  }
}

// DELETE - Eliminar tienda
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Primero eliminar inventario de la tienda
    await supabase
      .from('tienda_inventario')
      .delete()
      .eq('tienda_id', id);

    // Luego eliminar la tienda
    const { error } = await supabase
      .from('tiendas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Tienda eliminada' });

  } catch (error) {
    console.error('Error deleting tienda:', error);
    return NextResponse.json({ error: 'Error al eliminar tienda' }, { status: 500 });
  }
}
