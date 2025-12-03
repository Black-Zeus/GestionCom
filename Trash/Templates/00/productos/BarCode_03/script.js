// ====================================================================
// 1. Datos de base (catálogo)
// ====================================================================

// mockData se define en data.js y debe estar disponible en el scope global
if (typeof mockData === "undefined") {
  console.error(
    "[BarcodeModule] mockData no está definido. Asegúrate de incluir data.js antes de script.js"
  );
}

// Atajos a secciones del catálogo
const products = (mockData && mockData.products) || [];
const variants = (mockData && mockData.product_variants) || [];
const barcodes = (mockData && mockData.product_barcodes) || [];

// Estado local: lista de códigos a mostrar (catálogo + simulados)
let barcodeState = [];

// ====================================================================
// 2. Inicialización
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  initProductSelect();
  initBarcodeStateFromCatalog();
  initFormHandlers();
  renderBarcodeList();
});

// Poblar combo de productos
function initProductSelect() {
  const productSelect = document.getElementById("product-select");
  const variantSelect = document.getElementById("variant-select");

  products
    .filter((p) => p.is_active)
    .forEach((p) => {
      const opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = `${p.product_code} — ${p.product_name}`;
      productSelect.appendChild(opt);
    });

  productSelect.addEventListener("change", () => {
    const productId = parseInt(productSelect.value, 10);
    updateVariantSelect(variantSelect, productId);
  });
}

// Poblar variantes según producto
function updateVariantSelect(selectElement, productId) {
  selectElement.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Sin variante / SKU base";
  selectElement.appendChild(defaultOpt);

  if (!productId) return;

  variants
    .filter((v) => v.product_id === productId && v.is_active)
    .forEach((v) => {
      const opt = document.createElement("option");
      opt.value = String(v.id);
      opt.textContent = v.variant_sku
        ? `${v.variant_sku} — ${v.variant_name}`
        : v.variant_name;
      selectElement.appendChild(opt);
    });
}

// Inicializar estado con barcodes reales del mock
function initBarcodeStateFromCatalog() {
  barcodeState = barcodes.map((bc) => {
    const variant = variants.find((v) => v.id === bc.product_variant_id);
    const product = variant
      ? products.find((p) => p.id === variant.product_id)
      : null;

    return {
      id: `CAT-${bc.id}`,
      source: "catalog",
      productId: product?.id ?? null,
      productCode: product?.product_code ?? "",
      productName: product?.product_name ?? "",
      variantId: variant?.id ?? null,
      variantSku: variant?.variant_sku ?? "",
      variantName: variant?.variant_name ?? "",
      barcodeType: bc.barcode_type,
      barcodeValue: bc.barcode_value,
      isPrimary: !!bc.is_primary,
    };
  });
}

// ====================================================================
// 3. Manejo de formulario
// ====================================================================

function initFormHandlers() {
  const form = document.getElementById("barcode-form");
  const clearAllButton = document.getElementById("clear-all");
  const productSelect = document.getElementById("product-select");
  const variantSelect = document.getElementById("variant-select");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addBarcodeFromForm();
  });

  form.addEventListener("reset", () => {
    setTimeout(() => {
      productSelect.value = "";
      variantSelect.innerHTML = "";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Sin variante / SKU base";
      variantSelect.appendChild(defaultOpt);
    }, 0);
  });

  clearAllButton.addEventListener("click", () => {
    barcodeState = [];
    renderBarcodeList();
  });
}

