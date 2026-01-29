'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'inventory' | 'cotizaciones' | 'empresa_config' | 'users' | 'tiendas' | 'tienda_inventario' | 'user_presence' | 'tienda_envios' | 'tienda_ventas' | 'tienda_gastos';
type Callback = () => void;

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: string;
  subscribe: (table: TableName, callback: Callback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// Almacén global de suscriptores por tabla
const subscribers: Record<TableName, Set<Callback>> = {
  inventory: new Set(),
  cotizaciones: new Set(),
  empresa_config: new Set(),
  users: new Set(),
  tiendas: new Set(),
  tienda_inventario: new Set(),
  user_presence: new Set(),
  tienda_envios: new Set(),
  tienda_ventas: new Set(),
  tienda_gastos: new Set(),
};

// Debug en desarrollo
const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => {
  if (isDev) console.log('[Realtime]', ...args);
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('INITIALIZING');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    log('🔌 Iniciando conexión Realtime...');

    // Handler genérico para cambios en tablas
    const handleChange = (table: TableName) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      log(`📥 Cambio en ${table}:`, payload.eventType, payload);
      const callbacks = subscribers[table];
      if (callbacks.size > 0) {
        log(`🔄 Ejecutando ${callbacks.size} callbacks para ${table}`);
        callbacks.forEach(cb => {
          try {
            cb();
          } catch (err) {
            console.error(`Error en callback de ${table}:`, err);
          }
        });
      }
    };
    
    // Crear canal con todas las tablas
    const channel = supabase
      .channel('db-changes', {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, handleChange('inventory'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, handleChange('cotizaciones'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_config' }, handleChange('empresa_config'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleChange('users'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiendas' }, handleChange('tiendas'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_inventario' }, handleChange('tienda_inventario'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_envios' }, handleChange('tienda_envios'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_ventas' }, handleChange('tienda_ventas'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_gastos' }, handleChange('tienda_gastos'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, handleChange('user_presence'));

    // Suscribirse al canal
    channel.subscribe((status, err) => {
      log('📡 Estado de conexión:', status, err ? `Error: ${err.message}` : '');
      setConnectionStatus(status);
      setIsConnected(status === 'SUBSCRIBED');
      
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        log('⚠️ Error de conexión, reintentando en 5s...');
        reconnectTimeoutRef.current = setTimeout(() => {
          log('🔄 Reintentando conexión...');
          channel.subscribe();
        }, 5000);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      log('🔌 Cerrando conexión Realtime...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Función para suscribirse a una tabla
  const subscribe = useCallback((table: TableName, callback: Callback): (() => void) => {
    subscribers[table].add(callback);
    log(`✅ Suscrito a ${table}. Total: ${subscribers[table].size}`);
    return () => {
      subscribers[table].delete(callback);
      log(`❌ Desuscrito de ${table}. Total: ${subscribers[table].size}`);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, connectionStatus, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return context;
}

// Hook simplificado para usar en las páginas
export function useTableSubscription(table: TableName, callback: Callback) {
  const { isConnected, subscribe } = useRealtimeContext();
  const callbackRef = useRef(callback);
  
  // Actualizar ref cuando cambie el callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    log(`🎯 useTableSubscription: Registrando para ${table}`);
    const unsubscribe = subscribe(table, () => {
      log(`🎯 useTableSubscription: Ejecutando callback de ${table}`);
      callbackRef.current();
    });
    return () => {
      log(`🎯 useTableSubscription: Limpiando ${table}`);
      unsubscribe();
    };
  }, [table, subscribe]);

  return isConnected;
}
