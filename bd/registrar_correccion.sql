-- 19 — registrar_correccion
-- Versión 1.0
--
-- Registra una corrección trazable con su motivo obligatoria.
-- Crea los movimientos compensatorios en leche o caja sin borrar históricos.

BEGIN;

-- Ajustar tipo_chk de movimientos_caja si no incluye 'correccion'
ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_tipo_chk;
ALTER TABLE public.movimientos_caja ADD CONSTRAINT movimientos_caja_tipo_chk 
    CHECK (tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera', 'egreso_flete', 'retiro', 'correccion'));

CREATE OR REPLACE FUNCTION public.registrar_correccion(
    p_fecha date,
    p_modulo text,
    p_registro_id uuid DEFAULT NULL,
    p_litros_diferencia numeric(10,2) DEFAULT 0.00,
    p_monto_diferencia numeric(10,2) DEFAULT 0.00,
    p_motivo text DEFAULT NULL
)
RETURNS TABLE (
    correccion_id uuid,
    fecha date,
    modulo text,
    litros_diferencia numeric(10,2),
    monto_diferencia numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid;
    v_rol text;
    v_correccion_id uuid;
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

    -- Validar parámetros
    IF p_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha es obligatoria';
    END IF;

    IF p_modulo IS NULL OR p_modulo NOT IN ('produccion', 'venta', 'consumo', 'quesera', 'caja') THEN
        RAISE EXCEPTION 'El módulo debe ser produccion, venta, consumo, quesera o caja';
    END IF;

    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN
        RAISE EXCEPTION 'Debe ingresar un motivo obligatorio que justifique la corrección';
    END IF;

    IF COALESCE(p_litros_diferencia, 0) = 0 AND COALESCE(p_monto_diferencia, 0) = 0 THEN
        RAISE EXCEPTION 'Debe especificar una diferencia en litros o en dinero mayor/menor a cero';
    END IF;

    -- Si la corrección es financiera (caja), solo el administrador puede realizarla
    IF COALESCE(p_monto_diferencia, 0) != 0 AND v_rol != 'administrador' THEN
        RAISE EXCEPTION 'Solo el administrador puede registrar correcciones financieras';
    END IF;

    -- 1. Insertar auditoría de corrección
    INSERT INTO public.correcciones (
        fecha,
        modulo,
        registro_id,
        litros_diferencia,
        monto_diferencia,
        motivo,
        corregido_por
    ) VALUES (
        p_fecha,
        p_modulo,
        p_registro_id,
        COALESCE(p_litros_diferencia, 0.00),
        COALESCE(p_monto_diferencia, 0.00),
        trim(p_motivo),
        v_usuario
    ) RETURNING id INTO v_correccion_id;

    -- 2. Movimiento compensatorio de leche si aplica
    IF COALESCE(p_litros_diferencia, 0) != 0 THEN
        INSERT INTO public.movimientos_leche (
            fecha,
            tipo,
            litros,
            registrado_por
        ) VALUES (
            p_fecha,
            'correccion',
            p_litros_diferencia,
            v_usuario
        );
    END IF;

    -- 3. Movimiento compensatorio de caja si aplica
    IF COALESCE(p_monto_diferencia, 0) != 0 THEN
        INSERT INTO public.movimientos_caja (
            fecha,
            tipo,
            monto,
            concepto,
            registrado_por
        ) VALUES (
            p_fecha,
            'correccion',
            p_monto_diferencia,
            'Corrección (' || p_modulo || '): ' || trim(p_motivo),
            v_usuario
        );
    END IF;

    RETURN QUERY
    SELECT
        v_correccion_id,
        p_fecha,
        p_modulo,
        COALESCE(p_litros_diferencia, 0.00),
        COALESCE(p_monto_diferencia, 0.00);
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_correccion(date, text, uuid, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_correccion(date, text, uuid, numeric, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.registrar_correccion(date, text, uuid, numeric, numeric, text) TO authenticated;

COMMIT;
