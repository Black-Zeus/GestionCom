let customers = [];
let receivables = [];

// Estado
let selectedCustomerId = null;

// Cards
let emptyStateCard;
let accountStatusCard;

// Parámetros
let cutoffDateFilter;
let viewFilter;
let clearFiltersBtn;

// Cliente seleccionado
let selectedCustomerLabel;
let openCustomerSearchBtn;

// Perfil / encabezado
let detailTitle;
let detailSubtitle;
let detailBadges;
let summaryName;
let summaryTaxId;
let summaryContact;
let summaryEmail;
let summaryLocation;
let summaryRegistrationDate;

// Métricas
let metricCreditLimit;
let metricUsedBalance;
let metricAvailableCredit;
let metricOverdueAmount;
let metricOpenDocs;

// Alertas
let alertOk;
let alertOverdue;
let alertOverdueAmount;

// Barra uso crédito
let creditUsageBarInner;
let creditUsagePercentLabel;

// Antigüedad de saldos
let agingTableBody;

// Tabla documentos
let accountDocumentsTableBody;

// Modal búsqueda cliente
let customerSearchModal;
let customerSearchCloseBtn;
let customerSearchCancelBtn;
let customerSearchInput;
let customerSearchTypeFilter;
let customerSearchSegmentFilter;
let customerSearchTableBody;

// Modal detalle documento
let documentDetailModal;
let documentDetailCloseBtn;
let documentDetailCloseFooterBtn;

let detailDocNumber;
let detailDocType;
let detailDocStatus;
let detailDocCustomer;
let detailDocTaxId;
let detailDocBranch;
let detailDocSeller;
let detailDocChannel;

let detailDocIssueDate;
let detailDocDueDate;
let detailDocPaymentCondition;
let detailDocOriginalAmount;
let detailDocBalanceAmount;
let detailDocDaysOverdue;

