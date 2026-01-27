import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton para el cliente de Supabase en el navegador
let supabaseInstance: SupabaseClient | null = null;

/**
 * Cliente de Supabase singleton para el navegador (Client Components)
 * Reutiliza la misma instancia para evitar múltiples conexiones WebSocket
 */
export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabaseInstance;
}

/**
 * Obtener la instancia existente (para verificar si ya existe)
 */
export function getSupabaseInstance() {
  return supabaseInstance;
}
