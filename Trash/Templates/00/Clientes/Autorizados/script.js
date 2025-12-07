let customers = [];
let authorizedUsers = [];
let selectedCustomerId = null;
let isDetailMode = false;

// Referencias DOM
let customersTableBody;
let customersCard;
let filtersCard;
let detailCard;
let backToListBtn;

let metricTotalClients;
let metricActiveClients;
let metricCreditClients;
let metricInactiveClients;

let searchInput;
let statusFilter;
let typeFilter;
let regionFilter;
let cityFilter;

let detailTitle;
let detailSubtitle;
let detailBadges;
let detailEmptyState;
let detailEmptyText;
let detailContent;

let summaryName;
let summaryTaxId;
let summaryContact;
let summaryEmail;
let summaryInternalNotes;
let authorizedUsersTableBody;

let userModal;
let modalBackdrop;
let userModalTitle;
let userForm;

let fieldUserId;
let fieldAuthorizedName;
let fieldAuthorizedTaxId;
let fieldPosition;
let fieldEmail;
let fieldPhone;
let fieldAuthorizationLevel;
let fieldMaxAmount;
let fieldIsPrimary;
let fieldIsActive;
let fieldInternalNotes;

let btnAddUser;


const currencyFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

document.addEventListener("DOMContentLoaded", () => {
  // tablas y vistas
  customersTableBody = document.querySelector("#customersTable tbody");
  customersCard = document.getElementById("customersCard");
  filtersCard = document.getElementById("filtersCard");
  detailCard = document.getElementById("detailCard");
  backToListBtn = document.getElementById("backToListBtn");

  // métricas
  metricTotalClients = document.getElementById("metricTotalClients");
  metricActiveClients = document.getElementById("metricActiveClients");
  metricCreditClients = document.getElementById("metricCreditClients");
  metricInactiveClients = document.getElementById("metricInactiveClients");

  // filtros
  searchInput = document.getElementById("searchInput");
  statusFilter = document.getElementById("statusFilter");
  typeFilter = document.getElementById("typeFilter");
  regionFilter = document.getElementById("regionFilter");
  cityFilter = document.getElementById("cityFilter");

  // detalle
  detailTitle = document.getElementById("detailTitle");
  detailSubtitle = document.getElementById("detailSubtitle");
  detailBadges = document.getElementById("detailBadges");
  detailEmptyState = document.getElementById("detailEmptyState");
  detailEmptyText = document.getElementById("detailEmptyText");
  detailContent = document.getElementById("detailContent");

  summaryName = document.getElementById("summaryName");
  summaryTaxId = document.getElementById("summaryTaxId");
  summaryContact = document.getElementById("summaryContact");
  summaryEmail = document.getElementById("summaryEmail");
  summaryInternalNotes = document.getElementById("summaryInternalNotes");
  authorizedUsersTableBody = document.querySelector("#authorizedUsersTable tbody");

  // modal
  userModal = document.getElementById("userModal");
  modalBackdrop = document.getElementById("modalBackdrop");
  userModalTitle = document.getElementById("userModalTitle");
  userForm = document.getElementById("userForm");

  fieldUserId = document.getElementById("fieldUserId");
  fieldAuthorizedName = document.getElementById("fieldAuthorizedName");
  fieldAuthorizedTaxId = document.getElementById("fieldAuthorizedTaxId");
  fieldPosition = document.getElementById("fieldPosition");
  fieldEmail = document.getElementById("fieldEmail");
  fieldPhone = document.getElementById("fieldPhone");
  fieldAuthorizationLevel = document.getElementById("fieldAuthorizationLevel");
  fieldMaxAmount = document.getElementById("fieldMaxAmount");
  fieldIsPrimary = document.getElementById("fieldIsPrimary");
  fieldIsActive = document.getElementById("fieldIsActive");
fieldInternalNotes = document.getElementById("fieldInternalNotes");

  btnAddUser = document.getElementById("btnAddUser");

  // listeners
  btnAddUser.addEventListener("click", () => openUserModal());
  document.getElementById("btnCloseModal").addEventListener("click", closeUserModal);
  document.getElementById("btnCancelModal").addEventListener("click", (e) => {
    e.preventDefault();
    closeUserModal();
  });

  userForm.addEventListener("submit", handleUserFormSubmit);

  backToListBtn.addEventListener("click", () => setView("LIST"));

  searchInput.addEventListener("input", renderCustomersTable);
  statusFilter.addEventListener("change", renderCustomersTable);
  typeFilter.addEventListener("change", renderCustomersTable);
  regionFilter.addEventListener("change", renderCustomersTable);
  cityFilter.addEventListener("change", renderCustomersTable);

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "ALL";
    typeFilter.value = "ALL";
    regionFilter.value = "ALL";
    cityFilter.value = "ALL";
    renderCustomersTable();
  });

  setView("LIST");
  loadData();
});

