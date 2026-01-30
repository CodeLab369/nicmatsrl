-- Agregar columna notification_permissions a la tabla users
-- Ejecutar este script en Supabase SQL Editor

-- Agregar columna si no existe
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS notification_permissions JSONB DEFAULT '{
  "stockBajo": true,
  "stockAgotado": true,
  "cotizacionPorVencer": true,
  "nuevaCotizacion": true,
  "cotizacionEstado": true,
  "envioTienda": true,
  "usuarioConectado": false
}'::jsonb;

-- Actualizar usuarios existentes que no tengan permisos de notificaciones
UPDATE users 
SET notification_permissions = '{
  "stockBajo": true,
  "stockAgotado": true,
  "cotizacionPorVencer": true,
  "nuevaCotizacion": true,
  "cotizacionEstado": true,
  "envioTienda": true,
  "usuarioConectado": false
}'::jsonb
WHERE notification_permissions IS NULL;

-- Verificar
SELECT id, username, notification_permissions FROM users;
