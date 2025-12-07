let cashRegisters = [];
let openings = [];
let users = [];

// Referencias DOM
let metricTotalOpenings;
let metricOpeningsToday;
let metricOpenCashRegisters;
let metricLastOpeningAmount;
let metricLastOpeningInfo;

let fieldRegisterId;
let fieldBranch;
let fieldOpeningDate;
let fieldOpeningTime;
let fieldResponsibleId;
let fieldInitialAmount;
let fieldCurrency;
let fieldAutoCode;
let fieldNotes;

let currentRegisterBadge;
let currentStatusRegister;
let currentStatusBadge;
let currentStatusUser;
let currentStatusAmount;
let currentStatusNotes;

let filterText;
let filterStatus;
let filterRegister;
let filterUser;
let filterDateFrom;
let filterDateTo;
let tableCounterLabel;
let openingsTableBody;

let modalBackdrop;
let openingModal;
let btnCloseModal;
let btnCloseModalFooter;

let detailOpeningCode;
let detailRegister;
let detailBranch;
let detailStatusBadge;
let detailOpenedAt;
let detailUser;
let detailInitialAmount;
let detailClosingAmount;
let detailDifferenceAmount;
let detailClosedAt;
let detailNotes;

document.addEventListener("DOMContentLoaded", () => {
  initDomRefs();
  attachEventListeners();
  loadData();
});

function initDomRefs() {
  // Métricas
  metricTotalOpenings = document.getElementById("metricTotalOpenings");
  metricOpeningsToday = document.getElementById("metricOpeningsToday");
  metricOpenCashRegisters = document.getElementById("metricOpenCashRegisters");
  metricLastOpeningAmount = document.getElementById("metricLastOpeningAmount");
  metricLastOpeningInfo = document.getElementById("metricLastOpeningInfo");

  // Formulario
  fieldRegisterId = document.getElementById("fieldRegisterId");
  fieldBranch = document.getElementById("fieldBranch");
  fieldOpeningDate = document.getElementById("fieldOpeningDate");
  fieldOpeningTime = document.getElementById("fieldOpeningTime");
  fieldResponsibleId = document.getElementById("fieldResponsibleId");
  fieldInitialAmount = document.getElementById("fieldInitialAmount");
  fieldCurrency = document.getElementById("fieldCurrency");
  fieldAutoCode = document.getElementById("fieldAutoCode");
  fieldNotes = document.getElementById("fieldNotes");

  currentRegisterBadge = document.getElementById("currentRegisterBadge");
  currentStatusRegister = document.getElementById("currentStatusRegister");
  currentStatusBadge = document.getElementById("currentStatusBadge");
  currentStatusUser = document.getElementById("currentStatusUser");
  currentStatusAmount = document.getElementById("currentStatusAmount");
  currentStatusNotes = document.getElementById("currentStatusNotes");

  // Filtros
  filterText = document.getElementById("filterText");
  filterStatus = document.getElementById("filterStatus");
  filterRegister = document.getElementById("filterRegister");
  filterUser = document.getElementById("filterUser");
  filterDateFrom = document.getElementById("filterDateFrom");
  filterDateTo = document.getElementById("filterDateTo");

  // Tabla
  openingsTableBody = document.getElementById("openingsTableBody");
  tableCounterLabel = document.getElementById("tableCounterLabel");

  // Modal
  modalBackdrop = document.getElementById("modalBackdrop");
  openingModal = document.getElementById("openingModal");
  btnCloseModal = document.getElementById("btnCloseModal");
  btnCloseModalFooter = document.getElementById("btnCloseModalFooter");

  detailOpeningCode = document.getElementById("detailOpeningCode");
  detailRegister = document.getElementById("detailRegister");
  detailBranch = document.getElementById("detailBranch");
  detailStatusBadge = document.getElementById("detailStatusBadge");
  detailOpenedAt = document.getElementById("detailOpenedAt");
  detailUser = document.getElementById("detailUser");
  detailInitialAmount = document.getElementById("detailInitialAmount");
  detailClosingAmount = document.getElementById("detailClosingAmount");
  detailDifferenceAmount = document.getElementById("detailDifferenceAmount");
  detailClosedAt = document.getElementById("detailClosedAt");
  detailNotes = document.getElementById("detailNotes");
}

