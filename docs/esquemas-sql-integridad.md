# 08 — Esquema SQL e integridad
**Estado:** CORREGIDO — AUDITORÍA CRUZADA
**Versión:** 1.2

## Producción
La tabla oficial es `public.producciones_leche`.

Debe imponer:

```sql
CHECK (litros > 0)
```

jornada limitada a `manana` o `tarde`, y:

```sql
UNIQUE (fecha, jornada)
```

## Integridad referencial
`registrado_por` debe tener una FK hacia el identificador de usuario/perfil definido realmente en el proyecto. Antes del SQL definitivo se debe comprobar nombre y tipo exactos.

## Movimiento de producción
Una producción confirmada debe crear su movimiento dentro de la misma transacción. La relación con el origen debe impedir duplicaciones. La restricción concreta se definirá según la estructura real de `movimientos_leche`.

## Atomicidad
Producción y su movimiento deben confirmarse juntos o fallar juntos.

## Concurrencia
`UNIQUE(fecha, jornada)` debe ser una restricción real de PostgreSQL y la función debe manejar el intento duplicado.

## Correcciones
No utilizar UPDATE directo del histórico como mecanismo normal.

## Caja y quesera
La producción no modifica caja ni liquidaciones de quesera.

## Regla
Antes de generar SQL definitivo deben verificarse nombres reales de tablas, columnas, claves foráneas y restricciones.
