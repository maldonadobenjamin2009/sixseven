const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const pool = require("../src/config/db");

async function main() {
  const root = path.join(__dirname, "..");
  const schema = fs.readFileSync(path.join(root, "database", "schema.sql"), "utf8");
  await pool.query(schema);

  for (let year = 1; year <= 3; year += 1) {
    for (const division of ["A", "B", "C"]) {
      await pool.query(
        "INSERT INTO cursos (anio, division, turno) VALUES ($1, $2, $3) ON CONFLICT (anio, division, turno) DO NOTHING",
        [year, division, "Mañana"]
      );
    }
  }

  if (process.env.SUPABASE_URL) {
    const authSchema = fs.readFileSync(path.join(root, "database", "supabase-auth.sql"), "utf8");
    await pool.query(authSchema);
    console.log("Supabase Auth: perfiles, trigger y RLS verificados.");
  } else {
    console.log("SUPABASE_URL no definido: se omitió la migración específica de Supabase Auth.");
  }
  console.log("Base de datos lista.");
}

main()
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