let detailItemsTableBody;
let detailPaymentsTableBody;
let detailDocObservations;

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  //console.log("[EstadoCuenta] initApp()");

  // Cards
  emptyStateCard = document.getElementById("emptyStateCard");
  accountStatusCard = document.getElementById("accountStatusCard");

  // Parámetros
  cutoffDateFilter = document.getElementById("cutoffDateFilter");
  viewFilter = document.getElementById("viewFilter");
  clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // Cliente seleccionado
  selectedCustomerLabel = document.getElementById("selectedCustomerLabel");
  openCustomerSearchBtn = document.getElementById("openCustomerSearchBtn");

  // Perfil / encabezado
  detailTitle = document.getElementById("detailTitle");
  detailSubtitle = document.getElementById("detailSubtitle");
  detailBadges = document.getElementById("detailBadges");

  summaryName = document.getElementById("summaryName");
  summaryTaxId = document.getElementById("summaryTaxId");
  summaryContact = document.getElementById("summaryContact");
  summaryEmail = document.getElementById("summaryEmail");
  summaryLocation = document.getElementById("summaryLocation");
  summaryRegistrationDate = document.getElementById("summaryRegistrationDate");

  // Métricas
  metricCreditLimit = document.getElementById("metricCreditLimit");
  metricUsedBalance = document.getElementById("metricUsedBalance");
  metricAvailableCredit = document.getElementById("metricAvailableCredit");
  metricOverdueAmount = document.getElementById("metricOverdueAmount");
  metricOpenDocs = document.getElementById("metricOpenDocs");

  // Alertas
  alertOk = document.getElementById("alertOk");
  alertOverdue = document.getElementById("alertOverdue");
  alertOverdueAmount = document.getElementById("alertOverdueAmount");

  // Barra de uso de crédito
  creditUsageBarInner = document.getElementById("creditUsageBarInner");
  creditUsagePercentLabel = document.getElementById("creditUsagePercentLabel");

  // Antigüedad
  agingTableBody = document.getElementById("agingTableBody");

  // Tabla documentos
  accountDocumentsTableBody = document.querySelector(
    "#accountDocumentsTable tbody"
  );
  //console.log( "[EstadoCuenta] accountDocumentsTableBody existe?", !!accountDocumentsTableBody );

  // Modal búsqueda cliente
  customerSearchModal = document.getElementById("customerSearchModal");
  customerSearchCloseBtn = document.getElementById("customerSearchCloseBtn");
  customerSearchCancelBtn = document.getElementById("customerSearchCancelBtn");
  customerSearchInput = document.getElementById("customerSearchInput");
  customerSearchTypeFilter = document.getElementById(
    "customerSearchTypeFilter"
  );
  customerSearchSegmentFilter = document.getElementById(
    "customerSearchSegmentFilter"
  );
  customerSearchTableBody = document.querySelector(
    "#customerSearchTable tbody"
  );

  // Modal detalle documento
  documentDetailModal = document.getElementById("documentDetailModal");
  documentDetailCloseBtn = document.getElementById("documentDetailCloseBtn");
  documentDetailCloseFooterBtn = document.getElementById(
    "documentDetailCloseFooterBtn"
  );

  detailDocNumber = document.getElementById("detailDocNumber");
  detailDocType = document.getElementById("detailDocType");
  detailDocStatus = document.getElementById("detailDocStatus");
  detailDocCustomer = document.getElementById("detailDocCustomer");
  detailDocTaxId = document.getElementById("detailDocTaxId");
  detailDocBranch = document.getElementById("detailDocBranch");
  detailDocSeller = document.getElementById("detailDocSeller");
  detailDocChannel = document.getElementById("detailDocChannel");

  detailDocIssueDate = document.getElementById("detailDocIssueDate");
  detailDocDueDate = document.getElementById("detailDocDueDate");
  detailDocPaymentCondition = document.getElementById(
    "detailDocPaymentCondition"
  );
  detailDocOriginalAmount = document.getElementById("detailDocOriginalAmount");
  detailDocBalanceAmount = document.getElementById("detailDocBalanceAmount");
  detailDocDaysOverdue = document.getElementById("detailDocDaysOverdue");

  detailItemsTableBody = document.querySelector("#detailItemsTable tbody");
  detailPaymentsTableBody = document.querySelector(
    "#detailPaymentsTable tbody"
  );
  detailDocObservations = document.getElementById("detailDocObservations");

  // Eventos parámetros
  if (cutoffDateFilter) cutoffDateFilter.addEventListener("change", updateView);
  if (viewFilter) viewFilter.addEventListener("change", updateView);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      resetFilters();
      updateView();
    });
  }

  // Eventos cliente
  if (openCustomerSearchBtn) {
    openCustomerSearchBtn.addEventListener("click", openCustomerSearchModal);
  }

  // Eventos modal búsqueda cliente
  if (customerSearchCloseBtn) {
    customerSearchCloseBtn.addEventListener("click", closeCustomerSearchModal);
  }
  if (customerSearchCancelBtn) {
    customerSearchCancelBtn.addEventListener("click", closeCustomerSearchModal);
  }

  if (customerSearchInput) {
    customerSearchInput.addEventListener("input", renderCustomerSearchTable);
  }
  if (customerSearchTypeFilter) {
    customerSearchTypeFilter.addEventListener(
      "change",
      renderCustomerSearchTable
    );
  }
  if (customerSearchSegmentFilter) {
    customerSearchSegmentFilter.addEventListener(
      "change",
      renderCustomerSearchTable
    );
  }

  if (customerSearchModal) {
    customerSearchModal.addEventListener("click", (ev) => {
      if (ev.target === customerSearchModal) closeCustomerSearchModal();
    });
  }

  // Eventos modal detalle documento
  if (documentDetailCloseBtn) {
    documentDetailCloseBtn.addEventListener("click", closeDocumentDetailModal);
  }
  if (documentDetailCloseFooterBtn) {
    documentDetailCloseFooterBtn.addEventListener(
      "click",
      closeDocumentDetailModal
    );
  }
  if (documentDetailModal) {
    documentDetailModal.addEventListener("click", (ev) => {
      if (ev.target === documentDetailModal) closeDocumentDetailModal();
    });
  }

  // Escape para cerrar modales
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      if (
        customerSearchModal &&
        !customerSearchModal.classList.contains("is-hidden")
      ) {
        closeCustomerSearchModal();
      }
      if (
        documentDetailModal &&
        !documentDetailModal.classList.contains("is-hidden")
      ) {
        closeDocumentDetailModal();
      }
    }
  });

  // Cargar datos mock
  loadData();
}

