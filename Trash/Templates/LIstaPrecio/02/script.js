// ============================
// ESTADO GLOBAL
// ============================

let RAW_DATA = null;

// Estado UI
let currentGroupId = null;
let currentPriceListId = null;
let currentFilters = {
  search: "",
  activeState: "ALL" // ALL | ACTIVE | INACTIVE
};

// ============================
// INICIO
// ============================

document.addEventListener("DOMContentLoaded", () => {
  fetch("data.json")
    .then((res) => res.json())
    .then((data) => {
      RAW_DATA = data;
      
      // FIX: Asegurar que el modal esté oculto al iniciar
      const modal = document.getElementById("create-list-modal");
      if (modal) {
        modal.classList.add("hidden");
      }
      
      initPriceListModule();
      setupCreateListModal();
    })
    .catch((err) => {
      console.error("Error cargando data.json", err);
    });
});

// ============================
// MÓDULO LISTAS DE PRECIO
// ============================

function initPriceListModule() {
  if (!RAW_DATA) return;

  const groupsContainer = document.getElementById("price-list-groups");
  const listsContainer = document.getElementById("price-lists");
  const groupLabel = document.getElementById("current-group-label");

  const searchInput = document.getElementById("filter-search");
  const activeSelect = document.getElementById("filter-active");

  // Render inicial grupos
  renderGroups(groupsContainer);

  // Filtros tabla
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentFilters.search = e.target.value.toLowerCase();
      renderCurrentTable();
    });
  }

  if (activeSelect) {
    activeSelect.addEventListener("change", (e) => {
      currentFilters.activeState = e.target.value;
      renderCurrentTable();
    });
  }

  // Seleccionar primer grupo y lista por defecto (LÓGICA CORREGIDA)
  const firstGroup = getPriceListGroups()[0];
  if (firstGroup) {
    currentGroupId = firstGroup.id;
    
    if (groupLabel) {
      groupLabel.textContent = firstGroup.group_name;
    }
    
    renderPriceLists(listsContainer);
    
    const firstList = getPriceListsForCurrentGroup()[0];
    if (firstList) {
      currentPriceListId = firstList.id;
    }
  }

  // Renderizar el contenido una única vez al final
  renderSummary();
  renderCurrentTable();
}

// ============================
// HELPERS DE DATOS
// ============================

function getPriceListGroups() {
  return RAW_DATA?.price_list_groups || [];
}

function getPriceLists() {
  return RAW_DATA?.price_lists || [];
}

function getPriceListItemsForCurrentList() {
  if (!currentPriceListId) return [];
  return (RAW_DATA?.price_list_items || []).filter(
    (item) => item.price_list_id === currentPriceListId
  );
}

function getPriceListsForCurrentGroup() {
  if (!currentGroupId) return [];
  return getPriceLists().filter(
    (pl) => pl.price_list_group_id === currentGroupId
  );
}

function getMeasurementUnitsMap() {
  const map = {};
  (RAW_DATA?.measurement_units || []).forEach((u) => {
    map[u.id] = u;
  });
  return map;
}

function getProductVariantsMap() {
  const map = {};
  (RAW_DATA?.product_variants || []).forEach((v) => {
    map[v.id] = v;
  });
  return map;
}

function getProductsMap() {
  const map = {};
  (RAW_DATA?.products || []).forEach((p) => {
    map[p.id] = p;
  });
  return map;
}

function getGroupById(id) {
  return getPriceListGroups().find((g) => g.id === id) || null;
}

function getPriceListById(id) {
  return getPriceLists().find((pl) => pl.id === id) || null;
}

// ============================
// SETTERS DE ESTADO
// ============================

function setCurrentGroup(groupId) {
  currentGroupId = groupId;
  currentPriceListId = null;

  const group = getGroupById(groupId);
  const groupLabel = document.getElementById("current-group-label");
  if (groupLabel && group) {
    groupLabel.textContent = group.group_name;
  }

  renderGroups(document.getElementById("price-list-groups"));
  renderPriceLists(document.getElementById("price-lists"));
  renderSummary();
  renderCurrentTable();
}

function setCurrentPriceList(priceListId) {
  currentPriceListId = priceListId;
  renderPriceLists(document.getElementById("price-lists"));
  renderSummary();
  renderCurrentTable();
}

// ============================
// RENDER: GRUPOS
// ============================

