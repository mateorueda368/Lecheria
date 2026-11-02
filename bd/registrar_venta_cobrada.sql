-- 05 — registrar_venta_cobrada
-- Versión 1.0
--
-- Registra una venta directa en efectivo a $2.500/L.
-- Descuenta los litros de leche e ingresa el valor cobrado en caja.

BEGIN;

-- Ajustar restricciones de movimientos_leche si es necesario
ALTER TABLE public.movimientos_leche DROP CONSTRAINT IF EXISTS movimientos_leche_tipo_chk;
ALTER TABLE public.movimientos_leche ADD CONSTRAINT movimientos_leche_tipo_chk 
    CHECK (tipo IN ('produccion', 'venta_cobrada', 'venta_fiada', 'consumo', 'entrega_quesera', 'correccion'));

ALTER TABLE public.movimientos_leche ALTER COLUMN produccion_id DROP NOT NULL;
ALTER TABLE public.movimientos_leche DROP CONSTRAINT IF EXISTS movimientos_leche_produccion_uk;

CREATE OR REPLACE FUNCTION public.registrar_venta_cobrada(
    p_fecha date,
    p_jornada text,
    p_litros numeric(10,2)
)
RETURNS TABLE (
    venta_id uuid,
    fecha date,
    jornada text,
    litros numeric(10,2),
    precio_unitario numeric(10,2),
    total numeric(10,2),
    caja_movimiento_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    DECLARE
    v_usuario uuid;
    v_rol text;
    v_venta_id uuid;
    v_caja_id uuid;
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
        RAISE EXCEPTION 'El usuario no tiene permiso para registrar ventas';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_jornada IS NULL OR p_jornada NOT IN ('manana', 'tarde') THEN
        RAISE EXCEPTION 'La jornada debe ser manana o tarde';
    END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN
        RAISE EXCEPTION 'Los litros a vender deben ser mayores que cero';
    END IF;

    -- Buscar la producción de esa jornada
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

    -- Calcular total ($2.500/L)
    v_total := p_litros * 2500.00;

    -- Inserta Venta Directa
    INSERT INTO public.ventas_directas (
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
        2500.00,
        v_total,
        'cobrada',
        v_usuario
    ) RETURNING id INTO v_venta_id;

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
        'venta_cobrada',
        p_litros,
        v_produccion_id,
        'Venta directa cobrada en efectivo (' || p_litros || ' L)',
        v_usuario
    );

    -- Ingreso a caja
    INSERT INTO public.movimientos_caja (
        fecha,
        tipo,
        monto,
        concepto,
        venta_id,
        registrado_por
    ) VALUES (
        p_fecha,
        'ingreso_venta',
        v_total,
        'Venta directa cobrada en efectivo (' || p_litros || ' L)',
        v_venta_id,
        v_usuario
    ) RETURNING id INTO v_caja_id;

    RETURN QUERY
    SELECT
        v_venta_id,
        p_fecha,
        p_jornada,
        p_litros,
        2500.00::numeric(10,2),
        v_total,
        v_caja_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_venta_cobrada(date, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_venta_cobrada(date, text, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta_cobrada(date, text, numeric) TO authenticated;

COMMIT;
