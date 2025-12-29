// script.js
// Gestión de aperturas, estado actual de caja seleccionada y sesiones de caja.

let state = {
  currentUser: null,
  currentBranch: null,
  branches: [],
  registers: [],
  sessionStatuses: [],
  sessions: [],
  cashMovements: [],
  pettyCashExpenses: [],
  pettyCashReplenishments: []
};

const dom = {};

/* Utilidades */
function parseISO(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(dateStr) {
  const d = parseISO(dateStr);
  if (!d) return "-";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function formatDateOnly(dateStr) {
  const d = parseISO(dateStr);
  if (!d) return "-";
  return d.toLocaleDateString();
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0
  });
}

function getStatusMeta(code) {
  return (
    state.sessionStatuses.find((s) => s.code === code) || {
      code,
      label: code,
      badgeClass: ""
    }
  );
}

/* Carga inicial */
async function loadData() {
  const res = await fetch("data.json");
  if (!res.ok) {
    throw new Error("No se pudo cargar data.json");
  }
  const data = await res.json();
  state = data;
}

function cacheDom() {
  // Header
  dom.currentUserName = document.getElementById("currentUserName");

  // KPI
  dom.kpiSessionsOpenToday = document.getElementById("kpiSessionsOpenToday");
  dom.kpiSessionsClosedYear = document.getElementById("kpiSessionsClosedYear");
  dom.kpiDiffYear = document.getElementById("kpiDiffYear");

  // Estado actual
  dom.statusBranchLabel = document.getElementById("statusBranchLabel");
  dom.statusUserLabel = document.getElementById("statusUserLabel");
  dom.statusRegisterSelect = document.getElementById("statusRegisterSelect");
  dom.statusRegisterInfo = document.getElementById("statusRegisterInfo");
  dom.statusSummaryContainer = document.getElementById("statusSummaryContainer");
  dom.openOpeningModalFromStateBtn = document.getElementById(
    "openOpeningModalFromStateBtn"
  );

  // Filtros / tabla
  dom.filterDateFrom = document.getElementById("filterDateFrom");
  dom.filterDateTo = document.getElementById("filterDateTo");
  dom.filterBranchSelect = document.getElementById("filterBranchSelect");
  dom.filterRegisterSelect = document.getElementById("filterRegisterSelect");
  dom.applyFiltersBtn = document.getElementById("applyFiltersBtn");
  dom.clearFiltersBtn = document.getElementById("clearFiltersBtn");
  dom.sessionsTableBody = document.getElementById("sessionsTableBody");
  dom.sessionsEmptyState = document.getElementById("sessionsEmptyState");

  // Modal apertura
  dom.openingModal = document.getElementById("openingModal");
  dom.openingModalForm = document.getElementById("openingModalForm");
  dom.openingAlert = document.getElementById("openingAlert");
  dom.openingBranchLabel = document.getElementById("openingBranchLabel");
  dom.openingUserLabel = document.getElementById("openingUserLabel");
  dom.openingRegisterSelect = document.getElementById("openingRegisterSelect");
  dom.openingRegisterInfo = document.getElementById("openingRegisterInfo");
  dom.openingAmount = document.getElementById("openingAmount");
  dom.openingNotes = document.getElementById("openingNotes");

  // Modal detalle
  dom.sessionDetailModal = document.getElementById("sessionDetailModal");
  dom.sessionDetailTitle = document.getElementById("sessionDetailTitle");
  dom.sessionDetailSubtitle = document.getElementById("sessionDetailSubtitle");
  dom.sessionIdentityInfo = document.getElementById("sessionIdentityInfo");
  dom.sessionOpeningInfo = document.getElementById("sessionOpeningInfo");
  dom.sessionSummaryCards = document.getElementById("sessionSummaryCards");
  dom.sessionSummaryNotes = document.getElementById("sessionSummaryNotes");
  dom.cashMovementsTableBody = document.getElementById("cashMovementsTableBody");
  dom.pettyCashTableBody = document.getElementById("pettyCashTableBody");

  // Tabs detalle
  dom.sessionDetailTabs = document.getElementById("sessionDetailTabs");
}

function initUserInfo() {
  if (state.currentUser) {
    dom.currentUserName.textContent = `Usuario: ${state.currentUser.full_name} (${state.currentUser.username})`;
  }
}

