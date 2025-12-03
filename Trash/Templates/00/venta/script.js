/* ==========================================================================
   Sistema POS - JavaScript Mejorado - Flujo Híbrido
   ========================================================================== */

// Variables globales
let cart = [];
let currentCustomer = null;
let selectedBuyer = null;
let searchTimeout = null;
let currentQuantityProduct = null;

// Datos cargados desde JSON
let customers = {};
let products = {};
let authorizedBuyers = {};
let systemConfig = {};
let categories = {};
let searchSuggestions = {};

// ==========================================================================
// Inicialización y Carga de Datos
// ==========================================================================

async function loadData() {
  try {
    showLoadingState(true);
    const response = await fetch("./data.json");
    const data = await response.json();

    customers = data.customers || {};
    products = data.products || {};
    authorizedBuyers = data.authorized_buyers || {};
    systemConfig = data.system_config || {};
    categories = data.categories || {};
    searchSuggestions = data.search_suggestions || {};

    console.log("✅ Datos cargados:", {
      customers: Object.keys(customers).length,
      products: Object.keys(products).length,
      categories: Object.keys(categories).length,
    });

    updateSystemInfo();
    loadCategoryOptions();
    showLoadingState(false);
  } catch (error) {
    console.error("❌ Error cargando datos:", error);
    showToast("Error cargando datos del sistema", "error");
    showLoadingState(false);
  }
}

function updateSystemInfo() {
  const userSession = systemConfig.user_session;
  if (userSession) {
    const userInfo = document.querySelector(".user-info");
    if (userInfo) {
      userInfo.innerHTML = `
        <strong>Vendedor:</strong> ${userSession.user_name}<br>
        <strong>Sucursal:</strong> ${userSession.warehouse} • 
        <strong>Fecha:</strong> ${new Date().toLocaleDateString("es-CL")}
      `;
    }

    const docPreparedBy = document.getElementById("doc-prepared-by");
    if (docPreparedBy) {
      docPreparedBy.textContent = userSession.user_name;
    }
  }
}

function loadCategoryOptions() {
  const categorySelect = document.getElementById("product-category-filter");
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Todas las categorías</option>';
    Object.values(categories).forEach((category) => {
      const option = document.createElement("option");
      option.value = category.category_name;
      option.textContent = category.category_name;
      categorySelect.appendChild(option);
    });
  }
}

function showLoadingState(show) {
  const container = document.querySelector(".container");
  if (container) {
    if (show) {
      container.classList.add("loading-state");
    } else {
      container.classList.remove("loading-state");
    }
  }
}

// ==========================================================================
// Sistema de Toasts/Notificaciones
// ==========================================================================

