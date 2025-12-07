let customers = [];
let creditConfigs = [];
let receivables = [];
let exceptions = [];

let selectedCustomerId = null;

// DOM refs
let creditCustomersTableBody;
let creditCustomersCard;
let creditDetailCard;
let filtersCard;
let backToListBtn;

let metricCreditTotalClients;
let metricCreditExposure;
let metricCreditUsed;
let metricCreditBlocked;

let searchFilter;
let riskFilter;
let creditStatusFilter;
let clearFiltersBtn;

let detailTitle;
let detailSubtitle;
let detailBadges;
let detailEmptyState;
let detailContent;

let summaryName;
let summaryTaxId;
let summaryContact;
let summaryEmail;

let creditConfigList;
let receivablesTableBody;
let exceptionsTableBody;

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  // Cards
  creditCustomersCard = document.getElementById("creditCustomersCard");
  creditDetailCard = document.getElementById("creditDetailCard");
  filtersCard = document.getElementById("filtersCard");
  backToListBtn = document.getElementById("backToListBtn");

  // Metrics
  metricCreditTotalClients = document.getElementById(
    "metricCreditTotalClients"
  );
  metricCreditExposure = document.getElementById("metricCreditExposure");
  metricCreditUsed = document.getElementById("metricCreditUsed");
  metricCreditBlocked = document.getElementById("metricCreditBlocked");

  // Filters
  searchFilter = document.getElementById("searchFilter");
  riskFilter = document.getElementById("riskFilter");
  creditStatusFilter = document.getElementById("creditStatusFilter");
  clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // Table
  creditCustomersTableBody = document.querySelector(
    "#creditCustomersTable tbody"
  );

  // Detail
  detailTitle = document.getElementById("detailTitle");
  detailSubtitle = document.getElementById("detailSubtitle");
  detailBadges = document.getElementById("detailBadges");
  detailEmptyState = document.getElementById("detailEmptyState");
  detailContent = document.getElementById("detailContent");

  summaryName = document.getElementById("summaryName");
  summaryTaxId = document.getElementById("summaryTaxId");
  summaryContact = document.getElementById("summaryContact");
  summaryEmail = document.getElementById("summaryEmail");

  creditConfigList = document.getElementById("creditConfigList");
  receivablesTableBody = document.querySelector("#receivablesTable tbody");
  exceptionsTableBody = document.querySelector("#exceptionsTable tbody");

  // Events
  if (backToListBtn) {
    backToListBtn.addEventListener("click", () => {
      exitDetailMode();
    });
  }

  if (searchFilter) {
    searchFilter.addEventListener("input", () => {
      renderCreditCustomersTable();
    });
  }

  if (riskFilter) {
    riskFilter.addEventListener("change", () => {
      renderCreditCustomersTable();
    });
  }

  if (creditStatusFilter) {
    creditStatusFilter.addEventListener("change", () => {
      renderCreditCustomersTable();
    });
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      resetFilters();
      renderCreditCustomersTable();
    });
  }

  loadData();
}

function loadData() {
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      customers = data.customers || [];
      creditConfigs = data.customer_credit_config || [];
      receivables = data.accounts_receivable || [];
      exceptions = data.credit_limit_exceptions || [];

      updateMetrics();
      renderCreditCustomersTable();
    })
    .catch((err) => {
      console.error("Error al cargar data.json del módulo de créditos", err);
      customers = [];
      creditConfigs = [];
      receivables = [];
      exceptions = [];
      updateMetrics();
      if (creditCustomersTableBody) {
        creditCustomersTableBody.innerHTML =
          '<tr><td colspan="10" class="table-empty-cell">No fue posible cargar los datos.</td></tr>';
      }
    });
}

/* ----------------- Métricas ----------------- */

