'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth, useTableSubscription } from '@/contexts';
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
  ShoppingCart,
  CheckCircle,
  BarChart3,
  Store,
  UserCog,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

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

interface StockBajoAlert {
  total: number;
  agotados: number;
  bajos: number;
  productos: Array<{ id: string; marca: string; amperaje: string; cantidad: number }>;
  umbral: number;
}

interface MarcaData {
  marca: string;
  cantidad: number;
  valor: number;
}

interface CotizacionesPorEstado {
  name: string;
  value: number;
  color: string;
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
  const [stockBajo, setStockBajo] = useState<StockBajoAlert | null>(null);
  const [marcasData, setMarcasData] = useState<MarcaData[]>([]);
  const [cotizacionesEstado, setCotizacionesEstado] = useState<CotizacionesPorEstado[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch en paralelo para mayor velocidad
      const [invRes, cotRes, usersRes, alertsRes] = await Promise.all([
        fetch('/api/inventory?limit=1&_t=' + Date.now()),
        fetch('/api/cotizaciones?getStats=true&_t=' + Date.now()),
        fetch('/api/users?_t=' + Date.now()),
        fetch('/api/alerts?_t=' + Date.now()),
      ]);

      const [invData, cotData, usersData, alertsData] = await Promise.all([
        invRes.json(),
        cotRes.json(),
        usersRes.json(),
        alertsRes.json(),
      ]);
      
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

      setStockBajo(alertsData.stockBajo || null);

      // Datos para gráfico de cotizaciones por estado
      setCotizacionesEstado([
        { name: 'Pendientes', value: cotData.stats?.pendientes || 0, color: '#f59e0b' },
        { name: 'Aceptadas', value: cotData.stats?.aceptadas || 0, color: '#22c55e' },
        { name: 'Convertidas', value: cotData.stats?.convertidas || 0, color: '#3b82f6' },
        { name: 'Rechazadas', value: cotData.stats?.rechazadas || 0, color: '#ef4444' },
      ].filter(item => item.value > 0));

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch datos de marcas para el gráfico de barras
  const fetchMarcasData = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory?noPagination=true&_t=' + Date.now());
      const data = await res.json();
      
      if (data.items) {
        // Agrupar por marca
        const marcasMap = new Map<string, { cantidad: number; valor: number }>();
        
        data.items.forEach((item: { marca: string; cantidad: number; precio_venta: number }) => {
          const existing = marcasMap.get(item.marca) || { cantidad: 0, valor: 0 };
          marcasMap.set(item.marca, {
            cantidad: existing.cantidad + item.cantidad,
            valor: existing.valor + (item.cantidad * item.precio_venta),
          });
        });

        // Convertir a array y ordenar por cantidad
        const marcasArray: MarcaData[] = Array.from(marcasMap.entries())
          .map(([marca, data]) => ({ marca, ...data }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 8); // Top 8 marcas

        setMarcasData(marcasArray);
      }
    } catch (error) {
      console.error('Error fetching marcas data:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMarcasData();
  }, [fetchStats, fetchMarcasData]);

  // Realtime: actualizar cuando cambien las tablas principales
  useTableSubscription('inventory', () => { fetchStats(); fetchMarcasData(); });
  useTableSubscription('cotizaciones', fetchStats);
  useTableSubscription('users', fetchStats);
  useTableSubscription('tienda_ventas', fetchStats);

  const statsCards = [
    {
      title: 'Productos',
      value: loading ? '...' : stats.productos.toString(),
      description: `${stats.unidadesTotal} unidades totales`,
      icon: Package,
      color: 'text-blue-500 bg-blue-500/15 dark:bg-blue-500/20',
      href: '/dashboard/inventario',
      permission: 'inventario' as const,
    },
    {
      title: 'Cotizaciones',
      value: loading ? '...' : stats.cotizacionesTotal.toString(),
      description: `${stats.cotizacionesPendientes} pendientes`,
      icon: FileText,
      color: 'text-green-500 bg-green-500/15 dark:bg-green-500/20',
      href: '/dashboard/cotizaciones',
      permission: 'cotizaciones' as const,
    },
    {
      title: 'Usuarios',
      value: loading ? '...' : stats.usuarios.toString(),
      description: 'En el sistema',
      icon: Users,
      color: 'text-purple-500 bg-purple-500/15 dark:bg-purple-500/20',
      href: '/dashboard/admin/usuarios',
      adminOnly: true,
    },
    {
      title: 'Valor Inventario',
      value: loading ? '...' : formatCurrency(stats.valorInventario),
      description: `Venta: ${formatCurrency(stats.valorVenta)}`,
      icon: TrendingUp,
      color: 'text-amber-500 bg-amber-500/15 dark:bg-amber-500/20',
      href: '/dashboard/inventario',
      permission: 'inventario' as const,
    },
  ];

  // Filtrar stats según permisos
  const filteredStatsCards = statsCards.filter(stat => {
    if (stat.adminOnly) {
      return user?.role === 'admin';
    }
    if (stat.permission && user?.permissions) {
      return user.permissions[stat.permission] === true;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">
          ¡Bienvenido/a, {user?.fullName}!
        </h1>
        <p className="text-muted-foreground">
          Panel de control de {COMPANY.name} - {COMPANY.description}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStatsCards.map((stat) => {
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

      {/* Alerta de Stock Bajo */}
      {stockBajo && stockBajo.total > 0 && user?.permissions?.inventario && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-full bg-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                ¡Alerta de Stock!
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {stockBajo.agotados > 0 && <span className="font-medium">{stockBajo.agotados} productos agotados</span>}
                {stockBajo.agotados > 0 && stockBajo.bajos > 0 && ' y '}
                {stockBajo.bajos > 0 && <span>{stockBajo.bajos} con stock bajo (&lt;{stockBajo.umbral})</span>}
              </p>
            </div>
            <Link href="/dashboard/inventario">
              <span className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                Ver inventario <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Inventario por Marca */}
        {user?.permissions?.inventario && marcasData.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Inventario por Marca
              </CardTitle>
              <CardDescription>
                Distribución de unidades por marca (Top 8)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marcasData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis 
                      dataKey="marca" 
                      type="category" 
                      tick={{ fontSize: 11 }} 
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="cantidad" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Cotizaciones por Estado */}
        {user?.permissions?.cotizaciones && cotizacionesEstado.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Cotizaciones por Estado
              </CardTitle>
              <CardDescription>
                Distribución actual de cotizaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cotizacionesEstado}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                    >
                      {cotizacionesEstado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
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
              {user?.permissions?.inventario && (
                <Link href="/dashboard/inventario">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                    <Package className="h-8 w-8 text-primary mb-2" />
                    <span className="text-sm font-medium">Inventario</span>
                    <span className="text-xs text-muted-foreground">{stats.productos} productos</span>
                  </div>
                </Link>
              )}
              {user?.permissions?.cotizaciones && (
                <Link href="/dashboard/cotizaciones">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors cursor-pointer">
                    <FileText className="h-8 w-8 text-green-500 mb-2" />
                    <span className="text-sm font-medium">Cotizaciones</span>
                    <span className="text-xs text-muted-foreground">{stats.cotizacionesTotal} totales</span>
                  </div>
                </Link>
              )}
              {user?.permissions?.tiendas && (
                <Link href="/dashboard/tiendas">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer">
                    <ShoppingCart className="h-8 w-8 text-amber-500 mb-2" />
                    <span className="text-sm font-medium">Tiendas</span>
                    <span className="text-xs text-muted-foreground">Gestionar tiendas</span>
                  </div>
                </Link>
              )}
              {user?.permissions?.estadisticas && (
                <Link href="/dashboard/estadisticas">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors cursor-pointer">
                    <BarChart3 className="h-8 w-8 text-purple-500 mb-2" />
                    <span className="text-sm font-medium">Estadísticas</span>
                    <span className="text-xs text-muted-foreground">Análisis de ventas</span>
                  </div>
                </Link>
              )}
              {user?.permissions?.movimientos && (
                <Link href="/dashboard/movimientos">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors cursor-pointer">
                    <TrendingUp className="h-8 w-8 text-cyan-500 mb-2" />
                    <span className="text-sm font-medium">Movimientos</span>
                    <span className="text-xs text-muted-foreground">Control financiero</span>
                  </div>
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link href="/dashboard/admin/usuarios">
                  <div className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer">
                    <UserCog className="h-8 w-8 text-rose-500 mb-2" />
                    <span className="text-sm font-medium">Usuarios</span>
                    <span className="text-xs text-muted-foreground">Administrar accesos</span>
                  </div>
                </Link>
              )}
            </div>
            
            {/* Resumen de cotizaciones - solo si tiene permiso */}
            {user?.permissions?.cotizaciones && (
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
            )}
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
