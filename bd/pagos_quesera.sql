-- 13 — Tabla de Pagos de Quesera (Liquidaciones Recibidas)
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.pagos_quesera (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    monto numeric(10,2) NOT NULL,
    concepto text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pagos_quesera_monto_chk CHECK (monto > 0)
);

-- RLS
ALTER TABLE public.pagos_quesera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_quesera_select_own_or_admin ON public.pagos_quesera;
CREATE POLICY pagos_quesera_select_own_or_admin ON public.pagos_quesera
FOR SELECT TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
