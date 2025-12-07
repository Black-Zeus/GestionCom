let customers = [];
let documents = [];

// Estado
let selectedCustomerId = null;

// DOM: cards
let emptyStateCard;
let customerHistoryCard;

// Filtros documentos
let dateFromFilter;
let dateToFilter;
let docTypeFilter;
let paymentConditionFilter;
let clearFiltersBtn;

// Cabecera cliente seleccionado
let selectedCustomerLabel;
let openCustomerSearchBtn;

// Perfil cliente
let detailTitle;
let detailSubtitle;
let detailBadges;
let summaryName;
let summaryTaxId;
let summaryContact;
let summaryEmail;
let summaryLocation;
let summaryRegistrationDate;

// Métricas cliente
let metricCustomerDocs;
let metricCustomerTotalAmount;
let metricCustomerAverageTicket;
let metricCustomerLastPurchase;

// Comportamiento
let mixCashBar;
let mixCashValue;
let mixCreditBar;
let mixCreditValue;
let freqLabel;

// Tabla documentos
let customerDocumentsTableBody;

// Modal búsqueda cliente
let customerSearchModal;
let customerSearchCloseBtn;
let customerSearchCancelBtn;
let customerSearchInput;
let customerSearchTypeFilter;
let customerSearchSegmentFilter;
let customerSearchTableBody;

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  // Cards
  emptyStateCard = document.getElementById("emptyStateCard");
  customerHistoryCard = document.getElementById("customerHistoryCard");

  // Cabecera cliente
  selectedCustomerLabel = document.getElementById("selectedCustomerLabel");
  openCustomerSearchBtn = document.getElementById("openCustomerSearchBtn");

  // Filtros documentos
  dateFromFilter = document.getElementById("dateFromFilter");
  dateToFilter = document.getElementById("dateToFilter");
  docTypeFilter = document.getElementById("docTypeFilter");
  paymentConditionFilter = document.getElementById("paymentConditionFilter");
  clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // Perfil
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
  metricCustomerDocs = document.getElementById("metricCustomerDocs");
  metricCustomerTotalAmount = document.getElementById(
    "metricCustomerTotalAmount"
  );
  metricCustomerAverageTicket = document.getElementById(
    "metricCustomerAverageTicket"
  );
  metricCustomerLastPurchase = document.getElementById(
    "metricCustomerLastPurchase"
  );

  // Comportamiento
  mixCashBar = document.getElementById("mixCashBar");
  mixCashValue = document.getElementById("mixCashValue");
  mixCreditBar = document.getElementById("mixCreditBar");
  mixCreditValue = document.getElementById("mixCreditValue");
  freqLabel = document.getElementById("freqLabel");

  // Tabla documentos
  customerDocumentsTableBody = document.querySelector(
    "#customerDocumentsTable tbody"
  );

  // Modal
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

  // Eventos: filtros documentos
  if (dateFromFilter) dateFromFilter.addEventListener("change", updateView);
  if (dateToFilter) dateToFilter.addEventListener("change", updateView);
  if (docTypeFilter) docTypeFilter.addEventListener("change", updateView);
  if (paymentConditionFilter)
    paymentConditionFilter.addEventListener("change", updateView);

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      resetDocumentFilters();
      updateView();
    });
  }

  // Eventos: modal cliente
  if (openCustomerSearchBtn) {
    openCustomerSearchBtn.addEventListener("click", () => {
      openCustomerSearchModal();
    });
  }

  if (customerSearchCloseBtn) {
    customerSearchCloseBtn.addEventListener("click", () => {
      closeCustomerSearchModal();
    });
  }

  if (customerSearchCancelBtn) {
    customerSearchCancelBtn.addEventListener("click", () => {
      closeCustomerSearchModal();
    });
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
      if (ev.target === customerSearchModal) {
        // clic fuera del diálogo
        closeCustomerSearchModal();
      }
    });
  }

  document.addEventListener("keydown", (ev) => {
    if (
      ev.key === "Escape" &&
      !customerSearchModal.classList.contains("is-hidden")
    ) {
      closeCustomerSearchModal();
    }
  });

  // Carga de datos
  loadData();
}

/* ----------------- Data ----------------- */

function loadData() {
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      customers = data.customers || [];
      documents = data.documents || [];

      updateSelectedCustomerLabel();
      renderCustomerSearchTable();
      updateView();
    })
    .catch((err) => {
      console.error("Error cargando data.json para historial por cliente", err);
      customers = [];
      documents = [];
      updateSelectedCustomerLabel();
      renderCustomerSearchTable();
      updateView();
    });
}

