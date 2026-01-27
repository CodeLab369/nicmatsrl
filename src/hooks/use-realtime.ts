'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: any) => void;

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: RealtimeCallback;
  onUpdate?: RealtimeCallback;
  onDelete?: RealtimeCallback;
  onChange?: RealtimeCallback;
}

// Obtener cliente singleton
const getSupabase = () => createBrowserClient();

export function useRealtime({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);
  
  // Refs para callbacks para evitar recrear el canal
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange });
  callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };

  useEffect(() => {
    mountedRef.current = true;
    const supabase = getSupabase();
    
    // Nombre de canal fijo basado en la tabla
    const channelName = `db-${table}`;
    
    // Remover canal existente si hay uno
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Configurar suscripción
    const channelConfig: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        const callbacks = callbacksRef.current;
        
        // Callback general
        if (callbacks.onChange) {
          callbacks.onChange(payload);
        }

        // Callbacks específicos
        switch (payload.eventType) {
          case 'INSERT':
            if (callbacks.onInsert) callbacks.onInsert(payload);
            break;
          case 'UPDATE':
            if (callbacks.onUpdate) callbacks.onUpdate(payload);
            break;
          case 'DELETE':
            if (callbacks.onDelete) callbacks.onDelete(payload);
            break;
        }
      })
      .subscribe((status) => {
        if (!mountedRef.current) return;
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter]); // Solo recrear si cambian estos valores

  // Reconectar al volver a la página o recuperar conexión
  useEffect(() => {
    const handleReconnect = () => {
      if (!isConnected && channelRef.current) {
        // Intentar re-suscribir
        channelRef.current.subscribe();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleReconnect);
    window.addEventListener('focus', handleReconnect);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleReconnect);
      window.removeEventListener('focus', handleReconnect);
    };
  }, [isConnected]);

  return { channel: channelRef.current, isConnected };
}
