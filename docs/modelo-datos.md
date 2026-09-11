# 04 — Modelo de datos
**Estado:** CORREGIDO — AUDITORÍA CRUZADA
**Versión:** 1.2

## Producción de leche
La producción se registra por jornada, no mediante columnas separadas.

```text
producciones_leche
id
fecha
jornada
litros
registrado_por
created_at
```

Jornadas válidas: `manana`, `tarde`.

Restricción obligatoria:

```text
UNIQUE(fecha, jornada)
```

Esto permite una producción de mañana y una de tarde por día, e impide duplicados.

## Producción y distribución
Registrar producción NO registra automáticamente venta, fiado, consumo, entrega a quesera ni caja.

## Movimientos de leche
Conceptualmente:

```text
Producción      → +
Venta           → -
Venta fiada     → -
Consumo finca   → -
Entrega quesera → -
Corrección      → movimiento compensatorio
```

Toda operación debe conservar su origen para permitir trazabilidad y evitar duplicaciones.

## Caja y quesera
Registrar producción no modifica caja ni crea automáticamente una entrega a quesera.

## Correcciones
Los registros históricos no se editan como mecanismo normal. Una corrección conserva registro original, usuario, fecha/hora, motivo y movimiento compensatorio.

## Identidad
`registrado_por` debe referenciar al usuario/perfil definido realmente por el esquema de autenticación existente.

## Alcance
No se agregan módulos fuera de los aprobados.