function attachEventListeners() {
  const form = document.getElementById("openCashForm");
  form.addEventListener("submit", handleSubmitOpening);

  fieldRegisterId.addEventListener("change", handleRegisterChange);

  // Filtros
  filterText.addEventListener("input", renderOpeningsTable);
  filterStatus.addEventListener("change", renderOpeningsTable);
  filterRegister.addEventListener("change", renderOpeningsTable);
  filterUser.addEventListener("change", renderOpeningsTable);
  filterDateFrom.addEventListener("change", renderOpeningsTable);
  filterDateTo.addEventListener("change", renderOpeningsTable);

  // Botón recargar data dummy
  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", loadData);
  }

  // Modal
  btnCloseModal.addEventListener("click", closeModal);
  btnCloseModalFooter.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
}

async function loadData() {
  try {
    const response = await fetch("data.json", { cache: "no-store" });
    const data = await response.json();

    cashRegisters = data.cashRegisters || [];
    openings = data.openings || [];
    users = data.users || [];

    populateRegisterSelects();
    populateUserSelects();
    setDefaultDateTime();
    recalcMetrics();
    renderOpeningsTable();
    updateCurrentStatusSummary();
  } catch (error) {
    console.error("Error cargando data.json:", error);
  }
}

function populateRegisterSelects() {
  // Formulario
  fieldRegisterId.innerHTML =
    '<option value="">Seleccione una caja...</option>';
  // Filtro
  filterRegister.innerHTML = '<option value="">Todas</option>';

  cashRegisters
    .filter((r) => r.is_active)
    .forEach((reg) => {
      const option = document.createElement("option");
      option.value = reg.id;
      option.textContent = `${reg.code} - ${reg.name}`;
      fieldRegisterId.appendChild(option);
    });

  cashRegisters.forEach((reg) => {
    const option = document.createElement("option");
    option.value = reg.id;
    option.textContent = `${reg.code} - ${reg.name}`;
    filterRegister.appendChild(option);
  });
}

function populateUserSelects() {
  fieldResponsibleId.innerHTML =
    '<option value="">Seleccione un usuario...</option>';
  filterUser.innerHTML = '<option value="">Todos</option>';

  users
    .filter((u) => u.is_active)
    .forEach((user) => {
      const label = `${user.full_name} (${user.username})`;

      const optForm = document.createElement("option");
      optForm.value = user.id;
      optForm.textContent = label;
      fieldResponsibleId.appendChild(optForm);

      const optFilter = document.createElement("option");
      optFilter.value = user.id;
      optFilter.textContent = label;
      filterUser.appendChild(optFilter);
    });
}

function setDefaultDateTime() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");

  fieldOpeningDate.value = `${yyyy}-${mm}-${dd}`;
  fieldOpeningTime.value = `${hh}:${mi}`;
}

function handleRegisterChange() {
  const selectedId = parseInt(fieldRegisterId.value, 10);
  if (!selectedId) {
    fieldBranch.value = "";
    currentRegisterBadge.textContent = "Sin selección";
    currentRegisterBadge.className = "badge badge-muted";
    updateCurrentStatusSummary();
    return;
  }

  const reg = cashRegisters.find((r) => r.id === selectedId);
  if (!reg) return;

  fieldBranch.value = reg.branch || "";
  currentRegisterBadge.textContent = `${reg.code} - ${reg.name}`;
  currentRegisterBadge.className = "badge badge-status-open";

  updateCurrentStatusSummary(selectedId);
}

/* ============= MÉTRICAS ============= */

