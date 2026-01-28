-- =====================================================
-- DESHABILITAR RLS EN TABLAS QUE NO LO NECESITAN
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- 
-- RAZÓN: Esta aplicación usa SUPABASE_SERVICE_ROLE_KEY en el servidor
-- que bypasses RLS de todas formas. Las políticas con "true" son
-- redundantes y generan advertencias innecesarias.
--
-- El acceso a la base de datos está protegido por:
-- 1. Autenticación en el servidor (cookies de sesión)
-- 2. API routes que validan permisos
-- 3. Service Role Key que solo existe en el servidor
-- =====================================================

-- 1. Eliminar todas las políticas de cotizaciones
DROP POLICY IF EXISTS "cotizaciones_select" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_insert" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_update" ON cotizaciones;
DROP POLICY IF EXISTS "cotizaciones_delete" ON cotizaciones;

-- 2. Eliminar todas las políticas de empresa_config
DROP POLICY IF EXISTS "empresa_config_select" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_insert" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_update" ON empresa_config;
DROP POLICY IF EXISTS "empresa_config_delete" ON empresa_config;

-- 3. Eliminar todas las políticas de user_presence
DROP POLICY IF EXISTS "user_presence_select" ON user_presence;
DROP POLICY IF EXISTS "user_presence_insert" ON user_presence;
DROP POLICY IF EXISTS "user_presence_update" ON user_presence;
DROP POLICY IF EXISTS "user_presence_delete" ON user_presence;

-- 4. Deshabilitar RLS en las tablas (ya no es necesario con service_role_key)
ALTER TABLE cotizaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;

-- 5. Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'user_presence');

-- Resultado esperado: rowsecurity = false para todas
