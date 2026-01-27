import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obtener configuración
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('empresa_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Si no hay configuración, devolver valores por defecto
    const config = data || {
      nombre: 'NICMAT S.R.L.',
      nit: '',
      direccion: '',
      ciudad: 'Bolivia',
      telefono_principal: '',
      telefono_secundario: '',
      telefono_adicional: '',
      email: '',
      logo: null,
      prefijo_cotizacion: 'COT',
      siguiente_numero: 1,
      pie_empresa: 'NICMAT S.R.L.',
      pie_agradecimiento: '¡Gracias por su preferencia!',
      pie_contacto: ''
    };

    return NextResponse.json({ config });

  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

// POST - Crear o actualizar configuración
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar si ya existe una configuración
    const { data: existing } = await supabase
      .from('empresa_config')
      .select('id')
      .limit(1)
      .single();

    let result;
    
    if (existing) {
      // Actualizar
      const { data, error } = await supabase
        .from('empresa_config')
        .update({
          ...body,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Crear
      const { data, error } = await supabase
        .from('empresa_config')
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ config: result, message: 'Configuración guardada' });

  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
