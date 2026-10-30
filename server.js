require("dotenv").config();

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const pool = require("./src/config/db");
const { requireAuth } = require("./src/middleware/auth");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET && isProduction) {
  throw new Error("SESSION_SECRET es obligatorio en producción.");
}
if (isProduction) app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: "sixseven.sid",
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || "solo-desarrollo-cambiar-antes-de-publicar",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/courses", requireAuth, require("./src/routes/courses"));
app.use("/api/students", requireAuth, require("./src/routes/students"));
app.use("/api/attendance", requireAuth, require("./src/routes/attendance"));
app.use("/api/reports", requireAuth, require("./src/routes/reports"));

app.use(express.static(path.join(__dirname, "public"), {
  index: "index.html",
  extensions: ["html"]
}));

app.use("/api", (req, res) => res.status(404).json({ error: "Ruta de API inexistente." }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ error: "Ocurrió un error interno. Revisá los registros del servidor." });
});

app.listen(PORT, () => {
  console.log(`SixSeven iniciado en el puerto ${PORT}`);
});
