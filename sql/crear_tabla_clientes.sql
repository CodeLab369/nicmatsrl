-- ============================================
-- TABLA: clientes
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT DEFAULT '',
  email TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar extensión pg_trgm en schema extensions (buena práctica Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes USING gin(nombre extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at DESC);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON clientes;
CREATE TRIGGER trigger_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_updated_at();

-- Habilitar Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Política para que solo usuarios autenticados puedan CRUD
CREATE POLICY "Allow all for authenticated" ON clientes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'Tabla clientes creada exitosamente' AS resultado;