function showToast(message, type = "success", title = null, duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  const toastTitle =
    title ||
    {
      success: "Éxito",
      error: "Error",
      warning: "Advertencia",
      info: "Información",
    }[type];

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-content">
      <div class="toast-title">${toastTitle}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="closeToast(this)">×</button>
  `;

  container.appendChild(toast);

  // Mostrar toast
  setTimeout(() => toast.classList.add("show"), 100);

  // Auto cerrar
  setTimeout(() => {
    if (toast.parentNode) {
      closeToast(toast.querySelector(".toast-close"));
    }
  }, duration);
}

function closeToast(button) {
  const toast = button.closest(".toast");
  if (toast) {
    toast.classList.remove("show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

// ==========================================================================
// Funciones de Cliente (sin cambios mayores)
// ==========================================================================

function searchByRut() {
  const rut = document.getElementById("customer-rut").value.trim();
  const customer = customers[rut];

  if (customer) {
    selectCustomer(customer);
    showToast(`Cliente encontrado: ${customer.legal_name}`);
  } else {
    clearCustomer();
    document.getElementById("customer-name").value = "No encontrado";
    document.getElementById("customer-name").style.color = "#dc3545";
    if (rut) {
      showToast("Cliente no encontrado", "warning");
    }
  }
}

function selectCustomer(customer) {
  currentCustomer = customer;
  selectedBuyer = null;

  document.getElementById("customer-name").value = customer.legal_name;
  document.getElementById("customer-name").style.color = "#333";
  document.getElementById("customer-code").textContent = customer.customer_code;
  document.getElementById("customer-type").textContent =
    customer.customer_type === "INDIVIDUAL" ? "Persona Natural" : "Empresa";
  document.getElementById("commercial-name").textContent =
    customer.commercial_name || "N/A";
  document.getElementById("contact-person").textContent =
    customer.contact_person;
  document.getElementById("customer-email").textContent = customer.email;
  document.getElementById("customer-credit").textContent =
    customer.is_credit_customer ? "Sí" : "No";

  document.getElementById("customer-details").style.display = "block";
  document.getElementById("doc-customer").textContent = customer.legal_name;

  if (customer.customer_type === "COMPANY") {
    document.getElementById("authorized-buyer-section").style.display = "block";
    resetBuyerSelection();
  } else {
    document.getElementById("authorized-buyer-section").style.display = "none";
    document.getElementById("doc-buyer").textContent = "No aplica";
  }

  updateSendButton();
}

function clearCustomer() {
  currentCustomer = null;
  selectedBuyer = null;

  document.getElementById("customer-name").value = "";
  document.getElementById("customer-name").style.color = "#333";
  document.getElementById("customer-details").style.display = "none";
  document.getElementById("authorized-buyer-section").style.display = "none";
  document.getElementById("doc-customer").textContent = "No seleccionado";
  document.getElementById("doc-buyer").textContent = "No aplica";

  updateSendButton();
}

function resetBuyerSelection() {
  selectedBuyer = null;
  document.getElementById("buyer-name").textContent =
    "Ninguna persona seleccionada";
  document.getElementById("buyer-details").textContent =
    "Seleccione una persona autorizada";
  document.getElementById("doc-buyer").textContent = "No seleccionado";

  const selectedBuyerDiv = document.getElementById("selected-buyer");
  if (selectedBuyerDiv) {
    selectedBuyerDiv.classList.add("no-selection");
  }
}

// ==========================================================================
// Sistema de Productos Mejorado - Flujo Híbrido
// ==========================================================================

function handleProductInput(event) {
  const value = event.target.value.trim();
  const minChars = systemConfig.pos_settings?.min_search_chars || 2;

  // Limpiar timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Si está vacío, ocultar preview
  if (!value) {
    hideProductPreview();
    return;
  }

  // Si es muy corto, no buscar aún
  if (value.length < minChars) {
    return;
  }

  // Delay para evitar demasiadas búsquedas
  const delay = systemConfig.pos_settings?.search_delay_ms || 300;
  searchTimeout = setTimeout(() => {
    performQuickSearch(value);
  }, delay);
}

function handleProductEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    const value = event.target.value.trim().toUpperCase();

    if (!value) {
      showToast("Ingrese un código de producto", "warning");
      return;
    }

    processProductInput(value);
  }
}

function processProductInput(input) {
  showProductPreview("loading");

  // Buscar producto exacto
  const exactProduct = findExactProduct(input);

  if (exactProduct) {
    // Flujo 1: Producto único encontrado - agregar directo
    addProductToCart(exactProduct, 1, 0);
    clearProductInput();
    showToast(`${exactProduct.product_name} agregado al carrito`);
  } else {
    // Flujo 2: Búsqueda parcial - abrir modal
    const searchResults = performPartialSearch(input);

    if (searchResults.length === 0) {
      hideProductPreview();
      showToast(`No se encontraron productos para: ${input}`, "warning");
    } else if (searchResults.length === 1) {
      // Solo un resultado - mostrar modal de cantidad
      showQuantityModal(searchResults[0]);
    } else {
      // Múltiples resultados - abrir modal de búsqueda
      openProductSearchWithResults(input, searchResults);
    }
  }
}

function findExactProduct(input) {
  // Buscar por SKU exacto
  if (products[input]) {
    return products[input];
  }

  // Buscar por código de barras exacto
  return Object.values(products).find(
    (product) => product.barcode === input || product.variant_sku === input
  );
}

function performPartialSearch(query) {
  const searchTerm = query.toLowerCase();

  return Object.values(products).filter((product) => {
    return (
      product.variant_sku.toLowerCase().includes(searchTerm) ||
      product.product_name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      (product.description &&
        product.description.toLowerCase().includes(searchTerm))
    );
  });
}

function performQuickSearch(query) {
  const results = performPartialSearch(query);

  if (results.length === 1) {
    const product = results[0];
    showProductPreview("success", product);
  } else if (results.length > 1) {
    showProductPreview("info", null, `${results.length} productos encontrados`);
  } else {
    showProductPreview("warning", null, "No se encontraron productos");
  }
}

function showProductPreview(type, product = null, message = null) {
  const preview = document.getElementById("product-preview");
  const nameEl = document.getElementById("preview-name");
  const detailsEl = document.getElementById("preview-details");

  preview.className = "product-preview show";

  if (type === "loading") {
    preview.innerHTML = `
      <div class="alert alert-info loading">
        <div class="loading-spinner"></div>
        <div class="alert-content">
          <strong>Buscando producto...</strong>
        </div>
      </div>
    `;
  } else if (product) {
    const stockClass = getStockClass(product.stock);
    nameEl.textContent = product.product_name;
    detailsEl.innerHTML = `
      SKU: <strong>${product.variant_sku}</strong> • 
      Precio: <strong>$${product.price.toLocaleString()}</strong> • 
      Stock: <span class="${stockClass}">${product.stock} unidades</span> • 
      Marca: <strong>${product.brand}</strong>
    `;
    preview.querySelector(".alert").className = `alert alert-${type}`;
  } else if (message) {
    nameEl.textContent = message;
    detailsEl.textContent = "Presione Enter para ver resultados";
    preview.querySelector(".alert").className = `alert alert-${type}`;
  }
}

function hideProductPreview() {
  const preview = document.getElementById("product-preview");
  preview.classList.remove("show");
  setTimeout(() => {
    preview.style.display = "none";
  }, 300);
}

function clearProductInput() {
  document.getElementById("product-code").value = "";
  hideProductPreview();
  document.getElementById("product-code").focus();
}

function getStockClass(stock) {
  const lowThreshold = systemConfig.pos_settings?.low_stock_threshold || 10;
  if (stock === 0) return "stock-out";
  if (stock <= lowThreshold) return "stock-low";
  return "stock-ok";
}

// ==========================================================================
// Modal de Búsqueda de Productos Mejorado
// ==========================================================================

function openProductSearch() {
  document.getElementById("productSearchModal").style.display = "block";
  document.getElementById("productSearchModal").classList.add("show");
  document.getElementById("product-search-term").focus();
  searchProducts(); // Cargar todos los productos inicialmente
}

function openProductSearchWithResults(query, results) {
  document.getElementById("product-search-term").value = query;
  openProductSearch();
  displaySearchResults(results, query);
}

function closeProductSearch() {
  const modal = document.getElementById("productSearchModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

function searchProducts() {
  const startTime = performance.now();
  const searchTerm = document
    .getElementById("product-search-term")
    .value.toLowerCase()
    .trim();
  const categoryFilter = document.getElementById(
    "product-category-filter"
  ).value;

  let results = Object.values(products);

  // Filtrar por término de búsqueda
  if (searchTerm) {
    results = performPartialSearch(searchTerm);
  }

  // Filtrar por categoría
  if (categoryFilter) {
    results = results.filter((product) => product.category === categoryFilter);
  }

  const endTime = performance.now();
  displaySearchResults(results, searchTerm, endTime - startTime);
}

function displaySearchResults(results, searchTerm = "", searchTime = 0) {
  const grid = document.getElementById("products-grid");
  const stats = document.getElementById("search-stats");
  const noResults = document.getElementById("no-results");
  const resultsCount = document.getElementById("results-count");
  const searchTimeEl = document.getElementById("search-time");

  // Actualizar estadísticas
  if (resultsCount) {
    resultsCount.textContent = `${results.length} producto${
      results.length !== 1 ? "s" : ""
    } encontrado${results.length !== 1 ? "s" : ""}`;
  }
  if (searchTimeEl && searchTime) {
    searchTimeEl.textContent = `(${searchTime.toFixed(0)}ms)`;
  }
  stats.style.display = results.length > 0 ? "flex" : "none";

  if (results.length === 0) {
    grid.style.display = "none";
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";
  grid.style.display = "grid";

  grid.innerHTML = results
    .map((product) => {
      const stockBadge = getStockBadgeHTML(product.stock);
      const isOutOfStock = product.stock === 0;

      return `
      <div class="product-card ${
        isOutOfStock ? "out-of-stock" : ""
      }" onclick="${
        !isOutOfStock ? `selectProductFromSearch('${product.variant_sku}')` : ""
      }">
        <div class="product-card-header">
          <span class="product-sku">${product.variant_sku}</span>
          ${stockBadge}
        </div>
        <div class="product-card-title">${product.product_name}</div>
        <div class="product-card-details">
          <span><strong>${product.brand}</strong> • ${product.category}</span>
          <span class="product-price">$${product.price.toLocaleString()}</span>
        </div>
        <div class="product-card-actions">
          <button class="add-to-cart-btn" 
                  onclick="event.stopPropagation(); ${
                    !isOutOfStock
                      ? `selectProductFromSearch('${product.variant_sku}')`
                      : "void(0)"
                  }" 
                  ${isOutOfStock ? "disabled" : ""}>
            ${isOutOfStock ? "Sin Stock" : "Agregar"}
          </button>
          <button class="quick-view-btn" onclick="event.stopPropagation(); showQuantityModal(products['${
            product.variant_sku
          }'])">
            Vista Rápida
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

