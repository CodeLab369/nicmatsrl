import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nicmat-srl-secret-key-2024'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Verificar JWT
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Obtener usuario actualizado de la base de datos
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, role, is_active, last_login, created_at, permissions')
      .eq('id', payload.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        permissions: user.permissions || { inventario: true, tiendas: true, cotizaciones: true, estadisticas: true },
      },
    });
  } catch (error) {
    // Token inválido o expirado
    return NextResponse.json({ user: null });
  }
}