function updateMetrics() {
  const uniqueCustomerIds = new Set(
    creditConfigs.map((cfg) => cfg.customer_id)
  );
  const totalCreditClients = uniqueCustomerIds.size;

  const totalExposure = creditConfigs.reduce(
    (sum, cfg) => sum + (cfg.credit_limit || 0),
    0
  );
  const totalUsed = creditConfigs.reduce(
    (sum, cfg) => sum + (cfg.used_credit || 0),
    0
  );

  let blockedCount = 0;
  uniqueCustomerIds.forEach((customerId) => {
    const info = getCustomerCreditInfo(customerId);
    if (info.status === "BLOQUEADO") {
      blockedCount += 1;
    }
  });

  if (metricCreditTotalClients) {
    metricCreditTotalClients.textContent = totalCreditClients;
  }
  if (metricCreditExposure) {
    metricCreditExposure.textContent = formatCurrency(totalExposure);
  }
  if (metricCreditUsed) {
    metricCreditUsed.textContent = formatCurrency(totalUsed);
  }
  if (metricCreditBlocked) {
    metricCreditBlocked.textContent = blockedCount;
  }
}

/* ----------------- Filtros ----------------- */

function resetFilters() {
  if (searchFilter) searchFilter.value = "";
  if (riskFilter) riskFilter.value = "ALL";
  if (creditStatusFilter) creditStatusFilter.value = "ALL";
}

function applyFilters(configList) {
  let list = [...configList];

  const term = searchFilter ? searchFilter.value.trim().toLowerCase() : "";
  const risk = riskFilter ? riskFilter.value : "ALL";
  const statusFilter = creditStatusFilter ? creditStatusFilter.value : "ALL";

  if (term) {
    list = list.filter((cfg) => {
      const customer = customers.find((c) => c.id === cfg.customer_id);
      if (!customer) return false;
      const displayName = (
        customer.commercial_name ||
        customer.legal_name ||
        ""
      ).toLowerCase();
      const taxId = (customer.tax_id || "").toLowerCase();
      return displayName.includes(term) || taxId.includes(term);
    });
  }

  if (risk && risk !== "ALL") {
    list = list.filter((cfg) => (cfg.risk_level || "").toUpperCase() === risk);
  }

  if (statusFilter && statusFilter !== "ALL") {
    list = list.filter((cfg) => {
      const info = getCustomerCreditInfo(cfg.customer_id);
      return info.status === statusFilter;
    });
  }

  return list;
}

/* ----------------- Tabla clientes con crédito ----------------- */

