const express = require("express");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Probá nuevamente dentro de 15 minutos." }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Completá usuario y contraseña." });
    }

    const result = await pool.query(
      "SELECT id_usuario, nombre_usuario, password_hash, rol FROM usuarios WHERE nombre_usuario = $1 AND activo = TRUE",
      [username]
    );
    const user = result.rows[0];
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
    }

    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = {
        id: user.id_usuario,
        username: user.nombre_usuario,
        role: user.rol
      };
      res.json({ user: req.session.user });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

router.post("/logout", requireAuth, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("sixseven.sid");
    res.json({ ok: true });
  });
});

module.exports = router;
