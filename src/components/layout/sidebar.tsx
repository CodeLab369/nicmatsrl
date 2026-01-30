'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  Battery,
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Users,
  UserCog,
  Store,
  TrendingUp,
  BarChart3,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useRealtimeContext, useTableSubscription } from '@/contexts';
import { COMPANY, ROUTES, USER_ROLES } from '@/lib/constants';
import { Separator, Badge } from '@/components/ui';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  permission?: 'inventario' | 'tiendas' | 'cotizaciones' | 'movimientos' | 'estadisticas';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Dashboard',
        href: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        title: 'Inventario',
        href: ROUTES.INVENTORY,
        icon: Package,
        permission: 'inventario',
      },
      {
        title: 'Tiendas',
        href: ROUTES.STORES,
        icon: Store,
        permission: 'tiendas',
      },
      {
        title: 'Cotizaciones',
        href: ROUTES.QUOTATIONS,
        icon: FileText,
        permission: 'cotizaciones',
      },
      {
        title: 'Movimientos',
        href: ROUTES.MOVEMENTS,
        icon: TrendingUp,
        permission: 'movimientos',
      },
      {
        title: 'Estadísticas',
        href: ROUTES.STATISTICS,
        icon: BarChart3,
        permission: 'estadisticas',
      },
    ],
  },
  {
    title: 'Administración',
    items: [
      {
        title: 'Usuarios',
        href: ROUTES.ADMIN_USERS,
        icon: Users,
        roles: [USER_ROLES.ADMIN],
      },
      {
        title: 'Mi Perfil',
        href: ROUTES.ADMIN_PROFILE,
        icon: UserCog,
      },
    ],
  },
];

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isConnected } = useRealtimeContext();
  const [stockBajoCount, setStockBajoCount] = useState(0);

  // Fetch alertas de stock bajo
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setStockBajoCount(data.stockBajo?.total || 0);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Actualizar alertas cuando cambie el inventario
  useTableSubscription('inventory', fetchAlerts);

  const isActiveLink = (href: string) => {
    if (href === ROUTES.DASHBOARD) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const hasAccess = (item: NavItem) => {
    // Verificar rol
    if (item.roles && (!user || !item.roles.includes(user.role))) {
      return false;
    }
    
    // Verificar permiso de módulo
    if (item.permission && user?.permissions) {
      return user.permissions[item.permission] === true;
    }
    
    // Si no tiene restricción de permiso, permitir acceso
    return true;
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-background border-r',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Battery className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-primary">{COMPANY.name}</span>
          <span className="text-xs text-muted-foreground">Sistema de Gestión</span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navigation.map((group, groupIndex) => (
          <div key={group.title} className={cn(groupIndex > 0 && 'mt-6')}>
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.filter(hasAccess).map((item) => {
                const Icon = item.icon;
                const isActive = isActiveLink(item.href);
                const showStockAlert = item.href === ROUTES.INVENTORY && stockBajoCount > 0;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {showStockAlert && (
                        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5">
                          {stockBajoCount}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-6 py-4 border-t">
        {/* Indicador de conexión */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">En vivo</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Conectando...</span>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {COMPANY.name} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
