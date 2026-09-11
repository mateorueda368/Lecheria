# Prueba temporal autenticada

Esta página sirve únicamente para comprobar una sesión autenticada real contra
Supabase y ejecutar `registrar_produccion()`.

## Preparación

1. En Supabase abre Project Settings -> API.
2. Copia el Project URL.
3. Copia la clave pública `anon`/`publishable`.
4. NO uses `service_role`.

## Uso

Abre `prueba-registrar-produccion.html` en el navegador.

Introduce:
- Project URL
- clave pública
- correo del administrador
- contraseña
- 32 litros

Pulsa el botón una sola vez.

La prueba usa la fecha actual y la jornada `manana`. Si es exitosa, no vuelvas
a ejecutarla con esa misma fecha y jornada porque `UNIQUE(fecha, jornada)` debe
rechazar un duplicado.

Después de una prueba exitosa verificaremos `producciones_leche` y
`movimientos_leche`.

Si aparece un error, copia el mensaje completo y no cambies ningún archivo.