function renderGroups(container) {
  if (!container) return;
  container.innerHTML = "";

  const groups = getPriceListGroups();

  if (!groups.length) {
    const span = document.createElement("span");
    span.textContent = "No hay grupos de listas definidos.";
    span.style.fontSize = "0.8rem";
    span.style.color = "#94a3b8";
    container.appendChild(span);
    return;
  }

  groups.forEach((g) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill" + (g.id === currentGroupId ? " pill--active" : "");
    pill.textContent = g.group_name;
    pill.addEventListener("click", () => setCurrentGroup(g.id));
    container.appendChild(pill);
  });
}

// ============================
// RENDER: LISTAS DEL GRUPO
// ============================

function renderPriceLists(container) {
  if (!container) return;
  container.innerHTML = "";

  const lists = getPriceListsForCurrentGroup();

  if (!lists.length) {
    const span = document.createElement("span");
    span.textContent = "No hay listas asociadas a este grupo.";
    span.style.fontSize = "0.8rem";
    span.style.color = "#94a3b8";
    container.appendChild(span);
    return;
  }

  lists.forEach((pl) => {
    const card = document.createElement("article");
    card.className =
      "list-card" + (pl.id === currentPriceListId ? " list-card--active" : "");

    const title = document.createElement("h3");
    title.className = "list-card__name";
    title.textContent = pl.price_list_name;

    const meta = document.createElement("p");
    meta.className = "list-card__meta";

    const validityTo = pl.valid_to || "sin fecha de término";
    meta.textContent = `${pl.price_list_code} • ${pl.currency_code} • Vigente desde ${pl.valid_from} (${validityTo})`;

    card.appendChild(title);
    card.appendChild(meta);

    card.addEventListener("click", () => setCurrentPriceList(pl.id));

    container.appendChild(card);
  });
}

// ============================
// RENDER: RESUMEN LISTA
// ============================

function renderSummary() {
  const nameEl = document.getElementById("price-list-name");
  const descEl = document.getElementById("price-list-description");
  const codeEl = document.getElementById("price-list-code");
  const currEl = document.getElementById("price-list-currency");
  const groupEl = document.getElementById("summary-group");
  const fromEl = document.getElementById("summary-valid-from");
  const toEl = document.getElementById("summary-valid-to");
  const baseEl = document.getElementById("summary-base-list");
  const adjEl = document.getElementById("summary-adjustment");
  const itemsCountEl = document.getElementById("summary-items-count");

  const currentList = currentPriceListId
    ? getPriceListById(currentPriceListId)
    : null;

  if (!currentList) {
    if (nameEl) nameEl.textContent = "Selecciona una lista";
    if (descEl)
      descEl.textContent =
        "Primero selecciona un grupo y luego una lista para ver sus precios.";
    if (codeEl) codeEl.textContent = "Código: –";
    if (currEl) currEl.textContent = "Moneda: –";
    if (groupEl) groupEl.textContent = "–";
    if (fromEl) fromEl.textContent = "–";
    if (toEl) toEl.textContent = "Sin fecha";
    if (baseEl) baseEl.textContent = "N/A";
    if (adjEl) adjEl.textContent = "–";
    if (itemsCountEl) itemsCountEl.textContent = "0";
    return;
  }

  const group = getGroupById(currentList.price_list_group_id);
  const itemsCount = getPriceListItemsForCurrentList().length;

  if (nameEl) nameEl.textContent = currentList.price_list_name;
  if (descEl) {
    descEl.textContent =
      currentList.applies_to === "ALL_PRODUCTS"
        ? "Aplica a todos los productos de catálogo."
        : "Aplica a un subconjunto de productos.";
  }
  if (codeEl) codeEl.textContent = `Código: ${currentList.price_list_code}`;
  if (currEl) currEl.textContent = `Moneda: ${currentList.currency_code}`;

  if (groupEl) groupEl.textContent = group ? group.group_name : "–";
  if (fromEl) fromEl.textContent = currentList.valid_from || "–";
  if (toEl) toEl.textContent = currentList.valid_to || "Sin fecha";

  if (baseEl) {
    if (currentList.base_price_list_id) {
      const base = getPriceListById(currentList.base_price_list_id);
      const label = base
        ? `${base.price_list_code} (${base.price_list_name})`
        : "ID: " + currentList.base_price_list_id;
      baseEl.textContent = label;
    } else {
      baseEl.textContent = "No aplica";
    }
  }

  if (adjEl) {
    if (
      currentList.base_adjustment_type &&
      currentList.base_adjustment_value != null
    ) {
      if (currentList.base_adjustment_type === "PERCENTAGE") {
        adjEl.textContent = `${currentList.base_adjustment_value.toFixed(2)} %`;
      } else {
        adjEl.textContent = `${currentList.base_adjustment_value} (ajuste fijo)`;
      }
    } else {
      adjEl.textContent = "Sin ajuste sobre lista base";
    }
  }

  if (itemsCountEl) itemsCountEl.textContent = String(itemsCount);
}