/* ----------------- Data ----------------- */

function loadData() {
  //console.log("[EstadoCuenta] loadData() -> leyendo data.json");
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      customers = data.customers || [];
      receivables = data.receivables || [];

      //console.log( `[EstadoCuenta] Data cargada: ${customers.length} clientes, ${receivables.length} docs` );

      updateSelectedCustomerLabel();
      renderCustomerSearchTable();
      setDefaultCutoff();
      updateView();
    })
    .catch((err) => {
      console.error("Error cargando data.json para estado de cuenta", err);
      customers = [];
      receivables = [];
      updateSelectedCustomerLabel();
      renderCustomerSearchTable();
      updateView();
    });
}

function setDefaultCutoff() {
  if (!cutoffDateFilter) return;
  if (cutoffDateFilter.value) return;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  cutoffDateFilter.value = `${yyyy}-${mm}-${dd}`;
}

/* ----------------- Filtros ----------------- */

function resetFilters() {
  setDefaultCutoff();
  if (viewFilter) viewFilter.value = "OPEN";
}

function getCutoffDate() {
  const val = cutoffDateFilter ? cutoffDateFilter.value : "";
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterReceivablesForCustomer() {
  if (!selectedCustomerId) return [];

  const cutoff = getCutoffDate();
  const view = viewFilter ? viewFilter.value : "OPEN";

  let list = receivables.filter(
    (r) => Number(r.customer_id) === Number(selectedCustomerId)
  );

  if (view === "OPEN") {
    list = list.filter((r) => isOpenReceivable(r, cutoff));
  } else if (view === "OVERDUE") {
    list = list.filter((r) => isOverdueReceivable(r, cutoff));
  } else if (view === "ALL") {
    // histórico completo
  }

  return list;
}

function isOpenReceivable(r, cutoff) {
  const st = (r.status || "").toUpperCase();
  const balance = Number(r.balance_amount) || 0;
  const effectiveStatus =
    st === "PAID" || st === "CANCELLED" || st === "CLOSED" ? "CLOSED" : "OPEN";

  if (effectiveStatus !== "OPEN") return false;
  if (balance <= 0) return false;

  if (!cutoff) return true;

  const issueDate = r.issue_date ? new Date(r.issue_date) : null;
  if (issueDate && issueDate > cutoff) return false;

  return true;
}

function isOverdueReceivable(r, cutoff) {
  if (!cutoff) return false;
  if (!isOpenReceivable(r, cutoff)) return false;

  const dueDate = r.due_date ? new Date(r.due_date) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) return false;

  return dueDate < cutoff;
}

/* ----------------- Vista principal ----------------- */

function updateView() {
  //console.log( "[EstadoCuenta] updateView() – cliente seleccionado:", selectedCustomerId );
  if (!selectedCustomerId) {
    showEmptyState();
    return;
  }

  const customer = customers.find(
    (c) => Number(c.id) === Number(selectedCustomerId)
  );
  if (!customer) {
    showEmptyState();
    return;
  }

  const cutoff = getCutoffDate();
  const docs = filterReceivablesForCustomer();

  if (emptyStateCard) emptyStateCard.classList.add("is-hidden");
  if (accountStatusCard) accountStatusCard.classList.remove("is-hidden");

  renderCustomerProfile(customer, cutoff);
  renderAccountSummary(customer, cutoff, docs);
  renderAging(cutoff, docs);
  renderDocumentsTable(cutoff, docs);
}

function showEmptyState() {
  if (emptyStateCard) emptyStateCard.classList.remove("is-hidden");
  if (accountStatusCard) accountStatusCard.classList.add("is-hidden");
}

/* ----------------- Cliente seleccionado ----------------- */

