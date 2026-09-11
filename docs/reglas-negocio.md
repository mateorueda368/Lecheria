# Reglas de Negocio — Sistema de Gestión de Lechería

**Versión:** 1.0  
**Estado:** Aprobado como fuente de verdad del negocio para el diseño del MVP

> **Regla fundamental:** el software debe representar la operación real de la lechería. No se deben inventar procesos, precios, cálculos, permisos ni funcionalidades. Si una situación no está definida, debe solicitarse una decisión antes de implementarla.

## 1. Objetivo

El sistema debe permitir controlar desde el celular:

- Producción de leche de mañana y tarde.
- Total de litros producidos.
- Litros disponibles y saldo almacenado.
- Ventas directas cobradas y fiadas.
- Consumo de la finca.
- Litros enviados diariamente a la quesera.
- Valor acumulado y liquidación de quesera cada 14 días.
- Dinero físico de caja.
- Ingresos, egresos y retiros.
- Base de dinero dejada en cada cierre.
- Diferencia entre caja esperada y dinero físico contado.

El trabajador registra la operación diaria desde su celular y el administrador controla la caja y las operaciones administrativas.

## 2. Principios fundamentales

### RN-001 — Litros y dinero son flujos diferentes
El sistema mantiene separados el movimiento físico de leche, las ventas, las cuentas por cobrar y el dinero físico.

### RN-002 — Venta no significa necesariamente cobro
Una venta puede ser cobrada inmediatamente o quedar fiada. Solo el dinero efectivamente recibido aumenta la caja.

### RN-003 — Cuenta por cobrar no es caja
Una venta fiada o una entrega a la quesera genera un valor pendiente, pero no entra a caja hasta recibir el dinero.

## 3. Producción

### RN-004 — Ordeño de mañana
El trabajador registra los litros obtenidos en la mañana.

### RN-005 — Ordeño de tarde
El trabajador registra los litros obtenidos en la tarde.

### RN-006 — Total diario
El sistema calcula automáticamente: **producción mañana + producción tarde**.

### RN-007 — Responsable
El trabajador registra ambos ordeños.

## 4. Saldo y disponibilidad de leche

### RN-008 — Saldo almacenado
La leche que queda físicamente al finalizar el día se almacena y pasa como saldo inicial al día siguiente.

### RN-009 — El saldo no es pérdida
La leche almacenada no es pérdida, diferencia ni error. Es leche disponible que viene del día anterior.

### RN-010 — Disponibilidad de mañana
**Saldo almacenado del día anterior + producción de mañana = leche disponible de mañana.**

### RN-011 — Distribución
La leche disponible puede destinarse a:
- Venta directa cobrada.
- Venta directa fiada.
- Consumo de finca, si aplica.
- Entrega a quesera.

Las salidas no pueden superar los litros disponibles.

## 5. Operación de la mañana

### RN-012 — Prioridad de venta directa
Antes de enviar leche a la quesera se atienden las ventas directas. Pueden ser cobradas o fiadas. Los litros vendidos se descuentan de la disponibilidad.

### RN-013 — Entrega a quesera
Después de considerar las ventas directas y las demás salidas que correspondan, los litros restantes disponibles pueden enviarse a la quesera.

### RN-014 — Registro
El trabajador registra los litros efectivamente enviados.

### RN-015 — Entrega diaria
La quesera recibe leche todos los días de la semana mediante un convenio existente.

## 6. Operación de la tarde

### RN-016 — Producción
El trabajador registra los litros producidos en la tarde.

### RN-017 — Venta directa
La leche de la tarde puede utilizarse para ventas directas, cobradas o fiadas.

### RN-018 — Consumo de finca
Normalmente el consumo de la casa/finca ocurre en la tarde. El consumo reduce litros, pero no genera venta, ingreso ni cuenta por cobrar.

### RN-019 — Almacenamiento
Después de ventas y consumo, la leche restante se almacena y pasa como saldo al día siguiente.

## 7. Venta directa

### RN-020 — Precio
**$2.500 por litro.**

### RN-021 — Registro
El trabajador registra litros vendidos y el sistema calcula automáticamente el valor.

### RN-022 — Venta cobrada
Si el cliente paga inmediatamente:
- La venta queda cobrada.
- Los litros salen de la disponibilidad.
- El dinero recibido aumenta la caja.

### RN-023 — Venta fiada
Si el cliente no paga:
- La venta queda registrada.
- Los litros salen de la disponibilidad.
- El dinero no entra a caja.
- Se genera una cuenta por cobrar.

### RN-024 — Pago de fiado
Cuando el cliente paga:
- Se registra el pago.
- Se reduce la deuda.
- El dinero recibido aumenta la caja.

## 8. Consumo de finca

### RN-025 — Consumo interno
La leche destinada a la casa/finca se registra como salida de litros.

### RN-026 — Efecto
No es una venta, no genera ingreso, no genera cuenta por cobrar y no aumenta la caja.

## 9. Quesera

### RN-027 — Precio
**$1.950 por litro.**

### RN-028 — Valor
El valor de cada entrega se calcula como litros enviados por el precio establecido.

### RN-029 — Pago acumulado
La quesera acumula las entregas y paga cada **14 días**.

### RN-030 — Cuenta por cobrar
Una entrega registra litros y valor pendiente, pero no aumenta caja mientras no se reciba el pago.

