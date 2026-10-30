const state = {
  user: null,
  courses: [],
  students: [],
  attendanceStudents: [],
  activeView: "overview"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayLocal() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}
function monthStart() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function courseLabel(course) {
  return `${course.anio}.º ${course.division} · ${course.turno}`;
}
function message(element, text, success = false) {
  element.textContent = text || "";
  element.classList.toggle("success-message", Boolean(success));
}
async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(url, { credentials: "same-origin", ...options, headers });
  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(data?.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
function showLogin() {
  $("#login-view").classList.remove("hidden");
  $("#dashboard-view").classList.add("hidden");
}
function showDashboard(user) {
  state.user = user;
  $("#login-view").classList.add("hidden");
  $("#dashboard-view").classList.remove("hidden");
  $("#current-user").textContent = user.username;
  $("#user-avatar");
  $("#attendance-date").value = todayLocal();
  $("#attendance-date-chip").textContent = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date());
  $("#report-from").value = monthStart();
  $("#report-to").value = todayLocal();
  $("#history-from").value = monthStart();
  $("#history-to").value = todayLocal();
  loadCourses().then(() => {
    loadStudents();
    loadReport();
  }).catch((error) => alert(error.message));
  navigate("overview");
}
function navigate(view) {
  state.activeView = view;
  $$(".page-view").forEach((section) => section.classList.toggle("hidden", section.id !== `view-${view}`));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const names = { overview: "Resumen", attendance: "Tomar asistencia", students: "Estudiantes", history: "Historial", courses: "Cursos" };
  $("#page-name").textContent = names[view] || "Resumen";
  if (view === "overview") loadReport();
  if (view === "students") loadStudents();
  if (view === "courses") renderCourses();
}