function updateSelectedCustomerLabel() {
  if (!selectedCustomerLabel) return;

  if (!selectedCustomerId) {
    selectedCustomerLabel.textContent = "Ningún cliente seleccionado";
    return;
  }

  const customer = customers.find(
    (c) => Number(c.id) === Number(selectedCustomerId)
  );
  if (!customer) {
    selectedCustomerLabel.textContent = "Cliente no encontrado";
    return;
  }

  const name =
    customer.commercial_name || customer.legal_name || `Cliente ${customer.id}`;
  const parts = [];

  if (customer.customer_code) parts.push(customer.customer_code);
  parts.push(name);
  if (customer.tax_id) parts.push(`(${customer.tax_id})`);

  selectedCustomerLabel.textContent = parts.join(" - ");
}

/* ----------------- Modal búsqueda de clientes ----------------- */

function openCustomerSearchModal() {
  if (!customerSearchModal) return;
  customerSearchModal.classList.remove("is-hidden");

  if (customerSearchInput) {
    customerSearchInput.focus();
    customerSearchInput.select();
  }

  renderCustomerSearchTable();
}

function closeCustomerSearchModal() {
  if (!customerSearchModal) return;
  customerSearchModal.classList.add("is-hidden");
}

function renderCustomerSearchTable() {
  if (!customerSearchTableBody) return;

  customerSearchTableBody.innerHTML = "";

  if (!customers.length) {
    customerSearchTableBody.innerHTML =
      '<tr><td colspan="6" class="table-empty-cell">No hay clientes disponibles.</td></tr>';
    return;
  }

  const term = customerSearchInput
    ? customerSearchInput.value.trim().toLowerCase()
    : "";
  const typeFilter = customerSearchTypeFilter
    ? customerSearchTypeFilter.value
    : "ALL";
  const segmentFilter = customerSearchSegmentFilter
    ? customerSearchSegmentFilter.value
    : "ALL";

  let filtered = [...customers];

  if (term) {
    filtered = filtered.filter((c) => {
      const name = (c.commercial_name || c.legal_name || "").toLowerCase();
      const taxId = (c.tax_id || "").toLowerCase();
      const code = (c.customer_code || "").toLowerCase();
      return name.includes(term) || taxId.includes(term) || code.includes(term);
    });
  }

  if (typeFilter && typeFilter !== "ALL") {
    filtered = filtered.filter(
      (c) => (c.customer_type || "").toUpperCase() === typeFilter
    );
  }

  if (segmentFilter && segmentFilter !== "ALL") {
    filtered = filtered.filter((c) => (c.segment || "") === segmentFilter);
  }

  if (!filtered.length) {
    customerSearchTableBody.innerHTML =
      '<tr><td colspan="6" class="table-empty-cell">No hay clientes que coincidan con los filtros.</td></tr>';
    return;
  }

  filtered
    .sort((a, b) => {
      const na = (a.commercial_name || a.legal_name || "").toLowerCase();
      const nb = (b.commercial_name || b.legal_name || "").toLowerCase();
      return na.localeCompare(nb);
    })
    .forEach((c) => {
      const tr = document.createElement("tr");

      const codeCell = document.createElement("td");
      codeCell.textContent = c.customer_code || `#${c.id}`;
      tr.appendChild(codeCell);

      const nameCell = document.createElement("td");
      nameCell.innerHTML = `
        <div class="table-main-text">${escapeHtml(
          c.commercial_name || c.legal_name || "Sin nombre"
        )}</div>
      `;
      tr.appendChild(nameCell);

      const taxCell = document.createElement("td");
      taxCell.textContent = c.tax_id || "";
      tr.appendChild(taxCell);

      const segCell = document.createElement("td");
      segCell.textContent = c.segment || "-";
      tr.appendChild(segCell);

      const locCell = document.createElement("td");
      const locParts = [];
      if (c.city) locParts.push(c.city);
      if (c.region) locParts.push(c.region);
      locCell.textContent = locParts.join(" / ") || "-";
      tr.appendChild(locCell);

      const actionCell = document.createElement("td");
      actionCell.className = "cell-center";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary btn-sm";
      btn.textContent = "Seleccionar";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectCustomer(c.id);
      });
      actionCell.appendChild(btn);
      tr.appendChild(actionCell);

      tr.addEventListener("click", () => selectCustomer(c.id));

      customerSearchTableBody.appendChild(tr);
    });
}

