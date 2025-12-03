// app.js
// Vista de "Movimientos de Stock" en vanilla JS

const state = {
  movements: [],
  filteredMovements: [],
  currentPage: 1,
  itemsPerPage: 15,
  filters: {
    dateFrom: "",
    dateTo: "",
    search: "",
    movementType: "",
    warehouse: "",
    referenceType: "",
    user: ""
  }
};

document.addEventListener("DOMContentLoaded", () => {
  bindUI();
  loadData();
});

function $(id) {
  return document.getElementById(id);
}

/* ========================
   Binding inicial
   ======================== */

function bindUI() {
  $("btn-apply-filters").addEventListener("click", () => {
    readFiltersFromUI();
    applyFilters();
    renderAll();
  });

  $("btn-clear-filters").addEventListener("click", () => {
    clearFiltersUI();
    readFiltersFromUI();
    applyFilters();
    renderAll();
  });

  $("btn-refresh").addEventListener("click", () => {
    loadData();
  });

  $("btn-export").addEventListener("click", () => {
    exportToCSV(state.filteredMovements);
  });

  $("btn-close-detail").addEventListener("click", closeDetailModal);

  const backdrop = $("movement-detail-backdrop");
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeDetailModal();
  });
}

/* ========================
   Data
   ======================== */

async function loadData() {
  try {
    const response = await fetch("data.json");
    const data = await response.json();
    state.movements = data.movements || [];
    state.currentPage = 1;

    populateSelectOptions();

    applyFilters();
    renderAll();
  } catch (error) {
    console.error("Error cargando data.json", error);
  }
}

function populateSelectOptions() {
  const warehouses = new Set();
  const referenceTypes = new Set();
  const users = new Set();

  state.movements.forEach((m) => {
    if (m.warehouse_code) warehouses.add(m.warehouse_code);
    if (m.reference_type) referenceTypes.add(m.reference_type);
    if (m.user_username) users.add(m.user_username);
  });

  const warehouseSelect = $("filter-warehouse");
  const referenceSelect = $("filter-reference-type");
  const userSelect = $("filter-user");

  function buildOptions(set, mapLabel) {
    const values = Array.from(set).sort();
    const options = values
      .map((value) => {
        const label = mapLabel ? mapLabel(value) : value;
        return `<option value="${value}">${label}</option>`;
      })
      .join("");
    return `<option value="">Todos</option>${options}`;
  }

  warehouseSelect.innerHTML = buildOptions(warehouses, (c) => c);
  referenceSelect.innerHTML = buildOptions(referenceTypes, mapReferenceType);
  userSelect.innerHTML = buildOptions(users, (u) => "@" + u);
}

/* ========================
   Filtros
   ======================== */

function readFiltersFromUI() {
  state.filters.dateFrom = $("filter-date-from").value || "";
  state.filters.dateTo = $("filter-date-to").value || "";
  state.filters.search = ($("filter-search").value || "").trim().toLowerCase();
  state.filters.movementType = $("filter-movement-type").value || "";
  state.filters.warehouse = $("filter-warehouse").value || "";
  state.filters.referenceType = $("filter-reference-type").value || "";
  state.filters.user = $("filter-user").value || "";
}

function clearFiltersUI() {
  $("filter-date-from").value = "";
  $("filter-date-to").value = "";
  $("filter-search").value = "";
  $("filter-movement-type").value = "";
  $("filter-warehouse").value = "";
  $("filter-reference-type").value = "";
  $("filter-user").value = "";
}

