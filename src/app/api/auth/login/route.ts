import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nicmat-srl-secret-key-2024'
);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario por username
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Actualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Crear JWT token
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(JWT_SECRET);

    // Preparar datos del usuario (sin password_hash)
    const userData = {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      permissions: user.permissions || { inventario: true, tiendas: true, cotizaciones: true },
    };

    // Crear respuesta con cookie
    const response = NextResponse.json({ success: true, user: userData });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
