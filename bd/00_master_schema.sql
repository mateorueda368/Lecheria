-- =============================================================================
-- SISTEMA DE GESTIÓN DE LECHERÍA — ESQUEMA COMPLETO Y DEPLOYMENT EN SUPABASE
-- Versión: 2.0 (Master Unified Schema)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TABLAS CORE
-- -----------------------------------------------------------------------------

-- Perfiles de usuario (vinculado a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    nombre text,
    rol text NOT NULL DEFAULT 'trabajador' CONSTRAINT profiles_rol_chk CHECK (rol IN ('trabajador', 'administrador')),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nombre text;

-- Producción diaria de leche por jornada
CREATE TABLE IF NOT EXISTS public.producciones_leche (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL CONSTRAINT producciones_leche_jornada_chk CHECK (jornada IN ('manana', 'tarde')),
    litros numeric(10,2) NOT NULL CONSTRAINT producciones_leche_litros_chk CHECK (litros > 0),
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT producciones_leche_fecha_jornada_uk UNIQUE (fecha, jornada)
);

-- Movimientos de leche (cardex / kardex de volumen)
CREATE TABLE IF NOT EXISTS public.movimientos_leche (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    tipo text NOT NULL CONSTRAINT movimientos_leche_tipo_chk CHECK (tipo IN ('produccion', 'venta_cobrada', 'venta_fiada', 'consumo', 'entrega_quesera', 'correccion')),
    litros numeric(10,2) NOT NULL CONSTRAINT movimientos_leche_litros_chk CHECK (litros > 0 OR tipo = 'correccion'),
    produccion_id uuid REFERENCES public.producciones_leche(id),
    concepto text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_leche ADD COLUMN IF NOT EXISTS concepto text;
ALTER TABLE public.movimientos_leche DROP CONSTRAINT IF EXISTS movimientos_leche_litros_chk;
ALTER TABLE public.movimientos_leche ADD CONSTRAINT movimientos_leche_litros_chk CHECK (litros > 0 OR tipo = 'correccion');

-- Catálogo de clientes fiadores
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre text NOT NULL,
    telefono text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Ventas directas (cobradas o fiadas)
CREATE TABLE IF NOT EXISTS public.ventas_directas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL CONSTRAINT ventas_directas_jornada_chk CHECK (jornada IN ('manana', 'tarde')),
    litros numeric(10,2) NOT NULL CONSTRAINT ventas_directas_litros_chk CHECK (litros > 0),
    precio_unitario numeric(10,2) NOT NULL DEFAULT 2500.00,
    total numeric(10,2) NOT NULL CONSTRAINT ventas_directas_total_chk CHECK (total > 0),
    estado text NOT NULL CONSTRAINT ventas_directas_estado_chk CHECK (estado IN ('cobrada', 'fiada')),
    cliente_id uuid REFERENCES public.clientes(id),
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Entregas a la quesera
CREATE TABLE IF NOT EXISTS public.entregas_quesera (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    jornada text NOT NULL CONSTRAINT entregas_quesera_jornada_chk CHECK (jornada IN ('manana', 'tarde')),
    litros numeric(10,2) NOT NULL CONSTRAINT entregas_quesera_litros_chk CHECK (litros > 0),
    precio_unitario numeric(10,2) NOT NULL DEFAULT 1950.00,
    total numeric(10,2) NOT NULL CONSTRAINT entregas_quesera_total_chk CHECK (total > 0),
    estado text NOT NULL DEFAULT 'pendiente' CONSTRAINT entregas_quesera_estado_chk CHECK (estado IN ('pendiente', 'pagada')),
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Movimientos de caja física
CREATE TABLE IF NOT EXISTS public.movimientos_caja (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    tipo text NOT NULL CONSTRAINT movimientos_caja_tipo_chk CHECK (tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera', 'egreso_flete', 'retiro', 'correccion')),
    monto numeric(10,2) NOT NULL CONSTRAINT movimientos_caja_monto_chk CHECK (monto != 0),
    concepto text,
    venta_id uuid REFERENCES public.ventas_directas(id),
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_tipo_chk;
ALTER TABLE public.movimientos_caja ADD CONSTRAINT movimientos_caja_tipo_chk CHECK (tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera', 'egreso_flete', 'retiro', 'correccion'));

-- Pagos y abonos de clientes fiados
CREATE TABLE IF NOT EXISTS public.pagos_clientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    cliente_id uuid NOT NULL REFERENCES public.clientes(id),
    monto numeric(10,2) NOT NULL CONSTRAINT pagos_clientes_monto_chk CHECK (monto > 0),
    concepto text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Pagos recibidos de la quesera (liquidaciones)
CREATE TABLE IF NOT EXISTS public.pagos_quesera (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    monto numeric(10,2) NOT NULL CONSTRAINT pagos_quesera_monto_chk CHECK (monto > 0),
    concepto text,
    registrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Cierres periódicos de caja física
CREATE TABLE IF NOT EXISTS public.cierres_caja (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    caja_esperada numeric(10,2) NOT NULL,
    caja_fisica numeric(10,2) NOT NULL,
    diferencia numeric(10,2) NOT NULL,
    base_siguiente numeric(10,2) NOT NULL,
    retiro_cierre numeric(10,2) NOT NULL DEFAULT 0.00,
    observaciones text,
    cerrado_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Auditoría y correcciones trazables
CREATE TABLE IF NOT EXISTS public.correcciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha date NOT NULL,
    modulo text NOT NULL CONSTRAINT correcciones_modulo_chk CHECK (modulo IN ('produccion', 'venta', 'consumo', 'quesera', 'caja')),
    registro_id uuid,
    litros_diferencia numeric(10,2) NOT NULL DEFAULT 0.00,
    monto_diferencia numeric(10,2) NOT NULL DEFAULT 0.00,
    motivo text NOT NULL CONSTRAINT correcciones_motivo_chk CHECK (length(trim(motivo)) > 0),
    corregido_por uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. SEGURIDAD (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producciones_leche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_leche ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_directas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas_quesera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_quesera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correcciones ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is administrator (prevents RLS recursion)
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'administrador'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Políticas de Lectura (SELECT)
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS producciones_select ON public.producciones_leche;
DROP POLICY IF EXISTS producciones_select_own_or_admin ON public.producciones_leche;
CREATE POLICY producciones_select ON public.producciones_leche FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS movimientos_select ON public.movimientos_leche;
DROP POLICY IF EXISTS movimientos_select_own_or_admin ON public.movimientos_leche;
CREATE POLICY movimientos_select ON public.movimientos_leche FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS clientes_select ON public.clientes;
DROP POLICY IF EXISTS clientes_insert ON public.clientes;
DROP POLICY IF EXISTS clientes_select_own_or_admin ON public.clientes;
DROP POLICY IF EXISTS clientes_insert_authenticated ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY clientes_insert ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS ventas_select ON public.ventas_directas;
DROP POLICY IF EXISTS ventas_select_own_or_admin ON public.ventas_directas;
CREATE POLICY ventas_select ON public.ventas_directas FOR SELECT TO authenticated
USING (registrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS entregas_quesera_select ON public.entregas_quesera;
DROP POLICY IF EXISTS entregas_quesera_select_own_or_admin ON public.entregas_quesera;
CREATE POLICY entregas_quesera_select ON public.entregas_quesera FOR SELECT TO authenticated
USING (registrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS movimientos_caja_select ON public.movimientos_caja;
DROP POLICY IF EXISTS movimientos_caja_select_own_or_admin ON public.movimientos_caja;
CREATE POLICY movimientos_caja_select ON public.movimientos_caja FOR SELECT TO authenticated
USING (registrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS pagos_clientes_select ON public.pagos_clientes;
DROP POLICY IF EXISTS pagos_clientes_select_own_or_admin ON public.pagos_clientes;
CREATE POLICY pagos_clientes_select ON public.pagos_clientes FOR SELECT TO authenticated
USING (registrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS pagos_quesera_select ON public.pagos_quesera;
DROP POLICY IF EXISTS pagos_quesera_select_own_or_admin ON public.pagos_quesera;
CREATE POLICY pagos_quesera_select ON public.pagos_quesera FOR SELECT TO authenticated
USING (registrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS cierres_caja_select ON public.cierres_caja;
DROP POLICY IF EXISTS cierres_caja_select_own_or_admin ON public.cierres_caja;
CREATE POLICY cierres_caja_select ON public.cierres_caja FOR SELECT TO authenticated
USING (cerrado_por = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS correcciones_select ON public.correcciones;
DROP POLICY IF EXISTS correcciones_select_own_or_admin ON public.correcciones;
CREATE POLICY correcciones_select ON public.correcciones FOR SELECT TO authenticated
USING (corregido_por = auth.uid() OR public.is_admin());

-- Trigger automático para crear perfil cuando un usuario se registra en auth.users
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nombre, rol)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'rol', 'trabajador')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        nombre = COALESCE(public.profiles.nombre, EXCLUDED.nombre);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- -----------------------------------------------------------------------------
-- 3. FUNCIONES TRANSACCIONALES (RPC PROCEDURES)
-- -----------------------------------------------------------------------------

-- A. Registrar Producción
DROP FUNCTION IF EXISTS public.registrar_produccion(date, text, numeric) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_produccion_id uuid;
    v_movimiento_id uuid;
    v_constraint text;
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_fecha IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;
    IF p_jornada NOT IN ('manana', 'tarde') THEN RAISE EXCEPTION 'Jornada inválida'; END IF;
    IF p_litros IS NULL OR p_litros <= 0 THEN RAISE EXCEPTION 'Litros deben ser > 0'; END IF;

    INSERT INTO public.producciones_leche (fecha, jornada, litros, registrado_por)
    VALUES (p_fecha, p_jornada, p_litros, v_usuario)
    RETURNING id INTO v_produccion_id;

    INSERT INTO public.movimientos_leche (fecha, tipo, litros, produccion_id, concepto, registrado_por)
    VALUES (p_fecha, 'produccion', p_litros, v_produccion_id, 'Ordeño jornada ' || p_jornada, v_usuario)
    RETURNING id INTO v_movimiento_id;

    RETURN QUERY SELECT v_produccion_id, p_fecha, p_jornada, p_litros, v_movimiento_id;
EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
        IF v_constraint = 'producciones_leche_fecha_jornada_uk' THEN
            RAISE EXCEPTION 'Ya existe produccion para la fecha % y jornada %', p_fecha, p_jornada;
        END IF;
        RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_produccion(date, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_produccion(date, text, numeric) TO authenticated;

-- B. Registrar Venta Cobrada
DROP FUNCTION IF EXISTS public.registrar_venta_cobrada(date, text, numeric) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_venta_id uuid;
    v_caja_id uuid;
    v_total numeric(10,2);
    v_produccion_id uuid;
    v_stock_disponible numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN RAISE EXCEPTION 'Litros deben ser > 0'; END IF;

    SELECT pl.id INTO v_produccion_id FROM public.producciones_leche pl WHERE pl.fecha = p_fecha AND pl.jornada = p_jornada;
    IF v_produccion_id IS NULL THEN RAISE EXCEPTION 'No hay produccion registrada para % %', p_jornada, p_fecha; END IF;

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

    v_total := p_litros * 2500.00;

    INSERT INTO public.ventas_directas (fecha, jornada, litros, precio_unitario, total, estado, registrado_por)
    VALUES (p_fecha, p_jornada, p_litros, 2500.00, v_total, 'cobrada', v_usuario)
    RETURNING id INTO v_venta_id;

    INSERT INTO public.movimientos_leche (fecha, tipo, litros, produccion_id, concepto, registrado_por)
    VALUES (p_fecha, 'venta_cobrada', p_litros, v_produccion_id, 'Venta directa cobrada en efectivo (' || p_litros || ' L)', v_usuario);

    INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, venta_id, registrado_por)
    VALUES (p_fecha, 'ingreso_venta', v_total, 'Venta directa cobrada en efectivo (' || p_litros || ' L)', v_venta_id, v_usuario)
    RETURNING id INTO v_caja_id;

    RETURN QUERY SELECT v_venta_id, p_fecha, p_jornada, p_litros, 2500.00::numeric(10,2), v_total, v_caja_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_venta_cobrada(date, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta_cobrada(date, text, numeric) TO authenticated;

-- C. Registrar Venta Fiada
DROP FUNCTION IF EXISTS public.registrar_venta_fiada(date, text, numeric, uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.registrar_venta_fiada(
    p_fecha date,
    p_jornada text,
    p_litros numeric(10,2),
    p_cliente_id uuid
)
RETURNS TABLE (
    venta_id uuid,
    fecha date,
    jornada text,
    litros numeric(10,2),
    precio_unitario numeric(10,2),
    total numeric(10,2),
    cliente_id uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_venta_id uuid;
    v_total numeric(10,2);
    v_produccion_id uuid;
    v_stock_disponible numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'Debe seleccionar un cliente'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = p_cliente_id) THEN
        RAISE EXCEPTION 'El cliente seleccionado no existe';
    END IF;
    IF p_litros IS NULL OR p_litros <= 0 THEN RAISE EXCEPTION 'Litros deben ser > 0'; END IF;

    SELECT pl.id INTO v_produccion_id FROM public.producciones_leche pl WHERE pl.fecha = p_fecha AND pl.jornada = p_jornada;
    IF v_produccion_id IS NULL THEN RAISE EXCEPTION 'No hay produccion registrada para % %', p_jornada, p_fecha; END IF;

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

    v_total := p_litros * 2500.00;

    INSERT INTO public.ventas_directas (fecha, jornada, litros, precio_unitario, total, estado, cliente_id, registrado_por)
    VALUES (p_fecha, p_jornada, p_litros, 2500.00, v_total, 'fiada', p_cliente_id, v_usuario)
    RETURNING id INTO v_venta_id;

    INSERT INTO public.movimientos_leche (fecha, tipo, litros, produccion_id, concepto, registrado_por)
    VALUES (p_fecha, 'venta_fiada', p_litros, v_produccion_id, 'Venta directa fiada (' || p_litros || ' L)', v_usuario);

    RETURN QUERY SELECT v_venta_id, p_fecha, p_jornada, p_litros, 2500.00::numeric(10,2), v_total, p_cliente_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_venta_fiada(date, text, numeric, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_venta_fiada(date, text, numeric, uuid) TO authenticated;

-- D. Registrar Consumo Finca
DROP FUNCTION IF EXISTS public.registrar_consumo(date, text, numeric, text) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_movimiento_id uuid;
    v_produccion_id uuid;
    v_stock_disponible numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN RAISE EXCEPTION 'Litros deben ser > 0'; END IF;

    SELECT pl.id INTO v_produccion_id FROM public.producciones_leche pl WHERE pl.fecha = p_fecha AND pl.jornada = p_jornada;
    IF v_produccion_id IS NULL THEN RAISE EXCEPTION 'No hay produccion registrada para % %', p_jornada, p_fecha; END IF;

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

    INSERT INTO public.movimientos_leche (fecha, tipo, litros, produccion_id, concepto, registrado_por)
    VALUES (p_fecha, 'consumo', p_litros, v_produccion_id, COALESCE(p_observacion, 'Consumo finca (' || p_litros || ' L)'), v_usuario)
    RETURNING id INTO v_movimiento_id;

    RETURN QUERY SELECT v_movimiento_id, p_fecha, p_jornada, p_litros;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_consumo(date, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_consumo(date, text, numeric, text) TO authenticated;

-- E. Registrar Entrega Quesera
DROP FUNCTION IF EXISTS public.registrar_entrega_quesera(date, text, numeric) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_entrega_id uuid;
    v_total numeric(10,2);
    v_produccion_id uuid;
    v_stock_disponible numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_litros IS NULL OR p_litros <= 0 THEN RAISE EXCEPTION 'Litros deben ser > 0'; END IF;

    SELECT pl.id INTO v_produccion_id FROM public.producciones_leche pl WHERE pl.fecha = p_fecha AND pl.jornada = p_jornada;
    IF v_produccion_id IS NULL THEN RAISE EXCEPTION 'No hay produccion registrada para % %', p_jornada, p_fecha; END IF;

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

    v_total := p_litros * 1950.00;

    INSERT INTO public.entregas_quesera (fecha, jornada, litros, precio_unitario, total, estado, registrado_por)
    VALUES (p_fecha, p_jornada, p_litros, 1950.00, v_total, 'pendiente', v_usuario)
    RETURNING id INTO v_entrega_id;

    INSERT INTO public.movimientos_leche (fecha, tipo, litros, produccion_id, concepto, registrado_por)
    VALUES (p_fecha, 'entrega_quesera', p_litros, v_produccion_id, 'Entrega a quesera (' || p_litros || ' L)', v_usuario);

    RETURN QUERY SELECT v_entrega_id, p_fecha, p_jornada, p_litros, 1950.00::numeric(10,2), v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_entrega_quesera(date, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_entrega_quesera(date, text, numeric) TO authenticated;

-- F. Registrar Pago de Cliente
DROP FUNCTION IF EXISTS public.registrar_pago_cliente(date, uuid, numeric, text) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_pago_id uuid;
    v_caja_id uuid;
    v_total_fiado numeric(10,2);
    v_total_pagado numeric(10,2);
    v_saldo_actual numeric(10,2);
    v_nuevo_saldo numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_cliente_id IS NULL THEN RAISE EXCEPTION 'Debe seleccionar un cliente'; END IF;
    IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto abonado debe ser > 0'; END IF;

    SELECT COALESCE(SUM(vd.total), 0) INTO v_total_fiado FROM public.ventas_directas vd WHERE vd.cliente_id = p_cliente_id AND vd.estado = 'fiada';
    SELECT COALESCE(SUM(pc.monto), 0) INTO v_total_pagado FROM public.pagos_clientes pc WHERE pc.cliente_id = p_cliente_id;
    v_saldo_actual := v_total_fiado - v_total_pagado;

    IF v_saldo_actual <= 0 THEN RAISE EXCEPTION 'El cliente no tiene saldo pendiente por pagar'; END IF;
    IF p_monto > v_saldo_actual THEN RAISE EXCEPTION 'El monto ($%) supera el saldo pendiente ($%)', p_monto, v_saldo_actual; END IF;

    v_nuevo_saldo := v_saldo_actual - p_monto;

    INSERT INTO public.pagos_clientes (fecha, cliente_id, monto, concepto, registrado_por)
    VALUES (p_fecha, p_cliente_id, p_monto, COALESCE(p_concepto, 'Abono a deuda fiada'), v_usuario)
    RETURNING id INTO v_pago_id;

    INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, registrado_por)
    VALUES (p_fecha, 'pago_cliente', p_monto, 'Pago de fiado recibido en efectivo', v_usuario)
    RETURNING id INTO v_caja_id;

    RETURN QUERY SELECT v_pago_id, p_fecha, p_cliente_id, p_monto, v_nuevo_saldo, v_caja_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_pago_cliente(date, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_cliente(date, uuid, numeric, text) TO authenticated;

-- G. Registrar Pago de Quesera
DROP FUNCTION IF EXISTS public.registrar_pago_quesera(date, numeric, text) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_pago_id uuid;
    v_caja_id uuid;
    v_total_pendiente numeric(10,2);
    v_nuevo_saldo numeric(10,2);
    r RECORD;
    v_monto_restante numeric(10,2);
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF v_rol NOT IN ('administrador') THEN RAISE EXCEPTION 'Solo el administrador puede registrar pagos de quesera'; END IF;
    IF p_fecha IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;
    IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El monto abonado debe ser mayor a cero'; END IF;

    -- Calcular saldo pendiente de entregas
    SELECT COALESCE(SUM(eq.total), 0) INTO v_total_pendiente
    FROM public.entregas_quesera eq
    WHERE eq.estado = 'pendiente';

    IF v_total_pendiente <= 0 THEN
        RAISE EXCEPTION 'No existen entregas a la quesera pendientes de pago';
    END IF;

    IF p_monto > v_total_pendiente THEN
        RAISE EXCEPTION 'El monto cobrado ($%) es superior al acumulado pendiente de la quesera ($%)', p_monto, v_total_pendiente;
    END IF;

    v_nuevo_saldo := v_total_pendiente - p_monto;

    INSERT INTO public.pagos_quesera (fecha, monto, concepto, registrado_por)
    VALUES (p_fecha, p_monto, COALESCE(p_concepto, 'Cobro de liquidación recibida de quesera'), v_usuario)
    RETURNING id INTO v_pago_id;

    INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, registrado_por)
    VALUES (p_fecha, 'pago_quesera', p_monto, 'Pago recibido de la quesera en efectivo', v_usuario)
    RETURNING id INTO v_caja_id;

    -- Marcar entregas completadas bajo modelo FIFO
    v_monto_restante := p_monto;
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

    -- Si se liquidó por completo el saldo pendiente, asegurar que todas queden en 'pagada'
    IF v_nuevo_saldo = 0 THEN
        UPDATE public.entregas_quesera AS eq SET estado = 'pagada' WHERE eq.estado = 'pendiente';
    END IF;

    RETURN QUERY SELECT v_pago_id, p_fecha, p_monto, v_nuevo_saldo, v_caja_id;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_pago_quesera(date, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_pago_quesera(date, numeric, text) TO authenticated;

-- H. Registrar Egreso de Caja
DROP FUNCTION IF EXISTS public.registrar_egreso_caja(date, text, numeric, text) CASCADE;
CREATE OR REPLACE FUNCTION public.registrar_egreso_caja(
    p_fecha date,
    p_tipo text,
    p_monto numeric(10,2),
    p_concepto text
)
RETURNS TABLE (
    movimiento_id uuid,
    fecha date,
    tipo text,
    monto numeric(10,2),
    concepto text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_movimiento_id uuid;
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF v_rol NOT IN ('administrador') THEN RAISE EXCEPTION 'Solo el administrador puede registrar egresos de caja'; END IF;
    IF p_tipo NOT IN ('egreso_flete', 'retiro') THEN RAISE EXCEPTION 'Tipo de egreso invalido'; END IF;
    IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'Monto debe ser > 0'; END IF;
    IF p_concepto IS NULL OR length(trim(p_concepto)) = 0 THEN RAISE EXCEPTION 'El concepto es obligatorio'; END IF;

    INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, registrado_por)
    VALUES (p_fecha, p_tipo, p_monto, p_concepto, v_usuario)
    RETURNING id INTO v_movimiento_id;

    RETURN QUERY SELECT v_movimiento_id, p_fecha, p_tipo, p_monto, p_concepto;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_egreso_caja(date, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_egreso_caja(date, text, numeric, text) TO authenticated;

-- I. Realizar Cierre de Caja
DROP FUNCTION IF EXISTS public.realizar_cierre_caja(date, numeric, numeric, text) CASCADE;
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
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
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF v_rol NOT IN ('administrador') THEN RAISE EXCEPTION 'Solo el administrador puede realizar cierres de caja'; END IF;
    IF p_caja_fisica IS NULL OR p_caja_fisica < 0 THEN RAISE EXCEPTION 'Caja fisica no puede ser negativa'; END IF;
    IF p_base_siguiente IS NULL OR p_base_siguiente < 0 THEN RAISE EXCEPTION 'Base siguiente no puede ser negativa'; END IF;

    SELECT cc.base_siguiente, cc.created_at INTO v_base_anterior, v_ultimo_cierre_ts
    FROM public.cierres_caja cc ORDER BY cc.created_at DESC LIMIT 1;
    v_base_anterior := COALESCE(v_base_anterior, 0);

    -- Ingresos directos + correcciones positivas a caja
    SELECT COALESCE(SUM(mc.monto), 0) INTO v_ingresos
    FROM public.movimientos_caja mc
    WHERE (mc.tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera') OR (mc.tipo = 'correccion' AND mc.monto > 0))
      AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

    -- Egresos normales + correcciones negativas a caja (excluyendo retiro automático de cierre previo)
    SELECT COALESCE(SUM(ABS(mc.monto)), 0) INTO v_egresos
    FROM public.movimientos_caja mc
    WHERE ((mc.tipo IN ('egreso_flete', 'retiro') AND (mc.concepto IS NULL OR mc.concepto NOT LIKE '%cierre de caja%'))
           OR (mc.tipo = 'correccion' AND mc.monto < 0))
      AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

    v_caja_esperada := v_base_anterior + v_ingresos - v_egresos;
    v_diferencia := p_caja_fisica - v_caja_esperada;

    IF p_caja_fisica > p_base_siguiente THEN
        v_retiro := p_caja_fisica - p_base_siguiente;
    ELSE
        v_retiro := 0;
    END IF;

    INSERT INTO public.cierres_caja (fecha, caja_esperada, caja_fisica, diferencia, base_siguiente, retiro_cierre, observaciones, cerrado_por)
    VALUES (p_fecha, v_caja_esperada, p_caja_fisica, v_diferencia, p_base_siguiente, v_retiro, p_observaciones, v_usuario)
    RETURNING id INTO v_cierre_id;

    IF v_retiro > 0 THEN
        INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, registrado_por)
        VALUES (p_fecha, 'retiro', v_retiro, 'Retiro automatico por cierre de caja (Excedente sobre base)', v_usuario);
    END IF;

    RETURN QUERY SELECT v_cierre_id, p_fecha, v_caja_esperada, p_caja_fisica, v_diferencia, p_base_siguiente, v_retiro;
END;
$$;
REVOKE ALL ON FUNCTION public.realizar_cierre_caja(date, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.realizar_cierre_caja(date, numeric, numeric, text) TO authenticated;

-- J. Registrar Corrección Trazable
DROP FUNCTION IF EXISTS public.registrar_correccion(date, text, uuid, numeric, numeric, text) CASCADE;
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
    registro_id uuid,
    litros_diferencia numeric(10,2),
    monto_diferencia numeric(10,2),
    motivo text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
    v_usuario uuid := auth.uid();
    v_rol text;
    v_correccion_id uuid;
BEGIN
    IF v_usuario IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    SELECT p.rol INTO v_rol FROM public.profiles p WHERE p.id = v_usuario;
    IF NOT FOUND THEN RAISE EXCEPTION 'Perfil no encontrado'; END IF;

    IF p_fecha IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;
    IF p_modulo NOT IN ('produccion', 'venta', 'consumo', 'quesera', 'caja') THEN RAISE EXCEPTION 'Modulo de corrección inválido'; END IF;
    IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN RAISE EXCEPTION 'El motivo es obligatorio para garantizar trazabilidad'; END IF;

    IF COALESCE(p_litros_diferencia, 0) = 0 AND COALESCE(p_monto_diferencia, 0) = 0 THEN
        RAISE EXCEPTION 'Debe especificar una diferencia en litros o en dinero mayor/menor a cero';
    END IF;

    -- Corrección financiera en caja reservada a administradores
    IF COALESCE(p_monto_diferencia, 0) != 0 AND v_rol != 'administrador' THEN
        RAISE EXCEPTION 'Solo el administrador puede registrar correcciones financieras';
    END IF;

    INSERT INTO public.correcciones (fecha, modulo, registro_id, litros_diferencia, monto_diferencia, motivo, corregido_por)
    VALUES (p_fecha, p_modulo, p_registro_id, COALESCE(p_litros_diferencia, 0.00), COALESCE(p_monto_diferencia, 0.00), trim(p_motivo), v_usuario)
    RETURNING id INTO v_correccion_id;

    -- Movimiento compensatorio de leche si aplica
    IF COALESCE(p_litros_diferencia, 0) != 0 THEN
        INSERT INTO public.movimientos_leche (fecha, tipo, litros, concepto, registrado_por)
        VALUES (p_fecha, 'correccion', p_litros_diferencia, 'Corrección (' || p_modulo || '): ' || trim(p_motivo), v_usuario);
    END IF;

    -- Movimiento compensatorio de caja si aplica
    IF COALESCE(p_monto_diferencia, 0) != 0 THEN
        INSERT INTO public.movimientos_caja (fecha, tipo, monto, concepto, registrado_por)
        VALUES (p_fecha, 'correccion', p_monto_diferencia, 'Corrección (' || p_modulo || '): ' || trim(p_motivo), v_usuario);
    END IF;

    RETURN QUERY SELECT v_correccion_id, p_fecha, p_modulo, p_registro_id, COALESCE(p_litros_diferencia, 0.00), COALESCE(p_monto_diferencia, 0.00), trim(p_motivo);
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_correccion(date, text, uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_correccion(date, text, uuid, numeric, numeric, text) TO authenticated;

-- K. Obtener Resumen Dashboard (KPIs unificados)
DROP FUNCTION IF EXISTS public.get_dashboard_resumen() CASCADE;
CREATE OR REPLACE FUNCTION public.get_dashboard_resumen()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_stock_leche           NUMERIC(10,2);
  v_produccion_hoy        NUMERIC(10,2);
  v_prod_manana           NUMERIC(10,2);
  v_prod_tarde            NUMERIC(10,2);
  v_caja_esperada         NUMERIC(12,2);
  v_ingresos_caja         NUMERIC(12,2);
  v_egresos_caja          NUMERIC(12,2);
  v_ventas_hoy_monto      NUMERIC(12,2);
  v_ventas_hoy_litros     NUMERIC(10,2);
  v_fiados_pendientes     NUMERIC(12,2);
  v_quesera_hoy           NUMERIC(10,2);
  v_ultimo_cierre_fecha   DATE;
  v_ultimo_cierre_monto   NUMERIC(12,2);
  v_ultimo_cierre_ts      TIMESTAMPTZ;
  v_movimientos_recientes JSONB;
BEGIN
  -- 1. Stock de leche considerando correcciones
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN ml.tipo = 'produccion' THEN ml.litros 
        WHEN ml.tipo = 'correccion' THEN ml.litros 
        ELSE -ml.litros 
      END
    ), 0
  ) INTO v_stock_leche FROM public.movimientos_leche AS ml;

  SELECT COALESCE(SUM(pl.litros), 0),
         COALESCE(SUM(pl.litros) FILTER (WHERE pl.jornada = 'manana'), 0),
         COALESCE(SUM(pl.litros) FILTER (WHERE pl.jornada = 'tarde'), 0)
  INTO v_produccion_hoy, v_prod_manana, v_prod_tarde
  FROM public.producciones_leche pl WHERE pl.fecha = CURRENT_DATE;

  SELECT cc.fecha, cc.base_siguiente, cc.created_at
  INTO v_ultimo_cierre_fecha, v_ultimo_cierre_monto, v_ultimo_cierre_ts
  FROM public.cierres_caja cc ORDER BY cc.created_at DESC LIMIT 1;

  -- Ingresos + correcciones positivas a caja desde el último cierre
  SELECT COALESCE(SUM(mc.monto), 0) INTO v_ingresos_caja FROM public.movimientos_caja mc
  WHERE (mc.tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera') OR (mc.tipo = 'correccion' AND mc.monto > 0))
    AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

  -- Egresos + correcciones negativas a caja desde el último cierre
  SELECT COALESCE(SUM(ABS(mc.monto)), 0) INTO v_egresos_caja FROM public.movimientos_caja mc
  WHERE ((mc.tipo IN ('egreso_flete', 'retiro') AND (mc.concepto IS NULL OR mc.concepto NOT LIKE '%cierre de caja%'))
         OR (mc.tipo = 'correccion' AND mc.monto < 0))
    AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

  v_caja_esperada := COALESCE(v_ultimo_cierre_monto, 0) + v_ingresos_caja - v_egresos_caja;

  SELECT COALESCE(SUM(mc.monto), 0) INTO v_ventas_hoy_monto FROM public.movimientos_caja mc
  WHERE mc.fecha = CURRENT_DATE AND mc.tipo = 'ingreso_venta';

  SELECT COALESCE(SUM(vd.litros), 0) INTO v_ventas_hoy_litros FROM public.ventas_directas vd WHERE vd.fecha = CURRENT_DATE;

  SELECT COALESCE((SELECT SUM(vd.total) FROM public.ventas_directas vd WHERE vd.estado = 'fiada') - (SELECT SUM(pc.monto) FROM public.pagos_clientes pc), 0) INTO v_fiados_pendientes;
  IF v_fiados_pendientes < 0 THEN v_fiados_pendientes := 0; END IF;

  SELECT COALESCE(SUM(ml.litros), 0) INTO v_quesera_hoy FROM public.movimientos_leche ml
  WHERE ml.fecha = CURRENT_DATE AND ml.tipo = 'entrega_quesera';

  SELECT jsonb_agg(jsonb_build_object('id', sub.id, 'fecha', sub.fecha, 'concepto', sub.concepto, 'tipo', sub.tipo, 'monto', sub.monto))
  INTO v_movimientos_recientes
  FROM (SELECT id, fecha, concepto, tipo, monto FROM public.movimientos_caja ORDER BY created_at DESC LIMIT 10) sub;

  RETURN jsonb_build_object(
    'stock_leche',           v_stock_leche,
    'produccion_hoy',        v_produccion_hoy,
    'prod_manana',           v_prod_manana,
    'prod_tarde',            v_prod_tarde,
    'caja_esperada',         v_caja_esperada,
    'ingresos_caja',         v_ingresos_caja,
    'egresos_caja',          v_egresos_caja,
    'ventas_hoy_monto',      v_ventas_hoy_monto,
    'ventas_hoy_litros',     v_ventas_hoy_litros,
    'fiados_pendientes',     v_fiados_pendientes,
    'quesera_hoy',           v_quesera_hoy,
    'ultimo_cierre_fecha',   v_ultimo_cierre_fecha,
    'ultimo_cierre_monto',   v_ultimo_cierre_monto,
    'movimientos_recientes', COALESCE(v_movimientos_recientes, '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_resumen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_resumen() TO authenticated;

COMMIT;
