# 03 — Flujos Operativos y Manual de Procesos del Negocio

**Proyecto:** Sistema de Gestión de Lechería  
**Versión:** 1.0 — Oficial  
**Estado:** APROBADO  
**Fuente de Verdad:** `reglas-negocio.md` y `spec.md`

---

## 1. Mapa General de Flujos de Trabajo

El sistema conecta los tres flujos fundamentales de la finca:
1. **Flujo de Leche (Volumen):** Ordeño → Disponibilidad → Ventas / Consumo / Quesera → Saldo Almacenado.
2. **Flujo de Crédito (Cuentas por Cobrar):** Venta Fiada / Entrega Quesera → Deuda Pendiente → Pago Recibido.
3. **Flujo de Caja (Dinero Físico):** Base del Período + Cobros en Efectivo - Egresos/Fletes - Retiros = Caja Esperada vs Arqueo Físico.

---

## 2. Flujo 1: Ordeño y Producción Diaria

### 2.1 Ordeño de la Mañana
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Ingresa al módulo **Registrar Ordeño** (`/registrar`).
3. **Entradas:** Fecha, Jornada (`manana`), Litros obtenidos (ej. 120 L).
4. **Procesamiento Transaccional:**
   - RPC `public.registrar_produccion(fecha, 'manana', litros)`.
   - Inserta registro en `producciones_leche` y cardex en `movimientos_leche`.
   - Restricción anti-duplicación: No permite registrar dos veces la misma jornada en el mismo día.

### 2.2 Ordeño de la Tarde
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Ingresa al módulo **Registrar Ordeño** (`/registrar`).
3. **Entradas:** Fecha, Jornada (`tarde`), Litros obtenidos (ej. 80 L).
4. **Cálculo Automático:**  
   $$\text{Total Diario} = \text{Litros Mañana} + \text{Litros Tarde}$$

---

## 3. Flujo 2: Distribución y Ventas de Leche

### 3.1 Venta Directa Cobrada ($2.500 / L)
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Módulo **Venta Directa** (`/venta-directa`).
3. **Entradas:** Fecha, Jornada, Litros vendidos.
4. **Cálculo:** $\text{Total} = \text{Litros} \times \$2.500$.
5. **Efectos:**
   - Descuenta los litros en `movimientos_leche` (`tipo = 'venta_cobrada'`).
   - Registra el ingreso en `movimientos_caja` (`tipo = 'ingreso_venta'`).
   - Aumenta la **Caja Esperada**.

### 3.2 Venta Directa Fiada ($2.500 / L)
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Módulo **Venta Fiada** (`/fiados`).
3. **Entradas:** Cliente, Fecha, Jornada, Litros fiados.
4. **Efectos:**
   - Descuenta los litros en `movimientos_leche` (`tipo = 'venta_fiada'`).
   - Genera cuenta por cobrar al cliente en `ventas_directas` (`estado = 'fiada'`).
   - **NO** modifica la caja física.

### 3.3 Consumo de Finca
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Módulo **Consumo Finca** (`/consumo`).
3. **Entradas:** Fecha, Jornada, Litros consumidos, Observación (opcional).
4. **Efectos:**
   - Descuenta los litros en `movimientos_leche` (`tipo = 'consumo'`).
   - **NO** genera cobro, venta ni movimiento de caja.

### 3.4 Entrega a Quesera ($1.950 / L)
1. **Actor:** Trabajador o Administrador.
2. **Acción:** Módulo **Entrega Quesera** (`/quesera`).
3. **Entradas:** Fecha, Jornada, Litros despachados.
4. **Cálculo:** $\text{Total Pendiente} = \text{Litros} \times \$1.950$.
5. **Efectos:**
   - Descuenta los litros en `movimientos_leche` (`tipo = 'entrega_quesera'`).
   - Registra entrega en `entregas_quesera` (`estado = 'pendiente'`).
   - **NO** ingresa dinero a caja hasta recibir el pago quincenal.

---

## 4. Flujo 3: Gestión Financiera y Cobros

### 4.1 Cobro a Clientes Fiados
1. **Actor:** Administrador (o Trabajador autorizado).
2. **Acción:** Módulo **Cobrar Fiado** (`/cobrar-fiado`).
3. **Entradas:** Cliente, Fecha, Monto abonado ($ COP), Concepto.
4. **Validación:** El abono no puede superar la deuda total acumulada del cliente.
5. **Efectos:**
   - Disminuye la deuda pendiente del cliente en `pagos_clientes`.
   - Registra ingreso en efectivo en `movimientos_caja` (`tipo = 'pago_cliente'`).

### 4.2 Liquidación y Pago de Quesera (Cada 14 días)
1. **Actor:** Administrador.
2. **Acción:** Módulo **Liquidaciones Quesera** (`/liquidacion-quesera`).
3. **Entradas:** Fecha de recibo del pago, Monto pagado por la quesera.
4. **Efectos:**
   - Registra pago en `pagos_quesera`.
   - Ingresa el dinero en efectivo a `movimientos_caja` (`tipo = 'pago_quesera'`).

---

## 5. Flujo 4: Control, Arqueo y Cierre de Caja

### 5.1 Arqueo Físico de Caja
1. **Actor:** Administrador exclusivamente.
2. **Acción:** Módulo **Cierre de Caja** (`/cierre-caja`).
3. **Fórmula de Caja Esperada:**
   $$\text{Caja Esperada} = \text{Base Inicial} + \text{Ingresos del Período} - \text{Egresos/Retiros del Período}$$
4. **Entradas del Cierre:**
   - Dinero Físico Contado ($ COP).
   - Base deseada para el siguiente período ($ COP, ej. $200.000).
   - Observaciones (opcional).

### 5.2 Determinación de Diferencia y Retiro Automático
- **Diferencia de Caja:**
  $$\text{Diferencia} = \text{Dinero Físico Contado} - \text{Caja Esperada}$$
- **Retiro Automático Excedente:**
  $$\text{Retiro al Cierre} = \max(0, \text{Dinero Físico Contado} - \text{Base Siguiente})$$

---

## 6. Flujo 5: Auditoría y Correcciones Trazables

### 6.1 Principio de Trazabilidad
- Ningún registro confirmado en la base de datos se modifica en silencio.
- Para corregir un error de digitación (ej. ordeño registrado por 120 L que eran 100 L), se ingresa una **Corrección Trazable** en `/correcciones`.
- Se requiere seleccionar el módulo afectado (`produccion`, `venta`, `consumo`, `quesera`, `caja`), la diferencia de litros/monto y el **motivo obligatorio**.

---
