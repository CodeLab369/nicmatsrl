-- =====================================================
-- MÓDULO DE MOVIMIENTOS - CONTROL FINANCIERO
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de ventas de tiendas (registro de productos vendidos)
CREATE TABLE IF NOT EXISTS tienda_ventas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id UUID REFERENCES tiendas(id) ON DELETE CASCADE NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE NOT NULL,
  total_venta DECIMAL(12,2) DEFAULT 0,
  total_costo DECIMAL(12,2) DEFAULT 0,
  ganancia DECIMAL(12,2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- 2. Tabla de items vendidos
CREATE TABLE IF NOT EXISTS tienda_venta_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venta_id UUID REFERENCES tienda_ventas(id) ON DELETE CASCADE NOT NULL,
  inventario_id UUID REFERENCES tienda_inventario(id) ON DELETE SET NULL,
  marca VARCHAR(100) NOT NULL,
  amperaje VARCHAR(50) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_venta DECIMAL(10,2) NOT NULL,
  costo DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  ganancia_item DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de gastos de tiendas (categorías libres)
CREATE TABLE IF NOT EXISTS tienda_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tienda_id UUID REFERENCES tiendas(id) ON DELETE CASCADE NOT NULL,
  categoria VARCHAR(100) NOT NULL,
  descripcion TEXT,
  monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  fecha DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);

-- 4. Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tienda_ventas_tienda ON tienda_ventas(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_ventas_fecha ON tienda_ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_tienda_venta_items_venta ON tienda_venta_items(venta_id);
CREATE INDEX IF NOT EXISTS idx_tienda_gastos_tienda ON tienda_gastos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_gastos_fecha ON tienda_gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_tienda_gastos_categoria ON tienda_gastos(categoria);

-- 5. Habilitar RLS
ALTER TABLE tienda_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tienda_gastos ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para service_role
CREATE POLICY "service_role_all_tienda_ventas" ON tienda_ventas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_tienda_venta_items" ON tienda_venta_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_tienda_gastos" ON tienda_gastos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_gastos;

-- =====================================================
-- VERIFICAR
-- =====================================================
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tienda_ventas', 'tienda_venta_items', 'tienda_gastos');
