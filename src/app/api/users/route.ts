import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente admin de Supabase con service_role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, fullName, role } = body;

    // Validar campos requeridos
    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Crear email basado en username
    const email = `${username.toLowerCase()}@nicmat.local`;

    // Verificar si el username ya existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'El nombre de usuario ya está en uso' },
        { status: 400 }
      );
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Error al crear el usuario en autenticación' },
        { status: 500 }
      );
    }

    // Crear usuario en la tabla users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authData.user.id,
        username,
        full_name: fullName,
        role,
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      console.error('User error:', userError);
      // Si falla, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Error al crear el perfil del usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Obtener el auth_id del usuario
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar de la tabla users
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar el usuario' },
        { status: 500 }
      );
    }

    // Eliminar de Supabase Auth
    if (user.auth_id) {
      await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, username, fullName, role, isActive, newPassword } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Obtener usuario actual
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el nuevo username ya está en uso por otro usuario
    if (username && username !== currentUser.username) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'El nombre de usuario ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Actualizar en la tabla users
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username: username || currentUser.username,
        full_name: fullName || currentUser.full_name,
        role: role || currentUser.role,
        is_active: isActive !== undefined ? isActive : currentUser.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Error al actualizar el usuario' },
        { status: 500 }
      );
    }

    // Si hay nueva contraseña, actualizarla en Auth
    if (newPassword && currentUser.auth_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        currentUser.auth_id,
        { password: newPassword }
      );

      if (authError) {
        console.error('Auth update error:', authError);
        // No fallar completamente, el usuario ya se actualizó
      }
    }

    // Si cambió el username, actualizar el email en Auth
    if (username && username !== currentUser.username && currentUser.auth_id) {
      const newEmail = `${username.toLowerCase()}@nicmat.local`;
      await supabaseAdmin.auth.admin.updateUserById(currentUser.auth_id, {
        email: newEmail,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