function renderCreditCustomersTable() {
  if (!creditCustomersTableBody) return;

  if (!creditConfigs.length) {
    creditCustomersTableBody.innerHTML =
      '<tr><td colspan="10" class="table-empty-cell">No hay clientes con configuración de crédito.</td></tr>';
    return;
  }

  const filteredConfigs = applyFilters(creditConfigs);

  if (!filteredConfigs.length) {
    creditCustomersTableBody.innerHTML =
      '<tr><td colspan="10" class="table-empty-cell">No hay resultados que coincidan con los filtros.</td></tr>';
    return;
  }

  creditCustomersTableBody.innerHTML = "";

  filteredConfigs.forEach((cfg) => {
    const customer = customers.find((c) => c.id === cfg.customer_id);
    if (!customer) return;

    const info = getCustomerCreditInfo(customer.id);

    const tr = document.createElement("tr");
    tr.className = "table-row-clickable";

    const codeCell = document.createElement("td");
    codeCell.textContent = customer.customer_code || "-";
    tr.appendChild(codeCell);

    const nameCell = document.createElement("td");
    const displayName =
      customer.commercial_name || customer.legal_name || "Sin nombre";
    nameCell.innerHTML = `
      <div class="table-main-text">${escapeHtml(displayName)}</div>
      <div class="table-subtext">${escapeHtml(customer.city || "")}${
      customer.city && customer.region ? " / " : ""
    }${escapeHtml(customer.region || "")}</div>
    `;
    tr.appendChild(nameCell);

    const taxIdCell = document.createElement("td");
    taxIdCell.textContent = customer.tax_id || "";
    tr.appendChild(taxIdCell);

    const riskCell = document.createElement("td");
    const riskLevel = (cfg.risk_level || "MEDIUM").toUpperCase();
    riskCell.innerHTML = `<span class="${getRiskBadgeClass(
      riskLevel
    )}">${riskLevel}</span>`;
    tr.appendChild(riskCell);

    const limitCell = document.createElement("td");
    limitCell.textContent = formatCurrency(cfg.credit_limit || 0);
    tr.appendChild(limitCell);

    const usedCell = document.createElement("td");
    usedCell.textContent = formatCurrency(cfg.used_credit || 0);
    tr.appendChild(usedCell);

    const availableCell = document.createElement("td");
    availableCell.textContent = formatCurrency(cfg.available_credit || 0);
    tr.appendChild(availableCell);

    const overdueCell = document.createElement("td");
    overdueCell.textContent = formatCurrency(info.totalOverdue);
    tr.appendChild(overdueCell);

    const statusCell = document.createElement("td");
    statusCell.className = "cell-center";
    statusCell.innerHTML = getCreditStatusPill(info.status);
    tr.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "cell-center";
    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.className = "btn btn-secondary btn-sm";
    btnView.textContent = "Ver Detalle";
    btnView.addEventListener("click", (e) => {
      e.stopPropagation();
      enterDetailMode(customer.id);
    });
    actionsCell.appendChild(btnView);
    tr.appendChild(actionsCell);

    tr.addEventListener("click", () => enterDetailMode(customer.id));

    creditCustomersTableBody.appendChild(tr);
  });
}

/* ----------------- Detalle cliente crédito ----------------- */

function enterDetailMode(customerId) {
  selectedCustomerId = customerId;

  if (filtersCard) filtersCard.classList.add("is-hidden");
  if (creditCustomersCard) creditCustomersCard.classList.add("is-hidden");
  if (creditDetailCard) creditDetailCard.classList.remove("is-hidden");

  renderCreditDetail();
}

function exitDetailMode() {
  selectedCustomerId = null;

  if (filtersCard) filtersCard.classList.remove("is-hidden");
  if (creditCustomersCard) creditCustomersCard.classList.remove("is-hidden");
  if (creditDetailCard) creditDetailCard.classList.add("is-hidden");
}

