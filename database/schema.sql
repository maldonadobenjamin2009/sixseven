-- Esquema inicial y migración compatible de SixSeven.
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario BIGSERIAL PRIMARY KEY,
  nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  rol VARCHAR(20) NOT NULL DEFAULT 'docente',
  activo BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE usuarios ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(120);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_auth_user_id ON usuarios(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email ON usuarios(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS cursos (
  id_curso BIGSERIAL PRIMARY KEY,
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 1 AND 3),
  division VARCHAR(5) NOT NULL,
  turno VARCHAR(20) NOT NULL DEFAULT 'Mañana',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cursos_anio_division_turno UNIQUE (anio, division, turno)
);
CREATE TABLE IF NOT EXISTS estudiantes (
  id_estudiante BIGSERIAL PRIMARY KEY,
  dni VARCHAR(15) NOT NULL UNIQUE,
  apellido VARCHAR(80) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  id_curso BIGINT NOT NULL REFERENCES cursos(id_curso) ON UPDATE CASCADE ON DELETE RESTRICT,
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS asistencias (
  id_asistencia BIGSERIAL PRIMARY KEY,
  id_estudiante BIGINT NOT NULL REFERENCES estudiantes(id_estudiante) ON UPDATE CASCADE ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  jornada VARCHAR(20) NOT NULL DEFAULT 'Mañana',
  estado VARCHAR(5) NOT NULL CHECK (estado IN ('P', 'A', 'T', 'AJ')),
  observacion VARCHAR(255),
  id_usuario BIGINT REFERENCES usuarios(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_asistencia_estudiante_fecha_jornada UNIQUE (id_estudiante, fecha, jornada)
);
CREATE INDEX IF NOT EXISTS idx_estudiantes_curso_activo ON estudiantes(id_curso, estado);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_estudiante_fecha ON asistencias(id_estudiante, fecha DESC);
