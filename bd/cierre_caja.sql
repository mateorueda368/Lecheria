-- 16 — Tabla de Cierres de Caja
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.cierres_caja (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    caja_esperada numeric(10,2) NOT NULL,
    caja_fisica numeric(10,2) NOT NULL,
    diferencia numeric(10,2) NOT NULL,
    base_siguiente numeric(10,2) NOT NULL,
    retiro_cierre numeric(10,2) NOT NULL DEFAULT 0.00,
    observaciones text,
    cerrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cierres_caja_select_own_or_admin ON public.cierres_caja;
CREATE POLICY cierres_caja_select_own_or_admin ON public.cierres_caja
FOR SELECT TO authenticated
USING (
    cerrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