function getStockBadgeHTML(stock) {
  const lowThreshold = systemConfig.pos_settings?.low_stock_threshold || 10;
  let badgeClass, text;

  if (stock === 0) {
    badgeClass = "stock-out";
    text = "Sin Stock";
  } else if (stock <= lowThreshold) {
    badgeClass = "stock-low";
    text = `${stock} unidades`;
  } else {
    badgeClass = "stock-ok";
    text = `${stock} unidades`;
  }

  return `<span class="stock-badge ${badgeClass}">${text}</span>`;
}

function selectProductFromSearch(productCode) {
  const product = products[productCode];
  if (product && product.stock > 0) {
    showQuantityModal(product);
  }
}

function handleProductSearchEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchProducts();
  }
}

// ==========================================================================
// Modal de Cantidad/Confirmación
// ==========================================================================

function showQuantityModal(product) {
  if (!product || product.stock === 0) {
    showToast("Producto sin stock disponible", "warning");
    return;
  }

  currentQuantityProduct = product;

  // Actualizar información del producto
  document.getElementById("quantity-product-name").textContent =
    product.product_name;
  document.getElementById("quantity-product-details").innerHTML = `
    SKU: <strong>${product.variant_sku}</strong> • 
    Marca: <strong>${product.brand}</strong> • 
    Stock: <strong>${product.stock} unidades</strong>
  `;
  document.getElementById(
    "quantity-product-price"
  ).textContent = `$${product.price.toLocaleString()}`;

  // Resetear cantidad a 1
  updateQuantityDisplay(1);

  // Mostrar modal
  const modal = document.getElementById("quantityModal");
  modal.style.display = "block";
  modal.classList.add("show");
}

