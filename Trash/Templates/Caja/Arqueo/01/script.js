// script.js
// Módulo de arqueo de caja: gestión de sesiones, filtros y conteo físico.

let state = {
  currentUser: null,
  currentBranch: null,
  branches: [],
  registers: [],
  paymentMethods: [],
  sessionStatuses: [],
  sessions: [],
  cashMovements: [],
  pettyCashExpenses: [],
  pettyCashReplenishments: [],
  cashDenominationsCatalog: []
};

const dom = {};

/* Utilidades básicas */
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

/* Cache de nodos */
function cacheDom() {
  // Header / KPIs
  dom.currentUserName = document.getElementById("currentUserName");
  dom.kpiSessionsOpen = document.getElementById("kpiSessionsOpen");
  dom.kpiSessionsPending = document.getElementById("kpiSessionsPending");
  dom.kpiSessionsReconciledToday = document.getElementById(
    "kpiSessionsReconciledToday"
  );
  dom.kpiDiffMonth = document.getElementById("kpiDiffMonth");

  // Filtros
  dom.filterDateFrom = document.getElementById("filterDateFrom");
  dom.filterDateTo = document.getElementById("filterDateTo");
  dom.filterBranchSelect = document.getElementById("filterBranchSelect");
  dom.filterRegisterSelect = document.getElementById("filterRegisterSelect");
  dom.filterStatusSelect = document.getElementById("filterStatusSelect");
  dom.applyFiltersBtn = document.getElementById("applyFiltersBtn");
  dom.clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // Sesiones
  dom.sessionsTableBody = document.getElementById("sessionsTableBody");
  dom.sessionsEmptyState = document.getElementById("sessionsEmptyState");

  // Estado rápido
  dom.statusBranchLabel = document.getElementById("statusBranchLabel");
  dom.statusUserLabel = document.getElementById("statusUserLabel");
  dom.quickSessionInfo = document.getElementById("quickSessionInfo");
  dom.openReconciliationModalBtn = document.getElementById(
    "openReconciliationModalBtn"
  );

  // Modal de arqueo
  dom.reconciliationModal = document.getElementById("reconciliationModal");
  dom.reconciliationModalTitle = document.getElementById(
    "reconciliationModalTitle"
  );
  dom.reconciliationModalSubtitle = document.getElementById(
    "reconciliationModalSubtitle"
  );
  dom.reconciliationForm = document.getElementById("reconciliationForm");
  dom.reconciliationAlert = document.getElementById("reconciliationAlert");
  dom.sessionIdentityInfo = document.getElementById("sessionIdentityInfo");
  dom.paymentSummaryTableBody = document.getElementById(
    "paymentSummaryTableBody"
  );
  dom.cashDenominationsTableBody = document.getElementById(
    "cashDenominationsTableBody"
  );
  dom.cashTotalPhysical = document.getElementById("cashTotalPhysical");
  dom.otherPaymentsPhysicalTableBody = document.getElementById(
    "otherPaymentsPhysicalTableBody"
  );
  dom.reconciliationSummaryCards = document.getElementById(
    "reconciliationSummaryCards"
  );
  dom.reconciliationStatusSelect = document.getElementById(
    "reconciliationStatusSelect"
  );
  dom.reconciliationNotes = document.getElementById("reconciliationNotes");

  // Tabs del modal de arqueo
  dom.modalTabButtons = document.querySelectorAll(
    ".modal-tabs [data-tab-target]"
  );
  dom.modalTabPanels = document.querySelectorAll(
    ".modal-tabs-panels .tab-panel"
  );
}

/* Inicialización de usuario / contexto */
function initUserInfo() {
  if (state.currentUser) {
    dom.currentUserName.textContent = `Usuario: ${state.currentUser.full_name} (${state.currentUser.username})`;
  } else {
    dom.currentUserName.textContent = "Usuario no definido";
  }

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

  dom.quickSessionInfo.innerHTML =
    '<div class="status-summary-title">Sin sesión seleccionada</div><div>No se ha seleccionado ninguna sesión de caja.</div>';
}

/* Filtros: selects de sucursal / caja */
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

/* Rango de fechas por defecto: mes actual (F. cierre) */
function defaultDateRangeCurrentMonth() {
  const today = new Date();
  const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const toDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  dom.filterDateFrom.value = fromDate.toISOString().substring(0, 10);
  dom.filterDateTo.value = toDate.toISOString().substring(0, 10);
}

