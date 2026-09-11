# 03 — registrar_produccion
## Versión 1.0

### Alcance

Esta función es la primera operación transaccional del sistema.

Recibe:

- fecha;
- jornada (`manana` o `tarde`);
- litros.

Crea de forma atómica:

1. una fila en `producciones_leche`;
2. un movimiento de tipo `produccion` en `movimientos_leche`.

### Seguridad

La función usa `SECURITY DEFINER` porque RLS está activo y no existen políticas INSERT directas sobre las tablas.

Se fija:

```sql
SET search_path = public, pg_temp
```

y se restringe `EXECUTE` a `authenticated`.

La función no confía en un `registrado_por` enviado por el cliente: obtiene el usuario mediante `auth.uid()`.

### Validaciones

- usuario autenticado;
- perfil existente;
- rol `trabajador` o `administrador`;
- fecha obligatoria;
- jornada válida;
- litros mayores que cero.

### Concurrencia

`UNIQUE(fecha, jornada)` impide registrar dos producciones para la misma fecha y jornada.

La función no convierte cualquier `unique_violation` en duplicado: identifica específicamente `producciones_leche_fecha_jornada_uk`.

### Atomicidad

Las dos inserciones ocurren dentro de la misma llamada a la función. Si una falla, la operación completa falla.

### Fuera de alcance

No registra:

- ventas directas;
- fiados;
- consumo de finca;
- envío a quesera;
- caja;
- cierres.
