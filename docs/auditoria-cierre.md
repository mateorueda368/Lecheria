# 09 — Auditoría cruzada de producción
**Estado:** CORREGIDA — PENDIENTE DE CIERRE FINAL
**Versión:** 1.2

## Resultado
La lógica de negocio de producción es consistente. La estructura queda por jornada y la migración debe alinearse con ella.

## Modelo
```text
public.producciones_leche
├── id
├── fecha
├── jornada
├── litros
├── registrado_por
└── created_at
```

Protección: `UNIQUE(fecha, jornada)`.

## Roles
Trabajador y administrador pueden registrar producción. El trabajador puede corregir producción mediante corrección trazable.

## Correcciones
No se edita el histórico como mecanismo normal.

## Concurrencia
La unicidad `(fecha, jornada)` debe estar respaldada por PostgreSQL.

## Caja
Producción no modifica caja.

## Quesera
Producción no implica automáticamente entrega a quesera.

## Hallazgos corregidos
- eliminación conceptual de `producciones_leche_nueva`;
- alineación entre modelo y migración;
- FK de `registrado_por` pendiente de confirmar contra esquema real;
- protección anti-duplicación de movimientos pendiente de confirmar contra estructura real.

## Condición para cerrar
Antes del SQL de `registrar_produccion` debemos comprobar:
1. tabla de usuarios/perfiles;
2. columna exacta de `registrado_por`;
3. estructura de `movimientos_leche`;
4. columnas que identifican origen;
5. RLS;
6. triggers o funciones dependientes de producción.

No se debe inventar ninguno de estos elementos.

## Decisión
La lógica de negocio está aprobada. La implementación SQL queda pendiente únicamente de verificar la estructura real de la base.