function selectCustomer(customerId) {
  //console.log("[EstadoCuenta] selectCustomer()", customerId);
  selectedCustomerId = Number(customerId);
  updateSelectedCustomerLabel();
  closeCustomerSearchModal();
  updateView();
}

/* ----------------- Perfil cliente ----------------- */

function renderCustomerProfile(customer, cutoff) {
  const displayName =
    customer.commercial_name || customer.legal_name || "Cliente sin nombre";

  if (detailTitle) detailTitle.textContent = displayName;

  if (detailSubtitle && cutoff) {
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    detailSubtitle.textContent =
      "Resumen de crédito y documentos pendientes a la fecha de corte " +
      cutoffStr +
      ".";
  }

  if (detailBadges) {
    detailBadges.innerHTML = "";

    if (customer.segment) {
      const seg = document.createElement("span");
      seg.className = "badge-segment";
      seg.textContent = `Segmento: ${customer.segment}`;
      detailBadges.appendChild(seg);
    }

    if (customer.customer_type) {
      const typeSpan = document.createElement("span");
      typeSpan.className = "badge-soft badge-soft-muted";
      const label =
        customer.customer_type === "COMPANY" ? "Empresa" : "Persona Natural";
      typeSpan.textContent = label;
      detailBadges.appendChild(typeSpan);
    }
  }

  if (summaryName) summaryName.textContent = displayName;
  if (summaryTaxId) summaryTaxId.textContent = customer.tax_id || "";
  if (summaryContact)
    summaryContact.textContent = customer.contact_person || "";
  if (summaryEmail) summaryEmail.textContent = customer.email || "";

  const locParts = [];
  if (customer.city) locParts.push(customer.city);
  if (customer.region) locParts.push(customer.region);
  if (summaryLocation)
    summaryLocation.textContent = locParts.join(" / ") || "-";

  if (summaryRegistrationDate) {
    summaryRegistrationDate.textContent = customer.registration_date
      ? customer.registration_date
      : "-";
  }
}

/* ----------------- Resumen financiero ----------------- */

function renderAccountSummary(customer, cutoff, docsFilteredView) {
  const creditLimit = Number(customer.credit_limit) || 0;

  const openDocsAll = receivables.filter((r) => isOpenReceivable(r, cutoff));

  const openDocsCustomer = openDocsAll.filter(
    (r) => Number(r.customer_id) === Number(customer.id)
  );

  const usedBalance = openDocsCustomer.reduce(
    (sum, r) => sum + (Number(r.balance_amount) || 0),
    0
  );

  const overdueDocsCustomer = openDocsCustomer.filter((r) =>
    isOverdueReceivable(r, cutoff)
  );
  const overdueAmount = overdueDocsCustomer.reduce(
    (sum, r) => sum + (Number(r.balance_amount) || 0),
    0
  );

  const availableCredit = Math.max(creditLimit - usedBalance, 0);
  const openDocsCount = openDocsCustomer.length;

  if (metricCreditLimit)
    metricCreditLimit.textContent = formatCurrency(creditLimit);
  if (metricUsedBalance)
    metricUsedBalance.textContent = formatCurrency(usedBalance);
  if (metricAvailableCredit)
    metricAvailableCredit.textContent = formatCurrency(availableCredit);
  if (metricOverdueAmount)
    metricOverdueAmount.textContent = formatCurrency(overdueAmount);
  if (metricOpenDocs) metricOpenDocs.textContent = openDocsCount.toString();

  // Alertas
  if (alertOk && alertOverdue && alertOverdueAmount) {
    if (overdueAmount > 0) {
      alertOk.classList.add("is-hidden");
      alertOverdue.classList.remove("is-hidden");
      alertOverdueAmount.textContent = formatCurrency(overdueAmount);
    } else {
      alertOverdue.classList.add("is-hidden");
      alertOk.classList.remove("is-hidden");
    }
  }

  // Barra de uso de crédito
  let usagePercent = 0;
  if (creditLimit > 0) {
    usagePercent = Math.round((usedBalance / creditLimit) * 100);
    if (usagePercent > 999) usagePercent = 999;
  }

  if (creditUsageBarInner) {
    const normalized = Math.max(0, Math.min(usagePercent, 100));
    creditUsageBarInner.style.width = normalized + "%";
  }

  if (creditUsagePercentLabel) {
    creditUsagePercentLabel.textContent = usagePercent + "%";
  }
}

