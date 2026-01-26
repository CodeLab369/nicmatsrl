'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Battery,
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Users,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts';
import { COMPANY, ROUTES, USER_ROLES } from '@/lib/constants';
import { Separator } from '@/components/ui';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
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
      },
      {
        title: 'Cotizaciones',
        href: ROUTES.QUOTATIONS,
        icon: FileText,
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

  const isActiveLink = (href: string) => {
    if (href === ROUTES.DASHBOARD) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const hasAccess = (item: NavItem) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
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
                      <span>{item.title}</span>
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
        <p className="text-xs text-muted-foreground text-center">
          {COMPANY.name} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
