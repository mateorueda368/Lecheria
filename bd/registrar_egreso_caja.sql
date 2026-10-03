-- 15 — registrar_egreso_caja
-- Versión 1.0
--
-- Registra salidas de dinero por pago de fletes o retiros del administrador.
-- Descuenta dinero de la caja física esperada. NO afecta la leche.

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_egreso_caja(
    p_fecha date,
    p_tipo text,
    p_monto numeric(10,2),
    p_concepto text DEFAULT NULL
)
RETURNS TABLE (
    caja_movimiento_id uuid,
    fecha date,
    tipo text,
    monto numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid;
    v_rol text;
    v_caja_id uuid;
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

    -- Validar tipo de egreso
    IF p_tipo IS NULL OR p_tipo NOT IN ('egreso_flete', 'retiro') THEN
        RAISE EXCEPTION 'El tipo de salida debe ser egreso_flete o retiro';
    END IF;

    -- Si es retiro, solo administrador
    IF p_tipo = 'retiro' AND v_rol != 'administrador' THEN
        RAISE EXCEPTION 'Solo el administrador puede registrar retiros de caja';
    END IF;

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_monto IS NULL OR p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto debe ser mayor a cero';
    END IF;

    -- Insertar salida en caja
    INSERT INTO public.movimientos_caja (
        fecha,
        tipo,
        monto,
        concepto,
        registrado_por
    ) VALUES (
        p_fecha,
        p_tipo,
        p_monto,
        COALESCE(p_concepto, CASE WHEN p_tipo = 'egreso_flete' THEN 'Pago de flete de leche' ELSE 'Retiro de caja / mantenimiento' END),
        v_usuario
    ) RETURNING id INTO v_caja_id;

    RETURN QUERY
    SELECT
        v_caja_id,
        p_fecha,
        p_tipo,
        p_monto;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_egreso_caja(date, text, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_egreso_caja(date, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_egreso_caja(date, text, numeric, text) TO authenticated;

COMMIT;
