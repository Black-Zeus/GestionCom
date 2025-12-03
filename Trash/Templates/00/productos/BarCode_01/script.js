// --- Datos simulados de ejemplo (productos y variantes) ---

const mockProducts = [
  {
    id: "P001",
    name: "Detergente Multiuso 1L",
    code: "PROD-001",
    variants: [
      { id: "P001-V1", name: "Limón" },
      { id: "P001-V2", name: "Lavanda" },
    ],
  },
  {
    id: "P002",
    name: "Guantes de Nitrilo",
    code: "PROD-002",
    variants: [
      { id: "P002-V1", name: "Talla S" },
      { id: "P002-V2", name: "Talla M" },
      { id: "P002-V3", name: "Talla L" },
    ],
  },
  {
    id: "P003",
    name: "Casco de Seguridad",
    code: "PROD-003",
    variants: [],
  },
];

// Estado en memoria para códigos simulados
let simulatedBarcodes = [];

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
  initProductSelect();
  initFormHandlers();
  renderBarcodeList();
});

function initProductSelect() {
  const productSelect = document.getElementById("productSelect");
  const variantSelect = document.getElementById("variantSelect");

  // Poblar productos
  mockProducts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.code} — ${p.name}`;
    productSelect.appendChild(opt);
  });

  // Cambio de producto => poblar variantes
  productSelect.addEventListener("change", () => {
    const selectedId = productSelect.value;
    const product = mockProducts.find((p) => p.id === selectedId);

    // Limpiar variantes
    variantSelect.innerHTML = "";
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Sin variante / SKU base";
    variantSelect.appendChild(defaultOpt);

    if (product && product.variants.length > 0) {
      product.variants.forEach((v) => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.name;
        variantSelect.appendChild(opt);
      });
    }
  });
}

function initFormHandlers() {
  const form = document.getElementById("barcodeForm");
  const clearAllButton = document.getElementById("clearAllButton");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addBarcodeFromForm(form);
  });

  form.addEventListener("reset", () => {
    // Pequeño delay para no interferir con el reset nativo
    setTimeout(() => {
      const productSelect = document.getElementById("productSelect");
      const variantSelect = document.getElementById("variantSelect");
      productSelect.value = "";
      variantSelect.innerHTML = "";
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Sin variante / SKU base";
      variantSelect.appendChild(defaultOpt);
    }, 0);
  });

  clearAllButton.addEventListener("click", () => {
    simulatedBarcodes = [];
    renderBarcodeList();
  });
}

function addBarcodeFromForm(form) {
  const productId = form.productId.value;
  const variantId = form.variantId.value;
  const barcodeType = form.barcodeType.value;
  const barcodeValue = form.barcodeValue.value.trim();
  const isPrimary = form.isPrimary.checked;

  if (!productId || !barcodeType || !barcodeValue) {
    alert("Producto, tipo de código y valor son obligatorios.");
    return;
  }

  const product = mockProducts.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.id === variantId) || null;

  const newBarcode = {
    id: `BC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId,
    productCode: product?.code ?? "",
    productName: product?.name ?? "",
    variantId: variant?.id ?? "",
    variantName: variant?.name ?? "",
    barcodeType,
    barcodeValue,
    isPrimary,
  };

  simulatedBarcodes.unshift(newBarcode);
  renderBarcodeList();
}

/**
 * Renderiza la lista de códigos simulados en el panel derecho.
 */
function renderBarcodeList() {
  const listContainer = document.getElementById("barcodeList");
  const emptyState = document.getElementById("emptyState");

  listContainer.innerHTML = "";

  if (simulatedBarcodes.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  simulatedBarcodes.forEach((item) => {
    const card = document.createElement("article");
    card.className = "barcode-card";

    // Header / meta
    const header = document.createElement("div");
    header.className = "barcode-card-header";

    const title = document.createElement("div");
    title.textContent = item.barcodeValue;
    title.style.fontSize = "0.95rem";
    title.style.fontWeight = "600";

    const meta = document.createElement("div");
    meta.className = "barcode-meta";

    // Badge tipo
    const typeBadge = document.createElement("span");
    typeBadge.classList.add("badge");
    if (item.barcodeType === "QR") {
      typeBadge.classList.add("badge-qr");
      typeBadge.textContent = "QR";
    } else if (item.barcodeType === "EAN8") {
      typeBadge.classList.add("badge-ean");
      typeBadge.textContent = "EAN-8";
    } else {
      typeBadge.classList.add("badge-ean");
      typeBadge.textContent = "EAN-13";
    }
    meta.appendChild(typeBadge);

    // Badge principal
    if (item.isPrimary) {
      const primaryBadge = document.createElement("span");
      primaryBadge.classList.add("badge", "badge-primary");
      primaryBadge.textContent = "Principal";
      meta.appendChild(primaryBadge);
    }

    // Badge producto
    const productBadge = document.createElement("span");
    productBadge.classList.add("badge", "badge-product");
    const variantLabel = item.variantName ? ` · ${item.variantName}` : "";
    productBadge.textContent = `${item.productCode} — ${item.productName}${variantLabel}`;
    meta.appendChild(productBadge);

    header.appendChild(title);
    header.appendChild(meta);

    // Visual
    const visualWrapper = document.createElement("div");
    visualWrapper.className = "barcode-visual-wrapper";

    if (item.barcodeType === "QR") {
      const qrContainer = document.createElement("div");
      qrContainer.style.display = "flex";
      qrContainer.style.flexDirection = "column";
      qrContainer.style.alignItems = "center";

      const qrVisual = document.createElement("div");
      qrVisual.className = "qr-visual";

      const qrText = document.createElement("div");
      qrText.className = "qr-value-text";
      qrText.textContent = truncateForDisplay(item.barcodeValue, 22);

      qrContainer.appendChild(qrVisual);
      qrContainer.appendChild(qrText);
      visualWrapper.appendChild(qrContainer);
    } else {
      const barcodeVisual = document.createElement("div");
      barcodeVisual.className = "barcode-visual";

      const valueText = document.createElement("div");
      valueText.className = "barcode-value-text";
      valueText.textContent = item.barcodeValue;

      barcodeVisual.appendChild(valueText);
      visualWrapper.appendChild(barcodeVisual);
    }

    card.appendChild(header);
    card.appendChild(visualWrapper);

    listContainer.appendChild(card);
  });
}

/**
 * Recorta una cadena para no desbordar la UI.
 */
function truncateForDisplay(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
