-- 18 — Tabla de Correcciones y Ajustes Trazables
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.correcciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    modulo text NOT NULL,
    registro_id uuid,
    litros_diferencia numeric(10,2) NOT NULL DEFAULT 0.00,
    monto_diferencia numeric(10,2) NOT NULL DEFAULT 0.00,
    motivo text NOT NULL,
    corregido_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT correcciones_modulo_chk CHECK (modulo IN ('produccion', 'venta', 'consumo', 'quesera', 'caja')),
    CONSTRAINT correcciones_motivo_chk CHECK (length(trim(motivo)) > 0)
);

-- RLS
ALTER TABLE public.correcciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS correcciones_select_own_or_admin ON public.correcciones;
CREATE POLICY correcciones_select_own_or_admin ON public.correcciones
FOR SELECT TO authenticated
USING (
    corregido_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
