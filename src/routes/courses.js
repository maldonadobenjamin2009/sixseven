const express = require("express");
const pool = require("../config/db");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.id_curso, c.anio, c.division, c.turno,
        COUNT(e.id_estudiante) FILTER (WHERE e.estado = TRUE)::int AS total_estudiantes
       FROM cursos c
       LEFT JOIN estudiantes e ON e.id_curso = c.id_curso
       GROUP BY c.id_curso
       ORDER BY c.anio, c.division, c.turno`
    );
    res.json({ courses: result.rows });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const year = Number(req.body.anio);
    const division = String(req.body.division || "").trim().toUpperCase();
    const turno = String(req.body.turno || "Mañana").trim();
    if (![1, 2, 3].includes(year) || !/^[A-Z0-9]{1,5}$/.test(division) || !turno || turno.length > 20) {
      return res.status(400).json({ error: "Revisá año, división y turno." });
    }
    const result = await pool.query(
      "INSERT INTO cursos (anio, division, turno) VALUES ($1, $2, $3) RETURNING id_curso, anio, division, turno",
      [year, division, turno]
    );
    res.status(201).json({ course: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Ese curso y turno ya existen." });
    next(error);
  }
});

module.exports = router;
