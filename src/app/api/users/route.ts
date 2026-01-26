import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar usuarios
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, role, is_active, last_login, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const users = (data || []).map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      role: u.role,
      isActive: u.is_active,
      lastLogin: u.last_login,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const { username, password, fullName, role } = await request.json();

    if (!username || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el username ya existe
    const { data: existingUser } = await supabase
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

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role,
        is_active: true,
      })
      .select('id, username, full_name, role, is_active, created_at')
      .single();

    if (userError) {
      console.error('User error:', userError);
      return NextResponse.json(
        { error: 'Error al crear el usuario' },
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

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Error al eliminar el usuario' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH - Actualizar usuario
export async function PATCH(request: NextRequest) {
  try {
    const { id, username, fullName, role, isActive, newPassword } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    // Verificar si el nuevo username ya está en uso
    if (username) {
      const { data: existingUser } = await supabase
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

    // Preparar datos de actualización
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (username) updateData.username = username;
    if (fullName) updateData.full_name = fullName;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Si hay nueva contraseña, hashearla
    if (newPassword) {
      updateData.password_hash = await bcrypt.hash(newPassword, 12);
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Error al actualizar el usuario' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
