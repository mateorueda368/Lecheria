-- 17 — realizar_cierre_caja
-- Versión 1.0
--
-- Compara la caja esperada contra el dinero físico contado, determina descuadres
-- y genera automáticamente el retiro de saldo excedente hacia la base del siguiente período.

BEGIN;

CREATE OR REPLACE FUNCTION public.realizar_cierre_caja(
    p_fecha date,
    p_caja_fisica numeric(10,2),
    p_base_siguiente numeric(10,2),
    p_observaciones text DEFAULT NULL
)
RETURNS TABLE (
    cierre_id uuid,
    fecha date,
    caja_esperada numeric(10,2),
    caja_fisica numeric(10,2),
    diferencia numeric(10,2),
    base_siguiente numeric(10,2),
    retiro_cierre numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid;
    v_rol text;
    v_cierre_id uuid;
    v_base_anterior numeric(10,2) := 0;
    v_ultimo_cierre_ts timestamptz;
    v_ingresos numeric(10,2) := 0;
    v_egresos numeric(10,2) := 0;
    v_caja_esperada numeric(10,2) := 0;
    v_diferencia numeric(10,2) := 0;
    v_retiro numeric(10,2) := 0;
BEGIN
    -- Usuario autenticado
    v_usuario := auth.uid();

    IF v_usuario IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Validar rol (Solo administrador)
    SELECT p.rol INTO v_rol FROM public.profiles AS p WHERE p.id = v_usuario;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario autenticado no tiene un perfil registrado';
    END IF;

    IF v_rol NOT IN ('administrador') THEN
        RAISE EXCEPTION 'Solo el administrador puede realizar cierres de caja';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_caja_fisica IS NULL OR p_caja_fisica < 0 THEN
        RAISE EXCEPTION 'El dinero físico contado no puede ser negativo';
    END IF;

    IF p_base_siguiente IS NULL OR p_base_siguiente < 0 THEN
        RAISE EXCEPTION 'La base para el siguiente período no puede ser negativa';
    END IF;

    -- 1. Obtener la base y timestamp del último cierre (si existe)
    SELECT cc.base_siguiente, cc.created_at 
    INTO v_base_anterior, v_ultimo_cierre_ts
    FROM public.cierres_caja AS cc
    ORDER BY cc.created_at DESC
    LIMIT 1;

    v_base_anterior := COALESCE(v_base_anterior, 0);

    -- 2. Calcular ingresos de caja desde el último cierre (incluyendo correcciones positivas)
    SELECT COALESCE(SUM(mc.monto), 0) INTO v_ingresos
    FROM public.movimientos_caja AS mc
    WHERE (mc.tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera') OR (mc.tipo = 'correccion' AND mc.monto > 0))
      AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

    -- 3. Calcular egresos de caja desde el último cierre (incluyendo correcciones negativas y excluyendo retiro por cierre)
    SELECT COALESCE(SUM(ABS(mc.monto)), 0) INTO v_egresos
    FROM public.movimientos_caja AS mc
    WHERE ((mc.tipo IN ('egreso_flete', 'retiro') AND (mc.concepto IS NULL OR mc.concepto NOT LIKE '%cierre de caja%'))
           OR (mc.tipo = 'correccion' AND mc.monto < 0))
      AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

    -- 4. Calcular caja esperada y diferencia
    v_caja_esperada := v_base_anterior + v_ingresos - v_egresos;
    v_diferencia := p_caja_fisica - v_caja_esperada;

    -- 5. Calcular retiro automático (si el dinero físico supera la base requerida)
    IF p_caja_fisica > p_base_siguiente THEN
        v_retiro := p_caja_fisica - p_base_siguiente;
    ELSE
        v_retiro := 0;
    END IF;

    -- 6. Insertar registro de cierre
    INSERT INTO public.cierres_caja (
        fecha,
        caja_esperada,
        caja_fisica,
        diferencia,
        base_siguiente,
        retiro_cierre,
        observaciones,
        cerrado_por
    ) VALUES (
        p_fecha,
        v_caja_esperada,
        p_caja_fisica,
        v_diferencia,
        p_base_siguiente,
        v_retiro,
        p_observaciones,
        v_usuario
    ) RETURNING id INTO v_cierre_id;

    -- 7. Si hubo retiro automático al cierre, insertarlo en movimientos_caja
    IF v_retiro > 0 THEN
        INSERT INTO public.movimientos_caja (
            fecha,
            tipo,
            monto,
            concepto,
            registrado_por
        ) VALUES (
            p_fecha,
            'retiro',
            v_retiro,
            'Retiro automatico por cierre de caja (Excedente sobre base)',
            v_usuario
        );
    END IF;

    RETURN QUERY
    SELECT
        v_cierre_id,
        p_fecha,
        v_caja_esperada,
        p_caja_fisica,
        v_diferencia,
        p_base_siguiente,
        v_retiro;
END;
$$;

REVOKE ALL ON FUNCTION public.realizar_cierre_caja(date, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.realizar_cierre_caja(date, numeric, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.realizar_cierre_caja(date, numeric, numeric, text) TO authenticated;

COMMIT;