function fillCourseSelects() {
  const options = state.courses.map((course) =>
    `<option value="${course.id_curso}">${escapeHTML(courseLabel(course))}</option>`
  ).join("");
  ["#attendance-course", "#students-course", "#student-course", "#history-course"].forEach((selector) => {
    const select = $(selector);
    const previous = select.value;
    select.innerHTML = `<option value="">Todos los cursos</option>${options}`;
    if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
  });
  // Para formularios que requieren curso, seleccionar una opción real por defecto.
  ["#attendance-course", "#student-course"].forEach((selector) => {
    const select = $(selector);
    if (!select.value && state.courses.length) select.value = String(state.courses[0].id_curso);
  });
}
async function loadCourses() {
  const data = await api("/api/courses");
  state.courses = data.courses;
  fillCourseSelects();
  renderCourses();
}
function renderCourses() {
  $("#courses-total").textContent = `${state.courses.length} cursos`;
  $("#courses-list").innerHTML = state.courses.length ? state.courses.map((course) => `
    <div class="course-card">
      <span class="course-grade">${course.anio.toString().padStart(2, "0")}</span>
      <strong>${escapeHTML(course.anio)}.º año · División ${escapeHTML(course.division)}</strong>
      <small>${escapeHTML(course.turno)} · ${Number(course.total_estudiantes || 0)} estudiantes activos</small>
    </div>`).join("") : '<p class="empty-note">No hay cursos cargados.</p>';
}
async function loadStudents() {
  const courseId = $("#students-course").value;
  const search = $("#students-search").value.trim();
  const params = new URLSearchParams();
  if (courseId) params.set("courseId", courseId);
  if (search) params.set("search", search);
  const data = await api(`/api/students?${params}`);
  state.students = data.students;
  renderStudents();
  const activeCount = state.students.filter((student) => student.estado).length;
  $("#stat-students").textContent = activeCount;
}
function renderStudents() {
  const rows = state.students.map((student) => {
    const course = state.courses.find((item) => Number(item.id_curso) === Number(student.id_curso));
    return `<tr>
      <td>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</td>
      <td>${escapeHTML(student.dni)}</td>
      <td>${course ? escapeHTML(course.anio + ".º " + course.division) : "—"}</td>
      <td><span class="status-pill ${student.estado ? "active" : "inactive"}">${student.estado ? "Activo" : "Inactivo"}</span></td>
      <td><button class="table-action" data-edit-student="${student.id_estudiante}">Editar</button>${student.estado ? `<button class="table-action danger" data-deactivate-student="${student.id_estudiante}">Dar de baja</button>` : ""}</td>
    </tr>`;
  }).join("");
  $("#students-table").innerHTML = rows || '<tr><td colspan="5" class="empty-cell">No se encontraron estudiantes.</td></tr>';
}
function openStudentForm(student = null) {
  $("#student-form-panel").classList.remove("hidden");
  $("#student-form-title").textContent = student ? "Editar estudiante" : "Nuevo estudiante";
  $("#student-id").value = student?.id_estudiante || "";
  $("#student-dni").value = student?.dni || "";
  $("#student-lastname").value = student?.apellido || "";
  $("#student-firstname").value = student?.nombre || "";
  $("#student-course").value = student?.id_curso || state.courses[0]?.id_curso || "";
  $("#student-status").value = student ? String(student.estado) : "true";
  $("#student-dni").focus();
}
function closeStudentForm() {
  $("#student-form-panel").classList.add("hidden");
  $("#student-form").reset();
  $("#student-id").value = "";
}
async function loadAttendance() {
  const courseId = $("#attendance-course").value;
  const date = $("#attendance-date").value;
  const jornada = $("#attendance-shift").value;
  if (!courseId || !date) return message($("#attendance-message"), "Elegí un curso y una fecha.");
  const data = await api(`/api/attendance?courseId=${encodeURIComponent(courseId)}&date=${encodeURIComponent(date)}&jornada=${encodeURIComponent(jornada)}`);
  state.attendanceStudents = data.students;
  renderAttendance();
  const alreadyRegistered = state.attendanceStudents.some((student) => student.asistencia);
  message($("#attendance-message"), alreadyRegistered
    ? "Ya hay registros para esta fecha. No se pueden volver a guardar."
    : "Marcá el estado de cada estudiante y guardá el registro.", alreadyRegistered);
  $("#save-attendance").disabled = alreadyRegistered || !state.attendanceStudents.length;
}
function renderAttendance() {
  $("#attendance-count").textContent = `${state.attendanceStudents.length} estudiantes`;
  $("#attendance-table").innerHTML = state.attendanceStudents.length ? state.attendanceStudents.map((student) => `
    <tr data-student-row="${student.id_estudiante}">
      <td>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</td>
      <td>${escapeHTML(student.dni)}</td>
      <td><select class="status-select" data-status>
        <option value="P" ${student.asistencia === "P" ? "selected" : ""}>P · Presente</option>
        <option value="A" ${student.asistencia === "A" ? "selected" : ""}>A · Ausente</option>
        <option value="T" ${student.asistencia === "T" ? "selected" : ""}>T · Tardanza</option>
        <option value="AJ" ${student.asistencia === "AJ" ? "selected" : ""}>AJ · Ausente justificado</option>
      </select></td>
      <td><input class="observation-input" data-observation maxlength="255" placeholder="Opcional" value="${escapeHTML(student.observacion || "")}"></td>
    </tr>`).join("") : '<tr><td colspan="4" class="empty-cell">Este curso no tiene estudiantes activos.</td></tr>';
}
async function saveAttendance() {
  const rows = $$("#attendance-table [data-student-row]");
  if (!rows.length) return;
  const records = rows.map((row) => ({
    studentId: Number(row.dataset.studentRow),
    status: row.querySelector("[data-status]").value,
    observacion: row.querySelector("[data-observation]").value
  }));
  $("#save-attendance").disabled = true;
  try {
    const result = await api("/api/attendance/bulk", {
      method: "POST",
      body: JSON.stringify({
        courseId: Number($("#attendance-course").value),
        date: $("#attendance-date").value,
        jornada: $("#attendance-shift").value,
        records
      })
    });
    message($("#attendance-message"), `Se guardaron ${result.saved} registros correctamente.`, true);
    await loadAttendance();
    message($("#attendance-message"), `Se guardaron ${result.saved} registros correctamente. Esta fecha y jornada ya quedaron cerradas.`, true);
    loadReport();
  } catch (error) {
    message($("#attendance-message"), error.message);
    $("#save-attendance").disabled = false;
  }
}

