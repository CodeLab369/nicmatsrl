-- =====================================================
-- CONFIGURACIÓN CORRECTA DE RLS PARA TABLAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- 
-- Esta configuración:
-- 1. Habilita RLS (requerido por Supabase)
-- 2. Crea políticas que SOLO permiten acceso a service_role
-- 3. Bloquea acceso anónimo/público directo
-- 4. Tu app usa service_role_key que bypasses estas políticas
-- =====================================================

-- 1. COTIZACIONES
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- Política que permite todo SOLO para service_role (tu backend)
DROP POLICY IF EXISTS "service_role_all_cotizaciones" ON cotizaciones;
CREATE POLICY "service_role_all_cotizaciones" ON cotizaciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. EMPRESA_CONFIG  
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_empresa_config" ON empresa_config;
CREATE POLICY "service_role_all_empresa_config" ON empresa_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. USER_PRESENCE
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_user_presence" ON user_presence;
CREATE POLICY "service_role_all_user_presence" ON user_presence
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Eliminar columna sensible session_id (no la necesitamos realmente)
ALTER TABLE user_presence DROP COLUMN IF EXISTS session_id;

-- =====================================================
-- VERIFICAR
-- =====================================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'user_presence');

-- Verificar políticas
SELECT tablename, policyname, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'user_presence');
