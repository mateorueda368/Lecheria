# SPEC — Sistema de Gestión de Lechería

**Versión:** 1.0  
**Estado:** Borrador para revisión  
**Fuente de verdad del negocio:** `02-reglas-negocio-v1.0.md`

> **Regla:** SPEC convierte las reglas del negocio en una especificación funcional. No agrega funcionalidades que no estén justificadas por las reglas aprobadas.

## 1. Propósito

Construir una aplicación web orientada al uso desde celular que permita registrar y controlar la operación diaria de la lechería, especialmente:

- Control de litros de leche.
- Distribución de la leche.
- Ventas directas y fiados.
- Entregas a la quesera.
- Liquidación de la quesera cada 14 días.
- Control del dinero físico de caja.
- Conteo físico y diferencia de caja.

El trabajador debe poder registrar la operación diaria desde su celular y el administrador debe poder controlar la caja y revisar la operación.

## 2. Usuarios

### 2.1 Trabajador

Registra la operación diaria:

- Litros del ordeño de la mañana.
- Litros del ordeño de la tarde.
- Ventas directas.
- Ventas fiadas.
- Consumo de finca.
- Litros enviados a la quesera.

No modifica precios ni realiza operaciones administrativas reservadas al administrador.

### 2.2 Administrador

Controla:

- Caja.
- Conteo físico.
- Ingresos recibidos.
- Egresos.
- Fletes.
- Retiros.
- Base del siguiente período.
- Pagos recibidos de la quesera.
- Revisión de registros y resultados.

## 3. Registro de producción

Debe permitir registrar:

- Fecha.
- Litros de mañana.
- Litros de tarde.

El total diario se calcula automáticamente:

**Litros mañana + litros tarde = total litros día**

El total no se digita manualmente.

## 4. Control de leche

### 4.1 Saldo anterior

El saldo almacenado del día anterior está disponible para la operación de la mañana.

### 4.2 Disponibilidad de mañana

**Saldo anterior + producción de mañana = disponibilidad de mañana**

### 4.3 Distribución de mañana

Desde la disponibilidad se registran:

- Venta directa cobrada.
- Venta directa fiada.
- Consumo, si ocurre.
- Entrega a quesera.

Las salidas no pueden superar los litros disponibles.

### 4.4 Operación de tarde

La producción de la tarde puede utilizarse para:

- Venta directa cobrada.
- Venta directa fiada.
- Consumo de finca.

El saldo restante se almacena para el día siguiente.

## 5. Venta directa

### 5.1 Precio

**$2.500 por litro.**

El trabajador no modifica este precio.

### 5.2 Registro

El trabajador registra litros vendidos y el sistema calcula:

**Litros vendidos × $2.500 = valor de venta**

### 5.3 Venta cobrada

- La venta queda cobrada.
- Los litros se descuentan.
- El valor recibido aumenta la caja.

### 5.4 Venta fiada

- Los litros se descuentan.
- La venta queda registrada.
- Se genera una cuenta por cobrar.
- No aumenta la caja.

### 5.5 Pago de fiado

- Se registra el pago.
- Se reduce la deuda.
- El valor recibido aumenta la caja.

## 6. Consumo de finca

Debe existir una forma sencilla de registrar litros destinados al consumo de la casa/finca.

El consumo:

- Reduce la leche disponible.
- No genera venta.
- No genera caja.
- No genera cuenta por cobrar.

Normalmente ocurre durante la tarde.

## 7. Quesera

### 7.1 Precio

**$1.950 por litro.**

### 7.2 Entrega diaria

El trabajador registra los litros efectivamente enviados a la quesera. La quesera recibe leche todos los días de la semana según el convenio existente.

### 7.3 Valor

**Litros enviados × $1.950 = valor de entrega**

### 7.4 Cuenta pendiente

La entrega genera un valor pendiente de pago. No aumenta la caja hasta recibir el dinero.

### 7.5 Liquidación

El sistema acumula las entregas de cada período de 14 días y muestra:

- Fecha inicial.
- Fecha final.
- Litros totales.
- Precio por litro.
- Valor total.
- Estado de pago.

### 7.6 Pago

Cuando el administrador registra el pago:

- La liquidación queda pagada.
- El dinero recibido aumenta la caja.

## 8. Caja

La caja representa el dinero físico real.

### 8.1 Caja esperada

Conceptualmente:

**Base inicial + ingresos recibidos - egresos - retiros = caja esperada**

### 8.2 Ingresos

Solo afectan caja los valores efectivamente recibidos:

- Venta directa cobrada.
- Pago de fiado.
- Pago de quesera.

### 8.3 Egresos

El MVP contempla:

- Pago de fletes.
- Devoluciones cuando corresponda.
- Retiros.

### 8.4 Retiros

El administrador puede retirar dinero al cierre.

El retiro puede corresponder a:

- Entrega al administrador.
- Gastos de mantenimiento de la casa.

El retiro disminuye la caja.

## 9. Cierre de caja

El administrador debe poder:

