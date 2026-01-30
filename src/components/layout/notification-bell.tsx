'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Trash2, AlertTriangle, Clock, FileText, Truck, UserCheck, Package } from 'lucide-react';
import { useNotificationContext } from '@/contexts';
import { AppNotification } from '@/hooks/use-notifications';
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// Íconos por tipo de notificación
const notificationIcons: Record<AppNotification['type'], { icon: typeof Bell; color: string }> = {
  stockAgotado: { icon: AlertTriangle, color: 'text-red-500' },
  stockBajo: { icon: AlertTriangle, color: 'text-amber-500' },
  cotizacionPorVencer: { icon: Clock, color: 'text-orange-500' },
  nuevaCotizacion: { icon: FileText, color: 'text-blue-500' },
  cotizacionEstado: { icon: FileText, color: 'text-green-500' },
  envioTienda: { icon: Truck, color: 'text-purple-500' },
  usuarioConectado: { icon: UserCheck, color: 'text-gray-500' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${diffDays}d`;
}

export function NotificationBell() {
  const {
    isSupported,
    permission,
    requestPermission,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotificationContext();

  const [isOpen, setIsOpen] = useState(false);

  // Solicitar permiso al abrir si no está concedido
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && permission === 'default') {
      await requestPermission();
    }
  };

  // Marcar como leída al hacer clic
  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.read) {
      markAsRead(notif.id);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {permission === 'denied' ? (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-hidden flex flex-col">
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="font-semibold">Notificaciones</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
              >
                <Check className="h-3 w-3 mr-1" />
                Leer todo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  clearNotifications();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Estado del permiso */}
        {!isSupported && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            Tu navegador no soporta notificaciones
          </div>
        )}
        
        {isSupported && permission === 'denied' && (
          <div className="p-3 text-center text-sm text-muted-foreground">
            <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>Notificaciones bloqueadas</p>
            <p className="text-xs mt-1">Actívalas en la configuración del navegador</p>
          </div>
        )}

        {isSupported && permission === 'default' && (
          <div className="p-3 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-primary/50" />
            <p className="text-sm mb-2">¿Activar notificaciones?</p>
            <Button size="sm" onClick={requestPermission}>
              Activar
            </Button>
          </div>
        )}

        {/* Lista de notificaciones */}
        {permission === 'granted' && (
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const { icon: Icon, color } = notificationIcons[notif.type] || { icon: Bell, color: 'text-gray-500' };
                
                return (
                  <DropdownMenuItem
                    key={notif.id}
                    className={cn(
                      'flex items-start gap-3 p-3 cursor-pointer',
                      !notif.read && 'bg-primary/5'
                    )}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={cn('mt-0.5', color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm truncate',
                        !notif.read && 'font-medium'
                      )}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatTimeAgo(notif.timestamp)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