/* ---- Cambiar de vista LIST / DETAIL ---- */

function setView(mode) {
  isDetailMode = mode === "DETAIL";

  if (isDetailMode) {
    customersCard.classList.add("is-hidden");
    filtersCard.classList.add("is-hidden");
    detailCard.classList.remove("is-hidden");
  } else {
    detailCard.classList.add("is-hidden");
    customersCard.classList.remove("is-hidden");
    filtersCard.classList.remove("is-hidden");

    // reset mensaje detalle
    detailTitle.textContent = "Personas Autorizadas";
    detailSubtitle.textContent =
      "Seleccione un cliente para ver y administrar sus personas autorizadas.";
    detailBadges.innerHTML = "";
    detailEmptyState.classList.remove("is-hidden");
    detailContent.classList.add("is-hidden");
    btnAddUser.disabled = true;
    btnAddUser.title = "";
  }
}

/* ---- Cargar datos ---- */

function loadData() {
  fetch("data.json")
    .then((r) => r.json())
    .then((data) => {
      customers = data.customers || [];
      authorizedUsers = data.customer_authorized_users || [];
      updateMetrics();
      populateRegionAndCityFilters();
      renderCustomersTable();
    })
    .catch((err) => {
      console.error("Error al cargar data.json", err);
      customers = [];
      authorizedUsers = [];
      updateMetrics();
      customersTableBody.innerHTML =
        '<tr><td colspan="8" class="table-empty-cell">No fue posible cargar los datos.</td></tr>';
    });
}

/* ---- Métricas ---- */

function updateMetrics() {
  const total = customers.length;
  const active = customers.filter((c) => c.status_id === 1 || c.is_active === true).length;
  const credit = customers.filter((c) => c.is_credit_customer).length;
  const inactive = total - active;

  metricTotalClients.textContent = total;
  metricActiveClients.textContent = active;
  metricCreditClients.textContent = credit;
  metricInactiveClients.textContent = inactive;
}

/* ---- Filtros región/ciudad ---- */

function populateRegionAndCityFilters() {
  const regions = new Set();
  const cities = new Set();

  customers.forEach((c) => {
    if (c.region) regions.add(c.region);
    if (c.city) cities.add(c.city);
  });

  regionFilter.innerHTML = '<option value="ALL">Región</option>';
  Array.from(regions)
    .sort()
    .forEach((region) => {
      const opt = document.createElement("option");
      opt.value = region;
      opt.textContent = region;
      regionFilter.appendChild(opt);
    });

  cityFilter.innerHTML = '<option value="ALL">Ciudad</option>';
  Array.from(cities)
    .sort()
    .forEach((city) => {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      cityFilter.appendChild(opt);
    });
}

/* ---- Tabla clientes ---- */