async function loadReport() {
  const from = $("#report-from").value || monthStart();
  const to = $("#report-to").value || todayLocal();
  const data = await api(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const totals = data.totals;
  $("#stat-present").textContent = Number(totals.presentes) + Number(totals.tardanzas);
  $("#stat-absent").textContent = Number(totals.ausentes) + Number(totals.justificadas);
  $("#stat-percent").textContent = `${totals.porcentaje_asistencia}%`;
  $("#course-chart").innerHTML = data.courses.length ? data.courses.map((course) => `
    <div class="bar-row">
      <span class="bar-label">${escapeHTML(course.anio + ".º " + course.division)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, course.porcentaje_asistencia))}%"></div></div>
      <span class="bar-value">${course.porcentaje_asistencia}%</span>
    </div>`).join("") : '<p class="empty-note">Todavía no hay cursos registrados.</p>';
  $("#absence-list").innerHTML = data.topAbsences.length ? data.topAbsences.map((student) => `
    <div class="absence-item">
      <div><strong>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</strong><small>${escapeHTML(student.anio + ".º " + student.division)} · DNI ${escapeHTML(student.dni)}</small></div>
      <span class="absence-count">${student.ausencias} aus.</span>
    </div>`).join("") : '<p class="empty-note">Sin ausencias registradas para este período.</p>';
  $("#overview-export").href = `/api/reports/export.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}
async function loadHistory() {
  const params = new URLSearchParams();
  if ($("#history-course").value) params.set("courseId", $("#history-course").value);
  if ($("#history-from").value) params.set("from", $("#history-from").value);
  if ($("#history-to").value) params.set("to", $("#history-to").value);
  const data = await api(`/api/attendance/history?${params}`);
  const labels = { P: "Presente", A: "Ausente", T: "Tardanza", AJ: "Justificado" };
  $("#history-table").innerHTML = data.records.length ? data.records.map((record) => `
    <tr><td>${escapeHTML(String(record.fecha).slice(0, 10))}</td>
      <td>${escapeHTML(record.apellido + ", " + record.nombre)} <small>· ${escapeHTML(record.dni)}</small></td>
      <td>${escapeHTML(record.anio + ".º " + record.division)}</td>
      <td>${escapeHTML(record.jornada)}</td><td><span class="status-pill ${record.estado === "P" || record.estado === "T" ? "active" : "inactive"}">${record.estado} · ${labels[record.estado]}</span></td>
      <td>${escapeHTML(record.observacion || "—")}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-cell">No hay registros para ese período.</td></tr>';
  $("#history-count").textContent = `${data.records.length} registros (máximo 2.000 por consulta)`;
  $("#history-export").href = `/api/reports/export.csv?${params}`;
}
function attachEvents() {
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    message($("#login-error"), "");
    const button = event.submitter;
    button.disabled = true;
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: $("#login-username").value.trim(),
          password: $("#login-password").value
        })
      });
      $("#login-password").value = "";
      showDashboard(data.user);
    } catch (error) {
      message($("#login-error"), error.message);
    } finally { button.disabled = false; }
  });
  $("#logout-button").addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    state.user = null;
    showLogin();
  });
  $$(".nav-link").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $("#refresh-report").addEventListener("click", () => loadReport().catch((error) => alert(error.message)));
  $("#students-course").addEventListener("change", () => loadStudents().catch((error) => message($("#student-message"), error.message)));
  let searchTimeout;
  $("#students-search").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadStudents().catch((error) => message($("#student-message"), error.message)), 250);
  });
  $("#new-student-button").addEventListener("click", () => openStudentForm());
  $("#close-student-form").addEventListener("click", closeStudentForm);
  $("#cancel-student").addEventListener("click", closeStudentForm);
  $("#students-table").addEventListener("click", async (event) => {
    const editId = event.target.dataset.editStudent;
    const deactivateId = event.target.dataset.deactivateStudent;
    if (editId) {
      const student = state.students.find((item) => String(item.id_estudiante) === editId);
      if (student) openStudentForm(student);
    }
    if (deactivateId && confirm("¿Dar de baja a este estudiante? Su historial de asistencia se conservará.")) {
      try {
        await api(`/api/students/${deactivateId}`, { method: "DELETE" });
        await loadStudents();
      } catch (error) { message($("#student-message"), error.message); }
    }
  });
  $("#student-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = $("#student-id").value;
    const body = {
      dni: $("#student-dni").value.trim(),
      apellido: $("#student-lastname").value.trim(),
      nombre: $("#student-firstname").value.trim(),
      id_curso: Number($("#student-course").value),
      estado: $("#student-status").value === "true"
    };
    try {
      await api(id ? `/api/students/${id}` : "/api/students", {
        method: id ? "PUT" : "POST", body: JSON.stringify(body)
      });
      closeStudentForm();
      await loadStudents();
      await loadCourses();
      message($("#student-message"), "Estudiante guardado correctamente.", true);
    } catch (error) { message($("#student-message"), error.message); }
  });
  $("#load-attendance").addEventListener("click", () => loadAttendance().catch((error) => message($("#attendance-message"), error.message)));
  $("#attendance-course").addEventListener("change", () => {
    state.attendanceStudents = [];
    $("#attendance-table").innerHTML = '<tr><td colspan="4" class="empty-cell">Cargá la lista para continuar.</td></tr>';
    $("#save-attendance").disabled = true;
  });
  $("#attendance-date").addEventListener("change", () => {
    $("#attendance-date-chip").textContent = $("#attendance-date").value;
  });
  $("#attendance-shift").addEventListener("change", () => {
    $("#attendance-table").innerHTML = '<tr><td colspan="4" class="empty-cell">Cargá la lista para continuar.</td></tr>';
    $("#save-attendance").disabled = true;
  });
  $("#save-attendance").addEventListener("click", saveAttendance);
  $("#search-history").addEventListener("click", () => loadHistory().catch((error) => message($("#history-message"), error.message)));
  $("#course-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          anio: Number($("#course-year").value),
          division: $("#course-division").value.trim().toUpperCase(),
          turno: $("#course-shift").value
        })
      });
      $("#course-form").reset();
      message($("#course-message"), "Curso agregado correctamente.", true);
      await loadCourses();
    } catch (error) { message($("#course-message"), error.message); }
  });
}

async function boot() {
  attachEvents();
  try {
    const data = await api("/api/auth/me");
    showDashboard(data.user);
  } catch {
    showLogin();
  }
}

document.addEventListener("DOMContentLoaded", boot);
