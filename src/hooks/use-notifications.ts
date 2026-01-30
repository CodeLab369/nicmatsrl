'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AppNotification {
  id: string;
  type: 'stockBajo' | 'stockAgotado' | 'cotizacionPorVencer' | 'nuevaCotizacion' | 
        'cotizacionEstado' | 'envioTienda' | 'usuarioConectado';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  sendNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Verificar soporte de notificaciones
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Cargar notificaciones guardadas
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setNotifications(parsed.map((n: AppNotification) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          })));
        } catch (e) {
          console.error('Error parsing notifications:', e);
        }
      }
    }
  }, []);

  // Guardar notificaciones cuando cambian
  useEffect(() => {
    if (typeof window !== 'undefined' && notifications.length > 0) {
      // Solo guardar las últimas 50 notificaciones
      const toSave = notifications.slice(0, 50);
      localStorage.setItem('app_notifications', JSON.stringify(toSave));
    }
  }, [notifications]);

  // Solicitar permiso
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Enviar notificación
  const sendNotification = useCallback((
    notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
  ) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    // Agregar a la lista
    setNotifications(prev => [newNotification, ...prev]);

    // Mostrar notificación del navegador si hay permiso
    if (isSupported && permission === 'granted') {
      try {
        const browserNotif = new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: notification.type,
          requireInteraction: notification.type === 'stockAgotado' || notification.type === 'stockBajo',
        });

        // Cerrar automáticamente después de 5 segundos
        setTimeout(() => browserNotif.close(), 5000);

        // Al hacer clic, enfocar la ventana
        browserNotif.onclick = () => {
          window.focus();
          browserNotif.close();
        };
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, [isSupported, permission]);

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Limpiar notificaciones
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app_notifications');
    }
  }, []);

  // Contar no leídas
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
