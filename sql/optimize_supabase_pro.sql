-- =====================================================
-- SCRIPT DE OPTIMIZACIÓN PARA SUPABASE PRO
-- Ejecutar en SQL Editor de Supabase Dashboard
-- =====================================================

-- ⚠️ IMPORTANTE: HABILITAR REALTIME EN TODAS LAS TABLAS
-- =====================================================
-- Sin esto, los cambios NO se transmiten en tiempo real

-- Primero verificar qué tablas tienen realtime habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- HABILITAR REALTIME EN TODAS LAS TABLAS NECESARIAS
-- (Ejecutar una por una si hay errores)

ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE tiendas;
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_inventario;
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_envios;
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE tienda_gastos;
ALTER PUBLICATION supabase_realtime ADD TABLE cotizaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE empresa_config;

-- Si alguna tabla ya existe en la publicación, usar DROP primero:
-- ALTER PUBLICATION supabase_realtime DROP TABLE inventory;
-- ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- =====================================================
-- 2. CREAR ÍNDICES PARA MEJORAR CONSULTAS
-- =====================================================

-- Índice para búsquedas en inventario por marca/amperaje
CREATE INDEX IF NOT EXISTS idx_inventory_marca ON inventory(marca);
CREATE INDEX IF NOT EXISTS idx_inventory_amperaje ON inventory(amperaje);
CREATE INDEX IF NOT EXISTS idx_inventory_marca_amperaje ON inventory(marca, amperaje);

-- Índice para búsquedas en tienda_inventario
CREATE INDEX IF NOT EXISTS idx_tienda_inv_tienda_id ON tienda_inventario(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_inv_marca ON tienda_inventario(marca);
CREATE INDEX IF NOT EXISTS idx_tienda_inv_tienda_marca ON tienda_inventario(tienda_id, marca);

-- Índice para cotizaciones
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_nombre);

-- Índice para tienda_ventas
CREATE INDEX IF NOT EXISTS idx_tienda_ventas_tienda ON tienda_ventas(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_ventas_fecha ON tienda_ventas(fecha DESC);

-- Índice para tienda_gastos
CREATE INDEX IF NOT EXISTS idx_tienda_gastos_tienda ON tienda_gastos(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_gastos_fecha ON tienda_gastos(fecha DESC);

-- Índice para tienda_envios
CREATE INDEX IF NOT EXISTS idx_tienda_envios_tienda ON tienda_envios(tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_envios_estado ON tienda_envios(estado);

-- Índice para usuarios
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- 3. ESTADÍSTICAS Y MANTENIMIENTO
-- =====================================================

-- Actualizar estadísticas de las tablas para mejor planificación de queries
ANALYZE inventory;
ANALYZE tiendas;
ANALYZE tienda_inventario;
ANALYZE cotizaciones;
ANALYZE tienda_ventas;
ANALYZE tienda_gastos;
ANALYZE tienda_envios;
ANALYZE users;

-- =====================================================
-- 4. VERIFICAR QUE REALTIME ESTÁ HABILITADO
-- =====================================================
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
