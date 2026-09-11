# 07 — Diseño de base de datos
**Estado:** CORREGIDO — AUDITORÍA CRUZADA
**Versión:** 1.2

## Tabla oficial
La única tabla oficial de producción será:

```text
public.producciones_leche
```

No se mantendrá `producciones_leche_nueva` como tabla paralela después de la migración.

## Estructura
```text
id
fecha
jornada
litros
registrado_por
created_at
```

Restricciones:

```text
litros > 0
jornada ∈ {manana, tarde}
UNIQUE(fecha, jornada)
```

`registrado_por` debe relacionarse con el esquema real de usuarios/perfiles.

## Concurrencia
`UNIQUE(fecha, jornada)` es una protección de base de datos. No se depende únicamente del frontend.

## Movimiento asociado
Cada producción confirmada debe generar exactamente un movimiento de leche de producción. La relación con su origen debe impedir duplicaciones.

## Correcciones
No se corrige producción mediante actualización directa del histórico. La corrección crea el efecto compensatorio y conserva trazabilidad.

## Efectos
`registrar_produccion`:
- crea producción;
- genera movimiento positivo de leche;
- no registra ventas;
- no registra fiados;
- no registra consumo;
- no registra entrega a quesera;
- no modifica caja.