function recalcMetrics() {
  metricTotalOpenings.textContent = openings.length.toString();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const openingsToday = openings.filter((o) => {
    const datePart = (o.opened_at || "").slice(0, 10);
    return datePart === todayStr;
  });
  metricOpeningsToday.textContent = openingsToday.length.toString();

  const openRegisters = new Set(
    openings.filter((o) => o.status === "OPEN").map((o) => o.cash_register_id)
  );
  metricOpenCashRegisters.textContent = openRegisters.size.toString();

  if (openings.length === 0) {
    metricLastOpeningAmount.textContent = "$0";
    metricLastOpeningInfo.textContent = "Sin aperturas registradas";
    return;
  }

  const sortedByOpened = [...openings].sort((a, b) => {
    const da = new Date(a.opened_at || 0).getTime();
    const db = new Date(b.opened_at || 0).getTime();
    return db - da;
  });
  const last = sortedByOpened[0];
  metricLastOpeningAmount.textContent = formatCurrency(
    last.initial_amount,
    last.currency || "CLP"
  );

  const reg = findRegisterById(last.cash_register_id);
  const user = findUserById(last.responsible_user_id);

  const regLabel = reg ? `${reg.code} - ${reg.name}` : "Caja desconocida";
  const userLabel = user ? user.full_name : "Usuario desconocido";

  metricLastOpeningInfo.textContent = `${regLabel} | ${userLabel}`;
}

/* ============= TABLA + FILTROS ============= */

function getFilteredOpenings() {
  let result = [...openings];

  const text = filterText.value.trim().toLowerCase();
  const status = filterStatus.value;
  const registerId = parseInt(filterRegister.value || "0", 10) || null;
  const userId = parseInt(filterUser.value || "0", 10) || null;
  const dateFrom = filterDateFrom.value || null;
  const dateTo = filterDateTo.value || null;

  if (text) {
    result = result.filter((o) => {
      const reg = findRegisterById(o.cash_register_id);
      const user = findUserById(o.responsible_user_id);
      const branch = (o.branch || "").toLowerCase();
      const code = (o.opening_code || "").toLowerCase();
      const regLabel = reg ? `${reg.code} ${reg.name}`.toLowerCase() : "";
      const userLabel = user
        ? `${user.full_name} ${user.username}`.toLowerCase()
        : "";
      return (
        code.includes(text) ||
        branch.includes(text) ||
        regLabel.includes(text) ||
        userLabel.includes(text)
      );
    });
  }

  if (status) {
    result = result.filter((o) => o.status === status);
  }

  if (registerId) {
    result = result.filter((o) => o.cash_register_id === registerId);
  }

  if (userId) {
    result = result.filter((o) => o.responsible_user_id === userId);
  }

  if (dateFrom) {
    result = result.filter((o) => {
      const datePart = (o.opened_at || "").slice(0, 10);
      return !datePart || datePart >= dateFrom;
    });
  }

  if (dateTo) {
    result = result.filter((o) => {
      const datePart = (o.opened_at || "").slice(0, 10);
      return !datePart || datePart <= dateTo;
    });
  }

  // Ordenar por fecha/hora desc
  result.sort((a, b) => {
    const da = new Date(a.opened_at || 0).getTime();
    const db = new Date(b.opened_at || 0).getTime();
    return db - da;
  });

  return result;
}

function renderOpeningsTable() {
  const filtered = getFilteredOpenings();
  openingsTableBody.innerHTML = "";

  if (!filtered.length) {
    openingsTableBody.innerHTML =
      '<tr><td colspan="8" class="table-empty-cell">No se encontraron aperturas para el filtro aplicado.</td></tr>';
    tableCounterLabel.textContent = "0 registros";
    return;
  }

  tableCounterLabel.textContent = `${filtered.length} registro(s)`;

  filtered.forEach((opening) => {
    const tr = document.createElement("tr");

    const codeCell = document.createElement("td");
    codeCell.textContent = opening.opening_code || "-";
    tr.appendChild(codeCell);

    const reg = findRegisterById(opening.cash_register_id);
    const regCell = document.createElement("td");
    regCell.textContent = reg ? `${reg.code} - ${reg.name}` : "-";
    tr.appendChild(regCell);

    const branchCell = document.createElement("td");
    branchCell.textContent = opening.branch || (reg ? reg.branch || "-" : "-");
    tr.appendChild(branchCell);

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDateTime(opening.opened_at);
    tr.appendChild(dateCell);

    const user = findUserById(opening.responsible_user_id);
    const userCell = document.createElement("td");
    userCell.textContent = user ? user.full_name : "-";
    tr.appendChild(userCell);

    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(
      opening.initial_amount,
      opening.currency || "CLP"
    );
    tr.appendChild(amountCell);

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    const { label, className } = getStatusBadgeConfig(opening.status);
    statusBadge.textContent = label;
    statusBadge.className = `badge ${className}`;
    statusCell.appendChild(statusBadge);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "cell-actions-header";
    const actionsWrapper = document.createElement("div");
    actionsWrapper.className = "table-actions";

    const btnDetail = document.createElement("button");
    btnDetail.type = "button";
    btnDetail.className = "btn btn-ghost";
    btnDetail.textContent = "Ver detalle";
    btnDetail.addEventListener("click", () => openDetailModal(opening.id));

    actionsWrapper.appendChild(btnDetail);
    actionsCell.appendChild(actionsWrapper);
    tr.appendChild(actionsCell);

    openingsTableBody.appendChild(tr);
  });
}

