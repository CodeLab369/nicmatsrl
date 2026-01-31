'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'inventory' | 'cotizaciones' | 'empresa_config' | 'users' | 'tiendas' | 'tienda_inventario' | 'user_presence' | 'tienda_envios' | 'tienda_ventas' | 'tienda_gastos' | 'pdf_config';
type Callback = () => void;

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: string;
  lastEvent: { table: string; type: string; time: Date } | null;
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
  pdf_config: new Set(),
};

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('INITIALIZING');
  const [lastEvent, setLastEvent] = useState<{ table: string; type: string; time: Date } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);

  useEffect(() => {
    // Crear cliente Supabase
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient();
    }
    const supabase = supabaseRef.current;

    // Handler genérico para cambios en tablas
    const handleChange = (table: TableName) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      setLastEvent({ table, type: payload.eventType, time: new Date() });
      
      // Ejecutar callbacks
      const callbacks = subscribers[table];
      callbacks.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error(`[Realtime] Error en callback de ${table}:`, err);
        }
      });
    };
    
    // Crear canal con todas las tablas
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, handleChange('inventory'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cotizaciones' }, handleChange('cotizaciones'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa_config' }, handleChange('empresa_config'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, handleChange('users'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tiendas' }, handleChange('tiendas'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_inventario' }, handleChange('tienda_inventario'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_envios' }, handleChange('tienda_envios'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_ventas' }, handleChange('tienda_ventas'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tienda_gastos' }, handleChange('tienda_gastos'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, handleChange('user_presence'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pdf_config' }, handleChange('pdf_config'));

    // Suscribirse al canal
    channel.subscribe((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
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
    <RealtimeContext.Provider value={{ isConnected, connectionStatus, lastEvent, subscribe }}>
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

// Hook simplificado para usar en las páginas - con DEBOUNCE integrado
// Esto evita múltiples peticiones cuando se eliminan/actualizan muchos registros
export function useTableSubscription(table: TableName, callback: Callback, debounceMs = 300) {
  const { isConnected, subscribe } = useRealtimeContext();
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Actualizar ref cuando cambie el callback (sin re-render)
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const wrappedCallback = () => {
      // Cancelar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Esperar antes de ejecutar (acumula cambios rápidos)
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, debounceMs);
    };
    
    const unsubscribe = subscribe(table, wrappedCallback);
    
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [table, subscribe, debounceMs]);

  return isConnected;
}
