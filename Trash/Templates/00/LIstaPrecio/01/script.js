/* ==========================================================================
   Sistema de Listas de Precios - JavaScript Principal (script.js)
   ========================================================================== */

// Variables globales
let priceListGroups = [];
let priceLists = [];
let categories = [];
let measurementUnits = [];
let products = [];
let productVariants = [];
let priceListItems = [];
let priceChangeHistory = [];
let systemConfig = {};
let userSession = {};
let statistics = {};
let validationRules = {};

// Estado de la aplicación
let currentTab = 'lists';
let selectedPriceList = null;
let selectedProducts = [];
let pendingChanges = {};
let isLoading = false;

// ==========================================================================
// Inicialización y Carga de Datos
// ==========================================================================

async function loadData() {
  try {
    showLoadingState(true);
    const response = await fetch('./data.json');
    const data = await response.json();

    // Asignar datos globales
    priceListGroups = data.price_list_groups || [];
    priceLists = data.price_lists || [];
    categories = data.categories || [];
    measurementUnits = data.measurement_units || [];
    products = data.products || [];
    productVariants = data.product_variants || [];
    priceListItems = data.price_list_items || [];
    priceChangeHistory = data.price_change_history || [];
    systemConfig = data.system_config || {};
    userSession = data.user_session || {};
    statistics = data.statistics || {};
    validationRules = data.validation_rules || {};

    console.log('✅ Datos cargados:', {
      priceLists: priceLists.length,
      products: products.length,
      variants: productVariants.length,
      priceItems: priceListItems.length
    });

    initializeInterface();
    showLoadingState(false);
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    showToast('Error cargando datos del sistema', 'error');
    showLoadingState(false);
  }
}

function initializeInterface() {
  updateUserInfo();
  loadPriceListsTab();
  initializeEventListeners();
  
  // Mostrar pestaña inicial
  showTab('lists');
  
  showToast('Sistema de listas de precios cargado correctamente', 'success');
}

function updateUserInfo() {
  if (userSession.full_name) {
    document.getElementById('user-name').textContent = userSession.full_name;
  }
  if (userSession.role) {
    document.getElementById('user-role').textContent = userSession.role;
  }
}

function showLoadingState(show) {
  const container = document.querySelector('.container');
  if (container) {
    if (show) {
      container.classList.add('loading-state');
    } else {
      container.classList.remove('loading-state');
    }
  }
}

// ==========================================================================
// Sistema de Pestañas
// ==========================================================================

function showTab(tabName) {
  // Actualizar botones de pestañas
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');

  // Mostrar panel correspondiente
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');

  currentTab = tabName;

  // Cargar datos específicos de la pestaña
  switch (tabName) {
    case 'lists':
      loadPriceListsTab();
      break;
    case 'products':
      loadProductsTab();
      break;
    case 'comparison':
      loadComparisonTab();
      break;
    case 'reports':
      loadReportsTab();
      break;
  }
}

// ==========================================================================
// Gestión de Listas de Precios
// ==========================================================================

function loadPriceListsTab() {
  displayPriceLists();
  updatePriceListsStats();
}

