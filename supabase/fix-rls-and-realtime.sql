-- ===========================================
-- HABILITAR REALTIME EN SUPABASE
-- EJECUTAR ESTE SCRIPT EN SQL EDITOR
-- ===========================================

-- PASO 1: Verificar qué tablas están en la publicación
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- PASO 2: Habilitar REPLICA IDENTITY para cada tabla
-- Esto es NECESARIO para que Realtime funcione correctamente
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.cotizaciones REPLICA IDENTITY FULL;
ALTER TABLE public.empresa_config REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- PASO 3: Verificar el estado de REPLICA IDENTITY
SELECT c.relname as table_name, 
       CASE c.relreplident
           WHEN 'd' THEN 'DEFAULT'
           WHEN 'n' THEN 'NOTHING'
           WHEN 'f' THEN 'FULL'
           WHEN 'i' THEN 'INDEX'
       END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('inventory', 'cotizaciones', 'empresa_config', 'users');

