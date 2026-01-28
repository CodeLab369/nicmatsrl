-- =====================================================
-- LIMPIAR Y RECRLEAR POLÍTICAS RLS (Sin duplicadas)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. LIMPIAR TODAS las políticas antiguas de cotizaciones
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cotizaciones;
DROP POLICY IF EXISTS "Allow delete for cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Allow insert for cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Allow select for cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Allow update for cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_delete" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_insert" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_select" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_update" ON cotizaciones;

-- 2. LIMPIAR TODAS las políticas antiguas de empresa_config
DROP POLICY IF EXISTS "Allow all operations for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "Allow delete for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "Allow insert for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "Allow select for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "Allow update for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_delete" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_insert" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_select" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_update" ON empresa_config;

-- 3. LIMPIAR TODAS las políticas antiguas de user_presence
DROP POLICY IF EXISTS "Allow all for user_presence" ON user_presence;
DROP POLICY IF EXISTS "Allow delete for user_presence" ON user_presence;
DROP POLICY IF EXISTS "Allow insert for user_presence" ON user_presence;
DROP POLICY IF EXISTS "Allow select for user_presence" ON user_presence;
DROP POLICY IF EXISTS "Allow update for user_presence" ON user_presence;

-- 4. RECREAR políticas limpias - COTIZACIONES
CREATE POLICY "cotizaciones_select" ON cotizaciones 
  FOR SELECT USING (true);

CREATE POLICY "cotizaciones_insert" ON cotizaciones 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cotizaciones_update" ON cotizaciones 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "cotizaciones_delete" ON cotizaciones 
  FOR DELETE USING (true);

-- 5. RECREAR políticas limpias - EMPRESA_CONFIG
CREATE POLICY "empresa_config_select" ON empresa_config 
  FOR SELECT USING (true);

CREATE POLICY "empresa_config_insert" ON empresa_config 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "empresa_config_update" ON empresa_config 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "empresa_config_delete" ON empresa_config 
  FOR DELETE USING (true);

-- 6. RECREAR políticas limpias - USER_PRESENCE
CREATE POLICY "user_presence_select" ON user_presence 
  FOR SELECT USING (true);

CREATE POLICY "user_presence_insert" ON user_presence 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_presence_update" ON user_presence 
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "user_presence_delete" ON user_presence 
  FOR DELETE USING (true);

-- 7. Corregir función con search_path seguro
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_presence 
  SET is_online = false 
  WHERE is_online = true 
  AND last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Verificar que todo está correcto (debería mostrar 12 políticas: 4 por tabla × 3 tablas)
SELECT tablename, COUNT(*) as total_policies 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'user_presence')
GROUP BY tablename;
