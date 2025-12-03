/**
 * Módulo de Ajustes de Inventario - Sistema de Control de Stock
 * Funcionalidad principal para gestión de ajustes y conteos cíclicos
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let AdjustmentsApp = {
    data: {},
    extendedData: {},
    currentWarehouse: 1,
    currentFilters: {
        status: 'all',
        reason: 'all',
        warehouse: 'all',
        dateFrom: '',
        dateTo: '',
        search: ''
    },
    selectedProducts: [],
    currentAdjustment: null,
    currentCycleCount: null,
    isLoading: false
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 Inicializando Módulo de Ajustes de Inventario');
    initializeAdjustmentsApp();
});

async function initializeAdjustmentsApp() {
    try {
        console.log('🎯 Iniciando aplicación de ajustes...');
        showLoadingState();

        console.log('📁 Cargando datos...');
        await loadAllData();

        console.log('🔧 Inicializando filtros...');
        initializeFilters();
        
        console.log('👂 Inicializando event listeners...');
        initializeEventListeners();
        
        console.log('🎭 Inicializando modales...');
        initializeModals();

        console.log('📊 Cargando dashboard...');
        await loadAdjustmentsDashboard();

        console.log('✨ Ocultando loading...');
        hideLoadingState();

        console.log('✅ Módulo de Ajustes inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando módulo de ajustes:', error);
        console.error('❌ Detalles:', error.message);
        showError('Error cargando el módulo. Por favor, recarga la página.');
    }
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

async function loadAllData() {
    try {
        console.log('🚀 Iniciando carga de datos...');
        
        // Cargar datos base desde nivel superior
        const data_json = '../data.json';
        const dataExtend_json = 'data_extend.json';
        
        console.log('🔍 Intentando cargar:', data_json, 'y', dataExtend_json);
        
        console.log('📥 Cargando data.json...');
        const baseResponse = await fetch(data_json);
        console.log('📥 Respuesta data.json:', baseResponse.status, baseResponse.statusText);
        
        if (!baseResponse.ok) {
            throw new Error(`HTTP error en data.json! status: ${baseResponse.status}`);
        }
        
        AdjustmentsApp.data = await baseResponse.json();
        console.log('✅ data.json cargado:', Object.keys(AdjustmentsApp.data));

        // Cargar datos extendidos
        console.log('📥 Cargando data_extend.json...');
        const extendedResponse = await fetch(dataExtend_json);
        console.log('📥 Respuesta data_extend.json:', extendedResponse.status, extendedResponse.statusText);
        
        if (!extendedResponse.ok) {
            throw new Error(`HTTP error en data_extend.json! status: ${extendedResponse.status}`);
        }
        
        AdjustmentsApp.extendedData = await extendedResponse.json();
        console.log('✅ data_extend.json cargado:', Object.keys(AdjustmentsApp.extendedData));

        console.log('📊 Todos los datos cargados exitosamente');

        // Establecer bodega por defecto
        AdjustmentsApp.currentWarehouse = AdjustmentsApp.data.dashboard_config?.default_warehouse_id || 1;
        console.log('🏪 Bodega establecida:', AdjustmentsApp.currentWarehouse);

    } catch (error) {
        console.error('❌ Error detallado cargando datos:', error);
        console.error('❌ Stack trace:', error.stack);
        throw error;
    }
}

// ============================================================================
// DASHBOARD PRINCIPAL
// ============================================================================

async function loadAdjustmentsDashboard() {
    try {
        // Cargar métricas principales
        loadAdjustmentMetrics();

        // Cargar tabla de ajustes
        loadAdjustmentsTable();

        // Cargar conteos cíclicos
        loadCycleCountsSection();

        // Cargar reportes
        loadReportsSection();

    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showError('Error actualizando el dashboard');
    }
}

function loadAdjustmentMetrics() {
    const metrics = calculateAdjustmentMetrics();
    const metricsContainer = document.getElementById('adjustments-metrics');
    
    if (!metricsContainer) return;

    metricsContainer.innerHTML = `
        <div class="adjustment-metric-card total">
            <div class="metric-icon">📊</div>
            <div class="metric-value">${metrics.total}</div>
            <div class="metric-label">Total Ajustes</div>
            <div class="metric-trend trend-neutral">Este mes</div>
        </div>
        <div class="adjustment-metric-card pending">
            <div class="metric-icon">⏳</div>
            <div class="metric-value">${metrics.pending}</div>
            <div class="metric-label">Pendientes</div>
            <div class="metric-trend trend-up">+${metrics.pendingTrend}% vs anterior</div>
        </div>
        <div class="adjustment-metric-card approved">
            <div class="metric-icon">✅</div>
            <div class="metric-value">${metrics.approved}</div>
            <div class="metric-label">Aprobados</div>
            <div class="metric-trend trend-positive">+${metrics.approvedTrend}% vs anterior</div>
        </div>
        <div class="adjustment-metric-card rejected">
            <div class="metric-icon">❌</div>
            <div class="metric-value">${metrics.rejected}</div>
            <div class="metric-label">Rechazados</div>
            <div class="metric-trend trend-negative">${metrics.rejectedTrend}% vs anterior</div>
        </div>
    `;
}

function calculateAdjustmentMetrics() {
    const adjustments = getFilteredAdjustments();
    const currentPeriod = AdjustmentsApp.extendedData.adjustment_statistics.find(s => s.period === '2024-07') || {};
    const previousPeriod = AdjustmentsApp.extendedData.adjustment_statistics.find(s => s.period === '2024-06') || {};

    return {
        total: adjustments.length,
        pending: adjustments.filter(a => a.status === 'PENDING').length,
        approved: adjustments.filter(a => a.status === 'APPROVED').length,
        rejected: adjustments.filter(a => a.status === 'REJECTED').length,
        pendingTrend: calculateTrend(currentPeriod.pending_adjustments, previousPeriod.pending_adjustments),
        approvedTrend: calculateTrend(currentPeriod.approved_adjustments, previousPeriod.approved_adjustments),
        rejectedTrend: calculateTrend(currentPeriod.rejected_adjustments, previousPeriod.rejected_adjustments)
    };
}

function calculateTrend(current, previous) {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
}

// ============================================================================
// TABLA DE AJUSTES
// ============================================================================

function loadAdjustmentsTable() {
    const adjustments = getFilteredAdjustments();
    const tableBody = document.getElementById('adjustments-table-body');
    
    if (!tableBody) return;

    if (adjustments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <h4>No hay ajustes que mostrar</h4>
                        <p>Los ajustes aparecerán aquí cuando se creen</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = adjustments.map(adjustment => createAdjustmentRow(adjustment)).join('');

    // Agregar event listeners para las filas
    tableBody.querySelectorAll('.adjustment-row').forEach(row => {
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.adjustment-actions')) {
                const adjustmentId = parseInt(row.dataset.adjustmentId);
                showAdjustmentDetail(adjustmentId);
            }
        });
    });
}

function createAdjustmentRow(adjustment) {
    const reason = getAdjustmentReason(adjustment.reason_id);
    const warehouse = getWarehouse(adjustment.warehouse_id);
    const createdBy = getUser(adjustment.created_by_user_id);
    const approvedBy = adjustment.approved_by_user_id ? getUser(adjustment.approved_by_user_id) : null;
    const hasEvidence = adjustment.evidence_files && adjustment.evidence_files.length > 0;

    return `
        <tr class="adjustment-row" data-adjustment-id="${adjustment.id}">
            <td>
                <a href="#" class="adjustment-number">${adjustment.adjustment_number}</a>
            </td>
            <td>
                <div class="adjustment-reason">
                    <div class="reason-color-dot" style="background: ${reason?.color || '#6c757d'}"></div>
                    ${reason?.reason_name || 'Sin especificar'}
                </div>
            </td>
            <td>
                <span class="adjustment-status status-${adjustment.status.toLowerCase()}">
                    ${getStatusText(adjustment.status)}
                </span>
            </td>
            <td>${warehouse?.warehouse_name || 'N/A'}</td>
            <td>
                <span class="adjustment-items-count">${adjustment.total_items}</span>
            </td>
            <td>${formatDate(adjustment.adjustment_date)}</td>
            <td>${createdBy?.first_name || 'N/A'} ${createdBy?.last_name || ''}</td>
            <td>
                <div class="evidence-indicator ${hasEvidence ? 'evidence-yes' : 'evidence-no'}">
                    ${hasEvidence ? '📎' : '—'} ${hasEvidence ? 'Sí' : 'No'}
                </div>
            </td>
            <td>
                <div class="adjustment-actions">
                    <button class="action-btn view" onclick="showAdjustmentDetail(${adjustment.id})" title="Ver detalles">
                        👁️
                    </button>
                    ${adjustment.status === 'PENDING' ? `
                        <button class="action-btn approve" onclick="approveAdjustment(${adjustment.id})" title="Aprobar">
                            ✅
                        </button>
                        <button class="action-btn reject" onclick="rejectAdjustment(${adjustment.id})" title="Rechazar">
                            ❌
                        </button>
                    ` : ''}
                    ${adjustment.status === 'DRAFT' ? `
                        <button class="action-btn edit" onclick="editAdjustment(${adjustment.id})" title="Editar">
                            ✏️
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

function initializeFilters() {
    // Filtros de estado
    const statusButtons = document.querySelectorAll('.status-filter-btn');
    statusButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const status = e.target.dataset.status;
            setStatusFilter(status);
        });
    });

    // Filtro de búsqueda
    const searchInput = document.getElementById('adjustment-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            AdjustmentsApp.currentFilters.search = e.target.value;
            debounceSearch();
        });
    }

    // Filtros de fecha
    const dateFromInput = document.getElementById('date-from-filter');
    const dateToInput = document.getElementById('date-to-filter');
    
    if (dateFromInput) {
        dateFromInput.addEventListener('change', (e) => {
            AdjustmentsApp.currentFilters.dateFrom = e.target.value;
            loadAdjustmentsTable();
        });
    }
    
    if (dateToInput) {
        dateToInput.addEventListener('change', (e) => {
            AdjustmentsApp.currentFilters.dateTo = e.target.value;
            loadAdjustmentsTable();
        });
    }

    // Filtro de bodega
    const warehouseSelect = document.getElementById('warehouse-filter');
    if (warehouseSelect) {
        populateWarehouseFilter();
        warehouseSelect.addEventListener('change', (e) => {
            AdjustmentsApp.currentFilters.warehouse = e.target.value;
            loadAdjustmentsTable();
        });
    }

    // Filtro de razón
    const reasonSelect = document.getElementById('reason-filter');
    if (reasonSelect) {
        populateReasonFilter();
        reasonSelect.addEventListener('change', (e) => {
            AdjustmentsApp.currentFilters.reason = e.target.value;
            loadAdjustmentsTable();
        });
    }
}

function setStatusFilter(status) {
    AdjustmentsApp.currentFilters.status = status;

    // Actualizar UI de botones
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    // Recargar tabla
    loadAdjustmentsTable();
}

function populateWarehouseFilter() {
    const select = document.getElementById('warehouse-filter');
    if (!select) return;

    const warehouses = AdjustmentsApp.data.warehouses || [];
    
    select.innerHTML = `
        <option value="all">Todas las bodegas</option>
        ${warehouses.map(warehouse => `
            <option value="${warehouse.id}">${warehouse.warehouse_name}</option>
        `).join('')}
    `;
}

function populateReasonFilter() {
    const select = document.getElementById('reason-filter');
    if (!select) return;

    const reasons = AdjustmentsApp.extendedData.adjustment_reasons || [];
    
    select.innerHTML = `
        <option value="all">Todas las causales</option>
        ${reasons.map(reason => `
            <option value="${reason.id}">${reason.reason_name}</option>
        `).join('')}
    `;
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        loadAdjustmentsTable();
    }, 300);
}

function getFilteredAdjustments() {
    let adjustments = AdjustmentsApp.extendedData.inventory_adjustments || [];

    // Filtrar por estado
    if (AdjustmentsApp.currentFilters.status !== 'all') {
        adjustments = adjustments.filter(adj => 
            adj.status === AdjustmentsApp.currentFilters.status.toUpperCase()
        );
    }

    // Filtrar por bodega
    if (AdjustmentsApp.currentFilters.warehouse !== 'all') {
        adjustments = adjustments.filter(adj => 
            adj.warehouse_id === parseInt(AdjustmentsApp.currentFilters.warehouse)
        );
    }

    // Filtrar por razón
    if (AdjustmentsApp.currentFilters.reason !== 'all') {
        adjustments = adjustments.filter(adj => 
            adj.reason_id === parseInt(AdjustmentsApp.currentFilters.reason)
        );
    }

    // Filtrar por fecha
    if (AdjustmentsApp.currentFilters.dateFrom) {
        adjustments = adjustments.filter(adj => 
            adj.adjustment_date >= AdjustmentsApp.currentFilters.dateFrom
        );
    }

    if (AdjustmentsApp.currentFilters.dateTo) {
        adjustments = adjustments.filter(adj => 
            adj.adjustment_date <= AdjustmentsApp.currentFilters.dateTo
        );
    }

    // Filtrar por búsqueda
    if (AdjustmentsApp.currentFilters.search) {
        const searchTerm = AdjustmentsApp.currentFilters.search.toLowerCase();
        adjustments = adjustments.filter(adj => 
            adj.adjustment_number.toLowerCase().includes(searchTerm) ||
            adj.description.toLowerCase().includes(searchTerm)
        );
    }

    return adjustments;
}

// ============================================================================
// CREAR NUEVO AJUSTE
// ============================================================================

function showCreateAdjustmentModal() {
    AdjustmentsApp.currentAdjustment = null;
    AdjustmentsApp.selectedProducts = [];
    
    const modal = document.getElementById('adjustment-modal');
    if (modal) {
        // Resetear formulario
        resetAdjustmentForm();
        
        // Poblar selects
        populateAdjustmentForm();
        
        modal.classList.add('show');
    }
}

function resetAdjustmentForm() {
    const form = document.getElementById('adjustment-form');
    if (form) {
        form.reset();
    }

    // Limpiar productos seleccionados
    AdjustmentsApp.selectedProducts = [];
    updateProductsTable();

    // Limpiar archivos
    clearUploadedFiles();

    // Resetear razón seleccionada
    document.querySelectorAll('.reason-card').forEach(card => {
        card.classList.remove('selected');
    });
}

function populateAdjustmentForm() {
    // Poblar selector de bodega
    const warehouseSelect = document.getElementById('adjustment-warehouse');
    if (warehouseSelect) {
        const warehouses = AdjustmentsApp.data.warehouses || [];
        warehouseSelect.innerHTML = warehouses.map(warehouse => `
            <option value="${warehouse.id}">${warehouse.warehouse_name}</option>
        `).join('');
        warehouseSelect.value = AdjustmentsApp.currentWarehouse;
    }

    // Poblar selector de causales
    populateReasonSelector();

    // Fecha actual
    const dateInput = document.getElementById('adjustment-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

function populateReasonSelector() {
    const container = document.getElementById('reason-selector');
    if (!container) return;

    const reasons = AdjustmentsApp.extendedData.adjustment_reasons || [];
    
    container.innerHTML = reasons.map(reason => `
        <div class="reason-card" data-reason-id="${reason.id}" onclick="selectReason(${reason.id})">
            <div class="reason-card-icon" style="background: ${reason.color}"></div>
            <div class="reason-card-name">${reason.reason_name}</div>
            <div class="reason-card-desc">${reason.reason_description}</div>
        </div>
    `).join('');
}

function selectReason(reasonId) {
    // Actualizar UI
    document.querySelectorAll('.reason-card').forEach(card => {
        card.classList.toggle('selected', parseInt(card.dataset.reasonId) === reasonId);
    });

    // Verificar si requiere evidencia
    const reason = AdjustmentsApp.extendedData.adjustment_reasons.find(r => r.id === reasonId);
    const evidenceSection = document.getElementById('evidence-section');
    
    if (evidenceSection) {
        evidenceSection.style.display = reason?.requires_evidence ? 'block' : 'none';
    }
}

// ============================================================================
// GESTIÓN DE PRODUCTOS
// ============================================================================

function initializeProductSearch() {
    const searchInput = document.getElementById('product-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length >= 2) {
            showProductSearchResults(query);
        } else {
            hideProductSearchResults();
        }
    });

    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.product-search-input')) {
            hideProductSearchResults();
        }
    });
}

function showProductSearchResults(query) {
    const results = searchProducts(query);
    const dropdown = document.getElementById('search-results-dropdown');
    
    if (!dropdown) return;

    if (results.length === 0) {
        dropdown.innerHTML = `
            <div class="search-result-item">
                <div class="result-product-name">No se encontraron productos</div>
            </div>
        `;
    } else {
        dropdown.innerHTML = results.map(product => {
            const variant = getDefaultVariant(product.id);
            const stock = getCurrentStock(variant?.id);
            
            return `
                <div class="search-result-item" onclick="addProductToAdjustment(${variant?.id})">
                    <div class="result-product-name">${product.product_name}</div>
                    <div class="result-product-details">
                        SKU: ${variant?.variant_sku || 'N/A'} | Stock: ${stock?.current_quantity || 0}
                    </div>
                </div>
            `;
        }).join('');
    }

    dropdown.style.display = 'block';
}

function hideProductSearchResults() {
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function addProductToAdjustment(variantId) {
    if (!variantId) return;

    // Verificar si ya está agregado
    if (AdjustmentsApp.selectedProducts.find(p => p.variant_id === variantId)) {
        showWarning('El producto ya está en la lista de ajustes');
        return;
    }

    const variant = getVariantById(variantId);
    const product = getProductByVariantId(variantId);
    const stock = getCurrentStock(variantId);

    if (!variant || !product || !stock) {
        showError('Error obteniendo información del producto');
        return;
    }

    // Agregar a la lista
    AdjustmentsApp.selectedProducts.push({
        variant_id: variantId,
        product_name: product.product_name,
        variant_sku: variant.variant_sku,
        current_quantity: stock.current_quantity,
        physical_quantity: stock.current_quantity,
        adjustment_quantity: 0,
        location: stock.location || 'N/A',
        reason_detail: ''
    });

    // Actualizar tabla
    updateProductsTable();

    // Limpiar búsqueda
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    hideProductSearchResults();

    showSuccess('Producto agregado al ajuste');
}

function updateProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    if (AdjustmentsApp.selectedProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <p>No hay productos seleccionados para ajustar</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = AdjustmentsApp.selectedProducts.map((product, index) => `
        <tr>
            <td>
                <div>
                    <div class="product-name">${product.product_name}</div>
                    <div class="product-sku">SKU: ${product.variant_sku}</div>
                </div>
            </td>
            <td class="current-stock">${product.current_quantity}</td>
            <td>
                <input type="number" 
                       class="quantity-input" 
                       value="${product.physical_quantity}"
                       onchange="updatePhysicalQuantity(${index}, this.value)"
                       min="0" 
                       step="1">
            </td>
            <td>
                <span class="adjustment-difference ${getDifferenceClass(product.adjustment_quantity)}">
                    ${product.adjustment_quantity > 0 ? '+' : ''}${product.adjustment_quantity}
                </span>
            </td>
            <td>${product.location}</td>
            <td>
                <input type="text" 
                       class="form-control" 
                       placeholder="Detalle de la diferencia"
                       value="${product.reason_detail}"
                       onchange="updateReasonDetail(${index}, this.value)">
            </td>
            <td>
                <button class="remove-product-btn" onclick="removeProductFromAdjustment(${index})">
                    ❌
                </button>
            </td>
        </tr>
    `).join('');
}

function updatePhysicalQuantity(index, value) {
    const quantity = parseFloat(value) || 0;
    AdjustmentsApp.selectedProducts[index].physical_quantity = quantity;
    AdjustmentsApp.selectedProducts[index].adjustment_quantity = 
        quantity - AdjustmentsApp.selectedProducts[index].current_quantity;
    
    updateProductsTable();
}

function updateReasonDetail(index, value) {
    AdjustmentsApp.selectedProducts[index].reason_detail = value;
}

function removeProductFromAdjustment(index) {
    AdjustmentsApp.selectedProducts.splice(index, 1);
    updateProductsTable();
    showSuccess('Producto removido del ajuste');
}

function getDifferenceClass(difference) {
    if (difference > 0) return 'difference-positive';
    if (difference < 0) return 'difference-negative';
    return 'difference-zero';
}

// ============================================================================
// GESTIÓN DE EVIDENCIA
// ============================================================================

function initializeFileUpload() {
    const uploadZone = document.getElementById('evidence-upload-zone');
    if (!uploadZone) return;

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        handleFileUpload(files);
    });

    uploadZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,application/pdf';
        input.onchange = (e) => handleFileUpload(Array.from(e.target.files));
        input.click();
    });
}

function handleFileUpload(files) {
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB límite
            showWarning(`El archivo ${file.name} es muy grande (máximo 10MB)`);
            return;
        }

        // Simular upload (en implementación real se subiría al servidor)
        const fileInfo = {
            file_name: file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            url: URL.createObjectURL(file) // Para preview local
        };

        addUploadedFile(fileInfo);
    });
}

function addUploadedFile(fileInfo) {
    const container = document.getElementById('uploaded-files-list');
    if (!container) return;

    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
        <div class="file-info">
            <div class="file-icon">${getFileIcon(fileInfo.file_name)}</div>
            <div class="file-details">
                <div class="file-name">${fileInfo.file_name}</div>
                <div class="file-size">${formatFileSize(fileInfo.file_size)}</div>
            </div>
        </div>
        <button class="file-remove" onclick="removeUploadedFile(this)">❌</button>
    `;

    container.appendChild(fileElement);
    showSuccess('Archivo agregado correctamente');
}

function removeUploadedFile(button) {
    button.closest('.file-item').remove();
    showSuccess('Archivo removido');
}

function clearUploadedFiles() {
    const container = document.getElementById('uploaded-files-list');
    if (container) {
        container.innerHTML = '';
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'pdf': return '📄';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return '🖼️';
        default: return '📎';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// GUARDAR AJUSTE
// ============================================================================

function saveAdjustment() {
    const formData = getAdjustmentFormData();
    
    if (!validateAdjustmentForm(formData)) {
        return;
    }

    try {
        if (AdjustmentsApp.currentAdjustment) {
            updateExistingAdjustment(formData);
        } else {
            createNewAdjustment(formData);
        }

        closeModal('adjustment-modal');
        loadAdjustmentsDashboard();
        showSuccess('Ajuste guardado correctamente');

    } catch (error) {
        console.error('Error guardando ajuste:', error);
        showError('Error guardando el ajuste');
    }
}

function getAdjustmentFormData() {
    const selectedReason = document.querySelector('.reason-card.selected');
    
    return {
        warehouse_id: parseInt(document.getElementById('adjustment-warehouse')?.value),
        reason_id: selectedReason ? parseInt(selectedReason.dataset.reasonId) : null,
        adjustment_date: document.getElementById('adjustment-date')?.value,
        description: document.getElementById('adjustment-description')?.value || '',
        products: AdjustmentsApp.selectedProducts,
        evidence_files: getUploadedFiles()
    };
}

function validateAdjustmentForm(formData) {
    if (!formData.warehouse_id) {
        showError('Debe seleccionar una bodega');
        return false;
    }

    if (!formData.reason_id) {
        showError('Debe seleccionar una causal de ajuste');
        return false;
    }

    if (!formData.adjustment_date) {
        showError('Debe especificar la fecha del ajuste');
        return false;
    }

    if (formData.products.length === 0) {
        showError('Debe agregar al menos un producto al ajuste');
        return false;
    }

    // Validar que todos los productos tengan diferencia
    const hasAdjustments = formData.products.some(p => p.adjustment_quantity !== 0);
    if (!hasAdjustments) {
        showError('Debe haber al menos un producto con diferencia para ajustar');
        return false;
    }

    return true;
}

function createNewAdjustment(formData) {
    const newId = Math.max(...AdjustmentsApp.extendedData.inventory_adjustments.map(a => a.id)) + 1;
    const adjustmentNumber = `AJ-2024-${String(newId).padStart(4, '0')}`;

    const newAdjustment = {
        id: newId,
        adjustment_number: adjustmentNumber,
        warehouse_id: formData.warehouse_id,
        reason_id: formData.reason_id,
        adjustment_date: formData.adjustment_date,
        status: 'DRAFT',
        total_items: formData.products.length,
        created_by_user_id: getCurrentUserId(),
        approved_by_user_id: null,
        created_at: new Date().toISOString(),
        approved_at: null,
        applied_at: null,
        description: formData.description,
        supervisor_comments: null,
        evidence_files: formData.evidence_files
    };

    // Agregar ajuste
    AdjustmentsApp.extendedData.inventory_adjustments.push(newAdjustment);

    // Agregar items del ajuste
    formData.products.forEach(product => {
        const newItemId = Math.max(...AdjustmentsApp.extendedData.adjustment_items.map(i => i.id)) + 1;
        
        AdjustmentsApp.extendedData.adjustment_items.push({
            id: newItemId,
            adjustment_id: newId,
            product_variant_id: product.variant_id,
            current_quantity: product.current_quantity,
            physical_quantity: product.physical_quantity,
            adjustment_quantity: product.adjustment_quantity,
            reason_detail: product.reason_detail,
            location: product.location
        });
    });

    // Agregar al workflow
    addWorkflowStep(newId, 'Creación', 'CREATED', 'Ajuste creado como borrador');
}

function updateExistingAdjustment(formData) {
    const adjustmentIndex = AdjustmentsApp.extendedData.inventory_adjustments.findIndex(
        a => a.id === AdjustmentsApp.currentAdjustment.id
    );

    if (adjustmentIndex === -1) return;

    // Actualizar ajuste
    AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex] = {
        ...AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex],
        warehouse_id: formData.warehouse_id,
        reason_id: formData.reason_id,
        adjustment_date: formData.adjustment_date,
        description: formData.description,
        total_items: formData.products.length,
        evidence_files: formData.evidence_files
    };

    // Actualizar items (eliminar existentes y crear nuevos)
    AdjustmentsApp.extendedData.adjustment_items = 
        AdjustmentsApp.extendedData.adjustment_items.filter(
            item => item.adjustment_id !== AdjustmentsApp.currentAdjustment.id
        );

    formData.products.forEach(product => {
        const newItemId = Math.max(...AdjustmentsApp.extendedData.adjustment_items.map(i => i.id)) + 1;
        
        AdjustmentsApp.extendedData.adjustment_items.push({
            id: newItemId,
            adjustment_id: AdjustmentsApp.currentAdjustment.id,
            product_variant_id: product.variant_id,
            current_quantity: product.current_quantity,
            physical_quantity: product.physical_quantity,
            adjustment_quantity: product.adjustment_quantity,
            reason_detail: product.reason_detail,
            location: product.location
        });
    });
}

function getUploadedFiles() {
    const fileItems = document.querySelectorAll('#uploaded-files-list .file-item');
    return Array.from(fileItems).map(item => {
        const nameElement = item.querySelector('.file-name');
        const sizeElement = item.querySelector('.file-size');
        
        return {
            file_name: nameElement?.textContent || '',
            file_size: parseSizeToBytes(sizeElement?.textContent || '0 Bytes'),
            uploaded_at: new Date().toISOString()
        };
    });
}

function parseSizeToBytes(sizeStr) {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(Bytes|KB|MB)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 'KB': return value * 1024;
        case 'MB': return value * 1024 * 1024;
        default: return value;
    }
}

// ============================================================================
// WORKFLOW DE APROBACIÓN
// ============================================================================

function showAdjustmentDetail(adjustmentId) {
    const adjustment = AdjustmentsApp.extendedData.inventory_adjustments.find(a => a.id === adjustmentId);
    if (!adjustment) return;

    const modal = document.getElementById('adjustment-detail-modal');
    if (!modal) return;

    // Cargar detalles del ajuste
    loadAdjustmentDetailContent(adjustment);
    
    modal.classList.add('show');
}

function loadAdjustmentDetailContent(adjustment) {
    const container = document.getElementById('adjustment-detail-content');
    if (!container) return;

    const reason = getAdjustmentReason(adjustment.reason_id);
    const warehouse = getWarehouse(adjustment.warehouse_id);
    const createdBy = getUser(adjustment.created_by_user_id);
    const approvedBy = adjustment.approved_by_user_id ? getUser(adjustment.approved_by_user_id) : null;
    const items = getAdjustmentItems(adjustment.id);
    const workflow = getAdjustmentWorkflow(adjustment.id);

    container.innerHTML = `
        <div class="adjustment-detail-header">
            <h3>${adjustment.adjustment_number}</h3>
            <span class="adjustment-status status-${adjustment.status.toLowerCase()}">
                ${getStatusText(adjustment.status)}
            </span>
        </div>

        <div class="adjustment-info-grid">
            <div class="info-section">
                <h4>Información General</h4>
                <div class="info-item">
                    <label>Bodega:</label>
                    <span>${warehouse?.warehouse_name || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Causal:</label>
                    <span style="color: ${reason?.color}">${reason?.reason_name || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Fecha:</label>
                    <span>${formatDate(adjustment.adjustment_date)}</span>
                </div>
                <div class="info-item">
                    <label>Creado por:</label>
                    <span>${createdBy?.first_name} ${createdBy?.last_name}</span>
                </div>
                ${approvedBy ? `
                    <div class="info-item">
                        <label>Aprobado por:</label>
                        <span>${approvedBy.first_name} ${approvedBy.last_name}</span>
                    </div>
                ` : ''}
            </div>

            <div class="info-section">
                <h4>Descripción</h4>
                <p>${adjustment.description || 'Sin descripción'}</p>
                
                ${adjustment.supervisor_comments ? `
                    <h4>Comentarios del Supervisor</h4>
                    <p>${adjustment.supervisor_comments}</p>
                ` : ''}

                ${adjustment.evidence_files && adjustment.evidence_files.length > 0 ? `
                    <h4>Archivos de Evidencia</h4>
                    <div class="evidence-files">
                        ${adjustment.evidence_files.map(file => `
                            <div class="evidence-file">
                                ${getFileIcon(file.file_name)} ${file.file_name}
                                <span class="file-size">(${formatFileSize(file.file_size)})</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>

        <div class="adjustment-items-section">
            <h4>Productos Ajustados (${items.length})</h4>
            <table class="adjustment-items-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>SKU</th>
                        <th>Stock Sistema</th>
                        <th>Cantidad Física</th>
                        <th>Diferencia</th>
                        <th>Ubicación</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => createAdjustmentItemRow(item)).join('')}
                </tbody>
            </table>
        </div>

        <div class="workflow-section">
            <h4>Historial del Workflow</h4>
            <div class="workflow-timeline">
                ${workflow.map(step => createWorkflowStep(step)).join('')}
            </div>
        </div>

        ${adjustment.status === 'PENDING' ? `
            <div class="approval-section">
                <h4>Acciones de Aprobación</h4>
                <div class="approval-form">
                    <div class="form-group">
                        <label>Comentarios del Supervisor:</label>
                        <textarea id="supervisor-comments" class="form-control" rows="3" 
                                  placeholder="Ingrese comentarios sobre la aprobación o rechazo..."></textarea>
                    </div>
                    <div class="approval-buttons">
                        <button class="btn btn-success" onclick="approveAdjustment(${adjustment.id})">
                            ✅ Aprobar Ajuste
                        </button>
                        <button class="btn btn-danger" onclick="rejectAdjustment(${adjustment.id})">
                            ❌ Rechazar Ajuste
                        </button>
                    </div>
                </div>
            </div>
        ` : ''}

        ${adjustment.status === 'APPROVED' ? `
            <div class="apply-section">
                <button class="btn btn-primary" onclick="applyAdjustment(${adjustment.id})">
                    🔄 Aplicar al Inventario
                </button>
            </div>
        ` : ''}
    `;
}

function createAdjustmentItemRow(item) {
    const variant = getVariantById(item.product_variant_id);
    const product = getProductByVariantId(item.product_variant_id);
    
    return `
        <tr>
            <td>${product?.product_name || 'N/A'}</td>
            <td>${variant?.variant_sku || 'N/A'}</td>
            <td>${item.current_quantity}</td>
            <td>${item.physical_quantity}</td>
            <td class="adjustment-difference ${getDifferenceClass(item.adjustment_quantity)}">
                ${item.adjustment_quantity > 0 ? '+' : ''}${item.adjustment_quantity}
            </td>
            <td>${item.location}</td>
            <td>${item.reason_detail || '-'}</td>
        </tr>
    `;
}

function createWorkflowStep(step) {
    const user = getUser(step.user_id);
    const stepClass = getWorkflowStepClass(step.action);
    
    return `
        <div class="workflow-step ${stepClass}">
            <div class="step-header">
                <div class="step-title">${step.step_name}</div>
                <div class="step-timestamp">${formatDateTime(step.timestamp)}</div>
            </div>
            <div class="step-user">Por: ${user?.first_name} ${user?.last_name}</div>
            <div class="step-comments">${step.comments}</div>
        </div>
    `;
}

function getWorkflowStepClass(action) {
    switch (action) {
        case 'CREATED': return 'completed';
        case 'SUBMITTED': return 'completed';
        case 'APPROVED': return 'completed';
        case 'APPLIED': return 'completed';
        case 'REJECTED': return 'rejected';
        default: return '';
    }
}

function approveAdjustment(adjustmentId) {
    const comments = document.getElementById('supervisor-comments')?.value || '';
    
    if (!comments.trim()) {
        showError('Debe ingresar comentarios para la aprobación');
        return;
    }

    try {
        // Actualizar estado del ajuste
        const adjustmentIndex = AdjustmentsApp.extendedData.inventory_adjustments.findIndex(a => a.id === adjustmentId);
        if (adjustmentIndex === -1) return;

        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].status = 'APPROVED';
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].approved_by_user_id = getCurrentUserId();
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].approved_at = new Date().toISOString();
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].supervisor_comments = comments;

        // Agregar paso al workflow
        addWorkflowStep(adjustmentId, 'Aprobación', 'APPROVED', comments);

        // Recargar dashboard
        loadAdjustmentsDashboard();
        
        // Cerrar modal
        closeModal('adjustment-detail-modal');

        showSuccess('Ajuste aprobado correctamente');

    } catch (error) {
        console.error('Error aprobando ajuste:', error);
        showError('Error aprobando el ajuste');
    }
}

function rejectAdjustment(adjustmentId) {
    const comments = document.getElementById('supervisor-comments')?.value || '';
    
    if (!comments.trim()) {
        showError('Debe ingresar comentarios para el rechazo');
        return;
    }

    try {
        // Actualizar estado del ajuste
        const adjustmentIndex = AdjustmentsApp.extendedData.inventory_adjustments.findIndex(a => a.id === adjustmentId);
        if (adjustmentIndex === -1) return;

        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].status = 'REJECTED';
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].approved_by_user_id = getCurrentUserId();
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].approved_at = new Date().toISOString();
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].supervisor_comments = comments;

        // Agregar paso al workflow
        addWorkflowStep(adjustmentId, 'Rechazo', 'REJECTED', comments);

        // Recargar dashboard
        loadAdjustmentsDashboard();
        
        // Cerrar modal
        closeModal('adjustment-detail-modal');

        showSuccess('Ajuste rechazado');

    } catch (error) {
        console.error('Error rechazando ajuste:', error);
        showError('Error rechazando el ajuste');
    }
}

function applyAdjustment(adjustmentId) {
    if (!confirm('¿Está seguro de aplicar este ajuste al inventario? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        // Actualizar estado del ajuste
        const adjustmentIndex = AdjustmentsApp.extendedData.inventory_adjustments.findIndex(a => a.id === adjustmentId);
        if (adjustmentIndex === -1) return;

        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].status = 'APPLIED';
        AdjustmentsApp.extendedData.inventory_adjustments[adjustmentIndex].applied_at = new Date().toISOString();

        // Aplicar cambios al stock (simulado)
        const items = getAdjustmentItems(adjustmentId);
        items.forEach(item => {
            updateStockQuantity(item.product_variant_id, item.adjustment_quantity, adjustmentId);
        });

        // Agregar paso al workflow
        addWorkflowStep(adjustmentId, 'Aplicado', 'APPLIED', 'Ajuste aplicado exitosamente al inventario');

        // Recargar dashboard
        loadAdjustmentsDashboard();
        
        // Cerrar modal
        closeModal('adjustment-detail-modal');

        showSuccess('Ajuste aplicado al inventario correctamente');

    } catch (error) {
        console.error('Error aplicando ajuste:', error);
        showError('Error aplicando el ajuste al inventario');
    }
}

function updateStockQuantity(variantId, adjustmentQuantity, adjustmentId) {
    // Actualizar stock en data.json
    const stockIndex = AdjustmentsApp.data.stock.findIndex(s => s.product_variant_id === variantId);
    if (stockIndex !== -1) {
        AdjustmentsApp.data.stock[stockIndex].current_quantity += adjustmentQuantity;
        AdjustmentsApp.data.stock[stockIndex].last_movement_date = new Date().toISOString();
        AdjustmentsApp.data.stock[stockIndex].last_movement_type = 'ADJUSTMENT';
    }

    // Crear movimiento de stock
    const newMovementId = Math.max(...AdjustmentsApp.data.stock_movements.map(m => m.id)) + 1;
    
    AdjustmentsApp.data.stock_movements.push({
        id: newMovementId,
        product_variant_id: variantId,
        warehouse_id: AdjustmentsApp.currentWarehouse,
        warehouse_zone_id: null,
        movement_type: 'ADJUSTMENT',
        reference_type: 'ADJUSTMENT',
        reference_document_id: `AJ-${adjustmentId}`,
        quantity: adjustmentQuantity,
        quantity_before: AdjustmentsApp.data.stock[stockIndex].current_quantity - adjustmentQuantity,
        quantity_after: AdjustmentsApp.data.stock[stockIndex].current_quantity,
        unit_cost: null,
        total_cost: null,
        batch_lot_number: null,
        expiry_date: null,
        serial_number: null,
        notes: `Ajuste de inventario aplicado`,
        created_by_user_id: getCurrentUserId(),
        created_at: new Date().toISOString()
    });
}

function addWorkflowStep(adjustmentId, stepName, action, comments) {
    const newStepId = Math.max(...AdjustmentsApp.extendedData.approval_workflow.map(w => w.adjustment_id * 10 + (w.step || 0))) + 1;
    
    AdjustmentsApp.extendedData.approval_workflow.push({
        adjustment_id: adjustmentId,
        step: AdjustmentsApp.extendedData.approval_workflow.filter(w => w.adjustment_id === adjustmentId).length + 1,
        step_name: stepName,
        user_id: getCurrentUserId(),
        action: action,
        timestamp: new Date().toISOString(),
        comments: comments
    });
}

// ============================================================================
// CONTEOS CÍCLICOS
// ============================================================================

function loadCycleCountsSection() {
    const container = document.getElementById('cycle-counts-container');
    if (!container) return;

    const counts = AdjustmentsApp.extendedData.cycle_counts || [];
    
    if (counts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <h4>No hay conteos programados</h4>
                <p>Los conteos cíclicos aparecerán aquí cuando se programen</p>
                <button class="btn btn-primary" onclick="showCreateCycleCountModal()">
                    📅 Programar Conteo
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="cycle-counts-header">
            <h3>📊 Conteos Cíclicos</h3>
            <button class="btn btn-primary" onclick="showCreateCycleCountModal()">
                📅 Programar Conteo
            </button>
        </div>
        <div class="cycle-counts-grid">
            ${counts.map(count => createCycleCountCard(count)).join('')}
        </div>
    `;
}

function createCycleCountCard(count) {
    const assignedUser = getUser(count.assigned_user_id);
    const warehouse = getWarehouse(count.warehouse_id);
    const zone = count.warehouse_zone_id ? getWarehouseZone(count.warehouse_zone_id) : null;
    const progress = count.total_products > 0 ? (count.counted_products / count.total_products) * 100 : 0;

    return `
        <div class="cycle-count-card" onclick="showCycleCountDetail(${count.id})">
            <div class="count-header">
                <div class="count-code">${count.count_code}</div>
                <div class="count-status ${count.status.toLowerCase().replace('_', '-')}">${getCountStatusText(count.status)}</div>
            </div>
            <div class="count-name">${count.count_name}</div>
            <div class="count-details">
                <div><strong>Bodega:</strong> ${warehouse?.warehouse_name}</div>
                <div><strong>Zona:</strong> ${zone?.zone_name || 'Todas'}</div>
                <div><strong>Fecha:</strong> ${formatDate(count.scheduled_date)}</div>
                <div><strong>Asignado:</strong> ${assignedUser?.first_name} ${assignedUser?.last_name}</div>
                <div><strong>Tipo:</strong> ${getCountTypeText(count.count_type)}</div>
                <div><strong>Productos:</strong> ${count.counted_products}/${count.total_products}</div>
            </div>
            ${count.status !== 'SCHEDULED' ? `
                <div class="count-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-text">${Math.round(progress)}% completado</div>
                </div>
            ` : ''}
            ${count.differences_found > 0 ? `
                <div class="count-differences">
                    ⚠️ ${count.differences_found} diferencias encontradas
                </div>
            ` : ''}
        </div>
    `;
}

function showCreateCycleCountModal() {
    const modal = document.getElementById('cycle-count-modal');
    if (modal) {
        resetCycleCountForm();
        populateCycleCountForm();
        modal.classList.add('show');
    }
}

function resetCycleCountForm() {
    const form = document.getElementById('cycle-count-form');
    if (form) {
        form.reset();
    }

    // Resetear tipo seleccionado
    document.querySelectorAll('.count-type-option').forEach(option => {
        option.classList.remove('selected');
    });
}

function populateCycleCountForm() {
    // Poblar selector de bodega
    const warehouseSelect = document.getElementById('count-warehouse');
    if (warehouseSelect) {
        const warehouses = AdjustmentsApp.data.warehouses || [];
        warehouseSelect.innerHTML = warehouses.map(warehouse => `
            <option value="${warehouse.id}">${warehouse.warehouse_name}</option>
        `).join('');
    }

    // Poblar selector de usuario
    const userSelect = document.getElementById('count-assigned-user');
    if (userSelect) {
        const users = AdjustmentsApp.data.users || [];
        userSelect.innerHTML = users.map(user => `
            <option value="${user.id}">${user.first_name} ${user.last_name}</option>
        `).join('');
    }

    // Fecha mínima es hoy
    const dateInput = document.getElementById('count-scheduled-date');
    if (dateInput) {
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

function selectCountType(type) {
    // Actualizar UI
    document.querySelectorAll('.count-type-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.type === type);
    });

    // Mostrar/ocultar campos según tipo
    const zoneSelect = document.getElementById('count-zone');
    const productSelect = document.getElementById('count-products');
    
    if (zoneSelect) {
        zoneSelect.style.display = (type === 'ZONE' || type === 'SPECIFIC') ? 'block' : 'none';
    }
    
    if (productSelect) {
        productSelect.style.display = type === 'SPECIFIC' ? 'block' : 'none';
    }
}

function saveCycleCount() {
    const formData = getCycleCountFormData();
    
    if (!validateCycleCountForm(formData)) {
        return;
    }

    try {
        createNewCycleCount(formData);
        closeModal('cycle-count-modal');
        loadCycleCountsSection();
        showSuccess('Conteo cíclico programado correctamente');

    } catch (error) {
        console.error('Error guardando conteo cíclico:', error);
        showError('Error programando el conteo cíclico');
    }
}

function getCycleCountFormData() {
    const selectedType = document.querySelector('.count-type-option.selected');
    
    return {
        warehouse_id: parseInt(document.getElementById('count-warehouse')?.value),
        warehouse_zone_id: document.getElementById('count-zone')?.value || null,
        assigned_user_id: parseInt(document.getElementById('count-assigned-user')?.value),
        count_type: selectedType?.dataset.type || null,
        scheduled_date: document.getElementById('count-scheduled-date')?.value,
        count_name: document.getElementById('count-name')?.value || '',
        notes: document.getElementById('count-notes')?.value || ''
    };
}

function validateCycleCountForm(formData) {
    if (!formData.warehouse_id) {
        showError('Debe seleccionar una bodega');
        return false;
    }

    if (!formData.assigned_user_id) {
        showError('Debe asignar un usuario responsable');
        return false;
    }

    if (!formData.count_type) {
        showError('Debe seleccionar un tipo de conteo');
        return false;
    }

    if (!formData.scheduled_date) {
        showError('Debe especificar la fecha del conteo');
        return false;
    }

    if (!formData.count_name.trim()) {
        showError('Debe ingresar un nombre para el conteo');
        return false;
    }

    return true;
}

function createNewCycleCount(formData) {
    const newId = Math.max(...AdjustmentsApp.extendedData.cycle_counts.map(c => c.id)) + 1;
    const countCode = `CC-2024-${String(newId).padStart(3, '0')}`;

    const newCycleCount = {
        id: newId,
        count_code: countCode,
        count_name: formData.count_name,
        warehouse_id: formData.warehouse_id,
        warehouse_zone_id: formData.warehouse_zone_id,
        scheduled_date: formData.scheduled_date,
        assigned_user_id: formData.assigned_user_id,
        count_type: formData.count_type,
        status: 'SCHEDULED',
        created_by_user_id: getCurrentUserId(),
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        notes: formData.notes,
        total_products: calculateProductsForCount(formData),
        counted_products: 0,
        differences_found: 0
    };

    AdjustmentsApp.extendedData.cycle_counts.push(newCycleCount);
}

function calculateProductsForCount(formData) {
    // Simulación del cálculo de productos según tipo
    switch (formData.count_type) {
        case 'FULL':
            return AdjustmentsApp.data.stock.filter(s => s.warehouse_id === formData.warehouse_id).length;
        case 'ZONE':
            return AdjustmentsApp.data.stock.filter(s => 
                s.warehouse_id === formData.warehouse_id && 
                s.warehouse_zone_id === parseInt(formData.warehouse_zone_id)
            ).length;
        case 'SPECIFIC':
            return 5; // Simulado
        case 'RANDOM':
            return Math.floor(Math.random() * 20) + 5; // Entre 5 y 25 productos
        default:
            return 0;
    }
}

// ============================================================================
// REPORTES Y ESTADÍSTICAS
// ============================================================================

// function loadReportsSection() {
//     const container = document.getElementById('reports-container');
//     if (!container) return;

//     const statistics = AdjustmentsApp.extendedData.adjustment_statistics || [];
//     const currentPeriod = statistics.find(s => s.period === '2024-07') || {};

//     container.innerHTML = `
//         <div class="reports-header">
//             <h3>📊 Reportes y Estadísticas</h3>
//             <div class="reports-actions">
//                 <button class="btn btn-secondary" onclick="exportAdjustmentsReport()">
//                     📊 Exportar