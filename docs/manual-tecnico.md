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

## Render

El repositorio incluye [render.yaml](../render.yaml). Podés publicarlo como Blueprint o crear un Web Service manualmente.

- Runtime: Node.
- Build command: `npm install`.
- Start command: `npm start`.
- Health check: `/api/health`.

Variables en Render:

```env
NODE_ENV=production
DB_SSL=true
DATABASE_URL=<URI PostgreSQL de Supabase>
SESSION_SECRET=<secreto aleatorio largo>
```

Render configura `PORT`. El arranque prepara la base y luego levanta Express. Para crear el primer administrador, ejecutá `npm run admin:create` desde una terminal local conectada a la misma base Supabase, usando variables temporales.

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
