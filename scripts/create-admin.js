require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

async function main() {
  const username = (process.env.ADMIN_USER || "").trim();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!username || !password) {
    throw new Error("Definí ADMIN_USER y ADMIN_PASSWORD en el entorno antes de ejecutar npm run admin:create.");
  }
  if (username.length > 50 || password.length < 10) {
    throw new Error("El usuario admite hasta 50 caracteres y la contraseña debe tener al menos 10.");
  }

  const existing = await pool.query(
    "SELECT id_usuario FROM usuarios WHERE nombre_usuario = $1",
    [username]
  );
  if (existing.rowCount) {
    throw new Error("Ese nombre de usuario ya existe. No se modificó la cuenta.");
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO usuarios (nombre_usuario, password_hash, rol) VALUES ($1, $2, 'administrador')",
    [username, hash]
  );
  console.log("Usuario administrador creado correctamente. Quitá ADMIN_USER y ADMIN_PASSWORD del entorno cuando termines.");
}

main()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
