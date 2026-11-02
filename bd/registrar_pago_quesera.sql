-- 14 — registrar_pago_quesera
-- Versión 1.0
--
-- Registra el cobro de la liquidación de la quesera.
-- Marca las entregas como 'pagada' e ingresa el dinero recaudado a caja física.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_pago_quesera(
    p_fecha date,
    p_monto numeric(10,2),
    p_concepto text DEFAULT NULL
)
RETURNS TABLE (
    pago_id uuid,
    fecha date,
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
    v_total_pendiente numeric(10,2);
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

    IF v_rol NOT IN ('administrador') THEN
        RAISE EXCEPTION 'Solo los administradores pueden registrar pagos de la quesera';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto abonado debe ser mayor a cero';
    END IF;

    -- Calcular entregas pendientes
    SELECT COALESCE(SUM(eq.total), 0) INTO v_total_pendiente
    FROM public.entregas_quesera AS eq
    WHERE eq.estado = 'pendiente';

    IF v_total_pendiente <= 0 THEN
        RAISE EXCEPTION 'No existen entregas a la quesera pendientes de pago';
    END IF;

    IF p_monto > v_total_pendiente THEN
        RAISE EXCEPTION 'El monto cobrado ($%) es superior al acumulado pendiente de la quesera ($%)', p_monto, v_total_pendiente;
    END IF;

    v_nuevo_saldo := v_total_pendiente - p_monto;

    -- Insertar pago de quesera
    INSERT INTO public.pagos_quesera (
        fecha,
        monto,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        p_monto,
        COALESCE(p_concepto, 'Cobro de liquidación de quesera'),
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
        'pago_quesera',
        p_monto,
        'Cobro de liquidación de quesera recibido en efectivo',
        v_usuario
    ) RETURNING id INTO v_caja_id;

    -- Marcar entregas completadas bajo modelo FIFO
    DECLARE
        r RECORD;
        v_monto_restante numeric(10,2) := p_monto;
    BEGIN
        FOR r IN 
            SELECT eq.id, eq.total FROM public.entregas_quesera AS eq
            WHERE eq.estado = 'pendiente' 
            ORDER BY eq.fecha ASC, eq.created_at ASC 
        LOOP
            IF v_monto_restante >= r.total THEN
                UPDATE public.entregas_quesera AS eq SET estado = 'pagada' WHERE eq.id = r.id;
                v_monto_restante := v_monto_restante - r.total;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END;

    -- Si se pagó la totalidad del saldo pendiente, asegurar que todas queden en 'pagada'
    IF v_nuevo_saldo = 0 THEN
        UPDATE public.entregas_quesera AS eq
        SET estado = 'pagada'
        WHERE eq.estado = 'pendiente';
    END IF;

    RETURN QUERY
    SELECT
        v_pago_id,
        p_fecha,
        p_monto,
        v_nuevo_saldo,
        v_caja_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_pago_quesera(date, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_pago_quesera(date, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_quesera(date, numeric, text) TO authenticated;

COMMIT;