function renderCustomersTable() {
  const filtered = getFilteredCustomers();
  customersTableBody.innerHTML = "";

  if (!filtered.length) {
    customersTableBody.innerHTML =
      '<tr><td colspan="8" class="table-empty-cell">No se encontraron clientes para el filtro aplicado.</td></tr>';
    return;
  }

  filtered.forEach((customer) => {
    const tr = document.createElement("tr");

    const codeCell = document.createElement("td");
    codeCell.textContent = customer.customer_code || "-";
    tr.appendChild(codeCell);

    const typeCell = document.createElement("td");
    typeCell.textContent = customer.customer_type === "COMPANY" ? "Empresa" : "Persona";
    tr.appendChild(typeCell);

    const rutCell = document.createElement("td");
    rutCell.textContent = customer.tax_id || "-";
    tr.appendChild(rutCell);

    const nameCell = document.createElement("td");
    const legal = escapeHtml(customer.legal_name || "");
    const commercial = escapeHtml(customer.commercial_name || "");
    nameCell.innerHTML = legal
      ? `${legal}<div class="table-subtext">${commercial}</div>`
      : commercial || "-";
    tr.appendChild(nameCell);

    const cityRegionCell = document.createElement("td");
    const city = escapeHtml(customer.city || "-");
    const region = escapeHtml(customer.region || "");
    cityRegionCell.innerHTML = `${city}${
      region ? `<div class="table-subtext">${region}</div>` : ""
    }`;
    tr.appendChild(cityRegionCell);

    const statusCell = document.createElement("td");
    const isActive = customer.status_id === 1 || customer.is_active === true;
    statusCell.innerHTML = isActive
      ? '<span class="status-pill status-pill-active">● Activo</span>'
      : '<span class="status-pill status-pill-inactive">● Inactivo</span>';
    tr.appendChild(statusCell);

    const authorizedCell = document.createElement("td");
    const count = authorizedUsers.filter(
      (u) => u.customer_id === customer.id && u.is_active
    ).length;
    authorizedCell.innerHTML = `<span class="badge-small">${count} activo(s)</span>`;
    tr.appendChild(authorizedCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "cell-center";
    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.className = "btn btn-secondary btn-sm";
    btnView.textContent = "Ver Personas";
    btnView.addEventListener("click", (e) => {
      e.stopPropagation();
      enterDetailMode(customer);
    });
    actionsCell.appendChild(btnView);
    tr.appendChild(actionsCell);

    tr.addEventListener("click", () => enterDetailMode(customer));

    customersTableBody.appendChild(tr);
  });
}

function getFilteredCustomers() {
  const text = searchInput.value.trim().toLowerCase();
  const statusValue = statusFilter.value;
  const typeValue = typeFilter.value;
  const regionValue = regionFilter.value;
  const cityValue = cityFilter.value;

  return customers.filter((c) => {
    if (text) {
      const blob = [
        c.customer_code,
        c.tax_id,
        c.legal_name,
        c.commercial_name,
        c.contact_person
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!blob.includes(text)) return false;
    }

    const isActive = c.status_id === 1 || c.is_active === true;
    if (statusValue === "ACTIVE" && !isActive) return false;
    if (statusValue === "INACTIVE" && isActive) return false;

    if (typeValue !== "ALL" && c.customer_type !== typeValue) return false;
    if (regionValue !== "ALL" && c.region !== regionValue) return false;
    if (cityValue !== "ALL" && c.city !== cityValue) return false;

    return true;
  });
}

/* ---- Cambio a detalle ---- */

function enterDetailMode(customer) {
  selectedCustomerId = customer.id;
  setView("DETAIL");
  renderDetailPanel(customer);
}

/* ---- Panel detalle personas autorizadas ---- */

function renderDetailPanel(customer) {
  if (!customer) {
    detailEmptyState.classList.remove("is-hidden");
    detailContent.classList.add("is-hidden");
    detailEmptyText.textContent =
      "No hay cliente seleccionado. Seleccione un cliente de la tabla de clientes.";
    btnAddUser.disabled = true;
    btnAddUser.title = "";
    return;
  }

  detailTitle.textContent = "Personas Autorizadas del Cliente";
  detailBadges.innerHTML = "";

  const typeBadge = document.createElement("span");
  typeBadge.className = "badge badge-muted";
  typeBadge.textContent =
    customer.customer_type === "COMPANY" ? "Empresa" : "Persona Natural";
  detailBadges.appendChild(typeBadge);

  if (customer.is_credit_customer) {
    const creditBadge = document.createElement("span");
    creditBadge.className = "badge badge-level-full";
    creditBadge.textContent = "Cliente con crédito";
    detailBadges.appendChild(creditBadge);
  }

  const isActive = customer.status_id === 1 || customer.is_active === true;
  const isCompany = customer.customer_type === "COMPANY";

  const statusBadge = document.createElement("span");
  statusBadge.className = "badge";
  statusBadge.textContent = isActive ? "Activo" : "Inactivo";
  statusBadge.style.backgroundColor = isActive ? "#dcfce7" : "#fee2e2";
  statusBadge.style.color = isActive ? "#166534" : "#b91c1c";
  detailBadges.appendChild(statusBadge);

  // Botón agregar persona: deshabilitado si cliente inactivo o no es empresa
  if (!isActive || !isCompany) {
    btnAddUser.disabled = true;
    btnAddUser.title =
      "No es posible agregar personas autorizadas a un cliente inactivo o que no es empresa.";
  } else {
    btnAddUser.disabled = false;
    btnAddUser.title = "";
  }

  const displayName =
    customer.commercial_name || customer.legal_name || "Cliente sin nombre";

  if (!isCompany) {
    detailSubtitle.textContent =
      "Este cliente es persona natural. El submódulo de Personas Autorizadas aplica solo a clientes empresariales.";
    detailEmptyState.classList.remove("is-hidden");
    detailContent.classList.add("is-hidden");
    detailEmptyText.textContent =
      "Seleccione un cliente de tipo Empresa para gestionar personas autorizadas.";
    return;
  }

  detailSubtitle.textContent =
    "Defina y mantenga las personas autorizadas para operar a nombre de este cliente.";

  detailEmptyState.classList.add("is-hidden");
  detailContent.classList.remove("is-hidden");

  summaryName.textContent = displayName;
  summaryTaxId.textContent = customer.tax_id || "-";
  summaryContact.textContent = customer.contact_person || "-";
  summaryEmail.textContent = customer.email || "-";
  summaryInternalNotes.textContent = customer.internal_notes || "-";

  renderAuthorizedUsers(customer);
}

/* ---- Tabla personas autorizadas ---- */

function renderAuthorizedUsers(customer) {
  const users = authorizedUsers.filter((u) => u.customer_id === customer.id);
  authorizedUsersTableBody.innerHTML = "";

  if (!users.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 9;
    cell.className = "table-empty-cell";
    cell.textContent = "No hay personas autorizadas registradas para este cliente.";
    row.appendChild(cell);
    authorizedUsersTableBody.appendChild(row);
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("tr");

    const notes = user.internal_notes ? escapeHtml(user.internal_notes) : "";

    const nameCell = document.createElement("td");
    nameCell.innerHTML = `
      <div class="cell-title">${escapeHtml(user.authorized_name)}</div>
      <div class="table-subtext">${escapeHtml(user.position || "")}</div>
      ${
        notes
          ? `<div class="table-subtext table-subtext-note">Nota interna: ${notes}</div>`
          : ""
      }
    `;
    //comentada no se si sera o no visible a posterior, no eliminar del comenario
    //row.appendChild(nameCell);

    const taxIdCell = document.createElement("td");
    taxIdCell.textContent = user.authorized_tax_id || "-";
    row.appendChild(taxIdCell);

    const positionCell = document.createElement("td");
    positionCell.textContent = user.position || "-";
    row.appendChild(positionCell);

    const contactCell = document.createElement("td");
    contactCell.innerHTML = `
      <div>${escapeHtml(user.email || "-")}</div>
      <div class="table-subtext">${escapeHtml(user.phone || "")}</div>
    `;
    row.appendChild(contactCell);

    const levelCell = document.createElement("td");
    const levelLabel = getAuthLevelLabel(user.authorization_level);
    const levelClass = getAuthLevelClass(user.authorization_level);
    levelCell.innerHTML = `<span class="${levelClass}">${levelLabel}</span>`;
    row.appendChild(levelCell);

    const maxAmountCell = document.createElement("td");
    maxAmountCell.textContent = formatCurrency(user.max_purchase_amount);
    row.appendChild(maxAmountCell);

    const primaryCell = document.createElement("td");
    primaryCell.className = "cell-center";
    if (user.is_primary_contact && user.is_active) {
      primaryCell.innerHTML = '<span class="pill pill-primary">Sí</span>';
    } else if (user.is_primary_contact && !user.is_active) {
      primaryCell.innerHTML = '<span class="pill pill-muted">Inactivo</span>';
    } else {
      primaryCell.innerHTML =
        '<button type="button" class="link-button">Definir</button>';
      primaryCell.querySelector("button").addEventListener("click", () =>
        setPrimaryContact(user.id)
      );
    }
    row.appendChild(primaryCell);

    const activeCell = document.createElement("td");
    activeCell.className = "cell-center";
    activeCell.innerHTML = user.is_active
      ? '<span class="status-pill status-pill-active">● Activo</span>'
      : '<span class="status-pill status-pill-inactive">● Inactivo</span>';
    row.appendChild(activeCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "cell-center";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-secondary btn-sm";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", () => openUserModal(user));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-secondary btn-sm";
    toggleBtn.textContent = user.is_active ? "Desactivar" : "Activar";
    toggleBtn.style.marginLeft = "4px";
    toggleBtn.addEventListener("click", () => toggleActive(user.id));

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(toggleBtn);
    row.appendChild(actionsCell);

    authorizedUsersTableBody.appendChild(row);
  });
}

