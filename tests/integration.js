const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

const port = Number(process.env.PORT) || 3101;
const baseUrl = `http://127.0.0.1:${port}`;
let child;
let cookie = "";

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`El servidor terminó antes de iniciar. Código: ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("El servidor no respondió dentro del tiempo de prueba.");
}

async function main() {
  child = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "inherit", "inherit"]
  });

  try {
    await waitForServer();

    const wrongLogin = await request("/api/auth/login", {
      method: "POST",
      body: { username: "ci-admin", password: "incorrecta" }
    });
    assert.equal(wrongLogin.response.status, 401, "Las credenciales incorrectas deben rechazarse.");

    const login = await request("/api/auth/login", {
      method: "POST",
      body: { username: "ci-admin", password: "ci-only-password-123" }
    });
    assert.equal(login.response.status, 200, "El administrador de prueba debe poder iniciar sesión.");
    const setCookie = login.response.headers.getSetCookie?.()[0] || login.response.headers.get("set-cookie") || "";
    cookie = setCookie.split(";")[0];
    assert.match(cookie, /^sixseven\.sid=/, "El servidor debe devolver una cookie de sesión.");

    const me = await request("/api/auth/me");
    assert.equal(me.response.status, 200);
    assert.equal(me.data.user.username, "ci-admin");

    const courseResponse = await request("/api/courses");
    assert.equal(courseResponse.response.status, 200);
    assert.ok(courseResponse.data.courses.length >= 9, "Deben existir los nueve cursos iniciales.");
    const course = courseResponse.data.courses[0];

    const studentPayload = {
      dni: "99000001",
      apellido: "Estudiante",
      nombre: "Prueba",
      id_curso: Number(course.id_curso)
    };
    const created = await request("/api/students", { method: "POST", body: studentPayload });
    assert.equal(created.response.status, 201, "Debe poder darse de alta un estudiante.");
    const studentId = Number(created.data.student.id_estudiante);

    const duplicateDni = await request("/api/students", { method: "POST", body: studentPayload });
    assert.equal(duplicateDni.response.status, 409, "El DNI duplicado debe rechazarse.");

    const date = new Date().toISOString().slice(0, 10);
    const jornada = course.turno || "Mañana";
    const query = new URLSearchParams({
      courseId: String(course.id_curso),
      date,
      jornada
    });
    const roster = await request(`/api/attendance?${query}`);
    assert.equal(roster.response.status, 200);
    assert.ok(roster.data.students.some((student) => Number(student.id_estudiante) === studentId));

    const attendancePayload = {
      courseId: Number(course.id_curso),
      date,
      jornada,
      records: [{ studentId, status: "P", observacion: "Prueba automática" }]
    };
    const saved = await request("/api/attendance/bulk", {
      method: "POST",
      body: attendancePayload
    });
    assert.equal(saved.response.status, 201, "La asistencia debe guardarse.");
    assert.equal(saved.data.saved, 1);

    const duplicateAttendance = await request("/api/attendance/bulk", {
      method: "POST",
      body: attendancePayload
    });
    assert.equal(duplicateAttendance.response.status, 409, "La asistencia duplicada debe rechazarse.");

    const historyQuery = new URLSearchParams({
      studentId: String(studentId),
      from: date,
      to: date
    });
    const history = await request(`/api/attendance/history?${historyQuery}`);
    assert.equal(history.response.status, 200);
    assert.equal(history.data.records.length, 1, "El historial debe conservar el registro.");

    const summary = await request(`/api/reports/summary?from=${date}&to=${date}`);
    assert.equal(summary.response.status, 200);
    assert.equal(Number(summary.data.totals.presentes), 1, "El informe debe contar el presente.");
    assert.equal(Number(summary.data.totals.porcentaje_asistencia), 100);

    const csv = await request(`/api/reports/export.csv?from=${date}&to=${date}`);
    assert.equal(csv.response.status, 200);
    assert.match(csv.response.headers.get("content-type") || "", /text\/csv/);
    assert.ok(String(csv.data).includes("99000001"), "El CSV debe incluir al estudiante de prueba.");

    const logout = await request("/api/auth/logout", { method: "POST" });
    assert.equal(logout.response.status, 200);
    const protectedAfterLogout = await request("/api/students");
    assert.equal(protectedAfterLogout.response.status, 401, "Las rutas privadas deben bloquear una sesión cerrada.");

    console.log("Integración correcta: login, cursos, estudiantes, DNI único, asistencia única, historial, informes, CSV y cierre de sesión.");
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