/* ============= ESTADO ACTUAL ============= */

function updateCurrentStatusSummary(selectedRegisterId) {
  const targetRegisterId =
    selectedRegisterId ||
    (fieldRegisterId.value ? parseInt(fieldRegisterId.value, 10) : null);

  let relevantOpenings = [...openings];
  if (targetRegisterId) {
    relevantOpenings = relevantOpenings.filter(
      (o) => o.cash_register_id === targetRegisterId
    );
  }

  if (!relevantOpenings.length) {
    currentStatusRegister.textContent = targetRegisterId
      ? "Sin movimientos para la caja seleccionada"
      : "Seleccione una caja para ver el estado";
    currentStatusBadge.textContent = "Sin datos";
    currentStatusBadge.className = "badge badge-muted";
    currentStatusUser.textContent = "-";
    currentStatusAmount.textContent = "$0";
    currentStatusNotes.textContent = "Sin comentarios.";
    return;
  }

  // Tomar la apertura más reciente
  const last = [...relevantOpenings].sort((a, b) => {
    const da = new Date(a.opened_at || 0).getTime();
    const db = new Date(b.opened_at || 0).getTime();
    return db - da;
  })[0];

  const reg = findRegisterById(last.cash_register_id);
  const user = findUserById(last.responsible_user_id);

  currentStatusRegister.textContent = reg
    ? `${reg.code} - ${reg.name}`
    : "Caja desconocida";

  const badgeCfg = getStatusBadgeConfig(last.status);
  currentStatusBadge.textContent = badgeCfg.label;
  currentStatusBadge.className = `badge ${badgeCfg.className}`;

  currentStatusUser.textContent = user ? user.full_name : "-";
  currentStatusAmount.textContent = formatCurrency(
    last.initial_amount,
    last.currency || "CLP"
  );
  currentStatusNotes.textContent = last.notes || "Sin comentarios.";
}

/* ============= NUEVA APERTURA (DUMMY) ============= */

function handleSubmitOpening(event) {
  event.preventDefault();

  const registerId = parseInt(fieldRegisterId.value || "0", 10);
  const branch = fieldBranch.value.trim();
  const openingDate = fieldOpeningDate.value;
  const openingTime = fieldOpeningTime.value;
  const responsibleId = parseInt(fieldResponsibleId.value || "0", 10);
  const currency = fieldCurrency.value || "CLP";
  const notes = fieldNotes.value.trim();

  const rawAmount = fieldInitialAmount.value
    .replace(/\./g, "")
    .replace(/,/g, "")
    .trim();
  const initialAmount = rawAmount ? parseInt(rawAmount, 10) : 0;

  if (
    !registerId ||
    !openingDate ||
    !openingTime ||
    !responsibleId ||
    !initialAmount
  ) {
    alert("Debe completar todos los campos obligatorios de la apertura.");
    return;
  }

  const openedAt = `${openingDate}T${openingTime}:00`;

  const newId = openings.length
    ? Math.max(...openings.map((o) => o.id)) + 1
    : 1;
  const newCode = fieldAutoCode.checked
    ? generateOpeningCode(openedAt, registerId, newId)
    : prompt("Ingrese código de apertura:", "") || `AP-MANUAL-${newId}`;

  const newOpening = {
    id: newId,
    opening_code: newCode,
    cash_register_id: registerId,
    branch: branch,
    opened_at: openedAt,
    responsible_user_id: responsibleId,
    initial_amount: initialAmount,
    currency: currency,
    status: "OPEN",
    closed_at: null,
    closing_user_id: null,
    closing_amount: null,
    difference_amount: null,
    notes: notes || "Apertura registrada manualmente desde el template.",
    tags: ["DUMMY_FRONTEND"],
  };

  openings.push(newOpening);
  recalcMetrics();
  renderOpeningsTable();
  updateCurrentStatusSummary(registerId);

  // Reset mínimo del formulario excepto caja seleccionada
  fieldOpeningTime.value = "";
  fieldInitialAmount.value = "";
  fieldNotes.value = "";
  setDefaultDateTime();

  alert("Apertura registrada (solo en memoria, dummy).");
}

