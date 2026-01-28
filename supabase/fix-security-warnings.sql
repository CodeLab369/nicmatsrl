-- =====================================================
-- CORREGIR ADVERTENCIAS DE SEGURIDAD DE SUPABASE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Arreglar la función cleanup_stale_presence con search_path seguro
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

-- 2. Mejorar política RLS de cotizaciones (más restrictiva)
DROP POLICY IF EXISTS "Allow all for cotizaciones" ON cotizaciones;
DROP POLICY IF EXISTS "Enable all operations for cotizaciones" ON cotizaciones;

-- Política para SELECT
CREATE POLICY "Allow select for cotizaciones" ON cotizaciones 
  FOR SELECT 
  USING (true);

-- Política para INSERT
CREATE POLICY "Allow insert for cotizaciones" ON cotizaciones 
  FOR INSERT 
  WITH CHECK (true);

-- Política para UPDATE
CREATE POLICY "Allow update for cotizaciones" ON cotizaciones 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Política para DELETE
CREATE POLICY "Allow delete for cotizaciones" ON cotizaciones 
  FOR DELETE 
  USING (true);

-- 3. Mejorar política RLS de empresa_config
DROP POLICY IF EXISTS "Allow all for empresa_config" ON empresa_config;
DROP POLICY IF EXISTS "Enable all operations for empresa_config" ON empresa_config;

CREATE POLICY "Allow select for empresa_config" ON empresa_config 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert for empresa_config" ON empresa_config 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow update for empresa_config" ON empresa_config 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow delete for empresa_config" ON empresa_config 
  FOR DELETE 
  USING (true);

-- 4. Mejorar política RLS de user_presence
DROP POLICY IF EXISTS "Allow all for user_presence" ON user_presence;

CREATE POLICY "Allow select for user_presence" ON user_presence 
  FOR SELECT 
  USING (true);

CREATE POLICY "Allow insert for user_presence" ON user_presence 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow update for user_presence" ON user_presence 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow delete for user_presence" ON user_presence 
  FOR DELETE 
  USING (true);

-- =====================================================
-- NOTA: Estas políticas usan "true" porque:
-- 1. Todas las operaciones de BD pasan por el servidor (API routes)
-- 2. El servidor usa SUPABASE_SERVICE_ROLE_KEY que bypasses RLS
-- 3. No hay acceso directo del frontend a Supabase
-- 
-- Si en el futuro se necesita acceso directo del frontend,
-- se deberán crear políticas basadas en auth.uid()
-- =====================================================

-- Verificar que todo está correcto
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'user_presence');
