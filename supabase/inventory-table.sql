-- =====================================================
-- TABLA DE INVENTARIO PARA NICMAT S.R.L.
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Crear tabla de inventario
CREATE TABLE IF NOT EXISTS inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marca VARCHAR(255) NOT NULL,
  amperaje VARCHAR(255) NOT NULL,
  cantidad INTEGER DEFAULT 0,
  costo DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_inventory_marca ON inventory(marca);
CREATE INDEX IF NOT EXISTS idx_inventory_amperaje ON inventory(amperaje);
CREATE INDEX IF NOT EXISTS idx_inventory_cantidad ON inventory(cantidad);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at ON inventory(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON inventory;
CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Política RLS - Solo acceso mediante service role (API)
-- Primero habilitamos RLS
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Política para el service role (acceso completo)
DROP POLICY IF EXISTS "Service role access only" ON inventory;
CREATE POLICY "Service role access only" ON inventory
  FOR ALL
  TO authenticated, anon
  USING (false);

-- Verificar que la tabla se creó correctamente
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory'
ORDER BY ordinal_position;
