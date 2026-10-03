-- 06 — Tabla de Clientes y ajuste para Ventas Fiadas
-- Versión 1.0

BEGIN;

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    telefono text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Agregar columna cliente_id a ventas_directas si no existe
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ventas_directas' 
        AND column_name = 'cliente_id'
    ) THEN
        ALTER TABLE public.ventas_directas 
        ADD COLUMN cliente_id uuid REFERENCES public.clientes(id);
    END IF;
END $$;

-- RLS Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clientes_select_own_or_admin ON public.clientes;
CREATE POLICY clientes_select_own_or_admin ON public.clientes
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS clientes_insert_authenticated ON public.clientes;
CREATE POLICY clientes_insert_authenticated ON public.clientes
FOR INSERT TO authenticated
WITH CHECK (true);

COMMIT;