// ============================
// RENDER: TABLA DE ÍTEMS
// ============================

function renderCurrentTable() {
  const tbody = document.getElementById("price-list-items-body");
  const tableMeta = document.getElementById("table-meta");

  if (!tbody) return;
  tbody.innerHTML = "";

  const currentList = currentPriceListId
    ? getPriceListById(currentPriceListId)
    : null;

  if (!currentList) {
    const row = document.createElement("tr");
    row.className = "table__row--empty";
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent =
      "Selecciona una lista de precios para ver el detalle.";
    row.appendChild(cell);
    tbody.appendChild(row);
    if (tableMeta) tableMeta.textContent = "Sin datos.";
    return;
  }

  const unitsMap = getMeasurementUnitsMap();
  const variantsMap = getProductVariantsMap();
  const productsMap = getProductsMap();

  let items = getPriceListItemsForCurrentList();

  // Filtro estado activo/inactivo
  if (currentFilters.activeState !== "ALL") {
    const onlyActive = currentFilters.activeState === "ACTIVE";
    items = items.filter((it) => (onlyActive ? it.is_active : !it.is_active));
  }

  // Enriquecer con info de producto / variante
  const enriched = items.map((it) => {
    const variant = variantsMap[it.product_variant_id];
    const product = variant ? productsMap[variant.product_id] : null;
    const unit = unitsMap[it.measurement_unit_id];

    const fullName = variant
      ? `${product ? product.product_name : "Producto"} — ${
          variant.variant_name
        }`
      : product
      ? product.product_name
      : "Desconocido";

    const sku = variant ? variant.variant_sku : "";
    const unitLabel = unit ? unit.unit_symbol : "";

    return {
      raw: it,
      sku,
      fullName,
      unitLabel
    };
  });

  // Filtro búsqueda texto
  const search = currentFilters.search;
  let filtered = enriched;
  if (search) {
    filtered = enriched.filter((r) => {
      return (
        (r.sku && r.sku.toLowerCase().includes(search)) ||
        (r.fullName && r.fullName.toLowerCase().includes(search))
      );
    });
  }

  if (!filtered.length) {
    const row = document.createElement("tr");
    row.className = "table__row--empty";
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.textContent = "No se encontraron ítems con los filtros aplicados.";
    row.appendChild(cell);
    tbody.appendChild(row);
    if (tableMeta) tableMeta.textContent = "0 ítems mostrados.";
    return;
  }

  filtered.forEach((rowData) => {
    const { raw, sku, fullName, unitLabel } = rowData;

    const tr = document.createElement("tr");

    const tdSku = document.createElement("td");
    tdSku.textContent = sku || "–";
    tr.appendChild(tdSku);

    const tdName = document.createElement("td");
    tdName.textContent = fullName;
    tr.appendChild(tdName);

    const tdUnit = document.createElement("td");
    tdUnit.textContent = unitLabel || "–";
    tr.appendChild(tdUnit);

    const tdBase = document.createElement("td");
    tdBase.className = "numeric";
    tdBase.textContent = formatCurrency(raw.base_price);
    tr.appendChild(tdBase);

    const tdDisc = document.createElement("td");
    tdDisc.className = "numeric";
    tdDisc.textContent = raw.discount_percentage
      ? raw.discount_percentage.toFixed(2) + " %"
      : "0,00 %";
    tr.appendChild(tdDisc);

    const tdSale = document.createElement("td");
    tdSale.className = "numeric";
    tdSale.textContent = formatCurrency(raw.sale_price);
    tr.appendChild(tdSale);

    const tdCost = document.createElement("td");
    tdCost.className = "numeric";
    tdCost.textContent = formatCurrency(raw.cost_price);
    tr.appendChild(tdCost);

    const tdMargin = document.createElement("td");
    tdMargin.className = "numeric";
    tdMargin.textContent =
      raw.margin_percentage != null
        ? raw.margin_percentage.toFixed(2) + " %"
        : "–";
    tr.appendChild(tdMargin);

    tbody.appendChild(tr);
  });

  if (tableMeta) {
    tableMeta.textContent = `${filtered.length} ítems mostrados (de ${
      getPriceListItemsForCurrentList().length
    } ítems de la lista).`;
  }
}

