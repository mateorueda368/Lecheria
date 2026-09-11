# 06 — Arquitectura Técnica

**Versión:** 1.0  
**Estado:** Aprobado  
**Fuentes:** `02-reglas-negocio-v1.0.md`, `SPEC.md`, `03-flujos-operativos.md`, `04-modelo-datos.md` y `05-roles-permisos.md`

> Este documento define cómo se organizará técnicamente el sistema. No contiene implementación de funcionalidades.

---

# 1. Objetivo técnico

Construir una aplicación real para la gestión diaria de la lechería que:

- pueda utilizarse desde un celular;
- permita al trabajador registrar la operación de leche;
- permita al administrador controlar caja, fiados y quesera;
- mantenga la lógica de negocio definida;
- conserve trazabilidad;
- pueda desplegarse en producción;
- sea sencilla de mantener;
- no introduzca módulos fuera del alcance.

---

# 2. Arquitectura propuesta

La aplicación seguirá una arquitectura web moderna separada por responsabilidades:

```text
                    USUARIOS
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        TRABAJADOR          ADMINISTRADOR
             │                   │
             └─────────┬─────────┘
                       ▼
                APLICACIÓN WEB
                 RESPONSIVE
                       │
                       ▼
                 BACKEND / API
                       │
                       ▼
                  BASE DE DATOS
```

La aplicación debe funcionar desde:

- teléfono celular;
- computador.

No se desarrollarán inicialmente dos aplicaciones independientes.

---

# 3. Aplicación web responsive

## Decisión

La interfaz será una aplicación web responsive.

Esto significa que la misma aplicación se adapta al tamaño de pantalla.

### Celular

Principalmente para:

- trabajador;
- registros rápidos;
- consulta operativa.

### Computador

Principalmente para:

- administrador;
- control de caja;
- revisión;
- cierres.

La interfaz debe priorizar el uso desde celular porque es uno de los requerimientos principales.

---

# 4. PWA

Se contempla que la aplicación pueda instalarse como PWA en el celular.

Esto permitiría acceder a ella desde un icono del dispositivo sin desarrollar inicialmente una aplicación móvil nativa independiente.

La PWA será una característica técnica de acceso, no un nuevo módulo del negocio.

---

# 5. Frontend

## Responsabilidad

El frontend será responsable de:

- mostrar las pantallas;
- recibir datos del usuario;
- validar datos básicos de entrada;
- enviar operaciones al backend;
- mostrar resultados;
- mostrar mensajes de error;
- adaptar la interfaz al celular.

El frontend **no será la autoridad final de las reglas del negocio**.

---

# 6. Backend

## Responsabilidad

El backend será responsable de:

- autenticación/autorización;
- reglas de negocio;
- validaciones;
- cálculos;
- creación de registros;
- movimientos de leche;
- movimientos de caja;
- control de permisos;
- trazabilidad.

Las operaciones críticas no deben depender únicamente de validaciones del navegador.

Ejemplos:

```text
No permitir vender más litros de los disponibles.

No permitir enviar a quesera más litros de los disponibles.

No permitir que un trabajador registre un cierre.

No permitir que una venta fiada genere caja antes del pago.
```

---

# 7. Base de datos

La base de datos almacenará la información persistente del sistema.

Debe conservar:

- usuarios;
- clientes;
- producción;
- ventas;
- pagos;
- consumo;
- entregas a quesera;
- liquidaciones;
- movimientos de caja;
- cierres;
- correcciones/trazabilidad.

Los valores derivados no deben almacenarse innecesariamente cuando puedan calcularse de forma segura.

---

# 8. Supabase

## Propuesta

Se propone utilizar Supabase como plataforma de backend y base de datos, siempre que la revisión técnica final confirme que cubre las necesidades del proyecto.

Su posible utilización contempla:

```text
Supabase
├── PostgreSQL
├── Autenticación
├── API
└── Seguridad mediante políticas
```

No se creará ninguna tabla todavía.

La estructura física se definirá en el paso correspondiente de base de datos.

---

# 9. Autenticación

El sistema tendrá inicio de sesión.

Los usuarios tendrán un rol:

```text
TRABAJADOR
ADMINISTRADOR
```

El rol determinará las operaciones disponibles.

No se implementarán sistemas complejos de permisos.

---

# 10. Seguridad

Las operaciones críticas deben protegerse en backend/base de datos.

Especialmente:

- caja;
- cierres;
- pagos;
- liquidaciones;
- fiados;
- permisos;
- registros históricos.

El frontend no debe poder saltarse las restricciones simplemente modificando la interfaz.

---

# 11. Flujo técnico de una operación

Ejemplo: venta directa cobrada.

```text
TRABAJADOR
    ↓
Frontend
    ↓
Backend
    ↓
Validar usuario
    ↓
Validar litros disponibles
    ↓
Calcular valor
    ↓
Registrar venta
    ↓
Registrar efecto de caja
    ↓
Actualizar disponibilidad
    ↓
Responder resultado
    ↓
Frontend muestra confirmación
```

La operación debe ejecutarse de forma consistente para evitar que se registre la venta pero no el efecto correspondiente.

---

# 12. Flujo técnico de una venta fiada

```text
Trabajador
    ↓
Selecciona cliente
    ↓
Ingresa litros
    ↓
Backend valida disponibilidad
    ↓
Calcula valor
    ↓
Registra venta fiada
    ↓
Actualiza deuda del cliente
    ↓
NO genera ingreso de caja
```

---

# 13. Flujo técnico de entrega a quesera