function applyFilters() {
  const {
    dateFrom,
    dateTo,
    search,
    movementType,
    warehouse,
    referenceType,
    user
  } = state.filters;

  const fromTs = dateFrom ? new Date(dateFrom + "T00:00:00").getTime() : null;
  const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : null;

  state.filteredMovements = state.movements.filter((m) => {
    // fecha
    if (fromTs || toTs) {
      const ts = new Date(m.movement_date).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
    }

    // tipo
    if (movementType && m.movement_type !== movementType) return false;

    // bodega
    if (warehouse && m.warehouse_code !== warehouse) return false;

    // origen
    if (referenceType && m.reference_type !== referenceType) return false;

    // usuario
    if (user && m.user_username !== user) return false;

    // búsqueda texto
    if (search) {
      const haystack = [
        m.product_code,
        m.product_name,
        m.variant_name,
        m.sku
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const maxPage = Math.max(
    1,
    Math.ceil(state.filteredMovements.length / state.itemsPerPage || 1)
  );
  if (state.currentPage > maxPage) state.currentPage = 1;
}

/* ========================
   Render principal
   ======================== */

function renderAll() {
  renderStats();
  renderTable();
  renderPagination();
}

/* Stats */

function renderStats() {
  const container = $("stats-cards");
  const total = state.filteredMovements.length;
  const inCount = state.filteredMovements.filter(
    (m) => m.movement_type === "IN"
  ).length;
  const outCount = state.filteredMovements.filter(
    (m) => m.movement_type === "OUT"
  ).length;
  const transferCount = state.filteredMovements.filter(
    (m) => m.movement_type === "TRANSFER"
  ).length;
  const adjustmentCount = state.filteredMovements.filter(
    (m) => m.movement_type === "ADJUSTMENT"
  ).length;

  container.innerHTML = `
    <div class="stat-card stat-card--total">
      <div>
        <div class="stat-card__title">Total movimientos</div>
        <div class="stat-card__value">${total}</div>
      </div>
      <div class="stat-card__icon">M</div>
    </div>

    <div class="stat-card stat-card--in">
      <div>
        <div class="stat-card__title">Entradas</div>
        <div class="stat-card__value">${inCount}</div>
      </div>
      <div class="stat-card__icon">+</div>
    </div>

    <div class="stat-card stat-card--out">
      <div>
        <div class="stat-card__title">Salidas</div>
        <div class="stat-card__value">${outCount}</div>
      </div>
      <div class="stat-card__icon">−</div>
    </div>

    <div class="stat-card stat-card--mix">
      <div>
        <div class="stat-card__title">Transfers / ajustes</div>
        <div class="stat-card__value">${transferCount + adjustmentCount}</div>
      </div>
      <div class="stat-card__icon">↔</div>
    </div>
  `;
}

/* Tabla */

function renderTable() {
  const tbody = $("movements-tbody");
  const emptyState = $("empty-state");

  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const pageData = state.filteredMovements.slice(start, end);

  if (pageData.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("empty-state--hidden");
    return;
  }

  emptyState.classList.add("empty-state--hidden");

  const rows = pageData
    .map((m) => {
      const date = formatDateTime(m.movement_date);
      const nature = mapMovementType(m.movement_type);
      const origin = mapReferenceType(m.reference_type);
      const sign =
        m.movement_type === "OUT"
          ? "-"
          : m.movement_type === "IN"
          ? "+"
          : "";
      const qty = `${sign}${formatNumber(m.quantity)} ${
        m.measurement_unit_code || ""
      }`;
      const before = formatNumber(m.quantity_before);
      const after = formatNumber(m.quantity_after);

      return `
        <tr>
          <td class="text-small-muted">${date}</td>
          <td>
            <div>${m.product_code} - ${m.product_name}</div>
            ${
              m.variant_name
                ? `<div class="text-small-muted">Variante: ${m.variant_name}</div>`
                : ""
            }
          </td>
          <td>
            <div>${m.warehouse_name}</div>
            ${
              m.warehouse_zone_name
                ? `<div class="text-small-muted">Zona: ${m.warehouse_zone_name}</div>`
                : ""
            }
          </td>
          <td>
            <span class="${badgeClassForMovementType(m.movement_type)}">
              ${nature}
            </span>
          </td>
          <td>
            <span class="badge badge--neutral">${origin}</span>
            ${
              m.reference_number
                ? `<div class="text-small-muted">Ref: ${m.reference_number}</div>`
                : ""
            }
          </td>
          <td class="ims-table-col-right"><strong>${qty}</strong></td>
          <td class="ims-table-col-right text-small-muted">${before}</td>
          <td class="ims-table-col-right text-small-muted">${after}</td>
          <td>
            <div>${m.user_full_name}</div>
            <div class="text-small-muted">@${m.user_username}</div>
          </td>
          <td>
            <button
              type="button"
              class="btn btn--ghost btn--sm"
              data-movement-id="${m.id}"
            >
              Ver detalle
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.innerHTML = rows;

  // Bind detalle
  tbody.querySelectorAll("button[data-movement-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-movement-id");
      const movement = state.movements.find(
        (m) => String(m.id) === String(id)
      );
      if (movement) openDetailModal(movement);
    });
  });
}

/* Paginación */

function renderPagination() {
  const container = $("pagination-container");
  const total = state.filteredMovements.length;

  if (total === 0) {
    container.innerHTML = "";
    return;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(total / state.itemsPerPage || 1)
  );
  const current = state.currentPage;

  const infoText = `Mostrando ${
    (current - 1) * state.itemsPerPage + 1
  }–${Math.min(current * state.itemsPerPage, total)} de ${total}`;

  const pageButtons = [];
  for (let i = 1; i <= totalPages; i++) {
    pageButtons.push(
      `<button type="button" data-page="${i}" class="pagination-button${
        i === current ? " pagination-button--current" : ""
      }">${i}</button>`
    );
  }

  container.innerHTML = `
    <div class="pagination-info">${infoText}</div>
    <div class="pagination-controls">
      <button
        type="button"
        data-page="prev"
        class="pagination-button"
      >
        Anterior
      </button>
      ${pageButtons.join("")}
      <button
        type="button"
        data-page="next"
        class="pagination-button"
      >
        Siguiente
      </button>
    </div>
  `;

  container.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-page");
      if (value === "prev") {
        if (state.currentPage > 1) {
          state.currentPage -= 1;
          renderTable();
          renderPagination();
        }
      } else if (value === "next") {
        const maxPage = Math.max(
          1,
          Math.ceil(state.filteredMovements.length / state.itemsPerPage)
        );
        if (state.currentPage < maxPage) {
          state.currentPage += 1;
          renderTable();
          renderPagination();
        }
      } else {
        const page = parseInt(value, 10);
        if (!Number.isNaN(page)) {
          state.currentPage = page;
          renderTable();
          renderPagination();
        }
      }
    });
  });
}

