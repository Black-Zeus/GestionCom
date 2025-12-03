/**
 * Sistema de Gestión de Productos - JavaScript Completo
 * Manejo de productos, variantes, atributos y unidades de medida
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let ProductsApp = {
    data: {},
    selectedAttributes: {},
    additionalUnits: [],
    currentProduct: null,
    currentVariant: null,
    isLoading: false,
    filters: {
        search: '',
        category: '',
        status: ''
    }
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Sistema de Gestión de Productos');

    // Cargar datos
    loadData();

    // Inicializar componentes
    initializeTabs();
    initializeConditionalSections();
    initializeAttributeSelection();
    initializeUnitsManagement();
    initializeFormValidation();
    initializeEventListeners();

    console.log('✅ Sistema inicializado correctamente');
});

// ============================================================================
// CARGA DE DATOS
// ============================================================================

async function loadData() {
    try {
        const response = await fetch('data.json');
        ProductsApp.data = await response.json();

        console.log('📊 Datos cargados:', ProductsApp.data);

        // Poblar formularios con datos
        populateCategories();
        populateMeasurementUnits();
        populateProducts();
        populateAttributes();

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        showAlert('Error cargando los datos del sistema', 'danger');
    }
}

function populateCategories() {
    const categorySelects = document.querySelectorAll('#product-category, #filter-category');

    categorySelects.forEach(select => {
        // Limpiar opciones existentes (excepto la primera)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Crear estructura jerárquica
        const categoryTree = buildCategoryTree(ProductsApp.data.categories);
        addCategoriesToSelect(select, categoryTree, '');
    });
}

function buildCategoryTree(categories) {
    const tree = [];
    const lookup = {};

    // Crear lookup
    categories.forEach(cat => {
        lookup[cat.id] = { ...cat, children: [] };
    });

    // Construir árbol
    categories.forEach(cat => {
        if (cat.parent_id === null) {
            tree.push(lookup[cat.id]);
        } else if (lookup[cat.parent_id]) {
            lookup[cat.parent_id].children.push(lookup[cat.id]);
        }
    });

    return tree;
}

function addCategoriesToSelect(select, categories, prefix) {
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = prefix + category.category_name;
        select.appendChild(option);

        if (category.children.length > 0) {
            addCategoriesToSelect(select, category.children, prefix + category.category_name + ' > ');
        }
    });
}

function populateMeasurementUnits() {
    const unitSelects = document.querySelectorAll('#base-unit, .unit-select');

    unitSelects.forEach(select => {
        // Limpiar opciones existentes (excepto la primera)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        ProductsApp.data.measurement_units.forEach(unit => {
            if (unit.is_active) {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = `${unit.unit_name} (${unit.unit_symbol})`;

                if (unit.unit_type === 'DERIVED') {
                    option.textContent += ` - ${unit.conversion_factor}x`;
                }

                select.appendChild(option);
            }
        });
    });
}

function populateProducts() {
    const productSelects = document.querySelectorAll('#select-product');

    productSelects.forEach(select => {
        // Limpiar opciones existentes (excepto la primera)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        ProductsApp.data.products.forEach(product => {
            if (product.is_active && product.has_variants) {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.product_code} - ${product.product_name} (${product.brand || 'Sin marca'})`;
                select.appendChild(option);
            }
        });
    });

    // Cargar tabla de productos
    loadProductsTable();
}

function populateAttributes() {
    const attributeContainer = document.querySelector('.variant-generator');
    if (!attributeContainer) return;

    // Limpiar atributos existentes
    const existingGroups = attributeContainer.querySelectorAll('.attribute-group');
    existingGroups.forEach(group => group.remove());

    // Agrupar atributos por grupo
    const groupedAttributes = {};
    ProductsApp.data.attributes.forEach(attr => {
        if (attr.is_active) {
            const groupId = attr.attribute_group_id;
            if (!groupedAttributes[groupId]) {
                groupedAttributes[groupId] = [];
            }
            groupedAttributes[groupId].push(attr);
        }
    });

    // Crear grupos de atributos
    Object.keys(groupedAttributes).forEach(groupId => {
        const group = ProductsApp.data.attribute_groups.find(g => g.id == groupId);
        if (group && group.is_active) {
            createAttributeGroup(group, groupedAttributes[groupId], attributeContainer);
        }
    });
}

function createAttributeGroup(group, attributes, container) {
    attributes.forEach(attribute => {
        const attributeDiv = document.createElement('div');
        attributeDiv.className = 'attribute-group';

        const typeLabel = attribute.affects_sku ? 'Afecta SKU' : 'No afecta SKU';

        attributeDiv.innerHTML = `
            <div class="attribute-header">
                <div class="attribute-name">${attribute.attribute_name}</div>
                <div class="attribute-type">${attribute.attribute_type} • ${typeLabel}</div>
            </div>
            <div class="attribute-values" data-attribute-id="${attribute.id}">
                ${createAttributeValues(attribute)}
            </div>
        `;

        container.appendChild(attributeDiv);
    });
}

function createAttributeValues(attribute) {
    if (attribute.attribute_type === 'NUMBER' || attribute.attribute_type === 'TEXT') {
        return `
            <div class="form-group">
                <input type="${attribute.attribute_type === 'NUMBER' ? 'number' : 'text'}" 
                       class="form-control" 
                       placeholder="Ej: ${attribute.attribute_code === 'WEIGHT' ? '180' : 'Valor'}" 
                       data-attribute="${attribute.attribute_code.toLowerCase()}" 
                       ${attribute.attribute_type === 'NUMBER' ? 'step="0.1"' : ''}>
            </div>
        `;
    }

    // Para SELECT y MULTISELECT
    const values = ProductsApp.data.attribute_values.filter(v =>
        v.attribute_id === attribute.id && v.is_active
    );

    return values.map(value => `
        <div class="attribute-value ${attribute.affects_sku ? 'affects-sku' : ''}" 
             data-attribute="${attribute.attribute_code.toLowerCase()}" 
             data-value="${value.value_code}">
            ${value.value_name}
        </div>
    `).join('');
}

// ============================================================================
// MANEJO DE PESTAÑAS
// ============================================================================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', function () {
            // Remover clases activas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Activar pestaña actual
            this.classList.add('active');
            tabPanels[index].classList.add('active');

            // Cargar datos específicos de la pestaña
            loadTabData(index);
        });
    });
}

function loadTabData(tabIndex) {
    switch (tabIndex) {
        case 0: // Productos
            loadProductsTable();
            break;
        case 1: // Variantes
            loadVariantsTable();
            break;
        case 2: // Herramientas
            loadToolsData();
            break;
    }
}

// ============================================================================
// SECCIONES CONDICIONALES
// ============================================================================

function initializeConditionalSections() {
    // Control de fecha de vencimiento
    const expiryCheckbox = document.getElementById('has-expiry');
    const expiryConfig = document.getElementById('expiry-config');

    if (expiryCheckbox && expiryConfig) {
        expiryCheckbox.addEventListener('change', function () {
            if (this.checked) {
                expiryConfig.classList.add('show');
                // Establecer valores por defecto
                const defaultDays = document.getElementById('default-expiry-days');
                const alertDays = document.getElementById('expiry-alert-days');
                if (defaultDays && !defaultDays.value) defaultDays.value = ProductsApp.data.system_config.default_expiry_days;
                if (alertDays && !alertDays.value) alertDays.value = ProductsApp.data.system_config.default_expiry_alert_days;
            } else {
                expiryConfig.classList.remove('show');
            }
        });
    }

    // Control de stock crítico
    const stockAlertsCheckbox = document.getElementById('enable-stock-alerts');
    const stockConfig = document.getElementById('stock-config');

    if (stockAlertsCheckbox && stockConfig) {
        stockAlertsCheckbox.addEventListener('change', function () {
            if (this.checked) {
                stockConfig.classList.add('show');
                // Establecer valores por defecto
                setDefaultStockValues();
            } else {
                stockConfig.classList.remove('show');
            }
        });
    }

    // Checkbox para crear variantes
    const hasVariantsCheckbox = document.getElementById('has-variants');
    const createVariantsBtn = document.getElementById('btn-create-variants');

    if (hasVariantsCheckbox && createVariantsBtn) {
        hasVariantsCheckbox.addEventListener('change', function () {
            createVariantsBtn.style.display = this.checked ? 'inline-block' : 'none';
        });
    }
}

function setDefaultStockValues() {
    const fields = [
        { id: 'lead-time-days', value: ProductsApp.data.system_config.default_lead_time_days },
        { id: 'alert-frequency', value: ProductsApp.data.system_config.default_alert_frequency_hours }
    ];

    fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element && !element.value) {
            element.value = field.value;
        }
    });
}

// ============================================================================
// SISTEMA DE ATRIBUTOS
// ============================================================================

function initializeAttributeSelection() {
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('attribute-value')) {
            handleAttributeSelection(e.target);
        }
    });

    // Botones de variantes
    const previewBtn = document.getElementById('btn-preview-variants');
    const generateBtn = document.getElementById('btn-generate-variants');
    const clearBtn = document.getElementById('btn-clear-selection');

    if (previewBtn) previewBtn.addEventListener('click', generateVariantsPreview);
    if (generateBtn) generateBtn.addEventListener('click', generateVariants);
    if (clearBtn) clearBtn.addEventListener('click', clearAttributeSelection);
}

function handleAttributeSelection(element) {
    const attribute = element.dataset.attribute;
    const valueCode = element.dataset.value;

    // Toggle selección visual
    element.classList.toggle('selected');

    // Actualizar objeto de selección
    if (!ProductsApp.selectedAttributes[attribute]) {
        ProductsApp.selectedAttributes[attribute] = [];
    }

    const index = ProductsApp.selectedAttributes[attribute].indexOf(valueCode);
    if (index > -1) {
        ProductsApp.selectedAttributes[attribute].splice(index, 1);
    } else {
        ProductsApp.selectedAttributes[attribute].push(valueCode);
    }

    // Limpiar arrays vacíos
    if (ProductsApp.selectedAttributes[attribute].length === 0) {
        delete ProductsApp.selectedAttributes[attribute];
    }

    console.log('Atributos seleccionados:', ProductsApp.selectedAttributes);
}

function generateVariantsPreview() {
    const skuAttributes = getSkuAffectingAttributes();

    if (Object.keys(skuAttributes).length === 0) {
        showAlert('Selecciona al menos un atributo que afecte el SKU', 'warning');
        return;
    }

    const selectedProduct = document.getElementById('select-product');
    if (!selectedProduct.value) {
        showAlert('Selecciona un producto primero', 'warning');
        return;
    }

    const product = ProductsApp.data.products.find(p => p.id == selectedProduct.value);
    const combinations = generateCombinations(skuAttributes);

    displayVariantsPreview(product, combinations);
}

function getSkuAffectingAttributes() {
    const skuAttributes = {};

    Object.keys(ProductsApp.selectedAttributes).forEach(attr => {
        const attributeData = ProductsApp.data.attributes.find(a =>
            a.attribute_code.toLowerCase() === attr
        );

        if (attributeData && attributeData.affects_sku) {
            skuAttributes[attr] = ProductsApp.selectedAttributes[attr];
        }
    });

    return skuAttributes;
}

function generateCombinations(attributes) {
    const keys = Object.keys(attributes);
    if (keys.length === 0) return [];

    let combinations = [{}];

    keys.forEach(key => {
        const newCombinations = [];
        attributes[key].forEach(value => {
            combinations.forEach(combination => {
                newCombinations.push({ ...combination, [key]: value });
            });
        });
        combinations = newCombinations;
    });

    return combinations;
}

function displayVariantsPreview(product, combinations) {
    const previewDiv = document.getElementById('variants-preview');
    const listDiv = document.getElementById('variants-list');
    const countSpan = document.getElementById('variants-count');

    if (!previewDiv || !listDiv || !countSpan) return;

    listDiv.innerHTML = '';

    combinations.forEach(combination => {
        const sku = generateSKU(product.product_code, combination);
        const variantName = generateVariantName(product.product_name, combination);
        const attributesText = Object.entries(combination)
            .map(([attr, value]) => getAttributeValueName(attr, value))
            .join(', ');

        const variantDiv = document.createElement('div');
        variantDiv.className = 'variant-item';
        variantDiv.innerHTML = `
            <div class="variant-sku">${sku}</div>
            <div class="variant-attributes">${attributesText}</div>
        `;
        listDiv.appendChild(variantDiv);
    });

    countSpan.textContent = combinations.length;
    previewDiv.style.display = 'block';
}

function generateSKU(productCode, combination) {
    const separator = ProductsApp.data.system_config.sku_separator || '-';
    const suffix = Object.values(combination).join(separator);
    return `${productCode}${separator}${suffix}`;
}

function generateVariantName(productName, combination) {
    const attributeNames = Object.entries(combination)
        .map(([attr, value]) => getAttributeValueName(attr, value))
        .join(' ');
    return `${productName} - ${attributeNames}`;
}

function getAttributeValueName(attr, valueCode) {
    const attribute = ProductsApp.data.attributes.find(a =>
        a.attribute_code.toLowerCase() === attr
    );

    if (!attribute) return valueCode;

    const value = ProductsApp.data.attribute_values.find(v =>
        v.attribute_id === attribute.id && v.value_code === valueCode
    );

    return value ? value.value_name : valueCode;
}

function generateVariants() {
    const skuAttributes = getSkuAffectingAttributes();

    if (Object.keys(skuAttributes).length === 0) {
        showAlert('Selecciona al menos un atributo que afecte el SKU', 'warning');
        return;
    }

    const selectedProduct = document.getElementById('select-product');
    if (!selectedProduct.value) {
        showAlert('Selecciona un producto primero', 'warning');
        return;
    }

    // Aquí iría la lógica real de creación en el backend
    const combinations = generateCombinations(skuAttributes);

    showAlert(`${combinations.length} variantes generadas correctamente`, 'success');

    // Simular generación y recargar tabla
    setTimeout(() => {
        loadVariantsTable();
        clearAttributeSelection();
    }, 1000);
}

function clearAttributeSelection() {
    const selectedElements = document.querySelectorAll('.attribute-value.selected');
    selectedElements.forEach(el => el.classList.remove('selected'));

    ProductsApp.selectedAttributes = {};

    const previewDiv = document.getElementById('variants-preview');
    if (previewDiv) previewDiv.style.display = 'none';
}

// ============================================================================
// GESTIÓN DE UNIDADES DE MEDIDA
// ============================================================================

function initializeUnitsManagement() {
    const addUnitBtn = document.querySelector('.add-unit-btn');

    if (addUnitBtn) {
        addUnitBtn.addEventListener('click', addUnit);
    }

    const calculateBtn = document.getElementById('calculate-factors-btn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', showFactorCalculator);
    }
}

function addUnit() {
    const unitRow = document.getElementById('unit-template');
    const unitSelect = unitRow.querySelector('.unit-select');
    const conversionFactor = unitRow.querySelector('.conversion-factor');
    const isPurchase = unitRow.querySelector('.is-purchase-unit').checked;
    const isSale = unitRow.querySelector('.is-sale-unit').checked;
    const isInventory = unitRow.querySelector('.is-inventory-unit').checked;

    if (!unitSelect.value || !conversionFactor.value) {
        showAlert('Selecciona una unidad y especifica el factor de conversión', 'warning');
        return;
    }

    const unitData = {
        unitId: unitSelect.value,
        unitText: unitSelect.options[unitSelect.selectedIndex].text,
        conversionFactor: parseFloat(conversionFactor.value),
        isPurchase: isPurchase,
        isSale: isSale,
        isInventory: isInventory
    };

    // Validar factor de conversión
    if (unitData.conversionFactor <= 0) {
        showAlert('El factor de conversión debe ser mayor que 0', 'warning');
        return;
    }

    // Verificar duplicados
    const isDuplicate = ProductsApp.additionalUnits.some(unit => unit.unitId === unitData.unitId);
    if (isDuplicate) {
        showAlert('Esta unidad ya está agregada', 'warning');
        return;
    }

    // Agregar a la lista
    ProductsApp.additionalUnits.push(unitData);
    const additionalUnitsList = document.getElementById('additional-units-list');
    const newUnitRow = createAdditionalUnitRow(unitData);
    additionalUnitsList.appendChild(newUnitRow);

    // Limpiar el formulario
    clearUnitForm();

    showAlert('Unidad agregada correctamente', 'success');
}

function createAdditionalUnitRow(unitData) {
    const row = document.createElement('div');
    row.className = 'unit-row';
    row.dataset.unitId = unitData.unitId;

    row.innerHTML = `
        <div><strong>${unitData.unitText}</strong></div>
        <div>${unitData.conversionFactor}</div>
        <div>${unitData.isPurchase ? '✓' : '✗'}</div>
        <div>${unitData.isSale ? '✓' : '✗'}</div>
        <div>${unitData.isInventory ? '✓' : '✗'}</div>
        <div>
            <button type="button" class="btn btn-sm btn-warning edit-unit-btn" title="Editar">✏️</button>
            <button type="button" class="btn btn-sm btn-danger remove-unit-btn" title="Eliminar">🗑️</button>
        </div>
    `;

    // Event listeners
    row.querySelector('.remove-unit-btn').addEventListener('click', () => removeUnit(row, unitData.unitId));
    row.querySelector('.edit-unit-btn').addEventListener('click', () => editUnit(unitData));

    return row;
}

function removeUnit(row, unitId) {
    if (confirm('¿Estás seguro de eliminar esta unidad?')) {
        row.remove();
        ProductsApp.additionalUnits = ProductsApp.additionalUnits.filter(unit => unit.unitId !== unitId);
        showAlert('Unidad eliminada', 'info');
    }
}

function editUnit(unitData) {
    // Cargar datos en el formulario
    const unitRow = document.getElementById('unit-template');
    const unitSelect = unitRow.querySelector('.unit-select');
    const conversionFactor = unitRow.querySelector('.conversion-factor');
    const isPurchaseCheck = unitRow.querySelector('.is-purchase-unit');
    const isSaleCheck = unitRow.querySelector('.is-sale-unit');
    const isInventoryCheck = unitRow.querySelector('.is-inventory-unit');

    unitSelect.value = unitData.unitId;
    conversionFactor.value = unitData.conversionFactor;
    isPurchaseCheck.checked = unitData.isPurchase;
    isSaleCheck.checked = unitData.isSale;
    isInventoryCheck.checked = unitData.isInventory;

    // Remover la unidad existente para evitar duplicados
    removeUnit(document.querySelector(`[data-unit-id="${unitData.unitId}"]`), unitData.unitId);
}

function clearUnitForm() {
    const unitRow = document.getElementById('unit-template');
    const unitSelect = unitRow.querySelector('.unit-select');
    const conversionFactor = unitRow.querySelector('.conversion-factor');
    const checkboxes = unitRow.querySelectorAll('input[type="checkbox"]');

    unitSelect.value = '';
    conversionFactor.value = '';
    checkboxes.forEach(cb => cb.checked = false);
}

function showFactorCalculator() {
    const calculatorHTML = `
        <div class="alert alert-info">
            <strong>Calculadora de Factores de Conversión</strong><br>
            <small>Ejemplos comunes:</small><br>
            • 1 Docena = 12 Unidades → Factor: 12<br>
            • 1 Caja de 24 = 24 Unidades → Factor: 24<br>
            • 1 Kilogramo = 1000 Gramos → Factor: 1000<br>
            • 1 Metro = 100 Centímetros → Factor: 100<br>
            • 1 Gramo = 0.001 Kilogramos → Factor: 0.001
        </div>
    `;

    // Crear modal temporal o mostrar en alerta
    showAlert(calculatorHTML, 'info');
}

// ============================================================================
// TABLAS DE DATOS
// ============================================================================

function loadProductsTable() {
    const tbody = document.querySelector('#products-table tbody');
    const emptyState = document.getElementById('empty-products');

    if (!tbody) return;

    tbody.innerHTML = '';

    // Aplicar filtros
    const filteredProducts = applyProductFilters(ProductsApp.data.products);

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No se encontraron productos</td></tr>';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    filteredProducts.forEach(product => {
        const category = getCategoryPath(product.category_id);
        const baseUnit = getUnitById(product.base_measurement_unit_id);
        const variantsCount = getVariantsCount(product.id);
        const stockConfig = hasStockConfig(product.id);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge-secondary">${product.product_code}</span></td>
            <td>
                <div><strong>${product.product_name}</strong></div>
                <div class="text-muted" style="font-size: 0.85em;">${getProductFeatures(product)}</div>
            </td>
            <td>
                <div>${product.brand || 'Sin marca'}</div>
                <div class="text-muted" style="font-size: 0.85em;">${product.model || 'Sin modelo'}</div>
            </td>
            <td>${category}</td>
            <td><span class="badge badge-info">${baseUnit?.unit_symbol || 'N/A'}</span></td>
            <td><span class="badge badge-${variantsCount > 0 ? 'primary' : 'warning'}">${variantsCount}</span></td>
            <td><span class="badge badge-${stockConfig ? 'success' : 'secondary'}">${stockConfig ? '✓ Configurado' : 'Sin configurar'}</span></td>
            <td>
                <div class="product-status status-${product.is_active ? 'active' : 'inactive'}">
                    <div class="status-indicator"></div>
                    <span>${product.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
            </td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editProduct(${product.id})">✏️ Editar</button>
                <button class="btn btn-info btn-sm" onclick="manageVariants(${product.id})">🎨 Variantes</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function loadVariantsTable() {
    const tbody = document.querySelector('#variants-tbody');
    const emptyState = document.getElementById('empty-variants');

    if (!tbody) return;

    const selectedProduct = document.getElementById('select-product')?.value;
    if (!selectedProduct) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Selecciona un producto para ver sus variantes</td></tr>';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    const variants = ProductsApp.data.product_variants.filter(v => v.product_id == selectedProduct);
    tbody.innerHTML = '';

    if (variants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Este producto no tiene variantes generadas</td></tr>';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    variants.forEach(variant => {
        const attributes = getVariantAttributes(variant.id);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge-secondary">${variant.variant_sku}</span></td>
            <td>
                <div><strong>${variant.variant_name}</strong></div>
                <div class="text-muted" style="font-size: 0.85em;">${variant.variant_description || 'Sin descripción'}</div>
            </td>
            <td>${attributes}</td>
            <td>
                <div class="form-check">
                    <input type="radio" name="default-variant-${selectedProduct}" class="form-check-input" 
                           ${variant.is_default_variant ? 'checked' : ''} 
                           onchange="setDefaultVariant(${variant.id})">
                </div>
            </td>
            <td><span class="badge badge-${variant.is_active ? 'success' : 'warning'}">${variant.is_active ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <button class="btn btn-warning btn-sm" onclick="editVariant(${variant.id})">✏️ Editar</button>
                <button class="btn btn-info btn-sm" onclick="viewStock(${variant.id})">📊 Stock</button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function loadToolsData() {
    console.log('Cargando herramientas...');
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

function initializeEventListeners() {
    // Búsqueda en tiempo real
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function () {
            ProductsApp.filters.search = this.value;
            loadProductsTable();
        }, 300));
    }

    // Filtros de categoría y estado
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');

    if (filterCategory) {
        filterCategory.addEventListener('change', function () {
            ProductsApp.filters.category = this.value;
            loadProductsTable();
        });
    }

    if (filterStatus) {
        filterStatus.addEventListener('change', function () {
            ProductsApp.filters.status = this.value;
            loadProductsTable();
        });
    }

    // Selector de producto para variantes
    const selectProduct = document.getElementById('select-product');
    if (selectProduct) {
        selectProduct.addEventListener('change', function () {
            if (this.value) {
                loadSelectedProductInfo(this.value);
                loadVariantsTable();
            } else {
                clearSelectedProductInfo();
            }
        });
    }

    // Atajos de teclado
    document.addEventListener('keydown', function (e) {
        // Ctrl+S para guardar
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentProduct();
        }

        // Escape para cancelar/limpiar
        if (e.key === 'Escape') {
            clearProductForm();
        }

        // Alt+1,2,3 para cambiar pestañas
        if (e.altKey && ['1', '2', '3'].includes(e.key)) {
            e.preventDefault();
            const tabIndex = parseInt(e.key) - 1;
            const tabButtons = document.querySelectorAll('.tab-button');
            if (tabButtons[tabIndex]) {
                tabButtons[tabIndex].click();
            }
        }
    });
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

function applyProductFilters(products) {
    return products.filter(product => {
        // Filtro de búsqueda
        if (ProductsApp.filters.search) {
            const searchTerm = ProductsApp.filters.search.toLowerCase();
            const matches = [
                product.product_code.toLowerCase(),
                product.product_name.toLowerCase(),
                product.brand?.toLowerCase() || '',
                product.model?.toLowerCase() || ''
            ].some(field => field.includes(searchTerm));

            if (!matches) return false;
        }

        // Filtro de categoría
        if (ProductsApp.filters.category && product.category_id != ProductsApp.filters.category) {
            return false;
        }

        // Filtro de estado
        if (ProductsApp.filters.status) {
            switch (ProductsApp.filters.status) {
                case 'active':
                    if (!product.is_active) return false;
                    break;
                case 'inactive':
                    if (product.is_active) return false;
                    break;
                case 'has_variants':
                    if (!product.has_variants) return false;
                    break;
                case 'no_variants':
                    if (product.has_variants) return false;
                    break;
                case 'stock_critical':
                    if (!hasStockConfig(product.id)) return false;
                    break;
            }
        }

        return true;
    });
}

function applyFilters() {
    loadProductsTable();
    showAlert('Filtros aplicados', 'info');
}

// ============================================================================
// GESTIÓN DE PRODUCTOS
// ============================================================================

function clearProductForm() {
    // Limpiar campos básicos
    document.getElementById('product-code').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-brand').value = '';
    document.getElementById('product-model').value = '';
    document.getElementById('product-category').value = '';
    document.getElementById('product-description').value = '';
    document.getElementById('base-unit').value = '';

    // Limpiar checkboxes
    const checkboxes = ['has-variants', 'has-batch', 'has-expiry', 'has-serial', 'has-location', 'is-active', 'enable-stock-alerts', 'global-stock-config'];
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.checked = id === 'is-active' || id === 'has-location' || id === 'global-stock-config';
        }
    });

    // Limpiar campos numéricos
    const numericFields = ['default-expiry-days', 'expiry-alert-days', 'minimum-stock', 'safety-stock', 'reorder-quantity', 'lead-time-days', 'alert-frequency'];
    numericFields.forEach(id => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });

    // Ocultar secciones condicionales
    document.getElementById('expiry-config')?.classList.remove('show');
    document.getElementById('stock-config')?.classList.remove('show');
    document.getElementById('btn-create-variants').style.display = 'none';

    // Limpiar unidades adicionales
    ProductsApp.additionalUnits = [];
    const additionalUnitsList = document.getElementById('additional-units-list');
    if (additionalUnitsList) additionalUnitsList.innerHTML = '';

    // Reset estado
    ProductsApp.currentProduct = null;

    showAlert('Formulario limpiado', 'info');
}

function saveCurrentProduct() {
    if (!validateProductForm()) return;

    const productData = collectProductData();

    if (ProductsApp.currentProduct) {
        // Actualizar producto existente
        updateProduct(productData);
    } else {
        // Crear nuevo producto
        createProduct(productData);
    }
}

function validateProductForm() {
    const requiredFields = [
        { id: 'product-code', name: 'Código del producto' },
        { id: 'product-name', name: 'Nombre del producto' },
        { id: 'product-category', name: 'Categoría' },
        { id: 'base-unit', name: 'Unidad base' }
    ];

    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element || !element.value.trim()) {
            showAlert(`El campo "${field.name}" es obligatorio`, 'warning');
            element?.focus();
            return false;
        }
    }

    // Validar código único
    const productCode = document.getElementById('product-code').value.trim();
    const existingProduct = ProductsApp.data.products.find(p =>
        p.product_code === productCode && p.id !== ProductsApp.currentProduct?.id
    );

    if (existingProduct) {
        showAlert('El código del producto ya existe', 'warning');
        document.getElementById('product-code').focus();
        return false;
    }

    // Validar configuración de stock crítico si está habilitada
    if (document.getElementById('enable-stock-alerts')?.checked) {
        const stockFields = ['minimum-stock', 'reorder-quantity', 'lead-time-days'];
        for (const fieldId of stockFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value || parseFloat(field.value) <= 0) {
                showAlert(`Complete correctamente la configuración de stock crítico`, 'warning');
                field?.focus();
                return false;
            }
        }
    }

    return true;
}

function collectProductData() {
    return {
        product_code: document.getElementById('product-code').value.trim(),
        product_name: document.getElementById('product-name').value.trim(),
        product_description: document.getElementById('product-description').value.trim(),
        brand: document.getElementById('product-brand').value.trim() || null,
        model: document.getElementById('product-model').value.trim() || null,
        category_id: parseInt(document.getElementById('product-category').value),
        base_measurement_unit_id: parseInt(document.getElementById('base-unit').value),
        has_variants: document.getElementById('has-variants').checked,
        has_batch_control: document.getElementById('has-batch').checked,
        has_expiry_date: document.getElementById('has-expiry').checked,
        has_serial_numbers: document.getElementById('has-serial').checked,
        has_location_tracking: document.getElementById('has-location').checked,
        is_active: document.getElementById('is-active').checked,
        additional_units: ProductsApp.additionalUnits,
        stock_config: collectStockConfig(),
        expiry_config: collectExpiryConfig()
    };
}

function collectStockConfig() {
    if (!document.getElementById('enable-stock-alerts')?.checked) {
        return null;
    }

    return {
        minimum_stock: parseFloat(document.getElementById('minimum-stock').value) || 0,
        safety_stock: parseFloat(document.getElementById('safety-stock').value) || 0,
        reorder_quantity: parseFloat(document.getElementById('reorder-quantity').value) || 0,
        lead_time_days: parseInt(document.getElementById('lead-time-days').value) || 7,
        alert_frequency_hours: parseInt(document.getElementById('alert-frequency').value) || 24,
        is_global: document.getElementById('global-stock-config').checked
    };
}

function collectExpiryConfig() {
    if (!document.getElementById('has-expiry')?.checked) {
        return null;
    }

    return {
        default_expiry_days: parseInt(document.getElementById('default-expiry-days').value) || 365,
        expiry_alert_days: parseInt(document.getElementById('expiry-alert-days').value) || 30
    };
}

function createProduct(productData) {
    // Simular creación en el backend
    const newProduct = {
        id: Math.max(...ProductsApp.data.products.map(p => p.id)) + 1,
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    ProductsApp.data.products.push(newProduct);
    ProductsApp.currentProduct = newProduct;

    showAlert('Producto creado exitosamente', 'success');
    loadProductsTable();

    // Mostrar botón de variantes si corresponde
    if (productData.has_variants) {
        document.getElementById('btn-create-variants').style.display = 'inline-block';
    }
}

function updateProduct(productData) {
    const index = ProductsApp.data.products.findIndex(p => p.id === ProductsApp.currentProduct.id);
    if (index === -1) return;

    ProductsApp.data.products[index] = {
        ...ProductsApp.currentProduct,
        ...productData,
        updated_at: new Date().toISOString()
    };

    ProductsApp.currentProduct = ProductsApp.data.products[index];

    showAlert('Producto actualizado exitosamente', 'success');
    loadProductsTable();
}

function editProduct(productId) {
    const product = ProductsApp.data.products.find(p => p.id === productId);
    if (!product) {
        showAlert('Producto no encontrado', 'danger');
        return;
    }

    ProductsApp.currentProduct = product;
    loadProductInForm(product);

    // Cambiar a la pestaña de productos si no está activa
    const productsTab = document.querySelector('.tab-button');
    if (productsTab) productsTab.click();

    showAlert('Producto cargado para edición', 'info');
}

function loadProductInForm(product) {
    // Cargar datos básicos
    document.getElementById('product-code').value = product.product_code;
    document.getElementById('product-name').value = product.product_name;
    document.getElementById('product-description').value = product.product_description || '';
    document.getElementById('product-brand').value = product.brand || '';
    document.getElementById('product-model').value = product.model || '';
    document.getElementById('product-category').value = product.category_id;
    document.getElementById('base-unit').value = product.base_measurement_unit_id;

    // Cargar checkboxes
    document.getElementById('has-variants').checked = product.has_variants;
    document.getElementById('has-batch').checked = product.has_batch_control;
    document.getElementById('has-expiry').checked = product.has_expiry_date;
    document.getElementById('has-serial').checked = product.has_serial_numbers;
    document.getElementById('has-location').checked = product.has_location_tracking;
    document.getElementById('is-active').checked = product.is_active;

    // Mostrar secciones condicionales si corresponde
    if (product.has_expiry_date) {
        document.getElementById('has-expiry').dispatchEvent(new Event('change'));
    }

    // Cargar configuración de stock si existe
    const stockConfig = ProductsApp.data.stock_critical_config.find(sc =>
        ProductsApp.data.product_variants.some(v =>
            v.product_id === product.id && v.id === sc.product_variant_id
        )
    );

    if (stockConfig) {
        document.getElementById('enable-stock-alerts').checked = true;
        document.getElementById('enable-stock-alerts').dispatchEvent(new Event('change'));

        document.getElementById('minimum-stock').value = stockConfig.minimum_stock;
        document.getElementById('safety-stock').value = stockConfig.safety_stock;
        document.getElementById('reorder-quantity').value = stockConfig.reorder_quantity;
        document.getElementById('lead-time-days').value = stockConfig.lead_time_days;
        document.getElementById('alert-frequency').value = stockConfig.alert_frequency_hours;
    }

    // Cargar unidades adicionales
    const productUnits = ProductsApp.data.product_measurement_units.filter(u => u.product_id === product.id);
    ProductsApp.additionalUnits = [];
    const additionalUnitsList = document.getElementById('additional-units-list');
    additionalUnitsList.innerHTML = '';

    productUnits.forEach(unit => {
        if (unit.measurement_unit_id !== product.base_measurement_unit_id) {
            const unitData = getUnitById(unit.measurement_unit_id);
            if (unitData) {
                const additionalUnit = {
                    unitId: unit.measurement_unit_id,
                    unitText: `${unitData.unit_name} (${unitData.unit_symbol})`,
                    conversionFactor: unit.conversion_factor,
                    isPurchase: unit.is_purchase_unit,
                    isSale: unit.is_sale_unit,
                    isInventory: unit.is_inventory_unit
                };

                ProductsApp.additionalUnits.push(additionalUnit);
                additionalUnitsList.appendChild(createAdditionalUnitRow(additionalUnit));
            }
        }
    });

    // Mostrar botón de variantes si corresponde
    document.getElementById('btn-create-variants').style.display = product.has_variants ? 'inline-block' : 'none';
}

// ============================================================================
// GESTIÓN DE VARIANTES
// ============================================================================

function manageVariants(productId) {
    const product = ProductsApp.data.products.find(p => p.id === productId);
    if (!product) {
        showAlert('Producto no encontrado', 'danger');
        return;
    }

    if (!product.has_variants) {
        showAlert('Este producto no está configurado para tener variantes', 'warning');
        return;
    }

    // Cambiar a la pestaña de variantes
    const variantsTab = document.querySelectorAll('.tab-button')[1];
    if (variantsTab) variantsTab.click();

    // Seleccionar el producto
    const selectProduct = document.getElementById('select-product');
    if (selectProduct) {
        selectProduct.value = productId;
        selectProduct.dispatchEvent(new Event('change'));
    }

    showAlert(`Gestionando variantes de ${product.product_name}`, 'info');
}

function loadSelectedProductInfo(productId) {
    const product = ProductsApp.data.products.find(p => p.id == productId);
    if (!product) return;

    const infoContainer = document.querySelector('.selected-product-info');
    const massActionsContainer = document.getElementById('variant-mass-actions');

    if (!infoContainer) return;

    const category = getCategoryPath(product.category_id);
    const baseUnit = getUnitById(product.base_measurement_unit_id);
    const variantsCount = getVariantsCount(product.id);
    const activeVariantsCount = ProductsApp.data.product_variants.filter(v =>
        v.product_id == productId && v.is_active
    ).length;

    infoContainer.innerHTML = `
        <div class="alert alert-info">
            <strong>📦 ${product.product_name}</strong><br>
            <strong>Código:</strong> ${product.product_code} | 
            <strong>Marca:</strong> ${product.brand || 'Sin marca'} | 
            <strong>Categoría:</strong> ${category}<br>
            <strong>Unidad Base:</strong> ${baseUnit?.unit_name} | 
            <strong>Variantes Totales:</strong> ${variantsCount} |
            <strong>Variantes Activas:</strong> <span class="badge badge-${activeVariantsCount > 0 ? 'success' : 'warning'}">${activeVariantsCount}</span>
        </div>
    `;

    infoContainer.style.display = 'block';

    // Mostrar acciones masivas si hay variantes
    if (massActionsContainer) {
        massActionsContainer.style.display = variantsCount > 0 ? 'block' : 'none';
    }
}

function clearSelectedProductInfo() {
    const infoContainer = document.querySelector('.selected-product-info');
    const massActionsContainer = document.getElementById('variant-mass-actions');

    if (infoContainer) {
        infoContainer.style.display = 'none';
        infoContainer.innerHTML = '';
    }

    if (massActionsContainer) {
        massActionsContainer.style.display = 'none';
    }

    const emptyState = document.getElementById('empty-variants');
    if (emptyState) emptyState.style.display = 'block';
}

function editVariant(variantId) {
    const variant = ProductsApp.data.product_variants.find(v => v.id === variantId);
    if (!variant) {
        showAlert('Variante no encontrada', 'danger');
        return;
    }

    ProductsApp.currentVariant = variant;

    // Mostrar formulario de edición
    const variantForm = document.getElementById('variant-form');
    if (variantForm) {
        variantForm.style.display = 'block';

        // Cargar datos en el formulario
        document.getElementById('variant-sku').value = variant.variant_sku;
        document.getElementById('variant-name').value = variant.variant_name;
        document.getElementById('variant-description').value = variant.variant_description || '';
        document.getElementById('is-default-variant').checked = variant.is_default_variant;
        document.getElementById('is-active-variant').checked = variant.is_active;

        // Scroll al formulario
        variantForm.scrollIntoView({ behavior: 'smooth' });
    }

    showAlert('Variante cargada para edición', 'info');
}

function saveVariant() {
    if (!ProductsApp.currentVariant) {
        showAlert('No hay variante seleccionada para guardar', 'warning');
        return;
    }

    const variantName = document.getElementById('variant-name').value.trim();
    if (!variantName) {
        showAlert('El nombre de la variante es obligatorio', 'warning');
        return;
    }

    const isActive = document.getElementById('is-active-variant').checked;
    const isDefault = document.getElementById('is-default-variant').checked;

    // Si se intenta desactivar la variante predeterminada, validar
    if (!isActive && ProductsApp.currentVariant.is_default_variant && isDefault) {
        showAlert('No puedes desactivar la variante predeterminada. Primero asigna otra variante como predeterminada.', 'warning');
        return;
    }

    // Actualizar datos de la variante
    ProductsApp.currentVariant.variant_name = variantName;
    ProductsApp.currentVariant.variant_description = document.getElementById('variant-description').value.trim();
    ProductsApp.currentVariant.is_default_variant = isDefault;
    ProductsApp.currentVariant.is_active = isActive;
    ProductsApp.currentVariant.updated_at = new Date().toISOString();

    // Si se marca como predeterminada, desmarcar las otras
    if (isDefault) {
        ProductsApp.data.product_variants.forEach(v => {
            if (v.product_id === ProductsApp.currentVariant.product_id && v.id !== ProductsApp.currentVariant.id) {
                v.is_default_variant = false;
            }
        });
    }

    // Si se desactiva y era la predeterminada, asignar otra como predeterminada
    if (!isActive && ProductsApp.currentVariant.is_default_variant) {
        const activeVariants = ProductsApp.data.product_variants.filter(v =>
            v.product_id === ProductsApp.currentVariant.product_id &&
            v.id !== ProductsApp.currentVariant.id &&
            v.is_active
        );

        if (activeVariants.length > 0) {
            activeVariants[0].is_default_variant = true;
            showAlert(`Variante "${activeVariants[0].variant_name}" asignada como predeterminada`, 'info');
        }

        ProductsApp.currentVariant.is_default_variant = false;
    }

    showAlert('Variante actualizada exitosamente', 'success');
    loadVariantsTable();
    cancelVariantEdit();
}

function toggleVariantStatus(variantId) {
    const variant = ProductsApp.data.product_variants.find(v => v.id === variantId);
    if (!variant) {
        showAlert('Variante no encontrada', 'danger');
        return;
    }

    const newStatus = !variant.is_active;
    const action = newStatus ? 'activar' : 'desactivar';

    // Si se intenta desactivar la variante predeterminada, validar
    if (!newStatus && variant.is_default_variant) {
        const activeVariants = ProductsApp.data.product_variants.filter(v =>
            v.product_id === variant.product_id &&
            v.id !== variant.id &&
            v.is_active
        );

        if (activeVariants.length === 0) {
            showAlert('No puedes desactivar la única variante activa del producto', 'warning');
            return;
        }

        if (!confirm(`Al desactivar la variante predeterminada, se asignará automáticamente otra. ¿Continuar?`)) {
            return;
        }

        // Asignar nueva variante predeterminada
        activeVariants[0].is_default_variant = true;
        variant.is_default_variant = false;
        showAlert(`Variante "${activeVariants[0].variant_name}" asignada como predeterminada`, 'info');
    }

    if (!confirm(`¿Estás seguro de ${action} la variante "${variant.variant_name}"?`)) {
        return;
    }

    // Cambiar estado
    variant.is_active = newStatus;
    variant.updated_at = new Date().toISOString();

    showAlert(`Variante ${newStatus ? 'activada' : 'desactivada'} exitosamente`, 'success');
    loadVariantsTable();
}

function activateAllVariants(productId) {
    const variants = ProductsApp.data.product_variants.filter(v => v.product_id === productId);

    if (!confirm(`¿Activar todas las ${variants.length} variantes del producto?`)) {
        return;
    }

    let activatedCount = 0;
    variants.forEach(variant => {
        if (!variant.is_active) {
            variant.is_active = true;
            variant.updated_at = new Date().toISOString();
            activatedCount++;
        }
    });

    if (activatedCount > 0) {
        showAlert(`${activatedCount} variantes activadas`, 'success');
        loadVariantsTable();
    } else {
        showAlert('Todas las variantes ya estaban activas', 'info');
    }
}

function deactivateAllVariants(productId) {
    const variants = ProductsApp.data.product_variants.filter(v => v.product_id === productId);
    const activeVariants = variants.filter(v => v.is_active);

    if (activeVariants.length <= 1) {
        showAlert('Debe mantenerse al menos una variante activa', 'warning');
        return;
    }

    if (!confirm(`¿Desactivar ${activeVariants.length - 1} variantes? Se mantendrá 1 variante activa.`)) {
        return;
    }

    let deactivatedCount = 0;
    let keptActive = false;

    activeVariants.forEach(variant => {
        if (!keptActive) {
            // Mantener la primera como activa y predeterminada
            variant.is_default_variant = true;
            keptActive = true;
        } else {
            variant.is_active = false;
            variant.is_default_variant = false;
            variant.updated_at = new Date().toISOString();
            deactivatedCount++;
        }
    });

    showAlert(`${deactivatedCount} variantes desactivadas. 1 variante mantenida activa.`, 'success');
    loadVariantsTable();
}

function cancelVariantEdit() {
    const variantForm = document.getElementById('variant-form');
    if (variantForm) {
        variantForm.style.display = 'none';
    }

    ProductsApp.currentVariant = null;

    // Limpiar formulario
    document.getElementById('variant-sku').value = '';
    document.getElementById('variant-name').value = '';
    document.getElementById('variant-description').value = '';
    document.getElementById('is-default-variant').checked = false;
    document.getElementById('is-active-variant').checked = true; // Por defecto activo
}

function setDefaultVariant(variantId) {
    const variant = ProductsApp.data.product_variants.find(v => v.id === variantId);
    if (!variant) return;

    // Desmarcar todas las otras variantes del mismo producto
    ProductsApp.data.product_variants.forEach(v => {
        if (v.product_id === variant.product_id) {
            v.is_default_variant = v.id === variantId;
        }
    });

    showAlert('Variante predeterminada actualizada', 'success');
    loadVariantsTable();
}

function viewStock(variantId) {
    const variant = ProductsApp.data.product_variants.find(v => v.id === variantId);
    if (!variant) {
        showAlert('Variante no encontrada', 'danger');
        return;
    }

    // Aquí iría la lógica para mostrar el stock de la variante
    showAlert(`Ver stock de ${variant.variant_name} - Funcionalidad por implementar`, 'info');
}

// ============================================================================
// VALIDACIÓN DE FORMULARIOS
// ============================================================================

function initializeFormValidation() {
    // Validación en tiempo real para código de producto
    const productCodeInput = document.getElementById('product-code');
    if (productCodeInput) {
        productCodeInput.addEventListener('blur', function () {
            validateProductCode(this.value);
        });

        productCodeInput.addEventListener('input', function () {
            // Solo permitir caracteres válidos
            this.value = this.value.replace(/[^A-Za-z0-9\-_]/g, '');
        });
    }

    // Validación para factores de conversión
    const conversionInputs = document.querySelectorAll('.conversion-factor');
    conversionInputs.forEach(input => {
        input.addEventListener('input', function () {
            if (this.value && parseFloat(this.value) <= 0) {
                this.setCustomValidity('El factor debe ser mayor que 0');
            } else {
                this.setCustomValidity('');
            }
        });
    });
}

function validateProductCode(code) {
    if (!code) return;

    const existing = ProductsApp.data.products.find(p =>
        p.product_code === code && p.id !== ProductsApp.currentProduct?.id
    );

    const input = document.getElementById('product-code');
    if (existing) {
        input.style.borderColor = '#dc3545';
        showAlert('Este código ya existe', 'warning');
        return false;
    } else {
        input.style.borderColor = '#28a745';
        return true;
    }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function getCategoryPath(categoryId) {
    const category = ProductsApp.data.categories.find(c => c.id === categoryId);
    return category ? category.category_path.replace(/\//g, ' > ').substring(3) : 'Sin categoría';
}

function getUnitById(unitId) {
    return ProductsApp.data.measurement_units.find(u => u.id === unitId);
}

function getVariantsCount(productId) {
    return ProductsApp.data.product_variants.filter(v => v.product_id === productId && v.is_active).length;
}

function hasStockConfig(productId) {
    const variants = ProductsApp.data.product_variants.filter(v => v.product_id === productId);
    return variants.some(variant =>
        ProductsApp.data.stock_critical_config.some(config =>
            config.product_variant_id === variant.id && config.is_active
        )
    );
}

function getProductFeatures(product) {
    const features = [];
    if (product.has_batch_control) features.push('Control de lotes');
    if (product.has_expiry_date) features.push('Vencimiento');
    if (product.has_serial_numbers) features.push('Serie');
    if (product.has_location_tracking) features.push('Ubicación');
    return features.length > 0 ? features.join(', ') : 'Sin controles especiales';
}

function getVariantAttributes(variantId) {
    const variantAttrs = ProductsApp.data.product_variant_attributes.filter(va => va.product_variant_id === variantId);

    if (variantAttrs.length === 0) {
        return '<span class="text-muted">Sin atributos</span>';
    }

    const attributesList = variantAttrs.map(va => {
        const attribute = ProductsApp.data.attributes.find(a => a.id === va.attribute_id);
        if (!attribute) return null;

        let value = '';
        if (va.text_value) {
            value = va.text_value;
        } else if (va.attribute_value_id) {
            const attrValue = ProductsApp.data.attribute_values.find(av => av.id === va.attribute_value_id);
            value = attrValue ? attrValue.value_name : 'N/A';
        }

        return `<span class="badge badge-secondary" title="${attribute.attribute_name}">${value}</span>`;
    }).filter(Boolean);

    return attributesList.join(' ');
}

// ============================================================================
// IMPORTACIÓN Y EXPORTACIÓN
// ============================================================================

function exportProducts() {
    const dataToExport = {
        products: ProductsApp.data.products,
        variants: ProductsApp.data.product_variants,
        attributes: ProductsApp.data.product_variant_attributes,
        categories: ProductsApp.data.categories,
        measurement_units: ProductsApp.data.measurement_units,
        exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productos_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showAlert('Datos exportados exitosamente', 'success');
}

function importProducts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv,.xlsx';

    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                processImportedData(data);
            } catch (error) {
                showAlert('Error al procesar el archivo: ' + error.message, 'danger');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function processImportedData(data) {
    if (!data.products) {
        showAlert('El archivo no contiene datos de productos válidos', 'warning');
        return;
    }

    let importedCount = 0;
    let updatedCount = 0;

    data.products.forEach(product => {
        const existing = ProductsApp.data.products.find(p => p.product_code === product.product_code);

        if (existing) {
            // Actualizar producto existente
            Object.assign(existing, product, { updated_at: new Date().toISOString() });
            updatedCount++;
        } else {
            // Crear nuevo producto
            const newProduct = {
                ...product,
                id: Math.max(...ProductsApp.data.products.map(p => p.id)) + 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            ProductsApp.data.products.push(newProduct);
            importedCount++;
        }
    });

    loadProductsTable();
    showAlert(`Importación completada: ${importedCount} productos creados, ${updatedCount} actualizados`, 'success');
}

// ============================================================================
// SISTEMA DE ALERTAS
// ============================================================================

function showAlert(message, type = 'info') {
    // Remover alertas existentes
    const existingAlerts = document.querySelectorAll('.alert-notification');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-notification`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    // Agregar icono según el tipo
    const icons = {
        'success': '✅',
        'info': 'ℹ️',
        'warning': '⚠️',
        'danger': '❌'
    };

    const icon = icons[type] || 'ℹ️';

    if (typeof message === 'string') {
        alert.innerHTML = `<strong>${icon}</strong> ${message}`;
    } else {
        alert.innerHTML = `<strong>${icon}</strong> ${message}`;
    }

    document.body.appendChild(alert);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);

    // Permitir cerrar haciendo clic
    alert.addEventListener('click', () => {
        alert.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    });
}

// Agregar CSS para animaciones de alertas
const alertStyles = document.createElement('style');
alertStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .alert-notification {
        border-left: 4px solid currentColor;
        font-weight: 500;
    }
    
    .alert-notification:hover {
        transform: translateX(-5px);
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(alertStyles);

// ============================================================================
// ESTADOS DE CARGA
// ============================================================================

function showLoading(message = 'Cargando...') {
    ProductsApp.isLoading = true;

    // Crear overlay de carga
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: inherit;
    `;

    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div style="margin-top: 20px; font-weight: 600; color: #495057;">${message}</div>
    `;

    document.body.appendChild(overlay);
}

function hideLoading() {
    ProductsApp.isLoading = false;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

window.addEventListener('error', function (e) {
    console.error('Error global:', e.error);
    showAlert('Ha ocurrido un error inesperado. Revisa la consola para más detalles.', 'danger');
});

window.addEventListener('unhandledrejection', function (e) {
    console.error('Promise rechazada:', e.reason);
    showAlert('Error en operación asíncrona. Revisa la consola para más detalles.', 'danger');
});

// ============================================================================
// UTILIDADES ADICIONALES
// ============================================================================

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount, currency = 'CLP') {
    if (amount === null || amount === undefined) return 'N/A';

    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatNumber(number, decimals = 0) {
    if (number === null || number === undefined) return 'N/A';

    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function isEmpty(value) {
    return value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0);
}

// ============================================================================
// CONFIGURACIÓN Y CONSTANTES
// ============================================================================

const CONFIG = {
    DEFAULT_PAGINATION_SIZE: 20,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DEBOUNCE_DELAY: 300,
    AUTO_SAVE_INTERVAL: 30000, // 30 segundos

    VALIDATION_RULES: {
        PRODUCT_CODE: {
            min: 2,
            max: 50,
            pattern: /^[A-Za-z0-9\-_]+$/
        },
        PRODUCT_NAME: {
            min: 3,
            max: 255
        },
        CONVERSION_FACTOR: {
            min: 0.000001,
            max: 999999
        }
    },

    MESSAGES: {
        SAVE_SUCCESS: 'Guardado exitosamente',
        DELETE_CONFIRM: '¿Estás seguro de eliminar este elemento?',
        UNSAVED_CHANGES: 'Tienes cambios sin guardar. ¿Deseas continuar?',
        INVALID_FILE: 'Archivo no válido o demasiado grande',
        NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet.'
    }
};

// ============================================================================
// AUTO-GUARDADO Y RECUPERACIÓN
// ============================================================================

function enableAutoSave() {
    if (CONFIG.AUTO_SAVE_INTERVAL > 0) {
        setInterval(() => {
            if (ProductsApp.currentProduct && hasUnsavedChanges()) {
                autoSaveProduct();
            }
        }, CONFIG.AUTO_SAVE_INTERVAL);
    }
}

function hasUnsavedChanges() {
    if (!ProductsApp.currentProduct) return false;

    const currentFormData = collectProductData();
    const originalData = ProductsApp.currentProduct;

    // Comparación simple - en un caso real sería más sofisticada
    return JSON.stringify(currentFormData) !== JSON.stringify({
        product_code: originalData.product_code,
        product_name: originalData.product_name,
        product_description: originalData.product_description,
        brand: originalData.brand,
        model: originalData.model,
        category_id: originalData.category_id,
        base_measurement_unit_id: originalData.base_measurement_unit_id,
        has_variants: originalData.has_variants,
        has_batch_control: originalData.has_batch_control,
        has_expiry_date: originalData.has_expiry_date,
        has_serial_numbers: originalData.has_serial_numbers,
        has_location_tracking: originalData.has_location_tracking,
        is_active: originalData.is_active
    });
}

function autoSaveProduct() {
    if (!validateProductForm()) return;

    const productData = collectProductData();

    // Guardar en localStorage como respaldo
    localStorage.setItem('product_autosave', JSON.stringify({
        data: productData,
        timestamp: Date.now(),
        productId: ProductsApp.currentProduct.id
    }));

    console.log('Auto-guardado realizado');
}

function recoverAutoSave() {
    const saved = localStorage.getItem('product_autosave');
    if (!saved) return false;

    try {
        const { data, timestamp, productId } = JSON.parse(saved);

        // Solo recuperar si es reciente (menos de 1 hora)
        if (Date.now() - timestamp < 3600000) {
            if (confirm('Se encontró un guardado automático reciente. ¿Deseas recuperarlo?')) {
                // Cargar datos en el formulario
                loadProductDataInForm(data);
                if (productId) {
                    ProductsApp.currentProduct = ProductsApp.data.products.find(p => p.id === productId);
                }
                localStorage.removeItem('product_autosave');
                showAlert('Datos recuperados del auto-guardado', 'success');
                return true;
            }
        }

        // Limpiar guardado antiguo
        localStorage.removeItem('product_autosave');
    } catch (error) {
        console.error('Error recuperando auto-guardado:', error);
        localStorage.removeItem('product_autosave');
    }

    return false;
}

function loadProductDataInForm(data) {
    document.getElementById('product-code').value = data.product_code || '';
    document.getElementById('product-name').value = data.product_name || '';
    document.getElementById('product-description').value = data.product_description || '';
    document.getElementById('product-brand').value = data.brand || '';
    document.getElementById('product-model').value = data.model || '';
    document.getElementById('product-category').value = data.category_id || '';
    document.getElementById('base-unit').value = data.base_measurement_unit_id || '';

    // Checkboxes
    document.getElementById('has-variants').checked = data.has_variants || false;
    document.getElementById('has-batch').checked = data.has_batch_control || false;
    document.getElementById('has-expiry').checked = data.has_expiry_date || false;
    document.getElementById('has-serial').checked = data.has_serial_numbers || false;
    document.getElementById('has-location').checked = data.has_location_tracking || false;
    document.getElementById('is-active').checked = data.is_active !== false;
}

// ============================================================================
// BÚSQUEDA AVANZADA
// ============================================================================

function initializeAdvancedSearch() {
    const searchInput = document.getElementById('search-products');
    if (!searchInput) return;

    let searchResults = [];

    searchInput.addEventListener('input', function () {
        const query = this.value.trim();

        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        searchResults = performAdvancedSearch(query);
        showSearchResults(searchResults, this);
    });

    searchInput.addEventListener('blur', function () {
        // Delay para permitir clicks en resultados
        setTimeout(hideSearchResults, 200);
    });
}

function performAdvancedSearch(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    ProductsApp.data.products.forEach(product => {
        let score = 0;
        let matches = [];

        // Búsqueda en código (mayor peso)
        if (product.product_code.toLowerCase().includes(lowerQuery)) {
            score += 10;
            matches.push('código');
        }

        // Búsqueda en nombre
        if (product.product_name.toLowerCase().includes(lowerQuery)) {
            score += 8;
            matches.push('nombre');
        }

        // Búsqueda en marca
        if (product.brand && product.brand.toLowerCase().includes(lowerQuery)) {
            score += 5;
            matches.push('marca');
        }

        // Búsqueda en modelo
        if (product.model && product.model.toLowerCase().includes(lowerQuery)) {
            score += 5;
            matches.push('modelo');
        }

        // Búsqueda en descripción
        if (product.product_description && product.product_description.toLowerCase().includes(lowerQuery)) {
            score += 3;
            matches.push('descripción');
        }

        // Búsqueda en variantes
        const variants = ProductsApp.data.product_variants.filter(v => v.product_id === product.id);
        variants.forEach(variant => {
            if (variant.variant_sku.toLowerCase().includes(lowerQuery) ||
                variant.variant_name.toLowerCase().includes(lowerQuery)) {
                score += 4;
                matches.push('variante');
            }
        });

        if (score > 0) {
            results.push({
                product,
                score,
                matches: [...new Set(matches)] // Eliminar duplicados
            });
        }
    });

    // Ordenar por score descendente
    return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

function showSearchResults(results, inputElement) {
    hideSearchResults();

    if (results.length === 0) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #e9ecef;
        border-top: none;
        border-radius: 0 0 6px 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
    `;

    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 12px;
            border-bottom: 1px solid #f8f9fa;
            cursor: pointer;
            transition: background 0.2s ease;
        `;

        item.innerHTML = `
            <div style="font-weight: 600; color: #495057;">${result.product.product_code} - ${result.product.product_name}</div>
            <div style="font-size: 0.85em; color: #6c757d; margin-top: 4px;">
                ${result.product.brand || 'Sin marca'} | Coincidencias: ${result.matches.join(', ')}
            </div>
        `;

        item.addEventListener('mouseenter', () => {
            item.style.background = '#f8f9fa';
        });

        item.addEventListener('mouseleave', () => {
            item.style.background = 'white';
        });

        item.addEventListener('click', () => {
            editProduct(result.product.id);
            hideSearchResults();
            inputElement.value = result.product.product_code;
        });

        dropdown.appendChild(item);
    });

    // Posicionar el dropdown
    const inputRect = inputElement.getBoundingClientRect();
    const container = inputElement.parentElement;
    container.style.position = 'relative';
    container.appendChild(dropdown);
}

function hideSearchResults() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

// ============================================================================
// INICIALIZACIÓN FINAL
// ============================================================================

// Inicializar funcionalidades adicionales cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Intentar recuperar auto-guardado
    setTimeout(() => {
        recoverAutoSave();
    }, 1000);

    // Habilitar auto-guardado
    enableAutoSave();

    // Inicializar búsqueda avanzada
    initializeAdvancedSearch();

    // Agregar listener para cambios en formularios
    document.addEventListener('input', function (e) {
        if (e.target.closest('.product-form')) {
            // Marcar como modificado
            ProductsApp.hasChanges = true;
        }
    });

    // Confirmar antes de salir si hay cambios sin guardar
    window.addEventListener('beforeunload', function (e) {
        if (ProductsApp.hasChanges) {
            e.preventDefault();
            e.returnValue = CONFIG.MESSAGES.UNSAVED_CHANGES;
            return CONFIG.MESSAGES.UNSAVED_CHANGES;
        }
    });

    console.log('🎉 Sistema de Gestión de Productos completamente inicializado');
});

// ============================================================================
// EXPORTAR FUNCIONES GLOBALES (para uso en HTML)
// ============================================================================

// Hacer funciones disponibles globalmente para los event handlers en HTML
window.ProductsAppGlobal = {
    clearProductForm,
    editProduct,
    manageVariants,
    editVariant,
    setDefaultVariant,
    viewStock,
    saveVariant,
    cancelVariantEdit,
    toggleVariantStatus,
    activateAllVariants,
    deactivateAllVariants,
    exportProducts,
    importProducts,
    applyFilters,
    showFactorCalculator
};

// Alias para acceso directo
Object.assign(window, window.ProductsAppGlobal);