function closeQuantityModal() {
  const modal = document.getElementById("quantityModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
    currentQuantityProduct = null;
  }, 300);
}

function updateQuantityDisplay(quantity) {
  const display = document.getElementById("quantity-display");
  const decreaseBtn = document.getElementById("quantity-decrease");

  // Asegurar que sea un entero
  const intQuantity = Math.max(1, Math.floor(quantity));

  if (display) {
    display.textContent = intQuantity;
  }

  if (decreaseBtn) {
    decreaseBtn.disabled = intQuantity <= 1;
  }

  return intQuantity;
}

function increaseQuantity() {
  const display = document.getElementById("quantity-display");
  const current = parseInt(display.textContent) || 1;
  const max = currentQuantityProduct ? currentQuantityProduct.stock : 999;

  if (current < max) {
    updateQuantityDisplay(current + 1);
  } else {
    showToast(`Stock máximo disponible: ${max}`, "warning");
  }
}

function decreaseQuantity() {
  const display = document.getElementById("quantity-display");
  const current = parseInt(display.textContent) || 1;

  if (current > 1) {
    updateQuantityDisplay(current - 1);
  }
}

// Nueva función para mostrar detalles del producto
function showProductDetails(productCode) {
  const product = products[productCode];
  if (!product) {
    showToast("Producto no encontrado", "error");
    return;
  }

  // Crear modal temporal para mostrar detalles
  const modalHTML = `
    <div id="productDetailsModal" class="modal" style="display: block;">
      <div class="modal-content" style="max-width: 600px; margin: 10% auto;">
        <div class="modal-header">
          <h2>📋 Detalles del Producto</h2>
          <span class="close" onclick="closeProductDetails()">&times;</span>
        </div>
        <div class="modal-body">
          <div class="product-summary">
            <div class="product-summary-title">${product.product_name}</div>
            <div class="product-summary-price">${product.price.toLocaleString()}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div><strong>SKU:</strong> ${product.variant_sku}</div>
            <div><strong>Código de Barras:</strong> ${
              product.barcode || "N/A"
            }</div>
            <div><strong>Marca:</strong> ${product.brand}</div>
            <div><strong>Categoría:</strong> ${product.category}</div>
            <div><strong>Stock Disponible:</strong> <span class="${getStockClass(
              product.stock
            )}">${product.stock} unidades</span></div>
            <div><strong>Estado:</strong> ${
              product.stock > 0 ? "✅ Disponible" : "❌ Sin Stock"
            }</div>
          </div>
          
          ${
            product.description
              ? `
            <div style="margin: 15px 0;">
              <strong>Descripción:</strong><br>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 5px;">
                ${product.description}
              </div>
            </div>
          `
              : ""
          }
          
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeProductDetails()">
              Cerrar
            </button>           
          </div>
        </div>
      </div>
    </div>
  `;

  // Agregar modal al DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Agregar clase show para animación
  setTimeout(() => {
    document.getElementById("productDetailsModal").classList.add("show");
  }, 10);
}