/* ---- Modal personas autorizadas ---- */

function openUserModal(user) {
  const editingId = user ? user.id : null;

  if (user) {
  userModalTitle.textContent = "Editar persona autorizada";
  fieldUserId.value = String(user.id);
  fieldAuthorizedName.value = user.authorized_name || "";
  fieldAuthorizedTaxId.value = user.authorized_tax_id || "";
  fieldPosition.value = user.position || "";
  fieldEmail.value = user.email || "";
  fieldPhone.value = user.phone || "";
  fieldAuthorizationLevel.value = user.authorization_level || "BASIC";
  fieldMaxAmount.value =
    user.max_purchase_amount != null ? String(user.max_purchase_amount) : "";
  fieldIsPrimary.checked = !!user.is_primary_contact;
  fieldIsActive.checked = !!user.is_active;
  fieldInternalNotes.value = user.internal_notes || "";
} else {
  userModalTitle.textContent = "Agregar persona autorizada";
  fieldUserId.value = "";
  fieldAuthorizedName.value = "";
  fieldAuthorizedTaxId.value = "";
  fieldPosition.value = "";
  fieldEmail.value = "";
  fieldPhone.value = "";
  fieldAuthorizationLevel.value = "BASIC";
  fieldMaxAmount.value = "";
  fieldIsPrimary.checked = false;
  fieldIsActive.checked = true;
  fieldInternalNotes.value = "";
}


  userModal.dataset.editingUserId = editingId ? String(editingId) : "";
  modalBackdrop.classList.remove("is-hidden");
  userModal.classList.remove("is-hidden");
}

