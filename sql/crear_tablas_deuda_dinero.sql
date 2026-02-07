-- ============================================
-- TABLAS: deuda_config, deuda_operaciones, dinero_operaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================
-- MÓDULO DEUDA
-- ============================

-- Configuración de deuda (saldo inicial)
CREATE TABLE IF NOT EXISTS deuda_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saldo_inicial NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar fila por defecto
INSERT INTO deuda_config (saldo_inicial) VALUES (0)
ON CONFLICT DO NOTHING;

-- Operaciones de deuda
CREATE TABLE IF NOT EXISTS deuda_operaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('deposito', 'camion', 'compra')),
  detalle TEXT DEFAULT '',
  entidad_financiera TEXT DEFAULT '',
  kilos NUMERIC(10,2) DEFAULT 0,
  precio_unitario NUMERIC(10,2) DEFAULT 0,
  importe NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_deuda_ops_tipo ON deuda_operaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_deuda_ops_created ON deuda_operaciones(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_deuda_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_deuda_config_updated_at ON deuda_config;
CREATE TRIGGER trigger_deuda_config_updated_at
  BEFORE UPDATE ON deuda_config
  FOR EACH ROW
  EXECUTE FUNCTION update_deuda_config_updated_at();

CREATE OR REPLACE FUNCTION update_deuda_operaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_deuda_ops_updated_at ON deuda_operaciones;
CREATE TRIGGER trigger_deuda_ops_updated_at
  BEFORE UPDATE ON deuda_operaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_deuda_operaciones_updated_at();

-- ============================
-- MÓDULO DINERO
-- ============================

CREATE TABLE IF NOT EXISTS dinero_operaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso_tienda', 'salida_efectivo')),
  detalle TEXT DEFAULT '',
  tienda_id UUID REFERENCES tiendas(id) ON DELETE SET NULL,
  tienda_nombre TEXT DEFAULT '',
  importe NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dinero_ops_tipo ON dinero_operaciones(tipo);
CREATE INDEX IF NOT EXISTS idx_dinero_ops_created ON dinero_operaciones(created_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_dinero_operaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_dinero_ops_updated_at ON dinero_operaciones;
CREATE TRIGGER trigger_dinero_ops_updated_at
  BEFORE UPDATE ON dinero_operaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_dinero_operaciones_updated_at();

-- ============================
-- REALTIME
-- ============================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE deuda_config;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE deuda_operaciones;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dinero_operaciones;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================
-- RLS
-- ============================
ALTER TABLE deuda_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE deuda_operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dinero_operaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON deuda_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON deuda_operaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON dinero_operaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Tablas deuda y dinero creadas exitosamente' AS resultado;
