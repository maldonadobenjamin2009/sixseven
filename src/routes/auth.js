const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const router = express.Router();

router.get("/config", (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Faltan SUPABASE_URL y SUPABASE_ANON_KEY en Render." });
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ supabaseUrl, supabaseAnonKey });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: req.session.user }));

router.get("/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id_usuario, nombre_usuario, email, nombre_completo, rol, activo, creado_en
       FROM usuarios ORDER BY activo ASC, creado_en DESC, id_usuario DESC`
    );
    res.json({ users: result.rows });
  } catch (error) { next(error); }
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { active, role } = req.body;
    if (!Number.isInteger(id) || id < 1 || typeof active !== "boolean" ||
        !["administrador", "docente"].includes(role)) {
      return res.status(400).json({ error: "Estado o rol inválido." });
    }
    if (id === Number(req.session.user.id) && (!active || role !== "administrador")) {
      return res.status(400).json({ error: "No podés desactivar tu propia cuenta ni quitarte el rol de administrador." });
    }
    const current = await pool.query("SELECT id_usuario, rol, activo FROM usuarios WHERE id_usuario=$1", [id]);
    if (!current.rowCount) return res.status(404).json({ error: "No se encontró la cuenta." });
    const target = current.rows[0];
    if (target.rol === "administrador" && target.activo && (!active || role !== "administrador")) {
      const admins = await pool.query("SELECT COUNT(*)::int AS total FROM usuarios WHERE rol='administrador' AND activo=TRUE");
      if (admins.rows[0].total <= 1) return res.status(409).json({ error: "No podés quitar el último administrador activo." });
    }
    const updated = await pool.query(
      "UPDATE usuarios SET activo=$1, rol=$2 WHERE id_usuario=$3 RETURNING id_usuario, nombre_usuario, email, nombre_completo, rol, activo",
      [active, role, id]
    );
    res.json({ user: updated.rows[0] });
  } catch (error) { next(error); }
});

module.exports = router;
