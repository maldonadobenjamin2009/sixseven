# SixSeven — Gestión de asistencia escolar

Sistema web de gestión de asistencia para 1.º, 2.º y 3.º año. Está desarrollado con HTML5, CSS3, JavaScript, Node.js, Express y PostgreSQL, tal como solicita el Trabajo Práctico Final Integrador.

## Funcionalidades implementadas

- Inicio y cierre de sesión con contraseñas almacenadas mediante bcrypt y sesiones guardadas en PostgreSQL.
- Cursos iniciales de 1.º, 2.º y 3.º año, divisiones A, B y C, turno mañana; alta de nuevas divisiones y turnos.
- Alta, consulta, modificación, búsqueda y baja lógica de estudiantes. El DNI es único.
- Registro diario por curso, fecha y jornada con estados P, A, T y AJ.
- Restricción única por estudiante + fecha + jornada. Si hay un duplicado, la transacción completa se rechaza.
- Historial por curso, estudiante y período.
- Resumen con porcentajes, comparativa por curso, estudiantes con más ausencias y exportación CSV.
- Interfaz responsive para escritorio y celular.
- API REST protegida por sesión y validación básica del lado del servidor.

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
   DATABASE_URL=postgresql://usuario:password@host:5432/postgres
   DB_SSL=false
   SESSION_SECRET=una-clave-larga-y-aleatoria
   ```

   Para PostgreSQL local, normalmente `DB_SSL=false`. Para Supabase, usá `DB_SSL=true`.

3. Inicializá las tablas y los cursos de ejemplo, y arrancá la aplicación:

   ```bash
   npm run db:init
   npm start
   ```

   El comando `npm start` también comprueba/crea las tablas y los cursos al iniciar, de forma idempotente. Abrí `http://localhost:3000`.

4. Creá el primer administrador. En otra terminal, con la misma conexión a la base, definí temporalmente estas variables y ejecutá el script:

   **PowerShell**
   ```powershell
   $env:ADMIN_USER="admin"
   $env:ADMIN_PASSWORD="elegir-una-clave-larga-y-unica"
   npm run admin:create
   Remove-Item Env:ADMIN_USER
   Remove-Item Env:ADMIN_PASSWORD
   ```

   **macOS / Linux**
   ```bash
   ADMIN_USER=admin ADMIN_PASSWORD='elegir-una-clave-larga-y-unica' npm run admin:create
   ```

   Cambiá el ejemplo por una contraseña segura. El sistema no trae un usuario ni contraseña predeterminados.

## Conectar Supabase

SixSeven usa PostgreSQL directamente desde el backend Node con el paquete `pg`. No hace falta colocar una clave `anon` ni `service_role` de Supabase en el navegador: la conexión se realiza únicamente en el servidor mediante `DATABASE_URL`.

1. Creá un proyecto en Supabase.
2. En el panel del proyecto, abrí **Connect** y elegí **Session pooler**. Copiá la URI PostgreSQL que muestra Supabase. Para un backend persistente que podría ejecutarse sobre IPv4, el Session pooler es la opción compatible. No armes el host a mano: copiá host, usuario y puerto que muestra el panel.
3. Reemplazá el marcador de contraseña en la URI. Si contiene caracteres especiales (por ejemplo `@`, `#`, `?` o espacios), codificalos para URL antes de pegarla.
4. Pegá esa cadena completa como `DATABASE_URL` en tu `.env` local. Configurá `DB_SSL=true`.
5. Ejecutá `npm run db:init`. El script crea las tablas `usuarios`, `cursos`, `estudiantes` y `asistencias`, además de los índices y los nueve cursos iniciales. Luego ejecutá `npm run admin:create` para crear tu cuenta de acceso.

**Importante:** la cadena de conexión es un secreto. No la pongas en `public/js/app.js`, HTML, capturas, commits ni mensajes públicos. El archivo `.env` ya está excluido por `.gitignore`.

## Publicar en Render

El archivo `render.yaml` deja configurado el servicio web. También podés crearlo desde el Dashboard:

- Repository: `maldonadobenjamin2009/sixseven`
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

En **Environment** del servicio configurá:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DB_SSL` | `true` |
| `DATABASE_URL` | URI PostgreSQL de Supabase (Session pooler) |
| `SESSION_SECRET` | Una cadena aleatoria larga y privada |

Render proporciona `PORT` automáticamente; la aplicación lo lee desde `process.env.PORT`. Guardá los cambios y desplegá. Al arrancar, `npm start` prepara las tablas y luego inicia Express.

Para crear el primer administrador, ejecutá `npm run admin:create` una sola vez desde una terminal local con el mismo `DATABASE_URL` de Supabase y `ADMIN_USER` / `ADMIN_PASSWORD` definidos temporalmente en el entorno. No configures esas dos variables de forma permanente en Render.

## Rutas principales de la API

Todas las rutas, excepto autenticación y salud, requieren sesión iniciada.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor y PostgreSQL |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario de la sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
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
