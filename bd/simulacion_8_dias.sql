-- =============================================================================
-- SIMULACIÓN INTEGRAL EN TIEMPO REAL: 8 DÍAS DE OPERACIÓN EN LA FINCA
-- =============================================================================
-- Este script ejecuta y valida el 100% de los flujos de la lechería:
-- 1. Ordeños Mañana y Tarde (Control de jornada y total diario)
-- 2. Entregas a Quesera en Cantinas ($1.950/L) acumuladas para cobro periódico
-- 3. Ventas Directas en Efectivo ($2.500/L) con ingreso a caja física
-- 4. Ventas Fiadas a Crédito ($2.500/L) con cuentas por cobrar
-- 5. Consumo Interno de Finca / Terneros (0 COP)
-- 6. Abonos y pagos de deudas de clientes
-- 7. Liquidación Parcial de Quesera ($1.000.000 COP) bajo algoritmo FIFO
-- 8. Egresos y fletes de caja
-- 9. Correcciones trazables con compensación automática
-- 10. Arqueo y cierres de caja con retiro de utilidades sobre base
-- =============================================================================

DO $$
DECLARE
    v_admin_id uuid;
    v_cliente_pedro uuid;
    v_cliente_carmen uuid;
    v_cliente_juan uuid;
    v_fecha_base date := CURRENT_DATE - 7; -- Inicia hace 7 días y culmina hoy
    d1 date := v_fecha_base;
    d2 date := v_fecha_base + 1;
    d3 date := v_fecha_base + 2;
    d4 date := v_fecha_base + 3;
    d5 date := v_fecha_base + 4;
    d6 date := v_fecha_base + 5;
    d7 date := v_fecha_base + 6;
    d8 date := v_fecha_base + 7;

    -- Variables para capturar retornos
    r_prod RECORD;
    r_venta RECORD;
    r_fiado RECORD;
    r_quesera RECORD;
    r_cierre RECORD;
    r_pago_cli RECORD;
    r_pago_que RECORD;
    r_correc RECORD;
    r_egreso RECORD;
    v_stock_actual numeric;
    v_caja_actual numeric;
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'INICIANDO SIMULACIÓN OPERATIVA DE 8 DÍAS EN LA FINCA';
    RAISE NOTICE '=============================================================';

    -- 1. Asegurar o crear perfil de Administrador para la prueba
    SELECT id INTO v_admin_id FROM public.profiles WHERE rol = 'administrador' LIMIT 1;
    IF v_admin_id IS NULL THEN
        SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
        IF v_admin_id IS NULL THEN
            v_admin_id := gen_random_uuid();
            INSERT INTO public.profiles (id, email, nombre, rol)
            VALUES (v_admin_id, 'admin@finca.co', 'Administrador General Finca', 'administrador');
        ELSE
            UPDATE public.profiles SET rol = 'administrador' WHERE id = v_admin_id;
        END IF;
    END IF;

    -- Emular contexto de sesión en Supabase para RPCs con auth.uid()
    PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

    -- 2. Asegurar catálogo de clientes
    SELECT id INTO v_cliente_pedro FROM public.clientes WHERE nombre LIKE '%Pedro Pérez%' LIMIT 1;
    IF v_cliente_pedro IS NULL THEN
        INSERT INTO public.clientes (nombre, telefono, registrado_por)
        VALUES ('Don Pedro Pérez', '3104567890', v_admin_id) RETURNING id INTO v_cliente_pedro;
    END IF;

    SELECT id INTO v_cliente_carmen FROM public.clientes WHERE nombre LIKE '%Carmen Gómez%' LIMIT 1;
    IF v_cliente_carmen IS NULL THEN
        INSERT INTO public.clientes (nombre, telefono, registrado_por)
        VALUES ('Doña Carmen Gómez', '3119876543', v_admin_id) RETURNING id INTO v_cliente_carmen;
    END IF;

    SELECT id INTO v_cliente_juan FROM public.clientes WHERE nombre LIKE '%Juan Carlos Restrepo%' LIMIT 1;
    IF v_cliente_juan IS NULL THEN
        INSERT INTO public.clientes (nombre, telefono, registrado_por)
        VALUES ('Juan Carlos Restrepo', '3205551234', v_admin_id) RETURNING id INTO v_cliente_juan;
    END IF;

    RAISE NOTICE 'Clientes listos: Don Pedro (%), Doña Carmen (%), Juan Carlos (%)', v_cliente_pedro, v_cliente_carmen, v_cliente_juan;

    -- =========================================================================
    -- DÍA 1:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 1 (%) ---', d1;
    -- Ordeño Mañana 130L
    SELECT * INTO r_prod FROM public.registrar_produccion(d1, 'manana', 130.00);
    -- Quesera 80L ($156.000)
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d1, 'manana', 80.00);
    -- Venta directa 15L ($37.500)
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d1, 'manana', 15.00);
    -- Venta fiada Don Pedro 10L ($25.000)
    SELECT * INTO r_fiado FROM public.registrar_venta_fiada(v_cliente_pedro, d1, 'manana', 10.00);
    -- Ordeño Tarde 75L
    SELECT * INTO r_prod FROM public.registrar_produccion(d1, 'tarde', 75.00);
    -- Consumo terneros 6L
    PERFORM public.registrar_consumo(d1, 'tarde', 6.00, 'Consumo terneros terneril');
    -- Venta directa tarde 10L ($25.000)
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d1, 'tarde', 10.00);
    -- Cierre Caja Día 1: Se cuenta $62.500 en caja física, base siguiente $200.000 (diferencia 0)
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d1, 62500.00, 200000.00, 'Cierre primer día con base inicial');
    RAISE NOTICE 'Día 1 finalizado. Retiro: $%, Base siguiente: $%', r_cierre.retiro_cierre, r_cierre.base_siguiente;

    -- =========================================================================
    -- DÍA 2:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 2 (%) ---', d2;
    SELECT * INTO r_prod FROM public.registrar_produccion(d2, 'manana', 135.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d2, 'manana', 90.00);
    SELECT * INTO r_fiado FROM public.registrar_venta_fiada(v_cliente_carmen, d2, 'manana', 8.00); -- $20.000
    SELECT * INTO r_prod FROM public.registrar_produccion(d2, 'tarde', 70.00);
    PERFORM public.registrar_consumo(d2, 'tarde', 5.00, 'Consumo cocina finca');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d2, 'tarde', 12.00); -- $30.000
    -- Egreso: Flete concentrado por $30.000
    SELECT * INTO r_egreso FROM public.registrar_egreso_caja(d2, 'egreso_flete', 30000.00, 'Flete transporte bultos concentrado');
    -- Cierre Caja Día 2: Base 200.000 + Venta 30.000 - Flete 30.000 = Esperada 200.000. Físico contado 200.000.
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d2, 200000.00, 200000.00, 'Cierre sin sobrante ni faltante');
    RAISE NOTICE 'Día 2 finalizado. Caja esperada: $%, Física: $%', r_cierre.caja_esperada, r_cierre.caja_fisica;

    -- =========================================================================
    -- DÍA 3:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 3 (%) ---', d3;
    SELECT * INTO r_prod FROM public.registrar_produccion(d3, 'manana', 128.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d3, 'manana', 90.00);
    -- Abono Don Pedro: paga $15.000 de los $25.000 que debe
    SELECT * INTO r_pago_cli FROM public.registrar_pago_cliente(d3, v_cliente_pedro, 15000.00, 'Abono parcial de Don Pedro');
    RAISE NOTICE 'Don Pedro abonó $15.000. Nuevo saldo deudor: $%', r_pago_cli.nuevo_saldo;
    SELECT * INTO r_prod FROM public.registrar_produccion(d3, 'tarde', 72.00);
    -- Corrección Trazable: Error en báscula de la tarde (-2L)
    SELECT * INTO r_correc FROM public.registrar_correccion(d3, 'produccion', r_prod.produccion_id, -2.00, 0.00, 'Ajuste por calibración de báscula');
    PERFORM public.registrar_consumo(d3, 'tarde', 6.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d3, 'tarde', 14.00); -- $35.000
    -- Cierre Día 3: Base 200.000 + Venta 35.000 + Abono Pedro 15.000 = Esperada 250.000. Físico 250.000. Base 200.000 -> Retiro 50.000
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d3, 250000.00, 200000.00, 'Cierre con retiro de excedente');
    RAISE NOTICE 'Día 3 finalizado. Retiro realizado: $%', r_cierre.retiro_cierre;

    -- =========================================================================
    -- DÍA 4:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 4 (%) ---', d4;
    SELECT * INTO r_prod FROM public.registrar_produccion(d4, 'manana', 140.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d4, 'manana', 100.00);
    SELECT * INTO r_fiado FROM public.registrar_venta_fiada(v_cliente_juan, d4, 'manana', 12.00); -- $30.000
    SELECT * INTO r_prod FROM public.registrar_produccion(d4, 'tarde', 78.00);
    PERFORM public.registrar_consumo(d4, 'tarde', 5.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d4, 'tarde', 15.00); -- $37.500
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d4, 237500.00, 200000.00, 'Cierre día 4');

    -- =========================================================================
    -- DÍA 5:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 5 (%) ---', d5;
    SELECT * INTO r_prod FROM public.registrar_produccion(d5, 'manana', 132.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d5, 'manana', 100.00);
    -- Cancelación total deuda Doña Carmen: paga sus $20.000 completos
    SELECT * INTO r_pago_cli FROM public.registrar_pago_cliente(d5, v_cliente_carmen, 20000.00, 'Cancelación total deuda de leche');
    RAISE NOTICE 'Doña Carmen pagó $20.000. Saldo restante: $%', r_pago_cli.nuevo_saldo;
    SELECT * INTO r_prod FROM public.registrar_produccion(d5, 'tarde', 75.00);
    PERFORM public.registrar_consumo(d5, 'tarde', 6.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d5, 'tarde', 10.00); -- $25.000
    -- Caja: Base 200.000 + Venta 25.000 + Pago Carmen 20.000 = 245.000
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d5, 245000.00, 200000.00, 'Cierre día 5');

    -- =========================================================================
    -- DÍA 6:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 6 (%) ---', d6;
    SELECT * INTO r_prod FROM public.registrar_produccion(d6, 'manana', 129.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d6, 'manana', 95.00);
    -- Nueva venta fiada a Don Pedro (5L = $12.500)
    SELECT * INTO r_fiado FROM public.registrar_venta_fiada(v_cliente_pedro, d6, 'manana', 5.00);
    SELECT * INTO r_prod FROM public.registrar_produccion(d6, 'tarde', 73.00);
    PERFORM public.registrar_consumo(d6, 'tarde', 5.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d6, 'tarde', 8.00); -- $20.000
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d6, 220000.00, 200000.00, 'Cierre día 6');

    -- =========================================================================
    -- DÍA 7:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 7 (%) ---', d7;
    SELECT * INTO r_prod FROM public.registrar_produccion(d7, 'manana', 131.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d7, 'manana', 100.00);
    -- LIQUIDACIÓN PARCIAL QUESERA ($1.000.000 COP)
    -- Se comprueba que las entregas más antiguas se marquen como 'pagada' (FIFO)
    SELECT * INTO r_pago_que FROM public.registrar_pago_quesera(d7, 1000000.00, 'Anticipo quincenal transferencia quesera');
    RAISE NOTICE 'Quesera pagó $1.000.000. Saldo restante pendiente: $%', r_pago_que.saldo_restante;
    SELECT * INTO r_prod FROM public.registrar_produccion(d7, 'tarde', 76.00);
    PERFORM public.registrar_consumo(d7, 'tarde', 6.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d7, 'tarde', 20.00); -- $50.000
    -- Caja: Base 200.000 + Venta 50.000 + Quesera 1.000.000 = 1.250.000. Base 200.000 -> Retiro utilidad 1.050.000
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d7, 1250000.00, 200000.00, 'Cierre con retiro de liquidación quesera');
    RAISE NOTICE 'Día 7 finalizado. Retiro consignado a cuenta bancaria: $%', r_cierre.retiro_cierre;

    -- =========================================================================
    -- DÍA 8:
    -- =========================================================================
    RAISE NOTICE '--- EJECUTANDO DÍA 8 (%) ---', d8;
    SELECT * INTO r_prod FROM public.registrar_produccion(d8, 'manana', 134.00);
    SELECT * INTO r_quesera FROM public.registrar_entrega_quesera(d8, 'manana', 100.00);
    SELECT * INTO r_prod FROM public.registrar_produccion(d8, 'tarde', 74.00);
    PERFORM public.registrar_consumo(d8, 'tarde', 5.00, 'Consumo terneros');
    SELECT * INTO r_venta FROM public.registrar_venta_cobrada(d8, 'tarde', 15.00); -- $37.500
    SELECT * INTO r_cierre FROM public.realizar_cierre_caja(d8, 237500.00, 200000.00, 'Gran cierre general de 8 días');

    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'SIMULACIÓN DE 8 DÍAS COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '=============================================================';