/* KPI simples de ejemplo */
function initKpis() {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);

  let openToday = 0;
  let closedYear = 0;
  let diffYear = 0;

  state.sessions.forEach((s) => {
    const openDate = parseISO(s.opening_datetime);
    if (!openDate) return;

    // abiertas hoy
    if (
      s.status_code === "OPEN" &&
      openDate.toDateString() === today.toDateString()
    ) {
      openToday += 1;
    }

    // año en curso
    if (openDate >= yearStart && openDate <= today) {
      if (s.status_code === "CLOSED" || s.status_code === "RECONCILED") {
        closedYear += 1;
      }
      if (typeof s.difference_amount === "number") {
        diffYear += s.difference_amount;
      }
    }
  });

  dom.kpiSessionsOpenToday.textContent = String(openToday);
  dom.kpiSessionsClosedYear.textContent = String(closedYear);
  dom.kpiDiffYear.textContent = formatCurrency(diffYear);
}

/* Selects filtros */
function initFilterBranchSelect() {
  state.branches.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = String(b.id);
    opt.textContent = `${b.branch_code} · ${b.branch_name}`;
    dom.filterBranchSelect.appendChild(opt);
  });
}

function refreshFilterRegisterSelect(branchId) {
  dom.filterRegisterSelect.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Todas las cajas";
  dom.filterRegisterSelect.appendChild(optAll);

  const registers = state.registers.filter((r) => {
    if (!r.authorized_for_current_user) return false;
    if (branchId) return r.branch_id === branchId;
    return true;
  });

  registers.forEach((reg) => {
    const opt = document.createElement("option");
    opt.value = String(reg.id);
    opt.textContent = `${reg.register_code} · ${reg.register_name}`;
    dom.filterRegisterSelect.appendChild(opt);
  });
}

/* Estado actual: sucursal y cajas disponibles */
function initStatusSection() {
  if (state.currentBranch) {
    dom.statusBranchLabel.textContent = `${state.currentBranch.branch_code} · ${state.currentBranch.branch_name}`;
  } else {
    dom.statusBranchLabel.textContent = "No asignada";
  }

  if (state.currentUser) {
    dom.statusUserLabel.textContent = `${state.currentUser.full_name} (${state.currentUser.username})`;
  } else {
    dom.statusUserLabel.textContent = "-";
  }

  // Cajas autorizadas en la sucursal actual
  dom.statusRegisterSelect.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Seleccione una caja...";
  dom.statusRegisterSelect.appendChild(defaultOpt);

  const allowedRegisters = state.registers.filter((r) => {
    if (!r.authorized_for_current_user) return false;
    if (!state.currentBranch) return true;
    return r.branch_id === state.currentBranch.id;
  });

  allowedRegisters.forEach((reg) => {
    const o = document.createElement("option");
    o.value = String(reg.id);
    o.textContent = `${reg.register_code} · ${reg.register_name}`;
    dom.statusRegisterSelect.appendChild(o);
  });

  if (allowedRegisters.length === 0) {
    dom.statusRegisterInfo.textContent =
      "No se encontraron cajas autorizadas para esta sucursal. Contacte a su supervisor.";
    dom.openOpeningModalFromStateBtn.disabled = true;
  } else {
    dom.statusRegisterInfo.textContent = "Seleccione una caja para ver su estado.";
  }

  dom.statusSummaryContainer.innerHTML =
    "<div class=\"status-summary-title\">Sin caja seleccionada</div><div>No se ha seleccionado una caja. Elija una caja para ver su estado actual.</div>";
}

/* Modal de apertura: contexto y cajas autorizadas */
function initOpeningModalContext() {
  if (state.currentBranch) {
    dom.openingBranchLabel.textContent = `${state.currentBranch.branch_code} · ${state.currentBranch.branch_name}`;
  } else {
    dom.openingBranchLabel.textContent = "No asignada";
  }

  if (state.currentUser) {
    dom.openingUserLabel.textContent = `${state.currentUser.full_name} (${state.currentUser.username})`;
  } else {
    dom.openingUserLabel.textContent = "-";
  }

  dom.openingRegisterSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = "Seleccione una caja...";
  dom.openingRegisterSelect.appendChild(opt);

  const allowedRegisters = state.registers.filter((r) => {
    if (!r.authorized_for_current_user) return false;
    if (!state.currentBranch) return true;
    return r.branch_id === state.currentBranch.id;
  });

  allowedRegisters.forEach((reg) => {
    const o = document.createElement("option");
    o.value = String(reg.id);
    o.textContent = `${reg.register_code} · ${reg.register_name}`;
    dom.openingRegisterSelect.appendChild(o);
  });

  if (allowedRegisters.length === 0) {
    dom.openingRegisterInfo.textContent =
      "No se encontraron cajas autorizadas para esta sucursal. Contacte a su supervisor.";
  } else {
    dom.openingRegisterInfo.textContent = "";
  }
}