/* KPIs */
function initKpis() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  let openCount = 0;
  let pendingCount = 0;
  let reconciledToday = 0;
  let diffMonth = 0;

  state.sessions.forEach((s) => {
    const closingDate = parseISO(s.closing_datetime);
    const openDate = parseISO(s.opening_datetime);

    if (s.status_code === "OPEN") {
      openCount += 1;
    }

    if (s.status_code === "CLOSED") {
      pendingCount += 1;
    }

    if (
      s.status_code === "RECONCILED" &&
      closingDate &&
      closingDate.toDateString() === today.toDateString()
    ) {
      reconciledToday += 1;
    }

    if (closingDate && closingDate >= monthStart && closingDate <= today) {
      if (typeof s.difference_amount === "number") {
        diffMonth += s.difference_amount;
      }
    }

    // fallback: si no hay closing_date, usamos apertura
    if (!closingDate && openDate && openDate >= monthStart && openDate <= today) {
      if (
        (s.status_code === "CLOSED" || s.status_code === "RECONCILED") &&
        typeof s.difference_amount === "number"
      ) {
        diffMonth += s.difference_amount;
      }
    }
  });

  dom.kpiSessionsOpen.textContent = String(openCount);
  dom.kpiSessionsPending.textContent = String(pendingCount);
  dom.kpiSessionsReconciledToday.textContent = String(reconciledToday);
  dom.kpiDiffMonth.textContent = formatCurrency(diffMonth);
}

/* Filtro de sesiones */
function getFilteredSessions() {
  let filtered = [...state.sessions];

  const branchId = Number(dom.filterBranchSelect.value || "0");
  const registerId = Number(dom.filterRegisterSelect.value || "0");
  const status = dom.filterStatusSelect.value || "";

  const fromStr = dom.filterDateFrom.value;
  const toStr = dom.filterDateTo.value;

  if (branchId) {
    filtered = filtered.filter((s) => s.branch_id === branchId);
  }

  if (registerId) {
    filtered = filtered.filter((s) => s.cash_register_id === registerId);
  }

  if (status) {
    filtered = filtered.filter((s) => s.status_code === status);
  }

  if (fromStr) {
    const fromDate = new Date(fromStr);
    filtered = filtered.filter((s) => {
      const d = parseISO(s.closing_datetime) || parseISO(s.opening_datetime);
      if (!d) return false;
      return d >= fromDate;
    });
  }

  if (toStr) {
    const toDate = new Date(toStr);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((s) => {
      const d = parseISO(s.closing_datetime) || parseISO(s.opening_datetime);
      if (!d) return false;
      return d <= toDate;
    });
  }

  filtered.sort((a, b) => {
    const da =
      parseISO(a.closing_datetime) ||
      parseISO(a.opening_datetime) ||
      new Date(0);
    const db =
      parseISO(b.closing_datetime) ||
      parseISO(b.opening_datetime) ||
      new Date(0);
    return db - da;
  });

  return filtered;
}

/* Render tabla de sesiones */
let selectedSessionId = null;

function renderSessionsTable() {
  const sessions = getFilteredSessions();
  dom.sessionsTableBody.innerHTML = "";

  if (sessions.length === 0) {
    dom.sessionsEmptyState.style.display = "block";
    selectedSessionId = null;
    dom.openReconciliationModalBtn.disabled = true;
    renderQuickSessionInfo(null);
    return;
  }
  dom.sessionsEmptyState.style.display = "none";

  sessions.forEach((session) => {
    const tr = document.createElement("tr");
    const statusMeta = getStatusMeta(session.status_code);

    tr.innerHTML = `
      <td>${session.session_code}</td>
      <td>${session.branch_code ?? ""} · ${session.branch_name ?? "-"}</td>
      <td>${session.cash_register_code ?? ""} · ${
      session.cash_register_name ?? ""
    }</td>
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
          class="btn btn-link btn-small js-select-session" 
          data-session-id="${session.id}">
          Seleccionar
        </button>
        <button 
          type="button" 
          class="btn btn-link btn-small js-open-reconciliation" 
          data-session-id="${session.id}">
          Arquear
        </button>
      </td>
    `;

    dom.sessionsTableBody.appendChild(tr);
  });
}

