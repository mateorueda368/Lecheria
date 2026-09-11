# Auditoría cruzada — Seguridad y registrar_produccion
## Versión 1.5

### Estado: 🟡 pendiente de prueba técnica controlada

## Hallazgo corregido

La versión anterior permitía INSERT directo mediante RLS sobre `producciones_leche` y `movimientos_leche`.

Eso podía permitir:

```text
INSERT producción
   ↓
sin movimiento asociado
```

La política fue corregida.

## Estado actual

### Producción
- RLS activo.
- SELECT propio para trabajador.
- SELECT administrativo para administrador.
- No hay INSERT directo.

### Movimientos
- RLS activo.
- SELECT propio para trabajador.
- SELECT administrativo para administrador.
- No hay INSERT directo.

### RPC
- `EXECUTE` revocado de `PUBLIC`.
- `EXECUTE` revocado de `anon`.
- `EXECUTE` concedido a `authenticated`.

### Función
`registrar_produccion()`:
- usa `auth.uid()`;
- valida perfil;
- valida rol;
- valida datos;
- inserta producción;
- inserta movimiento;
- depende de las restricciones SQL para concurrencia e idempotencia.

## Punto que no se debe asumir

La combinación:

`SECURITY INVOKER + RLS sin INSERT directo`

debe probarse realmente en Supabase.

No se considera aprobada solamente por inspección documental.

## Pruebas obligatorias antes de continuar

1. trabajador autenticado registra mañana;
2. trabajador autenticado registra tarde;
3. administrador registra producción;
4. usuario no autenticado no ejecuta RPC;
5. `anon` no ejecuta RPC;
6. duplicar misma fecha/jornada falla;
7. litros cero/negativos fallan;
8. no queda producción sin movimiento;
9. no queda movimiento sin producción;
10. trabajador no puede insertar directamente en tablas;
11. trabajador solo consulta sus registros;
12. administrador puede consultar registros administrativos.

## Decisión metodológica

Hasta completar estas pruebas, no se construyen las siguientes funciones de negocio.
