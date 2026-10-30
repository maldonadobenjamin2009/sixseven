const express = require("express");
const pool = require("../config/db");
const router = express.Router();
const VALID_STATES = new Set(["P", "A", "T", "AJ"]);

router.get("/", async (req, res, next) => {
  try {
    const courseId = Number(req.query.courseId);
    const date = String(req.query.date || "");
    const jornada = String(req.query.jornada || "Mañana");
    if (!Number.isInteger(courseId) || courseId < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Seleccioná un curso y una fecha válida." });
    }
    const result = await pool.query(
      `SELECT e.id_estudiante, e.dni, e.apellido, e.nombre, a.estado AS asistencia,
              a.observacion
       FROM estudiantes e
       LEFT JOIN asistencias a
         ON a.id_estudiante=e.id_estudiante AND a.fecha=$2 AND a.jornada=$3
       WHERE e.id_curso=$1 AND e.estado=TRUE
       ORDER BY e.apellido, e.nombre`,
      [courseId, date, jornada]
    );
    res.json({ students: result.rows });
  } catch (error) { next(error); }
});

router.post("/bulk", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const courseId = Number(req.body.courseId);
    const date = String(req.body.date || "");
    const jornada = String(req.body.jornada || "Mañana").trim();
    const records = Array.isArray(req.body.records) ? req.body.records : [];
    if (!Number.isInteger(courseId) || courseId < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !jornada || jornada.length > 20 || records.length === 0) {
      return res.status(400).json({ error: "Faltan curso, fecha, jornada o estudiantes." });
    }
    const ids = records.map((record) => Number(record.studentId));
    if (ids.some((id) => !Number.isInteger(id) || id < 1) || new Set(ids).size !== ids.length ||
        records.some((record) => !VALID_STATES.has(record.status))) {
      return res.status(400).json({ error: "Hay estudiantes repetidos o estados de asistencia inválidos." });
    }

    await client.query("BEGIN");
    const enrolled = await client.query(
      "SELECT id_estudiante FROM estudiantes WHERE id_curso=$1 AND estado=TRUE AND id_estudiante = ANY($2::bigint[])",
      [courseId, ids]
    );
    if (enrolled.rowCount !== ids.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "La lista incluye estudiantes que no pertenecen al curso o están inactivos." });
    }

    for (const record of records) {
      await client.query(
        `INSERT INTO asistencias (id_estudiante, fecha, jornada, estado, observacion, id_usuario)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [Number(record.studentId), date, jornada, record.status,
          String(record.observacion || "").trim().slice(0, 255) || null, req.session.user.id]
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ ok: true, saved: records.length });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ error: "Ya existe asistencia para uno o más estudiantes en esa fecha y jornada. No se guardó ningún cambio." });
    next(error);
  } finally {
    client.release();
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;
    const studentId = req.query.studentId ? Number(req.query.studentId) : null;
    const from = String(req.query.from || "2000-01-01");
    const to = String(req.query.to || "2099-12-31");
    const result = await pool.query(
      `SELECT a.id_asistencia, a.fecha, a.jornada, a.estado, a.observacion,
              e.id_estudiante, e.dni, e.apellido, e.nombre,
              c.anio, c.division
       FROM asistencias a
       JOIN estudiantes e ON e.id_estudiante=a.id_estudiante
       JOIN cursos c ON c.id_curso=e.id_curso
       WHERE ($1::bigint IS NULL OR e.id_curso=$1)
         AND ($2::bigint IS NULL OR e.id_estudiante=$2)
         AND a.fecha BETWEEN $3::date AND $4::date
       ORDER BY a.fecha DESC, c.anio, c.division, e.apellido, e.nombre
       LIMIT 2000`,
      [Number.isInteger(courseId) && courseId > 0 ? courseId : null,
       Number.isInteger(studentId) && studentId > 0 ? studentId : null, from, to]
    );
    res.json({ records: result.rows });
  } catch (error) { next(error); }
});

module.exports = router;