/* Estado rápido de sesión seleccionada */
function renderQuickSessionInfo(session) {
  if (!session) {
    dom.quickSessionInfo.innerHTML =
      '<div class="status-summary-title">Sin sesión seleccionada</div><div>Seleccione una sesión de la tabla para ver su detalle rápido.</div>';
    dom.openReconciliationModalBtn.disabled = true;
    return;
  }

  const statusMeta = getStatusMeta(session.status_code);

  dom.quickSessionInfo.innerHTML = `
    <div class="status-summary-title">${session.session_code} · ${
    session.cash_register_code
  } · ${session.cash_register_name}</div>
    <div class="key-value-grid" style="margin-top:6px;">
      <div>
        <span class="key-value-item-label">Sucursal</span>
        <span class="key-value-item-value">${session.branch_code} · ${
    session.branch_name
  }</span>
      </div>
      <div>
        <span class="key-value-item-label">Caja</span>
        <span class="key-value-item-value">${session.cash_register_code} · ${
    session.cash_register_name
  }</span>
      </div>
      <div>
        <span class="key-value-item-label">Estado</span>
        <span class="key-value-item-value">
          <span class="badge ${statusMeta.badgeClass}">
            <span class="badge-dot"></span>
            <span>${statusMeta.label}</span>
          </span>
        </span>
      </div>
      <div>
        <span class="key-value-item-label">F. apertura</span>
        <span class="key-value-item-value">${formatDateTime(
          session.opening_datetime
        )}</span>
      </div>
      <div>
        <span class="key-value-item-label">F. cierre</span>
        <span class="key-value-item-value">${formatDateTime(
          session.closing_datetime
        )}</span>
      </div>
      <div>
        <span class="key-value-item-label">Cajero</span>
        <span class="key-value-item-value">${session.cashier_name ?? "-"}</span>
      </div>
      <div>
        <span class="key-value-item-label">Teórico</span>
        <span class="key-value-item-value">${formatCurrency(
          session.theoretical_amount
        )}</span>
      </div>
      <div>
        <span class="key-value-item-label">Físico</span>
        <span class="key-value-item-value">${formatCurrency(
          session.physical_amount
        )}</span>
      </div>
      <div>
        <span class="key-value-item-label">Diferencia</span>
        <span class="key-value-item-value">${formatCurrency(
          session.difference_amount
        )}</span>
      </div>
    </div>
  `;

  dom.openReconciliationModalBtn.disabled = false;
}

/* Modal helpers */
function showModal(modalEl) {
  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
}

function hideModal(modalEl) {
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
}

function resetReconciliationAlert() {
  const el = dom.reconciliationAlert;
  el.className = "alert";
  el.textContent = "";
}