/* Alertas (apertura) */
function resetOpeningAlert() {
  const el = dom.openingAlert;
  el.className = "alert";
  el.textContent = "";
}

function showOpeningAlert(message, type = "info") {
  const el = dom.openingAlert;
  el.className = "alert show";
  if (type === "success") {
    el.classList.add("alert-success");
  } else if (type === "error") {
    el.classList.add("alert-error");
  } else {
    el.classList.add("alert-info");
  }
  el.textContent = message;
}

/* Regla de una sola sesión abierta por caja y usuario */
function hasOpenSessionForRegister(registerId) {
  if (!state.currentUser) return false;
  return state.sessions.some(
    (s) =>
      s.cash_register_id === registerId &&
      s.cashier_user_id === state.currentUser.id &&
      s.status_code === "OPEN"
  );
}

/* Estado actual - resumen para caja seleccionada */
function renderSelectedRegisterStatus() {
  const registerId = Number(dom.statusRegisterSelect.value || "0");
  dom.statusSummaryContainer.innerHTML = "";
  dom.openOpeningModalFromStateBtn.disabled = true;
  dom.statusRegisterInfo.textContent = "";

  if (!registerId) {
    dom.statusSummaryContainer.innerHTML =
      "<div class=\"status-summary-title\">Sin caja seleccionada</div><div>Seleccione una caja para ver su estado actual.</div>";
    return;
  }

  const register = state.registers.find((r) => r.id === registerId);
  if (!register) {
    dom.statusSummaryContainer.innerHTML =
      "<div class=\"status-summary-title\">Caja no encontrada</div><div>No se pudo recuperar la información de la caja seleccionada.</div>";
    return;
  }

  const userId = state.currentUser?.id;
  const sessionsForRegister = state.sessions
    .filter((s) => s.cash_register_id === registerId && s.cashier_user_id === userId)
    .sort((a, b) => {
      const da = parseISO(a.opening_datetime) || new Date(0);
      const db = parseISO(b.opening_datetime) || new Date(0);
      return db - da;
    });

  const openSession = sessionsForRegister.find((s) => s.status_code === "OPEN");
  const lastSession = sessionsForRegister[0] || null;

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const sessionsThisYear = sessionsForRegister.filter((s) => {
    const d = parseISO(s.opening_datetime);
    if (!d) return false;
    return d >= yearStart && d <= now;
  });

  let html = `<div class="status-summary-title">${register.register_code} · ${register.register_name}</div>`;

  if (openSession) {
    const statusMeta = getStatusMeta(openSession.status_code);
    html += `
      <div>
        <span class="key-value-item-label">Estado actual</span><br/>
        <span class="badge ${statusMeta.badgeClass}">
          <span class="badge-dot"></span>
          <span>${statusMeta.label}</span>
        </span>
      </div>
      <div style="margin-top:6px;">
        <span class="key-value-item-label">Sesión abierta</span><br/>
        Código: <strong>${openSession.session_code}</strong><br/>
        Apertura: ${formatDateTime(openSession.opening_datetime)}<br/>
        Monto apertura: ${formatCurrency(openSession.opening_amount)}
      </div>
      <div style="margin-top:8px; font-size:0.78rem; color:#fca5a5;">
        Existe una sesión abierta para esta caja y usuario, por lo que no es posible registrar una nueva apertura.
      </div>
    `;
    dom.openOpeningModalFromStateBtn.disabled = true;
    dom.statusRegisterInfo.textContent =
      "Caja con sesión abierta. Debe cerrarse o arqueada antes de una nueva apertura.";
  } else if (lastSession) {
    const statusMeta = getStatusMeta(lastSession.status_code);
    html += `
      <div>
        <span class="key-value-item-label">Estado actual</span><br/>
        <span class="badge ${statusMeta.badgeClass}">
          <span class="badge-dot"></span>
          <span>${statusMeta.label}</span>
        </span>
      </div>
      <div style="margin-top:6px;">
        <span class="key-value-item-label">Última sesión</span><br/>
        Código: <strong>${lastSession.session_code}</strong><br/>
        Apertura: ${formatDateTime(lastSession.opening_datetime)}<br/>
        Cierre: ${formatDateTime(lastSession.closing_datetime)}<br/>
        Diferencia: ${formatCurrency(lastSession.difference_amount)}
      </div>
      <div style="margin-top:8px; font-size:0.78rem; color:#bbf7d0;">
        No existen sesiones abiertas para esta caja. Puede registrar una nueva apertura.
      </div>
    `;
    dom.openOpeningModalFromStateBtn.disabled = false;
    dom.statusRegisterInfo.textContent =
      "Caja sin sesión abierta. Puede aperturar caja para un nuevo turno.";
  } else {
    html += `
      <div>
        <span class="key-value-item-label">Estado actual</span><br/>
        <span>Sin historial de aperturas para esta caja y usuario.</span>
      </div>
      <div style="margin-top:8px; font-size:0.78rem; color:#bbf7d0;">
        Puede registrar la primera apertura de esta caja para el usuario actual.
      </div>
    `;
    dom.openOpeningModalFromStateBtn.disabled = false;
    dom.statusRegisterInfo.textContent =
      "Esta caja no registra aperturas previas para el usuario actual.";
  }

  html += `
    <div style="margin-top:10px; font-size:0.78rem; color:#9ca3af;">
      Sesiones de esta caja para el año en curso: <strong>${sessionsThisYear.length}</strong>.
    </div>
  `;

  dom.statusSummaryContainer.innerHTML = html;
}

