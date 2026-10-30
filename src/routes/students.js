const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const courseId = req.query.courseId ? Number(req.query.courseId) : null;
    const search = String(req.query.search || "").trim();
    const result = await pool.query(
      `SELECT e.id_estudiante, e.dni, e.apellido, e.nombre, e.estado,
              e.id_curso, c.anio, c.division, c.turno
       FROM estudiantes e
       JOIN cursos c ON c.id_curso = e.id_curso
       WHERE ($1::bigint IS NULL OR e.id_curso = $1)
         AND ($2 = '' OR e.dni ILIKE '%' || $2 || '%' OR e.apellido ILIKE '%' || $2 || '%' OR e.nombre ILIKE '%' || $2 || '%')
       ORDER BY e.apellido, e.nombre`,
      [Number.isInteger(courseId) && courseId > 0 ? courseId : null, search]
    );
    res.json({ students: result.rows });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const dni = String(req.body.dni || "").trim();
    const apellido = String(req.body.apellido || "").trim();
    const nombre = String(req.body.nombre || "").trim();
    const courseId = Number(req.body.id_curso);
    if (!dni || dni.length > 15 || !apellido || apellido.length > 80 || !nombre || nombre.length > 80 || !Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Completá DNI, apellido, nombre y curso con valores válidos." });
    }
    const result = await pool.query(
      "INSERT INTO estudiantes (dni, apellido, nombre, id_curso) VALUES ($1, $2, $3, $4) RETURNING *",
      [dni, apellido, nombre, courseId]
    );
    res.status(201).json({ student: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Ya existe un estudiante con ese DNI." });
    if (error.code === "23503") return res.status(400).json({ error: "El curso seleccionado no existe." });
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const dni = String(req.body.dni || "").trim();
    const apellido = String(req.body.apellido || "").trim();
    const nombre = String(req.body.nombre || "").trim();
    const courseId = Number(req.body.id_curso);
    const activo = req.body.estado !== false;
    if (!Number.isInteger(id) || id < 1 || !dni || dni.length > 15 || !apellido || apellido.length > 80 || !nombre || nombre.length > 80 || !Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Los datos del estudiante no son válidos." });
    }
    const result = await pool.query(
      `UPDATE estudiantes SET dni=$1, apellido=$2, nombre=$3, id_curso=$4, estado=$5
       WHERE id_estudiante=$6 RETURNING *`,
      [dni, apellido, nombre, courseId, activo, id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "No se encontró el estudiante." });
    res.json({ student: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Ya existe otro estudiante con ese DNI." });
    if (error.code === "23503") return res.status(400).json({ error: "El curso seleccionado no existe." });
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      "UPDATE estudiantes SET estado=FALSE WHERE id_estudiante=$1 RETURNING id_estudiante",
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ error: "No se encontró el estudiante." });
    res.json({ ok: true, message: "Estudiante dado de baja. Su historial se conservó." });
  } catch (error) { next(error); }
});

module.exports = router;
