-- =====================================================
-- ÍNDICES PARA OPTIMIZAR TIENDAS Y TIENDA_INVENTARIO
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Índices para tabla tiendas
CREATE INDEX IF NOT EXISTS idx_tiendas_tipo ON tiendas(tipo);
CREATE INDEX IF NOT EXISTS idx_tiendas_ciudad ON tiendas(ciudad);
CREATE INDEX IF NOT EXISTS idx_tiendas_created_at ON tiendas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiendas_tipo_ciudad ON tiendas(tipo, ciudad);

-- Índices para tabla tienda_inventario
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_tienda_id ON tienda_inventario(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_marca ON tienda_inventario(marca);
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_amperaje ON tienda_inventario(amperaje);
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_tienda_marca ON tienda_inventario(tienda_id, marca);
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_tienda_marca_amperaje ON tienda_inventario(tienda_id, marca, amperaje);

-- Índice compuesto para ordenamiento
CREATE INDEX IF NOT EXISTS idx_tienda_inventario_order ON tienda_inventario(tienda_id, marca, amperaje);

-- Índices para tabla inventory (inventario central)
CREATE INDEX IF NOT EXISTS idx_inventory_marca ON inventory(marca);
CREATE INDEX IF NOT EXISTS idx_inventory_amperaje ON inventory(amperaje);
CREATE INDEX IF NOT EXISTS idx_inventory_marca_amperaje ON inventory(marca, amperaje);
CREATE INDEX IF NOT EXISTS idx_inventory_cantidad ON inventory(cantidad) WHERE cantidad > 0;

-- =====================================================
-- ANÁLISIS: Después de crear los índices, ejecuta:
-- =====================================================
-- ANALYZE tiendas;
-- ANALYZE tienda_inventario;
-- ANALYZE inventory;