function renderCreditDetail() {
  if (!selectedCustomerId) return;

  const customer = customers.find((c) => c.id === selectedCustomerId);
  const cfg = creditConfigs.find((c) => c.customer_id === selectedCustomerId);
  const info = getCustomerCreditInfo(selectedCustomerId);
  const customerReceivables = receivables.filter(
    (r) => r.customer_id === selectedCustomerId
  );
  const customerExceptions = exceptions.filter(
    (ex) => ex.customer_id === selectedCustomerId
  );

  const displayName = customer
    ? customer.commercial_name || customer.legal_name || "Cliente sin nombre"
    : "Cliente sin nombre";

  if (detailTitle) {
    detailTitle.textContent = displayName;
  }

  if (detailSubtitle) {
    detailSubtitle.textContent =
      "Resumen de configuración de crédito, exposición y documentos por cobrar.";
  }

  if (detailBadges) {
    detailBadges.innerHTML = "";
    if (cfg && cfg.risk_level) {
      const riskSpan = document.createElement("span");
      riskSpan.className = getRiskBadgeClass(cfg.risk_level);
      riskSpan.textContent = `Riesgo ${cfg.risk_level.toUpperCase()}`;
      detailBadges.appendChild(riskSpan);
    }

    const statusSpan = document.createElement("span");
    statusSpan.innerHTML = getCreditStatusPill(info.status);
    detailBadges.appendChild(statusSpan);
  }

  const hasConfig = !!cfg;
  if (!hasConfig) {
    if (detailEmptyState) detailEmptyState.classList.remove("is-hidden");
    if (detailContent) detailContent.classList.add("is-hidden");
    return;
  }

  if (detailEmptyState) detailEmptyState.classList.add("is-hidden");
  if (detailContent) detailContent.classList.remove("is-hidden");

  if (summaryName) summaryName.textContent = displayName;
  if (summaryTaxId && customer)
    summaryTaxId.textContent = customer.tax_id || "";
  if (summaryContact && customer) {
    summaryContact.textContent = customer.contact_person || "";
  }
  if (summaryEmail && customer) summaryEmail.textContent = customer.email || "";

  // Configuración de crédito
  if (creditConfigList) {
    creditConfigList.innerHTML = "";

    const items = [
      {
        label: "Límite de crédito",
        value: formatCurrency(cfg.credit_limit || 0),
      },
      {
        label: "Crédito utilizado",
        value: formatCurrency(cfg.used_credit || 0),
      },
      {
        label: "Crédito disponible",
        value: formatCurrency(cfg.available_credit || 0),
      },
      {
        label: "Plazo de pago (días)",
        value: cfg.payment_terms_days ?? "-",
      },
      {
        label: "Días de gracia",
        value: cfg.grace_period_days ?? "-",
      },
      {
        label: "Monto máximo en mora",
        value: formatCurrency(cfg.max_overdue_amount || 0),
      },
      {
        label: "Multa por mora (%)",
        value: cfg.penalty_rate != null ? cfg.penalty_rate + " %" : "-",
      },
      {
        label: "Monto vencido actual",
        value: formatCurrency(info.totalOverdue),
      },
      {
        label: "Bloqueo automático por mora",
        value: cfg.auto_block_on_overdue ? "Sí" : "No",
      },
    ];

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "credit-config-row";
      row.innerHTML = `
        <div class="credit-config-label">${escapeHtml(item.label)}</div>
        <div class="credit-config-value">${escapeHtml(String(item.value))}</div>
      `;
      creditConfigList.appendChild(row);
    });
  }

  // Documentos por cobrar
  if (receivablesTableBody) {
    receivablesTableBody.innerHTML = "";

    if (!customerReceivables.length) {
      receivablesTableBody.innerHTML =
        '<tr><td colspan="7" class="table-empty-cell">Este cliente no tiene documentos por cobrar.</td></tr>';
    } else {
      customerReceivables.forEach((doc) => {
        const row = document.createElement("tr");

        const docCell = document.createElement("td");
        docCell.textContent = doc.document_number || "";
        row.appendChild(docCell);

        const typeCell = document.createElement("td");
        typeCell.textContent = doc.document_type || "";
        row.appendChild(typeCell);

        const issueCell = document.createElement("td");
        issueCell.textContent = formatDate(doc.issue_date);
        row.appendChild(issueCell);

        const dueCell = document.createElement("td");
        dueCell.textContent = formatDate(doc.due_date);
        row.appendChild(dueCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = formatCurrency(doc.original_amount || 0);
        row.appendChild(amountCell);

        const balanceCell = document.createElement("td");
        balanceCell.textContent = formatCurrency(doc.balance_amount || 0);
        row.appendChild(balanceCell);

        const statusCell = document.createElement("td");
        statusCell.innerHTML = getDocumentStatusBadge(
          doc.status,
          doc.days_overdue
        );
        row.appendChild(statusCell);

        receivablesTableBody.appendChild(row);
      });
    }
  }

  // Excepciones de límite
  if (exceptionsTableBody) {
    exceptionsTableBody.innerHTML = "";

    if (!customerExceptions.length) {
      exceptionsTableBody.innerHTML =
        '<tr><td colspan="5" class="table-empty-cell">No hay excepciones de límite registradas.</td></tr>';
    } else {
      customerExceptions.forEach((ex) => {
        const row = document.createElement("tr");

        const reasonCell = document.createElement("td");
        reasonCell.textContent = ex.reason || "";
        row.appendChild(reasonCell);

        const amountCell = document.createElement("td");
        amountCell.textContent = formatCurrency(ex.exception_amount || 0);
        row.appendChild(amountCell);

        const newLimitCell = document.createElement("td");
        newLimitCell.textContent = formatCurrency(ex.new_effective_limit || 0);
        row.appendChild(newLimitCell);

        const expiresCell = document.createElement("td");
        expiresCell.textContent = ex.is_temporary
          ? formatDate(ex.expires_at)
          : "Permanente";
        row.appendChild(expiresCell);

        const statusCell = document.createElement("td");
        statusCell.innerHTML = getExceptionStatusBadge(ex.exception_status);
        row.appendChild(statusCell);

        exceptionsTableBody.appendChild(row);
      });
    }
  }
}