### RN-031 — Liquidación de 14 días
Debe mostrar:
- Fecha inicial.
- Fecha final.
- Litros entregados.
- Precio por litro.
- Valor total.
- Estado de pago.

### RN-032 — Pago recibido
Cuando el administrador registra el pago:
- Se registra dinero recibido.
- Aumenta caja.
- La liquidación queda pagada.

### RN-033 — Nuevo período
Después del cierre comienza el siguiente período de 14 días.

## 10. Caja

### RN-034 — Caja física
La caja representa el dinero físico administrado por la lechería.

### RN-035 — Seguimiento en tiempo real
El sistema debe mostrar el valor esperado de caja según los movimientos registrados.

### RN-036 — Ingresos reales
Aumentan caja únicamente los valores efectivamente recibidos:
- Ventas directas cobradas.
- Pagos de fiados.
- Pagos de quesera.

### RN-037 — Egresos
Actualmente se reconocen:
- Pago de fletes.
- Devoluciones cuando corresponda.
- Retiros de dinero al cierre.

### RN-038 — Fletes
Un flete pagado reduce caja y queda registrado.

### RN-039 — Retiro
El dinero que sale de caja y se entrega al administrador o se utiliza para mantenimiento de la casa se registra como retiro de caja. Reduce la caja física y no debe clasificarse automáticamente como gasto de la lechería.

## 11. Cierre de caja y plata base

### RN-040 — Conteo físico
El administrador cuenta físicamente el dinero y registra el resultado.

### RN-041 — Caja esperada
**Base inicial + ingresos reales - egresos y retiros registrados = caja esperada.**

### RN-042 — Diferencia
El sistema compara dinero físico contado contra caja esperada y muestra cualquier diferencia.

### RN-043 — Base variable
La plata base no es fija. En cada cierre el administrador decide cuánto dejar para el siguiente período.

### RN-044 — Retiro del excedente
Ejemplo:
- Caja física: $350.000
- Base siguiente: $200.000
- Retiro: $150.000
- Caja inicial siguiente: $200.000

El retiro queda registrado.

### RN-045 — Destino del retiro
Puede ser:
- Entrega al administrador.
- Gastos de mantenimiento de la casa.

## 12. Correcciones y trazabilidad

### RN-046 — No editar registros originales
No habrá edición silenciosa de registros ya realizados.

### RN-047 — Corrección trazable
Si existe un error, se registra una corrección conservando el registro original.

Ejemplo: registro original 32 L → corrección -2 L → resultado 30 L.

### RN-048 — No eliminar historial
No se debe eliminar información de forma que se pierda la trazabilidad.

## 13. Devoluciones

### RN-049 — Caso excepcional
Las devoluciones de leche no son habituales y no serán un módulo central del MVP.

### RN-050 — Efecto económico
Si una venta ya cobrada requiere devolución de dinero, se registra la salida de caja correspondiente. El tratamiento físico de los litros devueltos se definirá cuando sea necesario.

## 14. Roles

### RN-051 — Trabajador
Registra:
- Ordeño mañana.
- Ordeño tarde.
- Ventas directas.
- Ventas fiadas.
- Consumo.
- Entregas a quesera.

### RN-052 — Administrador
Controla:
- Caja.
- Conteo físico.
- Ingresos y egresos.
- Retiros.
- Base del siguiente período.
- Pagos de quesera.
- Revisión de operación.

### RN-053 — Precios
Los precios actuales son:
- Quesera: $1.950/L.
- Venta directa: $2.500/L.

El trabajador no modifica precios.

## 15. Integridad de litros

### RN-054 — No superar disponibilidad
No se pueden registrar salidas superiores a los litros disponibles.

### RN-055 — Trazabilidad
Los movimientos deben relacionarse con producción, venta, fiado, consumo, quesera o saldo.

### RN-056 — Saldo siguiente
El saldo almacenado al final del día pasa como saldo inicial del siguiente día.

## 16. Alcance del MVP

El MVP incluye:
1. Producción de leche.
2. Control de litros.
3. Distribución.
4. Venta directa.
5. Fiados.
6. Consumo de finca.
7. Entregas a quesera.
8. Liquidación cada 14 días.
9. Caja.
10. Ingresos.
11. Egresos.
12. Retiros.
13. Base variable.
14. Conteo físico.
15. Diferencia de caja.
16. Roles trabajador/administrador.
17. Uso desde celular.

## 17. Fuera de alcance

No forman parte del MVP:
- Gestión del ganado.
- Salud animal.
- Medicamentos.
- Alimentación del ganado.
- Nómina.
- Compras generales.
- Inventarios diferentes a la leche.
- Contabilidad general.
- Sensores.
- Automatizaciones no definidas.
- Proveedores.
- Multiempresa.
- Múltiples fincas.
- IA dentro de la aplicación.

Cualquier nueva funcionalidad requiere aprobación explícita.

## 18. Regla final de control

Si aparece una necesidad nueva durante el desarrollo:
1. Se identifica.
2. Se compara con este documento.
3. Si ya está contemplada, se implementa según estas reglas.
4. Si no está contemplada, se consulta al administrador.
5. Solo después de aprobarla se modifica el alcance.

**Este documento es la fuente de verdad para el negocio durante el diseño del MVP.**
