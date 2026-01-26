import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login'];

// Rutas protegidas que requieren autenticación
const protectedRoutes = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Actualizar sesión de Supabase
  const response = await updateSession(request);

  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  
  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Si es la raíz, redirigir a login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
