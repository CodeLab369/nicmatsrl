'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
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

export function useRealtime({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const setupChannel = useCallback(() => {
    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Configurar el canal de Realtime
    const channelName = `realtime-${table}-${Date.now()}`;
    
    let channelConfig: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('postgres_changes', channelConfig, (payload) => {
        // Llamar al callback general si existe
        if (onChange) {
          onChange(payload);
        }

        // Llamar a callbacks específicos según el evento
        switch (payload.eventType) {
          case 'INSERT':
            if (onInsert) onInsert(payload);
            break;
          case 'UPDATE':
            if (onUpdate) onUpdate(payload);
            break;
          case 'DELETE':
            if (onDelete) onDelete(payload);
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          // Intentar reconectar
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              setupChannel();
            }, delay);
          }
        }
      });

    channelRef.current = channel;
  }, [supabase, table, event, filter, onInsert, onUpdate, onDelete, onChange]);

  useEffect(() => {
    setupChannel();

    // Manejar visibilidad de la página (importante para móviles)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconectar cuando la app vuelve al frente
        if (!isConnected) {
          reconnectAttemptsRef.current = 0;
          setupChannel();
        }
      }
    };

    // Manejar reconexión cuando vuelve la conexión
    const handleOnline = () => {
      reconnectAttemptsRef.current = 0;
      setupChannel();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [setupChannel, isConnected, supabase]);

  return { channel: channelRef.current, isConnected };
}