/* ----------------- Antigüedad de saldos ----------------- */

function renderAging(cutoff, docs) {
  if (!agingTableBody) return;
  agingTableBody.innerHTML = "";

  if (!cutoff || !docs.length) {
    agingTableBody.innerHTML =
      '<tr><td colspan="3" class="table-empty-cell">Sin documentos para calcular antigüedad.</td></tr>';
    return;
  }

  const buckets = [
    { key: "0_30", label: "0 - 30 días", from: 0, to: 30 },
    { key: "31_60", label: "31 - 60 días", from: 31, to: 60 },
    { key: "61_90", label: "61 - 90 días", from: 61, to: 90 },
    { key: "91_120", label: "91 - 120 días", from: 91, to: 120 },
    { key: "120p", label: "120+ días", from: 121, to: Infinity },
  ];

  const totals = {};
  buckets.forEach((b) => {
    totals[b.key] = { amount: 0, count: 0 };
  });

  docs.forEach((r) => {
    const balance = Number(r.balance_amount) || 0;
    if (balance <= 0) return;
    const days = getDaysOverdue(r, cutoff);
    if (days <= 0) return;

    const bucket = buckets.find((b) => days >= b.from && days <= b.to);
    if (!bucket) return;

    totals[bucket.key].amount += balance;
    totals[bucket.key].count += 1;
  });

  const hasData = buckets.some((b) => totals[b.key].count > 0);
  if (!hasData) {
    agingTableBody.innerHTML =
      '<tr><td colspan="3" class="table-empty-cell">No hay saldos vencidos a la fecha de corte.</td></tr>';
    return;
  }

  buckets.forEach((b) => {
    const t = totals[b.key];
    if (t.count === 0) return;

    const tr = document.createElement("tr");

    const tramoCell = document.createElement("td");
    tramoCell.textContent = b.label;
    tr.appendChild(tramoCell);

    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(t.amount);
    tr.appendChild(amountCell);

    const countCell = document.createElement("td");
    countCell.textContent = t.count.toString();
    tr.appendChild(countCell);

    agingTableBody.appendChild(tr);
  });
}

/* ----------------- Tabla de documentos ----------------- */

function renderDocumentsTable(cutoff, docs) {
  //console.log( "[EstadoCuenta] renderDocumentsTable() – docs:", docs.length, "tbody existe?", !!accountDocumentsTableBody );

  if (!accountDocumentsTableBody) {
    console.warn(
      '[EstadoCuenta] No se encontró "#accountDocumentsTable tbody". Revisa el id de la tabla en el HTML.'
    );
    return;
  }

  accountDocumentsTableBody.innerHTML = "";

  if (!docs.length) {
    accountDocumentsTableBody.innerHTML =
      '<tr><td colspan="10" class="table-empty-cell">No hay documentos para el cliente con los parámetros seleccionados.</td></tr>';
    return;
  }

  const sorted = [...docs].sort((a, b) => {
    const da = a.issue_date || "";
    const db = b.issue_date || "";
    if (da > db) return -1;
    if (da < db) return 1;
    return 0;
  });

  sorted.forEach((r) => {
    const tr = document.createElement("tr");

    const issueCell = document.createElement("td");
    issueCell.textContent = r.issue_date || "";
    tr.appendChild(issueCell);

    const dueCell = document.createElement("td");
    dueCell.textContent = r.due_date || "";
    tr.appendChild(dueCell);

    const docCell = document.createElement("td");
    docCell.textContent = r.document_number || "";
    tr.appendChild(docCell);

    const typeCell = document.createElement("td");
    typeCell.textContent = r.document_type_label || "";
    tr.appendChild(typeCell);

    const condCell = document.createElement("td");
    const cond = (r.payment_condition || "").toUpperCase();
    if (cond === "CREDITO") {
      condCell.innerHTML =
        '<span class="badge-payment badge-payment-credit">Crédito</span>';
    } else if (cond === "CONTADO") {
      condCell.innerHTML =
        '<span class="badge-payment badge-payment-cash">Contado</span>';
    } else {
      condCell.innerHTML =
        '<span class="badge-soft badge-soft-muted">N/A</span>';
    }
    tr.appendChild(condCell);

    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(r.original_amount || 0);
    tr.appendChild(amountCell);

    const balanceCell = document.createElement("td");
    balanceCell.textContent = formatCurrency(r.balance_amount || 0);
    tr.appendChild(balanceCell);

    const daysCell = document.createElement("td");
    const days = cutoff ? getDaysOverdue(r, cutoff) : 0;
    daysCell.textContent = days > 0 ? String(days) : "0";
    tr.appendChild(daysCell);

    const statusCell = document.createElement("td");
    statusCell.innerHTML = getReceivableStatusPill(r, cutoff);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "cell-center";

    const btnDetail = document.createElement("button");
    btnDetail.type = "button";
    btnDetail.className = "btn btn-link btn-xs";
    btnDetail.textContent = "Ver detalle";

    //console.log("[EstadoCuenta] creando botón 'Ver detalle' para doc", r.id);

    btnDetail.addEventListener("click", (ev) => {
      ev.stopPropagation();
      //console.log("[EstadoCuenta] click en Ver detalle – doc:", r.id);
      openDocumentDetailModal(r);
    });

    actionsCell.appendChild(btnDetail);
    tr.appendChild(actionsCell);

    tr.addEventListener("dblclick", () => {
      //console.log("[EstadoCuenta] doble clic en fila – doc:", r.id);
      openDocumentDetailModal(r);
    });

    accountDocumentsTableBody.appendChild(tr);
  });
}

