/* ==========================================================================
   Sistema POS - Caja - JavaScript
   ========================================================================== */

// Variables globales
let pendingSales = [];
let filteredSales = [];
let selectedSale = null;
let selectedPaymentMethod = null;
let currentDocumentType = "BOLETA";
let paymentMethods = [];
let documentTypes = [];
let systemConfig = {};
let sessionInfo = {};
let statistics = {};

// ==========================================================================
// Inicialización y Carga de Datos
// ==========================================================================

async function loadData() {
  try {
    showLoadingState(true);
    const response = await fetch("./data.json");
    const data = await response.json();

    pendingSales = data.pending_sales || [];
    paymentMethods = data.payment_methods || [];
    documentTypes = data.document_types || [];
    systemConfig = data.system_config || {};
    sessionInfo = data.cash_register_session || {};
    statistics = data.statistics || {};

    console.log("✅ Datos de caja cargados:", {
      pendingSales: pendingSales.length,
      paymentMethods: paymentMethods.length,
      documentTypes: documentTypes.length,
    });

    updateSystemInfo();
    loadPendingSales();
    updateStats();
    showLoadingState(false);
  } catch (error) {
    console.error("❌ Error cargando datos:", error);
    showToast("Error cargando datos del sistema", "error");
    showLoadingState(false);
  }
}

