-- 01 — Migración base Lechería
-- Versión 1.0
-- Instalación inicial para un proyecto Supabase NUEVO.
--
-- Este archivo crea SOLO la estructura base:
-- profiles, producciones_leche y movimientos_leche.
-- No crea RLS, políticas, funciones RPC ni datos de prueba.

BEGIN;

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    rol text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_rol_chk
        CHECK (rol IN ('trabajador', 'administrador'))
);

CREATE TABLE public.producciones_leche (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL,
    litros numeric(10,2) NOT NULL,
    registrado_por uuid NOT NULL
        REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT producciones_leche_litros_chk
        CHECK (litros > 0),

    CONSTRAINT producciones_leche_jornada_chk
        CHECK (jornada IN ('manana', 'tarde')),

    CONSTRAINT producciones_leche_fecha_jornada_uk
        UNIQUE (fecha, jornada)
);

CREATE TABLE public.movimientos_leche (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    tipo text NOT NULL,
    litros numeric(10,2) NOT NULL,
    produccion_id uuid NOT NULL
        REFERENCES public.producciones_leche(id),
    registrado_por uuid NOT NULL
        REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT movimientos_leche_litros_chk
        CHECK (litros > 0),

    CONSTRAINT movimientos_leche_tipo_chk
        CHECK (tipo IN ('produccion')),

    CONSTRAINT movimientos_leche_produccion_uk
        UNIQUE (produccion_id)
);

COMMIT;

-- Siguiente etapa:
-- verificar tablas, columnas, FK, CHECK y UNIQUE.
-- Después se instalará la capa de seguridad.