function showReconciliationAlert(message, type = "info") {
  const el = dom.reconciliationAlert;
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

/* Tabs del modal */
function setActiveTab(targetId) {
  if (!dom.modalTabButtons || !dom.modalTabPanels) return;

  dom.modalTabButtons.forEach((btn) => {
    const isActive = btn.dataset.tabTarget === targetId;
    btn.classList.toggle("tab-active", isActive);
  });

  dom.modalTabPanels.forEach((panel) => {
    const isActive = panel.id === targetId;
    panel.classList.toggle("tab-panel-active", isActive);
  });
}

/* Cálculos por medio de pago (teórico) */
function getTheoreticalByPaymentMethod(sessionId) {
  const totals = new Map(); // payment_method_id -> number

  state.cashMovements
    .filter((m) => m.cash_register_session_id === sessionId)
    .forEach((m) => {
      const pmId = m.payment_method_id;
      const current = totals.get(pmId) ?? 0;
      // amount ya viene con signo (ventas > 0, caja chica < 0, etc.)
      totals.set(pmId, current + Number(m.amount || 0));
    });

  return totals;
}

/* Render del modal de arqueo */
let activeSession = null;
let physicalByPaymentMethod = new Map(); // pmId -> number

function openReconciliationModal(session) {
  activeSession = session;
  if (!session) return;

  // Siempre partimos en el tab 1 (contexto)
  setActiveTab("tab-context");

  resetReconciliationAlert();
  physicalByPaymentMethod = new Map();

  dom.reconciliationModalSubtitle.textContent = `${
    session.session_code
  } · ${session.branch_code} · ${session.branch_name} · ${
    session.cash_register_code
  } · ${session.cash_register_name}`;

  // Identidad
  dom.sessionIdentityInfo.innerHTML = `
    <div>
      <span class="key-value-item-label">Sucursal</span>
      <span class="key-value-item-value">${session.branch_code} · ${
    session.branch_name
  }</span>
    </div>
    <div>
      <span class="key-value-item-label">Caja</span>
      <span class="key-value-item-value">${session.cash_register_code} · ${
    session.cash_register_name
  }</span>
    </div>
    <div>
      <span class="key-value-item-label">Cajero</span>
      <span class="key-value-item-value">${session.cashier_name ?? "-"}</span>
    </div>
    <div>
      <span class="key-value-item-label">Supervisor</span>
      <span class="key-value-item-value">${session.supervisor_name ?? "-"}</span>
    </div>
    <div>
      <span class="key-value-item-label">F. apertura</span>
      <span class="key-value-item-value">${formatDateTime(
        session.opening_datetime
      )}</span>
    </div>
    <div>
      <span class="key-value-item-label">F. cierre</span>
      <span class="key-value-item-value">${formatDateTime(
        session.closing_datetime
      )}</span>
    </div>
  `;

  // Resumen teórico por medio de pago
  renderPaymentSummary(session);

  // Conteo físico: denominaciones y otros medios
  renderCashDenominationsTable(session);
  renderOtherPaymentsPhysicalTable(session);

  // Resumen final
  renderReconciliationSummaryCards(session);

  // Estado / notas
  renderReconciliationStatusOptions(session);
  dom.reconciliationNotes.value = session.closing_notes || "";

  showModal(dom.reconciliationModal);
}

function renderPaymentSummary(session) {
  dom.paymentSummaryTableBody.innerHTML = "";

  const theoreticalTotals = getTheoreticalByPaymentMethod(session.id);
  const rows = [];

  state.paymentMethods.forEach((pm) => {
    const theo = theoreticalTotals.get(pm.id) ?? 0;
    const phys = physicalByPaymentMethod.get(pm.id) ?? 0;
    const diff = phys - theo;

    rows.push({
      paymentMethod: pm,
      theoretical: theo,
      physical: phys,
      difference: diff
    });
  });

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.paymentMethod.name}</td>
      <td class="numeric">${formatCurrency(row.theoretical)}</td>
      <td class="numeric">${formatCurrency(row.physical)}</td>
      <td class="numeric">${formatCurrency(row.difference)}</td>
    `;
    dom.paymentSummaryTableBody.appendChild(tr);
  });
}

/* Denominaciones (efectivo) */
function renderCashDenominationsTable(session) {
  dom.cashDenominationsTableBody.innerHTML = "";
  dom.cashTotalPhysical.textContent = "0";

  const cashMethod = state.paymentMethods.find((p) => p.code === "CASH");
  const cashPmId = cashMethod ? cashMethod.id : null;

  const denominations =
    state.cashDenominationsCatalog && state.cashDenominationsCatalog.length
      ? state.cashDenominationsCatalog
      : [
          { value: 20000 },
          { value: 10000 },
          { value: 5000 },
          { value: 2000 },
          { value: 1000 },
          { value: 500 },
          { value: 100 }
        ];

  denominations.forEach((d, index) => {
    const tr = document.createElement("tr");
    const rowId = `denom-${index}`;
    tr.innerHTML = `
      <td>${
        d.label || formatCurrency(d.value).replace(/\s*CLP/i, "")
      }</td>
      <td class="numeric">
        <input 
          type="number" 
          class="input" 
          min="0" 
          step="1" 
          data-denomination-row="${rowId}" 
          data-denomination-value="${d.value}"
        />
      </td>
      <td class="numeric" data-denomination-subtotal="${rowId}">0</td>
    `;
    dom.cashDenominationsTableBody.appendChild(tr);
  });

  // Inicializamos en 0 el físico de efectivo o lo que venga de la sesión
  if (cashPmId !== null) {
    physicalByPaymentMethod.set(
      cashPmId,
      Number(session.physical_cash_amount || 0)
    );
  }

  updateCashTotalsFromInputs();
}

/* Otros medios de pago físicos */
function renderOtherPaymentsPhysicalTable(session) {
  dom.otherPaymentsPhysicalTableBody.innerHTML = "";

  const cashMethod = state.paymentMethods.find((p) => p.code === "CASH");
  const cashPmId = cashMethod ? cashMethod.id : null;

  state.paymentMethods
    .filter((pm) => pm.id !== cashPmId)
    .forEach((pm) => {
      const tr = document.createElement("tr");
      const currentValue = physicalByPaymentMethod.get(pm.id) ?? 0;

      tr.innerHTML = `
        <td>${pm.name}</td>
        <td class="numeric">
          <div class="input-prefix-group">
            <span class="input-prefix">$</span>
            <input 
              type="number" 
              class="input" 
              min="0" 
              step="100" 
              data-physical-other-payment-id="${pm.id}"
              value="${currentValue || ""}"
            />
          </div>
        </td>
      `;
      dom.otherPaymentsPhysicalTableBody.appendChild(tr);
    });
}

/* Manejo de entradas físicas */
function handleCashDenominationChange(ev) {
  const input = ev.target;
  if (!input.dataset.denominationRow) return;
  updateCashTotalsFromInputs();
}

function updateCashTotalsFromInputs() {
  const cashMethod = state.paymentMethods.find((p) => p.code === "CASH");
  const cashPmId = cashMethod ? cashMethod.id : null;

  let total = 0;
  const inputs = dom.cashDenominationsTableBody.querySelectorAll(
    "input[data-denomination-row]"
  );

  inputs.forEach((input) => {
    const value = Number(input.dataset.denominationValue || "0");
    const qty = Number(input.value || "0");
    if (!Number.isNaN(value) && !Number.isNaN(qty) && qty > 0) {
      total += value * qty;
    }
  });

  dom.cashTotalPhysical.textContent = formatCurrency(total);

  dom.cashDenominationsTableBody
    .querySelectorAll("[data-denomination-subtotal]")
    .forEach((cell) => {
      const rowId = cell.dataset.denominationSubtotal;
      const input = dom.cashDenominationsTableBody.querySelector(
        `input[data-denomination-row="${rowId}"]`
      );
      if (!input) return;
      const value = Number(input.dataset.denominationValue || "0");
      const qty = Number(input.value || "0");
      const subtotal =
        !Number.isNaN(value) && !Number.isNaN(qty) ? value * qty : 0;
      cell.textContent = formatCurrency(subtotal);
    });

  if (cashPmId !== null) {
    physicalByPaymentMethod.set(cashPmId, total);
  }

  // Actualizamos resumen por medio de pago y tarjetas finales
  if (activeSession) {
    renderPaymentSummary(activeSession);
    renderReconciliationSummaryCards(activeSession);
  }
}

function handleOtherPaymentsPhysicalChange(ev) {
  const input = ev.target;
  const pmIdStr = input.dataset.physicalOtherPaymentId;
  if (!pmIdStr) return;

  const pmId = Number(pmIdStr);
  const amount = Number(input.value || "0");
  if (Number.isNaN(amount) || amount < 0) {
    physicalByPaymentMethod.set(pmId, 0);
  } else {
    physicalByPaymentMethod.set(pmId, amount);
  }

  if (activeSession) {
    renderPaymentSummary(activeSession);
    renderReconciliationSummaryCards(activeSession);
  }
}

/* Resumen final de arqueo */
function renderReconciliationSummaryCards(session) {
  dom.reconciliationSummaryCards.innerHTML = "";

  let theoreticalTotal = 0;
  let physicalTotal = 0;

  // Preferimos theoretical_amount si viene desde la BD
  if (typeof session.theoretical_amount === "number") {
    theoreticalTotal = session.theoretical_amount;
  } else {
    const totals = getTheoreticalByPaymentMethod(session.id);
    totals.forEach((value) => {
      theoreticalTotal += value;
    });
  }

  // Físico: sumamos mapa physicalByPaymentMethod
  physicalByPaymentMethod.forEach((value) => {
    physicalTotal += value;
  });

  const difference = physicalTotal - theoreticalTotal;

  const cards = [
    ["Monto teórico", theoreticalTotal],
    ["Monto físico", physicalTotal],
    ["Diferencia", difference],
    ["Monto apertura", Number(session.opening_amount || 0)]
  ];

  cards.forEach(([label, value]) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
      <div class="summary-card-label">${label}</div>
      <div class="summary-card-value">${formatCurrency(value)}</div>
    `;
    dom.reconciliationSummaryCards.appendChild(card);
  });
}

