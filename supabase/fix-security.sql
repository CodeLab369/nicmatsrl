-- ===========================================
-- CORREGIR PROBLEMAS DE SEGURIDAD EN SUPABASE
-- ===========================================

-- 1. Habilitar RLS en tabla cotizaciones
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (ya que usamos service_role_key en el backend)
CREATE POLICY "Allow all operations for authenticated users" ON public.cotizaciones
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Habilitar RLS en tabla empresa_config
ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones
CREATE POLICY "Allow all operations for empresa_config" ON public.empresa_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Arreglar la función generate_cotizacion_numero con search_path
-- Primero eliminar el trigger que depende de la función
DROP TRIGGER IF EXISTS trigger_cotizacion_numero ON public.cotizaciones;

-- Ahora eliminar la función
DROP FUNCTION IF EXISTS public.generate_cotizacion_numero() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_cotizacion_numero()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year TEXT;
  next_num INTEGER;
  prefijo TEXT;
  resultado TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Obtener prefijo de la configuración
  SELECT COALESCE(ec.prefijo_cotizacion, 'COT') INTO prefijo
  FROM empresa_config ec
  LIMIT 1;
  
  -- Si no hay configuración, usar prefijo por defecto
  IF prefijo IS NULL THEN
    prefijo := 'COT';
  END IF;
  
  -- Contar cotizaciones del año actual y generar siguiente número
  SELECT COUNT(*) + 1 INTO next_num
  FROM cotizaciones
  WHERE EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Formato: COT-2026-0001
  resultado := prefijo || '-' || current_year || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN resultado;
END;
$$;

-- Recrear el trigger para generar número automáticamente
CREATE OR REPLACE FUNCTION public.set_cotizacion_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    NEW.numero := generate_cotizacion_numero();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_cotizacion_numero
  BEFORE INSERT ON public.cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION set_cotizacion_numero();

-- Verificar que las tablas tienen RLS habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config');
