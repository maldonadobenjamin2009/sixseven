# Diagramas del sistema

## Casos de uso

El actor es el usuario autorizado. Todas las funciones de gestión requieren iniciar sesión.

```mermaid
flowchart LR
    U["Usuario autorizado"]
    L(["Iniciar sesión"])
    O(["Cerrar sesión"])
    C(["Consultar cursos"])
    AC(["Agregar división"])
    E(["Administrar estudiantes"])
    A(["Tomar asistencia"])
    H(["Consultar historial"])
    R(["Ver estadísticas"])
    X(["Exportar CSV"])
    U --> L
    U --> O
    U --> C
    U --> AC
    U --> E
    U --> A
    U --> H
    U --> R
    U --> X
```

## Entidad-relación

```mermaid
erDiagram
    CURSOS ||--o{ ESTUDIANTES : agrupa
    ESTUDIANTES ||--o{ ASISTENCIAS : registra
    USUARIOS ||--o{ ASISTENCIAS : carga

    USUARIOS {
        BIGINT id_usuario PK
        VARCHAR nombre_usuario UK
        VARCHAR password_hash
        VARCHAR rol
        BOOLEAN activo
    }
    CURSOS {
        BIGINT id_curso PK
        SMALLINT anio
        VARCHAR division
        VARCHAR turno
    }
    ESTUDIANTES {
        BIGINT id_estudiante PK
        VARCHAR dni UK
        VARCHAR apellido
        VARCHAR nombre
        BIGINT id_curso FK
        BOOLEAN estado
    }
    ASISTENCIAS {
        BIGINT id_asistencia PK
        BIGINT id_estudiante FK
        DATE fecha
        VARCHAR jornada
        VARCHAR estado
        VARCHAR observacion
        BIGINT id_usuario FK
    }
```

## Restricciones

- `estudiantes.dni` es único.
- `cursos(anio, division, turno)` es una combinación única.
- `asistencias(id_estudiante, fecha, jornada)` es una combinación única.
- `asistencias.estado` admite P, A, T o AJ.
- Una baja cambia `estado` a falso, sin borrar asistencias anteriores.

El esquema físico se encuentra en [database/schema.sql](../database/schema.sql).
