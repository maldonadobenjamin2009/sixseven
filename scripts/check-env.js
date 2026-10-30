const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "..", ".env");
const result = dotenv.config({ path: envPath });

if (result.error && result.error.code !== "ENOENT") {
  console.error("No se pudo leer .env:", result.error.message);
  process.exitCode = 1;
} else {
  console.log(`.env encontrado: ${!result.error ? "sí" : "no"}`);
  console.log(`DATABASE_URL configurada: ${Boolean(process.env.DATABASE_URL) ? "sí" : "NO"}`);
  console.log(`DB_SSL: ${process.env.DB_SSL || "(sin definir)"}`);
  console.log(`SESSION_SECRET configurado: ${Boolean(process.env.SESSION_SECRET) ? "sí" : "no"}`);
  if (!process.env.DATABASE_URL) {
    console.log("Acción: copiá .env.example a .env y reemplazá DATABASE_URL por la URI real de PostgreSQL.");
    process.exitCode = 1;
  }
}