/* ----------------- Filtros documentos ----------------- */

function resetDocumentFilters() {
  if (dateFromFilter) dateFromFilter.value = "";
  if (dateToFilter) dateToFilter.value = "";
  if (docTypeFilter) docTypeFilter.value = "ALL";
  if (paymentConditionFilter) paymentConditionFilter.value = "ALL";
}

function filterDocumentsForSelectedCustomer() {
  if (!selectedCustomerId) return [];

  let list = documents.filter(
    (d) => Number(d.customer_id) === Number(selectedCustomerId)
  );

  const dateFrom = dateFromFilter ? dateFromFilter.value : "";
  const dateTo = dateToFilter ? dateToFilter.value : "";
  const docType = docTypeFilter ? docTypeFilter.value : "ALL";
  const paymentCondition = paymentConditionFilter
    ? paymentConditionFilter.value
    : "ALL";

  if (dateFrom || dateTo) {
    list = list.filter((doc) => {
      const dateStr = doc.document_date;
      if (!dateStr) return false;
      return isWithinDateRange(dateStr, dateFrom, dateTo);
    });
  }

  if (docType && docType !== "ALL") {
    list = list.filter(
      (doc) => (doc.document_type_code || "").toUpperCase() === docType
    );
  }

  if (paymentCondition && paymentCondition !== "ALL") {
    list = list.filter(
      (doc) => (doc.payment_condition || "").toUpperCase() === paymentCondition
    );
  }

  // Normalmente queremos solo documentos completados
  list = list.filter((doc) => {
    const st = (doc.status || "").toUpperCase();
    return st === "COMPLETED" || st === "PAID" || st === "CLOSED" || st === "";
  });

  return list;
}

/* ----------------- Vista principal ----------------- */

function updateView() {
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

  const docs = filterDocumentsForSelectedCustomer();

  if (emptyStateCard) emptyStateCard.classList.add("is-hidden");
  if (customerHistoryCard) customerHistoryCard.classList.remove("is-hidden");

  renderCustomerProfile(customer);
  renderCustomerSummary(docs);
  renderCustomerBehavior(docs);
  renderCustomerDocumentsTable(docs);
}

function showEmptyState() {
  if (emptyStateCard) emptyStateCard.classList.remove("is-hidden");
  if (customerHistoryCard) customerHistoryCard.classList.add("is-hidden");
}

/* ----------------- Cliente seleccionado (cabecera) ----------------- */

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
  selectedCustomerId = Number(customerId);
  updateSelectedCustomerLabel();
  closeCustomerSearchModal();
  updateView();
}

/* ----------------- Render: perfil cliente ----------------- */

function renderCustomerProfile(customer) {
  const displayName =
    customer.commercial_name || customer.legal_name || "Cliente sin nombre";

  if (detailTitle) detailTitle.textContent = displayName;
  if (detailSubtitle)
    detailSubtitle.textContent =
      "Análisis de compras y comportamiento de pago del cliente en el período seleccionado.";

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

/* ----------------- Render: resumen de compras ----------------- */

function renderCustomerSummary(docs) {
  const totalDocs = docs.length;
  const totalAmount = docs.reduce(
    (sum, d) => sum + (Number(d.total_amount) || 0),
    0
  );
  const avgTicket = totalDocs > 0 ? totalAmount / totalDocs : 0;

  const lastPurchase = docs
    .map((d) => d.document_date)
    .filter(Boolean)
    .sort()
    .slice(-1)[0];

  if (metricCustomerDocs) metricCustomerDocs.textContent = totalDocs.toString();
  if (metricCustomerTotalAmount)
    metricCustomerTotalAmount.textContent = formatCurrency(totalAmount);
  if (metricCustomerAverageTicket)
    metricCustomerAverageTicket.textContent = formatCurrency(avgTicket);
  if (metricCustomerLastPurchase)
    metricCustomerLastPurchase.textContent = lastPurchase || "-";
}

/* ----------------- Render: comportamiento ----------------- */

function renderCustomerBehavior(docs) {
  const totalDocs = docs.length;
  let cashCount = 0;
  let creditCount = 0;

  docs.forEach((d) => {
    const cond = (d.payment_condition || "").toUpperCase();
    if (cond === "CONTADO") cashCount += 1;
    else if (cond === "CREDITO") creditCount += 1;
  });

  const totalPayDocs = cashCount + creditCount;
  let cashPct = 0;
  let creditPct = 0;

  if (totalPayDocs > 0) {
    cashPct = Math.round((cashCount / totalPayDocs) * 100);
    creditPct = Math.round((creditCount / totalPayDocs) * 100);
  }

  if (mixCashBar) mixCashBar.style.width = cashPct + "%";
  if (mixCashValue) mixCashValue.textContent = cashPct + "%";

  if (mixCreditBar) mixCreditBar.style.width = creditPct + "%";
  if (mixCreditValue) mixCreditValue.textContent = creditPct + "%";

  if (freqLabel) {
    if (totalDocs < 2) {
      freqLabel.textContent =
        "Sin datos suficientes para calcular frecuencia (menos de 2 documentos).";
      return;
    }

    const dates = docs
      .map((d) => new Date(d.document_date))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b);

    if (dates.length < 2) {
      freqLabel.textContent = "Sin datos suficientes para calcular frecuencia.";
      return;
    }

    let totalDiff = 0;
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i] - dates[i - 1];
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      totalDiff += diffDays;
    }

    const avgDiff = totalDiff / Math.max(dates.length - 1, 1);
    const rounded = Math.round(avgDiff);

    let freqText = `Compra aproximadamente cada ${rounded} día(s).`;
    if (rounded <= 15) freqText += " Cliente de alta frecuencia.";
    else if (rounded <= 45) freqText += " Cliente de frecuencia media.";
    else freqText += " Cliente de baja frecuencia.";

    freqLabel.textContent = freqText;
  }
}

