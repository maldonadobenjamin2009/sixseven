# Manual técnico de instalación

## Tecnologías

HTML5, CSS3, JavaScript, Node.js, Express, PostgreSQL y GitHub. La conexión PostgreSQL se realiza desde el backend con `pg`. Las sesiones se almacenan en PostgreSQL y las contraseñas se protegen con bcrypt.

## Requisitos

- Node.js 20 o superior.
- npm y Git.
- Una base PostgreSQL accesible.

## Instalación local

```bash
git clone https://github.com/maldonadobenjamin2009/sixseven.git
cd sixseven
npm install
```

Copiá `.env.example` a `.env` y configurá:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:password@host:5432/postgres
DB_SSL=false
SESSION_SECRET=una-clave-larga-y-aleatoria
```

Para Supabase, usá `DB_SSL=true`.

## Inicializar base de datos

```bash
npm run db:init
npm start
```

El esquema y los cursos iniciales se crean de forma idempotente. `npm start` vuelve a verificar las tablas antes de iniciar Express.

## Crear el administrador

Definí temporalmente las variables y ejecutá el script:

**PowerShell**
```powershell
$env:ADMIN_USER="admin"
$env:ADMIN_PASSWORD="una-clave-larga-y-unica"
npm run admin:create
Remove-Item Env:ADMIN_USER
Remove-Item Env:ADMIN_PASSWORD
```

El script genera un hash bcrypt, exige al menos 10 caracteres y no modifica usuarios existentes.

## Variables de entorno

| Variable | Función |
| --- | --- |
| `PORT` | Puerto HTTP; Render lo proporciona |
| `DATABASE_URL` | URI PostgreSQL privada |
| `DB_SSL` | SSL cuando vale `true` |
| `SESSION_SECRET` | Secreto para las cookies de sesión |
| `NODE_ENV` | En producción debe ser `production` |

## Supabase

1. Creá un proyecto Supabase.
2. En **Connect**, elegí **Session pooler** y copiá la URI PostgreSQL.
3. Reemplazá el marcador de contraseña. Codificá caracteres reservados para URL.
4. Guardá la URI completa en `DATABASE_URL` y configurá `DB_SSL=true`.
5. Ejecutá `npm run db:init` y luego `npm run admin:create`.

Para un backend persistente sobre IPv4, el Session pooler compartido es una alternativa compatible. Si el entorno tiene IPv6 (o un complemento IPv4), también se puede usar conexión directa. Copiá siempre host, usuario y puerto desde el panel de Supabase.

La URI de PostgreSQL es privada: solo debe estar en el backend o en las variables secretas del servicio. Nunca la incluyas en archivos del directorio `public`.

## Inicializar Supabase desde GitHub Actions (sin Render Shell)

Este método también sirve cuando el Web Service está en el plan gratuito, que no incluye Dashboard Shell ni SSH.

1. En Supabase, cambiá primero la contraseña de la base de datos desde **Database → Settings** y copiá una nueva URI de **Connect → Session pooler**.
2. En GitHub, abrí **Settings → Secrets and variables → Actions** y creá estos tres repository secrets:
   - `SUPABASE_DATABASE_URL`: URI completa nueva de PostgreSQL.
   - `SIXSEVEN_ADMIN_USER`: usuario inicial (por ejemplo, `admin`).
   - `SIXSEVEN_ADMIN_PASSWORD`: contraseña personal nueva de al menos 10 caracteres.
3. Abrí **Actions → Bootstrap Supabase database → Run workflow**.
4. Activá `create_admin` para crear también la primera cuenta.
5. Al finalizar, comprobá que todos los pasos indiquen éxito.

El workflow manual ejecuta `npm run db:init` y opcionalmente `npm run admin:create`. No se debe guardar la URI ni la contraseña en archivos del repositorio, variables públicas ni en el código frontend.

## Render

El repositorio incluye [render.yaml](../render.yaml). Podés publicarlo como Blueprint o crear un Web Service manualmente.

- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm start`.
- Health check: `/api/health`.

Variables en Environment del **Web Service**:

```env
NODE_ENV=production
DB_SSL=true
DATABASE_URL=<URI PostgreSQL de Supabase>
SESSION_SECRET=<secreto aleatorio largo>
```

El backend acepta `DATABASE_URL` y también `SUPABASE_DATABASE_URL` como alias. La URI debe estar guardada en Environment del servicio web, no solamente como GitHub Actions Secret ni en un Environment Group sin vincular.

Después de agregar o cambiar una variable, elegí **Save, rebuild, and deploy**. `Save only` guarda el valor pero no lo incorpora al proceso hasta otro deploy. Si usás un Environment Group, entrá al Web Service y confirmá que aparezca en **Linked Environment Groups**.

Si continúa faltando, el mensaje del servidor mostrará solamente si Render fue detectado, el tipo de servicio y si existe cada nombre de variable; nunca mostrará sus valores.

Render configura `PORT`. El arranque ejecuta la inicialización idempotente de la base y luego levanta Express. Para crear el primer administrador, ejecutá `npm run admin:create` desde una terminal local conectada a la misma base Supabase, usando variables temporales.
## Rutas API

| Método | Ruta | Función |
| --- | --- | --- |
| GET | `/api/health` | Salud de servidor y base |
| POST | `/api/auth/login` | Iniciar sesión |
| GET | `/api/auth/me` | Usuario autenticado |
| POST | `/api/auth/logout` | Cerrar sesión |
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

La integración se prueba en GitHub Actions con PostgreSQL temporal. La prueba manual contra Supabase y la publicación en Render se completan con las cuentas del responsable del proyecto.
