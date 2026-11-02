-- =============================================================================
-- SCRIPT DE REINICIO DE DATOS OPERATIVOS (RESET PARA TESTING DESDE CERO)
-- =============================================================================
-- Este script vacía únicamente los registros transaccionales (ordeños, ventas,
-- entregas a quesera, movimientos de caja, cierres y correcciones).
--
-- PRESERVA INTACTOS:
-- 1. Usuarios y Roles (public.profiles y auth.users)
-- 2. Catálogo de Clientes (public.clientes) [Opcional: puedes descomentar si deseas vaciarlos]
-- =============================================================================

BEGIN;

-- 1. Vaciar movimientos y transacciones operativas
TRUNCATE TABLE 
    public.correcciones,
    public.cierres_caja,
    public.pagos_quesera,
    public.pagos_clientes,
    public.movimientos_caja,
    public.entregas_quesera,
    public.ventas_directas,
    public.movimientos_leche,
    public.producciones_leche
RESTART IDENTITY CASCADE;

-- Si también deseas eliminar los clientes de prueba creados anteriormente,
-- descomenta la siguiente línea:
-- TRUNCATE TABLE public.clientes RESTART IDENTITY CASCADE;

COMMIT;

-- Verificación posterior
SELECT 'producciones_leche' AS tabla, count(*) FROM public.producciones_leche
UNION ALL
SELECT 'movimientos_leche', count(*) FROM public.movimientos_leche
UNION ALL
SELECT 'movimientos_caja', count(*) FROM public.movimientos_caja
UNION ALL
SELECT 'cierres_caja', count(*) FROM public.cierres_caja
UNION ALL
SELECT 'entregas_quesera', count(*) FROM public.entregas_quesera;
