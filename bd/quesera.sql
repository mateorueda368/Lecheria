-- 09 — Tabla de Entregas a la Quesera
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.entregas_quesera (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL,
    litros numeric(10,2) NOT NULL,
    precio_unitario numeric(10,2) NOT NULL DEFAULT 1950.00,
    total numeric(10,2) NOT NULL,
    estado text NOT NULL DEFAULT 'pendiente',
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT entregas_quesera_litros_chk CHECK (litros > 0),
    CONSTRAINT entregas_quesera_total_chk CHECK (total > 0),
    CONSTRAINT entregas_quesera_jornada_chk CHECK (jornada IN ('manana', 'tarde')),
    CONSTRAINT entregas_quesera_estado_chk CHECK (estado IN ('pendiente', 'pagada'))
);

-- RLS
ALTER TABLE public.entregas_quesera ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entregas_quesera_select_own_or_admin ON public.entregas_quesera;
CREATE POLICY entregas_quesera_select_own_or_admin ON public.entregas_quesera
FOR SELECT TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