function closeUserModal() {
  userModal.dataset.editingUserId = "";
  modalBackdrop.classList.add("is-hidden");
  userModal.classList.add("is-hidden");
}

function handleUserFormSubmit(e) {
  e.preventDefault();

  if (!selectedCustomerId) {
    alert("Debe seleccionar un cliente antes de gestionar personas autorizadas.");
    return;
  }

  const name = fieldAuthorizedName.value.trim();
  const taxId = fieldAuthorizedTaxId.value.trim();

  if (!name || !taxId) {
    alert("Nombre y RUT son obligatorios.");
    return;
  }

  const position = fieldPosition.value.trim();
  const email = fieldEmail.value.trim();
  const phone = fieldPhone.value.trim();
  const level = fieldAuthorizationLevel.value;
  const maxAmountRaw = fieldMaxAmount.value.replace(/\./g, "").trim();
  const maxAmount = maxAmountRaw ? parseInt(maxAmountRaw, 10) : 0;
  const isPrimary = fieldIsPrimary.checked;
  const isActive = fieldIsActive.checked;
const internalNotes = fieldInternalNotes.value.trim();

  const editingIdStr = userModal.dataset.editingUserId;
  const editingId = editingIdStr ? parseInt(editingIdStr, 10) : null;
  let currentUserId = editingId;

  if (editingId) {
  const idx = authorizedUsers.findIndex((u) => u.id === editingId);
  if (idx !== -1) {
    const existing = authorizedUsers[idx];
    existing.authorized_name = name;
    existing.authorized_tax_id = taxId;
    existing.position = position;
    existing.email = email;
    existing.phone = phone;
    existing.authorization_level = level;
    existing.max_purchase_amount = maxAmount;
    existing.is_active = isActive;
    existing.internal_notes = internalNotes;
  }
} else {
    const newId = authorizedUsers.length
      ? Math.max(...authorizedUsers.map((u) => u.id)) + 1
      : 1;

    const newUser = {
  id: newId,
  customer_id: selectedCustomerId,
  authorized_name: name,
  authorized_tax_id: taxId,
  position: position,
  email: email,
  phone: phone,
  is_primary_contact: false,
  authorization_level: level,
  max_purchase_amount: maxAmount,
  is_active: isActive,
  internal_notes: internalNotes
};
    authorizedUsers.push(newUser);
    currentUserId = newId;
  }

  if (currentUserId != null) {
    if (isPrimary) {
      setPrimaryContact(currentUserId);
    } else {
      const current = authorizedUsers.find((u) => u.id === currentUserId);
      if (current) current.is_primary_contact = false;
    }
  }

  closeUserModal();
  const customer = customers.find((c) => c.id === selectedCustomerId);
  if (customer) {
    renderAuthorizedUsers(customer);
  }
  renderCustomersTable();
}

