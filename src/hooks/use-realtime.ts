'use client';

import { useEffect, useRef, useMemo } from 'react';
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

  useEffect(() => {
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
      .channel(channelName)
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
      .subscribe();

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, table, event, filter, onInsert, onUpdate, onDelete, onChange]);

  return channelRef.current;
}