/* ========================
   Modal detalle
   ======================== */

function openDetailModal(m) {
  const backdrop = $("movement-detail-backdrop");
  const subtitle = $("movement-detail-subtitle");
  const body = $("movement-detail-body");

  const date = formatDateTime(m.movement_date);
  const nature = mapMovementType(m.movement_type);
  const origin = mapReferenceType(m.reference_type);

  const isTransfer = m.reference_type === "TRANSFER";
  const transferContext = isTransfer ? getTransferContext(m) : null;

  // Subtítulo del modal
  if (isTransfer && m.reference_number) {
    subtitle.textContent = `${date} · Transferencia ${m.reference_number}`;
  } else {
    subtitle.textContent = `${date} · ${nature} · ${origin}`;
  }

  // ===== Sec 1: Identificación del movimiento =====
  const sectionMovement = `
    <div class="modal-section modal-section--first">
      <h3 class="modal-section-heading">Identificación del movimiento</h3>

      <div class="modal-grid">
        <div>
          <div class="modal-section-title">Tipo de movimiento</div>
          <div>
            <span class="${badgeClassForMovementType(m.movement_type)}">
              ${nature}
            </span>
          </div>

          <div class="modal-section-title" style="margin-top:8px;">Origen</div>
          <div>
            <span class="badge badge--neutral">${origin}</span>
            ${
              m.reference_number
                ? `<div class="text-small-muted">Referencia: ${m.reference_number}</div>`
                : ""
            }
            ${
              m.reference_comment
                ? `<div class="text-small-muted">${m.reference_comment}</div>`
                : ""
            }
          </div>

          <div class="modal-section-title" style="margin-top:8px;">Fecha y hora</div>
          <div class="text-small-muted">${date}</div>
        </div>

        <div>
          <div class="modal-section-title">Usuario responsable (registro actual)</div>
          <div>${m.user_full_name}</div>
          <div class="text-small-muted">@${m.user_username}</div>
        </div>
      </div>

      ${
        transferContext
          ? renderTransferContextSection(transferContext)
          : ""
      }
    </div>
  `;

  // ===== Sec 2: Identificación del producto / stock =====
  const sectionProduct = `
    <div class="modal-section">
      <h3 class="modal-section-heading">Identificación del producto y stock</h3>

      <div class="modal-grid">
        <div>
          <div class="modal-section-title">Producto</div>
          <div>${m.product_code} - ${m.product_name}</div>
          ${
            m.variant_name
              ? `<div class="text-small-muted">Variante: ${m.variant_name}</div>`
              : ""
          }
          ${
            m.sku
              ? `<div class="text-small-muted">SKU: ${m.sku}</div>`
              : ""
          }
        </div>

        <div>
          <div class="modal-section-title">Bodega</div>
          <div>${m.warehouse_name}</div>
          ${
            m.warehouse_zone_name
              ? `<div class="text-small-muted">Zona: ${m.warehouse_zone_name}</div>`
              : ""
          }
        </div>

        <div>
          <div class="modal-section-title">Cantidad</div>
          <div>${formatNumber(m.quantity)} ${
    m.measurement_unit_code || ""
  }</div>
          <div class="text-small-muted">
            Antes: ${formatNumber(m.quantity_before)} · Después: ${formatNumber(
    m.quantity_after
  )}
          </div>
        </div>

        <div>
          <div class="modal-section-title">Costo</div>
          <div>
            Costo unitario: ${formatCurrency(m.unit_cost)}<br />
            Total movimiento: ${formatCurrency(m.total_cost)}
          </div>
        </div>
      </div>
    </div>
  `;

  // ===== Sec 3 opcional: Notas / observaciones =====
  const sectionNotes = m.notes
    ? `
      <div class="modal-section">
        <h3 class="modal-section-heading">Notas / observaciones</h3>
        <div class="pre-line">${m.notes}</div>
      </div>
    `
    : "";

  body.innerHTML = sectionMovement + sectionProduct + sectionNotes;

  backdrop.classList.remove("modal-backdrop--hidden");
}