/* ----------------- Helpers dominio ----------------- */

function getDaysOverdue(r, cutoff) {
  if (!cutoff) return 0;
  const dueDate = r.due_date ? new Date(r.due_date) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) return 0;

  const diffMs = cutoff - dueDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getReceivableStatusPill(r, cutoff) {
  const st = (r.status || "").toUpperCase();
  const balance = Number(r.balance_amount) || 0;

  const isOpen = isOpenReceivable(r, cutoff);
  const isOverdue = isOverdueReceivable(r, cutoff);

  if (!isOpen || balance <= 0 || st === "PAID") {
    return '<span class="status-pill doc-status-completed">● Pagado</span>';
  }

  if (isOverdue) {
    return '<span class="status-pill doc-status-cancelled">● Vencido</span>';
  }

  return '<span class="status-pill doc-status-draft">● Pendiente</span>';
}

/* ----------------- Modal detalle documento ----------------- */

function openDocumentDetailModal(doc) {
  //console.log("[EstadoCuenta] openDocumentDetailModal()", doc && doc.id);

  if (!documentDetailModal) {
    console.warn("[EstadoCuenta] documentDetailModal no existe en el DOM");
    return;
  }

  // Por seguridad: cerrar el modal de búsqueda si estuviera abierto
  if (
    customerSearchModal &&
    !customerSearchModal.classList.contains("is-hidden")
  ) {
    closeCustomerSearchModal();
  }

  // Forzar visibilidad del modal de detalle
  documentDetailModal.classList.remove("is-hidden");
  documentDetailModal.style.display = "flex";
  documentDetailModal.style.opacity = "1";
  documentDetailModal.style.pointerEvents = "auto";
  documentDetailModal.style.zIndex = "999"; // o el valor que estés usando para otros modales

  const customer = customers.find(
    (c) => Number(c.id) === Number(doc.customer_id)
  );

  if (detailDocNumber) detailDocNumber.textContent = doc.document_number || "-";
  if (detailDocType) detailDocType.textContent = doc.document_type_label || "-";

  if (detailDocStatus) {
    const st = (doc.status || "").toUpperCase();
    if (st === "OPEN") detailDocStatus.textContent = "Abierto";
    else if (st === "PAID") detailDocStatus.textContent = "Pagado";
    else if (st === "CANCELLED") detailDocStatus.textContent = "Anulado";
    else if (st === "APPLIED") detailDocStatus.textContent = "Aplicado";
    else detailDocStatus.textContent = st || "-";
  }

  if (detailDocCustomer)
    detailDocCustomer.textContent =
      (customer && (customer.commercial_name || customer.legal_name)) || "-";
  if (detailDocTaxId)
    detailDocTaxId.textContent = (customer && customer.tax_id) || "-";

  if (detailDocBranch) detailDocBranch.textContent = doc.branch_name || "-";
  if (detailDocSeller) detailDocSeller.textContent = doc.seller_name || "-";
  if (detailDocChannel) detailDocChannel.textContent = doc.sales_channel || "-";

  if (detailDocIssueDate)
    detailDocIssueDate.textContent = doc.issue_date || "-";
  if (detailDocDueDate) detailDocDueDate.textContent = doc.due_date || "-";

  if (detailDocPaymentCondition) {
    const cond = (doc.payment_condition || "").toUpperCase();
    if (cond === "CREDITO") detailDocPaymentCondition.textContent = "Crédito";
    else if (cond === "CONTADO")
      detailDocPaymentCondition.textContent = "Contado";
    else detailDocPaymentCondition.textContent = cond || "-";
  }

  if (detailDocOriginalAmount)
    detailDocOriginalAmount.textContent = formatCurrency(
      doc.original_amount || 0
    );
  if (detailDocBalanceAmount)
    detailDocBalanceAmount.textContent = formatCurrency(
      doc.balance_amount || 0
    );

  if (detailDocDaysOverdue) {
    const cutoff = getCutoffDate();
    const days = cutoff ? getDaysOverdue(doc, cutoff) : 0;
    detailDocDaysOverdue.textContent = days > 0 ? String(days) : "0";
  }

  if (detailDocObservations) {
    detailDocObservations.textContent = doc.observations || "-";
  }

  // Ítems
  if (detailItemsTableBody) {
    detailItemsTableBody.innerHTML = "";
    const items = Array.isArray(doc.line_items) ? doc.line_items : [];

    if (!items.length) {
      detailItemsTableBody.innerHTML =
        '<tr><td colspan="5" class="table-empty-cell">El documento no registra detalle de ítems.</td></tr>';
    } else {
      items.forEach((it) => {
        const tr = document.createElement("tr");

        const codeCell = document.createElement("td");
        codeCell.textContent = it.product_code || "";
        tr.appendChild(codeCell);

        const nameCell = document.createElement("td");
        nameCell.textContent = it.product_name || "";
        tr.appendChild(nameCell);

        const qtyCell = document.createElement("td");
        qtyCell.textContent = it.quantity != null ? String(it.quantity) : "";
        tr.appendChild(qtyCell);

        const unitCell = document.createElement("td");
        unitCell.textContent = formatCurrency(it.unit_price || 0);
        tr.appendChild(unitCell);

        const totalCell = document.createElement("td");
        totalCell.textContent = formatCurrency(it.line_total || 0);
        tr.appendChild(totalCell);

        detailItemsTableBody.appendChild(tr);
      });
    }
  }

  // Pagos
  if (detailPaymentsTableBody) {
    detailPaymentsTableBody.innerHTML = "";
    const pays = Array.isArray(doc.payments) ? doc.payments : [];

    if (!pays.length) {
      detailPaymentsTableBody.innerHTML =
        '<tr><td colspan="4" class="table-empty-cell">No se registran pagos ni movimientos asociados.</td></tr>';
    } else {
      pays.forEach((p) => {
        const tr = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = p.date || "";
        tr.appendChild(dateCell);

        const typeCell = document.createElement("td");
        typeCell.textContent = p.type || "";
        tr.appendChild(typeCell);

        const refCell = document.createElement("td");
        refCell.textContent = p.reference || "";
        tr.appendChild(refCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = formatCurrency(p.amount || 0);
        tr.appendChild(amountCell);

        detailPaymentsTableBody.appendChild(tr);
      });
    }
  }
}

function closeDocumentDetailModal() {
  if (!documentDetailModal) return;

  documentDetailModal.classList.add("is-hidden");
  documentDetailModal.style.display = "none";
  documentDetailModal.style.opacity = "";
  documentDetailModal.style.pointerEvents = "";
  documentDetailModal.style.zIndex = "";
}

/* ----------------- Helpers generales ----------------- */

function formatCurrency(value) {
  const n = Number(value);
  if (!isFinite(n)) return "$ 0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
