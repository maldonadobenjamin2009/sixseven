# Manual técnico de instalación

## Tecnologías

HTML5, CSS3, JavaScript, Node.js, Express y PostgreSQL. Supabase Auth gestiona cuentas y credenciales; PostgreSQL almacena perfiles, cursos, estudiantes y asistencias. Node utiliza `pg` para la base privada y valida los tokens contra Supabase Auth.

## Requisitos

- Node.js 20 o superior.
- npm y Git.
- Un proyecto Supabase con PostgreSQL y Auth.

## Instalación local

```bash
git clone https://github.com/maldonadobenjamin2009/sixseven.git
cd sixseven
npm install
```

Copiá `.env.example` a `.env` (PowerShell: `Copy-Item .env.example .env`) y completá:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=<URI PostgreSQL Session Pooler>
DB_SSL=true
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=<clave pública anon o publishable>
```

No uses `service_role` en el navegador.

## Inicialización

```bash
npm run db:init
npm start
```

El script prepara tablas y cursos. Cuando `SUPABASE_URL` está definida, aplica también `database/supabase-auth.sql`, que vincula perfiles con `auth.users`, crea el trigger de nuevos usuarios y habilita RLS para las tablas escolares.

## Variables de entorno

| Variable | Función |
| --- | --- |
| `PORT` | Puerto HTTP; Render lo proporciona |
| `DATABASE_URL` | URI PostgreSQL privada |
| `DB_SSL` | Activa SSL cuando vale `true` |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave pública anon o publishable |
| `SUPABASE_PUBLISHABLE_KEY` | Alternativa a la variable anterior |
| `NODE_ENV` | En producción: `production` |

La clave pública se entrega al frontend para iniciar Supabase Auth. El backend la usa para validar cada bearer token. No se necesita ni se debe exponer `service_role`.

## Primer administrador

1. Registrá el primer usuario desde la aplicación, con email/contraseña o Google.
2. Confirmá el correo si Supabase lo solicita.
3. En Supabase → SQL Editor ejecutá, sustituyendo el correo:

```sql
UPDATE public.usuarios
SET activo = TRUE, rol = 'administrador'
WHERE lower(email) = lower('TU_CORREO')
RETURNING id_usuario, email, rol, activo;
```

4. Volvé a iniciar sesión o pulsá **Volver a comprobar** en la pantalla de cuenta pendiente.

Las siguientes cuentas quedan pendientes con rol docente hasta que un administrador las apruebe, las desactive o les asigne un rol desde el módulo **Usuarios**.

## Configurar Google OAuth

1. En Google Cloud Console creá un OAuth Client ID de tipo Web application.
2. En Authorized JavaScript origins agregá el dominio real de Render y `http://localhost:3000` para desarrollo.
3. En Authorized redirect URIs agregá la callback exacta que Supabase muestra en Authentication → Providers → Google. Suele ser `https://PROJECT_REF.supabase.co/auth/v1/callback`.
4. En Supabase → Authentication → Providers → Google, habilitá el proveedor y cargá Client ID y Client Secret.
5. En Supabase → Authentication → URL Configuration, configurá Site URL con el dominio de Render y agregá Redirect URLs para producción y `http://localhost:3000/**`.

El Client Secret queda en Supabase, nunca en GitHub, el frontend ni Render.

## Recuperar y cambiar contraseñas

- **Olvidé mi contraseña** usa `supabase.auth.resetPasswordForEmail`.
- El enlace vuelve a `/?mode=recovery`; luego `supabase.auth.updateUser` guarda la nueva contraseña.
- En **Mi cuenta**, un usuario autenticado puede actualizar su contraseña.

La confirmación por correo puede permanecer habilitada en Supabase Authentication.

## Render

El repositorio incluye `render.yaml`. Configurá el Web Service:

- Build command: `npm install`.
- Start command: `npm start`.
- Health check: `/api/health`.

Variables en Environment:

```env
NODE_ENV=production
DB_SSL=true
DATABASE_URL=<URI PostgreSQL Session Pooler>
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=<clave pública anon o publishable>
```

Elegí **Save, rebuild, and deploy**. El arranque ejecuta la inicialización de esquema y la migración de Auth.

## Rutas API

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/health` | Salud de servidor y base |
| GET | `/api/auth/config` | Configuración pública de Supabase |
| GET | `/api/auth/me` | Perfil autenticado |
| GET / PATCH | `/api/auth/users` | Listar y actualizar cuentas (admin) |
| GET / POST | `/api/courses` | Consultar y crear cursos |
| GET / POST | `/api/students` | Consultar y crear estudiantes |
| PUT / DELETE | `/api/students/:id` | Editar o dar de baja |
| GET | `/api/attendance` | Obtener lista |
| POST | `/api/attendance/bulk` | Guardar asistencia |
| GET | `/api/attendance/history` | Historial |
| GET | `/api/reports/summary` | Estadísticas |
| GET | `/api/reports/export.csv` | Exportar CSV |

## Verificaciones

```bash
npm run check
npm run db:init
npm run test:integration
```

GitHub Actions prueba la API con PostgreSQL temporal. El flujo real con correo, Google y Render requiere las credenciales propias del proyecto Supabase.
