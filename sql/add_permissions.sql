-- Script para agregar los permisos estadisticas y movimientos a usuarios existentes
-- Ejecutar en la consola SQL de Supabase

-- Agregar permiso 'estadisticas' a usuarios que no lo tienen (establecer como false por defecto)
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{estadisticas}', 
  'false'::jsonb
)
WHERE permissions IS NULL OR NOT permissions ? 'estadisticas';

-- Agregar permiso 'movimientos' a usuarios que no lo tienen (establecer como false por defecto)
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{movimientos}', 
  'false'::jsonb
)
WHERE permissions IS NULL OR NOT permissions ? 'movimientos';

-- Para verificar los cambios:
-- SELECT id, username, permissions FROM users;

-- Si quieres habilitar movimientos para usuarios que ya tenían inventario:
-- UPDATE users 
-- SET permissions = jsonb_set(permissions, '{movimientos}', 'true')
-- WHERE permissions->>'inventario' = 'true';

-- Si quieres habilitar estadisticas para admins:
-- UPDATE users 
-- SET permissions = jsonb_set(permissions, '{estadisticas}', 'true')
-- WHERE role = 'admin';
