-- 03 — registrar_produccion
-- Versión 1.0
--
-- Primera operación transaccional del sistema.
-- Registra una producción y su movimiento asociado.
--
-- Requiere:
-- 01-migracion-base-lecheria.sql
-- 02-seguridad-base-lecheria.sql
--
-- NO registra ventas, fiados, consumo, quesera ni caja.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_produccion(
    p_fecha date,
    p_jornada text,
    p_litros numeric(10,2)
)
RETURNS TABLE (
    produccion_id uuid,
    fecha date,
    jornada text,
    litros numeric(10,2),
    movimiento_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid;
    v_rol text;
    v_produccion_id uuid;
    v_movimiento_id uuid;
    v_constraint text;
BEGIN
    -- Usuario autenticado
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- El perfil debe existir y tener un rol válido.
    SELECT p.rol
      INTO v_rol
      FROM public.profiles AS p
     WHERE p.id = v_usuario;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario autenticado no tiene un perfil registrado';
    END IF;

    IF v_rol NOT IN ('trabajador', 'administrador') THEN
        RAISE EXCEPTION 'El usuario no tiene permiso para registrar producción';
    END IF;

    -- Validaciones de entrada.
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_jornada IS NULL
       OR p_jornada NOT IN ('manana', 'tarde') THEN
        RAISE EXCEPTION 'La jornada debe ser manana o tarde';
    END IF;

    IF p_litros IS NULL
       OR p_litros <= 0 THEN
        RAISE EXCEPTION 'Los litros deben ser mayores que cero';
    END IF;

    -- Producción.
    INSERT INTO public.producciones_leche (
        fecha,
        jornada,
        litros,
        registrado_por
    )
    VALUES (
        p_fecha,
        p_jornada,
        p_litros,
        v_usuario
    )
    RETURNING id INTO v_produccion_id;

    -- Movimiento correspondiente a la producción.
    INSERT INTO public.movimientos_leche (
        fecha,
        tipo,
        litros,
        produccion_id,
        registrado_por
    )
    VALUES (
        p_fecha,
        'produccion',
        p_litros,
        v_produccion_id,
        v_usuario
    )
    RETURNING id INTO v_movimiento_id;

    RETURN QUERY
    SELECT
        v_produccion_id,
        p_fecha,
        p_jornada,
        p_litros,
        v_movimiento_id;

EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;

        IF v_constraint = 'producciones_leche_fecha_jornada_uk' THEN
            RAISE EXCEPTION
                'Ya existe una producción para la fecha % y jornada %',
                p_fecha, p_jornada;
        END IF;

        RAISE;
END;
$$;

-- La función no debe quedar ejecutable por cualquier rol.
REVOKE ALL ON FUNCTION public.registrar_produccion(date, text, numeric)
FROM PUBLIC;

REVOKE ALL ON FUNCTION public.registrar_produccion(date, text, numeric)
FROM anon;

GRANT EXECUTE ON FUNCTION public.registrar_produccion(date, text, numeric)
TO authenticated;

COMMENT ON FUNCTION public.registrar_produccion(date, text, numeric)
IS 'Registra una producción de leche y su único movimiento asociado de forma atómica. No registra ventas, fiados, consumo, quesera ni caja.';

COMMIT;
