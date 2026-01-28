'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'inventory' | 'cotizaciones' | 'empresa_config' | 'users' | 'tiendas' | 'tienda_inventario' | 'user_presence';
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
  tiendas: new Set(),
  tienda_inventario: new Set(),
  user_presence: new Set(),
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
        console.log('[Realtime] 📦 Cambio en inventory:', payload.eventType, 'Suscriptores:', subscribers.inventory.size);
        subscribers.inventory.forEach(cb => {
          console.log('[Realtime] 📦 Ejecutando callback inventory...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, (payload) => {
        console.log('[Realtime] 📋 Cambio en cotizaciones:', payload.eventType, 'Suscriptores:', subscribers.cotizaciones.size);
        subscribers.cotizaciones.forEach(cb => {
          console.log('[Realtime] 📋 Ejecutando callback cotizaciones...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_config' }, (payload) => {
        console.log('[Realtime] ⚙️ Cambio en empresa_config:', payload.eventType, 'Suscriptores:', subscribers.empresa_config.size);
        subscribers.empresa_config.forEach(cb => {
          console.log('[Realtime] ⚙️ Ejecutando callback empresa_config...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        console.log('[Realtime] 👤 Cambio en users:', payload.eventType, 'Suscriptores:', subscribers.users.size);
        subscribers.users.forEach(cb => {
          console.log('[Realtime] 👤 Ejecutando callback users...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiendas' }, (payload) => {
        console.log('[Realtime] 🏪 Cambio en tiendas:', payload.eventType, 'Suscriptores:', subscribers.tiendas.size);
        subscribers.tiendas.forEach(cb => {
          console.log('[Realtime] 🏪 Ejecutando callback tiendas...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_inventario' }, (payload) => {
        console.log('[Realtime] 📦🏪 Cambio en tienda_inventario:', payload.eventType, 'Suscriptores:', subscribers.tienda_inventario.size);
        subscribers.tienda_inventario.forEach(cb => {
          console.log('[Realtime] 📦🏪 Ejecutando callback tienda_inventario...');
          cb();
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, (payload) => {
        console.log('[Realtime] 🟢 Cambio en user_presence:', payload.eventType, 'Suscriptores:', subscribers.user_presence.size);
        subscribers.user_presence.forEach(cb => {
          console.log('[Realtime] 🟢 Ejecutando callback user_presence...');
          cb();
        });
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
    console.log(`[Realtime] ✅ Suscrito a ${table}. Total suscriptores: ${subscribers[table].size}`);
    return () => {
      subscribers[table].delete(callback);
      console.log(`[Realtime] ❌ Desuscrito de ${table}. Total suscriptores: ${subscribers[table].size}`);
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