/* Modal apertura: cambio de caja */
function handleOpeningRegisterChange() {
  const registerId = Number(dom.openingRegisterSelect.value || "0");
  if (!registerId) {
    dom.openingRegisterInfo.textContent = "";
    return;
  }

  const register = state.registers.find((r) => r.id === registerId);
  if (!register) {
    dom.openingRegisterInfo.textContent = "";
    return;
  }

  const hasOpen = hasOpenSessionForRegister(registerId);
  const statusText = hasOpen
    ? "Estado actual: existe una sesión abierta para esta caja (no se permite abrir otra)."
    : "Estado actual: no hay sesiones abiertas para esta caja, se puede iniciar una nueva.";

  dom.openingRegisterInfo.textContent = `${register.register_code} · ${register.register_name} · ${register.branch_name}. ${statusText}`;
}

/* Submit apertura */
function handleOpeningModalSubmit(ev) {
  ev.preventDefault();
  resetOpeningAlert();

  const registerId = Number(dom.openingRegisterSelect.value || "0");
  const amount = Number(dom.openingAmount.value || "0");
  const notes = dom.openingNotes.value.trim();

  if (!registerId) {
    showOpeningAlert("Debe seleccionar una caja.", "error");
    return;
  }

  if (Number.isNaN(amount) || amount < 0) {
    showOpeningAlert("El monto de apertura debe ser mayor o igual a 0.", "error");
    return;
  }

  if (hasOpenSessionForRegister(registerId)) {
    showOpeningAlert(
      "Ya existe una sesión de caja abierta para esta caja y usuario. Debe cerrarla o arqueada antes de abrir una nueva.",
      "error"
    );
    return;
  }

  const register = state.registers.find((r) => r.id === registerId);
  const now = new Date();

  const sessionCode = `SES-${now.getFullYear()}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(
    state.sessions.length + 1
  ).padStart(4, "0")}`;

  const newSession = {
    id: Date.now(),
    session_code: sessionCode,
    branch_id: register.branch_id,
    branch_code: register.branch_code,
    branch_name: register.branch_name,
    cash_register_id: register.id,
    cash_register_code: register.register_code,
    cash_register_name: register.register_name,
    cashier_user_id: state.currentUser?.id ?? null,
    cashier_name: state.currentUser?.full_name ?? "",
    supervisor_user_id: null,
    supervisor_name: "",
    opening_amount: amount,
    opening_datetime: now.toISOString(),
    opening_notes: notes || "",
    closing_datetime: null,
    theoretical_amount: null,
    physical_amount: null,
    difference_amount: null,
    closing_notes: "",
    status_code: "OPEN"
  };

  state.sessions.push(newSession);

  dom.openingAmount.value = "";
  dom.openingNotes.value = "";
  dom.openingRegisterSelect.value = "";
  dom.openingRegisterInfo.textContent = "";

  showOpeningAlert("Caja abierta correctamente.", "success");

  // Refrescamos tabla e información de estado
  renderSessionsTable();
  renderSelectedRegisterStatus();

  hideModal(dom.openingModal);
}