function getTransferContext(currentMovement) {
  if (currentMovement.reference_type !== "TRANSFER") return null;
  const refNumber = currentMovement.reference_number;
  if (!refNumber) return null;

  const related = state.movements.filter(
    (m) =>
      m.reference_type === "TRANSFER" &&
      m.reference_number === refNumber
  );

  if (related.length < 2) return null;

  let origin = related.find(
    (m) => m.movement_type === "TRANSFER" || m.movement_type === "OUT"
  );
  let destination = related.find((m) => m.movement_type === "IN");

  if (!origin) origin = related[0];
  if (!destination) {
    destination = related.find((m) => m !== origin) || related[0];
  }

  return { origin, destination };
}

function renderTransferContextSection(ctx) {
  const { origin, destination } = ctx;
  const originDate = formatDateTime(origin.movement_date);
  const destDate = formatDateTime(destination.movement_date);

  return `
    <div class="modal-section" style="border-top:none;padding-top:8px;margin-top:8px;">
      <div class="modal-section-title" style="margin-bottom:6px;">Detalle de transferencia</div>
      <div class="modal-grid">
        <div>
          <div class="modal-section-title">Origen de la transferencia</div>
          <div><strong>${origin.warehouse_name}</strong></div>
          ${
            origin.warehouse_zone_name
              ? `<div class="text-small-muted">Zona: ${origin.warehouse_zone_name}</div>`
              : ""
          }
          <div class="text-small-muted">
            Enviado por: ${origin.user_full_name} (@${origin.user_username})
          </div>
          <div class="text-small-muted">Fecha/hora envío: ${originDate}</div>
        </div>

        <div>
          <div class="modal-section-title">Destino de la transferencia</div>
          <div><strong>${destination.warehouse_name}</strong></div>
          ${
            destination.warehouse_zone_name
              ? `<div class="text-small-muted">Zona: ${destination.warehouse_zone_name}</div>`
              : ""
          }
          <div class="text-small-muted">
            Recibido por: ${destination.user_full_name} (@${destination.user_username})
          </div>
          <div class="text-small-muted">Fecha/hora recepción: ${destDate}</div>
        </div>
      </div>
    </div>
  `;
}


// Devuelve origen/destino de una transferencia a partir del movimiento actual
function getTransferContext(currentMovement) {
  if (!currentMovement.reference_type || currentMovement.reference_type !== "TRANSFER") {
    return null;
  }

  const refNumber = currentMovement.reference_number;
  if (!refNumber) return null;

  // Buscamos todos los movimientos que pertenecen a la misma transferencia
  const related = state.movements.filter(
    (m) =>
      m.reference_type === "TRANSFER" &&
      m.reference_number === refNumber
  );

  if (related.length < 2) {
    // No hay par completo origen/destino
    return null;
  }

  // Heurística:
  // - origen: movimiento de tipo TRANSFER u OUT
  // - destino: movimiento de tipo IN
  let origin = related.find(
    (m) => m.movement_type === "TRANSFER" || m.movement_type === "OUT"
  );
  let destination = related.find((m) => m.movement_type === "IN");

  // Si no se encuentra con esa lógica, caer a algo razonable
  if (!origin) origin = related[0];
  if (!destination) {
    destination = related.find((m) => m !== origin) || related[0];
  }

  return {
    origin,
    destination
  };
}

