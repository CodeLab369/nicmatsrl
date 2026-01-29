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

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('INITIALIZING');
  const [lastEvent, setLastEvent] = useState<{ table: string; type: string; time: Date } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    
    console.log('🔌 [Realtime] Iniciando conexión WebSocket...');
    console.log('🔗 [Realtime] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    // Handler genérico para cambios en tablas
    const handleChange = (table: TableName) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      console.log(`✨ [Realtime] ¡CAMBIO DETECTADO en ${table}!`, {
        event: payload.eventType,
        new: payload.new,
        old: payload.old
      });
      
      // Actualizar último evento
      setLastEvent({ table, type: payload.eventType, time: new Date() });
      
      // Ejecutar todos los callbacks suscritos a esta tabla
      const callbacks = subscribers[table];
      console.log(`📢 [Realtime] Ejecutando ${callbacks.size} callbacks para ${table}`);
      
      callbacks.forEach(cb => {
        try {
          cb();
        } catch (err) {
          console.error(`❌ [Realtime] Error en callback de ${table}:`, err);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, handleChange('user_presence'));

    // Suscribirse al canal
    channel.subscribe((status, err) => {
      console.log('📡 [Realtime] Estado:', status, err ? `Error: ${err.message}` : '');
      setConnectionStatus(status);
      setIsConnected(status === 'SUBSCRIBED');
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Realtime] ¡Conectado! Escuchando cambios en tiempo real...');
      }
      
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.log('⚠️ [Realtime] Error de conexión, reintentando en 3s...');
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 [Realtime] Reintentando conexión...');
          channel.subscribe();
        }, 3000);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('🔌 [Realtime] Cerrando conexión...');
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
    console.log(`📝 [Realtime] Suscrito a ${table}. Total suscriptores: ${subscribers[table].size}`);
    return () => {
      subscribers[table].delete(callback);
      console.log(`🗑️ [Realtime] Desuscrito de ${table}. Total suscriptores: ${subscribers[table].size}`);
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

// Hook simplificado para usar en las páginas
export function useTableSubscription(table: TableName, callback: Callback) {
  const { isConnected, subscribe } = useRealtimeContext();
  const callbackRef = useRef(callback);
  
  // IMPORTANTE: Actualizar ref SIEMPRE que cambie el callback
  // Esto asegura que cuando Realtime llame al callback, use la versión más reciente
  callbackRef.current = callback;

  useEffect(() => {
    console.log(`🎯 [useTableSubscription] Registrando callback para: ${table}`);
    
    const wrappedCallback = () => {
      console.log(`🎯 [useTableSubscription] ¡Ejecutando callback para ${table}!`);
      // Siempre llama a la versión más reciente del callback
      callbackRef.current();
    };
    
    const unsubscribe = subscribe(table, wrappedCallback);
    
    return () => {
      console.log(`🎯 [useTableSubscription] Limpiando suscripción de: ${table}`);
      unsubscribe();
    };
  }, [table, subscribe]);

  return isConnected;
}