/* Estado / notas del arqueo */
function renderReconciliationStatusOptions(session) {
  dom.reconciliationStatusSelect.innerHTML = "";

  state.sessionStatuses.forEach((st) => {
    const opt = document.createElement("option");
    opt.value = st.code;
    opt.textContent = st.label;
    dom.reconciliationStatusSelect.appendChild(opt);
  });

  dom.reconciliationStatusSelect.value = session.status_code || "CLOSED";
}

/* Guardar arqueo (solo front) */
function handleReconciliationSubmit(ev) {
  ev.preventDefault();
  resetReconciliationAlert();

  if (!activeSession) {
    showReconciliationAlert(
      "No hay sesión activa para guardar el arqueo.",
      "error"
    );
    return;
  }

  let theoreticalTotal = 0;
  if (typeof activeSession.theoretical_amount === "number") {
    theoreticalTotal = activeSession.theoretical_amount;
  } else {
    const totals = getTheoreticalByPaymentMethod(activeSession.id);
    totals.forEach((value) => {
      theoreticalTotal += value;
    });
  }

  let physicalTotal = 0;
  physicalByPaymentMethod.forEach((value) => {
    physicalTotal += value;
  });

  const difference = physicalTotal - theoreticalTotal;

  const status = dom.reconciliationStatusSelect.value || "RECONCILED";
  const notes = dom.reconciliationNotes.value.trim();

  // Simulación de actualización en memoria
  activeSession.theoretical_amount = theoreticalTotal;
  activeSession.physical_amount = physicalTotal;
  activeSession.difference_amount = difference;
  activeSession.status_code = status;
  activeSession.closing_notes = notes;
  if (!activeSession.closing_datetime) {
    activeSession.closing_datetime = new Date().toISOString();
  }

  showReconciliationAlert("Arqueo guardado localmente.", "success");

  // Refrescamos tabla y resumen rápido
  renderSessionsTable();
  renderQuickSessionInfo(activeSession);
  initKpis();

  hideModal(dom.reconciliationModal);
}