function updateSystemInfo() {
  if (sessionInfo.cashier) {
    document.getElementById("cashier-name").textContent =
      sessionInfo.cashier.name;
  }
  if (sessionInfo.cash_register) {
    document.getElementById("register-name").textContent =
      sessionInfo.cash_register.name;
  }

  const sessionStatus = document.getElementById("session-status");
  if (sessionInfo.session_status && sessionStatus) {
    sessionStatus.textContent = sessionInfo.session_status.name;
    sessionStatus.className =
      sessionInfo.session_status.code === "ACTIVE"
        ? "session-active"
        : "session-inactive";
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
// Sistema de Toasts/Notificaciones (reutilizado del sistema anterior)
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
// Búsqueda por Folio
// ==========================================================================

function handleFolioEnter(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    searchByFolio();
  }
}

function handleFolioInput(event) {
  const value = event.target.value.trim().toUpperCase();
  event.target.value = value;

  if (!value) {
    hideSalePreview();
  }
}

function searchByFolio() {
  const folio = document
    .getElementById("sale-folio")
    .value.trim()
    .toUpperCase();

  if (!folio) {
    showToast("Ingrese un folio de venta", "warning");
    return;
  }

  const sale = pendingSales.find((s) => s.folio === folio);

  if (sale) {
    showSalePreview(sale);
    selectSale(sale);
    showToast(`Venta ${folio} encontrada`, "success");

    // Limpiar input
    document.getElementById("sale-folio").value = "";
    hideSalePreview();
  } else {
    hideSalePreview();
    showToast(`No se encontró la venta ${folio}`, "warning");
  }
}

function showSalePreview(sale) {
  const preview = document.getElementById("sale-preview");
  document.getElementById("preview-folio").textContent = sale.folio;
  document.getElementById("preview-total").textContent = `$${Math.round(
    sale.totals.total_amount
  ).toLocaleString()}`;
  document.getElementById("preview-details").innerHTML = `
    <strong>Cliente:</strong> ${sale.customer.name} • 
    <strong>Items:</strong> ${sale.totals.total_items} • 
    <strong>Fecha:</strong> ${sale.sale_info.date} ${sale.sale_info.time}
  `;
  preview.style.display = "block";
  preview.classList.add("show");
}

function hideSalePreview() {
  const preview = document.getElementById("sale-preview");
  preview.classList.remove("show");
  setTimeout(() => {
    preview.style.display = "none";
  }, 300);
}

// ==========================================================================
// Gestión de Ventas Pendientes
// ==========================================================================

function loadPendingSales() {
  filteredSales = [...pendingSales];
  displayPendingSales(filteredSales);
}

function filterPendingSales() {
  const dateFilter = document.getElementById("date-filter").value;
  const customerFilter = document
    .getElementById("customer-filter")
    .value.toLowerCase()
    .trim();
  const amountFilter = document.getElementById("amount-filter").value;

  filteredSales = pendingSales.filter((sale) => {
    // Filtro por fecha
    let passesDateFilter = true;
    if (dateFilter !== "all") {
      const saleDate = new Date(sale.sale_info.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      switch (dateFilter) {
        case "today":
          passesDateFilter = saleDate.toDateString() === today.toDateString();
          break;
        case "yesterday":
          passesDateFilter =
            saleDate.toDateString() === yesterday.toDateString();
          break;
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          passesDateFilter = saleDate >= weekAgo;
          break;
      }
    }

    // Filtro por cliente
    let passesCustomerFilter = true;
    if (customerFilter) {
      passesCustomerFilter =
        sale.customer.name.toLowerCase().includes(customerFilter) ||
        sale.customer.rut.includes(customerFilter) ||
        (sale.buyer && sale.buyer.name.toLowerCase().includes(customerFilter));
    }

    // Filtro por monto
    let passesAmountFilter = true;
    if (amountFilter) {
      const amount = sale.totals.total_amount;
      const [min, max] = amountFilter
        .split("-")
        .map((v) => (v === "+" ? Infinity : parseInt(v)));

      if (amountFilter.includes("+")) {
        passesAmountFilter = amount >= min;
      } else {
        passesAmountFilter = amount >= min && amount <= max;
      }
    }

    return passesDateFilter && passesCustomerFilter && passesAmountFilter;
  });

  displayPendingSales(filteredSales);
  updateStats();
}

function displayPendingSales(sales) {
  const tbody = document.getElementById("pending-sales-tbody");
  const empty = document.getElementById("empty-pending");

  if (sales.length === 0) {
    tbody.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  tbody.innerHTML = sales
    .map((sale) => {
      const priorityClass = sale.priority
        ? `${sale.priority.toLowerCase()}-priority`
        : "";
      const isExpired = new Date(sale.timestamps.expires_at) < new Date();
      const expiredClass = isExpired ? "expired-sale" : "";

      return `
      <tr onclick="selectSale('${
        sale.folio
      }')" class="pending-sale-row ${priorityClass} ${expiredClass}" data-folio="${
        sale.folio
      }">
        <td><strong>${sale.folio}</strong></td>
        <td>
          <div class="customer-cell">
            <div class="customer-name">${sale.customer.name}</div>
            <div class="customer-details">${sale.customer.rut} • ${
        sale.customer.type === "INDIVIDUAL" ? "Persona" : "Empresa"
      }</div>
          </div>
        </td>
        <td>${sale.buyer ? sale.buyer.name : "N/A"}</td>
        <td class="text-center">${sale.totals.total_items}</td>
        <td class="amount-cell">$${Math.round(
          sale.totals.total_amount
        ).toLocaleString()}</td>
        <td>
          <div class="datetime-cell">
            <div class="date">${formatDate(sale.sale_info.date)}</div>
            <div class="time">${sale.sale_info.time}</div>
          </div>
        </td>
        <td>${sale.sale_info.seller_name}</td>
        <td>
          <span class="status-badge status-${sale.status.code.toLowerCase()}">${
        sale.status.name
      }</span>
          ${
            isExpired
              ? '<br><small style="color: #dc3545;">Expirada</small>'
              : ""
          }
        </td>
        <td>
          <button class="btn btn-success btn-xs" onclick="event.stopPropagation(); selectSale('${
            sale.folio
          }')" ${isExpired ? "disabled" : ""}>
            ${isExpired ? "Expirada" : "Seleccionar"}
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function refreshPendingSales() {
  showToast("Actualizando lista de ventas...", "info");

  // Simular actualización
  setTimeout(() => {
    loadPendingSales();
    showToast("Lista actualizada", "success");
  }, 1000);
}

// ==========================================================================
// Selección y Detalles de Venta
// ==========================================================================

function selectSale(folio) {
  if (typeof folio === "object") {
    selectedSale = folio;
  } else {
    selectedSale = pendingSales.find((s) => s.folio === folio);
  }

  if (!selectedSale) {
    showToast("Venta no encontrada", "error");
    return;
  }

  // Verificar si está expirada
  const isExpired = new Date(selectedSale.timestamps.expires_at) < new Date();
  if (isExpired) {
    showToast("Esta venta ha expirado y no puede ser procesada", "warning");
    return;
  }

  displaySaleDetails(selectedSale);
  highlightSelectedRow(folio);

  showToast(`Venta ${selectedSale.folio} seleccionada`, "success");
}

function highlightSelectedRow(folio) {
  // Remover selección anterior
  document.querySelectorAll(".pending-sale-row").forEach((row) => {
    row.classList.remove("selected");
  });

  // Seleccionar nueva fila
  const selectedRow = document.querySelector(`[data-folio="${folio}"]`);
  if (selectedRow) {
    selectedRow.classList.add("selected");
  }
}

function displaySaleDetails(sale) {
  document.getElementById("no-sale-selected").style.display = "none";
  document.getElementById("sale-details").style.display = "block";

  // Información del cliente
  document.getElementById("detail-customer-rut").textContent =
    sale.customer.rut;
  document.getElementById("detail-customer-name").textContent =
    sale.customer.name;
  document.getElementById("detail-customer-type").textContent =
    sale.customer.type === "INDIVIDUAL" ? "Persona Natural" : "Empresa";
  document.getElementById("detail-customer-email").textContent =
    sale.customer.email;

  // Comprador (si aplica)
  const buyerInfo = document.getElementById("buyer-info");
  if (sale.buyer) {
    document.getElementById("detail-buyer-name").textContent = sale.buyer.name;
    document.getElementById("detail-buyer-position").textContent =
      sale.buyer.position;
    buyerInfo.style.display = "block";
  } else {
    buyerInfo.style.display = "none";
  }

  // Items
  const itemsTbody = document.getElementById("detail-items-tbody");
  itemsTbody.innerHTML = sale.items
    .map(
      (item) => `
    <tr>
      <td><strong>${item.code}</strong></td>
      <td>
        <div>${item.name}</div>
        <small style="color: #6c757d;">${item.brand} • ${item.category}</small>
      </td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">$${Math.round(
        item.unit_price
      ).toLocaleString()}</td>
      <td class="text-center">${item.discount_percentage}%</td>
      <td class="text-right">$${Math.round(
        item.line_total
      ).toLocaleString()}</td>
    </tr>
  `
    )
    .join("");

  // Totales
  document.getElementById("detail-total-items").textContent =
    sale.totals.total_items;
  document.getElementById("detail-subtotal").textContent = `$${Math.round(
    sale.totals.subtotal
  ).toLocaleString()}`;
  document.getElementById("detail-discounts").textContent = `$${Math.round(
    sale.totals.line_discounts + (sale.totals.document_discount || 0)
  ).toLocaleString()}`;
  document.getElementById("detail-tax").textContent = `$${Math.round(
    sale.totals.tax_amount
  ).toLocaleString()}`;
  document.getElementById("detail-total").textContent = `$${Math.round(
    sale.totals.total_amount
  ).toLocaleString()}`;

  // Información adicional
  document.getElementById("detail-folio").textContent = sale.folio;
  document.getElementById("detail-date").textContent = formatDate(
    sale.sale_info.date
  );
  document.getElementById("detail-time").textContent = sale.sale_info.time;
  document.getElementById("detail-seller").textContent =
    sale.sale_info.seller_name;
  document.getElementById("detail-status").textContent = sale.status.name;
  document.getElementById("detail-credit-type").textContent = sale.credit_sale
    ? "Venta a Crédito"
    : "Venta Contado";

  // Habilitar botón de procesar
  document.getElementById("process-btn").disabled = false;
}

function clearSelection() {
  selectedSale = null;

  document.getElementById("no-sale-selected").style.display = "block";
  document.getElementById("sale-details").style.display = "none";

  // Remover selección de la tabla
  document.querySelectorAll(".pending-sale-row").forEach((row) => {
    row.classList.remove("selected");
  });

  showToast("Selección limpiada", "info");
}

// ==========================================================================
// Procesamiento de Pago
// ==========================================================================

function processSale() {
  if (!selectedSale) {
    showToast("Debe seleccionar una venta primero", "warning");
    return;
  }

  // Resetear modal
  selectedPaymentMethod = null;
  document.querySelectorAll(".payment-method-card").forEach((card) => {
    card.classList.remove("selected");
  });
  document.getElementById("payment-details").style.display = "none";
  document.getElementById("confirm-payment-btn").disabled = true;

  // Configurar información del modal
  document.getElementById("payment-folio").textContent = selectedSale.folio;
  document.getElementById("payment-total").textContent = `$${Math.round(
    selectedSale.totals.total_amount
  ).toLocaleString()}`;
  document.getElementById("payment-customer").textContent =
    selectedSale.customer.name;

  // Mostrar modal
  document.getElementById("paymentModal").style.display = "block";
  document.getElementById("paymentModal").classList.add("show");
}

function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

function selectPaymentMethod(methodCode) {
  selectedPaymentMethod = paymentMethods.find((m) => m.code === methodCode);

  if (!selectedPaymentMethod) {
    showToast("Método de pago no válido", "error");
    return;
  }

  // Marcar visualmente el método seleccionado
  document.querySelectorAll(".payment-method-card").forEach((card) => {
    card.classList.remove("selected");
  });
  event.target.closest(".payment-method-card").classList.add("selected");

  // Mostrar detalles específicos del método
  showPaymentDetails(selectedPaymentMethod);

  // Habilitar botón de confirmar
  validatePaymentForm();
}

function showPaymentDetails(method) {
  const detailsContainer = document.getElementById("payment-details");

  // Ocultar todas las secciones
  document.querySelectorAll(".payment-detail-section").forEach((section) => {
    section.style.display = "none";
  });

  if (method.requires_details) {
    switch (method.details_type) {
      case "cash":
        document.getElementById("cash-details").style.display = "block";
        // Prellenar con el monto total
        document.getElementById("amount-received").value = Math.round(
          selectedSale.totals.total_amount
        );
        calculateChange();
        break;
      case "card":
        document.getElementById("card-details").style.display = "block";
        break;
      case "transfer":
        document.getElementById("transfer-details").style.display = "block";
        break;
    }
    detailsContainer.style.display = "block";
  } else {
    detailsContainer.style.display = "none";
  }
}

function calculateChange() {
  const totalAmount = selectedSale.totals.total_amount;
  const receivedAmount =
    parseFloat(document.getElementById("amount-received").value) || 0;
  const change = receivedAmount - totalAmount;

  const changeDisplay = document.getElementById("change-amount");
  changeDisplay.textContent = `$${Math.abs(change).toLocaleString()}`;

  if (change >= 0) {
    changeDisplay.className = "change-display";
    changeDisplay.textContent = `$${change.toLocaleString()}`;
  } else {
    changeDisplay.className = "change-display negative";
    changeDisplay.textContent = `-$${Math.abs(change).toLocaleString()}`;
  }

  validatePaymentForm();
}

function validatePaymentForm() {
  let isValid = selectedPaymentMethod !== null;

  if (selectedPaymentMethod && selectedPaymentMethod.requires_details) {
    switch (selectedPaymentMethod.details_type) {
      case "cash":
        const receivedAmount =
          parseFloat(document.getElementById("amount-received").value) || 0;
        isValid = receivedAmount >= selectedSale.totals.total_amount;
        break;
      case "card":
        const cardNumber = document.getElementById("card-number").value.trim();
        const authCode = document
          .getElementById("authorization-code")
          .value.trim();
        isValid = cardNumber.length === 4 && authCode.length >= 4;
        break;
      case "transfer":
        const bankName = document.getElementById("bank-name").value.trim();
        const transferRef = document
          .getElementById("transfer-reference")
          .value.trim();
        isValid = bankName.length > 0 && transferRef.length > 0;
        break;
    }
  }

  document.getElementById("confirm-payment-btn").disabled = !isValid;
}

function confirmPayment() {
  if (!selectedPaymentMethod || !selectedSale) {
    showToast("Información de pago incompleta", "error");
    return;
  }

  // Simular procesamiento
  showToast("Procesando pago...", "info");

  setTimeout(() => {
    // Cerrar modal de pago
    closePaymentModal();

    // Mostrar modal de facturación
    showInvoiceModal();

    showToast("Pago procesado exitosamente", "success");
  }, 1500);
}

// ==========================================================================
// Generación de Factura
// ==========================================================================

function showInvoiceModal() {
  // Configurar información del modal
  document.getElementById("invoice-folio").textContent = selectedSale.folio;
  document.getElementById("invoice-customer").textContent =
    selectedSale.customer.name;
  document.getElementById("invoice-total").textContent = `$${Math.round(
    selectedSale.totals.total_amount
  ).toLocaleString()}`;
  document.getElementById("invoice-payment-method").textContent =
    selectedPaymentMethod.name;
  document.getElementById("invoice-date").textContent =
    new Date().toLocaleDateString("es-CL");

  // Seleccionar tipo de documento por defecto
  const defaultType =
    selectedSale.customer.type === "INDIVIDUAL" ? "BOLETA" : "FACTURA";
  selectDocumentType(defaultType);

  // Mostrar modal
  document.getElementById("invoiceModal").style.display = "block";
  document.getElementById("invoiceModal").classList.add("show");
}

function closeInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

function selectDocumentType(type) {
  currentDocumentType = type;

  // Marcar visualmente el tipo seleccionado
  document.querySelectorAll(".document-type-card").forEach((card) => {
    card.classList.remove("active");
  });

  event.target.closest(".document-type-card").classList.add("active");
}

function generateInvoice() {
  if (!currentDocumentType || !selectedSale) {
    showToast("Debe seleccionar un tipo de documento", "warning");
    return;
  }

  showToast("Generando documento...", "info");

  setTimeout(() => {
    // Simular generación exitosa
    const documentNumber = generateDocumentNumber(currentDocumentType);

    showToast(
      `${currentDocumentType} ${documentNumber} generada exitosamente`,
      "success"
    );

    // Remover venta de la lista de pendientes
    removeSaleFromPending(selectedSale.folio);

    // Cerrar modal y limpiar selección
    closeInvoiceModal();
    clearSelection();

    // Actualizar estadísticas
    updateStats();

    // Mostrar confirmación final
    setTimeout(() => {
      showInvoiceCompletedAlert(documentNumber);
    }, 500);
  }, 2000);
}

function generateDocumentNumber(type) {
  const prefix = type === "BOLETA" ? "B" : "F";
  const number = Math.floor(Math.random() * 1000000) + 1000000;
  return `${prefix}${number}`;
}

function removeSaleFromPending(folio) {
  pendingSales = pendingSales.filter((sale) => sale.folio !== folio);
  filteredSales = filteredSales.filter((sale) => sale.folio !== folio);
  displayPendingSales(filteredSales);
}

function showInvoiceCompletedAlert(documentNumber) {
  const message = `
    ✅ Facturación Completada
    
    📄 Documento: ${documentNumber}
    👤 Cliente: ${selectedSale.customer.name}
    💰 Total: $${Math.round(selectedSale.totals.total_amount).toLocaleString()}
    📅 Fecha: ${new Date().toLocaleDateString("es-CL")}
    
    El documento ha sido generado y enviado.
  `;

  alert(message);
}

// ==========================================================================
// Estadísticas y Utilidades
// ==========================================================================

function updateStats() {
  const pendingCount = filteredSales.length;
  const pendingTotal = filteredSales.reduce(
    (sum, sale) => sum + sale.totals.total_amount,
    0
  );

  document.getElementById("pending-count").textContent = pendingCount;
  document.getElementById("pending-total").textContent = `$${Math.round(
    pendingTotal
  ).toLocaleString()}`;

  if (statistics.today) {
    document.getElementById("today-processed").textContent =
      statistics.today.processed_sales;
  }
}

function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-CL");
  document.getElementById("current-date").textContent = dateStr;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-CL");
}

function formatCurrency(amount) {
  const symbol = systemConfig.tax_settings?.currency_symbol || "$";
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

// ==========================================================================
// Funciones de Impresión y Reportes
// ==========================================================================

function printSaleDetail() {
  if (!selectedSale) {
    showToast("Debe seleccionar una venta primero", "warning");
    return;
  }

  const printContent = generateSaleDetailPrint(selectedSale);
  const printWindow = window.open("", "_blank");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();

  showToast("Enviando a impresora...", "info");
}

function generateSaleDetailPrint(sale) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Detalle de Venta - ${sale.folio}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .section { margin-bottom: 15px; }
        .total { font-weight: bold; font-size: 1.2em; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>DETALLE DE VENTA</h2>
        <h3>Folio: ${sale.folio}</h3>
      </div>
      
      <div class="section">
        <h4>Cliente:</h4>
        <p><strong>${sale.customer.name}</strong><br>
        RUT: ${sale.customer.rut}<br>
        Email: ${sale.customer.email}</p>
      </div>
      
      <div class="section">
        <h4>Productos:</h4>
        <table>
          <thead>
            <tr><th>Código</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item) => `
              <tr>
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${Math.round(item.unit_price).toLocaleString()}</td>
                <td>$${Math.round(item.line_total).toLocaleString()}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div class="section total">
        <p>Total: $${Math.round(sale.totals.total_amount).toLocaleString()}</p>
        <p>Fecha: ${formatDate(sale.sale_info.date)} ${sale.sale_info.time}</p>
        <p>Vendedor: ${sale.sale_info.seller_name}</p>
      </div>
    </body>
    </html>
  `;
}

// ==========================================================================
// Event Listeners y Validaciones
// ==========================================================================

// Cerrar modales con clic fuera
window.onclick = function (event) {
  const paymentModal = document.getElementById("paymentModal");
  const invoiceModal = document.getElementById("invoiceModal");

  if (event.target === paymentModal) {
    closePaymentModal();
  }
  if (event.target === invoiceModal) {
    closeInvoiceModal();
  }
};

// Cerrar modales con tecla Escape
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    const modals = ["paymentModal", "invoiceModal"];

    modals.forEach((modalId) => {
      const modal = document.getElementById(modalId);
      if (modal && modal.style.display === "block") {
        modal.querySelector(".close").click();
      }
    });
  }

  // Atajos de teclado
  if (event.ctrlKey) {
    switch (event.key) {
      case "f":
      case "F":
        event.preventDefault();
        document.getElementById("sale-folio").focus();
        break;
      case "r":
      case "R":
        event.preventDefault();
        refreshPendingSales();
        break;
      case "p":
      case "P":
        event.preventDefault();
        if (selectedSale) {
          processSale();
        }
        break;
    }
  }

  // F5 para actualizar
  if (event.key === "F5") {
    event.preventDefault();
    refreshPendingSales();
  }
});

// ==========================================================================
// Auto-actualización y Gestión de Sesión
// ==========================================================================

let autoRefreshInterval = null;
let sessionCheckInterval = null;

function startAutoRefresh() {
  const refreshInterval =
    systemConfig.cashier_settings?.refresh_interval_seconds || 30;

  if (systemConfig.cashier_settings?.auto_refresh_pending) {
    autoRefreshInterval = setInterval(() => {
      refreshPendingSales();
    }, refreshInterval * 1000);

    console.log(
      `✅ Auto-actualización iniciada cada ${refreshInterval} segundos`
    );
  }
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log("🛑 Auto-actualización detenida");
  }
}

function startSessionCheck() {
  // Verificar estado de sesión cada 5 minutos
  sessionCheckInterval = setInterval(() => {
    checkSessionStatus();
  }, 5 * 60 * 1000);
}

function checkSessionStatus() {
  // Simular verificación de sesión
  const sessionTimeout =
    systemConfig.cashier_settings?.session_timeout_minutes || 480;
  const sessionStart = new Date(sessionInfo.opening_info?.opening_datetime);
  const now = new Date();
  const sessionDuration = (now - sessionStart) / (1000 * 60); // minutos

  if (sessionDuration > sessionTimeout) {
    showToast(
      "Su sesión está por expirar. Contacte a su supervisor.",
      "warning",
      "Sesión de Caja",
      10000
    );
  }
}

// ==========================================================================
// Validaciones de Negocio
// ==========================================================================

function validateSaleForProcessing(sale) {
  const errors = [];

  // Verificar si la venta no está expirada
  const expirationDate = new Date(sale.timestamps.expires_at);
  if (expirationDate < new Date()) {
    errors.push("La venta ha expirado");
  }

  // Verificar estado
  if (sale.status.code !== "PENDING") {
    errors.push("La venta no está en estado pendiente");
  }

  // Verificar que tenga items
  if (!sale.items || sale.items.length === 0) {
    errors.push("La venta no tiene productos");
  }

  // Verificar totales
  if (sale.totals.total_amount <= 0) {
    errors.push("El total de la venta debe ser mayor a cero");
  }

  return errors;
}

function validatePaymentMethod(method, customerType) {
  const errors = [];

  // Verificar si el método está activo
  if (!method.is_active) {
    errors.push("El método de pago no está disponible");
  }

  // Validaciones específicas por tipo de cliente
  if (method.code === "CREDIT_ACCOUNT" && customerType === "INDIVIDUAL") {
    errors.push("Las personas naturales no pueden usar cuenta corriente");
  }

  return errors;
}

// ==========================================================================
// Gestión de Errores y Logs
// ==========================================================================

function logTransaction(type, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type,
    cashier_id: sessionInfo.cashier?.user_id,
    session_id: sessionInfo.session_id,
    data: data,
  };

  console.log("📋 Log de transacción:", logEntry);

  // En implementación real, enviar al servidor
  // sendLogToServer(logEntry);
}

function handleError(error, context = "Sistema") {
  console.error(`❌ Error en ${context}:`, error);
  showToast(`Error en ${context}: ${error.message}`, "error");

  // Log del error
  logTransaction("ERROR", {
    context: context,
    error: error.message,
    stack: error.stack,
  });
}

// ==========================================================================
// Funciones de Utilidad Avanzadas
// ==========================================================================

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

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounced functions
const debouncedFilterSales = debounce(filterPendingSales, 300);

// ==========================================================================
// Configuración de Event Listeners
// ==========================================================================

function setupEventListeners() {
  // Input de filtro de cliente con debounce
  const customerFilterInput = document.getElementById("customer-filter");
  if (customerFilterInput) {
    customerFilterInput.addEventListener("input", debouncedFilterSales);
  }

  // Input de monto recibido
  const amountReceivedInput = document.getElementById("amount-received");
  if (amountReceivedInput) {
    amountReceivedInput.addEventListener("input", calculateChange);
    amountReceivedInput.addEventListener("keypress", function (event) {
      // Solo permitir números, punto y coma
      const char = String.fromCharCode(event.which);
      if (!/[0-9.,]/.test(char)) {
        event.preventDefault();
      }
    });
  }

  // Validación en tiempo real para tarjetas
  const cardNumberInput = document.getElementById("card-number");
  if (cardNumberInput) {
    cardNumberInput.addEventListener("input", function (event) {
      // Solo números y máximo 4 dígitos
      let value = event.target.value.replace(/\D/g, "");
      if (value.length > 4) {
        value = value.substring(0, 4);
      }
      event.target.value = value;
      validatePaymentForm();
    });
  }

  const authCodeInput = document.getElementById("authorization-code");
  if (authCodeInput) {
    authCodeInput.addEventListener("input", function (event) {
      // Solo números y letras
      let value = event.target.value.replace(/[^a-zA-Z0-9]/g, "");
      event.target.value = value.toUpperCase();
      validatePaymentForm();
    });
  }

  // Validación para transferencias
  const bankNameInput = document.getElementById("bank-name");
  const transferRefInput = document.getElementById("transfer-reference");

  if (bankNameInput) {
    bankNameInput.addEventListener("input", validatePaymentForm);
  }
  if (transferRefInput) {
    transferRefInput.addEventListener("input", validatePaymentForm);
  }
}

// ==========================================================================
// Gestión de Estado de la Aplicación
// ==========================================================================

function saveAppState() {
  const state = {
    selectedSaleId: selectedSale?.folio || null,
    filters: {
      date: document.getElementById("date-filter")?.value || "today",
      customer: document.getElementById("customer-filter")?.value || "",
      amount: document.getElementById("amount-filter")?.value || "",
    },
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem("cashier_app_state", JSON.stringify(state));
  } catch (error) {
    console.warn("⚠️ No se pudo guardar el estado de la aplicación:", error);
  }
}

function loadAppState() {
  try {
    const savedState = localStorage.getItem("cashier_app_state");
    if (savedState) {
      const state = JSON.parse(savedState);
      const age = Date.now() - state.timestamp;
      const maxAge = 2 * 60 * 60 * 1000; // 2 horas

      if (age < maxAge) {
        // Restaurar filtros
        if (state.filters.date) {
          const dateFilter = document.getElementById("date-filter");
          if (dateFilter) dateFilter.value = state.filters.date;
        }
        if (state.filters.customer) {
          const customerFilter = document.getElementById("customer-filter");
          if (customerFilter) customerFilter.value = state.filters.customer;
        }
        if (state.filters.amount) {
          const amountFilter = document.getElementById("amount-filter");
          if (amountFilter) amountFilter.value = state.filters.amount;
        }

        // Aplicar filtros
        filterPendingSales();

        // Restaurar selección si la venta aún existe
        if (state.selectedSaleId) {
          const sale = pendingSales.find(
            (s) => s.folio === state.selectedSaleId
          );
          if (sale) {
            selectSale(sale);
          }
        }

        console.log("✅ Estado de la aplicación restaurado");
      } else {
        localStorage.removeItem("cashier_app_state");
      }
    }
  } catch (error) {
    console.warn("⚠️ Error cargando estado guardado:", error);
    localStorage.removeItem("cashier_app_state");
  }
}

// Auto-save del estado cada 30 segundos
setInterval(saveAppState, 30000);

// Guardar estado al salir
window.addEventListener("beforeunload", saveAppState);

// ==========================================================================
// Funciones de Accesibilidad
// ==========================================================================

function setupAccessibility() {
  // Navegación por teclado en la tabla
  const table = document.querySelector(".pending-sales-table table");
  if (table) {
    table.addEventListener("keydown", function (event) {
      const focusedRow = document.activeElement.closest("tr");
      if (!focusedRow) return;

      let targetRow = null;

      switch (event.key) {
        case "ArrowDown":
          targetRow = focusedRow.nextElementSibling;
          break;
        case "ArrowUp":
          targetRow = focusedRow.previousElementSibling;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          focusedRow.click();
          return;
      }

      if (targetRow) {
        event.preventDefault();
        targetRow.focus();
      }
    });
  }

  // Mejorar feedback de botones
  document.querySelectorAll(".btn").forEach((button) => {
    button.addEventListener("focus", function () {
      this.setAttribute("aria-pressed", "false");
    });

    button.addEventListener("blur", function () {
      this.removeAttribute("aria-pressed");
    });
  });
}

// ==========================================================================
// Inicialización de la Aplicación
// ==========================================================================

document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 Iniciando Sistema de Caja...");

  try {
    // Cargar datos primero
    await loadData();

    // Configurar event listeners
    setupEventListeners();

    // Configurar accesibilidad
    setupAccessibility();

    // Cargar estado guardado
    loadAppState();

    // Iniciar auto-actualización
    startAutoRefresh();

    // Iniciar verificación de sesión
    startSessionCheck();

    // Actualizar fecha y hora inicial
    updateDateTime();

    // Actualizar cada minuto
    setInterval(updateDateTime, 60000);

    // Focus inicial en búsqueda de folio
    const folioInput = document.getElementById("sale-folio");
    if (folioInput) {
      folioInput.focus();
    }

    console.log("✅ Sistema de Caja cargado correctamente");
    showToast("Sistema de Caja listo para usar", "success", "¡Bienvenido!");
  } catch (error) {
    console.error("❌ Error inicializando el sistema:", error);
    handleError(error, "Inicialización");
  }
});

// ==========================================================================
// Gestión de Visibilidad de la Página
// ==========================================================================

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    // Página oculta - pausar auto-actualización
    stopAutoRefresh();
    console.log("📱 Página oculta - pausando actualizaciones");
  } else {
    // Página visible - reanudar auto-actualización
    startAutoRefresh();
    // Actualizar inmediatamente
    refreshPendingSales();
    console.log("📱 Página visible - reanudando actualizaciones");
  }
});

// ==========================================================================
// Limpieza al salir
// ==========================================================================

window.addEventListener("beforeunload", function () {
  stopAutoRefresh();
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  saveAppState();

  // Log de cierre de sesión
  logTransaction("SESSION_END", {
    session_duration:
      Date.now() -
      new Date(sessionInfo.opening_info?.opening_datetime).getTime(),
    sales_processed: statistics.today?.processed_sales || 0,
  });
});

console.log("💰 Sistema de Caja cargado completamente");
