/**
 * Consulta de Stock - Sistema de Inventario
 * Funcionalidad para consulta avanzada de stock con filtros y detalles
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let StockApp = {
    data: {},
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    filteredData: [],
    sortColumn: 'product_name',
    sortDirection: 'asc',
    filters: {
        warehouse: '',
        category: '',
        brand: '',
        status: '',
        search: ''
    }
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Consulta de Stock');
    initializeApp();
});

async function initializeApp() {
    try {
        // Cargar datos
        await loadData();
        
        // Inicializar componentes
        initializeFilters();
        initializeTable();
        initializeEventListeners();
        
        // Cargar datos iniciales
        loadStockData();
        
        console.log('✅ Consulta de Stock inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando consulta de stock:', error);
        showError('Error cargando el módulo. Por favor, recarga la página.');
    }
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

async function loadData() {
    try {
        const response = await fetch('../data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        StockApp.data = await response.json();
        console.log('📊 Datos cargados:', StockApp.data);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

// ============================================================================
// FILTROS
// ============================================================================

function initializeFilters() {
    populateWarehouseFilter();
    populateCategoryFilter();
    populateBrandFilter();
    populateStatusFilter();
}

function populateWarehouseFilter() {
    const select = document.getElementById('warehouse-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las bodegas</option>';
    
    StockApp.data.warehouses.forEach(warehouse => {
        if (warehouse.is_active) {
            const option = document.createElement('option');
            option.value = warehouse.id;
            option.textContent = warehouse.warehouse_name;
            select.appendChild(option);
        }
    });
}

function populateCategoryFilter() {
    const select = document.getElementById('category-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las categorías</option>';
    
    const categories = StockApp.data.categories || [];
    categories.forEach(category => {
        if (category.is_active) {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.category_name;
            select.appendChild(option);
        }
    });
}

function populateBrandFilter() {
    const select = document.getElementById('brand-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las marcas</option>';
    
    // Obtener marcas únicas de productos
    const brands = [...new Set(StockApp.data.products
        .filter(p => p.brand && p.is_active)
        .map(p => p.brand)
    )].sort();
    
    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        select.appendChild(option);
    });
}

function populateStatusFilter() {
    const select = document.getElementById('status-filter');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">Todos los estados</option>
        <option value="critical">Crítico</option>
        <option value="low">Bajo</option>
        <option value="normal">Normal</option>
        <option value="excess">Exceso</option>
        <option value="out">Sin Stock</option>
    `;
}

function applyFilters() {
    // Obtener valores de filtros
    StockApp.filters = {
        warehouse: document.getElementById('warehouse-filter')?.value || '',
        category: document.getElementById('category-filter')?.value || '',
        brand: document.getElementById('brand-filter')?.value || '',
        status: document.getElementById('status-filter')?.value || '',
        search: document.getElementById('search-input')?.value.toLowerCase().trim() || ''
    };
    
    // Resetear paginación
    StockApp.currentPage = 1;
    
    // Recargar datos
    loadStockData();
    
    console.log('🔍 Filtros aplicados:', StockApp.filters);
}

function clearFilters() {
    // Limpiar controles de filtro
    document.getElementById('warehouse-filter').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('brand-filter').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('search-input').value = '';
    
    // Resetear filtros
    StockApp.filters = {
        warehouse: '',
        category: '',
        brand: '',
        status: '',
        search: ''
    };
    
    // Recargar datos
    applyFilters();
    
    showSuccess('Filtros limpiados correctamente');
}

// ============================================================================
// TABLA DE STOCK
// ============================================================================

function initializeTable() {
    const tableContainer = document.getElementById('stock-table-container');
    if (!tableContainer) return;
    
    // Agregar event listeners para ordenamiento
    const headers = tableContainer.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            handleSort(column);
        });
    });
}

function loadStockData() {
    try {
        // Preparar datos combinados
        const stockData = prepareStockData();
        
        // Aplicar filtros
        StockApp.filteredData = applyDataFilters(stockData);
        
        // Aplicar ordenamiento
        applySorting();
        
        // Actualizar totales
        StockApp.totalItems = StockApp.filteredData.length;
        
        // Renderizar tabla
        renderTable();
        
        // Actualizar información
        updateTableInfo();
        
        // Actualizar paginación
        updatePagination();
        
    } catch (error) {
        console.error('❌ Error cargando datos de stock:', error);
        showError('Error cargando datos de stock');
    }
}

function prepareStockData() {
    const stockData = [];
    
    StockApp.data.stock.forEach(stockItem => {
        // Obtener producto y variante
        const variant = getVariantById(stockItem.product_variant_id);
        const product = variant ? getProductById(variant.product_id) : null;
        const warehouse = getWarehouseById(stockItem.warehouse_id);
        const zone = stockItem.warehouse_zone_id ? getZoneById(stockItem.warehouse_zone_id) : null;
        const category = product ? getCategoryById(product.category_id) : null;
        
        if (product && variant && warehouse) {
            // Determinar estado del stock
            const status = determineStockStatus(stockItem);
            
            stockData.push({
                id: stockItem.id,
                product_id: product.id,
                variant_id: variant.id,
                warehouse_id: warehouse.id,
                product_code: product.product_code,
                product_name: product.product_name,
                variant_name: variant.variant_name,
                variant_sku: variant.variant_sku,
                brand: product.brand || 'Sin marca',
                category_name: category ? category.category_name : 'Sin categoría',
                warehouse_name: warehouse.warehouse_name,
                warehouse_zone: zone ? zone.zone_name : 'Sin zona',
                current_quantity: stockItem.current_quantity,
                reserved_quantity: stockItem.reserved_quantity,
                available_quantity: stockItem.current_quantity - stockItem.reserved_quantity,
                minimum_stock: stockItem.minimum_stock || 0,
                maximum_stock: stockItem.maximum_stock || 0,
                last_movement_date: stockItem.last_movement_date,
                last_sale_date: stockItem.last_sale_date,
                rotation_category: stockItem.rotation_category || 'NO_MOVEMENT',
                avg_monthly_sales: stockItem.avg_monthly_sales || 0,
                days_until_stockout: stockItem.days_until_stockout,
                status: status,
                unit_cost: stockItem.unit_cost || 0
            });
        }
    });
    
    return stockData;
}

function applyDataFilters(data) {
    return data.filter(item => {
        // Filtro por bodega
        if (StockApp.filters.warehouse && item.warehouse_id != StockApp.filters.warehouse) {
            return false;
        }
        
        // Filtro por categoría
        if (StockApp.filters.category) {
            const product = getProductById(item.product_id);
            if (!product || product.category_id != StockApp.filters.category) {
                return false;
            }
        }
        
        // Filtro por marca
        if (StockApp.filters.brand && item.brand !== StockApp.filters.brand) {
            return false;
        }
        
        // Filtro por estado
        if (StockApp.filters.status && item.status !== StockApp.filters.status) {
            return false;
        }
        
        // Filtro por búsqueda
        if (StockApp.filters.search) {
            const searchText = StockApp.filters.search;
            const searchFields = [
                item.product_name,
                item.product_code,
                item.variant_sku,
                item.brand,
                item.category_name,
                item.warehouse_name
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchText)) {
                return false;
            }
        }
        
        return true;
    });
}

function applySorting() {
    StockApp.filteredData.sort((a, b) => {
        let aVal = a[StockApp.sortColumn];
        let bVal = b[StockApp.sortColumn];
        
        // Convertir a números si es necesario
        if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
            aVal = parseFloat(aVal);
            bVal = parseFloat(bVal);
        }
        
        // Convertir a string para comparación
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        let result = 0;
        if (aVal < bVal) result = -1;
        if (aVal > bVal) result = 1;
        
        return StockApp.sortDirection === 'desc' ? -result : result;
    });
}

function renderTable() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;
    
    // Calcular datos para la página actual
    const startIndex = (StockApp.currentPage - 1) * StockApp.itemsPerPage;
    const endIndex = startIndex + StockApp.itemsPerPage;
    const pageData = StockApp.filteredData.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty">
                    <div class="empty-icon">📦</div>
                    <h4>No se encontraron productos</h4>
                    <p>Ajusta los filtros para ver más resultados</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageData.map(item => createTableRow(item)).join('');
    
    // Agregar event listeners a las filas
    tbody.querySelectorAll('tr[data-product-id]').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                const productId = row.dataset.productId;
                const variantId = row.dataset.variantId;
                showProductDetail(productId, variantId);
            }
        });
    });
}

function createTableRow(item) {
    const statusClass = `stock-${item.status}`;
    const quantityClass = `stock-quantity ${item.status}`;
    
    return `
        <tr data-product-id="${item.product_id}" data-variant-id="${item.variant_id}">
            <td class="product-cell">
                <div class="product-name">${item.product_name}</div>
                <div class="product-code">${item.product_code}</div>
                <div class="product-details">
                    SKU: ${item.variant_sku} | ${item.brand}
                </div>
            </td>
            <td class="warehouse-cell">
                <div class="warehouse-name">${item.warehouse_name}</div>
                <div class="warehouse-zone">${item.warehouse_zone}</div>
            </td>
            <td class="stock-cell">
                <div class="${quantityClass}">${formatNumber(item.current_quantity)}</div>
                <div class="stock-details">
                    <span class="min-stock">Mín: ${formatNumber(item.minimum_stock)}</span>
                    <span class="max-stock">Máx: ${formatNumber(item.maximum_stock)}</span>
                </div>
            </td>
            <td class="text-center">
                <div class="${quantityClass}">${formatNumber(item.available_quantity)}</div>
            </td>
            <td class="text-center">
                <div class="${quantityClass}">${formatNumber(item.reserved_quantity)}</div>
            </td>
            <td class="status-cell">
                <span class="stock-badge ${statusClass}">${getStatusText(item.status)}</span>
            </td>
            <td class="text-center">
                <div class="rotation-category">${getRotationText(item.rotation_category)}</div>
                <div style="font-size: 0.8em; color: #6c757d; margin-top: 4px;">
                    ${item.avg_monthly_sales > 0 ? `${formatNumber(item.avg_monthly_sales)}/mes` : 'Sin datos'}
                </div>
            </td>
            <td class="text-center">
                <div class="row-actions">
                    <button class="action-btn" onclick="showProductDetail(${item.product_id}, ${item.variant_id})" title="Ver detalle">
                        👁️
                    </button>
                    <button class="action-btn secondary" onclick="showMovementHistory(${item.variant_id}, ${item.warehouse_id})" title="Historial">
                        📋
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ============================================================================
// ORDENAMIENTO
// ============================================================================

function handleSort(column) {
    if (StockApp.sortColumn === column) {
        // Cambiar dirección si es la misma columna
        StockApp.sortDirection = StockApp.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nueva columna, ordenar ascendente
        StockApp.sortColumn = column;
        StockApp.sortDirection = 'asc';
    }
    
    // Actualizar UI de headers
    updateSortHeaders();
    
    // Aplicar ordenamiento
    applySorting();
    
    // Renderizar tabla
    renderTable();
    
    console.log(`📊 Ordenando por ${column} ${StockApp.sortDirection}`);
}

function updateSortHeaders() {
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === StockApp.sortColumn) {
            header.classList.add(`sort-${StockApp.sortDirection}`);
        }
    });
}

// ============================================================================
// PAGINACIÓN
// ============================================================================

function updatePagination() {
    const totalPages = Math.ceil(StockApp.totalItems / StockApp.itemsPerPage);
    
    // Actualizar información de paginación
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const start = (StockApp.currentPage - 1) * StockApp.itemsPerPage + 1;
        const end = Math.min(start + StockApp.itemsPerPage - 1, StockApp.totalItems);
        paginationInfo.textContent = `Mostrando ${start}-${end} de ${StockApp.totalItems} productos`;
    }
    
    // Actualizar controles
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.innerHTML = createPaginationControls(totalPages);
        
        // Agregar event listeners
        paginationControls.addEventListener('click', handlePaginationClick);
    }
}

function createPaginationControls(totalPages) {
    if (totalPages <= 1) return '';
    
    let html = `
        <button class="page-btn" data-page="prev" ${StockApp.currentPage <= 1 ? 'disabled' : ''}>
            ← Anterior
        </button>
    `;
    
    // Páginas numeradas
    const startPage = Math.max(1, StockApp.currentPage - 2);
    const endPage = Math.min(totalPages, StockApp.currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-btn ${i === StockApp.currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `
        <button class="page-btn" data-page="next" ${StockApp.currentPage >= totalPages ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;
    
    return html;
}

function handlePaginationClick(e) {
    if (!e.target.classList.contains('page-btn')) return;
    
    const page = e.target.dataset.page;
    const totalPages = Math.ceil(StockApp.totalItems / StockApp.itemsPerPage);
    
    let newPage = StockApp.currentPage;
    
    if (page === 'prev' && StockApp.currentPage > 1) {
        newPage = StockApp.currentPage - 1;
    } else if (page === 'next' && StockApp.currentPage < totalPages) {
        newPage = StockApp.currentPage + 1;
    } else if (page !== 'prev' && page !== 'next') {
        newPage = parseInt(page);
    }
    
    if (newPage !== StockApp.currentPage) {
        StockApp.currentPage = newPage;
        renderTable();
        updatePagination();
        
        // Scroll al inicio de la tabla
        document.getElementById('stock-table-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// ============================================================================
// MODAL DE DETALLE
// ============================================================================

function showProductDetail(productId, variantId) {
    const product = getProductById(productId);
    const variant = getVariantById(variantId);
    
    if (!product || !variant) {
        showError('No se pudo cargar la información del producto');
        return;
    }
    
    const modalContent = createProductDetailModal(product, variant);
    showModal('Detalle de Producto', modalContent, 'product-detail-modal');
    
    // Inicializar pestañas
    initializeDetailTabs();
    
    console.log(`👁️ Mostrando detalle del producto: ${product.product_name}`);
}

function createProductDetailModal(product, variant) {
    const category = getCategoryById(product.category_id);
    
    return `
        <div class="product-detail-header">
            <div class="product-detail-info">
                <h3 class="product-detail-title">${product.product_name}</h3>
                <div class="product-detail-subtitle">
                    ${variant.variant_name} | SKU: ${variant.variant_sku}
                </div>
            </div>
        </div>
        
        <div class="product-detail-tabs">
            <button class="tab-btn active" data-tab="stock">Stock por Bodega</button>
            <button class="tab-btn" data-tab="movements">Movimientos</button>
            <button class="tab-btn" data-tab="info">Información</button>
        </div>
        
        <div class="tab-content">
            <div class="tab-pane active" id="stock-tab">
                ${createStockByWarehouseTab(variant.id)}
            </div>
            <div class="tab-pane" id="movements-tab">
                ${createMovementsTab(variant.id)}
            </div>
            <div class="tab-pane" id="info-tab">
                ${createProductInfoTab(product, variant, category)}
            </div>
        </div>
    `;
}

function createStockByWarehouseTab(variantId) {
    const stockItems = StockApp.data.stock.filter(s => s.product_variant_id === variantId);
    
    if (stockItems.length === 0) {
        return '<div class="table-empty"><div class="empty-icon">📦</div><h4>Sin stock registrado</h4></div>';
    }
    
    const cards = stockItems.map(stock => {
        const warehouse = getWarehouseById(stock.warehouse_id);
        const zone = stock.warehouse_zone_id ? getZoneById(stock.warehouse_zone_id) : null;
        const status = determineStockStatus(stock);
        
        return `
            <div class="warehouse-stock-card ${status}">
                <div class="warehouse-card-header">
                    <div>
                        <div class="warehouse-card-name">${warehouse.warehouse_name}</div>
                        <div class="warehouse-card-zone">${zone ? zone.zone_name : 'Sin zona'}</div>
                    </div>
                    <span class="stock-badge stock-${status}">${getStatusText(status)}</span>
                </div>
                <div class="warehouse-card-stock">${formatNumber(stock.current_quantity)}</div>
                <div class="warehouse-card-details">
                    <div class="detail-item">
                        <span>Disponible:</span>
                        <span class="detail-value">${formatNumber(stock.current_quantity - stock.reserved_quantity)}</span>
                    </div>
                    <div class="detail-item">
                        <span>Reservado:</span>
                        <span class="detail-value">${formatNumber(stock.reserved_quantity)}</span>
                    </div>
                    <div class="detail-item">
                        <span>Mínimo:</span>
                        <span class="detail-value">${formatNumber(stock.minimum_stock || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span>Máximo:</span>
                        <span class="detail-value">${formatNumber(stock.maximum_stock || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="warehouse-stock-grid">${cards}</div>`;
}

function createMovementsTab(variantId) {
    const movements = StockApp.data.stock_movements
        .filter(m => m.product_variant_id === variantId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20); // Últimos 20 movimientos
    
    if (movements.length === 0) {
        return '<div class="table-empty"><div class="empty-icon">📋</div><h4>Sin movimientos registrados</h4></div>';
    }
    
    const movementItems = movements.map(movement => {
        const warehouse = getWarehouseById(movement.warehouse_id);
        const iconMap = {
            'IN': { icon: '📥', class: 'movement-in' },
            'OUT': { icon: '📤', class: 'movement-out' },
            'TRANSFER': { icon: '🔄', class: 'movement-transfer' },
            'ADJUSTMENT': { icon: '⚖️', class: 'movement-adjustment' }
        };
        
        const movementIcon = iconMap[movement.movement_type] || { icon: '📦', class: 'movement-in' };
        const quantitySign = movement.quantity > 0 ? '+' : '';
        
        return `
            <div class="movement-item">
                <div class="movement-icon ${movementIcon.class}">
                    ${movementIcon.icon}
                </div>
                <div class="movement-details">
                    <div class="movement-type">
                        ${getMovementTypeText(movement.reference_type)} - ${warehouse.warehouse_name}
                    </div>
                    <div class="movement-info">
                        ${movement.notes || 'Sin observaciones'}<br>
                        Por: ${movement.created_by_user}
                    </div>
                </div>
                <div class="movement-quantity">
                    ${quantitySign}${Math.abs(movement.quantity)}
                </div>
                <div class="movement-date">
                    ${formatDateTime(movement.created_at)}
                </div>
            </div>
        `;
    }).join('');
    
    return `<div class="movements-timeline">${movementItems}</div>`;
}

function createProductInfoTab(product, variant, category) {
    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4>Información del Producto</h4>
                <table style="width: 100%; margin-bottom: 20px;">
                    <tr><td><strong>Código:</strong></td><td>${product.product_code}</td></tr>
                    <tr><td><strong>Nombre:</strong></td><td>${product.product_name}</td></tr>
                    <tr><td><strong>Marca:</strong></td><td>${product.brand || 'Sin marca'}</td></tr>
                    <tr><td><strong>Modelo:</strong></td><td>${product.model || 'Sin modelo'}</td></tr>
                    <tr><td><strong>Categoría:</strong></td><td>${category ? category.category_name : 'Sin categoría'}</td></tr>
                </table>
                
                <h4>Configuración de Inventario</h4>
                <table style="width: 100%;">
                    <tr><td><strong>Control de lotes:</strong></td><td>${product.has_batch_control ? 'Sí' : 'No'}</td></tr>
                    <tr><td><strong>Fecha de vencimiento:</strong></td><td>${product.has_expiry_date ? 'Sí' : 'No'}</td></tr>
                    <tr><td><strong>Números de serie:</strong></td><td>${product.has_serial_numbers ? 'Sí' : 'No'}</td></tr>
                    <tr><td><strong>Seguimiento ubicación:</strong></td><td>${product.has_location_tracking ? 'Sí' : 'No'}</td></tr>
                </table>
            </div>
            
            <div>
                <h4>Información de Variante</h4>
                <table style="width: 100%; margin-bottom: 20px;">
                    <tr><td><strong>SKU:</strong></td><td>${variant.variant_sku}</td></tr>
                    <tr><td><strong>Nombre:</strong></td><td>${variant.variant_name}</td></tr>
                    <tr><td><strong>Variante por defecto:</strong></td><td>${variant.is_default_variant ? 'Sí' : 'No'}</td></tr>
                    <tr><td><strong>Estado:</strong></td><td>${variant.is_active ? 'Activo' : 'Inactivo'}</td></tr>
                </table>
                
                <h4>Estadísticas</h4>
                <table style="width: 100%;">
                    <tr><td><strong>Total en stock:</strong></td><td>${getTotalStock(variant.id)}</td></tr>
                    <tr><td><strong>Valor total:</strong></td><td>${formatCurrency(getTotalStockValue(variant.id))}</td></tr>
                    <tr><td><strong>Bodegas:</strong></td><td>${getWarehouseCount(variant.id)}</td></tr>
                    <tr><td><strong>Último movimiento:</strong></td><td>${getLastMovementDate(variant.id)}</td></tr>
                </table>
            </div>
        </div>
    `;
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function determineStockStatus(stockItem) {
    const current = stockItem.current_quantity;
    const minimum = stockItem.minimum_stock || 0;
    const maximum = stockItem.maximum_stock || 0;
    
    if (current === 0) return 'out';
    if (current <= minimum * 0.5) return 'critical';
    if (current <= minimum) return 'low';
    if (maximum > 0 && current >= maximum * 1.2) return 'excess';
    return 'normal';
}

function getStatusText(status) {
    const statusTexts = {
        'critical': 'Crítico',
        'low': 'Bajo',
        'normal': 'Normal',
        'excess': 'Exceso',
        'out': 'Sin Stock'
    };
    return statusTexts[status] || 'Desconocido';
}

function getRotationText(rotation) {
    const rotationTexts = {
        'FAST': 'Rápida',
        'MEDIUM': 'Media',
        'SLOW': 'Lenta',
        'NO_MOVEMENT': 'Sin Movimiento'
    };
    return rotationTexts[rotation] || 'Sin datos';
}

function getMovementTypeText(type) {
    const types = {
        'PURCHASE': 'Compra',
        'SALE': 'Venta',
        'TRANSFER': 'Transferencia',
        'ADJUSTMENT': 'Ajuste',
        'RETURN': 'Devolución',
        'DAMAGE': 'Daño'
    };
    return types[type] || type;
}

function getVariantById(variantId) {
    return StockApp.data.product_variants.find(v => v.id === variantId);
}

function getProductById(productId) {
    return StockApp.data.products.find(p => p.id === productId);
}

function getWarehouseById(warehouseId) {
    return StockApp.data.warehouses.find(w => w.id === warehouseId);
}

function getZoneById(zoneId) {
    return StockApp.data.warehouse_zones.find(z => z.id === zoneId);
}

function getCategoryById(categoryId) {
    return StockApp.data.categories.find(c => c.id === categoryId);
}

function getTotalStock(variantId) {
    const stockItems = StockApp.data.stock.filter(s => s.product_variant_id === variantId);
    return stockItems.reduce((total, item) => total + item.current_quantity, 0);
}

function getTotalStockValue(variantId) {
    const stockItems = StockApp.data.stock.filter(s => s.product_variant_id === variantId);
    return stockItems.reduce((total, item) => {
        return total + (item.current_quantity * (item.unit_cost || 0));
    }, 0);
}

function getWarehouseCount(variantId) {
    const stockItems = StockApp.data.stock.filter(s => s.product_variant_id === variantId);
    return stockItems.length;
}

function getLastMovementDate(variantId) {
    const movements = StockApp.data.stock_movements
        .filter(m => m.product_variant_id === variantId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return movements.length > 0 ? formatDate(movements[0].created_at) : 'Sin movimientos';
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-CL').format(num);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL');
}

// ============================================================================
// EXPORTACIÓN DE DATOS
// ============================================================================

function exportToCSV() {
    try {
        const headers = [
            'Código Producto',
            'Nombre Producto',
            'SKU Variante',
            'Marca',
            'Categoría',
            'Bodega',
            'Zona',
            'Stock Actual',
            'Stock Disponible',
            'Stock Reservado',
            'Stock Mínimo',
            'Stock Máximo',
            'Estado',
            'Rotación',
            'Ventas Promedio/Mes',
            'Valor Unitario',
            'Valor Total'
        ];
        
        const csvData = [headers];
        
        // Agregar datos filtrados
        StockApp.filteredData.forEach(item => {
            csvData.push([
                item.product_code,
                item.product_name,
                item.variant_sku,
                item.brand,
                item.category_name,
                item.warehouse_name,
                item.warehouse_zone,
                item.current_quantity,
                item.available_quantity,
                item.reserved_quantity,
                item.minimum_stock,
                item.maximum_stock,
                getStatusText(item.status),
                getRotationText(item.rotation_category),
                item.avg_monthly_sales,
                item.unit_cost,
                item.current_quantity * item.unit_cost
            ]);
        });
        
        const csvContent = csvData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `consulta_stock_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Datos exportados correctamente');
        console.log('📊 Datos exportados a CSV');
        
    } catch (error) {
        console.error('❌ Error exportando datos:', error);
        showError('Error al exportar los datos');
    }
}

// ============================================================================
// GESTIÓN DE PESTAÑAS
// ============================================================================

function initializeDetailTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Actualizar botones
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Actualizar contenido
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === `${tabId}-tab`) {
                    pane.classList.add('active');
                }
            });
        });
    });
}

// ============================================================================
// HISTORIAL DE MOVIMIENTOS
// ============================================================================

function showMovementHistory(variantId, warehouseId) {
    const variant = getVariantById(variantId);
    const warehouse = getWarehouseById(warehouseId);
    
    if (!variant || !warehouse) {
        showError('No se pudo cargar el historial de movimientos');
        return;
    }
    
    const movements = StockApp.data.stock_movements
        .filter(m => m.product_variant_id === variantId && m.warehouse_id === warehouseId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const product = getProductById(variant.product_id);
    const title = `Historial de Movimientos - ${product.product_name} (${warehouse.warehouse_name})`;
    
    const content = createMovementHistoryContent(movements);
    showModal(title, content, 'movement-history-modal');
    
    console.log(`📋 Mostrando historial de movimientos para ${variant.variant_sku} en ${warehouse.warehouse_name}`);
}

function createMovementHistoryContent(movements) {
    if (movements.length === 0) {
        return '<div class="table-empty"><div class="empty-icon">📋</div><h4>Sin movimientos registrados</h4></div>';
    }
    
    const movementItems = movements.map(movement => {
        const iconMap = {
            'IN': { icon: '📥', class: 'movement-in' },
            'OUT': { icon: '📤', class: 'movement-out' },
            'TRANSFER': { icon: '🔄', class: 'movement-transfer' },
            'ADJUSTMENT': { icon: '⚖️', class: 'movement-adjustment' }
        };
        
        const movementIcon = iconMap[movement.movement_type] || { icon: '📦', class: 'movement-in' };
        const quantitySign = movement.quantity > 0 ? '+' : '';
        
        return `
            <div class="movement-item">
                <div class="movement-icon ${movementIcon.class}">
                    ${movementIcon.icon}
                </div>
                <div class="movement-details">
                    <div class="movement-type">
                        ${getMovementTypeText(movement.reference_type)}
                        ${movement.reference_document_id ? `- Doc: ${movement.reference_document_id}` : ''}
                    </div>
                    <div class="movement-info">
                        ${movement.notes || 'Sin observaciones'}<br>
                        Stock anterior: ${formatNumber(movement.quantity_before)} → 
                        Stock posterior: ${formatNumber(movement.quantity_after)}<br>
                        ${movement.batch_lot_number ? `Lote: ${movement.batch_lot_number} | ` : ''}
                        ${movement.serial_number ? `Serie: ${movement.serial_number} | ` : ''}
                        Por: ${movement.created_by_user}
                    </div>
                </div>
                <div class="movement-quantity">
                    ${quantitySign}${Math.abs(movement.quantity)}
                </div>
                <div class="movement-date">
                    ${formatDateTime(movement.created_at)}
                </div>
            </div>
        `;
    }).join('');
    
    return `
        <div style="max-height: 500px; overflow-y: auto;">
            <div class="movements-timeline">${movementItems}</div>
        </div>
    `;
}

// ============================================================================
// ACTUALIZACIÓN DE INFORMACIÓN
// ============================================================================

function updateTableInfo() {
    // Actualizar contador de resultados
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        resultsCount.textContent = `${formatNumber(StockApp.totalItems)} productos encontrados`;
    }
    
    // Actualizar última actualización
    const lastUpdate = document.getElementById('last-update');
    if (lastUpdate) {
        lastUpdate.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-CL')}`;
    }
    
    // Actualizar alertas si hay filtros críticos
    updateStockAlerts();
}

function updateStockAlerts() {
    const criticalItems = StockApp.filteredData.filter(item => item.status === 'critical' || item.status === 'out');
    const alertContainer = document.getElementById('stock-alerts');
    
    if (!alertContainer) return;
    
    if (criticalItems.length === 0) {
        alertContainer.innerHTML = '';
        return;
    }
    
    const alertHtml = `
        <div class="stock-alert critical">
            <span class="alert-icon">⚠️</span>
            <div>
                <strong>Atención:</strong> Se encontraron ${criticalItems.length} productos con stock crítico o agotado.
                ${criticalItems.length <= 5 ? 
                    `<br>Productos: ${criticalItems.slice(0, 5).map(item => item.product_name).join(', ')}` : 
                    ''
                }
            </div>
        </div>
    `;
    
    alertContainer.innerHTML = alertHtml;
}

function refreshData() {
    console.log('🔄 Actualizando datos...');
    
    // Mostrar indicador de carga
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '🔄 Actualizando...';
    }
    
    // Simular actualización (en implementación real sería una llamada al servidor)
    setTimeout(() => {
        loadStockData();
        
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '🔄 Actualizar';
        }
        
        showSuccess('Datos actualizados correctamente');
        console.log('✅ Datos actualizados');
    }, 1000);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initializeEventListeners() {
    // Filtros
    const warehouseFilter = document.getElementById('warehouse-filter');
    const categoryFilter = document.getElementById('category-filter');
    const brandFilter = document.getElementById('brand-filter');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-input');
    
    if (warehouseFilter) warehouseFilter.addEventListener('change', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
    if (brandFilter) brandFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    
    // Búsqueda con debounce
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
    }
    
    // Botones de acción
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportBtn = document.getElementById('export-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
    if (refreshBtn) refreshBtn.addEventListener('click', refreshData);
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', (e) => {
        // Ctrl+F para enfocar búsqueda
        if (e.ctrlKey && e.key === 'f' && searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        
        // F5 para actualizar
        if (e.key === 'F5') {
            e.preventDefault();
            refreshData();
        }
        
        // Escape para limpiar filtros
        if (e.key === 'Escape') {
            clearFilters();
        }
    });
}

// ============================================================================
// ESTADOS DE CARGA Y ERRORES
// ============================================================================

function showLoadingState() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div class="table-loading">
                <div class="loading-spinner"></div>
                <h3>Cargando Consulta de Stock...</h3>
                <p>Obteniendo información de inventario</p>
            </div>
        `;
    }
}

function hideLoadingState() {
    // Restaurar el contenido original de la página
    const container = document.querySelector('.container');
    if (container && container.innerHTML.includes('table-loading')) {
        // Recargar la página completa para mostrar el HTML original
        window.location.reload();
    }
}

function showError(message) {
    const toast = createToast('error', 'Error', message);
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.remove(), 5000);
}

function showSuccess(message) {
    const toast = createToast('success', 'Éxito', message);
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.remove(), 3000);
}

function createToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    return toast;
}

// ============================================================================
// MODALES
// ============================================================================

function showModal(title, content, customClass = '') {
    // Crear modal si no existe
    let modal = document.getElementById('generic-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.className = `modal ${customClass}`;
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close" onclick="closeModal('generic-modal')">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal('generic-modal');
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ============================================================================
// FUNCIONES DE DEPURACIÓN
// ============================================================================

function debugInfo() {
    console.log('🐛 Información de depuración:');
    console.log('- Datos cargados:', StockApp.data);
    console.log('- Filtros actuales:', StockApp.filters);
    console.log('- Datos filtrados:', StockApp.filteredData.length);
    console.log('- Página actual:', StockApp.currentPage);
    console.log('- Ordenamiento:', StockApp.sortColumn, StockApp.sortDirection);
}

// Exponer funciones de depuración en desarrollo
if (typeof window !== 'undefined') {
    window.StockDebug = {
        app: StockApp,
        debugInfo,
        refreshData,
        exportToCSV
    };
}

console.log('✅ Sistema de Consulta de Stock cargado correctamente');