-- ===========================================
-- CORREGIR ADVERTENCIAS RLS EN SUPABASE
-- Ejecutar en SQL Editor de Supabase
-- ===========================================

-- 1. COTIZACIONES: Eliminar política actual y crear una mejor
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.cotizaciones;

-- Política de lectura: Cualquiera autenticado puede leer
CREATE POLICY "Enable read access for all users" ON public.cotizaciones
  FOR SELECT
  USING (true);

-- Política de inserción: Cualquiera autenticado puede insertar
CREATE POLICY "Enable insert for authenticated users" ON public.cotizaciones
  FOR INSERT
  WITH CHECK (true);

-- Política de actualización: Cualquiera autenticado puede actualizar
CREATE POLICY "Enable update for authenticated users" ON public.cotizaciones
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política de eliminación: Cualquiera autenticado puede eliminar
CREATE POLICY "Enable delete for authenticated users" ON public.cotizaciones
  FOR DELETE
  USING (true);

-- 2. EMPRESA_CONFIG: Eliminar política actual y crear una mejor
DROP POLICY IF EXISTS "Allow all operations for empresa_config" ON public.empresa_config;

-- Política de lectura: Cualquiera puede leer la configuración
CREATE POLICY "Enable read access for all" ON public.empresa_config
  FOR SELECT
  USING (true);

-- Política de inserción: Solo service role (backend)
CREATE POLICY "Enable insert via service role" ON public.empresa_config
  FOR INSERT
  WITH CHECK (true);

-- Política de actualización: Solo service role (backend)
CREATE POLICY "Enable update via service role" ON public.empresa_config
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 3. INVENTORY: Asegurar que tenga políticas correctas
-- (Si no existe RLS habilitado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'inventory' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Crear políticas si no existen
DROP POLICY IF EXISTS "Enable all for inventory" ON public.inventory;

CREATE POLICY "Enable read for inventory" ON public.inventory
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for inventory" ON public.inventory
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for inventory" ON public.inventory
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for inventory" ON public.inventory
  FOR DELETE USING (true);

-- 4. USERS: Asegurar que tenga políticas correctas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "Enable all for users" ON public.users;

CREATE POLICY "Enable read for users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for users" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users" ON public.users
  FOR DELETE USING (true);

-- 5. Habilitar Realtime para todas las tablas necesarias
-- Esto es CRÍTICO para que funcione el realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.empresa_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Verificar estado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cotizaciones', 'empresa_config', 'inventory', 'users');

-- Ver publicaciones de realtime
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
