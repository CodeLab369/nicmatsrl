import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nicmat-srl-secret-key-2024'
);

// POST - Actualizar presencia (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    
    // Si no hay token, simplemente retornar ok sin hacer nada
    if (!authToken?.value) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(authToken.value, JWT_SECRET);
      userId = payload.userId as string;
    } catch {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!userId) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Verificar que el usuario esté activo
    const { data: user } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single();

    if (!user || !user.is_active) {
      // Usuario inactivo, eliminar presencia y cookie
      await supabase.from('user_presence').delete().eq('user_id', userId);
      
      // Devolver señal para cerrar sesión
      return NextResponse.json({ 
        error: 'Usuario desactivado', 
        forceLogout: true 
      }, { status: 403 });
    }

    // Upsert presencia
    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        is_online: true,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Presence error:', error);
      return NextResponse.json({ error: 'Error al actualizar presencia' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isActive: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Marcar como offline (logout o cierre de ventana)
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');
    
    if (!authToken?.value) {
      return NextResponse.json({ ok: true });
    }

    let userId: string;
    try {
      const { payload } = await jwtVerify(authToken.value, JWT_SECRET);
      userId = payload.userId as string;
    } catch {
      return NextResponse.json({ ok: true });
    }

    if (userId) {
      await supabase
        .from('user_presence')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
