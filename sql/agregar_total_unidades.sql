-- =====================================================
-- AGREGAR COLUMNA total_unidades A tienda_ventas
-- =====================================================
-- Esta columna es necesaria para las estadísticas de ventas por tienda
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tienda_ventas' AND column_name = 'total_unidades'
    ) THEN
        ALTER TABLE tienda_ventas ADD COLUMN total_unidades INTEGER DEFAULT 0;
        RAISE NOTICE 'Columna total_unidades agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna total_unidades ya existe';
    END IF;
END $$;

-- 2. Actualizar las ventas existentes calculando total_unidades desde los items
UPDATE tienda_ventas tv
SET total_unidades = (
    SELECT COALESCE(SUM(cantidad), 0)
    FROM tienda_venta_items
    WHERE venta_id = tv.id
)
WHERE total_unidades = 0 OR total_unidades IS NULL;

-- 3. Verificar los datos actualizados
SELECT 
    tv.id,
    t.nombre as tienda,
    tv.fecha,
    tv.total_unidades,
    tv.total_venta,
    tv.ganancia
FROM tienda_ventas tv
JOIN tiendas t ON t.id = tv.tienda_id
ORDER BY tv.fecha DESC
LIMIT 20;