function closeProductDetails() {
  const modal = document.getElementById("productDetailsModal");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

function confirmAddToCart() {
  if (!currentQuantityProduct) return;

  const quantity =
    parseInt(document.getElementById("quantity-display").textContent) || 1;

  addProductToCart(currentQuantityProduct, quantity, 0);
  closeQuantityModal();
  closeProductSearch(); // Cerrar también el modal de búsqueda si está abierto

  showToast(
    `${currentQuantityProduct.product_name} (${quantity}) agregado al carrito`
  );
}

// ==========================================================================
// Gestión del Carrito Mejorada
// ==========================================================================

function addProductToCart(product, quantity = 1, discount = 0) {
  if (!product || product.stock < quantity) {
    showToast("Stock insuficiente", "error");
    return false;
  }

  // Buscar si ya existe en el carrito
  const existingIndex = cart.findIndex(
    (item) => item.code === product.variant_sku
  );

  if (existingIndex >= 0) {
    // Actualizar cantidad existente
    const newQuantity = cart[existingIndex].quantity + quantity;
    if (newQuantity > product.stock) {
      showToast(`Stock máximo disponible: ${product.stock}`, "warning");
      return false;
    }

    cart[existingIndex].quantity = newQuantity;
    cart[existingIndex].discount = discount;
    cart[existingIndex].subtotal =
      cart[existingIndex].price * newQuantity * (1 - discount / 100);
  } else {
    // Agregar nuevo item
    cart.push({
      id: Date.now() + Math.random(), // ID único
      code: product.variant_sku,
      name: product.product_name,
      brand: product.brand,
      price: product.price,
      quantity: quantity,
      discount: discount,
      subtotal: product.price * quantity * (1 - discount / 100),
      category: product.category,
    });
  }

  updateCartDisplay();
  return true;
}

function updateCartDisplay() {
  const tbody = document.getElementById("items-tbody");
  const empty = document.getElementById("empty-table");

  if (cart.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    tbody.innerHTML = cart
      .map((item, index) => {
        const rowClass = index === cart.length - 1 ? "new-item" : "";
        const lineTotal = item.price * item.quantity;
        const lineDiscount = lineTotal * (item.discount / 100);
        const lineSubtotal = lineTotal - lineDiscount;

        return `
        <tr class="${rowClass}">
          <td><strong>${item.code}</strong></td>
          <td class="product-cell">
            <div class="product-name">
              <a href="#" onclick="showProductDetails('${
                item.code
              }')" class="product-link" title="Ver detalles del producto">
                ${item.name}
              </a>
            </div>
            <div class="product-details">
              <span class="product-badge">${item.brand}</span>
              <span>${item.category}</span>
              <span class="line-total-info">Total línea: ${Math.round(
                lineTotal
              ).toLocaleString()}</span>
            </div>
          </td>
          <td class="price-cell">${item.price.toLocaleString()}</td>
          <td>
            <input type="number" class="quantity-input" value="${
              item.quantity
            }" 
                   min="1" step="1" max="${getProductStock(item.code)}"
                   onchange="updateItemQuantity(${item.id}, this.value)"
                   oninput="updateItemQuantity(${item.id}, this.value)">
          </td>
          <td>
            <input type="number" class="discount-input" value="${
              item.discount
            }" 
                   min="0" max="100" step="0.01"
                   onchange="updateItemDiscount(${item.id}, this.value)"
                   oninput="updateItemDiscount(${item.id}, this.value)">%
          </td>
          <td class="subtotal-cell">${Math.round(
            lineSubtotal
          ).toLocaleString()}</td>
          <td>
            <button class="remove-btn" onclick="removeItem(${
              item.id
            })" title="Eliminar">×</button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  calculateTotals();
}

function getProductStock(productCode) {
  const product = products[productCode];
  return product ? product.stock : 999;
}

function updateItemQuantity(itemId, newQty) {
  const item = cart.find((i) => i.id === itemId);
  if (!item) return;

  // Convertir a entero, no decimales
  const quantity = Math.max(1, Math.floor(parseFloat(newQty) || 1));
  const maxStock = getProductStock(item.code);

  if (quantity > maxStock) {
    showToast(`Stock máximo disponible: ${maxStock}`, "warning");
    // Actualizar el input con el valor máximo permitido
    const input = document.querySelector(`input[onchange*="${itemId}"]`);
    if (input) input.value = Math.min(item.quantity, maxStock);
    return;
  }

  item.quantity = quantity;
  item.subtotal = item.price * item.quantity * (1 - item.discount / 100);

  // Actualizar el input con el valor corregido (entero)
  const input = document.querySelector(`input[onchange*="${itemId}"]`);
  if (input) input.value = quantity;

  // Refrescar solo esta fila para mostrar el nuevo subtotal
  updateCartDisplay();
}

function updateItemDiscount(itemId, newDiscount) {
  const item = cart.find((i) => i.id === itemId);
  if (!item) return;

  const discount = Math.max(0, Math.min(100, parseFloat(newDiscount) || 0));
  item.discount = discount;
  item.subtotal = item.price * item.quantity * (1 - discount / 100);

  // Refrescar solo esta fila para mostrar el nuevo subtotal
  updateCartDisplay();
}

function removeItem(itemId) {
  const item = cart.find((i) => i.id === itemId);
  if (item) {
    cart = cart.filter((i) => i.id !== itemId);
    updateCartDisplay();
    showToast(`${item.name} eliminado del carrito`, "info");
  }
}

// ==========================================================================
// Cálculos y Totales
// ==========================================================================

function calculateTotals() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const lineDiscount = cart.reduce(
    (sum, item) => sum + (item.price * item.quantity * item.discount) / 100,
    0
  );

  const docDiscount =
    parseFloat(document.getElementById("doc-discount").value) || 0;
  const docDiscountAmount = ((subtotal - lineDiscount) * docDiscount) / 100;

  const net = subtotal - lineDiscount - docDiscountAmount;
  const ivaRate = systemConfig.tax_settings
    ? systemConfig.tax_settings.iva_rate
    : 0.19;
  const tax = net * ivaRate;
  const total = net + tax;

  // Actualizar UI
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("subtotal").textContent =
    "$" + Math.round(subtotal).toLocaleString();
  document.getElementById("line-discount").textContent =
    "-$" + Math.round(lineDiscount).toLocaleString();
  document.getElementById("doc-discount-amount").textContent =
    "-$" + Math.round(docDiscountAmount).toLocaleString();
  document.getElementById("tax").textContent =
    "$" + Math.round(tax).toLocaleString();
  document.getElementById("total").textContent =
    "$" + Math.round(total).toLocaleString();
  document.getElementById("doc-items").textContent = totalItems;

  updateSendButton();
}

function updateSendButton() {
  const btn = document.getElementById("send-btn");
  const hasItems = cart.length > 0;
  const hasCustomer = currentCustomer !== null;
  const needsBuyer =
    currentCustomer && currentCustomer.customer_type === "COMPANY";
  const hasBuyer = selectedBuyer !== null;

  const canSend = hasItems && hasCustomer && (!needsBuyer || hasBuyer);
  btn.disabled = !canSend;

  // Actualizar texto del botón según el estado
  if (!hasItems) {
    btn.textContent = "📦 Agregar productos";
  } else if (!hasCustomer) {
    btn.textContent = "👤 Seleccionar cliente";
  } else if (needsBuyer && !hasBuyer) {
    btn.textContent = "👥 Seleccionar comprador";
  } else {
    btn.textContent = "📤 Enviar a Caja";
  }
}

// ==========================================================================
// Modales de Clientes y Compradores (sin cambios mayores)
// ==========================================================================

function openCustomerSearch() {
  document.getElementById("customerModal").style.display = "block";
  loadCustomerList();
}

function closeCustomerSearch() {
  document.getElementById("customerModal").style.display = "none";
}

function loadCustomerList() {
  const tbody = document.getElementById("customers-tbody");
  tbody.innerHTML = Object.values(customers)
    .map(
      (customer) => `
    <tr onclick="selectCustomerFromModal('${customer.tax_id}')">
      <td>${customer.tax_id}</td>
      <td>
        <strong>${customer.legal_name}</strong>
        ${
          customer.commercial_name
            ? `<br><small>${customer.commercial_name}</small>`
            : ""
        }
      </td>
      <td>${
        customer.customer_type === "INDIVIDUAL" ? "Individual" : "Empresa"
      }</td>
      <td>${customer.email}</td>
      <td>${customer.phone}</td>
      <td class="credit-badge ${
        customer.is_credit_customer ? "credit-yes" : "credit-no"
      }">
        ${customer.is_credit_customer ? "Sí" : "No"}
      </td>
      <td>
        <button onclick="event.stopPropagation(); selectCustomerFromModal('${
          customer.tax_id
        }')" 
                class="btn btn-success btn-xs">Seleccionar</button>
      </td>
    </tr>
  `
    )
    .join("");
}

function selectCustomerFromModal(taxId) {
  selectCustomer(customers[taxId]);
  closeCustomerSearch();
}

function openAuthorizedBuyerModal() {
  if (!currentCustomer || currentCustomer.customer_type !== "COMPANY") {
    showToast("Seleccione una empresa primero", "warning");
    return;
  }

  document.getElementById("authorizedBuyerModal").style.display = "block";
  document.getElementById("modal-company-name").textContent =
    currentCustomer.legal_name;
  document.getElementById("modal-company-rut").textContent =
    currentCustomer.tax_id;
  loadAuthorizedBuyers();
}

function closeAuthorizedBuyerModal() {
  document.getElementById("authorizedBuyerModal").style.display = "none";
}

function loadAuthorizedBuyers() {
  const buyers = authorizedBuyers[currentCustomer.tax_id] || [];
  const tbody = document.getElementById("authorized-persons-tbody");

  if (buyers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: #6c757d;">
          No hay personas autorizadas registradas
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = buyers
    .map(
      (buyer) => `
    <tr onclick="selectBuyer(${buyer.id})">
      <td>
        <strong>${buyer.authorized_name}</strong>
        ${
          buyer.is_primary_contact
            ? '<br><span class="primary-contact">CONTACTO PRINCIPAL</span>'
            : ""
        }
      </td>
      <td>${buyer.authorized_tax_id}</td>
      <td>${buyer.position}</td>
      <td>${buyer.email}</td>
      <td>
        <span class="authorization-level auth-${buyer.authorization_level.toLowerCase()}">
          ${buyer.authorization_level}
        </span>
      </td>
      <td>
        ${
          buyer.max_purchase_amount
            ? `${buyer.max_purchase_amount.toLocaleString()}`
            : "Sin límite"
        }
      </td>
      <td>
        <button class="person-select-btn" 
                onclick="event.stopPropagation(); selectBuyer(${buyer.id})">
          Seleccionar
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

function selectBuyer(buyerId) {
  const buyers = authorizedBuyers[currentCustomer.tax_id] || [];
  const buyer = buyers.find((b) => b.id === buyerId);

  if (buyer) {
    selectedBuyer = buyer;
    document.getElementById("buyer-name").textContent = buyer.authorized_name;
    document.getElementById("buyer-details").innerHTML = `
      <strong>RUT:</strong> ${buyer.authorized_tax_id} • 
      <strong>Cargo:</strong> ${buyer.position} • 
      <strong>Nivel:</strong> ${buyer.authorization_level}
    `;
    document.getElementById("doc-buyer").textContent = buyer.authorized_name;

    const selectedBuyerDiv = document.getElementById("selected-buyer");
    if (selectedBuyerDiv) {
      selectedBuyerDiv.classList.remove("no-selection");
    }

    updateSendButton();
    closeAuthorizedBuyerModal();
    showToast(`Comprador seleccionado: ${buyer.authorized_name}`);
  }
}

// ==========================================================================
// Acciones Principales
// ==========================================================================

function sendToCashier() {
  if (cart.length === 0) {
    showToast("No hay productos en el carrito", "warning");
    return;
  }

  if (!currentCustomer) {
    showToast("Debe seleccionar un cliente", "warning");
    return;
  }

  if (currentCustomer.customer_type === "COMPANY" && !selectedBuyer) {
    showToast("Debe seleccionar una persona autorizada", "warning");
    return;
  }

  // Validar stock antes de enviar
  const stockErrors = validateCartStock();
  if (stockErrors.length > 0) {
    showToast(`Error de stock: ${stockErrors.join(", ")}`, "error");
    return;
  }

  const total = document.getElementById("total").textContent;
  const saleId = "PV" + Date.now().toString().slice(-6);

  // Simular envío exitoso
  const saleData = {
    id: saleId,
    customer: currentCustomer,
    buyer: selectedBuyer,
    items: cart.map((item) => ({ ...item })),
    totals: {
      items: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      discounts: cart.reduce(
        (sum, item) => sum + (item.price * item.quantity * item.discount) / 100,
        0
      ),
      total: parseFloat(total.replace(/[$,]/g, "")),
    },
    timestamp: new Date().toISOString(),
  };

  console.log("📤 Venta enviada a caja:", saleData);

  let message = "✅ Venta enviada a caja exitosamente\n\n";
  message += `📄 Número: ${saleId}\n`;
  message += `👤 Cliente: ${currentCustomer.legal_name}\n`;
  if (selectedBuyer) {
    message += `👥 Comprador: ${selectedBuyer.authorized_name}\n`;
  }
  message += `💰 Total: ${total}`;

  showToast("Venta enviada a caja exitosamente", "success", "¡Éxito!");

  // Mostrar detalles en consola para debugging
  setTimeout(() => {
    alert(message);
    clearAll();
  }, 500);
}

function validateCartStock() {
  const errors = [];

  cart.forEach((item) => {
    const product = products[item.code];
    if (!product) {
      errors.push(`${item.name}: Producto no encontrado`);
    } else if (product.stock < item.quantity) {
      errors.push(
        `${item.name}: Stock insuficiente (${product.stock} disponible)`
      );
    }
  });

  return errors;
}

function clearAll() {
  cart = [];
  clearCustomer();
  clearProductInput();
  document.getElementById("doc-discount").value = "0";
  updateCartDisplay();

  // Reset formulario
  document.getElementById("customer-rut").value = "";
  document.getElementById("customer-rut").focus();

  showToast("Formulario limpiado", "info");
}

function saveDraft() {
  if (cart.length === 0) {
    showToast("No hay productos para guardar", "warning");
    return;
  }

  const draftData = {
    customer: currentCustomer,
    buyer: selectedBuyer,
    items: cart,
    docDiscount: document.getElementById("doc-discount").value,
    timestamp: new Date().toISOString(),
  };

  // Simular guardado (en implementación real, enviar al servidor)
  const draftId = "DRAFT" + Date.now().toString().slice(-6);
  console.log("💾 Borrador guardado:", draftId, draftData);

  showToast(`Borrador guardado como ${draftId}`, "success");
}

// ==========================================================================
// Event Listeners y Validaciones
// ==========================================================================

function handleRutEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchByRut();
  }
}

function handleSearchEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    loadCustomerList();
  }
}

