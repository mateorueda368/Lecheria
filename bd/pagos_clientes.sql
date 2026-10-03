-- 11 — Tabla de Pagos de Clientes (Cobro de Fiados)
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.pagos_clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id),
    monto numeric(10,2) NOT NULL,
    concepto text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT pagos_clientes_monto_chk CHECK (monto > 0)
);

-- RLS
ALTER TABLE public.pagos_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_clientes_select_own_or_admin ON public.pagos_clientes;
CREATE POLICY pagos_clientes_select_own_or_admin ON public.pagos_clientes
FOR SELECT TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
