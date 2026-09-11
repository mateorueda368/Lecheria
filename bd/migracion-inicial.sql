-- 09 — Migración inicial
-- Versión 1.2
-- Estructura corregida para auditoría cruzada.
--
-- NO ejecutar a ciegas sobre una base que ya tenga datos.
-- Comparar primero con el esquema instalado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.producciones_leche (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL,
    litros numeric(10,2) NOT NULL,
    registrado_por uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT producciones_leche_litros_chk
        CHECK (litros > 0),

    CONSTRAINT producciones_leche_jornada_chk
        CHECK (jornada IN ('manana', 'tarde')),

    CONSTRAINT producciones_leche_fecha_jornada_uk
        UNIQUE (fecha, jornada)
);

-- La FK de registrado_por se agregará después de comprobar
-- la tabla/columna real de usuarios o perfiles.
--
-- La protección anti-duplicación de movimientos se agregará
-- después de comprobar la estructura real de movimientos_leche.
--
-- No se inventan nombres de columnas.

COMMIT;

-- Validaciones obligatorias antes de considerarla definitiva:
-- 1. Tabla/columna real de usuarios para registrado_por.
-- 2. Estructura real de movimientos_leche.
-- 3. Identificación del origen de movimientos.
-- 4. RLS.
-- 5. Triggers/funciones que dependan de la estructura anterior.
