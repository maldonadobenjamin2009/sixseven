const express = require("express");
const pool = require("../config/db");
const router = express.Router();

function getRange(query) {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const last = now.toISOString().slice(0, 10);
  const from = String(query.from || first);
  const to = String(query.to || last);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new Error("El período seleccionado no es válido.");
  }
  return { from, to };
}

router.get("/summary", async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;
    const filterId = Number.isInteger(courseId) && courseId > 0 ? courseId : null;
    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE a.estado='P')::int AS presentes,
         COUNT(*) FILTER (WHERE a.estado='A')::int AS ausentes,
         COUNT(*) FILTER (WHERE a.estado='T')::int AS tardanzas,
         COUNT(*) FILTER (WHERE a.estado='AJ')::int AS justificadas,
         COUNT(*)::int AS total
       FROM asistencias a
       JOIN estudiantes e ON e.id_estudiante=a.id_estudiante
       WHERE a.fecha BETWEEN $1::date AND $2::date
         AND ($3::bigint IS NULL OR e.id_curso=$3)`,
      [from, to, filterId]
    );
    const top = await pool.query(
      `SELECT e.id_estudiante, e.dni, e.apellido, e.nombre, c.anio, c.division,
         COUNT(*) FILTER (WHERE a.estado IN ('A','AJ'))::int AS ausencias
       FROM estudiantes e
       JOIN cursos c ON c.id_curso=e.id_curso
       LEFT JOIN asistencias a ON a.id_estudiante=e.id_estudiante AND a.fecha BETWEEN $1::date AND $2::date
       WHERE e.estado=TRUE AND ($3::bigint IS NULL OR e.id_curso=$3)
       GROUP BY e.id_estudiante, c.anio, c.division
       ORDER BY ausencias DESC, e.apellido, e.nombre
       LIMIT 8`,
      [from, to, filterId]
    );
    const comparison = await pool.query(
      `SELECT c.id_curso, c.anio, c.division, c.turno,
         COUNT(a.id_asistencia)::int AS registros,
         COUNT(a.id_asistencia) FILTER (WHERE a.estado IN ('P','T'))::int AS asistencias,
         COUNT(a.id_asistencia) FILTER (WHERE a.estado IN ('A','AJ'))::int AS inasistencias
       FROM cursos c
       LEFT JOIN estudiantes e ON e.id_curso=c.id_curso AND e.estado=TRUE
       LEFT JOIN asistencias a ON a.id_estudiante=e.id_estudiante AND a.fecha BETWEEN $1::date AND $2::date
       WHERE ($3::bigint IS NULL OR c.id_curso=$3)
       GROUP BY c.id_curso
       ORDER BY c.anio, c.division`,
      [from, to, filterId]
    );
    const t = totals.rows[0];
    const marked = Number(t.total);
    const attended = Number(t.presentes) + Number(t.tardanzas);
    const absent = Number(t.ausentes) + Number(t.justificadas);
    res.json({
      range: { from, to },
      totals: {
        ...t,
        porcentaje_asistencia: marked ? Number((attended * 100 / marked).toFixed(1)) : 0,
        porcentaje_inasistencia: marked ? Number((absent * 100 / marked).toFixed(1)) : 0
      },
      topAbsences: top.rows,
      courses: comparison.rows.map((course) => ({
        ...course,
        porcentaje_asistencia: Number(course.registros)
          ? Number((course.asistencias * 100 / course.registros).toFixed(1))
          : 0
      }))
    });
  } catch (error) { next(error); }
});

router.get("/export.csv", async (req, res, next) => {
  try {
    const { from, to } = getRange(req.query);
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;
    const result = await pool.query(
      `SELECT a.fecha, c.anio, c.division, c.turno, e.dni, e.apellido, e.nombre,
              a.jornada, a.estado, COALESCE(a.observacion, '') AS observacion
       FROM asistencias a
       JOIN estudiantes e ON e.id_estudiante=a.id_estudiante
       JOIN cursos c ON c.id_curso=e.id_curso
       WHERE a.fecha BETWEEN $1::date AND $2::date
         AND ($3::bigint IS NULL OR e.id_curso=$3)
       ORDER BY a.fecha, c.anio, c.division, e.apellido, e.nombre`,
      [from, to, Number.isInteger(courseId) && courseId > 0 ? courseId : null]
    );
    const escape = (value) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const lines = [
      ["Fecha","Año","División","Turno","DNI","Apellido","Nombre","Jornada","Estado","Observación"].map(escape).join(";"),
      ...result.rows.map((row) => [
        row.fecha, row.anio, row.division, row.turno, row.dni, row.apellido,
        row.nombre, row.jornada, row.estado, row.observacion
      ].map(escape).join(";"))
    ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="asistencia-sixseven.csv"');
    res.send("\uFEFF" + lines.join("\r\n"));
  } catch (error) { next(error); }
});

module.exports = router;
