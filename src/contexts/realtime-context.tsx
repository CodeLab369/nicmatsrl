'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'inventory' | 'cotizaciones' | 'empresa_config' | 'users' | 'tiendas' | 'tienda_inventario' | 'user_presence' | 'tienda_envios' | 'tienda_ventas' | 'tienda_gastos';
type Callback = () => void;

interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: string;
  lastEvent: { table: string; type: string; time: Date } | null;
  subscribe: (table: TableName, callback: Callback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

// Almacén global de suscriptores por tabla (fuera del componente para persistir)
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

// Singleton para el cliente Supabase y canal
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;
let channelInstance: RealtimeChannel | null = null;
let isChannelSetup = false;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('INITIALIZING');
  const [lastEvent, setLastEvent] = useState<{ table: string; type: string; time: Date } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Solo crear el canal una vez (singleton pattern)
    if (!isChannelSetup) {
      isChannelSetup = true;
      
      if (!supabaseInstance) {
        supabaseInstance = createBrowserClient();
      }
      const supabase = supabaseInstance;

      // Handler genérico para cambios en tablas - ejecuta callbacks inmediatamente
      const handleChange = (table: TableName) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (mountedRef.current) {
          setLastEvent({ table, type: payload.eventType, time: new Date() });
        }
        
        // Ejecutar callbacks de forma síncrona para máxima velocidad
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
        .channel('db-changes', {
          config: {
            broadcast: { self: true },
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
      channel.subscribe((status) => {
        if (mountedRef.current) {
          setConnectionStatus(status);
          setIsConnected(status === 'SUBSCRIBED');
        }
      });

      channelInstance = channel;
    } else {
      // Ya existe el canal, solo actualizar el estado local
      if (channelInstance) {
        const status = channelInstance.state;
        setConnectionStatus(status === 'joined' ? 'SUBSCRIBED' : status);
        setIsConnected(status === 'joined');
      }
    }

    // Cleanup - no destruir el canal, solo marcar como desmontado
    return () => {
      mountedRef.current = false;
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

// Hook simplificado para usar en las páginas - optimizado para actualizaciones instantáneas
export function useTableSubscription(table: TableName, callback: Callback) {
  const { isConnected, subscribe } = useRealtimeContext();
  const callbackRef = useRef(callback);
  
  // Actualizar ref cuando cambie el callback (sin re-render)
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const wrappedCallback = () => {
      callbackRef.current();
    };
    
    const unsubscribe = subscribe(table, wrappedCallback);
    
    return () => {
      unsubscribe();
    };
  }, [table, subscribe]);

  return isConnected;
}