// Renderiza el bloque "Resumen de transferencia" en el modal
function renderTransferContextSection(ctx) {
  const { origin, destination } = ctx;

  const originDate = formatDateTime(origin.movement_date);
  const destDate = formatDateTime(destination.movement_date);

  return `
    <div class="modal-grid" style="margin-bottom: 8px;">
      <div>
        <div class="modal-section-title">Origen de la transferencia</div>
        <div><strong>${origin.warehouse_name}</strong></div>
        ${
          origin.warehouse_zone_name
            ? `<div class="text-small-muted">Zona: ${origin.warehouse_zone_name}</div>`
            : ""
        }
        <div class="text-small-muted">
          Enviado por: ${origin.user_full_name} (@${origin.user_username})
        </div>
        <div class="text-small-muted">
          Fecha/hora envío: ${originDate}
        </div>
      </div>

      <div>
        <div class="modal-section-title">Destino de la transferencia</div>
        <div><strong>${destination.warehouse_name}</strong></div>
        ${
          destination.warehouse_zone_name
            ? `<div class="text-small-muted">Zona: ${destination.warehouse_zone_name}</div>`
            : ""
        }
        <div class="text-small-muted">
          Recibido por: ${destination.user_full_name} (@${destination.user_username})
        </div>
        <div class="text-small-muted">
          Fecha/hora recepción: ${destDate}
        </div>
      </div>
    </div>
  `;
}


function closeDetailModal() {
  $("movement-detail-backdrop").classList.add("modal-backdrop--hidden");
}

/* ========================
   Utilidades
   ======================== */

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toLocaleString("es-CL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "";
  return Number(value).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function mapMovementType(type) {
  switch (type) {
    case "IN":
      return "Entrada";
    case "OUT":
      return "Salida";
    case "TRANSFER":
      return "Transferencia";
    case "ADJUSTMENT":
      return "Ajuste";
    default:
      return type || "";
  }
}

function mapReferenceType(type) {
  switch (type) {
    case "PURCHASE":
      return "Compra";
    case "SALE":
      return "Venta";
    case "TRANSFER":
      return "Transferencia";
    case "ADJUSTMENT":
      return "Ajuste manual";
    case "PHYSICAL_COUNT":
      return "Inventario físico";
    case "RETURN_CUSTOMER":
      return "Devolución cliente";
    case "RETURN_SUPPLIER":
      return "Devolución proveedor";
    case "DAMAGE":
      return "Merma / daño";
    default:
      return type || "";
  }
}

function badgeClassForMovementType(type) {
  switch (type) {
    case "IN":
      return "badge badge--in";
    case "OUT":
      return "badge badge--out";
    case "TRANSFER":
      return "badge badge--transfer";
    case "ADJUSTMENT":
      return "badge badge--adjustment";
    default:
      return "badge badge--neutral";
  }
}

/* ========================
   Export CSV
   ======================== */

function exportToCSV(rows) {
  if (!rows || rows.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const headers = [
    "Fecha",
    "Naturaleza",
    "Origen",
    "Producto",
    "Variante",
    "SKU",
    "Bodega",
    "Zona",
    "Cantidad",
    "Unidad",
    "Antes",
    "Después",
    "Costo Unitario",
    "Costo Total",
    "Usuario",
    "Referencia",
    "Notas"
  ];

  const lines = rows.map((m) => [
    formatDateTime(m.movement_date),
    mapMovementType(m.movement_type),
    mapReferenceType(m.reference_type),
    m.product_name,
    m.variant_name || "",
    m.sku || "",
    m.warehouse_name,
    m.warehouse_zone_name || "",
    String(m.quantity).replace(".", ","),
    m.measurement_unit_code || "",
    String(m.quantity_before).replace(".", ","),
    String(m.quantity_after).replace(".", ","),
    String(m.unit_cost || "").replace(".", ","),
    String(m.total_cost || "").replace(".", ","),
    m.user_full_name,
    m.reference_number || "",
    (m.notes || "").replace(/\r?\n/g, " ")
  ]);

  const csvContent =
    [headers, ...lines]
      .map((row) =>
        row
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\r\n") + "\r\n";

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  link.href = url;
  link.download = `movimientos_stock_${yyyy}${mm}${dd}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
