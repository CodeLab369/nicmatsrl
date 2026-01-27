import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton global para el cliente de Supabase
let supabaseInstance: SupabaseClient | null = null;

/**
 * Cliente de Supabase singleton para el navegador (Client Components)
 * Reutiliza la misma instancia para evitar múltiples conexiones WebSocket
 */
export function createBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    // En el servidor, siempre crear nueva instancia
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
  }
  
  return supabaseInstance;
}

// Alias para compatibilidad
export { createBrowserClient as createClient };

