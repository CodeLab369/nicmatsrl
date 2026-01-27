'use client';

import { useState } from 'react';
import { Menu, LogOut, User, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts';
import { ROUTES, USER_ROLES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Badge,
} from '@/components/ui';
import { Sidebar } from './sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return <Badge variant="default">Administrador</Badge>;
      case USER_ROLES.USER:
        return <Badge variant="secondary">Usuario</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-16 px-4 md:px-6">
          {/* Menú hamburguesa - siempre visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>

          {/* Título de la página (placeholder para breadcrumbs futuros) */}
          <div className="flex-1 xl:ml-0">
            {/* Espacio reservado para breadcrumbs o título dinámico */}
          </div>

          {/* Toggle de tema y Usuario */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 hover:bg-muted"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user ? getInitials(user.fullName) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    {user?.username}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.username}</p>
                  {user && getRoleBadge(user.role)}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={ROUTES.ADMIN_PROFILE} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mi Perfil
                </Link>
              </DropdownMenuItem>
              {user?.role === USER_ROLES.ADMIN && (
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.ADMIN_USERS} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Administración
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar móvil */}
      {mobileMenuOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sidebar */}
          <Sidebar
            className="animate-slide-in"
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </>
      )}
    </>
  );
}
