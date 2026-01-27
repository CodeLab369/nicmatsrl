'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'inventory' | 'cotizaciones' | 'empresa_config' | 'users';
type Callback = () => void;

interface RealtimeContextType {
  isConnected: boolean;
  subscribe: (table: TableName, callback: Callback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// Almacén global de suscriptores por tabla
const subscribers: Record<TableName, Set<Callback>> = {
  inventory: new Set(),
  cotizaciones: new Set(),
  empresa_config: new Set(),
  users: new Set(),
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    console.log('[Realtime] Iniciando conexión...');
    
    // Crear UN solo canal para todas las tablas
    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        console.log('[Realtime] Cambio en inventory:', payload.eventType);
        subscribers.inventory.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, (payload) => {
        console.log('[Realtime] Cambio en cotizaciones:', payload.eventType);
        subscribers.cotizaciones.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_config' }, (payload) => {
        console.log('[Realtime] Cambio en empresa_config:', payload.eventType);
        subscribers.empresa_config.forEach(cb => cb());
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        console.log('[Realtime] Cambio en users:', payload.eventType);
        subscribers.users.forEach(cb => cb());
      })
      .subscribe((status, err) => {
        console.log('[Realtime] Status:', status, err ? `Error: ${err.message}` : '');
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup al desmontar
    return () => {
      console.log('[Realtime] Cerrando conexión...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Función para suscribirse a una tabla
  const subscribe = useCallback((table: TableName, callback: Callback): (() => void) => {
    subscribers[table].add(callback);
    return () => {
      subscribers[table].delete(callback);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe }}>
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
  callbackRef.current = callback;

  useEffect(() => {
    const unsubscribe = subscribe(table, () => callbackRef.current());
    return unsubscribe;
  }, [table, subscribe]);

  return isConnected;
}
