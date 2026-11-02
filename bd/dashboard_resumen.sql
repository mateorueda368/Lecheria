-- =============================================================
-- Función RPC: get_dashboard_resumen
-- Retorna todos los KPIs del dashboard en una sola consulta.
-- Versión 2.1 — Caja esperada filtrada desde el último cierre.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_resumen()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_ultimo_cierre_ts      TIMESTAMPTZ;  -- timestamp exacto del último cierre
  v_movimientos_recientes JSONB;
BEGIN

  -- 1. Stock actual de leche
  -- Producciones son positivas, todo lo demás es negativo en movimientos_leche
  -- Los tipos de egreso de leche se almacenan con litros POSITIVOS pero son salidas
  -- 1. Stock actual de leche considerando correcciones
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN ml.tipo = 'produccion' THEN ml.litros 
        WHEN ml.tipo = 'correccion' THEN ml.litros 
        ELSE -ml.litros 
      END
    ),
    0
  )
  INTO v_stock_leche
  FROM public.movimientos_leche AS ml;

  -- 2. Producción de hoy por jornada
  -- La jornada (manana/tarde) está en producciones_leche, no en movimientos_leche
  SELECT
    COALESCE(SUM(pl.litros), 0),
    COALESCE(SUM(pl.litros) FILTER (WHERE pl.jornada = 'manana'), 0),
    COALESCE(SUM(pl.litros) FILTER (WHERE pl.jornada = 'tarde'), 0)
  INTO v_produccion_hoy, v_prod_manana, v_prod_tarde
  FROM public.producciones_leche pl
  WHERE pl.fecha = CURRENT_DATE;

  -- 3. Caja esperada: base del último cierre + movimientos POSTERIORES al cierre
  SELECT cc.fecha, cc.base_siguiente, cc.created_at
  INTO v_ultimo_cierre_fecha, v_ultimo_cierre_monto, v_ultimo_cierre_ts
  FROM public.cierres_caja cc
  ORDER BY cc.created_at DESC
  LIMIT 1;

  -- Ingresos + correcciones positivas a caja
  SELECT COALESCE(SUM(mc.monto), 0)
  INTO v_ingresos_caja
  FROM public.movimientos_caja mc
  WHERE (mc.tipo IN ('ingreso_venta', 'pago_cliente', 'pago_quesera') OR (mc.tipo = 'correccion' AND mc.monto > 0))
    AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

  -- Egresos + correcciones negativas a caja (excluyendo retiro automático de cierre previo)
  SELECT COALESCE(SUM(ABS(mc.monto)), 0)
  INTO v_egresos_caja
  FROM public.movimientos_caja mc
  WHERE ((mc.tipo IN ('egreso_flete', 'retiro') AND (mc.concepto IS NULL OR mc.concepto NOT LIKE '%cierre de caja%'))
         OR (mc.tipo = 'correccion' AND mc.monto < 0))
    AND (v_ultimo_cierre_ts IS NULL OR mc.created_at > v_ultimo_cierre_ts);

  v_caja_esperada := COALESCE(v_ultimo_cierre_monto, 0) + v_ingresos_caja - v_egresos_caja;

  -- 4. (v_ultimo_cierre_fecha y v_ultimo_cierre_monto ya están cargados arriba)

  -- 5. Ventas del día ($) — movimientos_caja de tipo ingreso_venta del día
  SELECT COALESCE(SUM(mc.monto), 0)
  INTO v_ventas_hoy_monto
  FROM public.movimientos_caja mc
  WHERE mc.fecha = CURRENT_DATE
    AND mc.tipo = 'ingreso_venta';

  -- 6. Litros vendidos hoy (directas cobradas + fiadas)
  SELECT COALESCE(SUM(vd.litros), 0)
  INTO v_ventas_hoy_litros
  FROM public.ventas_directas vd
  WHERE vd.fecha = CURRENT_DATE;

  -- 7. Fiados pendientes = total fiado - total cobrado
  SELECT
    COALESCE(
      (SELECT SUM(vd.total) FROM public.ventas_directas vd WHERE vd.estado = 'fiada')
      -
      (SELECT SUM(pc.monto) FROM public.pagos_clientes pc),
      0
    )
  INTO v_fiados_pendientes;

  -- Asegurar que no sea negativo
  IF v_fiados_pendientes < 0 THEN
    v_fiados_pendientes := 0;
  END IF;

  -- 8. Litros entregados a quesera hoy
  SELECT COALESCE(SUM(ml.litros), 0)
  INTO v_quesera_hoy
  FROM public.movimientos_leche ml
  WHERE ml.fecha = CURRENT_DATE
    AND ml.tipo = 'entrega_quesera';

  -- 9. Últimos 10 movimientos de caja
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',       sub.id,
      'fecha',    sub.fecha,
      'concepto', sub.concepto,
      'tipo',     sub.tipo,
      'monto',    sub.monto
    )
  )
  INTO v_movimientos_recientes
  FROM (
    SELECT id, fecha, concepto, tipo, monto, created_at
    FROM public.movimientos_caja
    ORDER BY created_at DESC
    LIMIT 10
  ) sub;

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

-- Permiso para usuarios autenticados
REVOKE ALL ON FUNCTION public.get_dashboard_resumen() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_resumen() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_resumen() TO authenticated;
