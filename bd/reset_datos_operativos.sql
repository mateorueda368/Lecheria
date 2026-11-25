-- =============================================================================
-- SCRIPT DE REINICIO TOTAL DE DATOS (PUESTA A CERO PARA OPERACIÓN REAL)
-- =============================================================================
-- Este script vacía todos los registros transaccionales y de prueba:
-- - Ordeños y producciones diarias
-- - Movimientos de inventario de leche (cardex)
-- - Ventas directas (contado y crédito)
-- - Entregas y pagos de quesera
-- - Movimientos y cierres de caja física
-- - Pagos de clientes y catálogo de clientes de prueba
-- - Auditoría de correcciones
--
-- PRESERVA INTACTOS:
-- 1. Usuarios y Roles (public.profiles y auth.users)
-- =============================================================================

BEGIN;

-- Vaciar todas las tablas operativas y catálogo de clientes
TRUNCATE TABLE 
    public.correcciones,
    public.cierres_caja,
    public.pagos_quesera,
    public.pagos_clientes,
    public.movimientos_caja,
    public.entregas_quesera,
    public.ventas_directas,
    public.movimientos_leche,
    public.producciones_leche,
    public.clientes
RESTART IDENTITY CASCADE;

COMMIT;

-- Verificación: todos los conteos deben quedar en 0
SELECT 'producciones_leche' AS tabla, count(*) FROM public.producciones_leche
UNION ALL SELECT 'movimientos_leche', count(*) FROM public.movimientos_leche
UNION ALL SELECT 'ventas_directas', count(*) FROM public.ventas_directas
UNION ALL SELECT 'entregas_quesera', count(*) FROM public.entregas_quesera
UNION ALL SELECT 'movimientos_caja', count(*) FROM public.movimientos_caja
UNION ALL SELECT 'cierres_caja', count(*) FROM public.cierres_caja
UNION ALL SELECT 'pagos_clientes', count(*) FROM public.pagos_clientes
UNION ALL SELECT 'pagos_quesera', count(*) FROM public.pagos_quesera
UNION ALL SELECT 'correcciones', count(*) FROM public.correcciones
UNION ALL SELECT 'clientes', count(*) FROM public.clientes;
