# SixSeven — Gestión de asistencia escolar

Sistema web de gestión de asistencia para 1.º, 2.º y 3.º año. Está desarrollado con HTML5, CSS3, JavaScript, Node.js, Express y PostgreSQL, tal como solicita el Trabajo Práctico Final Integrador.

## Documentación del proyecto

- [Análisis del problema y requerimientos](docs/analisis.md)
- [Diagramas de casos de uso y entidad-relación](docs/diagramas.md)
- [Manual de usuario](docs/manual-usuario.md)
- [Manual técnico de instalación](docs/manual-tecnico.md)
- [Pruebas y evidencias](docs/pruebas.md)
- [Guion para la presentación oral](docs/presentacion.md)

## Funcionalidades implementadas

- Registro e inicio de sesión con Supabase Auth (correo/contraseña o Google), recuperación y actualización de contraseñas.
- Cursos iniciales de 1.º, 2.º y 3.º año, divisiones A, B y C, turno mañana; alta de nuevas divisiones y turnos.
- Alta, consulta, modificación, búsqueda y baja lógica de estudiantes. El DNI es único.
- Registro diario por curso, fecha y jornada con estados P, A, T y AJ.
- Restricción única por estudiante + fecha + jornada. Si hay un duplicado, la transacción completa se rechaza.
- Historial por curso, estudiante y período.
- Resumen con porcentajes, comparativa por curso, estudiantes con más ausencias y exportación CSV.
- Interfaz responsive para escritorio y celular.
- API REST protegida mediante tokens verificados por Supabase Auth; aprobación de cuentas y gestión de roles.

## Requisitos

- Node.js 20 o superior.
- Una base PostgreSQL. Puede ser Supabase.
- Git.

## Ejecutar localmente

1. Cloná el repositorio e instalá dependencias:

   ```bash
   git clone https://github.com/maldonadobenjamin2009/sixseven.git
   cd sixseven
   npm install
   ```

2. Copiá `.env.example` a `.env` y completá:

   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=<URI PostgreSQL de Supabase>
   DB_SSL=true
   SUPABASE_URL=https://PROJECT_REF.supabase.co
   SUPABASE_ANON_KEY=<clave pública anon o publishable>
   ```

3. Ejecutá `npm run db:init` y `npm start`. Si `SUPABASE_URL` está definida, también se aplica la migración de Supabase Auth. Abrí `http://localhost:3000`.

4. Registrá tu primera cuenta desde la aplicación, confirmá el correo si Supabase lo solicita y seguí la sección **Primer administrador y aprobación**.

## Cuentas, contraseñas y Google

SixSeven utiliza **Supabase Auth** para las credenciales. Los usuarios se guardan en `auth.users`; el perfil de SixSeven se guarda en `public.usuarios`. Las contraseñas no se almacenan en la tabla propia. Supabase gestiona email/contraseña, Google, recuperación y actualización.

### Variables necesarias

Además de `DATABASE_URL`, configurá `SUPABASE_URL` y `SUPABASE_ANON_KEY` (la clave pública anon o publishable). Nunca uses `service_role` en el frontend.

### Migración y perfiles

Al iniciar, `npm start` ejecuta `npm run db:init`. Si encuentra `SUPABASE_URL`, aplica `database/supabase-auth.sql`, que vincula `public.usuarios.auth_user_id` con `auth.users.id`, crea automáticamente un perfil al registrarse y activa RLS en las tablas escolares para que no estén expuestas a la API pública de Supabase.

### Primer administrador y aprobación

Las cuentas nuevas quedan pendientes (`activo=false`) y con rol `docente`. Esto impide que cualquier visitante que se registre obtenga acceso inmediato a los datos escolares.

1. Registrá una cuenta en SixSeven con correo/contraseña o Google.
2. Confirmá el correo si Supabase lo solicita.
3. En Supabase → SQL Editor ejecutá, reemplazando el correo:

   ```sql
   UPDATE public.usuarios
   SET activo = TRUE, rol = 'administrador'
   WHERE lower(email) = lower('TU_CORREO')
   RETURNING id_usuario, email, rol, activo;
   ```

4. Volvé a iniciar sesión o pulsá **Volver a comprobar** en la pantalla de cuenta pendiente.

Después, el administrador puede aprobar, desactivar y asignar roles desde **Usuarios**. No desactives ni quites el rol al último administrador activo.

### Configurar Google OAuth

1. En Google Cloud Console creá un OAuth Client ID de tipo **Web application**.
2. En **Authorized JavaScript origins** agregá el dominio real de Render y `http://localhost:3000` para desarrollo.
3. En **Authorized redirect URIs** agregá la callback exacta que muestra Supabase en **Authentication → Providers → Google**. Suele tener formato `https://PROJECT_REF.supabase.co/auth/v1/callback`; copiá la que aparece en tu panel.
4. En Supabase → **Authentication → Providers → Google**, habilitá el proveedor y cargá el Client ID y Client Secret.
5. En Supabase → **Authentication → URL Configuration**, configurá el Site URL con el dominio de Render y agregá como Redirect URLs el dominio de producción y `http://localhost:3000/**`.
6. Guardá los cambios. El botón **Continuar con Google** ya invoca Supabase OAuth.

El Client Secret de Google se guarda solamente en Supabase. No lo agregues al repositorio, frontend ni Render.

### Recuperar o cambiar contraseña

