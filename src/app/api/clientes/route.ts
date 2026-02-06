import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica y no se cachee
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar clientes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const search = searchParams.get('search') || '';
    const nombre = searchParams.get('nombre') || '';
    const telefono = searchParams.get('telefono') || '';
    const direccion = searchParams.get('direccion') || '';
    const getNombres = searchParams.get('getNombres') === 'true';
    const getTelefonos = searchParams.get('getTelefonos') === 'true';
    const getDirecciones = searchParams.get('getDirecciones') === 'true';
    const noPagination = searchParams.get('noPagination') === 'true';
    const searchCliente = searchParams.get('searchCliente') || '';

    // Búsqueda de clientes para autocompletado (Cotizaciones)
    if (searchCliente) {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, email, direccion')
        .ilike('nombre', `%${searchCliente}%`)
        .order('nombre')
        .limit(10);
      
      return NextResponse.json({ clientes: data || [] });
    }

    // Obtener nombres únicos para filtro
    if (getNombres) {
      const { data } = await supabase
        .from('clientes')
        .select('nombre')
        .order('nombre');
      const uniqueNombres = Array.from(new Set(data?.map(item => item.nombre) || []));
      return NextResponse.json({ nombres: uniqueNombres });
    }

    // Obtener teléfonos únicos para filtro
    if (getTelefonos) {
      const { data } = await supabase
        .from('clientes')
        .select('telefono')
        .neq('telefono', '')
        .order('telefono');
      const uniqueTelefonos = Array.from(new Set(data?.map(item => item.telefono).filter(Boolean) || []));
      return NextResponse.json({ telefonos: uniqueTelefonos });
    }

    // Obtener direcciones únicas para filtro
    if (getDirecciones) {
      const { data } = await supabase
        .from('clientes')
        .select('direccion')
        .neq('direccion', '')
        .order('direccion');
      const uniqueDirecciones = Array.from(new Set(data?.map(item => item.direccion).filter(Boolean) || []));
      return NextResponse.json({ direcciones: uniqueDirecciones });
    }

    const offset = (page - 1) * limit;

    // Función para aplicar filtros
    const applyFilters = (query: any) => {
      if (search) {
        query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%,email.ilike.%${search}%,direccion.ilike.%${search}%`);
      }
      if (nombre) {
        query = query.eq('nombre', nombre);
      }
      if (telefono) {
        query = query.eq('telefono', telefono);
      }
      if (direccion) {
        query = query.eq('direccion', direccion);
      }
      return query;
    };

    // Sin paginación (para exportación)
    if (noPagination) {
      let allQuery = supabase
        .from('clientes')
        .select('id, nombre, telefono, email, direccion, created_at');
      
      allQuery = applyFilters(allQuery);
      
      const { data: allItems, error: allError } = await allQuery.order('nombre');
      
      if (allError) throw allError;
      
      return NextResponse.json({
        items: allItems || [],
        total: (allItems || []).length,
      });
    }

    let query = supabase
      .from('clientes')
      .select('id, nombre, telefono, email, direccion, created_at, updated_at', { count: 'exact' });

    query = applyFilters(query);

    // Ejecutar queries en paralelo
    const [mainResult, statsResult] = await Promise.all([
      query.order('nombre', { ascending: true }).range(offset, offset + limit - 1),
      supabase.from('clientes').select('id, email, telefono, direccion')
    ]);

    if (mainResult.error) throw mainResult.error;

    const allClients = statsResult.data || [];
    const stats = {
      totalClientes: allClients.length,
      conEmail: allClients.filter((c: { email?: string }) => c.email && c.email.trim() !== '').length,
      conTelefono: allClients.filter((c: { telefono?: string }) => c.telefono && c.telefono.trim() !== '').length,
      conDireccion: allClients.filter((c: { direccion?: string }) => c.direccion && c.direccion.trim() !== '').length,
    };

    return NextResponse.json({
      items: mainResult.data || [],
      total: mainResult.count || 0,
      page,
      limit,
      totalPages: Math.ceil((mainResult.count || 0) / limit),
      stats,
    });
  } catch (error) {
    console.error('Error fetching clientes:', error);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST - Crear cliente o importación masiva
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Importación masiva
    if (Array.isArray(body)) {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('mode');

      // Normalizar datos del Excel
      const items = [];
      for (const item of body) {
        const nombre = (item.nombre || item.Nombre || '').toString().trim();
        if (nombre) {
          items.push({
            nombre,
            telefono: (item.telefono || item.Telefono || item['Teléfono'] || '').toString().trim(),
            email: (item.email || item.Email || '').toString().trim(),
            direccion: (item.direccion || item.Direccion || item['Dirección'] || '').toString().trim(),
          });
        }
      }

      if (items.length === 0) {
        return NextResponse.json({ error: 'No se encontraron clientes válidos en el archivo' }, { status: 400 });
      }

      // Modo análisis
      if (mode === 'analyze') {
        return NextResponse.json({
          success: true,
          analysis: {
            total: items.length,
            preview: items.slice(0, 10),
          }
        });
      }

      // Insertar en batch
      let insertedCount = 0;
      const chunkSize = 500;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('clientes')
          .insert(chunk)
          .select('id');
        if (error) throw error;
        insertedCount += data?.length || 0;
      }

      return NextResponse.json({ 
        success: true, 
        inserted: insertedCount,
        total: insertedCount
      });
    }

    // Cliente individual
    const { nombre, telefono, email, direccion } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: nombre.trim(),
        telefono: (telefono || '').trim(),
        email: (email || '').trim(),
        direccion: (direccion || '').trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, item: data });
  } catch (error) {
    console.error('Error creating cliente:', error);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}

// DELETE - Eliminar cliente(s)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'Todos los clientes eliminados' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting cliente:', error);
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
  }
}

// PATCH - Actualizar cliente
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nombre, telefono, email, direccion } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('clientes')
      .update({
        nombre: nombre?.trim(),
        telefono: (telefono || '').trim(),
        email: (email || '').trim(),
        direccion: (direccion || '').trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cliente:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
