const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const pool = require("../src/config/db");

const port = Number(process.env.PORT) || 3101;
const baseUrl = `http://127.0.0.1:${port}`;
const testUserId = "00000000-0000-4000-8000-000000000001";
let child;

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: "Bearer test-token" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    ...options, headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data };
}
async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`El servidor terminó. Código: ${child.exitCode}`);
    try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("El servidor no respondió dentro del tiempo de prueba.");
}
async function main() {
  await pool.query(
    `INSERT INTO usuarios (nombre_usuario, password_hash, rol, activo, auth_user_id, email, nombre_completo)
     VALUES ('ci-admin', NULL, 'administrador', TRUE, $1, 'ci-admin@example.test', 'Admin CI')`,
    [testUserId]
  );
  await pool.end();

  child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "inherit", "inherit"]
  });

  try {
    await waitForServer();
    const missingAuth = await fetch(`${baseUrl}/api/courses`);
    assert.equal(missingAuth.status, 401, "Las rutas privadas deben exigir token.");

    const me = await request("/api/auth/me");
    assert.equal(me.response.status, 200);
    assert.equal(me.data.user.role, "administrador");

    const users = await request("/api/auth/users");
    assert.equal(users.response.status, 200);
    assert.ok(users.data.users.some((user) => user.email === "ci-admin@example.test"));

    const courseResponse = await request("/api/courses");
    assert.equal(courseResponse.response.status, 200);
    assert.ok(courseResponse.data.courses.length >= 9);
    const course = courseResponse.data.courses[0];

    const studentPayload = { dni: "99000001", apellido: "Estudiante", nombre: "Prueba", id_curso: Number(course.id_curso) };
    const created = await request("/api/students", { method: "POST", body: studentPayload });
    assert.equal(created.response.status, 201);
    const studentId = Number(created.data.student.id_estudiante);

    const duplicateDni = await request("/api/students", { method: "POST", body: studentPayload });
    assert.equal(duplicateDni.response.status, 409);

    const date = new Date().toISOString().slice(0, 10);
    const jornada = course.turno || "Mañana";
    const query = new URLSearchParams({ courseId: String(course.id_curso), date, jornada });
    const roster = await request(`/api/attendance?${query}`);
    assert.equal(roster.response.status, 200);
    assert.ok(roster.data.students.some((student) => Number(student.id_estudiante) === studentId));

    const attendancePayload = {
      courseId: Number(course.id_curso), date, jornada,
      records: [{ studentId, status: "P", observacion: "Prueba automática" }]
    };
    const saved = await request("/api/attendance/bulk", { method: "POST", body: attendancePayload });
    assert.equal(saved.response.status, 201);
    const duplicateAttendance = await request("/api/attendance/bulk", { method: "POST", body: attendancePayload });
    assert.equal(duplicateAttendance.response.status, 409);

    const history = await request(`/api/attendance/history?${new URLSearchParams({ studentId: String(studentId), from: date, to: date })}`);
    assert.equal(history.response.status, 200);
    assert.equal(history.data.records.length, 1);

    const summary = await request(`/api/reports/summary?from=${date}&to=${date}`);
    assert.equal(summary.response.status, 200);
    assert.equal(Number(summary.data.totals.presentes), 1);
    assert.equal(Number(summary.data.totals.porcentaje_asistencia), 100);

    const csv = await request(`/api/reports/export.csv?from=${date}&to=${date}`);
    assert.equal(csv.response.status, 200);
    assert.match(csv.response.headers.get("content-type") || "", /text\/csv/);
    assert.ok(String(csv.data).includes("99000001"));

    console.log("Integración correcta: token y perfil Supabase, administración de cuentas, cursos, estudiantes, DNI único, asistencia única, historial e informes.");
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        child.once("exit", () => { clearTimeout(timer); resolve(); });
      });
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
