-- ============================================
-- Agregar columna metodo_pago a deuda_operaciones
-- Ejecutar en Supabase SQL Editor
-- ============================================

ALTER TABLE deuda_operaciones
ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT '';

SELECT 'Columna metodo_pago agregada exitosamente' AS resultado;
