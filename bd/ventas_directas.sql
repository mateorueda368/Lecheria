-- 04 — Tablas para Ventas Directas y Movimientos de Caja
-- Versión 1.0

BEGIN;

-- Tabla de Ventas Directas
CREATE TABLE IF NOT EXISTS public.ventas_directas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL,
    litros numeric(10,2) NOT NULL,
    precio_unitario numeric(10,2) NOT NULL DEFAULT 2500.00,
    total numeric(10,2) NOT NULL,
    estado text NOT NULL DEFAULT 'cobrada',
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT ventas_directas_litros_chk CHECK (litros > 0),
    CONSTRAINT ventas_directas_total_chk CHECK (total > 0),
    CONSTRAINT ventas_directas_jornada_chk CHECK (jornada IN ('manana', 'tarde')),
    CONSTRAINT ventas_directas_estado_chk CHECK (estado IN ('cobrada', 'fiada'))
);

-- Tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    tipo text NOT NULL,
    monto numeric(10,2) NOT NULL,
    concepto text,
    venta_id uuid REFERENCES public.ventas_directas(id),
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT movimientos_caja_monto_chk CHECK (monto != 0),
    CONSTRAINT movimientos_caja_tipo_chk CHECK (tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera', 'egreso_flete', 'retiro'))
);

-- RLS
ALTER TABLE public.ventas_directas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ventas_select_own_or_admin ON public.ventas_directas;
CREATE POLICY ventas_select_own_or_admin ON public.ventas_directas
FOR SELECT TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

DROP POLICY IF EXISTS movimientos_caja_select_own_or_admin ON public.movimientos_caja;
CREATE POLICY movimientos_caja_select_own_or_admin ON public.movimientos_caja
FOR SELECT TO authenticated
USING (
    registrado_por = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.rol = 'administrador'
    )
);

COMMIT;
