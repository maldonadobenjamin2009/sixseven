require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const pool = require("../src/config/db");

async function main() {
  const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schema);

  for (let year = 1; year <= 3; year += 1) {
    for (const division of ["A", "B", "C"]) {
      await pool.query(
        "INSERT INTO cursos (anio, division, turno) VALUES ($1, $2, $3) ON CONFLICT (anio, division, turno) DO NOTHING",
        [year, division, "Mañana"]
      );
    }
  }

  console.log("Base de datos lista. Se verificaron las tablas y los cursos iniciales.");
}

main()
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