function displayPriceLists(filteredLists = null) {
  const listsToShow = filteredLists || priceLists;
  const tbody = document.getElementById('price-lists-tbody');
  const emptyState = document.getElementById('empty-price-lists');

  if (listsToShow.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = listsToShow.map(list => {
    const group = priceListGroups.find(g => g.id === list.price_list_group_id);
    const itemsCount = priceListItems.filter(item => item.price_list_id === list.id).length;
    const isExpired = list.valid_to && new Date(list.valid_to) < new Date();
    const statusClass = !list.is_active ? 'status-inactive' : (isExpired ? 'status-expired' : 'status-active');
    const statusText = !list.is_active ? 'Inactiva' : (isExpired ? 'Expirada' : 'Activa');

    return `
      <tr class="price-list-row" onclick="selectPriceList(${list.id})" data-list-id="${list.id}">
        <td>
          <div class="list-code-cell">${list.price_list_code}</div>
        </td>
        <td>
          <div class="list-name-cell">${list.price_list_name}</div>
        </td>
        <td>
          <span class="group-badge group-${group?.group_code.toLowerCase()}">${group?.group_name || 'Sin Grupo'}</span>
        </td>
        <td>
          <span class="currency-badge">${list.currency_code}</span>
        </td>
        <td>
          <div class="validity-cell">
            <span class="validity-date">Desde: ${formatDate(list.valid_from)}</span>
            ${list.valid_to ? 
              `<span class="validity-date">Hasta: ${formatDate(list.valid_to)}</span>` : 
              '<span class="validity-permanent">Permanente</span>'
            }
          </div>
        </td>
        <td class="text-center">
          <span class="items-count">${itemsCount}</span>
        </td>
        <td class="text-center">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
        <td class="text-center">
          <div class="btn-group">
            <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); editPriceList(${list.id})" title="Editar">
              📝
            </button>
            <button class="btn btn-xs btn-info" onclick="event.stopPropagation(); duplicatePriceList(${list.id})" title="Duplicar">
              📋
            </button>
            <button class="btn btn-xs btn-danger" onclick="event.stopPropagation(); deletePriceList(${list.id})" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function selectPriceList(listId) {
  // Remover selección anterior
  document.querySelectorAll('.price-list-row').forEach(row => {
    row.classList.remove('selected');
  });

  // Seleccionar nueva fila
  const selectedRow = document.querySelector(`[data-list-id="${listId}"]`);
  if (selectedRow) {
    selectedRow.classList.add('selected');
  }

  selectedPriceList = priceLists.find(list => list.id === listId);
  console.log('Lista seleccionada:', selectedPriceList?.price_list_name);
}

function filterPriceLists() {
  const groupFilter = document.getElementById('group-filter').value;
  const statusFilter = document.getElementById('status-filter').value;
  const searchTerm = document.getElementById('search-lists').value.toLowerCase().trim();

  let filtered = priceLists.filter(list => {
    // Filtro por grupo
    let passesGroupFilter = true;
    if (groupFilter) {
      passesGroupFilter = list.price_list_group_id == groupFilter;
    }

    // Filtro por estado
    let passesStatusFilter = true;
    if (statusFilter) {
      const isExpired = list.valid_to && new Date(list.valid_to) < new Date();
      switch (statusFilter) {
        case 'active':
          passesStatusFilter = list.is_active && !isExpired;
          break;
        case 'inactive':
          passesStatusFilter = !list.is_active;
          break;
        case 'expired':
          passesStatusFilter = isExpired;
          break;
      }
    }

    // Filtro por búsqueda
    let passesSearchFilter = true;
    if (searchTerm) {
      passesSearchFilter = 
        list.price_list_name.toLowerCase().includes(searchTerm) ||
        list.price_list_code.toLowerCase().includes(searchTerm);
    }

    return passesGroupFilter && passesStatusFilter && passesSearchFilter;
  });

  displayPriceLists(filtered);
}

function updatePriceListsStats() {
  const activeLists = priceLists.filter(list => {
    const isExpired = list.valid_to && new Date(list.valid_to) < new Date();
    return list.is_active && !isExpired;
  }).length;

  const expiredLists = priceLists.filter(list => {
    return list.valid_to && new Date(list.valid_to) < new Date();
  }).length;

  const totalItems = priceListItems.length;

  document.getElementById('active-lists-count').textContent = activeLists;
  document.getElementById('expired-lists-count').textContent = expiredLists;
  document.getElementById('total-items-count').textContent = totalItems;
}

// ==========================================================================
// Gestión de Productos y Precios
// ==========================================================================

function loadProductsTab() {
  populatePriceListSelector();
  if (selectedPriceList) {
    loadProductsForPriceList(selectedPriceList.id);
  } else if (priceLists.length > 0) {
    loadProductsForPriceList(priceLists[0].id);
  }
}

function populatePriceListSelector() {
  const selector = document.getElementById('price-list-selector');
  selector.innerHTML = '<option value="">Seleccionar lista de precios...</option>' +
    priceLists.map(list => {
      const group = priceListGroups.find(g => g.id === list.price_list_group_id);
      return `<option value="${list.id}">${list.price_list_name} (${group?.group_name || 'Sin Grupo'})</option>`;
    }).join('');

  if (selectedPriceList) {
    selector.value = selectedPriceList.id;
  }
}

function selectPriceListForProducts() {
  const selector = document.getElementById('price-list-selector');
  const listId = parseInt(selector.value);
  
  if (listId) {
    selectedPriceList = priceLists.find(list => list.id === listId);
    loadProductsForPriceList(listId);
    updateSelectedListInfo();
  }
}

function updateSelectedListInfo() {
  const infoContainer = document.getElementById('selected-list-info');
  if (!selectedPriceList) {
    infoContainer.innerHTML = '';
    return;
  }

  const group = priceListGroups.find(g => g.id === selectedPriceList.price_list_group_id);
  const itemsCount = priceListItems.filter(item => item.price_list_id === selectedPriceList.id).length;

  infoContainer.innerHTML = `
    <span><strong>Grupo:</strong> ${group?.group_name || 'Sin Grupo'}</span>
    <span><strong>Moneda:</strong> ${selectedPriceList.currency_code}</span>
    <span><strong>Items:</strong> ${itemsCount}</span>
    <span><strong>Vigencia:</strong> ${formatDate(selectedPriceList.valid_from)} - ${selectedPriceList.valid_to ? formatDate(selectedPriceList.valid_to) : 'Permanente'}</span>
  `;
}

function loadProductsForPriceList(priceListId) {
  const tbody = document.getElementById('products-tbody');
  const emptyState = document.getElementById('empty-products');

  // Obtener productos con sus precios
  const productsWithPrices = productVariants.map(variant => {
    const product = products.find(p => p.id === variant.product_id);
    const category = categories.find(c => c.id === product?.category_id);
    const priceItem = priceListItems.find(item => 
      item.price_list_id === priceListId && item.product_variant_id === variant.id
    );

    return {
      variant,
      product,
      category,
      priceItem
    };
  });

  if (productsWithPrices.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = productsWithPrices.map(item => {
    const hasPrice = !!item.priceItem;
    const margin = hasPrice ? calculateMargin(item.priceItem.sale_price, item.priceItem.cost_price) : 0;
    const marginClass = margin > 0 ? 'margin-positive' : (margin < 0 ? 'margin-negative' : 'margin-zero');

    return `
      <tr class="product-row ${!hasPrice ? 'no-price' : ''}" data-variant-id="${item.variant.id}">
        <td>
          <input type="checkbox" class="product-checkbox" value="${item.variant.id}" 
                 onchange="toggleProductSelection(${item.variant.id})">
        </td>
        <td>
          <div class="product-info-cell">
            <div class="product-name">${item.variant.variant_name}</div>
            <div class="product-details">
              <span class="product-sku">${item.variant.variant_sku}</span>
              <span class="product-brand">${item.product?.brand || 'Sin Marca'}</span>
              <span class="product-category">${item.category?.category_name || 'Sin Categoría'}</span>
            </div>
          </div>
        </td>
        <td class="text-center">
          ${hasPrice ? 
            `<input type="number" class="price-input cost-price" value="${item.priceItem.cost_price || ''}" 
                    onchange="updatePrice(${item.variant.id}, 'cost_price', this.value)" 
                    placeholder="0">` :
            '<span class="text-muted">-</span>'
          }
        </td>
        <td class="text-center">
          ${hasPrice ? 
            `<input type="number" class="price-input" value="${item.priceItem.sale_price}" 
                    onchange="updatePrice(${item.variant.id}, 'sale_price', this.value)" 
                    placeholder="0">` :
            `<button class="btn btn-sm btn-success" onclick="addProductToList(${item.variant.id})">
               ➕ Agregar
             </button>`
          }
        </td>
        <td class="text-center">
          <span class="${marginClass}">${hasPrice ? margin.toFixed(2) + '%' : '-'}</span>
        </td>
        <td class="text-center">
          ${hasPrice ? 
            `<button class="btn btn-xs btn-info price-history-btn" 
                     onclick="showPriceHistory(${item.variant.id})" title="Ver Historial">
               📊
             </button>` :
            '-'
          }
        </td>
        <td class="text-center">
          ${hasPrice ? 
            `<button class="btn btn-xs btn-danger" 
                     onclick="removeProductFromList(${item.variant.id})" title="Eliminar">
               🗑️
             </button>` :
            '-'
          }
        </td>
      </tr>
    `;
  }).join('');

  updateSelectedListInfo();
}

function filterProducts() {
  const searchTerm = document.getElementById('search-products').value.toLowerCase().trim();
  const categoryFilter = document.getElementById('category-filter').value;
  const brandFilter = document.getElementById('brand-filter').value.toLowerCase().trim();
  const statusFilter = document.getElementById('price-status-filter').value;

  const rows = document.querySelectorAll('.product-row');
  
  rows.forEach(row => {
    const variantId = parseInt(row.dataset.variantId);
    const variant = productVariants.find(v => v.id === variantId);
    const product = products.find(p => p.id === variant?.product_id);
    const hasPrice = !!priceListItems.find(item => 
      item.price_list_id === selectedPriceList?.id && item.product_variant_id === variantId
    );

    let show = true;

    // Filtro por búsqueda
    if (searchTerm) {
      const productName = variant?.variant_name.toLowerCase() || '';
      const productSku = variant?.variant_sku.toLowerCase() || '';
      const productBrand = product?.brand?.toLowerCase() || '';
      
      show = productName.includes(searchTerm) || 
             productSku.includes(searchTerm) || 
             productBrand.includes(searchTerm);
    }

    // Filtro por categoría
    if (show && categoryFilter) {
      show = product?.category_id == categoryFilter;
    }

    // Filtro por marca
    if (show && brandFilter) {
      show = product?.brand?.toLowerCase().includes(brandFilter);
    }

    // Filtro por estado de precio
    if (show && statusFilter) {
      switch (statusFilter) {
        case 'with-price':
          show = hasPrice;
          break;
        case 'without-price':
          show = !hasPrice;
          break;
      }
    }

    row.style.display = show ? '' : 'none';
  });
}

function toggleProductSelection(variantId) {
  const checkbox = document.querySelector(`input[value="${variantId}"]`);
  const row = document.querySelector(`[data-variant-id="${variantId}"]`);
  
  if (checkbox.checked) {
    selectedProducts.push(variantId);
    row.classList.add('selected');
  } else {
    selectedProducts = selectedProducts.filter(id => id !== variantId);
    row.classList.remove('selected');
  }

  updateBulkActionsBar();
}

function updateBulkActionsBar() {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const selectedCount = document.getElementById('selected-count');
  
  if (selectedProducts.length > 0) {
    bulkBar.classList.add('show');
    selectedCount.textContent = selectedProducts.length;
  } else {
    bulkBar.classList.remove('show');
  }
}

function updatePrice(variantId, priceType, newValue) {
  if (!selectedPriceList) return;

  const numericValue = parseFloat(newValue) || 0;
  let priceItem = priceListItems.find(item => 
    item.price_list_id === selectedPriceList.id && item.product_variant_id === variantId
  );

  if (priceItem) {
    priceItem[priceType] = numericValue;
    
    // Recalcular margen si es necesario
    if (priceType === 'sale_price' || priceType === 'cost_price') {
      priceItem.margin_percentage = calculateMargin(priceItem.sale_price, priceItem.cost_price);
    }

    // Marcar como cambiado
    if (!pendingChanges[variantId]) {
      pendingChanges[variantId] = {};
    }
    pendingChanges[variantId][priceType] = numericValue;

    // Actualizar indicador visual
    const input = document.querySelector(`[data-variant-id="${variantId}"] .price-input`);
    if (input) {
      input.classList.add('changed');
    }

    console.log(`Precio actualizado: ${priceType} = ${numericValue} para variante ${variantId}`);
  }
}

function calculateMargin(salePrice, costPrice) {
  if (!salePrice || !costPrice || costPrice === 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
}

// ==========================================================================
// Comparador de Precios
// ==========================================================================

function loadComparisonTab() {
  populateComparisonLists();
  loadComparisonTable();
}

function populateComparisonLists() {
  const container = document.getElementById('comparison-lists-checkboxes');
  container.innerHTML = priceLists.map(list => {
    const group = priceListGroups.find(g => g.id === list.price_list_group_id);
    return `
      <div class="list-checkbox" onclick="toggleComparisonList(${list.id})">
        <input type="checkbox" id="compare-${list.id}" value="${list.id}">
        <label for="compare-${list.id}">
          <strong>${list.price_list_name}</strong><br>
          <small>${group?.group_name || 'Sin Grupo'} • ${list.currency_code}</small>
        </label>
      </div>
    `;
  }).join('');
}

function toggleComparisonList(listId) {
  const checkbox = document.getElementById(`compare-${listId}`);
  const container = checkbox.closest('.list-checkbox');
  
  checkbox.checked = !checkbox.checked;
  
  if (checkbox.checked) {
    container.classList.add('selected');
  } else {
    container.classList.remove('selected');
  }
  
  loadComparisonTable();
}

function loadComparisonTable() {
  const selectedLists = Array.from(document.querySelectorAll('input[id^="compare-"]:checked'))
    .map(cb => parseInt(cb.value));

  if (selectedLists.length === 0) {
    document.getElementById('comparison-table-container').innerHTML = 
      '<div class="empty-state"><div class="empty-state-icon">📊</div><h3>Selecciona listas para comparar</h3><p>Marca las casillas de las listas de precios que deseas comparar</p></div>';
    return;
  }

  const table = generateComparisonTable(selectedLists);
  document.getElementById('comparison-table-container').innerHTML = table;
}

function generateComparisonTable(listIds) {
  const lists = priceLists.filter(list => listIds.includes(list.id));
  
  // Obtener todos los productos que tienen precios en al menos una de las listas
  const allVariantIds = new Set();
  listIds.forEach(listId => {
    priceListItems.filter(item => item.price_list_id === listId)
      .forEach(item => allVariantIds.add(item.product_variant_id));
  });

  const variants = Array.from(allVariantIds).map(id => 
    productVariants.find(v => v.id === id)
  ).filter(v => v);

  let html = `
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th class="product-column">Producto</th>
            ${lists.map(list => `<th>${list.price_list_name}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  variants.forEach(variant => {
    const product = products.find(p => p.id === variant.product_id);
    const prices = lists.map(list => {
      const item = priceListItems.find(i => 
        i.price_list_id === list.id && i.product_variant_id === variant.id
      );
      return item ? item.sale_price : null;
    });

    const validPrices = prices.filter(p => p !== null);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;

    html += `
      <tr>
        <td class="product-column">
          <div class="product-name">${variant.variant_name}</div>
          <small class="text-muted">${variant.variant_sku} • ${product?.brand || 'Sin Marca'}</small>
        </td>
        ${prices.map(price => {
          if (price === null) {
            return '<td class="price-missing">Sin precio</td>';
          }
          
          let cellClass = 'price-comparison-cell';
          if (validPrices.length > 1) {
            if (price === minPrice) cellClass += ' price-best';
            if (price === maxPrice) cellClass += ' price-worst';
          }

          const difference = maxPrice ? ((price - minPrice) / minPrice * 100) : 0;
          
          return `
            <td class="${cellClass}">
              $${Math.round(price).toLocaleString()}
              ${validPrices.length > 1 ? 
                `<span class="price-difference ${difference > 0 ? 'positive' : 'negative'}">
                  ${difference > 0 ? '+' : ''}${difference.toFixed(1)}%
                </span>` : ''
              }
            </td>
          `;
        }).join('')}
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// ==========================================================================
// Reportes y Análisis
// ==========================================================================

function loadReportsTab() {
  updateReportsStats();
  generateAnalysisCharts();
}

function updateReportsStats() {
  // Calcular estadísticas para los reportes
  const totalProducts = productVariants.length;
  const productsWithPrices = new Set(priceListItems.map(item => item.product_variant_id)).size;
  const averageMargin = priceListItems.reduce((sum, item) => sum + (item.margin_percentage || 0), 0) / priceListItems.length;
  const recentChanges = priceChangeHistory.filter(change => {
    const changeDate = new Date(change.change_date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return changeDate >= weekAgo;
  }).length;

  // Actualizar elementos en el DOM
  document.getElementById('total-products-report').textContent = totalProducts;
  document.getElementById('products-with-prices-report').textContent = productsWithPrices;
  document.getElementById('coverage-percentage-report').textContent = 
    Math.round((productsWithPrices / totalProducts) * 100) + '%';
  document.getElementById('average-margin-report').textContent = averageMargin.toFixed(1) + '%';
  document.getElementById('recent-changes-report').textContent = recentChanges;
}

function generateAnalysisCharts() {
  // Placeholder para gráficos - en implementación real se usaría Chart.js o similar
  const chartContainers = document.querySelectorAll('.chart-placeholder');
  chartContainers.forEach(container => {
    container.innerHTML = `
      <div style="text-align: center; color: #6c757d;">
        📊 Gráfico disponible en implementación completa<br>
        <small>Datos: ${priceListItems.length} items de precios</small>
      </div>
    `;
  });
}

// ==========================================================================
// Funciones CRUD
// ==========================================================================

function createPriceList() {
  showToast('Función crear lista no implementada en demo', 'info');
}

function editPriceList(listId) {
  const list = priceLists.find(l => l.id === listId);
  if (list) {
    showToast(`Editar lista: ${list.price_list_name}`, 'info');
  }
}

function duplicatePriceList(listId) {
  const list = priceLists.find(l => l.id === listId);
  if (list) {
    showToast(`Duplicar lista: ${list.price_list_name}`, 'info');
  }
}

function deletePriceList(listId) {
  const list = priceLists.find(l => l.id === listId);
  if (list && confirm(`¿Está seguro de eliminar la lista "${list.price_list_name}"?`)) {
    showToast(`Lista eliminada: ${list.price_list_name}`, 'warning');
  }
}

function addProductToList(variantId) {
  if (!selectedPriceList) {
    showToast('Debe seleccionar una lista de precios primero', 'warning');
    return;
  }

  const variant = productVariants.find(v => v.id === variantId);
  if (variant) {
    showToast(`Producto agregado: ${variant.variant_name}`, 'success');
    // Simular agregar producto
    setTimeout(() => {
      loadProductsForPriceList(selectedPriceList.id);
    }, 500);
  }
}

function removeProductFromList(variantId) {
  if (!selectedPriceList) return;

  const variant = productVariants.find(v => v.id === variantId);
  if (variant && confirm(`¿Eliminar "${variant.variant_name}" de la lista?`)) {
    showToast(`Producto eliminado: ${variant.variant_name}`, 'warning');
    // Simular eliminar producto
    setTimeout(() => {
      loadProductsForPriceList(selectedPriceList.id);
    }, 500);
  }
}

function bulkUpdatePrices() {
  if (selectedProducts.length === 0) {
    showToast('Debe seleccionar productos primero', 'warning');
    return;
  }

  showToast(`Actualización masiva de ${selectedProducts.length} productos`, 'info');
}

function exportPrices() {
  if (!selectedPriceList) {
    showToast('Debe seleccionar una lista de precios primero', 'warning');
    return;
  }

  showToast(`Exportando precios de: ${selectedPriceList.price_list_name}`, 'success');
  // En implementación real generaría archivo Excel/CSV
}

function importPrices() {
  showToast('Función importar precios no implementada en demo', 'info');
}

function savePendingChanges() {
  const changesCount = Object.keys(pendingChanges).length;
  if (changesCount === 0) {
    showToast('No hay cambios pendientes por guardar', 'info');
    return;
  }

  showToast(`Guardando ${changesCount} cambios...`, 'info');
  
  // Simular guardado
  setTimeout(() => {
    pendingChanges = {};
    document.querySelectorAll('.price-input.changed').forEach(input => {
      input.classList.remove('changed');
      input.classList.add('saved');
    });
    
    showToast('Cambios guardados exitosamente', 'success');
    
    // Remover indicadores después de un tiempo
    setTimeout(() => {
      document.querySelectorAll('.price-input.saved').forEach(input => {
        input.classList.remove('saved');
      });
    }, 2000);
  }, 1500);
}

function showPriceHistory(variantId) {
  const variant = productVariants.find(v => v.id === variantId);
  if (variant) {
    showToast(`Historial de precios: ${variant.variant_name}`, 'info');
  }
}

// ==========================================================================
// Funciones de Utilidad
// ==========================================================================

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL');
}

function formatCurrency(amount, currency = 'CLP') {
  if (!amount && amount !== 0) return '-';
  
  const symbol = systemConfig.currency_settings?.currency_symbol || '';
  const decimals = systemConfig.currency_settings?.decimal_places || 0;
  
  return `${symbol}${Math.round(amount).toLocaleString('es-CL')}`;
}

function formatPercentage(value) {
  if (!value && value !== 0) return '-';
  return `${value.toFixed(2)}%`;
}

function validatePrice(price, rules = null) {
  const validationRules = rules || systemConfig.validation_rules?.price_constraints;
  if (!validationRules) return { valid: true };

  const numPrice = parseFloat(price);
  
  if (isNaN(numPrice)) {
    return { valid: false, message: 'Precio debe ser un número válido' };
  }
  
  if (numPrice < validationRules.minimum_price) {
    return { valid: false, message: `Precio mínimo: ${validationRules.minimum_price}` };
  }
  
  if (numPrice > validationRules.maximum_price) {
    return { valid: false, message: `Precio máximo: ${validationRules.maximum_price}` };
  }
  
  return { valid: true };
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

// Funciones de búsqueda con debounce
const debouncedFilterLists = debounce(filterPriceLists, 300);
const debouncedFilterProducts = debounce(filterProducts, 300);

// ==========================================================================
// Sistema de Notificaciones/Toasts
// ==========================================================================

function showToast(message, type = 'success', title = null, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };

  const toastTitle = title || {
    success: 'Éxito',
    error: 'Error',
    warning: 'Advertencia',
    info: 'Información'
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
  setTimeout(() => toast.classList.add('show'), 100);

  // Auto cerrar
  setTimeout(() => {
    if (toast.parentNode) {
      closeToast(toast.querySelector('.toast-close'));
    }
  }, duration);
}

function closeToast(button) {
  const toast = button.closest('.toast');
  if (toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

// ==========================================================================
// Event Listeners y Manejo de Eventos
// ==========================================================================

function initializeEventListeners() {
  // Filtros con debounce
  const searchListsInput = document.getElementById('search-lists');
  if (searchListsInput) {
    searchListsInput.addEventListener('input', debouncedFilterLists);
  }

  const searchProductsInput = document.getElementById('search-products');
  if (searchProductsInput) {
    searchProductsInput.addEventListener('input', debouncedFilterProducts);
  }

  // Selectores de filtros
  const filterSelectors = ['group-filter', 'status-filter', 'category-filter', 'price-status-filter'];
  filterSelectors.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        if (id.includes('list') || id === 'group-filter' || id === 'status-filter') {
          filterPriceLists();
        } else {
          filterProducts();
        }
      });
    }
  });

  // Selector de lista de precios
  const priceListSelector = document.getElementById('price-list-selector');
  if (priceListSelector) {
    priceListSelector.addEventListener('change', selectPriceListForProducts);
  }

  // Auto-guardado cada 30 segundos si hay cambios
  setInterval(() => {
    if (Object.keys(pendingChanges).length > 0) {
      console.log('Auto-guardado de cambios pendientes...');
      // En implementación real se guardaría automáticamente
    }
  }, 30000);
}

// Atajos de teclado
document.addEventListener('keydown', function(event) {
  // Ctrl + S para guardar
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    savePendingChanges();
  }
  
  // Ctrl + F para buscar
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault();
    const activeTab = document.querySelector('.tab-panel.active');
    const searchInput = activeTab?.querySelector('input[type="text"]');
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // Escape para limpiar selecciones
  if (event.key === 'Escape') {
    selectedProducts = [];
    document.querySelectorAll('.product-checkbox:checked').forEach(cb => cb.checked = false);
    document.querySelectorAll('.product-row.selected').forEach(row => row.classList.remove('selected'));
    updateBulkActionsBar();
  }
  
  // Números 1-4 para cambiar pestañas
  if (event.altKey && event.key >= '1' && event.key <= '4') {
    event.preventDefault();
    const tabs = ['lists', 'products', 'comparison', 'reports'];
    const tabIndex = parseInt(event.key) - 1;
    if (tabs[tabIndex]) {
      showTab(tabs[tabIndex]);
    }
  }
});

// ==========================================================================
// Funciones de Gestión de Estado
// ==========================================================================

function saveAppState() {
  const state = {
    currentTab,
    selectedPriceListId: selectedPriceList?.id || null,
    selectedProducts,
    pendingChanges,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem('price_lists_app_state', JSON.stringify(state));
  } catch (error) {
    console.warn('⚠️ No se pudo guardar el estado de la aplicación:', error);
  }
}

function loadAppState() {
  try {
    const savedState = localStorage.getItem('price_lists_app_state');
    if (savedState) {
      const state = JSON.parse(savedState);
      const age = Date.now() - state.timestamp;
      const maxAge = 2 * 60 * 60 * 1000; // 2 horas
      
      if (age < maxAge) {
        // Restaurar estado
        if (state.currentTab) {
          currentTab = state.currentTab;
        }
        
        if (state.selectedPriceListId) {
          selectedPriceList = priceLists.find(list => list.id === state.selectedPriceListId);
        }
        
        if (state.selectedProducts) {
          selectedProducts = state.selectedProducts;
        }
        
        if (state.pendingChanges) {
          pendingChanges = state.pendingChanges;
        }
        
        console.log('✅ Estado de la aplicación restaurado');
      } else {
        localStorage.removeItem('price_lists_app_state');
      }
    }
  } catch (error) {
    console.warn('⚠️ Error cargando estado guardado:', error);
    localStorage.removeItem('price_lists_app_state');
  }
}

// Auto-save del estado cada 30 segundos
setInterval(saveAppState, 30000);

// Guardar estado al salir
window.addEventListener('beforeunload', saveAppState);

// ==========================================================================
// Funciones de Validación y Alertas
// ==========================================================================

function validatePriceListData(listData) {
  const errors = [];
  
  if (!listData.price_list_name || listData.price_list_name.trim().length === 0) {
    errors.push('El nombre de la lista es requerido');
  }
  
  if (!listData.price_list_code || listData.price_list_code.trim().length === 0) {
    errors.push('El código de la lista es requerido');
  }
  
  if (!listData.currency_code) {
    errors.push('La moneda es requerida');
  }
  
  if (!listData.valid_from) {
    errors.push('La fecha de inicio de vigencia es requerida');
  }
  
  if (listData.valid_to && new Date(listData.valid_to) <= new Date(listData.valid_from)) {
    errors.push('La fecha de fin debe ser posterior a la fecha de inicio');
  }
  
  return errors;
}

function showValidationErrors(errors) {
  if (errors.length > 0) {
    const errorList = errors.map(error => `• ${error}`).join('\n');
    showToast(`Errores de validación:\n${errorList}`, 'error', 'Validación', 6000);
  }
}

function checkForPriceConflicts(priceListId, variantId, newPrice) {
  // Verificar si hay conflictos con otras listas
  const conflicts = priceListItems.filter(item => 
    item.product_variant_id === variantId && 
    item.price_list_id !== priceListId &&
    Math.abs(item.sale_price - newPrice) / item.sale_price > 0.5 // Diferencia > 50%
  );
  
  if (conflicts.length > 0) {
    showToast('Advertencia: Gran diferencia de precio con otras listas', 'warning');
  }
}

// ==========================================================================
// Funciones de Análisis y Reportes
// ==========================================================================

function calculatePriceAnalytics() {
  const analytics = {
    totalItems: priceListItems.length,
    averagePrice: 0,
    averageMargin: 0,
    priceDistribution: {},
    marginDistribution: {},
    topProducts: [],
    lowMarginProducts: []
  };
  
  if (priceListItems.length === 0) return analytics;
  
  // Calcular promedios
  const totalPrice = priceListItems.reduce((sum, item) => sum + item.sale_price, 0);
  const totalMargin = priceListItems.reduce((sum, item) => sum + (item.margin_percentage || 0), 0);
  
  analytics.averagePrice = totalPrice / priceListItems.length;
  analytics.averageMargin = totalMargin / priceListItems.length;
  
  // Distribución de precios
  priceListItems.forEach(item => {
    const priceRange = getPriceRange(item.sale_price);
    analytics.priceDistribution[priceRange] = (analytics.priceDistribution[priceRange] || 0) + 1;
  });
  
  // Productos con margen bajo
  analytics.lowMarginProducts = priceListItems
    .filter(item => (item.margin_percentage || 0) < 10)
    .sort((a, b) => (a.margin_percentage || 0) - (b.margin_percentage || 0))
    .slice(0, 10);
  
  return analytics;
}

function getPriceRange(price) {
  if (price < 10000) return '< $10K';
  if (price < 50000) return '$10K - $50K';
  if (price < 100000) return '$50K - $100K';
  if (price < 500000) return '$100K - $500K';
  return '> $500K';
}

function generatePriceReport(listId) {
  const list = priceLists.find(l => l.id === listId);
  if (!list) return null;
  
  const items = priceListItems.filter(item => item.price_list_id === listId);
  const analytics = calculatePriceAnalytics();
  
  return {
    listName: list.price_list_name,
    totalItems: items.length,
    totalValue: items.reduce((sum, item) => sum + item.sale_price, 0),
    averagePrice: analytics.averagePrice,
    averageMargin: analytics.averageMargin,
    generatedAt: new Date().toISOString()
  };
}

// ==========================================================================
// Inicialización de la Aplicación
// ==========================================================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Iniciando Sistema de Listas de Precios...');
  
  try {
    // Cargar datos
    await loadData();
    
    // Cargar estado guardado
    loadAppState();
    
    // Mostrar pestaña inicial (puede ser restaurada desde el estado)
    showTab(currentTab);
    
    console.log('✅ Sistema de Listas de Precios cargado completamente');
    
  } catch (error) {
    console.error('❌ Error inicializando el sistema:', error);
    showToast('Error iniciando el sistema', 'error');
  }
});

// ==========================================================================
// Gestión de Visibilidad de la Página
// ==========================================================================

document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    // Página oculta - guardar estado
    saveAppState();
    console.log('📱 Página oculta - estado guardado');
  } else {
    // Página visible - verificar si hay datos nuevos
    console.log('📱 Página visible - verificando actualizaciones');
  }
});

// ==========================================================================
// Logging y Depuración
// ==========================================================================

function logAction(action, data = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    user: userSession.username,
    tab: currentTab,
    data
  };
  
  console.log('📋 Acción registrada:', logEntry);
  
  // En implementación real, enviar al servidor para auditoría
}

function exportLogs() {
  showToast('Función exportar logs no implementada en demo', 'info');
}

console.log('💰 Sistema de Listas de Precios inicializado');

// Exportar funciones para debugging
window.PriceListsApp = {
  showTab,
  filterPriceLists,
  filterProducts,
  savePendingChanges,
  calculatePriceAnalytics,
  generatePriceReport,
  exportLogs,
  // Variables de estado
  get currentTab() { return currentTab; },
  get selectedPriceList() { return selectedPriceList; },
  get selectedProducts() { return selectedProducts; },
  get pendingChanges() { return pendingChanges; },
  get priceLists() { return priceLists; },
  get products() { return products; }
};