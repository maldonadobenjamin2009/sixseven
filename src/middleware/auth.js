const pool = require("../config/db");
const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

async function verifySupabaseToken(token) {
  const projectUrl = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publicKey) {
    const error = new Error("Faltan SUPABASE_URL y SUPABASE_ANON_KEY en el servidor.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${projectUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: publicKey, Authorization: `Bearer ${token}` }
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    const error = new Error("Supabase Auth no pudo validar la sesión.");
    error.status = 502;
    throw error;
  }
  return response.json();
}

async function requireAuth(req, res, next) {
  try {
    const match = (req.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "Iniciá sesión para continuar.", code: "AUTH_REQUIRED" });

    const identity = process.env.NODE_ENV === "test" && match[1] === "test-token"
      ? { id: TEST_USER_ID, email: "ci-admin@example.test" }
      : await verifySupabaseToken(match[1]);

    if (!identity?.id) {
      return res.status(401).json({ error: "La sesión no es válida o venció. Iniciá sesión nuevamente.", code: "INVALID_SESSION" });
    }

    const result = await pool.query(
      `SELECT id_usuario, nombre_usuario, email, nombre_completo, rol, activo
       FROM usuarios WHERE auth_user_id=$1 LIMIT 1`,
      [identity.id]
    );
    const profile = result.rows[0];
    if (!profile) return res.status(403).json({
      error: "No se encontró tu perfil. Revisá la migración de Supabase Auth.",
      code: "PROFILE_MISSING"
    });
    if (!profile.activo) return res.status(403).json({
      error: "Tu cuenta está pendiente de aprobación por un administrador.",
      code: "ACCOUNT_PENDING"
    });

    req.session = { user: {
      id: profile.id_usuario,
      authUserId: identity.id,
      username: profile.nombre_completo || profile.nombre_usuario,
      email: profile.email || identity.email || "",
      role: profile.rol
    }};
    req.authUser = identity;
    next();
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "No se pudo validar tu cuenta.",
      code: error.status === 503 ? "AUTH_CONFIG_MISSING" : "AUTH_ERROR"
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.session?.user?.role !== "administrador") {
    return res.status(403).json({ error: "Esta función requiere permisos de administrador." });
  }
  next();
}
module.exports = { requireAuth, requireAdmin };