/* ============= MODAL DETALLE ============= */

function openDetailModal(openingId) {
  const opening = openings.find((o) => o.id === openingId);
  if (!opening) return;

  const reg = findRegisterById(opening.cash_register_id);
  const user = findUserById(opening.responsible_user_id);

  detailOpeningCode.textContent = opening.opening_code || "-";
  detailRegister.textContent = reg ? `${reg.code} - ${reg.name}` : "-";
  detailBranch.textContent = opening.branch || (reg ? reg.branch || "-" : "-");

  const badgeCfg = getStatusBadgeConfig(opening.status);
  detailStatusBadge.textContent = badgeCfg.label;
  detailStatusBadge.className = `badge ${badgeCfg.className}`;

  detailOpenedAt.textContent = formatDateTime(opening.opened_at);
  detailUser.textContent = user ? user.full_name : "-";

  detailInitialAmount.textContent = formatCurrency(
    opening.initial_amount,
    opening.currency || "CLP"
  );
  detailClosingAmount.textContent = opening.closing_amount
    ? formatCurrency(opening.closing_amount, opening.currency || "CLP")
    : "No informado";

  if (opening.difference_amount == null) {
    detailDifferenceAmount.textContent = "No calculada";
  } else {
    const diffText = formatCurrency(
      opening.difference_amount,
      opening.currency || "CLP"
    );
    detailDifferenceAmount.textContent = diffText;
  }

  detailClosedAt.textContent = opening.closed_at
    ? formatDateTime(opening.closed_at)
    : "Sin cierre asociado";
  detailNotes.textContent = opening.notes || "Sin observaciones registradas.";

  modalBackdrop.classList.remove("is-hidden");
  openingModal.classList.remove("is-hidden");
}

function closeModal() {
  modalBackdrop.classList.add("is-hidden");
  openingModal.classList.add("is-hidden");
}

/* ============= HELPERS ============= */

function findRegisterById(id) {
  return cashRegisters.find((r) => r.id === id) || null;
}

function findUserById(id) {
  return users.find((u) => u.id === id) || null;
}

function getStatusBadgeConfig(status) {
  switch (status) {
    case "OPEN":
      return { label: "Abierta", className: "badge-status-open" };
    case "CLOSED":
      return { label: "Cerrada", className: "badge-status-closed" };
    case "CANCELED":
      return { label: "Anulada", className: "badge-status-canceled" };
    default:
      return { label: "Desconocido", className: "badge-muted" };
  }
}

function formatCurrency(amount, currency) {
  if (amount == null || isNaN(amount)) return "-";

  const formatter = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currency || "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

function formatDateTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "-";

  const optionsDate = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const optionsTime = {
    hour: "2-digit",
    minute: "2-digit",
  };

  const datePart = date.toLocaleDateString("es-CL", optionsDate);
  const timePart = date.toLocaleTimeString("es-CL", optionsTime);
  return `${datePart} ${timePart}`;
}

function generateOpeningCode(openedAt, registerId, id) {
  const date = openedAt ? new Date(openedAt) : new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const reg = findRegisterById(registerId);
  const regCode = reg ? reg.code || "CJ" : "CJ";

  const seq = String(id).padStart(4, "0");
  return `AP-${yyyy}${mm}${dd}-${regCode}-${seq}`;
}