- **Olvidé mi contraseña** envía un correo de recuperación.
- El enlace vuelve a `/?mode=recovery`, donde se define una contraseña nueva.
- **Mi cuenta → Cambiar contraseña** actualiza la contraseña de la sesión actual.

Asegurate de que los Redirect URLs coincidan con el dominio usado.

## Conectar Supabase

SixSeven usa PostgreSQL directamente desde el backend Node con el paquete `pg`. No hace falta colocar una clave `anon` ni `service_role` de Supabase en el navegador: la conexión se realiza únicamente en el servidor mediante `DATABASE_URL`.

1. Creá un proyecto en Supabase.
2. En el panel del proyecto, abrí **Connect** y elegí **Session pooler**. Copiá la URI PostgreSQL que muestra Supabase. Para un backend persistente que podría ejecutarse sobre IPv4, el Session pooler es la opción compatible. No armes el host a mano: copiá host, usuario y puerto que muestra el panel.
3. Reemplazá el marcador de contraseña en la URI. Si contiene caracteres especiales (por ejemplo `@`, `#`, `?` o espacios), codificalos para URL antes de pegarla.
4. Pegá esa cadena completa como `DATABASE_URL` en tu `.env` local. Configurá `DB_SSL=true`.
5. Ejecutá `npm run db:init`. El inicializador crea las tablas, los índices y los nueve cursos iniciales. Si `SUPABASE_URL` está configurada, también crea el trigger de perfiles Auth.

**Importante:** la cadena de conexión es un secreto. No la pongas en `public/js/app.js`, HTML, capturas, commits ni mensajes públicos. El archivo `.env` ya está excluido por `.gitignore`.

## Inicializar Supabase desde GitHub Actions

Para crear las tablas y el administrador sin necesitar una Shell de Render:

1. Primero rotá la contraseña de PostgreSQL en Supabase (Database → Settings), porque una URI con contraseña fue compartida y debe considerarse expuesta.
2. En GitHub, abrí Settings → Secrets and variables → Actions y agregá:
   - `SUPABASE_DATABASE_URL`: URI nueva de Session pooler.
   - `SIXSEVEN_ADMIN_USER`: nombre de usuario inicial.
   - `SIXSEVEN_ADMIN_PASSWORD`: contraseña nueva de al menos 10 caracteres.
3. Abrí la pestaña Actions y elegí **Bootstrap Supabase database**.
4. Presioná **Run workflow**. Marcá `create_admin` para crear también la cuenta inicial.
5. Revisá los pasos de la ejecución. No se imprimen los secretos en los logs.

El workflow corre `npm run db:init` y, cuando se solicita, `npm run admin:create`. Es manual y no se ejecuta en cada deploy.

## Publicar en Render

El archivo `render.yaml` deja configurado el servicio web. Podés desplegarlo como Blueprint o crear un Web Service manualmente.

- Repository: `maldonadobenjamin2009/sixseven`
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

En **Environment** del Web Service configurá:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_SSL` | `true` |
| `DATABASE_URL` | URI PostgreSQL de Supabase (Session pooler) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública anon o publishable |

Las variables `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_ANON_KEY` deben estar en el **Environment del Web Service**. Si usás un Environment Group, vinculalo al servicio y elegí **Save, rebuild, and deploy**.

Render proporciona `PORT` automáticamente; la aplicación lo lee desde `process.env.PORT`. Al iniciar, `npm start` prepara las tablas y luego inicia Express.

Para habilitar el primer administrador, registrá una cuenta y ejecutá el UPDATE indicado en la sección **Primer administrador y aprobación**.

## Rutas principales de la API

Todas las rutas de gestión requieren bearer token válido de Supabase Auth y un perfil aprobado.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor y PostgreSQL |
| GET | `/api/auth/config` | Configuración pública de Supabase |
| GET | `/api/auth/me` | Usuario autenticado |
| GET / PATCH | `/api/auth/users` | Listar y modificar cuentas (admin) |
| GET / POST | `/api/courses` | Consultar y crear cursos |
| GET / POST | `/api/students` | Consultar y registrar estudiantes |
| PUT / DELETE | `/api/students/:id` | Modificar o dar de baja |
| GET | `/api/attendance` | Lista de un curso y fecha |
| POST | `/api/attendance/bulk` | Guardar asistencia |
| GET | `/api/attendance/history` | Consultar historial |
| GET | `/api/reports/summary` | Estadísticas del período |
| GET | `/api/reports/export.csv` | Descargar registros CSV |

## Pruebas mínimas para la demostración

1. Iniciar sesión con el administrador y probar una contraseña incorrecta.
2. Crear un estudiante y comprobar que aparece en el curso.
3. Intentar crear otro estudiante con el mismo DNI: debe rechazarse.
4. Editar al estudiante y luego darlo de baja.
5. Tomar asistencia con estados diferentes y guardar.
6. Intentar registrar nuevamente la misma fecha y jornada: debe rechazarse.
7. Consultar el historial y descargar el CSV.
8. Reiniciar el servidor y verificar que los datos siguen presentes.
9. Abrir la URL de Render desde un celular.

Usá únicamente datos ficticios durante las pruebas y la exposición.

## Alcance de esta primera versión

Esta entrega cubre el flujo mínimo solicitado. Todavía se pueden sumar roles diferenciados de docentes, edición avanzada de cursos, PDF, gráficos más completos, filtros por ciclo lectivo y pruebas automatizadas. La publicación en Render y la conexión a Supabase requieren que configures tus propias cuentas y variables secretas.
