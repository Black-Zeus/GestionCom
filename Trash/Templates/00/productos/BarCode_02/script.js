// ---------------- Mock de productos / variantes ----------------

const mockProducts = [
  {
    id: "P001",
    code: "PROD-001",
    name: "Detergente Multiuso 1L",
    variants: [
      { id: "P001-V1", name: "Limón" },
      { id: "P001-V2", name: "Lavanda" },
    ],
  },
  {
    id: "P002",
    code: "PROD-002",
    name: "Guantes de Nitrilo",
    variants: [
      { id: "P002-V1", name: "Talla S" },
      { id: "P002-V2", name: "Talla M" },
      { id: "P002-V3", name: "Talla L" },
    ],
  },
  {
    id: "P003",
    code: "PROD-003",
    name: "Casco de Seguridad",
    variants: [],
  },
];

// Estado local de códigos simulados
let simulatedBarcodes = [];

// ---------------- Inicialización ----------------

document.addEventListener("DOMContentLoaded", () => {
  initProductSelect();
  initFormHandlers();
  renderBarcodeList();
});

// Poblar selector de productos y manejar variantes
function initProductSelect() {
  const productSelect = document.getElementById("productSelect");
  const variantSelect = document.getElementById("variantSelect");

  mockProducts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.code} — ${p.name}`;
    productSelect.appendChild(opt);
  });

  productSelect.addEventListener("change", () => {
    const selectedId = productSelect.value;
    const product = mockProducts.find((p) => p.id === selectedId);

    // Reset de variantes
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

// Manejo de formulario y botones
function initFormHandlers() {
  const form = document.getElementById("barcodeForm");
  const clearAllButton = document.getElementById("clearAllButton");
  const productSelect = document.getElementById("productSelect");
  const variantSelect = document.getElementById("variantSelect");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    addBarcodeFromForm(form);
  });

  form.addEventListener("reset", () => {
    // Esperar al reset nativo y luego normalizar selects
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
    simulatedBarcodes = [];
    renderBarcodeList();
  });
}

// Construir objeto de código desde formulario
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

  // Insertar al inicio
  simulatedBarcodes.unshift(newBarcode);
  renderBarcodeList();
}

// ---------------- Render de lista ----------------

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

    // Header
    const header = document.createElement("div");
    header.className = "barcode-card-header";

    const title = document.createElement("div");
    title.className = "barcode-title";
    title.textContent = item.barcodeValue;
    header.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "barcode-meta";

    // Tipo
    const typePill = document.createElement("span");
    typePill.classList.add("pill");

    if (item.barcodeType === "QR") {
      typePill.classList.add("pill-qr");
      typePill.textContent = "QR estándar";
    } else if (item.barcodeType === "EAN8") {
      typePill.classList.add("pill-ean");
      typePill.textContent = "EAN-8";
    } else if (item.barcodeType === "UPCA") {
      typePill.classList.add("pill-ean");
      typePill.textContent = "UPC-A";
    } else if (item.barcodeType === "UPCE") {
      typePill.classList.add("pill-ean");
      typePill.textContent = "UPC-E";
    } else if (item.barcodeType === "CODE128") {
      typePill.classList.add("pill-code");
      typePill.textContent = "Code 128";
    } else {
      typePill.classList.add("pill-ean");
      typePill.textContent = "EAN-13";
    }

    meta.appendChild(typePill);

    // Principal
    if (item.isPrimary) {
      const primaryPill = document.createElement("span");
      primaryPill.classList.add("pill", "pill-primary");
      primaryPill.textContent = "Principal";
      meta.appendChild(primaryPill);
    }

    // Producto
    const productPill = document.createElement("span");
    productPill.classList.add("pill", "pill-product");
    const variantLabel = item.variantName ? ` · ${item.variantName}` : "";
    productPill.textContent = `${item.productCode} — ${item.productName}${variantLabel}`;
    meta.appendChild(productPill);

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
      qrText.textContent = truncateForDisplay(item.barcodeValue, 26);

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

// Pequeña utilidad para evitar desbordes
function truncateForDisplay(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
