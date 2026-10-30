const path = require("node:path");
const dotenv = require("dotenv");

// Carga siempre el .env situado junto a package.json, no según la carpeta
// desde la que se haya ejecutado el comando. Las variables del sistema tienen prioridad.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Falta DATABASE_URL. En Windows, copiá .env.example como .env en la carpeta del proyecto y completá la URI PostgreSQL de Supabase. En Render, agregá DATABASE_URL en Environment."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