```text
Trabajador
    ↓
Ingresa litros realmente enviados
    ↓
Backend valida disponibilidad
    ↓
Registra entrega
    ↓
Calcula valor × $1.950
    ↓
Asocia entrega al período
    ↓
NO genera caja
```

---

# 14. Flujo técnico de pago

## Pago de cliente

```text
Administrador
    ↓
Selecciona cliente
    ↓
Registra pago
    ↓
Reduce deuda
    ↓
Genera ingreso de caja
```

## Pago de quesera

```text
Administrador
    ↓
Selecciona liquidación
    ↓
Registra pago
    ↓
Reduce pendiente
    ↓
Genera ingreso de caja
```

---

# 15. Caja

La caja será tratada como un conjunto de movimientos, no como un número aislado.

```text
Base
 +
Ingresos
 -
Egresos
 -
Retiros
 =
Caja esperada
```

El conteo físico se registra durante el cierre y se compara contra la caja esperada.

---

# 16. Manejo de errores

El sistema debe impedir operaciones inválidas antes de confirmarlas.

Ejemplos:

```text
Venta > litros disponibles
        → RECHAZAR

Quesera > litros disponibles
        → RECHAZAR

Pago > deuda
        → RECHAZAR o solicitar manejo explícito

Cierre por trabajador
        → RECHAZAR

Registro sin cliente cuando es fiado
        → RECHAZAR
```

Los mensajes deben ser claros y entendibles para el usuario.

---

# 17. Conectividad

Este punto queda como decisión técnica importante.

La aplicación debe funcionar correctamente cuando exista conexión.

Debido al uso en una finca, antes de implementar se debe evaluar el comportamiento ante una pérdida temporal de internet.

## Regla actual

No se implementará un modo offline completo sin demostrar que es necesario.

Primero se verificará:

- calidad de conexión habitual;
- duración de posibles interrupciones;
- riesgo de registrar operaciones sin conexión;
- complejidad adicional de sincronización.

Si posteriormente se demuestra que el modo offline es necesario, se documentará como una decisión técnica específica.

---

# 18. Despliegue

La aplicación tendrá dos ambientes:

```text
DESARROLLO
    ↓
PRUEBAS
    ↓
PRODUCCIÓN
```

## Desarrollo

Para construir y probar nuevas funcionalidades.

## Producción

Para la operación real de la finca.

Nunca se deben probar cambios experimentales directamente sobre los datos reales de producción.

---

# 19. Separación de ambientes

Los datos de prueba y los datos reales deben estar separados.

Esto evita que una prueba pueda:

- modificar la caja real;
- alterar litros reales;
- crear ventas reales;
- modificar fiados reales;
- afectar liquidaciones reales.

---

# 20. Copias y recuperación

La información de la lechería es información operativa importante.

La plataforma seleccionada debe proporcionar mecanismos adecuados para respaldo y recuperación de la base de datos.

La estrategia exacta de backup se definirá antes de producción.

---

# 21. Estructura lógica del proyecto

La aplicación deberá mantenerse organizada por responsabilidades.

Conceptualmente:

```text
app/
├── autenticacion/
├── usuarios/
├── clientes/
├── leche/
├── ventas/
├── fiados/
├── quesera/
├── caja/
├── cierres/
└── componentes/
```

La estructura física exacta dependerá del framework elegido.

No se deben crear carpetas o módulos para funcionalidades que no existan en el alcance aprobado.

---

# 22. Principio de arquitectura

La arquitectura debe respetar esta separación:

```text
INTERFAZ
   ↓
APLICACIÓN
   ↓
REGLAS DE NEGOCIO
   ↓
DATOS
```

La interfaz no debe contener toda la lógica.

La base de datos no debe depender de comportamientos que solamente existen en la pantalla.

Las reglas críticas deben estar protegidas en el backend/base de datos.

---

# 23. Tecnologías

## Propuesta inicial

```text
Frontend:
React

Backend / plataforma:
Supabase

Base de datos:
PostgreSQL

Autenticación:
Supabase Auth

Despliegue:
Plataforma web compatible con el frontend elegido
```

Estas tecnologías son una propuesta técnica inicial y deberán quedar confirmadas antes de iniciar implementación.

No se incorporarán tecnologías adicionales sin una razón concreta.

---

# 24. Lo que NO se implementará ahora

Para mantener el alcance:

- Aplicación móvil nativa Android.
- Aplicación iOS nativa.
- Múltiples fincas.
- Contabilidad general.
- Nómina.
- Inventario general.
- Gestión de ganado.
- Sensores.
- Inteligencia artificial.
- Reportes avanzados no definidos.
- Integraciones externas innecesarias.

---

# 25. Estado del Paso 6

## Definido conceptualmente

- Aplicación web responsive.
- Uso prioritario desde celular.
- Posibilidad de PWA.
- Frontend separado del backend.
- Base de datos persistente.
- Autenticación.
- Dos roles.
- Seguridad en backend/base de datos.
- Separación desarrollo/producción.
- Manejo de errores.
- Estrategia inicial para conectividad.
- Arquitectura limitada al alcance.

## Decisiones aprobadas

1. Arquitectura web responsive.
2. Uso de React.
3. Uso de Supabase/PostgreSQL.
4. Uso de autenticación.
5. PWA como capacidad de acceso.
6. No se implementará modo offline por ahora.
7. Los registros se realizan desde la casa de la finca, donde existe buena conexión a internet.
8. Se mantendrá separación entre desarrollo y producción.

## Cierre

**PASO 6 — COMPLETADO Y APROBADO.**