function addBarcodeFromForm() {
  const productSelect = document.getElementById("product-select");
  const variantSelect = document.getElementById("variant-select");
  const barcodeTypeSelect = document.getElementById("barcode-type");
  const barcodeValueInput = document.getElementById("barcode-value");
  const isPrimaryInput = document.getElementById("is-primary");

  const productId = parseInt(productSelect.value || "0", 10);
  const variantId = variantSelect.value
    ? parseInt(variantSelect.value, 10)
    : null;
  const barcodeType = barcodeTypeSelect.value;
  const barcodeValue = barcodeValueInput.value.trim();
  const isPrimary = isPrimaryInput.checked;

  if (!productId || !barcodeType || !barcodeValue) {
    alert("Producto, tipo de código y valor son obligatorios.");
    return;
  }

  const product = products.find((p) => p.id === productId);
  const variant =
    variantId != null ? variants.find((v) => v.id === variantId) : null;

  const simulated = {
    id: `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    source: "simulated",
    productId: product?.id ?? null,
    productCode: product?.product_code ?? "",
    productName: product?.product_name ?? "",
    variantId: variant?.id ?? null,
    variantSku: variant?.variant_sku ?? "",
    variantName: variant?.variant_name ?? "",
    barcodeType,
    barcodeValue,
    isPrimary,
  };

  // Insertar al inicio
  barcodeState.unshift(simulated);
  renderBarcodeList();
}

// ====================================================================
// 4. Render de lista
// ====================================================================

function renderBarcodeList() {
  const list = document.getElementById("preview-list");
  const empty = document.getElementById("preview-empty");

  list.innerHTML = "";

  if (barcodeState.length === 0) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  barcodeState.forEach((item) => {
    const card = document.createElement("article");
    card.className = "preview-card";

    // Header
    const header = document.createElement("div");
    header.className = "preview-header";

    const title = document.createElement("div");
    title.className = "preview-title";
    title.textContent = item.barcodeValue;
    header.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "preview-subtitle";
    const productLabel = item.productCode
      ? `${item.productCode} — ${item.productName}`
      : item.productName;
    const variantLabel = item.variantName
      ? ` · ${item.variantName} (${item.variantSku || "sin SKU"})`
      : "";
    subtitle.textContent = `${
      productLabel || "Producto no identificado"
    }${variantLabel}`;
    header.appendChild(subtitle);

    const meta = document.createElement("div");
    meta.className = "preview-meta";

    // chip de tipo
    const typeChip = document.createElement("span");
    typeChip.classList.add("chip");

    if (item.barcodeType === "QR") {
      typeChip.classList.add("chip-qr");
      typeChip.textContent = "QR estándar";
    } else if (item.barcodeType === "EAN8") {
      typeChip.classList.add("chip-ean");
      typeChip.textContent = "EAN-8";
    } else if (item.barcodeType === "UPCA") {
      typeChip.classList.add("chip-ean");
      typeChip.textContent = "UPC-A";
    } else if (item.barcodeType === "UPCE") {
      typeChip.classList.add("chip-ean");
      typeChip.textContent = "UPC-E";
    } else if (item.barcodeType === "CODE128") {
      typeChip.classList.add("chip-code");
      typeChip.textContent = "Code 128";
    } else {
      typeChip.classList.add("chip-ean");
      typeChip.textContent = "EAN-13";
    }

    meta.appendChild(typeChip);

    if (item.isPrimary) {
      const primaryChip = document.createElement("span");
      primaryChip.classList.add("chip");
      primaryChip.style.borderColor = "rgba(234,179,8,0.7)";
      primaryChip.style.backgroundColor = "rgba(234,179,8,0.08)";
      primaryChip.style.color = "#facc15";
      primaryChip.textContent = "Principal";
      meta.appendChild(primaryChip);
    }

    if (item.source === "catalog") {
      const sourceChip = document.createElement("span");
      sourceChip.classList.add("chip", "chip-muted");
      sourceChip.textContent = "Catálogo";
      meta.appendChild(sourceChip);
    } else {
      const sourceChip = document.createElement("span");
      sourceChip.classList.add("chip", "chip-muted");
      sourceChip.textContent = "Simulado";
      meta.appendChild(sourceChip);
    }

    header.appendChild(meta);

    // Visual
    const visualWrapper = document.createElement("div");
    visualWrapper.className = "visual-wrapper";

    if (item.barcodeType === "QR") {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";

      const qr = document.createElement("div");
      qr.className = "visual-qr";

      const text = document.createElement("div");
      text.className = "visual-qr-text";
      text.textContent = truncate(item.barcodeValue, 26);

      container.appendChild(qr);
      container.appendChild(text);
      visualWrapper.appendChild(container);
    } else {
      const bc = document.createElement("div");
      bc.className = "visual-barcode";

      const text = document.createElement("div");
      text.className = "visual-barcode-text";
      text.textContent = item.barcodeValue;

      bc.appendChild(text);
      visualWrapper.appendChild(bc);
    }

    card.appendChild(header);
    card.appendChild(visualWrapper);

    list.appendChild(card);
  });
}

// Utilidad simple
function truncate(text, max) {
  if (!text) return "";
  return text.length <= max ? text : text.slice(0, max - 3) + "...";
}
