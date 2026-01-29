-- =====================================================
-- SISTEMA DE ENVÍOS PENDIENTES A TIENDAS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Crear tabla de envíos pendientes
CREATE TABLE IF NOT EXISTS tienda_envios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id UUID REFERENCES tiendas(id) ON DELETE CASCADE NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'precios_asignados', 'completado', 'cancelado')),
  total_productos INTEGER DEFAULT 0,
  total_unidades INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completado_at TIMESTAMPTZ,
  created_by TEXT
);

-- 2. Crear tabla de items del envío
CREATE TABLE IF NOT EXISTS tienda_envio_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  envio_id UUID REFERENCES tienda_envios(id) ON DELETE CASCADE NOT NULL,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  marca VARCHAR(100) NOT NULL,
  amperaje VARCHAR(50) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  costo_original DECIMAL(10,2) NOT NULL,
  precio_venta_original DECIMAL(10,2) NOT NULL,
  precio_tienda DECIMAL(10,2), -- Precio asignado para la tienda (NULL hasta que se importe)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tienda_envios_tienda ON tienda_envios(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_envios_estado ON tienda_envios(estado);
CREATE INDEX IF NOT EXISTS idx_tienda_envio_items_envio ON tienda_envio_items(envio_id);

-- 4. Habilitar RLS
ALTER TABLE tienda_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_envio_items ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para service_role
CREATE POLICY "service_role_all_tienda_envios" ON tienda_envios
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_tienda_envio_items" ON tienda_envio_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_envios;

-- 7. Función para actualizar updated_at (con search_path seguro)
CREATE OR REPLACE FUNCTION update_tienda_envios_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tienda_envios_updated_at
  BEFORE UPDATE ON tienda_envios
  FOR EACH ROW
  EXECUTE FUNCTION update_tienda_envios_updated_at();

-- =====================================================
-- VERIFICAR
-- =====================================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tienda_envios', 'tienda_envio_items');