/* Filtros / historial: rango por defecto = año en curso */
function defaultDateRangeCurrentYear() {
  const today = new Date();
  const toDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const fromDate = new Date(toDate.getFullYear(), 0, 1); // 1 de enero del año actual

  const toStr = toDate.toISOString().substring(0, 10);
  const fromStr = fromDate.toISOString().substring(0, 10);

  dom.filterDateTo.value = toStr;
  dom.filterDateFrom.value = fromStr;
}

/* Filtro de sesiones para historial */
function getFilteredSessions() {
  if (!state.currentUser) return [];
  const userId = state.currentUser.id;

  let filtered = state.sessions.filter((s) => s.cashier_user_id === userId);

  const branchId = Number(dom.filterBranchSelect.value || "0");
  const registerId = Number(dom.filterRegisterSelect.value || "0");

  if (branchId) {
    filtered = filtered.filter((s) => s.branch_id === branchId);
  }

  if (registerId) {
    filtered = filtered.filter((s) => s.cash_register_id === registerId);
  }

  const fromStr = dom.filterDateFrom.value;
  const toStr = dom.filterDateTo.value;

  if (fromStr) {
    const fromDate = new Date(fromStr);
    filtered = filtered.filter((s) => {
      const d = parseISO(s.opening_datetime);
      if (!d) return false;
      return d >= fromDate;
    });
  }

  if (toStr) {
    const toDate = new Date(toStr);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((s) => {
      const d = parseISO(s.opening_datetime);
      if (!d) return false;
      return d <= toDate;
    });
  }

  filtered.sort((a, b) => {
    const da = parseISO(a.opening_datetime) || new Date(0);
    const db = parseISO(b.opening_datetime) || new Date(0);
    return db - da;
  });

  return filtered;
}

function renderSessionsTable() {
  const sessions = getFilteredSessions();
  dom.sessionsTableBody.innerHTML = "";

  if (sessions.length === 0) {
    dom.sessionsEmptyState.style.display = "block";
    return;
  }
  dom.sessionsEmptyState.style.display = "none";

  sessions.forEach((session) => {
    const tr = document.createElement("tr");
    const statusMeta = getStatusMeta(session.status_code);

    tr.innerHTML = `
      <td>${session.session_code}</td>
      <td>${session.branch_code ?? ""} · ${session.branch_name ?? "-"}</td>
      <td>${session.cash_register_code ?? ""} · ${session.cash_register_name ?? ""}</td>
      <td>${formatDateTime(session.opening_datetime)}</td>
      <td>${formatDateTime(session.closing_datetime)}</td>
      <td>
        <span class="badge ${statusMeta.badgeClass}">
          <span class="badge-dot"></span>
          <span>${statusMeta.label}</span>
        </span>
      </td>
      <td class="numeric">${formatCurrency(session.opening_amount)}</td>
      <td class="numeric">${formatCurrency(session.theoretical_amount)}</td>
      <td class="numeric">${formatCurrency(session.physical_amount)}</td>
      <td class="numeric">${formatCurrency(session.difference_amount)}</td>
      <td>
        <button 
          type="button" 
          class="btn btn-link btn-small js-view-session-detail" 
          data-session-id="${session.id}">
          Ver detalle
        </button>
      </td>
    `;

    dom.sessionsTableBody.appendChild(tr);
  });
}

/* Tabs detalle */
function setActiveSessionDetailTab(tabId) {
  const buttons = dom.sessionDetailTabs.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((btn) => {
    const id = btn.dataset.tabId;
    if (id === tabId) {
      btn.classList.add("tab-active");
    } else {
      btn.classList.remove("tab-active");
    }
  });

  panels.forEach((panel) => {
    const id = panel.dataset.tabPanelId;
    if (id === tabId) {
      panel.classList.add("tab-panel-active");
    } else {
      panel.classList.remove("tab-panel-active");
    }
  });
}

