-- =====================================================
-- SISTEMA DE PERMISOS Y PRESENCIA DE USUARIOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columna de permisos a la tabla users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"inventario": true, "tiendas": true, "cotizaciones": true}'::jsonb;

-- 2. Crear tabla de presencia de usuarios (usuarios en línea)
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Índices para presencia
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- 4. Habilitar RLS en user_presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para user_presence
DROP POLICY IF EXISTS "Allow all for user_presence" ON user_presence;
CREATE POLICY "Allow all for user_presence" ON user_presence FOR ALL USING (true);

-- 6. Habilitar Realtime para user_presence
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- 7. Función para limpiar presencias antiguas (usuarios que no actualizaron en 2 minutos)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence 
  SET is_online = false 
  WHERE is_online = true 
  AND last_seen < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- 8. Actualizar usuarios existentes con permisos por defecto
UPDATE users 
SET permissions = '{"inventario": true, "tiendas": true, "cotizaciones": true}'::jsonb 
WHERE permissions IS NULL;

-- =====================================================
-- VERIFICAR QUE TODO ESTÁ CORRECTO
-- =====================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';
-- SELECT * FROM user_presence;
