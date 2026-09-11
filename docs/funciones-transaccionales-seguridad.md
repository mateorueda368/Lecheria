# 10 — Funciones transaccionales y seguridad

**Proyecto:** Sistema de gestión de lechería  
**Estado:** EN DISEÑO  
**Versión:** 1.0  
**No ejecutar SQL todavía.**

## Objetivo
Convertir las reglas aprobadas en operaciones atómicas y seguras, validando permisos, datos, disponibilidad de leche, saldos y duplicaciones.

## Funciones previstas
1. `registrar_produccion`
2. `registrar_venta_cobrada`
3. `registrar_venta_fiada`
4. `registrar_pago_cliente`
5. `registrar_consumo`
6. `registrar_entrega_quesera`
7. `registrar_pago_quesera`
8. `registrar_flete`
9. `registrar_retiro`
10. `realizar_cierre_caja`
11. `registrar_correccion`

No se implementarán funcionalidades adicionales sin aprobación previa.

## Permisos

| Función | Trabajador | Administrador |
|---|:---:|:---:|
| Producción | ✅ | ✅ |
| Venta cobrada | ✅ | ✅ |
| Venta fiada | ✅ | ✅ |
| Pago cliente | ❌ | ✅ |
| Consumo | ✅ | ✅ |
| Entrega quesera | ✅ | ✅ |
| Pago quesera | ❌ | ✅ |
| Flete | ❌ | ✅ |
| Retiro | ❌ | ✅ |
| Cierre caja | ❌ | ✅ |
| Corrección operativa | ✅ | ✅ |
| Corrección financiera | ❌ | ✅ |

## Atomicidad
Las operaciones que afectan varias tablas deben ejecutarse como una sola transacción. Si falla una validación, se revierte toda la operación.

## Concurrencia
La comprobación y el descuento de leche deben ocurrir dentro de la misma transacción y serializar el recurso relevante. Así, si hay 5 L y dos operaciones intentan consumir 4 L simultáneamente, solo una puede aprobarse; nunca se permite disponibilidad negativa.

La misma protección se aplicará a saldos financieros para impedir sobrepagos concurrentes.

## Reglas por función

### `registrar_produccion`
Registrar los litros reales de mañana o tarde. Validar usuario, jornada, litros > 0 y evitar duplicar accidentalmente la misma jornada. Los errores posteriores se corrigen mediante una corrección trazable.

### `registrar_venta_cobrada`
Validar cliente activo, litros, precio, usuario y disponibilidad. Crear venta, descontar leche y generar ingreso de caja en una sola transacción.

### `registrar_venta_fiada`
Trabajador o administrador. Validar cliente y disponibilidad. Calcular `litros × precio_unitario`, registrar venta fiada, descontar leche y aumentar la deuda. No genera caja.

### `registrar_pago_cliente`
Solo administrador. Validar deuda y monto; impedir pago superior al saldo; registrar pago, disminuir deuda y generar ingreso de caja de forma atómica.

### `registrar_consumo`
Trabajador o administrador. Validar disponibilidad y jornada. Registrar consumo y descontar leche; no afecta caja.

### `registrar_entrega_quesera`
Trabajador o administrador. Registrar los litros realmente enviados. Validar disponibilidad y liquidación abierta. Precio actual del convenio: $1.950/L. Descontar leche y acumular valor en la liquidación; no afecta caja.

### `registrar_pago_quesera`
Solo administrador. Validar saldo y monto; impedir sobrepago; registrar pago, reducir saldo, marcar como pagada cuando corresponda y generar ingreso de caja.

### `registrar_flete`
Solo administrador. Generar salida de caja. No afecta leche.

### `registrar_retiro`
Solo administrador. Generar salida de caja. Puede representar dinero entregado al administrador o utilizado para gastos de casa/mantenimiento. No se crea un módulo separado de mantenimiento.

### `realizar_cierre_caja`
Solo administrador. Comparar caja esperada contra dinero físico y registrar nueva base. Si el dinero físico supera la nueva base, la diferencia que sale físicamente debe registrarse como retiro dentro de la misma transacción.

Ejemplo: físico $500.000, nueva base $300.000 → retiro $200.000.

### `registrar_correccion`
Nunca editar históricos. Crear corrección trazable y movimientos compensatorios. Correcciones operativas: trabajador o administrador. Correcciones financieras: solo administrador.

## Protección contra duplicaciones
Una operación de origen no debe generar dos veces el mismo movimiento derivado. La solución técnica definitiva se establecerá al construir las funciones SQL.

## Seguridad
Se usarán RLS para acceso por rol y funciones PostgreSQL para operaciones transaccionales. El frontend no será la única barrera.

## Orden de implementación
Cada función seguirá:

`Diseño → Auditoría → Aprobación → SQL → Prueba`

Orden:
1. producción
2. venta cobrada
3. venta fiada
4. consumo
5. entrega quesera
6. pago cliente
7. pago quesera
8. flete
9. retiro
10. cierre caja
11. corrección

## Estado
**Diseño inicial del Paso 10 completado.** El SQL de las funciones queda pendiente de revisión individual, comenzando por `registrar_produccion`.
