-- Tabla para guardar configuraciones de PDF por módulo
CREATE TABLE IF NOT EXISTS pdf_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL UNIQUE, -- 'inventario', 'cotizaciones', etc.
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda rápida por módulo
CREATE INDEX IF NOT EXISTS idx_pdf_config_modulo ON pdf_config(modulo);

-- Habilitar RLS
ALTER TABLE pdf_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura/escritura a usuarios autenticados
CREATE POLICY "Permitir todo a usuarios" ON pdf_config
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pdf_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdf_config_updated_at
  BEFORE UPDATE ON pdf_config
  FOR EACH ROW
  EXECUTE FUNCTION update_pdf_config_updated_at();

-- Insertar configuración por defecto para inventario
INSERT INTO pdf_config (modulo, config) VALUES 
('inventario', '{
  "titulo": "INVENTARIO DE BATERÍAS",
  "subtitulo": "Listado completo de productos en stock",
  "empresa": "NICMAT S.R.L.",
  "colorPrincipal": "#1a5f7a",
  "mostrarCosto": true,
  "mostrarPrecioVenta": true,
  "mostrarTotales": true,
  "mostrarFecha": true,
  "mostrarLogo": true,
  "itemsPorPagina": 25
}'::jsonb)
ON CONFLICT (modulo) DO NOTHING;
