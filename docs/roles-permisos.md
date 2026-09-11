# 05 — Roles y permisos

**Proyecto:** Sistema de gestión de lechería  
**Estado:** APROBADO  
**Versión:** 1.1  
**Decisión:** Paso 10

## Principio
El trabajador registra la operación diaria. El administrador controla el dinero y las operaciones financieras o históricas sensibles. Ningún registro confirmado se edita directamente.

## Trabajador
Puede registrar:
- producción de mañana y tarde;
- ventas cobradas;
- ventas fiadas;
- consumo de finca;
- litros realmente enviados a quesera;
- correcciones operativas trazables de producción, ventas, consumo y entregas.

No puede:
- pagos de clientes o quesera;
- fletes;
- retiros;
- cierres de caja;
- correcciones financieras;
- modificar liquidaciones de quesera o pagos registrados.

## Administrador
Tiene todos los permisos del trabajador y además puede:
- registrar pagos de clientes y quesera;
- registrar fletes y retiros;
- realizar cierres y establecer la nueva base mediante el cierre;
- realizar correcciones financieras;
- gestionar clientes;
- supervisar historial y saldos.

## Venta fiada
El trabajador puede registrarla. El sistema calcula `litros × precio_unitario`; el trabajador no introduce ni modifica manualmente la deuda ni registra su pago.

## Correcciones
Nunca se edita el registro histórico. Se crea una corrección trazable con usuario, fecha/hora, registro afectado, motivo y movimiento compensatorio.

Correcciones operativas: trabajador o administrador.  
Correcciones financieras (caja, pagos, retiros, cierres y liquidaciones): solo administrador.

## Seguridad
Los permisos se reforzarán en PostgreSQL/Supabase mediante RLS y funciones transaccionales. El frontend no será la única barrera.
