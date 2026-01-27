-- Tabla de cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) UNIQUE NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Datos del cliente
  cliente_nombre VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  cliente_direccion TEXT,
  
  -- Productos (JSON array)
  productos JSONB NOT NULL DEFAULT '[]',
  
  -- Totales
  total_unidades INTEGER NOT NULL DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Estado y vigencia
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  vigencia_dias INTEGER NOT NULL DEFAULT 7,
  fecha_vencimiento DATE NOT NULL,
  
  -- Términos y condiciones
  terminos TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(numero);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(cliente_nombre);

-- Función para generar número de cotización automático
CREATE OR REPLACE FUNCTION generate_cotizacion_numero()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  new_numero TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM cotizaciones
  WHERE numero LIKE 'COT-' || year_part || '-%';
  
  new_numero := 'COT-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  NEW.numero := new_numero;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar número
DROP TRIGGER IF EXISTS trigger_cotizacion_numero ON cotizaciones;
CREATE TRIGGER trigger_cotizacion_numero
  BEFORE INSERT ON cotizaciones
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generate_cotizacion_numero();

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cotizaciones;

-- Comentarios
COMMENT ON TABLE cotizaciones IS 'Cotizaciones para clientes';
COMMENT ON COLUMN cotizaciones.productos IS 'Array JSON con productos: [{marca, amperaje, cantidad, precio, total}]';
COMMENT ON COLUMN cotizaciones.estado IS 'pendiente, aceptada, rechazada, convertida, vencida';