// ============================
// UTILIDADES
// ============================

function formatCurrency(value) {
  if (value == null) return "–";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(value);
}

// ============================
// MODAL CREAR LISTA DE PRECIOS
// ============================

/**
 * Función centralizada para cerrar y resetear el modal.
 */
function closeCreateListModal() {
  const modal = document.getElementById("create-list-modal");
  const form = document.getElementById("create-list-form");

  if (modal) {
    modal.classList.add("hidden");
  }
  if (form) {
    form.reset(); // Restablece los campos del formulario
  }
}

function setupCreateListModal() {
  const modal = document.getElementById("create-list-modal");
  const openBtn = document.getElementById("btn-open-create-list");
  const cancelBtn = document.getElementById("create-list-cancel");
  const backdrop = modal ? modal.querySelector(".modal__backdrop") : null;
  const form = document.getElementById("create-list-form");

  if (!modal || !openBtn || !cancelBtn || !form || !backdrop) return;

  // Asignación de listeners de apertura
  openBtn.addEventListener("click", () => {
    populateCreateListForm(); // Rellena combos y lista de variantes
    modal.classList.remove("hidden"); // Muestra el modal
  });

  // Asignación de listeners de cierre
  cancelBtn.addEventListener("click", closeCreateListModal);
  backdrop.addEventListener("click", closeCreateListModal);

  // Asignación de listener de envío
  form.addEventListener("submit", handleCreateListSubmit);
}

/**
 * Función que llena los selects (combos) del formulario.
 */
function populateCreateListForm() {
  const codeEl = document.getElementById("create-list-code");
  const nameEl = document.getElementById("create-list-name");
  const typeEl = document.getElementById("create-list-type");
  const statusEl = document.getElementById("create-list-status");
  const fromEl = document.getElementById("create-list-valid-from");
  const toEl = document.getElementById("create-list-valid-to");
  const groupSelect = document.getElementById("create-list-group");
  const currencySelect = document.getElementById("create-list-currency");
  // NUEVO: Campo de precio
  const priceEl = document.getElementById("create-list-base-price");

  if (!codeEl || !nameEl || !typeEl || !statusEl || !fromEl || !toEl) return;
  if (!groupSelect || !currencySelect || !priceEl) return; // Validación actualizada

  // Establecer valores por defecto
  codeEl.value = "";
  nameEl.value = "";
  typeEl.value = "GENERAL";
  statusEl.value = "ACTIVE";
  priceEl.value = 0; // NUEVO: Establecer precio base en 0

  const today = new Date().toISOString().slice(0, 10);
  fromEl.value = today;
  toEl.value = "";

  // Llenar select de grupos
  groupSelect.innerHTML = "";
  const groups = getPriceListGroups();
  groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = `${g.group_code} — ${g.group_name}`;
    groupSelect.appendChild(opt);
  });

  // Llenar select de divisas
  currencySelect.innerHTML = "";
  const existingCodes = Array.from(
    new Set(
      (getPriceLists() || [])
        .map((pl) => pl.currency_code)
        .filter(Boolean)
    )
  );
  const baseCurrencies = existingCodes.length
    ? existingCodes
    : ["CLP", "USD", "EUR"];

  baseCurrencies.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code;
    currencySelect.appendChild(opt);
  });

  // selector de variantes
  renderVariantSelectorInModal();
}

/**
 * Función que renderiza la lista de variantes de producto en el modal.
 */
function renderVariantSelectorInModal() {
  const container = document.getElementById("create-list-variants");
  if (!container) return;
  container.innerHTML = "";

  const variants = RAW_DATA?.product_variants || [];
  const productsMap = getProductsMap();

  if (!variants.length) {
    const span = document.createElement("span");
    span.textContent = "No hay variantes de productos disponibles.";
    span.style.fontSize = "0.8rem";
    span.style.color = "#94a3b8";
    container.appendChild(span);
    return;
  }

  variants.forEach((v) => {
    const product = productsMap[v.product_id];

    const label = document.createElement("label");
    label.className = "variant-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = v.id;
    checkbox.className = "create-list-variant-checkbox";

    const texts = document.createElement("div");
    texts.className = "variant-row__texts";

    const title = document.createElement("span");
    title.className = "variant-row__title";
    title.textContent = v.variant_sku || "(Sin SKU)";

    const subtitle = document.createElement("span");
    subtitle.className = "variant-row__subtitle";
    subtitle.textContent = `${product ? product.product_name + " — " : ""}${
      v.variant_name || ""
    }`;

    texts.appendChild(title);
    texts.appendChild(subtitle);

    label.appendChild(checkbox);
    label.appendChild(texts);
    container.appendChild(label);
  });
}

