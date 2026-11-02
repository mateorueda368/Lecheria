-- 10 — registrar_entrega_quesera
-- Versión 1.0
--
-- Registra una entrega de leche a la quesera a $1.950/L.
-- Descuenta los litros de leche y acumula el saldo a favor en estado 'pendiente'.
-- NO genera dinero inmediato en caja.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_entrega_quesera(
    p_fecha date,
    p_jornada text,
    p_litros numeric(10,2)
)
RETURNS TABLE (
    entrega_id uuid,
    fecha date,
    jornada text,
    litros numeric(10,2),
    precio_unitario numeric(10,2),
    total numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DECLARE
    v_usuario uuid;
    v_rol text;
    v_entrega_id uuid;
    v_total numeric(10,2);
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
        RAISE EXCEPTION 'El usuario no tiene permiso para registrar entregas a quesera';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_jornada IS NULL OR p_jornada NOT IN ('manana', 'tarde') THEN
        RAISE EXCEPTION 'La jornada debe ser manana o tarde';
    END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN
        RAISE EXCEPTION 'Los litros a entregar deben ser mayores que cero';
    END IF;

    -- Buscar la producción de esa jornada con alias pl para evitar ambigüedad
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

    -- Calcular total ($1.950/L)
    v_total := p_litros * 1950.00;

    -- Inserta Entrega Quesera
    INSERT INTO public.entregas_quesera (
        fecha,
        jornada,
        litros,
        precio_unitario,
        total,
        estado,
        registrado_por
    ) VALUES (
        p_fecha,
        p_jornada,
        p_litros,
        1950.00,
        v_total,
        'pendiente',
        v_usuario
    ) RETURNING id INTO v_entrega_id;

    -- Movimiento de leche (Salida)
    INSERT INTO public.movimientos_leche (
        fecha,
        tipo,
        litros,
        produccion_id,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        'entrega_quesera',
        p_litros,
        v_produccion_id,
        'Entrega a quesera (' || p_litros || ' L)',
        v_usuario
    );

    RETURN QUERY
    SELECT
        v_entrega_id,
        p_fecha,
        p_jornada,
        p_litros,
        1950.00::numeric(10,2),
        v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_entrega_quesera(date, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_entrega_quesera(date, text, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_quesera(date, text, numeric) TO authenticated;

COMMIT;
