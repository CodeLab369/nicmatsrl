-- =============================================================================
-- NICMAT S.R.L. - Sistema de Gestión de Inventario y Cotizaciones
-- Migración Inicial: Tabla de Usuarios
-- =============================================================================

-- Habilitar UUID extension si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLA: users
-- Descripción: Almacena los usuarios del sistema
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- =============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- RLS (Row Level Security) Políticas
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios autenticados pueden ver todos los usuarios
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Política: Solo los admins pueden insertar usuarios
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
        OR NOT EXISTS (SELECT 1 FROM public.users) -- Permite crear el primer usuario
    );

-- Política: Los admins pueden actualizar cualquier usuario, los usuarios solo su propio perfil
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.users;
CREATE POLICY "Users can update own profile or admins can update any"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        auth_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Política: Solo los admins pueden eliminar usuarios
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
    ON public.users FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =============================================================================
COMMENT ON TABLE public.users IS 'Tabla de usuarios del sistema NICMAT S.R.L.';
COMMENT ON COLUMN public.users.id IS 'Identificador único del usuario';
COMMENT ON COLUMN public.users.auth_id IS 'Referencia al usuario de Supabase Auth';
COMMENT ON COLUMN public.users.username IS 'Nombre de usuario único para login';
COMMENT ON COLUMN public.users.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.users.role IS 'Rol del usuario: admin o user';
COMMENT ON COLUMN public.users.is_active IS 'Indica si el usuario está activo';
COMMENT ON COLUMN public.users.last_login IS 'Fecha y hora del último inicio de sesión';
COMMENT ON COLUMN public.users.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN public.users.updated_at IS 'Fecha de última actualización del registro';
