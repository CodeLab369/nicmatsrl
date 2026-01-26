'use client';

import { useAuth } from '@/contexts';
import { COMPANY } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
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
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Productos en Inventario',
      value: '0',
      description: 'Total de productos',
      icon: Package,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Cotizaciones',
      value: '0',
      description: 'Este mes',
      icon: FileText,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Usuarios Activos',
      value: '1',
      description: 'En el sistema',
      icon: Users,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Valor del Inventario',
      value: 'Bs. 0,00',
      description: 'Valor total',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-100',
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
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-soft">
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
              <button className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-colors">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Inventario</span>
                <span className="text-xs text-muted-foreground">Próximamente</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 transition-colors">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Cotizaciones</span>
                <span className="text-xs text-muted-foreground">Próximamente</span>
              </button>
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
              <span className="text-sm font-medium">@{user?.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Rol</span>
              <span className="text-sm font-medium capitalize">{user?.role}</span>
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