/* ---- Cambios de estado/persona ---- */

function toggleActive(userId) {
  const user = authorizedUsers.find((u) => u.id === userId);
  if (!user) return;
  user.is_active = !user.is_active;
  if (!user.is_active) {
    user.is_primary_contact = false;
  }
  const customer = customers.find((c) => c.id === selectedCustomerId);
  if (customer) renderAuthorizedUsers(customer);
  renderCustomersTable();
}

function setPrimaryContact(userId) {
  const customerId = selectedCustomerId;
  if (!customerId) return;

  authorizedUsers.forEach((u) => {
    if (u.customer_id === customerId) {
      u.is_primary_contact = u.id === userId;
    }
  });

  const customer = customers.find((c) => c.id === selectedCustomerId);
  if (customer) renderAuthorizedUsers(customer);
  renderCustomersTable();
}

/* ---- Utilidades ---- */

function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return "-";
  return currencyFormatter.format(amount);
}

function getAuthLevelLabel(level) {
  const map = {
    BASIC: "Básico",
    ADVANCED: "Avanzado",
    FULL: "Completo"
  };
  return map[level] || level || "-";
}

function getAuthLevelClass(level) {
  switch (level) {
    case "FULL":
      return "badge badge-level-full";
    case "ADVANCED":
      return "badge badge-level-advanced";
    case "BASIC":
      return "badge badge-level-basic";
    default:
      return "badge badge-muted";
  }
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
