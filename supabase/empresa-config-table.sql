-- Tabla de configuración de la empresa para cotizaciones
CREATE TABLE IF NOT EXISTS empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Datos de la empresa
  nombre VARCHAR(255) NOT NULL DEFAULT 'NICMAT S.R.L.',
  nit VARCHAR(50) DEFAULT '',
  direccion TEXT DEFAULT '',
  ciudad VARCHAR(100) DEFAULT '',
  telefono_principal VARCHAR(50) DEFAULT '',
  telefono_secundario VARCHAR(50) DEFAULT '',
  telefono_adicional VARCHAR(50) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  
  -- Logo (base64)
  logo TEXT DEFAULT NULL,
  
  -- Color principal del PDF
  color_principal VARCHAR(20) DEFAULT '#1a5f7a',
  
  -- Configuración de numeración
  prefijo_cotizacion VARCHAR(20) DEFAULT 'COT',
  siguiente_numero INTEGER DEFAULT 1,
  
  -- Pie de página
  pie_empresa VARCHAR(255) DEFAULT '',
  pie_agradecimiento VARCHAR(255) DEFAULT '¡Gracias por su preferencia!',
  pie_contacto VARCHAR(255) DEFAULT '',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO empresa_config (
  nombre, nit, direccion, ciudad, 
  telefono_principal, telefono_secundario, email,
  color_principal, prefijo_cotizacion, siguiente_numero,
  pie_empresa, pie_agradecimiento, pie_contacto
) VALUES (
  'NICMAT S.R.L.',
  '',
  '',
  'Bolivia',
  '',
  '',
  '',
  '#1a5f7a',
  'COT',
  1,
  'NICMAT S.R.L.',
  '¡Gracias por su preferencia!',
  ''
) ON CONFLICT DO NOTHING;

-- Si ya existe la tabla, agregar la columna color_principal
ALTER TABLE empresa_config ADD COLUMN IF NOT EXISTS color_principal VARCHAR(20) DEFAULT '#1a5f7a';
