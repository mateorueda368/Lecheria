-- 08 — registrar_consumo
-- Versión 1.0
--
-- Registra los litros de leche destinados al consumo de la finca.
-- Descuenta la leche disponible. NO afecta la caja ni genera cuentas por cobrar.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_consumo(
    p_fecha date,
    p_jornada text,
    p_litros numeric(10,2),
    p_observacion text DEFAULT NULL
)
RETURNS TABLE (
    movimiento_id uuid,
    fecha date,
    jornada text,
    litros numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DECLARE
    v_usuario uuid;
    v_rol text;
    v_movimiento_id uuid;
    v_produccion_id uuid;
    v_stock_disponible numeric(10,2);
BEGIN
    -- Usuario autenticado
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Validar rol
    SELECT p.rol INTO v_rol FROM public.profiles AS p WHERE p.id = v_usuario;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario autenticado no tiene un perfil registrado';
    END IF;

    IF v_rol NOT IN ('trabajador', 'administrador') THEN
        RAISE EXCEPTION 'El usuario no tiene permiso para registrar consumo';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_jornada IS NULL OR p_jornada NOT IN ('manana', 'tarde') THEN
        RAISE EXCEPTION 'La jornada debe ser manana o tarde';
    END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN
        RAISE EXCEPTION 'Los litros de consumo deben ser mayores que cero';
    END IF;

    -- Buscar la producción de esa jornada con alias pl
    SELECT pl.id INTO v_produccion_id
    FROM public.producciones_leche AS pl
    WHERE pl.fecha = p_fecha AND pl.jornada = p_jornada;

    IF v_produccion_id IS NULL THEN
        RAISE EXCEPTION 'No se ha registrado producción para la % del %', p_jornada, p_fecha;
    END IF;

    -- Validar stock de leche disponible (RN-011)
    SELECT COALESCE(SUM(
        CASE 
            WHEN ml.tipo = 'produccion' THEN ml.litros 
            WHEN ml.tipo = 'correccion' THEN ml.litros 
            ELSE -ml.litros 
        END
    ), 0)
    INTO v_stock_disponible FROM public.movimientos_leche AS ml;

    IF p_litros > v_stock_disponible THEN
        RAISE EXCEPTION 'Stock insuficiente de leche. Litros disponibles: %, solicitados: %', v_stock_disponible, p_litros;
    END IF;

    -- Movimiento de leche (Consumo Salida)
    INSERT INTO public.movimientos_leche (
        fecha,
        tipo,
        litros,
        produccion_id,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        'consumo',
        p_litros,
        v_produccion_id,
        COALESCE(p_observacion, 'Consumo finca (' || p_litros || ' L)'),
        v_usuario
    ) RETURNING id INTO v_movimiento_id;

    RETURN QUERY
    SELECT
        v_movimiento_id,
        p_fecha,
        p_jornada,
        p_litros;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_consumo(date, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_consumo(date, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_consumo(date, text, numeric, text) TO authenticated;

COMMIT;