// Cerrar modales con clic fuera
window.onclick = function (event) {
  const customerModal = document.getElementById("customerModal");
  const buyerModal = document.getElementById("authorizedBuyerModal");
  const productModal = document.getElementById("productSearchModal");
  const quantityModal = document.getElementById("quantityModal");

  if (event.target === customerModal) {
    closeCustomerSearch();
  }
  if (event.target === buyerModal) {
    closeAuthorizedBuyerModal();
  }
  if (event.target === productModal) {
    closeProductSearch();
  }
  if (event.target === quantityModal) {
    closeQuantityModal();
  }
};

// Cerrar modales con tecla Escape
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const modals = [
      "customerModal",
      "authorizedBuyerModal",
      "productSearchModal",
      "quantityModal",
    ];

    modals.forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (modal && modal.style.display === "block") {
        modal.querySelector(".close").click();
      }
    });
  }
});

// ==========================================================================
// Utilidades y Helpers
// ==========================================================================

function formatCurrency(amount) {
  const symbol = systemConfig.tax_settings?.currency_symbol || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

function validateRUT(rut) {
  // Implementación básica de validación de RUT chileno
  if (!rut) return false;

  const cleanRut = rut.replace(/[.-]/g, "");
  if (cleanRut.length < 8) return false;

  return true; // Simplificado para el demo
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==========================================================================
// Inicialización de la Aplicación
// ==========================================================================

document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 Iniciando Sistema POS...");

  try {
    // Cargar datos primero
    await loadData();

    // Configurar event listeners
    const productCodeInput = document.getElementById("product-code");
    if (productCodeInput) {
      productCodeInput.addEventListener("input", handleProductInput);
    }

    const docDiscountInput = document.getElementById("doc-discount");
    if (docDiscountInput) {
      docDiscountInput.addEventListener("change", calculateTotals);
    }

    // Configurar botones de cantidad
    const quantityIncreaseBtn = document.getElementById("quantity-increase");
    const quantityDecreaseBtn = document.getElementById("quantity-decrease");
    const confirmAddBtn = document.getElementById("confirm-add-to-cart");

    if (quantityIncreaseBtn) {
      quantityIncreaseBtn.addEventListener("click", increaseQuantity);
    }
    if (quantityDecreaseBtn) {
      quantityDecreaseBtn.addEventListener("click", decreaseQuantity);
    }
    if (confirmAddBtn) {
      confirmAddBtn.addEventListener("click", confirmAddToCart);
    }

    // Focus inicial
    const customerRutInput = document.getElementById("customer-rut");
    if (customerRutInput) {
      customerRutInput.focus();
    }

    // Calcular totales iniciales
    calculateTotals();

    // Actualizar fecha y hora
    updateDateTime();

    console.log("✅ Sistema POS cargado correctamente");
    showToast("Sistema POS listo para usar", "success", "¡Bienvenido!");
  } catch (error) {
    console.error("❌ Error inicializando el sistema:", error);
    showToast("Error inicializando el sistema", "error");
  }
});

