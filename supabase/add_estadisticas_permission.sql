-- Actualizar el campo permissions para incluir estadisticas
-- Ejecutar en Supabase SQL Editor

-- Actualizar usuarios existentes para agregar el permiso de estadísticas
UPDATE users 
SET permissions = permissions || '{"estadisticas": true}'::jsonb
WHERE permissions IS NOT NULL 
  AND NOT (permissions ? 'estadisticas');

-- Actualizar usuarios que tienen permissions NULL
UPDATE users 
SET permissions = '{"inventario": true, "tiendas": true, "cotizaciones": true, "estadisticas": true}'::jsonb
WHERE permissions IS NULL;

-- Verificar los cambios
SELECT id, username, full_name, permissions FROM users;
