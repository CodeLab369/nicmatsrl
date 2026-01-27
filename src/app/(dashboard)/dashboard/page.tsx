'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts';
import { COMPANY } from '@/lib/constants';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import {
  Package,
  FileText,
  Users,
  TrendingUp,
  Battery,
  Clock,
  ArrowRight,
  ShoppingCart,
  CheckCircle,
} from 'lucide-react';

interface DashboardStats {
  productos: number;
  unidadesTotal: number;
  valorInventario: number;
  valorVenta: number;
  cotizacionesTotal: number;
  cotizacionesMes: number;
  cotizacionesPendientes: number;
  cotizacionesAceptadas: number;
  usuarios: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    productos: 0,
    unidadesTotal: 0,
    valorInventario: 0,
    valorVenta: 0,
    cotizacionesTotal: 0,
    cotizacionesMes: 0,
    cotizacionesPendientes: 0,
    cotizacionesAceptadas: 0,
    usuarios: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch inventario stats
      const invRes = await fetch('/api/inventory?limit=1');
      const invData = await invRes.json();
      
      // Fetch cotizaciones stats
      const cotRes = await fetch('/api/cotizaciones?getStats=true');
      const cotData = await cotRes.json();
      
      // Fetch usuarios count
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      
      setStats({
        productos: invData.totalProducts || 0,
        unidadesTotal: invData.totalUnits || 0,
        valorInventario: invData.totalCost || 0,
        valorVenta: invData.totalSaleValue || 0,
        cotizacionesTotal: cotData.stats?.total || 0,
        cotizacionesMes: cotData.stats?.total || 0,
        cotizacionesPendientes: cotData.stats?.pendientes || 0,
        cotizacionesAceptadas: cotData.stats?.aceptadas || 0,
        usuarios: usersData.users?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statsCards = [
    {
      title: 'Productos',
      value: loading ? '...' : stats.productos.toString(),
      description: `${stats.unidadesTotal} unidades totales`,
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
      href: '/dashboard/inventario',
    },
    {
      title: 'Cotizaciones',
      value: loading ? '...' : stats.cotizacionesTotal.toString(),
      description: `${stats.cotizacionesPendientes} pendientes`,
      icon: FileText,
      color: 'text-green-600 bg-green-100',
      href: '/dashboard/cotizaciones',
    },
    {
      title: 'Usuarios',
      value: loading ? '...' : stats.usuarios.toString(),
      description: 'En el sistema',
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
      href: '/dashboard/admin/usuarios',
    },
    {
      title: 'Valor Inventario',
      value: loading ? '...' : formatCurrency(stats.valorInventario),
      description: `Venta: ${formatCurrency(stats.valorVenta)}`,
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100',
      href: '/dashboard/inventario',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">
          ¡Bienvenido, {user?.fullName}!
        </h1>
        <p className="text-muted-foreground">
          Panel de control de {COMPANY.name} - {COMPANY.description}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="shadow-soft hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accesos rápidos */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-primary" />
              Accesos Rápidos
            </CardTitle>
            <CardDescription>
              Accede rápidamente a las funciones principales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/dashboard/inventario">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                  <Package className="h-8 w-8 text-primary mb-2" />
                  <span className="text-sm font-medium">Inventario</span>
                  <span className="text-xs text-muted-foreground">{stats.productos} productos</span>
                </div>
              </Link>
              <Link href="/dashboard/cotizaciones">
                <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-green-500/20 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium">Cotizaciones</span>
                  <span className="text-xs text-muted-foreground">{stats.cotizacionesTotal} totales</span>
                </div>
              </Link>
            </div>
            
            {/* Resumen de cotizaciones */}
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Estado de Cotizaciones</h4>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{stats.cotizacionesPendientes} Pendientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{stats.cotizacionesAceptadas} Aceptadas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información del sistema */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Información de Sesión
            </CardTitle>
            <CardDescription>
              Detalles de tu sesión actual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Usuario</span>
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Nombre</span>
              <span className="text-sm font-medium">{user?.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Rol</span>
              <span className="text-sm font-medium capitalize">{user?.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Último acceso</span>
              <span className="text-sm font-medium">
                {user?.lastLogin ? formatDateTime(user.lastLogin) : 'Primera sesión'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Moneda</span>
              <span className="text-sm font-medium">{COMPANY.currency} ({COMPANY.currencyCode})</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
