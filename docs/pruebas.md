# Pruebas y evidencias

## Prueba automatizada

La integración se ejecuta con Node.js 22 y PostgreSQL temporal en GitHub Actions. Incluye instalación de dependencias, chequeo de sintaxis, inicialización del esquema, creación del usuario de prueba y llamadas a la API.

**Ejecución aprobada:** [GitHub Actions — prueba PostgreSQL](https://github.com/maldonadobenjamin2009/sixseven/actions/runs/41141094730)

Se verificó:

- Login incorrecto rechazado y login correcto aceptado.
- Existencia de los nueve cursos iniciales.
- Alta de estudiante ficticio.
- Rechazo de DNI duplicado.
- Registro de asistencia.
- Rechazo de asistencia duplicada para estudiante + fecha + jornada.
- Historial, estadísticas y exportación CSV.
- Cierre de sesión y bloqueo de rutas privadas.

## Lista de comprobación manual

Estas pruebas deben repetirse al conectar la instancia real de Supabase y publicar en Render. No se marcan como realizadas hasta probarlas en ese entorno.

| N.º | Prueba | Resultado esperado | Estado manual |
| --- | --- | --- | --- |
| 1 | Login correcto | Acceso permitido | Pendiente Supabase/Render |
| 2 | Login incorrecto | Acceso rechazado | Pendiente Supabase/Render |
| 3 | Registrar estudiante | Estudiante guardado | Pendiente Supabase/Render |
| 4 | DNI repetido | Operación rechazada | Pendiente Supabase/Render |
| 5 | Buscar por DNI o apellido | Estudiante encontrado | Pendiente Supabase/Render |
| 6 | Modificar estudiante | Cambios guardados | Pendiente Supabase/Render |
| 7 | Registrar asistencia | Registro almacenado | Pendiente Supabase/Render |
| 8 | Repetir asistencia | Duplicado rechazado | Pendiente Supabase/Render |
| 9 | Consultar historial | Datos correctos | Pendiente Supabase/Render |
| 10 | Reiniciar servidor | Datos conservados | Pendiente Supabase/Render |
| 11 | Abrir desde celular | Diseño adaptable | Pendiente revisión manual |
| 12 | Ingresar desde Render | Sistema operativo | Pendiente despliegue |

## Evidencias por agregar

Guardar capturas propias (sin datos personales reales) de login, cursos, alta/edición, duplicado de DNI, toma de asistencia, rechazo de duplicado, historial, estadísticas, exportación CSV y acceso desde Render en computadora y celular.

La demostración debe usar exclusivamente datos ficticios.
