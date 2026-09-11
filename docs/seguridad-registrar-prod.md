# Seguridad de registrar_produccion
## Versión 1.2

## Decisión

Durante esta etapa, `registrar_produccion()` es la puerta transaccional de escritura para producción y su movimiento.

El frontend no debe insertar directamente en:

- `producciones_leche`;
- `movimientos_leche`.

Por ello las políticas RLS de esta etapa no conceden `INSERT` directo a esas tablas.

## Flujo

```text
Usuario autenticado
       ↓
EXECUTE registrar_produccion()
       ↓
auth.uid()
       ↓
profiles + rol
       ↓
producciones_leche
       ↓
movimientos_leche
```

## Lectura

Trabajador:
- puede consultar sus propios registros.

Administrador:
- puede consultar registros de producción y movimientos para administración.

## Escritura

No existe política RLS `INSERT` directa para producción ni movimientos.

La función debe ser la única operación expuesta al frontend para registrar producción.

## Seguridad de la función

La función continúa como `SECURITY INVOKER`.

Esto es una decisión deliberada. Antes de usarla en Supabase hay que comprobar que el modelo de permisos permita que el RPC ejecute las dos inserciones sin conceder escritura directa al cliente.

Si el modelo de RLS/privilegios de Supabase no permite esa combinación, no se debe improvisar: se revisará entonces una alternativa `SECURITY DEFINER` con `search_path` fijo y privilegios mínimos.

## EXECUTE

Se revoca `EXECUTE` de `PUBLIC` y `anon`, y se concede a `authenticated`.

## No se implementa todavía

No se crean políticas para:

- ventas;
- fiados;
- consumo;
- quesera;
- caja;
- cierres;
- correcciones.

Cada operación tendrá su propia auditoría de seguridad.
