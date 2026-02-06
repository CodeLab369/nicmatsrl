-- ============================================
-- FIX: Corregir warnings de seguridad en tabla clientes
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Mover extensión pg_trgm al schema extensions
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- 2. Recrear el índice GIN con el schema correcto
DROP INDEX IF EXISTS idx_clientes_nombre;
CREATE INDEX idx_clientes_nombre ON clientes USING gin(nombre extensions.gin_trgm_ops);

-- 3. Recrear función con search_path seguro
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- 4. Corregir RLS policy: restringir al rol authenticated
DROP POLICY IF EXISTS "Allow all for authenticated" ON clientes;
CREATE POLICY "Allow all for authenticated" ON clientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'Warnings corregidos exitosamente' AS resultado;