/**
 * Función que maneja la lógica de creación de la nueva lista.
 */
function handleCreateListSubmit(e) {
  e.preventDefault();

  const code = document.getElementById("create-list-code")?.value.trim();
  const name = document.getElementById("create-list-name")?.value.trim();
  const groupIdValue = document.getElementById("create-list-group")?.value;
  const currency = document.getElementById("create-list-currency")?.value;
  const listType = document.getElementById("create-list-type")?.value; // GENERAL | ESPECIFICA
  const status = document.getElementById("create-list-status")?.value; // ACTIVE | INACTIVE
  const validFrom =
    document.getElementById("create-list-valid-from")?.value || null;
  const validTo = document.getElementById("create-list-valid-to")?.value || null;
  
  // NUEVO: Capturar el precio ingresado por el usuario
  const basePriceInput = document.getElementById("create-list-base-price")?.value;
  const basePrice = basePriceInput ? Number(basePriceInput) : 0;

  const groupId = groupIdValue ? Number(groupIdValue) : null;

  if (!code || !name || !groupId || !currency) {
    alert("Código, nombre, grupo y divisa son obligatorios.");
    return;
  }

  const selectedVariantIds = Array.from(
    document.querySelectorAll(".create-list-variant-checkbox:checked")
  ).map((cb) => Number(cb.value));

  if (listType === "ESPECIFICA" && selectedVariantIds.length === 0) {
    alert(
      "Para una lista específica debes seleccionar al menos una variante de producto."
    );
    return;
  }

  const nowIso = new Date().toISOString();
  const lists = getPriceLists();
  const newListId =
    lists.reduce((max, pl) => (pl.id > max ? pl.id : max), 0) + 1;

  const newList = {
    id: newListId,
    price_list_group_id: groupId,
    price_list_code: code,
    price_list_name: name,
    base_price_list_id: null,
    base_adjustment_type: null,
    base_adjustment_value: null,
    currency_code: currency,
    valid_from: validFrom,
    valid_to: validTo || null,
    priority: lists.length + 1,
    applies_to: listType === "GENERAL" ? "ALL_PRODUCTS" : "SELECTED_PRODUCTS",
    is_active: status === "ACTIVE",
    created_at: nowIso,
    updated_at: nowIso
  };

  RAW_DATA.price_lists.push(newList);

  // Crear ítems si es lista específica
  if (!RAW_DATA.price_list_items) {
    RAW_DATA.price_list_items = [];
  }

  if (listType === "ESPECIFICA" && selectedVariantIds.length) {
    const existingItems = RAW_DATA.price_list_items;
    const baseId =
      existingItems.reduce((max, it) => (it.id > max ? it.id : max), 0) || 0;
    let nextId = baseId + 1;

    const pmu = RAW_DATA.product_measurement_units || [];
    const productsMap = getProductsMap();

    selectedVariantIds.forEach((variantId) => {
      const variant = (RAW_DATA.product_variants || []).find(
        (v) => v.id === variantId
      );
      if (!variant) return;

      // unidad de venta
      const productUnits = pmu.filter(
        (u) => u.product_id === variant.product_id && u.is_sale_unit
      );
      let measurementUnitId = null;
      if (productUnits.length) {
        measurementUnitId = productUnits[0].measurement_unit_id;
      } else {
        const product = productsMap[variant.product_id];
        measurementUnitId = product?.base_measurement_unit_id || 1;
      }

      RAW_DATA.price_list_items.push({
        id: nextId++,
        price_list_id: newListId,
        product_variant_id: variantId,
        measurement_unit_id: measurementUnitId,
        base_price: basePrice, // AHORA USA EL VALOR DEL USUARIO
        discount_percentage: 0,
        discount_amount: 0,
        sale_price: basePrice, // AHORA USA EL VALOR DEL USUARIO
        cost_price: 0,
        margin_percentage: 0,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso
      });
    });
  }

  closeCreateListModal(); // Cierra y resetea el formulario tras la creación

  // Actualiza la UI para mostrar la nueva lista y seleccionarla
  setCurrentGroup(groupId);
  setCurrentPriceList(newListId);
}