1. Consultar la caja esperada.
2. Contar físicamente el dinero.
3. Registrar el dinero contado.
4. Compararlo contra la caja esperada.
5. Determinar la base del siguiente período.
6. Registrar el retiro correspondiente.

Ejemplo:

```text
Caja física:       $350.000
Base siguiente:    $200.000
Retiro:            $150.000
Caja siguiente:    $200.000
```

La base puede cambiar en cada cierre.

## 10. Diferencia de caja

**Caja física contada - Caja esperada = diferencia**

La diferencia debe mostrarse claramente al administrador.

## 11. Correcciones

Los registros confirmados no deben modificarse silenciosamente.

Una corrección conserva la trazabilidad.

Ejemplo:

```text
Registro original: 32 L
Corrección:        -2 L
Resultado:          30 L
```

El mecanismo técnico exacto se definirá posteriormente.

## 12. Validaciones funcionales

- No se pueden registrar salidas superiores a los litros disponibles.
- El trabajador no puede modificar precios.
- Una venta fiada no aumenta caja hasta recibir el pago.
- Una entrega a quesera no aumenta caja hasta recibir el pago.
- El consumo no genera ingresos ni cuentas por cobrar.
- Los registros originales no se modifican silenciosamente.

## 13. Datos principales

### Producción
- Fecha.
- Litros mañana.
- Litros tarde.
- Total diario.

### Movimiento de leche
- Litros disponibles.
- Litros venta directa.
- Litros fiados.
- Litros consumo.
- Litros quesera.
- Saldo almacenado.

### Venta directa
- Litros.
- Precio.
- Valor.
- Estado cobrado/fiado.
- Pago cuando corresponda.

### Quesera
- Fecha de entrega.
- Litros.
- Precio.
- Valor.
- Período de liquidación.
- Estado de pago.
- Pago recibido.

### Caja
- Base.
- Ingresos.
- Egresos.
- Retiros.
- Caja esperada.
- Caja física.
- Diferencia.

### Correcciones
- Registro original.
- Corrección.
- Resultado.

## 14. Información principal para el administrador

El sistema debe permitir consultar como mínimo:

### Litros
- Litros de mañana.
- Litros de tarde.
- Total del día.
- Saldo almacenado.
- Litros vendidos directamente.
- Litros fiados.
- Litros consumidos.
- Litros enviados a quesera.

### Dinero
- Caja esperada.
- Caja física contada.
- Diferencia.
- Ventas cobradas.
- Fiados pendientes.
- Valor pendiente de quesera.
- Valor acumulado de la liquidación actual.
- Base del período.

## 15. Experiencia de uso

La aplicación debe estar orientada al celular.

El registro del trabajador debe ser sencillo y evitar pasos innecesarios.

Los valores derivados deben calcularse automáticamente:

- Total de litros.
- Valor de ventas.
- Valor de entregas a quesera.
- Caja esperada.
- Diferencia de caja.
- Saldo de leche.

## 16. Consistencia

El sistema debe mantener coherencia entre registros.

Conceptualmente:

```text
Saldo anterior
+
Producción
-
Salidas
=
Saldo almacenado
```

Y:

```text
Base
+
Ingresos recibidos
-
Egresos
-
Retiros
=
Caja esperada
```

Los valores deben poder rastrearse hasta los movimientos que los originaron.

## 17. Fuera del alcance del MVP

No se implementarán:

- Gestión del ganado.
- Salud animal.
- Medicamentos.
- Alimentación.
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
- Funcionalidades administrativas no definidas.

## 18. Restricciones del proyecto

### R-001 — No inventar funcionalidades

Toda funcionalidad debe estar respaldada por una regla del negocio o una necesidad explícitamente aprobada.

### R-002 — No cambiar el proceso de la finca

La aplicación debe adaptarse al proceso existente.

### R-003 — No adelantar implementación

Antes de iniciar código deben completarse y aprobarse los documentos definidos para el proyecto.

### R-004 — Fuente de verdad

Ante una contradicción entre una propuesta técnica y las reglas del negocio, prevalecen las reglas aprobadas.

## 19. Criterio general de éxito

El sistema debe permitir que el administrador responda desde el celular:

- ¿Cuántos litros se produjeron hoy?
- ¿Cuántos litros quedan almacenados?
- ¿Cuántos litros fueron a la quesera?
- ¿Cuánto se vendió directamente?
- ¿Cuánto está fiado?
- ¿Cuánto debe la quesera?
- ¿Cuánto debería haber en caja?
- ¿Cuánto dinero físico hay?
- ¿Existe una diferencia?
- ¿Cuánto dinero se dejó como base para el siguiente período?

## 20. Documentos relacionados

Fuente:

- `02-reglas-negocio-v1.0.md`

Documentos posteriores:

- `03-flujos-operativos.md`
- `04-modelo-datos.md`
- `05-roles-permisos.md`
- `06-criterios-aceptacion.md`
- `AGENTS.md`

Todos deben respetar las reglas del negocio y esta especificación.

## 21. Estado

**SPEC v1.0 — BORRADOR PARA REVISIÓN**

No iniciar implementación hasta que este documento sea revisado y aprobado.

**Fin del documento.**
