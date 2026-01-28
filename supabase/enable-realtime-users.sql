-- =====================================================
-- HABILITAR REALTIME EN TABLA USERS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Habilitar Realtime para la tabla users
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Verificar que está habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
