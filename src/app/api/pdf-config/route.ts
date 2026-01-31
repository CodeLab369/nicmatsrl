import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Forzar que esta ruta sea dinámica
export const dynamic = 'force-dynamic';

// GET - Obtener configuración de un módulo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modulo = searchParams.get('modulo');

    if (!modulo) {
      return NextResponse.json({ error: 'Módulo requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pdf_config')
      .select('config')
      .eq('modulo', modulo)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Si no existe, devolver config por defecto
    if (!data) {
      const defaultConfig = {
        titulo: 'INVENTARIO DE BATERÍAS',
        subtitulo: 'Listado completo de productos en stock',
        empresa: 'NICMAT S.R.L.',
        colorPrincipal: '#1a5f7a',
        mostrarCosto: true,
        mostrarPrecioVenta: true,
        mostrarTotales: true,
        mostrarFecha: true,
        mostrarLogo: true,
        itemsPorPagina: 25,
      };
      return NextResponse.json({ config: defaultConfig });
    }

    return NextResponse.json({ config: data.config });
  } catch (error) {
    console.error('Error obteniendo config:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// POST - Guardar configuración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modulo, config } = body;

    if (!modulo || !config) {
      return NextResponse.json({ error: 'Módulo y config requeridos' }, { status: 400 });
    }

    // Upsert - insertar o actualizar
    const { error } = await supabase
      .from('pdf_config')
      .upsert({
        modulo,
        config,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'modulo',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error guardando config:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}