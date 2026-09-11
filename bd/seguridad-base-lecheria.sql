-- 02 — Seguridad base Lechería
-- Versión 1.0
--
-- Instala únicamente RLS y políticas de lectura sobre las
-- tablas creadas por 01-migracion-base-lecheria.sql.
--
-- NO crea funciones RPC, usuarios, perfiles ni módulos de negocio.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producciones_leche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_leche ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS producciones_select_own_or_admin
ON public.producciones_leche;

CREATE POLICY producciones_select_own_or_admin
ON public.producciones_leche
FOR SELECT
TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.rol = 'administrador'
    )
);

DROP POLICY IF EXISTS movimientos_select_own_or_admin
ON public.movimientos_leche;

CREATE POLICY movimientos_select_own_or_admin
ON public.movimientos_leche
FOR SELECT
TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = auth.uid()
          AND p.rol = 'administrador'
    )
);

COMMIT;

-- No existen políticas INSERT/UPDATE/DELETE directas.
-- La escritura se instalará posteriormente mediante
-- registrar_produccion().
