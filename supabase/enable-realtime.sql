-- =====================================================
-- HABILITAR REALTIME EN LA TABLA INVENTORY
-- =====================================================
-- Ejecutar este SQL en Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Habilitar la publicación de Realtime para la tabla inventory
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- Verificar que la tabla esté en la publicación
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
