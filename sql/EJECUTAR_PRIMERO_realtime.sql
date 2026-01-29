-- =====================================================
-- ⚠️ SCRIPT CRÍTICO - EJECUTAR INMEDIATAMENTE
-- Sin esto, el tiempo real NO funcionará
-- =====================================================

-- PASO 1: Ver qué tablas tienen realtime ACTUALMENTE
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- PASO 2: HABILITAR REALTIME EN TODAS LAS TABLAS
-- Si alguna da error de "ya existe", está bien, continúa con la siguiente

DO $$ 
BEGIN
    -- Intentar agregar cada tabla, ignorar si ya existe
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
        RAISE NOTICE 'inventory agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'inventory ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tiendas;
        RAISE NOTICE 'tiendas agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'tiendas ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tienda_inventario;
        RAISE NOTICE 'tienda_inventario agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'tienda_inventario ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tienda_envios;
        RAISE NOTICE 'tienda_envios agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'tienda_envios ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tienda_ventas;
        RAISE NOTICE 'tienda_ventas agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'tienda_ventas ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE tienda_gastos;
        RAISE NOTICE 'tienda_gastos agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'tienda_gastos ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE cotizaciones;
        RAISE NOTICE 'cotizaciones agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'cotizaciones ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
        RAISE NOTICE 'users agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'users ya existe';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE empresa_config;
        RAISE NOTICE 'empresa_config agregada';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'empresa_config ya existe';
    END;
END $$;

-- PASO 3: VERIFICAR que todas las tablas están habilitadas
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

-- Deberías ver estas tablas:
-- cotizaciones
-- empresa_config
-- inventory
-- tienda_envios
-- tienda_gastos
-- tienda_inventario
-- tienda_ventas
-- tiendas
-- users
