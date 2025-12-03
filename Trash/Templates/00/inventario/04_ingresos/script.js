/**
 * Ingreso Manual de Mercadería - Sistema de Control de Stock
 * Funcionalidad completa para adición manual de existencias
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let IngresoApp = {
    data: {},
    dataExtend: {},
    currentWarehouse: 1,
    selectedProduct: null,
    pendingItems: [],
    documentNumber: null,
    isLoading: false
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Módulo de Ingreso de Mercadería');
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingState();

        // Cargar datos
        await loadData();
        await loadExtendedData();

        // Inicializar componentes
        initializeWarehouseSelector();
        initializeProductSearch();
        initializeItemForm();
        initializeEventListeners();

        // Generar número de documento
        generateDocumentNumber();

        // Cargar componentes de la UI
        loadRecentHistory();
        updateSummary();

        hideLoadingState();

        console.log('✅ Módulo de Ingreso inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando módulo:', error);
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

        IngresoApp.data = await response.json();
        console.log('📊 Datos principales cargados');

    } catch (error) {
        console.error('❌ Error cargando data.json:', error);
        throw error;
    }
}

async function loadExtendedData() {
    try {
        const response = await fetch('data_extend.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        IngresoApp.dataExtend = await response.json();
        console.log('📊 Datos extendidos cargados');

    } catch (error) {
        console.error('❌ Error cargando data_extend.json:', error);
        throw error;
    }
}

// ============================================================================
// GESTIÓN DE BODEGAS
// ============================================================================

function initializeWarehouseSelector() {
    const warehouseSelect = document.getElementById('warehouse-select');
    if (!warehouseSelect) return;

    // Limpiar opciones existentes
    warehouseSelect.innerHTML = '<option value="">Seleccionar bodega...</option>';

    // Agregar bodegas activas
    IngresoApp.data.warehouses.forEach(warehouse => {
        if (warehouse.is_active) {
            const option = document.createElement('option');
            option.value = warehouse.id;
            option.textContent = `${warehouse.warehouse_name} - ${warehouse.city}`;
            
            if (warehouse.id === IngresoApp.currentWarehouse) {
                option.selected = true;
            }
            
            warehouseSelect.appendChild(option);
        }
    });

    // Event listener para cambio de bodega
    warehouseSelect.addEventListener('change', (e) => {
        IngresoApp.currentWarehouse = parseInt(e.target.value) || null;
        updateSummary();
    });
}

function getCurrentWarehouse() {
    return IngresoApp.data.warehouses.find(w => w.id === IngresoApp.currentWarehouse);
}

// ============================================================================
// GENERACIÓN DE NÚMERO DE DOCUMENTO
// ============================================================================

function generateDocumentNumber() {
    const config = IngresoApp.dataExtend.ingreso_mercaderia_config;
    const currentNumber = config.current_number + 1;
    const docNumber = `${config.document_prefix}-${currentNumber.toString().padStart(6, '0')}`;
    
    IngresoApp.documentNumber = docNumber;
    
    // Actualizar UI
    const docNumberElement = document.getElementById('document-number');
    if (docNumberElement) {
        docNumberElement.textContent = docNumber;
    }

    const docDateElement = document.getElementById('document-date');
    if (docDateElement) {
        const now = new Date();
        docDateElement.textContent = `${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL')}`;
    }
}

// ============================================================================
// BÚSQUEDA DE PRODUCTOS
// ============================================================================

function initializeProductSearch() {
    const searchButton = document.getElementById('btn-search-product');
    const searchInput = document.getElementById('product-search-input');
    
    if (searchButton) {
        searchButton.addEventListener('click', showProductSearchModal);
    }

    if (searchInput) {
        // Permitir búsqueda directa por código
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchProductByCode(e.target.value.trim());
            }
        });

        searchInput.addEventListener('blur', (e) => {
            const code = e.target.value.trim();
            if (code) {
                searchProductByCode(code);
            }
        });
    }
}

function searchProductByCode(code) {
    if (!code) return;

    console.log(`🔍 Buscando producto por código: ${code}`);

    // Buscar en variantes por SKU
    const variant = IngresoApp.data.product_variants.find(v => 
        v.variant_sku.toLowerCase() === code.toLowerCase() && v.is_active
    );

    if (variant) {
        const product = getProductById(variant.product_id);
        if (product && product.is_active) {
            selectProduct(variant, product);
            return;
        }
    }

    // Buscar en productos por código
    const product = IngresoApp.data.products.find(p => 
        p.product_code.toLowerCase() === code.toLowerCase() && p.is_active
    );

    if (product) {
        // Si tiene variantes, tomar la variante por defecto
        if (product.has_variants) {
            const defaultVariant = IngresoApp.data.product_variants.find(v => 
                v.product_id === product.id && v.is_default_variant && v.is_active
            );
            if (defaultVariant) {
                selectProduct(defaultVariant, product);
                return;
            }
        } else {
            // Buscar la única variante
            const singleVariant = IngresoApp.data.product_variants.find(v => 
                v.product_id === product.id && v.is_active
            );
            if (singleVariant) {
                selectProduct(singleVariant, product);
                return;
            }
        }
    }

    // No encontrado
    showError(`Producto con código "${code}" no encontrado`);
    clearProductSearch();
}

function showProductSearchModal() {
    const modalHTML = createProductSearchModal();
    showModal('Buscar Producto', modalHTML, 'product-search-modal');

    // Inicializar búsqueda en modal
    setTimeout(() => {
        initializeModalSearch();
        loadProductsInModal();
    }, 100);
}

function createProductSearchModal() {
    return `
        <div class="search-form-section">
            <div class="search-form-row">
                <div class="form-group">
                    <label for="modal-search-input">Buscar producto</label>
                    <input type="text" id="modal-search-input" class="form-control" 
                           placeholder="Código, nombre, marca..." autofocus>
                </div>
                <button type="button" class="btn btn-primary" id="modal-search-btn">
                    🔍 Buscar
                </button>
            </div>
        </div>
        
        <div class="search-stats" id="search-stats">
            <span>Mostrando productos activos</span>
            <span id="products-count">0 productos</span>
        </div>
        
        <div class="products-grid" id="products-grid">
            <!-- Los productos se cargan dinámicamente -->
        </div>
    `;
}

function initializeModalSearch() {
    const searchBtn = document.getElementById('modal-search-btn');
    const searchInput = document.getElementById('modal-search-input');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            searchProductsInModal(query);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                searchProductsInModal(query);
            }
        });
    }
}

function loadProductsInModal(searchQuery = '') {
    const grid = document.getElementById('products-grid');
    const statsElement = document.getElementById('products-count');
    
    if (!grid) return;

    // Filtrar productos activos
    let products = IngresoApp.data.products.filter(p => p.is_active);

    // Aplicar filtro de búsqueda si existe
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        products = products.filter(p => 
            p.product_name.toLowerCase().includes(query) ||
            p.product_code.toLowerCase().includes(query) ||
            (p.brand && p.brand.toLowerCase().includes(query))
        );
    }

    // Actualizar contador
    if (statsElement) {
        statsElement.textContent = `${products.length} productos`;
    }

    // Generar HTML de productos
    grid.innerHTML = products.map(product => createProductCard(product)).join('');

    // Agregar event listeners
    grid.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', () => {
            const productId = parseInt(card.dataset.productId);
            const variantId = parseInt(card.dataset.variantId);
            
            const product = getProductById(productId);
            const variant = getVariantById(variantId);
            
            if (product && variant) {
                selectProduct(variant, product);
                closeModal('generic-modal');
            }
        });
    });
}

function createProductCard(product) {
    // Buscar variante principal
    let variant = null;
    if (product.has_variants) {
        variant = IngresoApp.data.product_variants.find(v => 
            v.product_id === product.id && v.is_default_variant && v.is_active
        );
    }
    
    if (!variant) {
        variant = IngresoApp.data.product_variants.find(v => 
            v.product_id === product.id && v.is_active
        );
    }

    if (!variant) return '';

    // Obtener stock actual
    const stock = getStockForVariant(variant.id, IngresoApp.currentWarehouse);
    const currentQty = stock ? stock.current_quantity : 0;
    
    let stockBadge = '';
    let stockClass = '';
    
    if (currentQty === 0) {
        stockBadge = '<span class="stock-badge stock-out">Sin Stock</span>';
        stockClass = 'stock-out';
    } else if (currentQty <= (stock?.minimum_stock || 0)) {
        stockBadge = '<span class="stock-badge stock-low">Stock Bajo</span>';
        stockClass = 'stock-low';
    } else {
        stockBadge = '<span class="stock-badge stock-ok">Disponible</span>';
        stockClass = 'stock-ok';
    }

    return `
        <div class="product-card" data-product-id="${product.id}" data-variant-id="${variant.id}">
            <div class="product-card-header">
                <span class="product-sku-badge">${variant.variant_sku}</span>
                ${stockBadge}
            </div>
            <div class="product-card-title">${product.product_name}</div>
            <div class="product-card-details">
                <div>Marca: ${product.brand || 'N/A'}</div>
                <div>Modelo: ${product.model || 'N/A'}</div>
                <div>Variante: ${variant.variant_name}</div>
            </div>
            <div class="product-stock-info">
                <span>Stock actual:</span>
                <span class="current-stock ${stockClass}">${formatNumber(currentQty)}</span>
            </div>
        </div>
    `;
}

function searchProductsInModal(query) {
    loadProductsInModal(query);
}

function selectProduct(variant, product) {
    IngresoApp.selectedProduct = { variant, product };
    
    // Actualizar input de búsqueda
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = variant.variant_sku;
    }

    // Mostrar preview
    showProductPreview(variant, product);
    
    // Habilitar formulario de cantidad
    enableQuantityForm();
    
    console.log('✅ Producto seleccionado:', product.product_name, variant.variant_name);
}

function showProductPreview(variant, product) {
    const previewContainer = document.getElementById('selected-product-preview');
    if (!previewContainer) return;

    const stock = getStockForVariant(variant.id, IngresoApp.currentWarehouse);
    const currentQty = stock ? stock.current_quantity : 0;
    const warehouse = getCurrentWarehouse();

    previewContainer.innerHTML = `
        <div class="preview-header">
            <h4 class="preview-product-name">${product.product_name}</h4>
            <span class="preview-sku">${variant.variant_sku}</span>
        </div>
        <div class="preview-details">
            <div class="preview-detail-item">
                <span class="preview-detail-label">Variante:</span>
                <span>${variant.variant_name}</span>
            </div>
            <div class="preview-detail-item">
                <span class="preview-detail-label">Marca:</span>
                <span>${product.brand || 'N/A'}</span>
            </div>
            <div class="preview-detail-item">
                <span class="preview-detail-label">Stock Actual:</span>
                <span class="text-primary font-weight-bold">${formatNumber(currentQty)}</span>
            </div>
            <div class="preview-detail-item">
                <span class="preview-detail-label">Bodega:</span>
                <span>${warehouse ? warehouse.warehouse_name : 'No seleccionada'}</span>
            </div>
        </div>
    `;

    previewContainer.classList.add('show');
}

function clearProductSearch() {
    IngresoApp.selectedProduct = null;
    
    const searchInput = document.getElementById('product-search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    const previewContainer = document.getElementById('selected-product-preview');
    if (previewContainer) {
        previewContainer.classList.remove('show');
    }

    disableQuantityForm();
}

// ============================================================================
// FORMULARIO DE ITEMS
// ============================================================================

function initializeItemForm() {
    const addButton = document.getElementById('btn-add-item');
    const quantityInput = document.getElementById('quantity-input');
    const motivoSelect = document.getElementById('motivo-select');
    const justificationTextarea = document.getElementById('justification-textarea');

    // Cargar motivos en el select
    loadMotivosSelect();

    if (addButton) {
        addButton.addEventListener('click', addItemToPending);
    }

    if (quantityInput) {
        quantityInput.addEventListener('input', validateQuantityInput);
        quantityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addItemToPending();
            }
        });
    }

    if (motivoSelect) {
        motivoSelect.addEventListener('change', updateJustificationTemplate);
    }

    // Inicialmente deshabilitado
    disableQuantityForm();
}

function loadMotivosSelect() {
    const select = document.getElementById('motivo-select');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccionar motivo...</option>';

    IngresoApp.dataExtend.motivos_ingreso.forEach(motivo => {
        if (motivo.es_activo) {
            const option = document.createElement('option');
            option.value = motivo.id;
            option.textContent = motivo.nombre;
            option.title = motivo.descripcion;
            select.appendChild(option);
        }
    });
}

function updateJustificationTemplate() {
    const motivoSelect = document.getElementById('motivo-select');
    const justificationTextarea = document.getElementById('justification-textarea');
    
    if (!motivoSelect || !justificationTextarea) return;

    const motivoId = parseInt(motivoSelect.value);
    if (!motivoId) {
        justificationTextarea.value = '';
        return;
    }

    const template = IngresoApp.dataExtend.templates_justificacion.find(t => t.motivo_id === motivoId);
    if (template) {
        let text = template.template;
        
        // Reemplazar variables básicas
        const now = new Date();
        text = text.replace('{fecha}', now.toLocaleDateString('es-CL'));
        text = text.replace('{usuario}', 'Juan Pérez'); // Usuario actual
        
        justificationTextarea.value = text;
    }
}

function enableQuantityForm() {
    const elements = [
        'quantity-input',
        'motivo-select', 
        'justification-textarea',
        'btn-add-item'
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = false;
        }
    });

    // Focus en cantidad
    const quantityInput = document.getElementById('quantity-input');
    if (quantityInput) {
        quantityInput.focus();
        quantityInput.select();
    }
}

function disableQuantityForm() {
    const elements = [
        'quantity-input',
        'motivo-select', 
        'justification-textarea',
        'btn-add-item'
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = true;
        }
    });

    // Limpiar valores
    const quantityInput = document.getElementById('quantity-input');
    const motivoSelect = document.getElementById('motivo-select');
    const justificationTextarea = document.getElementById('justification-textarea');

    if (quantityInput) quantityInput.value = '';
    if (motivoSelect) motivoSelect.value = '';
    if (justificationTextarea) justificationTextarea.value = '';
}

function validateQuantityInput() {
    const input = document.getElementById('quantity-input');
    const addButton = document.getElementById('btn-add-item');
    
    if (!input || !addButton) return;

    const value = parseFloat(input.value);
    const config = IngresoApp.dataExtend.validaciones;
    
    let isValid = true;
    
    if (isNaN(value) || value < config.cantidad_minima || value > config.cantidad_maxima) {
        isValid = false;
    }

    addButton.disabled = !isValid || !IngresoApp.selectedProduct;
    
    // Cambiar estilo del input
    if (input.value && !isValid) {
        input.classList.add('error-input');
    } else {
        input.classList.remove('error-input');
    }
}

function addItemToPending() {
    if (!validateItemForm()) return;

    const quantityInput = document.getElementById('quantity-input');
    const motivoSelect = document.getElementById('motivo-select');
    const justificationTextarea = document.getElementById('justification-textarea');

    const quantity = parseFloat(quantityInput.value);
    const motivoId = parseInt(motivoSelect.value);
    const justification = justificationTextarea.value.trim();

    const motivo = IngresoApp.dataExtend.motivos_ingreso.find(m => m.id === motivoId);
    
    // Crear item
    const item = {
        id: Date.now(), // ID temporal
        product_variant_id: IngresoApp.selectedProduct.variant.id,
        product: IngresoApp.selectedProduct.product,
        variant: IngresoApp.selectedProduct.variant,
        quantity: quantity,
        motivo: motivo,
        justification: justification,
        warehouse_id: IngresoApp.currentWarehouse,
        added_at: new Date()
    };

    // Agregar a pendientes
    IngresoApp.pendingItems.push(item);

    // Actualizar UI
    updateItemsTable();
    updateSummary();
    
    // Limpiar formulario
    clearItemForm();
    
    showSuccess(`Item agregado: ${item.product.product_name} (+${formatNumber(quantity)})`);
    
    console.log('✅ Item agregado a pendientes:', item);
}

function validateItemForm() {
    if (!IngresoApp.selectedProduct) {
        showError('Debe seleccionar un producto');
        return false;
    }

    if (!IngresoApp.currentWarehouse) {
        showError('Debe seleccionar una bodega de destino');
        return false;
    }

    const quantityInput = document.getElementById('quantity-input');
    const motivoSelect = document.getElementById('motivo-select');
    const justificationTextarea = document.getElementById('justification-textarea');

    const quantity = parseFloat(quantityInput.value);
    const motivoId = parseInt(motivoSelect.value);
    const justification = justificationTextarea.value.trim();

    const config = IngresoApp.dataExtend.validaciones;

    if (isNaN(quantity) || quantity < config.cantidad_minima || quantity > config.cantidad_maxima) {
        showError(`La cantidad debe estar entre ${config.cantidad_minima} y ${formatNumber(config.cantidad_maxima)}`);
        return false;
    }

    if (!motivoId) {
        showError('Debe seleccionar un motivo de ingreso');
        return false;
    }

    if (justification.length < config.justificacion_min_chars) {
        showError(`La justificación debe tener al menos ${config.justificacion_min_chars} caracteres`);
        return false;
    }

    if (justification.length > config.justificacion_max_chars) {
        showError(`La justificación no puede exceder ${config.justificacion_max_chars} caracteres`);
        return false;
    }

    return true;
}

function clearItemForm() {
    disableQuantityForm();
    clearProductSearch();
}

// ============================================================================
// TABLA DE ITEMS PENDIENTES
// ============================================================================

function updateItemsTable() {
    const tableBody = document.getElementById('items-table-body');
    const itemsCounter = document.getElementById('items-counter');
    
    if (!tableBody) return;

    if (IngresoApp.pendingItems.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-items">
                    <div class="empty-items-icon">📦</div>
                    <h4>No hay items pendientes</h4>
                    <p>Agregue productos para crear el ingreso de mercadería</p>
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = IngresoApp.pendingItems.map((item, index) => createItemRow(item, index)).join('');
        
        // Agregar event listeners para eliminar
        tableBody.querySelectorAll('.btn-remove-item').forEach((btn, index) => {
            btn.addEventListener('click', () => removeItemFromPending(index));
        });
    }

    // Actualizar contador
    if (itemsCounter) {
        itemsCounter.textContent = IngresoApp.pendingItems.length;
    }
}

function createItemRow(item, index) {
    const timeAgo = getTimeAgo(item.added_at);
    
    return `
        <tr class="new-item">
            <td class="product-info-cell">
                <div class="product-name-link">${item.product.product_name}</div>
                <div class="product-details-line">
                    <span>SKU: ${item.variant.variant_sku}</span>
                    <span>Marca: ${item.product.brand || 'N/A'}</span>
                    <span>Variante: ${item.variant.variant_name}</span>
                </div>
            </td>
            <td class="quantity-cell">
                <span class="quantity-badge">+${formatNumber(item.quantity)}</span>
            </td>
            <td class="motivo-cell">
                <div class="motivo-nombre">${item.motivo.nombre}</div>
                <div class="justificacion-text" title="${item.justification}">
                    ${item.justification}
                </div>
            </td>
            <td class="text-center text-muted" style="font-size: 0.85em;">
                ${timeAgo}
            </td>
            <td class="actions-cell">
                <button type="button" class="btn-remove-item" title="Eliminar item">
                    ×
                </button>
            </td>
        </tr>
    `;
}

function removeItemFromPending(index) {
    if (index < 0 || index >= IngresoApp.pendingItems.length) return;

    const item = IngresoApp.pendingItems[index];
    
    // Confirmar eliminación
    if (confirm(`¿Eliminar "${item.product.product_name}" de la lista?`)) {
        IngresoApp.pendingItems.splice(index, 1);
        updateItemsTable();
        updateSummary();
        
        showSuccess('Item eliminado de la lista');
        console.log('🗑️ Item eliminado:', item.product.product_name);
    }
}

// ============================================================================
// PANEL DE RESUMEN
// ============================================================================

function updateSummary() {
    const warehouse = getCurrentWarehouse();
    const totalItems = IngresoApp.pendingItems.length;
    const totalQuantity = IngresoApp.pendingItems.reduce((sum, item) => sum + item.quantity, 0);

    // Actualizar elementos del resumen
    updateSummaryElement('summary-warehouse', warehouse ? warehouse.warehouse_name : 'No seleccionada');
    updateSummaryElement('summary-document', IngresoApp.documentNumber || 'Generando...');
    updateSummaryElement('summary-total-items', totalItems);
    updateSummaryElement('summary-total-quantity', formatNumber(totalQuantity));

    // Habilitar/deshabilitar botón de procesar
    const processButton = document.getElementById('btn-process-ingreso');
    if (processButton) {
        processButton.disabled = totalItems === 0 || !IngresoApp.currentWarehouse;
    }
}

function updateSummaryElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// ============================================================================
// PROCESAMIENTO DE INGRESO
// ============================================================================

function initializeEventListeners() {
    // Botón procesar ingreso
    const processButton = document.getElementById('btn-process-ingreso');
    if (processButton) {
        processButton.addEventListener('click', showConfirmationModal);
    }

    // Botón limpiar todo
    const clearButton = document.getElementById('btn-clear-all');
    if (clearButton) {
        clearButton.addEventListener('click', clearAllItems);
    }

    // Botón ver historial
    const historyButton = document.getElementById('btn-view-history');
    if (historyButton) {
        historyButton.addEventListener('click', showHistoryModal);
    }
}

function showConfirmationModal() {
    if (IngresoApp.pendingItems.length === 0) {
        showError('No hay items para procesar');
        return;
    }

    if (!IngresoApp.currentWarehouse) {
        showError('Debe seleccionar una bodega de destino');
        return;
    }

    const warehouse = getCurrentWarehouse();
    const totalItems = IngresoApp.pendingItems.length;
    const totalQuantity = IngresoApp.pendingItems.reduce((sum, item) => sum + item.quantity, 0);

    const modalContent = `
        <div class="confirmation-summary">
            <h4>Confirmar Ingreso de Mercadería</h4>
            <div class="confirmation-details">
                <div class="confirmation-detail">
                    <div class="confirmation-value">${totalItems}</div>
                    <div class="confirmation-label">Items</div>
                </div>
                <div class="confirmation-detail">
                    <div class="confirmation-value">${formatNumber(totalQuantity)}</div>
                    <div class="confirmation-label">Cantidad Total</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                <strong>Bodega de Destino:</strong> ${warehouse.warehouse_name}<br>
                <strong>Documento:</strong> ${IngresoApp.documentNumber}
            </div>
        </div>
        
        <div class="alert-banner">
            <span class="alert-icon">⚠️</span>
            <div>
                Esta acción agregará las cantidades especificadas al inventario. 
                Esta operación no se puede deshacer automáticamente.
            </div>
        </div>
        
        <div class="confirmation-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal('generic-modal')">
                Cancelar
            </button>
            <button type="button" class="btn btn-success" onclick="processIngreso()">
                ✅ Confirmar Ingreso
            </button>
        </div>
    `;

    showModal('Confirmar Ingreso', modalContent, 'confirmation-modal');
}

function processIngreso() {
    if (IngresoApp.isLoading) return;

    console.log('🔄 Procesando ingreso de mercadería...');
    
    IngresoApp.isLoading = true;
    showLoadingOverlay('Procesando ingreso de mercadería...');

    // Cerrar modal de confirmación
    closeModal('generic-modal');

    // Simular procesamiento
    setTimeout(() => {
        try {
            // Simular actualización de stock
            IngresoApp.pendingItems.forEach(item => {
                updateStockForItem(item);
                createStockMovement(item);
            });

            // Simular guardado de documento
            const ingresoDocument = createIngresoDocument();
            console.log('📄 Documento creado:', ingresoDocument);

            // Limpiar datos
            clearAllData();

            // Mostrar éxito
            hideLoadingOverlay();
            showSuccessMessage();

            // Actualizar UI
            updateSummary();
            updateItemsTable();
            generateDocumentNumber();
            loadRecentHistory();

        } catch (error) {
            console.error('❌ Error procesando ingreso:', error);
            hideLoadingOverlay();
            showError('Error procesando el ingreso. Inténtelo nuevamente.');
        } finally {
            IngresoApp.isLoading = false;
        }
    }, 2000); // Simular delay de procesamiento
}

function updateStockForItem(item) {
    // Buscar stock existente
    let stock = IngresoApp.data.stock.find(s => 
        s.product_variant_id === item.variant.id && 
        s.warehouse_id === item.warehouse_id
    );

    if (stock) {
        // Actualizar stock existente
        stock.current_quantity += item.quantity;
        stock.last_movement_date = new Date().toISOString();
        stock.last_movement_type = 'IN';
    } else {
        // Crear nuevo registro de stock
        const newStock = {
            id: IngresoApp.data.stock.length + 1,
            product_variant_id: item.variant.id,
            warehouse_id: item.warehouse_id,
            warehouse_zone_id: null,
            current_quantity: item.quantity,
            reserved_quantity: 0,
            minimum_stock: 10, // Valor por defecto
            maximum_stock: 100, // Valor por defecto
            last_movement_date: new Date().toISOString(),
            last_movement_type: 'IN',
            rotation_category: 'MEDIUM',
            last_sale_date: null,
            avg_monthly_sales: 0
        };
        
        IngresoApp.data.stock.push(newStock);
    }

    console.log(`📦 Stock actualizado para ${item.variant.variant_sku}: +${item.quantity}`);
}

function createStockMovement(item) {
    const movement = {
        id: IngresoApp.data.stock_movements.length + 1,
        product_variant_id: item.variant.id,
        warehouse_id: item.warehouse_id,
        warehouse_zone_id: null,
        movement_type: 'IN',
        reference_type: 'ADJUSTMENT',
        reference_document_id: IngresoApp.documentNumber,
        quantity: item.quantity,
        quantity_before: getCurrentStockQuantity(item.variant.id, item.warehouse_id) - item.quantity,
        quantity_after: getCurrentStockQuantity(item.variant.id, item.warehouse_id),
        unit_cost: null,
        total_cost: null,
        batch_lot_number: null,
        expiry_date: null,
        serial_number: null,
        notes: `${item.motivo.nombre}: ${item.justification}`,
        created_by_user_id: 1, // Usuario actual
        created_at: new Date().toISOString()
    };

    IngresoApp.data.stock_movements.push(movement);
    console.log('📝 Movimiento de stock creado:', movement);
}

function createIngresoDocument() {
    const warehouse = getCurrentWarehouse();
    const totalItems = IngresoApp.pendingItems.length;
    const totalQuantity = IngresoApp.pendingItems.reduce((sum, item) => sum + item.quantity, 0);

    const document = {
        numero_documento: IngresoApp.documentNumber,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('es-CL'),
        bodega_id: IngresoApp.currentWarehouse,
        bodega_nombre: warehouse.warehouse_name,
        usuario: 'Juan Pérez', // Usuario actual
        total_items: totalItems,
        total_cantidad: totalQuantity,
        items: IngresoApp.pendingItems.map(item => ({
            product_variant_id: item.variant.id,
            product_name: item.product.product_name,
            variant_sku: item.variant.variant_sku,
            quantity: item.quantity,
            motivo: item.motivo.nombre,
            justification: item.justification
        })),
        estado: 'PROCESADO',
        created_at: new Date().toISOString()
    };

    // Agregar al historial simulado
    IngresoApp.dataExtend.ingresos_recientes.unshift(document);
    
    // Mantener solo los últimos 10
    if (IngresoApp.dataExtend.ingresos_recientes.length > 10) {
        IngresoApp.dataExtend.ingresos_recientes = IngresoApp.dataExtend.ingresos_recientes.slice(0, 10);
    }

    return document;
}

function getCurrentStockQuantity(variantId, warehouseId) {
    const stock = IngresoApp.data.stock.find(s => 
        s.product_variant_id === variantId && 
        s.warehouse_id === warehouseId
    );
    return stock ? stock.current_quantity : 0;
}

function clearAllData() {
    IngresoApp.pendingItems = [];
    IngresoApp.selectedProduct = null;
    clearProductSearch();
}

function showSuccessMessage() {
    const warehouse = getCurrentWarehouse();
    const successHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 4em; color: #28a745; margin-bottom: 20px;">✅</div>
            <h3 style="color: #28a745; margin-bottom: 15px;">Ingreso Procesado Exitosamente</h3>
            <p style="margin-bottom: 20px;">
                El ingreso <strong>${IngresoApp.documentNumber}</strong> ha sido procesado correctamente en 
                <strong>${warehouse.warehouse_name}</strong>.
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="font-size: 0.9em; color: #6c757d;">
                    Los movimientos de stock han sido registrados y el inventario actualizado.
                </div>
            </div>
            <button type="button" class="btn btn-primary" onclick="closeModal('generic-modal')">
                Continuar
            </button>
        </div>
    `;

    showModal('Ingreso Completado', successHTML, 'success-modal');
}

function clearAllItems() {
    if (IngresoApp.pendingItems.length === 0) {
        showInfo('No hay items para limpiar');
        return;
    }

    if (confirm('¿Eliminar todos los items de la lista? Esta acción no se puede deshacer.')) {
        clearAllData();
        updateItemsTable();
        updateSummary();
        showSuccess('Lista limpiada correctamente');
        console.log('🧹 Todos los items eliminados');
    }
}

// ============================================================================
// HISTORIAL DE INGRESOS
// ============================================================================

function loadRecentHistory() {
    const historyContainer = document.getElementById('recent-history-list');
    if (!historyContainer) return;

    const recentIngresos = IngresoApp.dataExtend.ingresos_recientes.slice(0, 5);

    if (recentIngresos.length === 0) {
        historyContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <div style="font-size: 2em; margin-bottom: 10px;">📝</div>
                <div>No hay ingresos recientes</div>
            </div>
        `;
        return;
    }

    historyContainer.innerHTML = recentIngresos.map(ingreso => createHistoryItem(ingreso)).join('');
}

function createHistoryItem(ingreso) {
    const timeAgo = getTimeAgo(ingreso.fecha + 'T' + ingreso.hora);
    
    return `
        <div class="history-item">
            <div class="history-header">
                <span class="history-document">${ingreso.numero_documento}</span>
                <span class="history-date">${timeAgo}</span>
            </div>
            <div class="history-details">
                <span class="history-user">${ingreso.usuario}</span>
                <span class="history-stats">${ingreso.total_items} items, ${formatNumber(ingreso.total_cantidad)} unidades</span>
            </div>
        </div>
    `;
}

function showHistoryModal() {
    const historialHTML = createHistoryModalContent();
    showModal('Historial de Ingresos', historialHTML, 'history-modal');
}

function createHistoryModalContent() {
    const ingresos = IngresoApp.dataExtend.ingresos_recientes;

    if (ingresos.length === 0) {
        return `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 3em; margin-bottom: 20px; opacity: 0.5;">📝</div>
                <h4>No hay ingresos registrados</h4>
                <p>Los ingresos de mercadería aparecerán aquí una vez procesados.</p>
            </div>
        `;
    }

    return `
        <div style="max-height: 500px; overflow-y: auto;">
            <table class="table" style="margin: 0;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th>Documento</th>
                        <th>Fecha</th>
                        <th>Bodega</th>
                        <th>Usuario</th>
                        <th>Items</th>
                        <th>Cantidad</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${ingresos.map(ingreso => `
                        <tr>
                            <td><strong>${ingreso.numero_documento}</strong></td>
                            <td>${formatDate(ingreso.fecha)}<br><small>${ingreso.hora}</small></td>
                            <td>${ingreso.bodega_nombre}</td>
                            <td>${ingreso.usuario}</td>
                            <td style="text-align: center;">${ingreso.total_items}</td>
                            <td style="text-align: center;">${formatNumber(ingreso.total_cantidad)}</td>
                            <td>
                                <span class="badge badge-success" style="background: #28a745; color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8em;">
                                    ${ingreso.estado}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function getProductById(productId) {
    return IngresoApp.data.products.find(p => p.id === productId);
}

function getVariantById(variantId) {
    return IngresoApp.data.product_variants.find(v => v.id === variantId);
}

function getStockForVariant(variantId, warehouseId) {
    return IngresoApp.data.stock.find(s => 
        s.product_variant_id === variantId && 
        s.warehouse_id === warehouseId
    );
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-CL').format(num);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
}

// ============================================================================
// SISTEMA DE MODALES
// ============================================================================

function showModal(title, content, modalClass = '') {
    // Crear modal si no existe
    let modal = document.getElementById('generic-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    if (modalClass) {
        modal.className = `modal ${modalClass}`;
    }

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
// SISTEMA DE NOTIFICACIONES
// ============================================================================

function showSuccess(message) {
    showToast('success', '✅ Éxito', message);
}

function showError(message) {
    showToast('error', '❌ Error', message);
}

function showInfo(message) {
    showToast('info', 'ℹ️ Información', message);
}

function showToast(type, title, message) {
    const toast = createToast(type, title, message);
    
    // Agregar al container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(toast);

    // Mostrar
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Auto-remover
    setTimeout(() => {
        toast.remove();
    }, type === 'error' ? 5000 : 3000);
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
// ESTADOS DE CARGA
// ============================================================================

function showLoadingState() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Guardar el contenido original antes de reemplazarlo
    const originalContent = container.innerHTML;
    container.setAttribute('data-original-content', 'saved');
    
    // Ocultar contenido existente en lugar de reemplazarlo
    container.style.opacity = '0.3';
    container.style.pointerEvents = 'none';
    
    // Agregar overlay de loading
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'initial-loading-overlay';
    loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    loadingOverlay.innerHTML = `
        <div style="text-align: center;">
            <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
            <h3>Cargando Módulo de Ingreso...</h3>
            <p>Obteniendo datos del sistema</p>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
}

function hideLoadingState() {
    // Remover overlay de loading
    const loadingOverlay = document.getElementById('initial-loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.remove();
    }
    
    // Restaurar container principal
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
        container.removeAttribute('data-original-content');
    }
}

function showLoadingOverlay(message = 'Procesando...') {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">${message}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ============================================================================
// FUNCIONES GLOBALES PARA DEBUG
// ============================================================================

// Exponer funciones para depuración
if (typeof window !== 'undefined') {
    window.IngresoDebug = {
        app: IngresoApp,
        selectProduct: selectProduct,
        addItem: addItemToPending,
        processIngreso: processIngreso,
        clearAll: clearAllItems,
        showHistory: showHistoryModal
    };
}

console.log('✅ Sistema de Ingreso de Mercadería cargado correctamente');