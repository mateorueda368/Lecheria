# Auditoría inicial — registrar_produccion
## Versión 1.0

Estado: 🟡 pendiente de prueba en Supabase.

## Verificado por diseño

- La función usa `auth.uid()`.
- No acepta `registrado_por` como parámetro.
- Valida perfil y rol.
- Valida fecha, jornada y litros.
- Crea producción.
- Crea movimiento.
- Usa `UNIQUE(fecha, jornada)` para concurrencia.
- Maneja específicamente el conflicto de esa restricción.
- No agrega funcionalidades de negocio fuera del alcance.
- `EXECUTE` queda limitado a `authenticated`.
- `anon` y `PUBLIC` no tienen EXECUTE.

## Punto crítico a probar

La función es `SECURITY DEFINER` porque las tablas tienen RLS activo y no tienen INSERT directo.

Debe comprobarse en Supabase que:

1. un trabajador autenticado puede ejecutar la función;
2. un administrador autenticado puede ejecutarla;
3. `anon` no puede ejecutarla;
4. un usuario autenticado sin `profiles` no puede ejecutarla;
5. fecha+jornada duplicadas son rechazadas;
6. litros cero/negativos son rechazados;
7. cada ejecución válida crea exactamente una producción y un movimiento;
8. una falla no deja una producción sin movimiento.

Hasta completar estas pruebas, esta función no se considera definitivamente aprobada.
