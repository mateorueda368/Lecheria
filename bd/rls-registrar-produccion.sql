-- RLS y privilegios — registrar_produccion
-- Versión 1.1
--
-- Objetivo:
-- registrar_produccion() es la única puerta de escritura para
-- producción y su movimiento durante esta etapa.
--
-- IMPORTANTE:
-- Ejecutar después de crear registrar_produccion().
-- Comparar primero con el esquema instalado.

BEGIN;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producciones_leche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_leche ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ============================================================
-- PRODUCCIONES
-- ============================================================

DROP POLICY IF EXISTS producciones_insert_authenticated
    ON public.producciones_leche;

DROP POLICY IF EXISTS producciones_select_own
    ON public.producciones_leche;

CREATE POLICY producciones_select_own
ON public.producciones_leche
FOR SELECT
TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.rol = 'administrador'
    )
);

-- No se crea política INSERT para producciones_leche.
-- La escritura se realizará mediante registrar_produccion()
-- y su modelo de seguridad se cerrará junto con el RPC.

-- ============================================================
-- MOVIMIENTOS
-- ============================================================

DROP POLICY IF EXISTS movimientos_insert_produccion_own
    ON public.movimientos_leche;

DROP POLICY IF EXISTS movimientos_select_own
    ON public.movimientos_leche;

CREATE POLICY movimientos_select_own
ON public.movimientos_leche
FOR SELECT
TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.rol = 'administrador'
    )
);

-- No se crea política INSERT para movimientos_leche.
-- La escritura se realizará mediante registrar_produccion().

-- ============================================================
-- EXECUTE
-- ============================================================

REVOKE ALL
ON FUNCTION public.registrar_produccion(date, text, numeric)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.registrar_produccion(date, text, numeric)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.registrar_produccion(date, text, numeric)
TO authenticated;

COMMIT;