/* Resumen de sesión para modal detalle */
function renderSessionSummary(session) {
  dom.sessionSummaryCards.innerHTML = "";
  dom.sessionSummaryNotes.textContent = "";

  const statusMeta = getStatusMeta(session.status_code);

  const cards = [
    ["Estado", statusMeta.label],
    ["Monto teórico", formatCurrency(session.theoretical_amount)],
    ["Monto físico", formatCurrency(session.physical_amount)],
    ["Diferencia", formatCurrency(session.difference_amount)]
  ];

  cards.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <div class="summary-card-label">${label}</div>
      <div class="summary-card-value">${value}</div>
    `;
    dom.sessionSummaryCards.appendChild(card);
  });

  let notes = "";
  if (session.status_code === "OPEN") {
    notes =
      "La sesión se encuentra abierta. El arqueo y el resumen final estarán disponibles una vez que la caja sea cerrada.";
  } else if (session.status_code === "CLOSED") {
    notes =
      "La sesión está cerrada. El arqueo puede estar en proceso o pendiente de confirmación según las diferencias observadas.";
  } else if (session.status_code === "RECONCILED") {
    notes =
      "La sesión está arqueada y conciliada. El detalle de movimientos y caja chica se presenta como respaldo del conteo final.";
  }

  if (session.closing_notes) {
    notes += (notes ? " " : "") + `Notas de cierre: ${session.closing_notes}`;
  }

  dom.sessionSummaryNotes.textContent = notes;
}

function renderCashMovements(session) {
  dom.cashMovementsTableBody.innerHTML = "";

  const movements = state.cashMovements.filter(
    (m) => m.cash_register_session_id === session.id
  );

  if (movements.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="8" style="text-align:center; font-size:0.78rem; color:#9ca3af;">
        No hay movimientos de caja registrados para esta sesión.
      </td>
    `;
    dom.cashMovementsTableBody.appendChild(tr);
    return;
  }

  movements.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.movement_type_label}</td>
      <td>${m.document_summary || "-"}</td>
      <td>${m.payment_method_name || "-"}</td>
      <td class="numeric">${formatCurrency(m.received_amount)}</td>
      <td class="numeric">${formatCurrency(m.change_amount)}</td>
      <td class="numeric">${formatCurrency(m.amount)}</td>
      <td>${formatDateTime(m.created_at)}</td>
      <td>${m.description || "-"}</td>
    `;
    dom.cashMovementsTableBody.appendChild(tr);
  });
}

function renderPettyCashMovements(session) {
  dom.pettyCashTableBody.innerHTML = "";

  const expenses = state.pettyCashExpenses.filter(
    (e) => e.cash_register_session_id === session.id
  );
  const replenishments = state.pettyCashReplenishments.filter(
    (r) => r.cash_register_session_id === session.id
  );

  if (expenses.length === 0 && replenishments.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="6" style="text-align:center; font-size:0.78rem; color:#9ca3af;">
        No hay movimientos de caja chica asociados a esta sesión.
      </td>
    `;
    dom.pettyCashTableBody.appendChild(tr);
    return;
  }

  expenses.forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Gasto</td>
      <td>${e.category_name} · Fondo ${e.fund_code}</td>
      <td>${e.expense_description}</td>
      <td class="numeric">${formatCurrency(e.expense_amount)}</td>
      <td>${formatDateOnly(e.expense_date)}</td>
      <td>${e.status_label || "-"}</td>
    `;
    dom.pettyCashTableBody.appendChild(tr);
  });

  replenishments.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>Reposición</td>
      <td>Fondo ${r.fund_code}</td>
      <td>${r.replenishment_description || "-"}</td>
      <td class="numeric">${formatCurrency(r.replenishment_amount)}</td>
      <td>${formatDateTime(r.created_at)}</td>
      <td>${r.status_label || "-"}</td>
    `;
    dom.pettyCashTableBody.appendChild(tr);
  });
}

