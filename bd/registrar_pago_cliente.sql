-- 12 — registrar_pago_cliente
-- Versión 1.0
--
-- Registra el pago/abono a una deuda de cliente fiado.
-- Reduce el saldo pendiente del cliente e ingresa el dinero cobrado a caja física.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_pago_cliente(
    p_fecha date,
    p_cliente_id uuid,
    p_monto numeric(10,2),
    p_concepto text DEFAULT NULL
)
RETURNS TABLE (
    pago_id uuid,
    fecha date,
    cliente_id uuid,
    monto numeric(10,2),
    saldo_restante numeric(10,2),
    caja_movimiento_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid;
    v_rol text;
    v_pago_id uuid;
    v_caja_id uuid;
    v_total_fiado numeric(10,2);
    v_total_pagado numeric(10,2);
    v_saldo_actual numeric(10,2);
    v_nuevo_saldo numeric(10,2);
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
        RAISE EXCEPTION 'El usuario no tiene permiso para registrar pagos de clientes';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_cliente_id IS NULL THEN
        RAISE EXCEPTION 'Debe seleccionar un cliente';
    END IF;

    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto abonado debe ser mayor a cero';
    END IF;

    -- Calcular deudas del cliente
    SELECT COALESCE(SUM(vd.total), 0) INTO v_total_fiado
    FROM public.ventas_directas AS vd
    WHERE vd.cliente_id = p_cliente_id AND vd.estado = 'fiada';

    -- Calcular pagos anteriores del cliente
    SELECT COALESCE(SUM(pc.monto), 0) INTO v_total_pagado
    FROM public.pagos_clientes AS pc
    WHERE pc.cliente_id = p_cliente_id;

    v_saldo_actual := v_total_fiado - v_total_pagado;

    IF v_saldo_actual <= 0 THEN
        RAISE EXCEPTION 'El cliente no tiene saldo pendiente por pagar';
    END IF;

    IF p_monto > v_saldo_actual THEN
        RAISE EXCEPTION 'El monto abonado ($%) es superior al saldo pendiente del cliente ($%)', p_monto, v_saldo_actual;
    END IF;

    v_nuevo_saldo := v_saldo_actual - p_monto;

    -- Insertar pago de cliente
    INSERT INTO public.pagos_clientes (
        fecha,
        cliente_id,
        monto,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        p_cliente_id,
        p_monto,
        COALESCE(p_concepto, 'Abono a deuda de leche fiada'),
        v_usuario
    ) RETURNING id INTO v_pago_id;

    -- Insertar ingreso a caja física
    INSERT INTO public.movimientos_caja (
        fecha,
        tipo,
        monto,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        'pago_cliente',
        p_monto,
        'Pago de fiado recibidos en efectivo',
        v_usuario
    ) RETURNING id INTO v_caja_id;

    RETURN QUERY
    SELECT
        v_pago_id,
        p_fecha,
        p_cliente_id,
        p_monto,
        v_nuevo_saldo,
        v_caja_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pago_cliente(date, uuid, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_pago_cliente(date, uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_cliente(date, uuid, numeric, text) TO authenticated;

COMMIT;