function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL");
  const timeStr = now.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDateEl = document.getElementById("current-date");
  const docDateEl = document.getElementById("doc-date");

  if (currentDateEl) {
    currentDateEl.textContent = dateStr;
  }

  if (docDateEl) {
    docDateEl.textContent = `${dateStr} - ${timeStr}`;
  }
}

// ==========================================================================
// Auto-save y recuperación de sesión
// ==========================================================================

function autoSave() {
  if (cart.length > 0 || currentCustomer) {
    const sessionData = {
      cart: cart,
      customer: currentCustomer,
      buyer: selectedBuyer,
      docDiscount: document.getElementById("doc-discount").value,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem("pos_session", JSON.stringify(sessionData));
      console.log("💾 Sesión guardada automáticamente");
    } catch (error) {
      console.warn("⚠️ No se pudo guardar la sesión:", error);
    }
  }
}

function loadSession() {
  try {
    const savedSession = localStorage.getItem("pos_session");
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      const age = Date.now() - sessionData.timestamp;
      const maxAge =
        (systemConfig.pos_settings?.auto_save_draft_minutes || 60) * 60 * 1000;

      if (age < maxAge) {
        // Restaurar sesión
        if (sessionData.cart) cart = sessionData.cart;
        if (sessionData.customer) selectCustomer(sessionData.customer);
        if (sessionData.buyer) selectedBuyer = sessionData.buyer;
        if (sessionData.docDiscount) {
          document.getElementById("doc-discount").value =
            sessionData.docDiscount;
        }

        updateCartDisplay();
        showToast("Sesión anterior restaurada", "info");
      } else {
        localStorage.removeItem("pos_session");
      }
    }
  } catch (error) {
    console.warn("⚠️ Error cargando sesión guardada:", error);
    localStorage.removeItem("pos_session");
  }
}

// Auto-save cada cierto tiempo
setInterval(autoSave, 30000); // Cada 30 segundos

// Guardar al salir de la página
window.addEventListener("beforeunload", autoSave);

console.log("📦 POS Sistema Mejorado cargado correctamente");