function openSessionDetail(sessionId) {
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  const statusMeta = getStatusMeta(session.status_code);

  dom.sessionDetailTitle.textContent = `Sesión ${session.session_code}`;
  dom.sessionDetailSubtitle.textContent = `${session.branch_code ?? ""} · ${
    session.branch_name ?? "-"
  } · ${session.cash_register_code ?? ""} · ${session.cash_register_name ?? ""}`;

  // Identificación
  dom.sessionIdentityInfo.innerHTML = "";
  const identityItems = [
    ["Estado de la sesión", statusMeta.label],
    ["Sucursal", `${session.branch_code ?? ""} · ${session.branch_name ?? "-"}`],
    [
      "Caja",
      `${session.cash_register_code ?? ""} · ${session.cash_register_name ?? ""}`
    ],
    ["Cajero", session.cashier_name ?? "-"],
    ["Supervisor", session.supervisor_name || "-"],
    ["Fecha de apertura", formatDateTime(session.opening_datetime)],
    ["Fecha de cierre", formatDateTime(session.closing_datetime)]
  ];

  identityItems.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <span class="key-value-item-label">${label}</span>
      <span class="key-value-item-value">${value}</span>
    `;
    dom.sessionIdentityInfo.appendChild(div);
  });

  // Apertura
  dom.sessionOpeningInfo.innerHTML = "";
  const openingItems = [
    ["Monto de apertura", formatCurrency(session.opening_amount)],
    ["Notas de apertura", session.opening_notes || "-"]
  ];
  openingItems.forEach(([label, value]) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <span class="key-value-item-label">${label}</span>
      <span class="key-value-item-value">${value}</span>
    `;
    dom.sessionOpeningInfo.appendChild(div);
  });

  renderSessionSummary(session);
  renderCashMovements(session);
  renderPettyCashMovements(session);

  setActiveSessionDetailTab("summary");
  showModal(dom.sessionDetailModal);
}

/* Helpers de modales */
function showModal(modal) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function hideModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

/* Eventos */
function attachEventListeners() {
  // Cambio de caja en estado actual
  dom.statusRegisterSelect.addEventListener("change", () => {
    renderSelectedRegisterStatus();
  });

  // Botón "Aperturar caja" desde Estado actual
  dom.openOpeningModalFromStateBtn.addEventListener("click", () => {
    resetOpeningAlert();
    dom.openingAmount.value = "";
    dom.openingNotes.value = "";
    initOpeningModalContext();

    // Preseleccionar la caja actual en el modal, si aplica
    const registerId = Number(dom.statusRegisterSelect.value || "0");
    if (registerId) {
      dom.openingRegisterSelect.value = String(registerId);
      handleOpeningRegisterChange();
    } else {
      dom.openingRegisterSelect.value = "";
      dom.openingRegisterInfo.textContent = "";
    }

    showModal(dom.openingModal);
  });

  // Modal apertura: cambio de caja y submit
  dom.openingRegisterSelect.addEventListener("change", handleOpeningRegisterChange);
  dom.openingModalForm.addEventListener("submit", handleOpeningModalSubmit);

  // Filtros
  dom.filterBranchSelect.addEventListener("change", () => {
    const branchId = Number(dom.filterBranchSelect.value || "0");
    refreshFilterRegisterSelect(branchId || null);
  });

  dom.applyFiltersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    renderSessionsTable();
  });

  dom.clearFiltersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dom.filterBranchSelect.value = "";
    refreshFilterRegisterSelect(null);
    defaultDateRangeCurrentYear();
    renderSessionsTable();
  });

  // Ver detalle (delegado)
  dom.sessionsTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-view-session-detail");
    if (!btn) return;
    const sessionId = Number(btn.dataset.sessionId);
    openSessionDetail(sessionId);
  });

  // Cierre de modales
  [dom.openingModal, dom.sessionDetailModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      const closeBtn = e.target.closest("[data-modal-close]");
      if (closeBtn) {
        hideModal(modal);
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (dom.openingModal.classList.contains("show")) hideModal(dom.openingModal);
      if (dom.sessionDetailModal.classList.contains("show"))
        hideModal(dom.sessionDetailModal);
    }
  });

  // Tabs detalle
  dom.sessionDetailTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    const tabId = btn.dataset.tabId;
    if (!tabId) return;
    setActiveSessionDetailTab(tabId);
  });
}

/* Bootstrap */
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadData();
    cacheDom();
    initUserInfo();
    initKpis();
    initFilterBranchSelect();
    refreshFilterRegisterSelect(null);
    initStatusSection();
    attachEventListeners();
    defaultDateRangeCurrentYear();
    renderSessionsTable();
  } catch (err) {
    console.error(err);
    alert(
      "Error al inicializar el módulo de caja. Revise la consola del navegador para más detalles."
    );
  }
});
