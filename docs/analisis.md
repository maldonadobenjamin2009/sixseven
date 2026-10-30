# Análisis del problema y requerimientos

## Situación problemática

La institución necesita organizar el control de asistencia de estudiantes de 1.º, 2.º y 3.º año. El registro en papel dificulta buscar información, seguir inasistencias y elaborar estadísticas. SixSeven centraliza cursos, estudiantes y registros diarios en una aplicación web adaptable a computadoras, tablets y celulares.

## Objetivo general

Desarrollar una aplicación web para administrar y controlar la asistencia de estudiantes de los primeros tres años del nivel secundario, aplicando JavaScript, diseño de interfaces, una API REST, una base de datos relacional y despliegue web.

## Objetivos específicos

1. Administrar cursos y divisiones de 1.º, 2.º y 3.º año.
2. Registrar, consultar, modificar y dar de baja estudiantes.
3. Tomar asistencia por curso, fecha y jornada.
4. Consultar el historial por estudiante, curso y período.
5. Calcular estadísticas de presentes, ausentes, tardanzas y justificadas.
6. Exportar los registros para su análisis.
7. Proteger el acceso mediante autenticación y contraseñas con hash.
8. Mantener los datos almacenados aunque se reinicie el servidor.

## Requerimientos funcionales implementados

| Módulo | Funcionalidad |
| --- | --- |
| Inicio de sesión | Login, validación, sesión persistente y cierre |
| Cursos | Consulta de cursos iniciales y alta de divisiones |
| Estudiantes | Alta, listado, búsqueda, edición y baja lógica |
| Asistencia | Registro por curso, fecha y jornada |
| Historial | Consulta por estudiante, curso y fechas |
| Informes | Totales, porcentajes, comparación y mayores ausencias |
| Exportación | Descarga CSV |

Estados: **P** (Presente), **A** (Ausente), **T** (Tardanza) y **AJ** (Ausente justificado).

## Requerimientos no funcionales

- Interfaz responsive e intuitiva.
- Validación de entradas en navegador y servidor.
- Contraseñas con hash bcrypt.
- Rutas administrativas protegidas por sesión.
- Persistencia PostgreSQL y manejo de errores.
- Integridad para impedir DNI y asistencias duplicadas.
- Código organizado por módulos.
- Configuración mediante variables de entorno.
- Preparación para publicación en Render.

## Reglas de integridad

- El DNI es único.
- Un registro identifica estudiante, fecha y jornada.
- No se admite más de un registro para estudiante + fecha + jornada.
- La baja de un estudiante es lógica: conserva el historial.
- El guardado masivo de asistencia usa una transacción; un duplicado cancela la operación completa.
