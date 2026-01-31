-- Tabla para guardar configuraciones de PDF por módulo
CREATE TABLE IF NOT EXISTS pdf_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE pdf_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo a usuarios autenticados
CREATE POLICY "Permitir todo a usuarios" ON pdf_config
  FOR ALL USING (true) WITH CHECK (true);

-- Índice para búsquedas rápidas por módulo
CREATE INDEX IF NOT EXISTS idx_pdf_config_modulo ON pdf_config(modulo);
