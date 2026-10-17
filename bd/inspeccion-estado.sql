-- ============================================================================
-- INSPECCIÓN DE ESTADO (SOLO LECTURA)
-- Ejecutar en el SQL Editor de Supabase y pegar la salida completa.
-- No modifica ningún objeto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Funciones RPC expuestas: firma, argumentos con DEFAULT, SECURITY, search_path
-- ----------------------------------------------------------------------------
SELECT p.oid::regprocedure AS funcion,
       pg_get_function_arguments(p.oid) AS argumentos,
       pg_get_function_result(p.oid) AS retorno,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS seguridad,
       p.proconfig AS config,
       md5(p.prosrc) AS checksum_codigo,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_ejecuta,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_ejecuta,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_ejecuta
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.oid::regprocedure::text;

-- ----------------------------------------------------------------------------
-- 2. Cuerpo de las funciones críticas (detecta qué variante está instalada)
-- ----------------------------------------------------------------------------
SELECT p.oid::regprocedure::text AS funcion, p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.oid::regprocedure::text IN (
    'registrar_correccion(date,text,uuid,numeric,numeric,text)',
    'registrar_correccion(date,text,numeric,numeric,text)',
    'registrar_pago_quesera(date,numeric,text)',
    'registrar_egreso_caja(date,text,numeric,text)',
    'registrar_pago_cliente(date,uuid,numeric,text)',
    'handle_new_user()',
    'is_admin()'
  )
ORDER BY 1;

-- ----------------------------------------------------------------------------
-- 3. handle_new_user completo (verifica si acepta rol desde raw_user_meta_data)
-- ----------------------------------------------------------------------------
SELECT p.oid::regprocedure::text AS funcion, p.prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- ----------------------------------------------------------------------------
-- 4. Tablas: existencia, RLS y owner
-- ----------------------------------------------------------------------------
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       c.relforcerowsecurity AS rls_forzado,
       pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- ----------------------------------------------------------------------------
-- 5. Políticas RLS vigentes
-- ----------------------------------------------------------------------------
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ----------------------------------------------------------------------------
-- 6. Constraints: CHECK, UNIQUE, FK, NOT NULL de las tablas de negocio
-- ----------------------------------------------------------------------------
SELECT conrelid::regclass::text AS tabla,
       conname AS constraint,
       CASE contype
         WHEN 'c' THEN 'CHECK'
         WHEN 'u' THEN 'UNIQUE'
         WHEN 'p' THEN 'PRIMARY KEY'
         WHEN 'f' THEN 'FOREIGN KEY'
       END AS tipo,
       pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, contype, conname;

-- ----------------------------------------------------------------------------
-- 7. Índices existentes
-- ----------------------------------------------------------------------------
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ----------------------------------------------------------------------------
-- 8. Privilegios directos sobre las tablas (por si hay grants fuera de RLS)
-- ----------------------------------------------------------------------------
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

-- ----------------------------------------------------------------------------
-- 9. Triggers
-- ----------------------------------------------------------------------------
SELECT event_object_table AS tabla, trigger_name, action_statement, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ----------------------------------------------------------------------------
-- 10. Perfiles: cuántos usuarios y qué roles hay (detecta admins auto-asignados)
-- ----------------------------------------------------------------------------
SELECT rol, count(*) AS cantidad
FROM public.profiles
GROUP BY rol
ORDER BY rol;

SELECT id, email, nombre, rol, created_at
FROM public.profiles
ORDER BY created_at;