/* Listeners globales */
function initEvents() {
  dom.filterBranchSelect.addEventListener("change", () => {
    const branchId = Number(dom.filterBranchSelect.value || "0");
    refreshFilterRegisterSelect(branchId || null);
  });

  dom.applyFiltersBtn.addEventListener("click", () => {
    renderSessionsTable();
  });

  dom.clearFiltersBtn.addEventListener("click", () => {
    dom.filterBranchSelect.value = "";
    refreshFilterRegisterSelect(null);
    dom.filterStatusSelect.value = "";
    defaultDateRangeCurrentMonth();
    renderSessionsTable();
  });

  // Delegación para selección de sesión y abrir modal
  dom.sessionsTableBody.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;

    const selectBtn = target.closest(".js-select-session");
    const reconcileBtn = target.closest(".js-open-reconciliation");

    if (selectBtn) {
      const id = Number(selectBtn.dataset.sessionId || "0");
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        selectedSessionId = session.id;
        renderQuickSessionInfo(session);
      }
    }

    if (reconcileBtn) {
      const id = Number(reconcileBtn.dataset.sessionId || "0");
      const session = state.sessions.find((s) => s.id === id);
      if (session) {
        selectedSessionId = session.id;
        renderQuickSessionInfo(session);
        openReconciliationModal(session);
      }
    }
  });

  // Botón de header de card
  dom.openReconciliationModalBtn.addEventListener("click", () => {
    if (!selectedSessionId) return;
    const session = state.sessions.find((s) => s.id === selectedSessionId);
    if (!session) return;
    openReconciliationModal(session);
  });

  // Modal: cierre
  document.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      hideModal(dom.reconciliationModal);
    });
  });

  // Submit del formulario de arqueo
  dom.reconciliationForm.addEventListener("submit", handleReconciliationSubmit);

  // Tabs del modal
  if (dom.modalTabButtons) {
    dom.modalTabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.tabTarget;
        if (!targetId) return;
        setActiveTab(targetId);
      });
    });
  }

  // Eventos para conteo físico
  if (dom.cashDenominationsTableBody) {
    dom.cashDenominationsTableBody.addEventListener(
      "input",
      handleCashDenominationChange
    );
  }

  if (dom.otherPaymentsPhysicalTableBody) {
    dom.otherPaymentsPhysicalTableBody.addEventListener(
      "input",
      handleOtherPaymentsPhysicalChange
    );
  }
}

/* Bootstrap */
async function main() {
  await loadData();
  cacheDom();
  initUserInfo();
  initFilterBranchSelect();
  refreshFilterRegisterSelect(null);
  defaultDateRangeCurrentMonth();
  initKpis();
  renderSessionsTable();
  initEvents();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  alert("Error inicializando el módulo de arqueo de caja.");
});
