const state = {
  user: null, session: null, supabase: null,
  courses: [], students: [], attendanceStudents: [],
  activeView: "overview", handlingSession: false
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
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function courseLabel(course) { return `${course.anio}.º ${course.division} · ${course.turno}`; }
function message(element, text, success = false) {
  element.textContent = text || "";
  element.classList.toggle("success-message", Boolean(success));
}
async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.session?.access_token) headers.Authorization = `Bearer ${state.session.access_token}`;
  const response = await fetch(url, { credentials: "same-origin", ...options, headers });
  const type = response.headers.get("content-type") || "";
  const data = type.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(data?.error || `Error HTTP ${response.status}`);
    error.status = response.status; error.code = data?.code; throw error;
  }
  return data;
}
function hideAllViews() {
  ["#login-view", "#pending-view", "#password-recovery-view", "#dashboard-view"].forEach((id) => $(id).classList.add("hidden"));
}
function showLogin(form = "login") {
  hideAllViews();
  $("#login-view").classList.remove("hidden");
  ["#login-form", "#register-form", "#forgot-form"].forEach((id) => $(id).classList.add("hidden"));
  $(form === "register" ? "#register-form" : form === "forgot" ? "#forgot-form" : "#login-form").classList.remove("hidden");
}
function showPending(error) {
  hideAllViews(); $("#pending-view").classList.remove("hidden");
  $("#pending-message").textContent = error.message || "Tu cuenta está pendiente de aprobación.";
}
function showPasswordRecovery() {
  hideAllViews(); $("#password-recovery-view").classList.remove("hidden");
}
async function loadAuthenticatedUser(session) {
  if (state.handlingSession) return;
  state.handlingSession = true;
  state.session = session;
  try {
    const data = await api("/api/auth/me");
    showDashboard(data.user);
  } catch (error) {
    if (error.code === "ACCOUNT_PENDING" || error.code === "PROFILE_MISSING") showPending(error);
    else { showLogin(); message($("#login-error"), error.message); }
  } finally { state.handlingSession = false; }
}
function showDashboard(user) {
  state.user = user; hideAllViews(); $("#dashboard-view").classList.remove("hidden");
  $("#current-user").textContent = user.username || user.email;
  $("#account-name").textContent = user.username || "Usuario";
  $("#account-email").textContent = user.email || "";
  $("#admin-users-nav").classList.toggle("hidden", user.role !== "administrador");
  $("#attendance-date").value = todayLocal();
  $("#attendance-date-chip").textContent = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date());
  $("#report-from").value = monthStart(); $("#report-to").value = todayLocal();
  $("#history-from").value = monthStart(); $("#history-to").value = todayLocal();
  loadCourses().then(async () => { await Promise.all([loadStudents(), loadHistoryStudentOptions()]); await loadReport(); })
    .catch((error) => alert(error.message));
  navigate("overview");
}
function navigate(view) {
  if (view === "admin-users" && state.user?.role !== "administrador") return;
  state.activeView = view;
  $$(".page-view").forEach((section) => section.classList.toggle("hidden", section.id !== `view-${view}`));
  $$(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const names = { overview: "Resumen", attendance: "Tomar asistencia", students: "Estudiantes", history: "Historial", courses: "Cursos", account: "Mi cuenta", "admin-users": "Cuentas de usuario" };
  $("#page-name").textContent = names[view] || "Resumen";
  if (view === "overview") loadReport();
  if (view === "students") loadStudents();
  if (view === "courses") renderCourses();
  if (view === "admin-users") loadAdminUsers();
}
function fillCourseSelects() {
  const options = state.courses.map((course) => `<option value="${course.id_curso}">${escapeHTML(courseLabel(course))}</option>`).join("");
  ["#attendance-course", "#students-course", "#student-course", "#history-course"].forEach((selector) => {
    const select = $(selector), previous = select.value;
    select.innerHTML = `<option value="">Todos los cursos</option>${options}`;
    if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
  });
  ["#attendance-course", "#student-course"].forEach((selector) => {
    const select = $(selector); if (!select.value && state.courses.length) select.value = String(state.courses[0].id_curso);
  });
}
function syncAttendanceShift() {
  const selected = state.courses.find((course) => String(course.id_curso) === $("#attendance-course").value);
  if (selected && [...$("#attendance-shift").options].some((option) => option.value === selected.turno)) $("#attendance-shift").value = selected.turno;
}
async function loadCourses() {
  const data = await api("/api/courses"); state.courses = data.courses;
  fillCourseSelects(); syncAttendanceShift();
  $("#stat-students").textContent = state.courses.reduce((sum, course) => sum + Number(course.total_estudiantes || 0), 0);
  renderCourses();
}
function renderCourses() {
  $("#courses-total").textContent = `${state.courses.length} cursos`;
  $("#courses-list").innerHTML = state.courses.length ? state.courses.map((course) => `
    <div class="course-card"><span class="course-grade">${course.anio.toString().padStart(2, "0")}</span>
    <strong>${escapeHTML(course.anio)}.º año · División ${escapeHTML(course.division)}</strong>
    <small>${escapeHTML(course.turno)} · ${Number(course.total_estudiantes || 0)} estudiantes activos</small></div>`).join("") : '<p class="empty-note">No hay cursos cargados.</p>';
}
async function loadStudents() {
  const params = new URLSearchParams();
  if ($("#students-course").value) params.set("courseId", $("#students-course").value);
  if ($("#students-search").value.trim()) params.set("search", $("#students-search").value.trim());
  const data = await api(`/api/students?${params}`); state.students = data.students; renderStudents();
}
function renderStudents() {
  const rows = state.students.map((student) => {
    const course = state.courses.find((item) => Number(item.id_curso) === Number(student.id_curso));
    return `<tr><td>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</td><td>${escapeHTML(student.dni)}</td>
      <td>${course ? escapeHTML(course.anio + ".º " + course.division) : "—"}</td>
      <td><span class="status-pill ${student.estado ? "active" : "inactive"}">${student.estado ? "Activo" : "Inactivo"}</span></td>
      <td><button class="table-action" data-edit-student="${student.id_estudiante}">Editar</button>${student.estado ? `<button class="table-action danger" data-deactivate-student="${student.id_estudiante}">Dar de baja</button>` : ""}</td></tr>`;
  }).join("");
  $("#students-table").innerHTML = rows || '<tr><td colspan="5" class="empty-cell">No se encontraron estudiantes.</td></tr>';
}
function openStudentForm(student = null) {
  $("#student-form-panel").classList.remove("hidden"); $("#student-form-title").textContent = student ? "Editar estudiante" : "Nuevo estudiante";
  $("#student-id").value = student?.id_estudiante || ""; $("#student-dni").value = student?.dni || "";
  $("#student-lastname").value = student?.apellido || ""; $("#student-firstname").value = student?.nombre || "";
  $("#student-course").value = student?.id_curso || state.courses[0]?.id_curso || "";
  $("#student-status").value = student ? String(student.estado) : "true"; $("#student-dni").focus();
}
function closeStudentForm() { $("#student-form-panel").classList.add("hidden"); $("#student-form").reset(); $("#student-id").value = ""; }
async function loadAttendance() {
  const courseId = $("#attendance-course").value, date = $("#attendance-date").value, jornada = $("#attendance-shift").value;
  if (!courseId || !date) return message($("#attendance-message"), "Elegí un curso y una fecha.");
  const data = await api(`/api/attendance?courseId=${encodeURIComponent(courseId)}&date=${encodeURIComponent(date)}&jornada=${encodeURIComponent(jornada)}`);
  state.attendanceStudents = data.students; renderAttendance();
  const registered = state.attendanceStudents.filter((student) => student.asistencia).length;
  const pending = state.attendanceStudents.length - registered;
  message($("#attendance-message"), registered && pending ? `Ya existen ${registered} registros; podés completar los ${pending} pendientes.`
    : registered ? "La asistencia de este curso, fecha y jornada ya está completa." : "Marcá el estado de cada estudiante y guardá el registro.", registered > 0);
  $("#save-attendance").disabled = pending === 0;
}
function renderAttendance() {
  $("#attendance-count").textContent = `${state.attendanceStudents.length} estudiantes`;
  $("#attendance-table").innerHTML = state.attendanceStudents.length ? state.attendanceStudents.map((student) => `
    <tr data-student-row="${student.id_estudiante}" data-recorded="${student.asistencia ? "true" : "false"}">
      <td>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</td><td>${escapeHTML(student.dni)}</td>
      <td><select class="status-select" data-status ${student.asistencia ? "disabled" : ""}>
        <option value="P" ${student.asistencia === "P" ? "selected" : ""}>P · Presente</option>
        <option value="A" ${student.asistencia === "A" ? "selected" : ""}>A · Ausente</option>
        <option value="T" ${student.asistencia === "T" ? "selected" : ""}>T · Tardanza</option>
        <option value="AJ" ${student.asistencia === "AJ" ? "selected" : ""}>AJ · Ausente justificado</option>
      </select></td><td><input class="observation-input" data-observation maxlength="255" placeholder="Opcional" ${student.asistencia ? "disabled" : ""} value="${escapeHTML(student.observacion || "")}"></td></tr>`).join("")
    : '<tr><td colspan="4" class="empty-cell">Este curso no tiene estudiantes activos.</td></tr>';
}
async function saveAttendance() {
  const rows = Array.from(document.querySelectorAll("#attendance-table [data-student-row]")).filter((row) => row.dataset.recorded !== "true");
  if (!rows.length) return;
  const records = rows.map((row) => ({ studentId: Number(row.dataset.studentRow), status: row.querySelector("[data-status]").value,
    observacion: row.querySelector("[data-observation]").value }));
  $("#save-attendance").disabled = true;
  try {
    const result = await api("/api/attendance/bulk", { method: "POST", body: JSON.stringify({
      courseId: Number($("#attendance-course").value), date: $("#attendance-date").value, jornada: $("#attendance-shift").value, records
    })});
    await loadAttendance(); message($("#attendance-message"), `Se guardaron ${result.saved} registros correctamente.`, true); loadReport();
  } catch (error) { message($("#attendance-message"), error.message); $("#save-attendance").disabled = false; }
}
async function loadReport() {
  const from = $("#report-from").value || monthStart(), to = $("#report-to").value || todayLocal();
  const data = await api(`/api/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const totals = data.totals;
  $("#stat-present").textContent = Number(totals.presentes) + Number(totals.tardanzas);
  $("#stat-absent").textContent = Number(totals.ausentes) + Number(totals.justificadas);
  $("#stat-percent").textContent = `${totals.porcentaje_asistencia}%`;
  $("#course-chart").innerHTML = data.courses.length ? data.courses.map((course) => `
    <div class="bar-row"><span class="bar-label">${escapeHTML(course.anio + ".º " + course.division)}</span>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.max(0, Math.min(100, course.porcentaje_asistencia))}%"></div></div>
    <span class="bar-value">${course.porcentaje_asistencia}%</span></div>`).join("") : '<p class="empty-note">Todavía no hay cursos registrados.</p>';
  $("#absence-list").innerHTML = data.topAbsences.length ? data.topAbsences.map((student) => `
    <div class="absence-item"><div><strong>${escapeHTML(student.apellido)}, ${escapeHTML(student.nombre)}</strong>
    <small>${escapeHTML(student.anio + ".º " + student.division)} · DNI ${escapeHTML(student.dni)}</small></div>
    <span class="absence-count">${student.ausencias} aus.</span></div>`).join("") : '<p class="empty-note">Sin ausencias registradas para este período.</p>';
  $("#overview-export").href = `/api/reports/export.csv?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
}
async function loadHistoryStudentOptions() {
  const data = await api("/api/students"), select = $("#history-student"), previous = select.value;
  select.innerHTML = '<option value="">Todos</option>' + data.students.map((student) =>
    `<option value="${student.id_estudiante}">${escapeHTML(student.apellido + ", " + student.nombre + " · " + student.dni)}</option>`).join("");
  if (previous && [...select.options].some((option) => option.value === previous)) select.value = previous;
}
async function loadHistory() {
  const params = new URLSearchParams();
  if ($("#history-course").value) params.set("courseId", $("#history-course").value);
  if ($("#history-student").value) params.set("studentId", $("#history-student").value);
  if ($("#history-from").value) params.set("from", $("#history-from").value);
  if ($("#history-to").value) params.set("to", $("#history-to").value);
  const data = await api(`/api/attendance/history?${params}`), labels = { P: "Presente", A: "Ausente", T: "Tardanza", AJ: "Justificado" };
  $("#history-table").innerHTML = data.records.length ? data.records.map((record) => `
    <tr><td>${escapeHTML(String(record.fecha).slice(0, 10))}</td><td>${escapeHTML(record.apellido + ", " + record.nombre)} <small>· ${escapeHTML(record.dni)}</small></td>
    <td>${escapeHTML(record.anio + ".º " + record.division)}</td><td>${escapeHTML(record.jornada)}</td>
    <td><span class="status-pill ${record.estado === "P" || record.estado === "T" ? "active" : "inactive"}">${record.estado} · ${labels[record.estado]}</span></td>
    <td>${escapeHTML(record.observacion || "—")}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-cell">No hay registros para ese período.</td></tr>';
  $("#history-count").textContent = `${data.records.length} registros (máximo 2.000 por consulta)`;
  $("#history-export").href = `/api/reports/export.csv?${params}`;
}
async function loadAdminUsers() {
  const data = await api("/api/auth/users");
  $("#admin-users-table").innerHTML = data.users.map((user) => `
    <tr data-admin-user="${user.id_usuario}" data-current-active="${user.activo}">
      <td>${escapeHTML(user.nombre_completo || user.nombre_usuario)}</td><td>${escapeHTML(user.email || "—")}</td>
      <td><select class="user-role-select" data-role><option value="docente" ${user.rol === "docente" ? "selected" : ""}>Docente</option>
      <option value="administrador" ${user.rol === "administrador" ? "selected" : ""}>Administrador</option></select></td>
      <td><span class="status-pill ${user.activo ? "active" : "inactive"}">${user.activo ? "Activo" : "Pendiente"}</span></td>
      <td><button class="table-action" data-save-user>${user.activo ? "Desactivar" : "Aprobar cuenta"}</button></td></tr>`).join("")
    || '<tr><td colspan="5" class="empty-cell">No hay cuentas registradas.</td></tr>';
}
async function saveAdminUser(row) {
  const id = row.dataset.adminUser;
  const role = row.querySelector("[data-role]").value;
  const active = row.dataset.currentActive !== "true";
  await api(`/api/auth/users/${id}`, { method: "PATCH", body: JSON.stringify({ role, active }) });
  await loadAdminUsers(); message($("#admin-users-message"), "Cuenta actualizada correctamente.", true);
}
function setAuthNotice(text) { $("#auth-notice").textContent = text; }
async function signInWithGoogle() {
  const { error } = await state.supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  if (error) message($("#login-error"), error.message);
}

function attachEvents() {
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault(); message($("#login-error"), "");
    const button = event.submitter; button.disabled = true;
    const { error } = await state.supabase.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value });
    if (error) message($("#login-error"), error.message);
    button.disabled = false;
  });
  $("#register-form").addEventListener("submit", async (event) => {
    event.preventDefault(); message($("#register-error"), "");
    const password = $("#register-password").value;
    if (password !== $("#register-password-confirm").value) return message($("#register-error"), "Las contraseñas no coinciden.");
    if (password.length < 10) return message($("#register-error"), "La contraseña debe tener al menos 10 caracteres.");
    const button = event.submitter; button.disabled = true;
    try {
      const { data, error } = await state.supabase.auth.signUp({
        email: $("#register-email").value.trim().toLowerCase(), password,
        options: { data: { full_name: $("#register-name").value.trim() }, emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      $("#register-form").reset();
      setAuthNotice(data.session
        ? "Cuenta creada. Un administrador debe aprobar tu acceso."
        : "Cuenta creada. Revisá tu correo para confirmar la dirección. Luego un administrador aprobará tu acceso.");
      showLogin();
    } catch (error) { message($("#register-error"), error.message); }
    finally { button.disabled = false; }
  });
  $("#forgot-form").addEventListener("submit", async (event) => {
    event.preventDefault(); message($("#forgot-error"), "");
    const { error } = await state.supabase.auth.resetPasswordForEmail($("#forgot-email").value.trim(), {
      redirectTo: `${window.location.origin}/?mode=recovery`
    });
    if (error) message($("#forgot-error"), error.message);
    else setAuthNotice("Si la dirección está registrada, recibirás un correo con el enlace de recuperación.");
  });
  $("#google-login-button").addEventListener("click", signInWithGoogle);
  $("#google-register-button").addEventListener("click", signInWithGoogle);
  $("#show-register").addEventListener("click", () => showLogin("register"));
  $("#show-login").addEventListener("click", () => showLogin("login"));
  $("#show-forgot").addEventListener("click", () => showLogin("forgot"));
  $("#forgot-back").addEventListener("click", () => showLogin("login"));

  $("#password-recovery-form").addEventListener("submit", async (event) => {
    event.preventDefault(); message($("#recovery-error"), "");
    const password = $("#recovery-password").value;
    if (password.length < 10 || password !== $("#recovery-password-confirm").value)
      return message($("#recovery-error"), "Ingresá la misma contraseña en ambos campos (mínimo 10 caracteres).");
    const { error } = await state.supabase.auth.updateUser({ password });
    if (error) return message($("#recovery-error"), error.message);
    window.history.replaceState({}, document.title, window.location.pathname);
    const { data } = await state.supabase.auth.getSession();
    if (data.session) await loadAuthenticatedUser(data.session); else showLogin();
  });
  $("#account-password-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#account-password").value;
    if (password.length < 10 || password !== $("#account-password-confirm").value)
      return message($("#account-message"), "Ingresá la misma contraseña en ambos campos (mínimo 10 caracteres).");
    const { error } = await state.supabase.auth.updateUser({ password });
    if (error) message($("#account-message"), error.message);
    else { $("#account-password-form").reset(); message($("#account-message"), "Contraseña actualizada correctamente.", true); }
  });
  $("#logout-button").addEventListener("click", async () => state.supabase.auth.signOut());
  $("#pending-logout-button").addEventListener("click", async () => state.supabase.auth.signOut());
  $("#retry-account-button").addEventListener("click", async () => {
    const { data } = await state.supabase.auth.getSession();
    if (data.session) await loadAuthenticatedUser(data.session);
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
    const editId = event.target.dataset.editStudent, deactivateId = event.target.dataset.deactivateStudent;
    if (editId) { const student = state.students.find((item) => String(item.id_estudiante) === editId); if (student) openStudentForm(student); }
    if (deactivateId && confirm("¿Dar de baja a este estudiante? Su historial se conservará.")) {
      try { await api(`/api/students/${deactivateId}`, { method: "DELETE" }); await loadStudents(); }
      catch (error) { message($("#student-message"), error.message); }
    }
  });
  $("#student-form").addEventListener("submit", async (event) => {
    event.preventDefault(); const id = $("#student-id").value;
    const body = { dni: $("#student-dni").value.trim(), apellido: $("#student-lastname").value.trim(),
      nombre: $("#student-firstname").value.trim(), id_curso: Number($("#student-course").value), estado: $("#student-status").value === "true" };
    try {
      await api(id ? `/api/students/${id}` : "/api/students", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
      closeStudentForm(); await loadStudents(); await loadCourses(); message($("#student-message"), "Estudiante guardado correctamente.", true);
    } catch (error) { message($("#student-message"), error.message); }
  });
  $("#load-attendance").addEventListener("click", () => loadAttendance().catch((error) => message($("#attendance-message"), error.message)));
  $("#attendance-course").addEventListener("change", () => {
    syncAttendanceShift(); state.attendanceStudents = [];
    $("#attendance-table").innerHTML = '<tr><td colspan="4" class="empty-cell">Cargá la lista para continuar.</td></tr>'; $("#save-attendance").disabled = true;
  });
  $("#attendance-date").addEventListener("change", () => { $("#attendance-date-chip").textContent = $("#attendance-date").value; });
  $("#attendance-shift").addEventListener("change", () => {
    $("#attendance-table").innerHTML = '<tr><td colspan="4" class="empty-cell">Cargá la lista para continuar.</td></tr>'; $("#save-attendance").disabled = true;
  });
  $("#save-attendance").addEventListener("click", saveAttendance);
  $("#search-history").addEventListener("click", () => loadHistory().catch((error) => message($("#history-message"), error.message)));
  $("#course-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/courses", { method: "POST", body: JSON.stringify({
        anio: Number($("#course-year").value), division: $("#course-division").value.trim().toUpperCase(), turno: $("#course-shift").value
      })});
      $("#course-form").reset(); message($("#course-message"), "Curso agregado correctamente.", true); await loadCourses();
    } catch (error) { message($("#course-message"), error.message); }
  });
  $("#admin-users-table").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-save-user]");
    if (!button) return;
    const row = button.closest("[data-admin-user]");
    try { await saveAdminUser(row); } catch (error) { message($("#admin-users-message"), error.message); }
  });
}

async function boot() {
  attachEvents();
  const mode = new URL(window.location.href).searchParams.get("mode");
  try {
    const config = await api("/api/auth/config");
    if (!window.supabase?.createClient) throw new Error("No se pudo cargar el cliente de Supabase.");
    state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    state.supabase.auth.onAuthStateChange((event, session) => {
      state.session = session;
      if (event === "PASSWORD_RECOVERY" || (mode === "recovery" && session)) showPasswordRecovery();
      else if (session) Promise.resolve().then(() => loadAuthenticatedUser(session));
      else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") showLogin();
    });
    const { data, error } = await state.supabase.auth.getSession();
    if (error) throw error;
    if (mode === "recovery" && data.session) showPasswordRecovery();
    else if (data.session) await loadAuthenticatedUser(data.session);
    else showLogin();
  } catch (error) { showLogin(); message($("#login-error"), error.message); }
}
document.addEventListener("DOMContentLoaded", boot);