/* ----------------- Helpers dominio crédito ----------------- */

function getCustomerCreditInfo(customerId) {
  const cfg = creditConfigs.find((c) => c.customer_id === customerId);
  const customerReceivables = receivables.filter(
    (r) => r.customer_id === customerId
  );

  let totalOverdue = 0;
  customerReceivables.forEach((doc) => {
    const status = (doc.status || "").toUpperCase();
    if (status === "OVERDUE" || status === "IN_COLLECTION") {
      totalOverdue += doc.balance_amount || 0;
    }
  });

  let status = "NORMAL";
  if (totalOverdue > 0) {
    status = "EN_MORA";
  }

  if (cfg && cfg.auto_block_on_overdue) {
    const maxOverdue = cfg.max_overdue_amount || 0;
    if (totalOverdue > maxOverdue && maxOverdue > 0) {
      status = "BLOQUEADO";
    }
  }

  return {
    config: cfg || null,
    totalOverdue,
    status,
  };
}

function getRiskBadgeClass(riskLevelRaw) {
  const lvl = (riskLevelRaw || "").toUpperCase();
  switch (lvl) {
    case "LOW":
      return "badge-risk badge-risk-low";
    case "HIGH":
      return "badge-risk badge-risk-high";
    case "MEDIUM":
    default:
      return "badge-risk badge-risk-medium";
  }
}

function getCreditStatusPill(status) {
  const st = (status || "").toUpperCase();
  switch (st) {
    case "BLOQUEADO":
      return '<span class="status-pill status-pill-credit-blocked">● Bloqueado</span>';
    case "EN_MORA":
      return '<span class="status-pill status-pill-credit-overdue">● En mora</span>';
    case "NORMAL":
    default:
      return '<span class="status-pill status-pill-credit-normal">● Normal</span>';
  }
}

function getDocumentStatusBadge(statusRaw, daysOverdue) {
  const st = (statusRaw || "").toUpperCase();
  if (st === "PAID") {
    return '<span class="badge-soft badge-soft-success">Pagado</span>';
  }
  if (st === "OVERDUE" || st === "IN_COLLECTION") {
    const label =
      typeof daysOverdue === "number" && daysOverdue > 0
        ? `Vencido (${daysOverdue} días)`
        : "Vencido";
    return `<span class="badge-soft badge-soft-danger">${label}</span>`;
  }
  return '<span class="badge-soft badge-soft-muted">Pendiente</span>';
}

function getExceptionStatusBadge(statusRaw) {
  const st = (statusRaw || "").toUpperCase();
  switch (st) {
    case "ACTIVE":
      return '<span class="badge-soft badge-soft-primary">Activa</span>';
    case "EXPIRED":
      return '<span class="badge-soft badge-soft-muted">Expirada</span>';
    case "REVOKED":
      return '<span class="badge-soft badge-soft-danger">Revocada</span>';
    default:
      return '<span class="badge-soft badge-soft-muted">Desconocido</span>';
  }
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
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