/* ----------------- Render: tabla documentos ----------------- */

function renderCustomerDocumentsTable(docs) {
  if (!customerDocumentsTableBody) return;

  customerDocumentsTableBody.innerHTML = "";

  if (!docs.length) {
    customerDocumentsTableBody.innerHTML =
      '<tr><td colspan="8" class="table-empty-cell">El cliente no tiene documentos en el período seleccionado.</td></tr>';
    return;
  }

  const sorted = [...docs].sort((a, b) => {
    const da = a.document_date || "";
    const db = b.document_date || "";
    if (da > db) return -1;
    if (da < db) return 1;
    return 0;
  });

  sorted.forEach((doc) => {
    const tr = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = doc.document_date || "";
    tr.appendChild(dateCell);

    const docCell = document.createElement("td");
    docCell.textContent = doc.document_number || "";
    tr.appendChild(docCell);

    const typeCell = document.createElement("td");
    typeCell.textContent = doc.document_type_label || "";
    tr.appendChild(typeCell);

    const condCell = document.createElement("td");
    const cond = (doc.payment_condition || "").toUpperCase();
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

    const branchCell = document.createElement("td");
    branchCell.innerHTML = `
      <div class="table-main-text">${escapeHtml(doc.warehouse_name || "")}</div>
      <div class="table-subtext">${escapeHtml(
        doc.cash_register_name || ""
      )}</div>
    `;
    tr.appendChild(branchCell);

    const sellerCell = document.createElement("td");
    sellerCell.textContent = doc.seller_name || "";
    tr.appendChild(sellerCell);

    const amountCell = document.createElement("td");
    amountCell.textContent = formatCurrency(doc.total_amount || 0);
    tr.appendChild(amountCell);

    const statusCell = document.createElement("td");
    statusCell.innerHTML = getDocumentStatusPill(doc.status);
    tr.appendChild(statusCell);

    customerDocumentsTableBody.appendChild(tr);
  });
}

/* ----------------- Helpers dominio ----------------- */

function getDocumentStatusPill(statusRaw) {
  const st = (statusRaw || "").toUpperCase();
  if (st === "COMPLETED" || st === "PAID" || st === "CLOSED") {
    return '<span class="status-pill doc-status-completed">● Completado</span>';
  }
  if (st === "CANCELLED" || st === "VOID") {
    return '<span class="status-pill doc-status-cancelled">● Anulado</span>';
  }
  if (st === "DRAFT") {
    return '<span class="status-pill doc-status-draft">● Borrador</span>';
  }
  return '<span class="status-pill doc-status-draft">● Desconocido</span>';
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

function isWithinDateRange(dateStr, fromStr, toStr) {
  const d = dateStr ? new Date(dateStr) : null;
  if (!d || Number.isNaN(d.getTime())) return false;

  if (fromStr) {
    const from = new Date(fromStr);
    if (!Number.isNaN(from.getTime()) && d < from) return false;
  }

  if (toStr) {
    const to = new Date(toStr);
    if (!Number.isNaN(to.getTime()) && d > to) return false;
  }

  return true;
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
