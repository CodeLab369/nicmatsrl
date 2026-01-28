import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Actualizar presencia (heartbeat)
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 401 });
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
        session_id: session.sessionId || null,
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
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    const userId = session.userId;

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
