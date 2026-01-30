'use client';

import { createContext, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useNotifications, AppNotification } from '@/hooks/use-notifications';
import { useAuth, useTableSubscription } from '@/contexts';
import { NotificationPermissions, DEFAULT_NOTIFICATION_PERMISSIONS } from '@/types';

interface NotificationContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// Almacenamiento de datos anteriores para detectar cambios
interface PreviousData {
  inventory: Record<string, number>;
  cotizaciones: Record<string, { estado: string; fecha_vencimiento: string }>;
  users: Record<string, boolean>;
  envios: Set<string>;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const { user } = useAuth();
  const previousData = useRef<PreviousData>({
    inventory: {},
    cotizaciones: {},
    users: {},
    envios: new Set(),
  });
  const isInitialized = useRef(false);

  // Obtener permisos de notificación del usuario actual
  const getNotifPermissions = useCallback((): NotificationPermissions => {
    return user?.notificationPermissions || DEFAULT_NOTIFICATION_PERMISSIONS;
  }, [user]);

  // Verificar stock bajo y agotado
  const checkStockAlerts = useCallback(async () => {
    const perms = getNotifPermissions();
    if (!perms.stockBajo && !perms.stockAgotado) return;
    if (!isInitialized.current) return;

    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      
      if (data.stockBajo?.productos) {
        data.stockBajo.productos.forEach((producto: { id: string; marca: string; amperaje: string; cantidad: number }) => {
          const prevCant = previousData.current.inventory[producto.id];
          
          // Solo notificar si el stock bajó (no en la carga inicial)
          if (prevCant !== undefined && prevCant > producto.cantidad) {
            if (producto.cantidad === 0 && perms.stockAgotado) {
              sendNotification({
                type: 'stockAgotado',
                title: '🚨 Stock Agotado',
                message: `${producto.marca} ${producto.amperaje} se ha agotado`,
                data: { productId: producto.id }
              });
            } else if (producto.cantidad > 0 && producto.cantidad < 5 && perms.stockBajo) {
              sendNotification({
                type: 'stockBajo',
                title: '⚠️ Stock Bajo',
                message: `${producto.marca} ${producto.amperaje}: ${producto.cantidad} unidades`,
                data: { productId: producto.id }
              });
            }
          }
          
          previousData.current.inventory[producto.id] = producto.cantidad;
        });
      }
    } catch (error) {
      console.error('Error checking stock alerts:', error);
    }
  }, [getNotifPermissions, sendNotification]);

  // Verificar cotizaciones (nuevas, cambio de estado, por vencer)
  const checkCotizacionAlerts = useCallback(async () => {
    const perms = getNotifPermissions();
    if (!perms.nuevaCotizacion && !perms.cotizacionEstado && !perms.cotizacionPorVencer) return;
    if (!isInitialized.current) return;

    try {
      const response = await fetch('/api/cotizaciones');
      const data = await response.json();
      
      if (data.cotizaciones) {
        data.cotizaciones.forEach((cot: { id: string; numero: string; cliente_nombre: string; estado: string; fecha_vencimiento: string }) => {
          const prev = previousData.current.cotizaciones[cot.id];
          
          // Nueva cotización
          if (!prev && perms.nuevaCotizacion) {
            sendNotification({
              type: 'nuevaCotizacion',
              title: '📄 Nueva Cotización',
              message: `${cot.numero} - ${cot.cliente_nombre}`,
              data: { cotizacionId: cot.id }
            });
          }
          
          // Cambio de estado
          if (prev && prev.estado !== cot.estado && perms.cotizacionEstado) {
            const estadoTexto = {
              aceptada: '✅ Aceptada',
              rechazada: '❌ Rechazada',
              convertida: '🛒 Convertida a venta',
              pendiente: '⏳ Pendiente'
            }[cot.estado] || cot.estado;
            
            sendNotification({
              type: 'cotizacionEstado',
              title: 'Cotización Actualizada',
              message: `${cot.numero}: ${estadoTexto}`,
              data: { cotizacionId: cot.id, estado: cot.estado }
            });
          }
          
          // Por vencer (dentro de 2 días)
          if (cot.estado === 'pendiente' && perms.cotizacionPorVencer) {
            const vencimiento = new Date(cot.fecha_vencimiento);
            const hoy = new Date();
            const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diasRestantes <= 2 && diasRestantes > 0) {
              // Solo notificar una vez por cotización
              const notifKey = `vencer_${cot.id}_${diasRestantes}`;
              if (!localStorage.getItem(notifKey)) {
                sendNotification({
                  type: 'cotizacionPorVencer',
                  title: '⏰ Cotización por Vencer',
                  message: `${cot.numero} vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''}`,
                  data: { cotizacionId: cot.id, diasRestantes }
                });
                localStorage.setItem(notifKey, 'true');
              }
            }
          }
          
          previousData.current.cotizaciones[cot.id] = {
            estado: cot.estado,
            fecha_vencimiento: cot.fecha_vencimiento
          };
        });
      }
    } catch (error) {
      console.error('Error checking cotizacion alerts:', error);
    }
  }, [getNotifPermissions, sendNotification]);

  // Verificar envíos a tienda
  const checkEnvioAlerts = useCallback(async () => {
    const perms = getNotifPermissions();
    if (!perms.envioTienda) return;
    if (!isInitialized.current) return;

    try {
      const response = await fetch('/api/tienda-envios');
      const data = await response.json();
      
      if (data.envios) {
        data.envios.forEach((envio: { id: string; tienda_nombre?: string; total_unidades: number }) => {
          if (!previousData.current.envios.has(envio.id)) {
            sendNotification({
              type: 'envioTienda',
              title: '📦 Nuevo Envío a Tienda',
              message: `${envio.tienda_nombre || 'Tienda'}: ${envio.total_unidades} unidades`,
              data: { envioId: envio.id }
            });
            previousData.current.envios.add(envio.id);
          }
        });
      }
    } catch (error) {
      console.error('Error checking envio alerts:', error);
    }
  }, [getNotifPermissions, sendNotification]);

  // Verificar usuarios conectados
  const checkUserAlerts = useCallback(async () => {
    const perms = getNotifPermissions();
    if (!perms.usuarioConectado) return;
    if (!isInitialized.current) return;

    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.users) {
        data.users.forEach((u: { id: string; fullName: string; isOnline: boolean }) => {
          const wasOnline = previousData.current.users[u.id];
          
          // Si estaba offline y ahora está online
          if (wasOnline === false && u.isOnline && u.id !== user?.id) {
            sendNotification({
              type: 'usuarioConectado',
              title: '👤 Usuario Conectado',
              message: `${u.fullName} ha iniciado sesión`,
              data: { userId: u.id }
            });
          }
          
          previousData.current.users[u.id] = u.isOnline;
        });
      }
    } catch (error) {
      console.error('Error checking user alerts:', error);
    }
  }, [getNotifPermissions, sendNotification, user?.id]);

  // Inicializar datos sin notificar
  const initializeData = useCallback(async () => {
    try {
      // Cargar inventario
      const alertsRes = await fetch('/api/alerts');
      const alertsData = await alertsRes.json();
      if (alertsData.stockBajo?.productos) {
        alertsData.stockBajo.productos.forEach((p: { id: string; cantidad: number }) => {
          previousData.current.inventory[p.id] = p.cantidad;
        });
      }

      // Cargar cotizaciones
      const cotRes = await fetch('/api/cotizaciones');
      const cotData = await cotRes.json();
      if (cotData.cotizaciones) {
        cotData.cotizaciones.forEach((c: { id: string; estado: string; fecha_vencimiento: string }) => {
          previousData.current.cotizaciones[c.id] = {
            estado: c.estado,
            fecha_vencimiento: c.fecha_vencimiento
          };
        });
      }

      // Cargar envíos
      const enviosRes = await fetch('/api/tienda-envios');
      const enviosData = await enviosRes.json();
      if (enviosData.envios) {
        enviosData.envios.forEach((e: { id: string }) => {
          previousData.current.envios.add(e.id);
        });
      }

      // Cargar usuarios
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      if (usersData.users) {
        usersData.users.forEach((u: { id: string; isOnline: boolean }) => {
          previousData.current.users[u.id] = u.isOnline;
        });
      }

      isInitialized.current = true;
      console.log('🔔 [Notifications] Sistema inicializado');
    } catch (error) {
      console.error('Error initializing notification data:', error);
      isInitialized.current = true; // Marcar como inicializado de todos modos
    }
  }, []);

  // Inicializar al montar
  useEffect(() => {
    if (user) {
      initializeData();
    }
  }, [user, initializeData]);

  // Suscribirse a cambios en tiempo real
  useTableSubscription('inventory', checkStockAlerts);
  useTableSubscription('cotizaciones', checkCotizacionAlerts);
  useTableSubscription('tienda_envios', checkEnvioAlerts);
  useTableSubscription('user_presence', checkUserAlerts);

  // Verificar cotizaciones por vencer cada hora
  useEffect(() => {
    const interval = setInterval(() => {
      if (isInitialized.current) {
        checkCotizacionAlerts();
      }
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(interval);
  }, [checkCotizacionAlerts]);

  return (
    <NotificationContext.Provider
      value={{
        isSupported,
        permission,
        requestPermission,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}
