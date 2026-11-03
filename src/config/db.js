const path = require("node:path");
const dotenv = require("dotenv");

// Load the repository-root .env for local development. Render's environment
// variables are already injected into process.env and take precedence.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = require("pg");

// GitHub Actions uses SUPABASE_DATABASE_URL; Render and local setup normally
// use DATABASE_URL. Accept both, preferring the standard DATABASE_URL.
const connectionString =
  process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  const onRender = process.env.RENDER === "true";
  const serviceType = process.env.RENDER_SERVICE_TYPE || "unknown";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasSupabaseDatabaseUrl = Boolean(process.env.SUPABASE_DATABASE_URL);

  throw new Error(
    "Falta la URI de PostgreSQL. " +
    `Diagnóstico seguro: RENDER=${onRender ? "true" : "false"}, ` +
    `RENDER_SERVICE_TYPE=${serviceType}, ` +
    `DATABASE_URL presente=${hasDatabaseUrl}, ` +
    `SUPABASE_DATABASE_URL presente=${hasSupabaseDatabaseUrl}. ` +
    "En Render, agregá DATABASE_URL (o SUPABASE_DATABASE_URL) en Environment " +
    "del Web Service sixseven y elegí Save, rebuild, and deploy. " +
    "No pegues la URI en logs ni en GitHub."
  );
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === "true" || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

pool.on("error", (error) => {
  console.error("Error inesperado en el pool de PostgreSQL:", error.message);
});

module.exports = pool;
