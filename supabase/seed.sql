-- =============================================================================
-- NICMAT S.R.L. - Script de Seed (Datos Iniciales)
-- =============================================================================
-- IMPORTANTE: Este script debe ejecutarse DESPUÉS de crear el usuario en Supabase Auth
-- 
-- PASOS PARA CREAR EL USUARIO ADMIN INICIAL:
-- 
-- 1. Ve a tu proyecto en Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Ve a Authentication > Users
-- 3. Click en "Add user" > "Create new user"
-- 4. Ingresa:
--    - Email: nestor@nicmat.local
--    - Password: 1346795
--    - Auto Confirm User: ✓ (activar)
-- 5. Click en "Create user"
-- 6. Copia el UUID del usuario creado
-- 7. Ejecuta el siguiente SQL reemplazando 'TU_AUTH_ID_AQUI' con el UUID copiado
-- =============================================================================

-- Insertar usuario admin inicial
-- REEMPLAZA 'TU_AUTH_ID_AQUI' con el UUID del usuario creado en Supabase Auth
INSERT INTO public.users (auth_id, username, full_name, role, is_active)
VALUES (
    'TU_AUTH_ID_AQUI'::uuid,  -- ← Reemplazar con el UUID real
    'Nestor',
    'Nestor (Administrador)',
    'admin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- =============================================================================
-- Verificar que el usuario se creó correctamente
-- =============================================================================
-- SELECT * FROM public.users WHERE username = 'Nestor';
