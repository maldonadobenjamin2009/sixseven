# Manual de usuario

## Crear cuenta e ingresar

1. Abrí la URL de SixSeven.
2. Para registrarte con correo, elegí **Crear una cuenta**, completá nombre, email y contraseña y confirmá el correo si Supabase lo solicita.
3. También podés usar **Registrarme con Google** o **Continuar con Google**.
4. Las cuentas nuevas quedan pendientes hasta que un administrador las apruebe.
5. Una vez aprobada, iniciá sesión con correo/contraseña o Google.
6. Para terminar, elegí **Cerrar sesión**.

## Recuperar o cambiar contraseña

- En el acceso, elegí **Olvidé mi contraseña**, ingresá tu email y abrí el enlace enviado por correo.
- En **Mi cuenta**, podés cambiar la contraseña mientras tengas una sesión abierta.
- Supabase Auth gestiona las contraseñas; la aplicación no las guarda en texto plano.

## Administración de cuentas

Los administradores tienen una sección **Usuarios** para aprobar registros, desactivar cuentas y asignar roles Docente o Administrador. No desactives ni quites permisos al último administrador activo.

## Resumen

Muestra estudiantes activos, asistencias, ausencias y porcentaje de asistencia para el período elegido. Incluye comparación por curso, estudiantes con más inasistencias y descarga CSV.

## Cursos

1. Entrá en **Cursos**.
2. Consultá las divisiones.
3. Para agregar una, elegí año, división y turno.
4. Presioná **Agregar división**.

Al inicializar la base se crean 1.º A, B y C; 2.º A, B y C; y 3.º A, B y C, en turno mañana.

## Estudiantes

1. Entrá en **Estudiantes**.
2. Filtrá por curso o buscá por DNI, apellido o nombre.
3. Elegí **Nuevo estudiante** e ingresá DNI, apellido, nombre y curso.
4. Para corregir datos, presioná **Editar**.
5. Para retirarlo del padrón activo, presioná **Dar de baja**.

La baja conserva el historial. El DNI no puede repetirse.

## Tomar asistencia

1. Entrá en **Tomar asistencia**.
2. Seleccioná curso, fecha y jornada.
3. Presioná **Cargar lista**.
4. Marcá P (Presente), A (Ausente), T (Tardanza) o AJ (Ausente justificado).
5. Agregá una observación si hace falta.
6. Presioná **Guardar asistencia**.

Los registros ya guardados aparecen bloqueados. Si una carga quedó incompleta, podés completar los estudiantes pendientes. No se puede repetir la misma combinación estudiante + fecha + jornada.

## Historial

1. Entrá en **Historial**.
2. Elegí curso, estudiante (o todos) y rango de fechas.
3. Presioná **Consultar**.
4. Usá **Exportar CSV** para descargar los resultados.

Durante las pruebas y la exposición escolar utilizá datos ficticios, no datos personales reales de estudiantes.