END $$;

-- =============================================================================
-- CONSULTAS DE AUDITORÍA Y COMPROBACIÓN MATEMÁTICA FINAL
-- =============================================================================

-- 1. Balance de Litros
SELECT 
    '1. BALANCE LITROS' AS auditoria,
    (SELECT COALESCE(SUM(litros), 0) FROM public.producciones_leche) AS litros_producidos,
    (SELECT COALESCE(SUM(litros_diferencia), 0) FROM public.correcciones WHERE modulo = 'produccion') AS correccion_litros,
    (SELECT COALESCE(SUM(litros), 0) FROM public.entregas_quesera) AS litros_quesera,
    (SELECT COALESCE(SUM(litros), 0) FROM public.ventas_directas WHERE estado = 'cobrada') AS litros_ventas_efectivo,
    (SELECT COALESCE(SUM(litros), 0) FROM public.ventas_directas WHERE estado = 'fiada') AS litros_ventas_fiadas,
    (SELECT COALESCE(SUM(litros), 0) FROM public.movimientos_leche WHERE tipo = 'consumo') AS litros_consumo,
    (SELECT public.obtener_stock_actual()) AS stock_disponible_calculado;

-- 2. Balance de Cartera de Clientes (Cuentas por Cobrar)
SELECT 
    c.nombre AS cliente,
    COALESCE(SUM(vd.total), 0) AS total_fiado,
    COALESCE((SELECT SUM(pc.monto) FROM public.pagos_clientes pc WHERE pc.cliente_id = c.id), 0) AS total_abonado,
    (COALESCE(SUM(vd.total), 0) - COALESCE((SELECT SUM(pc.monto) FROM public.pagos_clientes pc WHERE pc.cliente_id = c.id), 0)) AS saldo_deuda_actual
FROM public.clientes c
LEFT JOIN public.ventas_directas vd ON vd.cliente_id = c.id AND vd.estado = 'fiada'
GROUP BY c.id, c.nombre
ORDER BY c.nombre;

-- 3. Estado de Entregas y Liquidación de Quesera (Verificación FIFO)
SELECT 
    eq.fecha,
    eq.jornada,
    eq.litros,
    eq.precio_unitario,
    eq.total,
    eq.estado AS estado_pago_fifo
FROM public.entregas_quesera eq
ORDER BY eq.fecha ASC;

-- 4. Resumen Global de Caja y Arqueos
SELECT 
    cc.fecha,
    cc.caja_esperada,
    cc.caja_fisica,
    cc.diferencia,
    cc.base_siguiente,
    cc.retiro_cierre,
    cc.observaciones
FROM public.cierres_caja cc
ORDER BY cc.created_at ASC;
