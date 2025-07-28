/**
 * Gestión de Bodegas - Sistema de Control de Inventario
 * Funcionalidad principal para administración de bodegas y ubicaciones
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let WarehousesApp = {
    data: {},
    currentView: 'grid', // 'grid', 'detail', 'locations'
    currentWarehouse: null,
    selectedWarehouse: null,
    filters: {
        search: '',
        region: 'all',
        status: 'all',
        hasAlerts: 'all'
    },
    isLoading: false,
    sortBy: 'name',
    sortOrder: 'asc'
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🏪 Inicializando Gestión de Bodegas');
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingState();
        
        // Cargar datos
        await loadData();
        
        // Inicializar componentes
        initializeEventListeners();
        initializeFilters();
        
        // Cargar vista inicial
        await loadWarehousesGrid();
        
        hideLoadingState();
        
        console.log('✅ Gestión de Bodegas inicializada correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando gestión de bodegas:', error);
        showError('Error cargando el sistema. Por favor, recarga la página.');
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
        
        WarehousesApp.data = await response.json();
        console.log('📊 Datos cargados:', WarehousesApp.data);
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        // Usar datos de fallback si es necesario
        await loadFallbackData();
    }
}

async function loadFallbackData() {
    console.log('⚠️ Usando datos de fallback');
    
    WarehousesApp.data = {
        warehouses: [
            {
                id: 1,
                warehouse_code: "BOD-PRINCIPAL",
                warehouse_name: "Bodega Principal Santiago",
                address: "Av. Libertador Bernardo O'Higgins 1234, Santiago",
                city: "Santiago",
                region: "Metropolitana",
                is_active: true,
                total_products: 1247,
                total_value: 45234567.89,
                critical_alerts: 23,
                out_of_stock: 12
            }
        ],
        warehouse_zones: [],
        stock: [],
        stock_alerts: [],
        products: [],
        product_variants: []
    };
}

// ============================================================================
// VISTA PRINCIPAL - GRID DE BODEGAS
// ============================================================================

async function loadWarehousesGrid() {
    WarehousesApp.currentView = 'grid';
    updateBreadcrumb(['Gestión de Bodegas']);
    
    // Mostrar estadísticas generales
    renderGeneralStats();
    
    // Aplicar filtros y renderizar bodegas
    const filteredWarehouses = applyFilters();
    renderWarehousesGrid(filteredWarehouses);
    
    // Mostrar contadores
    updateResultsCounter(filteredWarehouses.length);
}

function renderGeneralStats() {
    const warehouses = WarehousesApp.data.warehouses || [];
    const totalWarehouses = warehouses.length;
    const activeWarehouses = warehouses.filter(w => w.is_active).length;
    const totalValue = warehouses.reduce((sum, w) => sum + (w.total_value || 0), 0);
    const totalAlerts = warehouses.reduce((sum, w) => sum + (w.critical_alerts || 0), 0);
    
    const statsContainer = document.getElementById('general-stats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon">🏪</div>
            <div class="stat-value">${totalWarehouses}</div>
            <div class="stat-label">Total Bodegas</div>
            <div class="stat-change positive">
                <span>📈 +2 este mes</span>
            </div>
        </div>
        
        <div class="stat-card success">
            <div class="stat-icon" style="color: #28a745;">✅</div>
            <div class="stat-value">${activeWarehouses}</div>
            <div class="stat-label">Bodegas Activas</div>
            <div class="stat-change positive">
                <span>📊 ${Math.round((activeWarehouses/totalWarehouses)*100)}% del total</span>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="stat-icon" style="color: #007bff;">💰</div>
            <div class="stat-value">${formatCurrency(totalValue)}</div>
            <div class="stat-label">Valor Total Inventario</div>
            <div class="stat-change positive">
                <span>📈 +5.2% vs mes anterior</span>
            </div>
        </div>
        
        <div class="stat-card ${totalAlerts > 50 ? 'danger' : totalAlerts > 20 ? 'warning' : 'success'}">
            <div class="stat-icon" style="color: ${totalAlerts > 50 ? '#dc3545' : totalAlerts > 20 ? '#ffc107' : '#28a745'};">⚠️</div>
            <div class="stat-value">${totalAlerts}</div>
            <div class="stat-label">Alertas Activas</div>
            <div class="stat-change ${totalAlerts > 50 ? 'negative' : 'positive'}">
                <span>${totalAlerts > 50 ? '📈 Revisar urgente' : '📉 Bajo control'}</span>
            </div>
        </div>
    `;
}

function renderWarehousesGrid(warehouses) {
    const gridContainer = document.getElementById('warehouses-grid');
    if (!gridContainer) return;
    
    if (warehouses.length === 0) {
        gridContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-icon">🏪</div>
                <h3 class="empty-title">No se encontraron bodegas</h3>
                <p class="empty-message">No hay bodegas que coincidan con los filtros aplicados.</p>
                <div class="empty-actions">
                    <button class="btn btn-primary" onclick="clearFilters()">
                        🔄 Limpiar Filtros
                    </button>
                    <button class="btn btn-success" onclick="showWarehouseForm()">
                        ➕ Nueva Bodega
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    gridContainer.innerHTML = warehouses.map(warehouse => createWarehouseCard(warehouse)).join('');
}

function createWarehouseCard(warehouse) {
    const zones = getWarehouseZones(warehouse.id);
    const zonesCount = zones.length;
    const activeZones = zones.filter(z => z.is_active).length;
    
    const alertsHtml = createAlertsDisplay(warehouse);
    
    return `
        <div class="warehouse-card ${!warehouse.is_active ? 'inactive' : ''}" 
             onclick="showWarehouseDetail(${warehouse.id})">
            
            <div class="warehouse-header">
                <div>
                    <h3 class="warehouse-name">${warehouse.warehouse_name}</h3>
                    <div class="warehouse-code">${warehouse.warehouse_code}</div>
                </div>
                <div class="warehouse-status ${warehouse.is_active ? 'status-active' : 'status-inactive'}">
                    ${warehouse.is_active ? 'ACTIVA' : 'INACTIVA'}
                </div>
            </div>
            
            <div class="warehouse-location">
                <span>📍</span>
                <span>${warehouse.address}</span>
            </div>
            <div class="warehouse-location">
                <span>🌎</span>
                <span>${warehouse.city}, ${warehouse.region}</span>
            </div>
            
            <div class="warehouse-metrics">
                <div class="metric-item">
                    <div class="metric-value">${formatNumber(warehouse.total_products || 0)}</div>
                    <div class="metric-label">Productos</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${zonesCount}</div>
                    <div class="metric-label">Zonas</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${formatCurrencyShort(warehouse.total_value || 0)}</div>
                    <div class="metric-label">Valor Total</div>
                </div>
                <div class="metric-item">
                    <div class="metric-value">${warehouse.out_of_stock || 0}</div>
                    <div class="metric-label">Sin Stock</div>
                </div>
            </div>
            
            ${alertsHtml}
            
            <div class="warehouse-actions" onclick="event.stopPropagation()">
                <button class="action-btn primary" onclick="showWarehouseDetail(${warehouse.id})" title="Ver Detalle">
                    👁️ Ver
                </button>
                <button class="action-btn secondary" onclick="editWarehouse(${warehouse.id})" title="Editar Bodega">
                    ✏️ Editar
                </button>
                <button class="action-btn success" onclick="manageZones(${warehouse.id})" title="Gestionar Zonas">
                    📦 Zonas
                </button>
                ${warehouse.is_active ? 
                    `<button class="action-btn danger" onclick="deactivateWarehouse(${warehouse.id})" title="Desactivar">
                        ❌
                    </button>` :
                    `<button class="action-btn success" onclick="activateWarehouse(${warehouse.id})" title="Activar">
                        ✅
                    </button>`
                }
            </div>
        </div>
    `;
}

function createAlertsDisplay(warehouse) {
    const alerts = [];
    
    if (warehouse.critical_alerts && warehouse.critical_alerts > 0) {
        alerts.push(`
            <span class="alert-badge alert-critical">
                ⚠️ ${warehouse.critical_alerts} Críticas
            </span>
        `);
    }
    
    if (warehouse.out_of_stock && warehouse.out_of_stock > 0) {
        alerts.push(`
            <span class="alert-badge alert-warning">
                📦 ${warehouse.out_of_stock} Sin Stock
            </span>
        `);
    }
    
    if (alerts.length === 0) {
        alerts.push(`
            <span class="alert-badge alert-info">
                ✅ Sin Alertas
            </span>
        `);
    }
    
    return `
        <div class="warehouse-alerts">
            <div class="alert-summary">
                ${alerts.join('')}
            </div>
        </div>
    `;
}

// ============================================================================
// VISTA DETALLADA DE BODEGA
// ============================================================================

function showWarehouseDetail(warehouseId) {
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === warehouseId);
    if (!warehouse) {
        showError('Bodega no encontrada');
        return;
    }
    
    WarehousesApp.currentView = 'detail';
    WarehousesApp.selectedWarehouse = warehouse;
    
    updateBreadcrumb([
        { text: 'Gestión de Bodegas', action: 'loadWarehousesGrid()' },
        warehouse.warehouse_name
    ]);
    
    renderWarehouseDetail(warehouse);
}

function renderWarehouseDetail(warehouse) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    const zones = getWarehouseZones(warehouse.id);
    const stock = getWarehouseStock(warehouse.id);
    
    mainContent.innerHTML = `
        <div class="warehouse-detail">
            <div class="detail-header">
                <div class="detail-info">
                    <h1 class="detail-title">
                        🏪 ${warehouse.warehouse_name}
                        <span class="status-badge ${warehouse.is_active ? 'status-active' : 'status-inactive'}">
                            ${warehouse.is_active ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                    </h1>
                    <p class="detail-subtitle">${warehouse.warehouse_code}</p>
                    
                    <div class="detail-meta">
                        <div class="meta-item">
                            <span class="meta-label">Dirección</span>
                            <span class="meta-value">${warehouse.address}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Ciudad</span>
                            <span class="meta-value">${warehouse.city}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Región</span>
                            <span class="meta-value">${warehouse.region}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Total Productos</span>
                            <span class="meta-value">${formatNumber(warehouse.total_products || 0)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Valor Inventario</span>
                            <span class="meta-value">${formatCurrency(warehouse.total_value || 0)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Alertas Críticas</span>
                            <span class="meta-value">${warehouse.critical_alerts || 0}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-secondary" onclick="loadWarehousesGrid()">
                        ← Volver al Listado
                    </button>
                    <button class="btn btn-primary" onclick="editWarehouse(${warehouse.id})">
                        ✏️ Editar Bodega
                    </button>
                    <button class="btn btn-success" onclick="manageZones(${warehouse.id})">
                        📦 Gestionar Zonas
                    </button>
                    <button class="btn btn-info" onclick="viewLocationsTable(${warehouse.id})">
                        📋 Ver Ubicaciones
                    </button>
                </div>
            </div>
        </div>
        
        <div class="zones-section">
            <div class="zones-header">
                <h2 class="zones-title">🗂️ Zonas de la Bodega (${zones.length})</h2>
                <button class="btn btn-success" onclick="showZoneForm(${warehouse.id})">
                    ➕ Nueva Zona
                </button>
            </div>
            
            <div class="zones-grid" id="zones-grid">
                ${zones.length > 0 ? 
                    zones.map(zone => createZoneCard(zone)).join('') :
                    '<div class="empty-state"><div class="empty-icon">📦</div><h3>No hay zonas configuradas</h3><p>Comienza creando la primera zona para esta bodega.</p></div>'
                }
            </div>
        </div>
        
        ${renderWarehouseStats(warehouse, zones, stock)}
    `;
}

function createZoneCard(zone) {
    const productsInZone = getZoneProducts(zone.id);
    const totalProducts = productsInZone.length;
    const totalValue = calculateZoneValue(zone.id);
    
    return `
        <div class="zone-card ${!zone.is_active ? 'inactive' : ''}">
            <div class="zone-header">
                <div>
                    <h4 class="zone-name">${zone.zone_name}</h4>
                    <div class="zone-code">${zone.zone_code}</div>
                </div>
                <div class="status-badge ${zone.is_active ? 'status-active' : 'status-inactive'}">
                    ${zone.is_active ? 'ACTIVA' : 'INACTIVA'}
                </div>
            </div>
            
            <p class="zone-description">${zone.zone_description || 'Sin descripción'}</p>
            
            <div class="zone-stats">
                <div class="zone-stat">
                    <div class="zone-stat-value">${totalProducts}</div>
                    <div class="zone-stat-label">Productos</div>
                </div>
                <div class="zone-stat">
                    <div class="zone-stat-value">${formatCurrencyShort(totalValue)}</div>
                    <div class="zone-stat-label">Valor</div>
                </div>
            </div>
            
            <div class="zone-actions">
                <button class="action-btn primary" onclick="viewZoneDetail(${zone.id})" title="Ver Detalle">
                    👁️
                </button>
                <button class="action-btn secondary" onclick="editZone(${zone.id})" title="Editar">
                    ✏️
                </button>
                ${zone.is_active ? 
                    `<button class="action-btn danger" onclick="deactivateZone(${zone.id})" title="Desactivar">❌</button>` :
                    `<button class="action-btn success" onclick="activateZone(${zone.id})" title="Activar">✅</button>`
                }
            </div>
        </div>
    `;
}

function renderWarehouseStats(warehouse, zones, stock) {
    const activeZones = zones.filter(z => z.is_active).length;
    const totalStock = stock.reduce((sum, s) => sum + (s.current_quantity || 0), 0);
    const averageRotation = calculateAverageRotation(warehouse.id);
    
    return `
        <div class="warehouse-detail">
            <h3>📊 Estadísticas Detalladas</h3>
            
            <div class="detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Zonas Activas</span>
                    <span class="meta-value">${activeZones} de ${zones.length}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Stock Total</span>
                    <span class="meta-value">${formatNumber(totalStock)} unidades</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Rotación Promedio</span>
                    <span class="meta-value">${averageRotation} días</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Productos Sin Stock</span>
                    <span class="meta-value">${warehouse.out_of_stock || 0}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Alertas Críticas</span>
                    <span class="meta-value">${warehouse.critical_alerts || 0}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Última Actualización</span>
                    <span class="meta-value">${new Date().toLocaleDateString('es-CL')}</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// GESTIÓN DE FORMULARIOS
// ============================================================================

function showWarehouseForm(warehouseId = null) {
    const isEdit = warehouseId !== null;
    const warehouse = isEdit ? WarehousesApp.data.warehouses.find(w => w.id === warehouseId) : null;
    
    const modalContent = `
        <div class="form-section">
            <h4 class="form-section-title">Información General</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="warehouse_code">Código de Bodega *</label>
                    <div class="input-group">
                        <span class="input-icon">🏷️</span>
                        <input type="text" id="warehouse_code" class="form-control input-with-icon" 
                               value="${warehouse?.warehouse_code || ''}" ${isEdit ? 'readonly' : ''} 
                               placeholder="BOD-001" required>
                    </div>
                    <div class="form-help">Código único identificador de la bodega</div>
                </div>
                
                <div class="form-group">
                    <label for="warehouse_name">Nombre de Bodega *</label>
                    <div class="input-group">
                        <span class="input-icon">🏪</span>
                        <input type="text" id="warehouse_name" class="form-control input-with-icon" 
                               value="${warehouse?.warehouse_name || ''}" 
                               placeholder="Bodega Principal" required>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <h4 class="form-section-title">Ubicación</h4>
            <div class="form-grid">
                <div class="form-group form-group-full">
                    <label for="address">Dirección *</label>
                    <div class="input-group">
                        <span class="input-icon">📍</span>
                        <input type="text" id="address" class="form-control input-with-icon" 
                               value="${warehouse?.address || ''}" 
                               placeholder="Av. Principal 123" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="city">Ciudad *</label>
                    <input type="text" id="city" class="form-control" 
                           value="${warehouse?.city || ''}" 
                           placeholder="Santiago" required>
                </div>
                
                <div class="form-group">
                    <label for="region">Región *</label>
                    <select id="region" class="form-control" required>
                        <option value="">Seleccionar región...</option>
                        <option value="Metropolitana" ${warehouse?.region === 'Metropolitana' ? 'selected' : ''}>Metropolitana</option>
                        <option value="Valparaíso" ${warehouse?.region === 'Valparaíso' ? 'selected' : ''}>Valparaíso</option>
                        <option value="Biobío" ${warehouse?.region === 'Biobío' ? 'selected' : ''}>Biobío</option>
                        <option value="La Araucanía" ${warehouse?.region === 'La Araucanía' ? 'selected' : ''}>La Araucanía</option>
                        <option value="Los Lagos" ${warehouse?.region === 'Los Lagos' ? 'selected' : ''}>Los Lagos</option>
                        <option value="Antofagasta" ${warehouse?.region === 'Antofagasta' ? 'selected' : ''}>Antofagasta</option>
                        <option value="Tarapacá" ${warehouse?.region === 'Tarapacá' ? 'selected' : ''}>Tarapacá</option>
                        <option value="Atacama" ${warehouse?.region === 'Atacama' ? 'selected' : ''}>Atacama</option>
                        <option value="Coquimbo" ${warehouse?.region === 'Coquimbo' ? 'selected' : ''}>Coquimbo</option>
                        <option value="O'Higgins" ${warehouse?.region === "O'Higgins" ? 'selected' : ''}>O'Higgins</option>
                        <option value="Maule" ${warehouse?.region === 'Maule' ? 'selected' : ''}>Maule</option>
                        <option value="Ñuble" ${warehouse?.region === 'Ñuble' ? 'selected' : ''}>Ñuble</option>
                        <option value="Los Ríos" ${warehouse?.region === 'Los Ríos' ? 'selected' : ''}>Los Ríos</option>
                        <option value="Aysén" ${warehouse?.region === 'Aysén' ? 'selected' : ''}>Aysén</option>
                        <option value="Magallanes" ${warehouse?.region === 'Magallanes' ? 'selected' : ''}>Magallanes</option>
                        <option value="Arica y Parinacota" ${warehouse?.region === 'Arica y Parinacota' ? 'selected' : ''}>Arica y Parinacota</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="form-section">
            <h4 class="form-section-title">Configuración</h4>
            <div class="checkbox-group">
                <input type="checkbox" id="is_active" ${warehouse?.is_active !== false ? 'checked' : ''}>
                <label for="is_active">Bodega activa</label>
            </div>
            <div class="form-help">Las bodegas inactivas no aparecen en los procesos operativos</div>
        </div>
    `;
    
    showModal(
        `${isEdit ? 'Editar' : 'Nueva'} Bodega`,
        modalContent,
        [
            {
                text: 'Cancelar',
                class: 'btn-secondary',
                action: 'closeModal()'
            },
            {
                text: isEdit ? 'Actualizar' : 'Crear',
                class: 'btn-success',
                action: `saveWarehouse(${warehouseId})`
            }
        ]
    );
}

function showZoneForm(warehouseId, zoneId = null) {
    const isEdit = zoneId !== null;
    const zone = isEdit ? WarehousesApp.data.warehouse_zones.find(z => z.id === zoneId) : null;
    
    const modalContent = `
        <div class="form-section">
            <h4 class="form-section-title">Información de la Zona</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label for="zone_code">Código de Zona *</label>
                    <div class="input-group">
                        <span class="input-icon">🏷️</span>
                        <input type="text" id="zone_code" class="form-control input-with-icon" 
                               value="${zone?.zone_code || ''}" ${isEdit ? 'readonly' : ''} 
                               placeholder="A01" required>
                    </div>
                    <div class="form-help">Código único de la zona (ej: A01, B02)</div>
                </div>
                
                <div class="form-group">
                    <label for="zone_name">Nombre de Zona *</label>
                    <div class="input-group">
                        <span class="input-icon">📦</span>
                        <input type="text" id="zone_name" class="form-control input-with-icon" 
                               value="${zone?.zone_name || ''}" 
                               placeholder="Zona A - Electrónicos" required>
                    </div>
                </div>
            </div>
            
            <div class="form-group form-group-full">
                <label for="zone_description">Descripción</label>
                <textarea id="zone_description" class="form-control" rows="3" 
                          placeholder="Descripción de los productos almacenados en esta zona">${zone?.zone_description || ''}</textarea>
            </div>
            
            <div class="checkbox-group">
                <input type="checkbox" id="zone_is_active" ${zone?.is_active !== false ? 'checked' : ''}>
                <label for="zone_is_active">Zona activa</label>
            </div>
        </div>
    `;
    
    showModal(
        `${isEdit ? 'Editar' : 'Nueva'} Zona`,
        modalContent,
        [
            {
                text: 'Cancelar',
                class: 'btn-secondary',
                action: 'closeModal()'
            },
            {
                text: isEdit ? 'Actualizar' : 'Crear',
                class: 'btn-success',
                action: `saveZone(${warehouseId}, ${zoneId})`
            }
        ]
    );
}

function saveZone(warehouseId, zoneId = null) {
    const isEdit = zoneId !== null;
    
    const formData = {
        warehouse_id: warehouseId,
        zone_code: document.getElementById('zone_code').value.trim(),
        zone_name: document.getElementById('zone_name').value.trim(),
        zone_description: document.getElementById('zone_description').value.trim(),
        is_active: document.getElementById('zone_is_active').checked
    };
    
    // Validaciones
    if (!formData.zone_code || !formData.zone_name) {
        showError('Por favor completa todos los campos obligatorios');
        return;
    }
    
    // Validar código único por bodega
    if (!isEdit) {
        const existingCode = WarehousesApp.data.warehouse_zones.find(z => 
            z.warehouse_id === warehouseId && 
            z.zone_code.toLowerCase() === formData.zone_code.toLowerCase()
        );
        if (existingCode) {
            showError('El código de zona ya existe en esta bodega');
            return;
        }
    }
    
    try {
        if (isEdit) {
            // Actualizar zona existente
            const zoneIndex = WarehousesApp.data.warehouse_zones.findIndex(z => z.id === zoneId);
            if (zoneIndex >= 0) {
                WarehousesApp.data.warehouse_zones[zoneIndex] = {
                    ...WarehousesApp.data.warehouse_zones[zoneIndex],
                    ...formData
                };
                showSuccess('Zona actualizada correctamente');
            }
        } else {
            // Crear nueva zona
            const newZone = {
                id: Math.max(...WarehousesApp.data.warehouse_zones.map(z => z.id), 0) + 1,
                ...formData
            };
            WarehousesApp.data.warehouse_zones.push(newZone);
            showSuccess('Zona creada correctamente');
        }
        
        closeModal();
        
        // Recargar vista detallada
        if (WarehousesApp.selectedWarehouse) {
            showWarehouseDetail(WarehousesApp.selectedWarehouse.id);
        }
        
    } catch (error) {
        console.error('Error guardando zona:', error);
        showError('Error al guardar la zona');
    }
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

function initializeFilters() {
    const searchInput = document.getElementById('search-input');
    const regionFilter = document.getElementById('region-filter');
    const statusFilter = document.getElementById('status-filter');
    const alertsFilter = document.getElementById('alerts-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            WarehousesApp.filters.search = e.target.value.toLowerCase();
            applyFiltersAndReload();
        });
    }
    
    if (regionFilter) {
        regionFilter.addEventListener('change', (e) => {
            WarehousesApp.filters.region = e.target.value;
            applyFiltersAndReload();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            WarehousesApp.filters.status = e.target.value;
            applyFiltersAndReload();
        });
    }
    
    if (alertsFilter) {
        alertsFilter.addEventListener('change', (e) => {
            WarehousesApp.filters.hasAlerts = e.target.value;
            applyFiltersAndReload();
        });
    }
}

function applyFilters() {
    let warehouses = [...WarehousesApp.data.warehouses];
    
    // Filtro de búsqueda
    if (WarehousesApp.filters.search) {
        warehouses = warehouses.filter(w => 
            w.warehouse_name.toLowerCase().includes(WarehousesApp.filters.search) ||
            w.warehouse_code.toLowerCase().includes(WarehousesApp.filters.search) ||
            w.city.toLowerCase().includes(WarehousesApp.filters.search) ||
            w.region.toLowerCase().includes(WarehousesApp.filters.search)
        );
    }
    
    // Filtro por región
    if (WarehousesApp.filters.region !== 'all') {
        warehouses = warehouses.filter(w => w.region === WarehousesApp.filters.region);
    }
    
    // Filtro por estado
    if (WarehousesApp.filters.status !== 'all') {
        const isActive = WarehousesApp.filters.status === 'active';
        warehouses = warehouses.filter(w => w.is_active === isActive);
    }
    
    // Filtro por alertas
    if (WarehousesApp.filters.hasAlerts !== 'all') {
        if (WarehousesApp.filters.hasAlerts === 'with_alerts') {
            warehouses = warehouses.filter(w => (w.critical_alerts || 0) > 0);
        } else if (WarehousesApp.filters.hasAlerts === 'no_alerts') {
            warehouses = warehouses.filter(w => (w.critical_alerts || 0) === 0);
        }
    }
    
    // Aplicar ordenamiento
    warehouses.sort((a, b) => {
        let aValue, bValue;
        
        switch (WarehousesApp.sortBy) {
            case 'name':
                aValue = a.warehouse_name.toLowerCase();
                bValue = b.warehouse_name.toLowerCase();
                break;
            case 'code':
                aValue = a.warehouse_code.toLowerCase();
                bValue = b.warehouse_code.toLowerCase();
                break;
            case 'region':
                aValue = a.region.toLowerCase();
                bValue = b.region.toLowerCase();
                break;
            case 'value':
                aValue = a.total_value || 0;
                bValue = b.total_value || 0;
                break;
            case 'alerts':
                aValue = a.critical_alerts || 0;
                bValue = b.critical_alerts || 0;
                break;
            default:
                aValue = a.warehouse_name.toLowerCase();
                bValue = b.warehouse_name.toLowerCase();
        }
        
        if (WarehousesApp.sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });
    
    return warehouses;
}

function applyFiltersAndReload() {
    if (WarehousesApp.currentView === 'grid') {
        const filteredWarehouses = applyFilters();
        renderWarehousesGrid(filteredWarehouses);
        updateResultsCounter(filteredWarehouses.length);
    }
}

function clearFilters() {
    WarehousesApp.filters = {
        search: '',
        region: 'all',
        status: 'all',
        hasAlerts: 'all'
    };
    
    // Limpiar controles de UI
    const searchInput = document.getElementById('search-input');
    const regionFilter = document.getElementById('region-filter');
    const statusFilter = document.getElementById('status-filter');
    const alertsFilter = document.getElementById('alerts-filter');
    
    if (searchInput) searchInput.value = '';
    if (regionFilter) regionFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    if (alertsFilter) alertsFilter.value = 'all';
    
    applyFiltersAndReload();
    showSuccess('Filtros limpiados');
}

// ============================================================================
// ACCIONES DE BODEGA
// ============================================================================

function editWarehouse(warehouseId) {
    showWarehouseForm(warehouseId);
}

function activateWarehouse(warehouseId) {
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return;
    
    if (confirm(`¿Activar la bodega "${warehouse.warehouse_name}"?`)) {
        warehouse.is_active = true;
        showSuccess('Bodega activada correctamente');
        
        // Recargar vista actual
        if (WarehousesApp.currentView === 'grid') {
            loadWarehousesGrid();
        } else if (WarehousesApp.currentView === 'detail') {
            showWarehouseDetail(warehouseId);
        }
    }
}

function deactivateWarehouse(warehouseId) {
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === warehouseId);
    if (!warehouse) return;
    
    if (confirm(`¿Desactivar la bodega "${warehouse.warehouse_name}"?\n\nEsto impedirá que se realicen operaciones en esta bodega.`)) {
        warehouse.is_active = false;
        showSuccess('Bodega desactivada correctamente');
        
        // Recargar vista actual
        if (WarehousesApp.currentView === 'grid') {
            loadWarehousesGrid();
        } else if (WarehousesApp.currentView === 'detail') {
            showWarehouseDetail(warehouseId);
        }
    }
}

function manageZones(warehouseId) {
    showWarehouseDetail(warehouseId);
}

// ============================================================================
// ACCIONES DE ZONA
// ============================================================================

function editZone(zoneId) {
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    showZoneForm(zone.warehouse_id, zoneId);
}

function activateZone(zoneId) {
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    if (confirm(`¿Activar la zona "${zone.zone_name}"?`)) {
        zone.is_active = true;
        showSuccess('Zona activada correctamente');
        
        if (WarehousesApp.selectedWarehouse) {
            showWarehouseDetail(WarehousesApp.selectedWarehouse.id);
        }
    }
}

function deactivateZone(zoneId) {
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    if (confirm(`¿Desactivar la zona "${zone.zone_name}"?\n\nEsto impedirá asignar nuevos productos a esta zona.`)) {
        zone.is_active = false;
        showSuccess('Zona desactivada correctamente');
        
        if (WarehousesApp.selectedWarehouse) {
            showWarehouseDetail(WarehousesApp.selectedWarehouse.id);
        }
    }
}

function viewZoneDetail(zoneId) {
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    const productsInZone = getZoneProducts(zoneId);
    const totalValue = calculateZoneValue(zoneId);
    
    const modalContent = `
        <div class="zone-detail">
            <div class="detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Código</span>
                    <span class="meta-value">${zone.zone_code}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Estado</span>
                    <span class="meta-value">
                        <span class="status-badge ${zone.is_active ? 'status-active' : 'status-inactive'}">
                            ${zone.is_active ? 'ACTIVA' : 'INACTIVA'}
                        </span>
                    </span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Productos</span>
                    <span class="meta-value">${productsInZone.length}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Valor Total</span>
                    <span class="meta-value">${formatCurrency(totalValue)}</span>
                </div>
            </div>
            
            <div class="form-group">
                <label>Descripción</label>
                <p>${zone.zone_description || 'Sin descripción'}</p>
            </div>
            
            ${productsInZone.length > 0 ? `
                <div class="form-group">
                    <label>Productos en esta Zona</label>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px;">
                        ${productsInZone.map(p => `
                            <div style="padding: 5px 0; border-bottom: 1px solid #f1f3f4;">
                                <strong>${getProductName(p.product_variant_id)}</strong><br>
                                <small>Stock: ${formatNumber(p.current_quantity)} | Ubicación: ${p.location || 'No especificada'}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    showModal(
        `Detalle de Zona: ${zone.zone_name}`,
        modalContent,
        [
            {
                text: 'Cerrar',
                class: 'btn-secondary',
                action: 'closeModal()'
            },
            {
                text: 'Editar',
                class: 'btn-primary',
                action: `editZone(${zoneId})`
            }
        ]
    );
}

// ============================================================================
// VISTA DE UBICACIONES
// ============================================================================

function viewLocationsTable(warehouseId = null) {
    WarehousesApp.currentView = 'locations';
    
    const warehouse = warehouseId ? 
        WarehousesApp.data.warehouses.find(w => w.id === warehouseId) : null;
    
    updateBreadcrumb([
        { text: 'Gestión de Bodegas', action: 'loadWarehousesGrid()' },
        warehouse ? { text: warehouse.warehouse_name, action: `showWarehouseDetail(${warehouseId})` } : null,
        'Tabla de Ubicaciones'
    ].filter(Boolean));
    
    renderLocationsTable(warehouseId);
}

function renderLocationsTable(warehouseId = null) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    const stock = warehouseId ? 
        WarehousesApp.data.stock.filter(s => s.warehouse_id === warehouseId) :
        WarehousesApp.data.stock;
    
    const warehouse = warehouseId ? 
        WarehousesApp.data.warehouses.find(w => w.id === warehouseId) : null;
    
    mainContent.innerHTML = `
        <div class="locations-table">
            <div class="table-header">
                <h2 class="table-title">
                    📋 Tabla de Ubicaciones
                    ${warehouse ? ` - ${warehouse.warehouse_name}` : ''}
                </h2>
                <div class="table-controls">
                    <button class="btn btn-secondary" onclick="${warehouse ? `showWarehouseDetail(${warehouseId})` : 'loadWarehousesGrid()'}">
                        ← Volver
                    </button>
                    <button class="btn btn-success" onclick="exportLocations(${warehouseId})">
                        📊 Exportar
                    </button>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Ubicación</th>
                        <th>Bodega</th>
                        <th>Zona</th>
                        <th>Producto</th>
                        <th>Stock Actual</th>
                        <th>Stock Mínimo</th>
                        <th>Ocupación</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${stock.length > 0 ? stock.map(s => createLocationRow(s)).join('') : 
                        '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">No hay ubicaciones registradas</td></tr>'
                    }
                </tbody>
            </table>
        </div>
    `;
}

function createLocationRow(stockItem) {
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === stockItem.warehouse_id);
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === stockItem.warehouse_zone_id);
    const productName = getProductName(stockItem.product_variant_id);
    const occupancy = calculateOccupancy(stockItem);
    
    return `
        <tr onclick="viewLocationDetail(${stockItem.id})">
            <td>
                <span class="location-code">${stockItem.location || `${warehouse?.warehouse_code}-${zone?.zone_code || 'SZ'}`}</span>
            </td>
            <td>${warehouse?.warehouse_name || 'N/A'}</td>
            <td>${zone?.zone_name || 'Sin zona'}</td>
            <td>
                <strong>${productName}</strong>
                <br><small>${getProductSKU(stockItem.product_variant_id)}</small>
            </td>
            <td>
                <strong>${formatNumber(stockItem.current_quantity)}</strong>
                ${stockItem.reserved_quantity > 0 ? `<br><small>Reservado: ${formatNumber(stockItem.reserved_quantity)}</small>` : ''}
            </td>
            <td>${formatNumber(stockItem.minimum_stock || 0)}</td>
            <td>
                <div class="occupancy-indicator">
                    <div class="occupancy-bar">
                        <div class="occupancy-fill ${occupancy.level}" style="width: ${occupancy.percentage}%"></div>
                    </div>
                    <span class="occupancy-percentage">${occupancy.percentage}%</span>
                </div>
            </td>
            <td>
                ${stockItem.current_quantity <= (stockItem.minimum_stock || 0) ? 
                    '<span class="status-badge" style="background: #f8d7da; color: #721c24;">BAJO</span>' :
                    '<span class="status-badge status-active">OK</span>'
                }
            </td>
        </tr>
    `;
}

function calculateOccupancy(stockItem) {
    const current = stockItem.current_quantity || 0;
    const maximum = stockItem.maximum_stock || 100;
    const percentage = Math.min(Math.round((current / maximum) * 100), 100);
    
    let level = 'low';
    if (percentage >= 80) level = 'high';
    else if (percentage >= 50) level = 'medium';
    
    return { percentage, level };
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function getWarehouseZones(warehouseId) {
    return WarehousesApp.data.warehouse_zones?.filter(z => z.warehouse_id === warehouseId) || [];
}

function getWarehouseStock(warehouseId) {
    return WarehousesApp.data.stock?.filter(s => s.warehouse_id === warehouseId) || [];
}

function getZoneProducts(zoneId) {
    return WarehousesApp.data.stock?.filter(s => s.warehouse_zone_id === zoneId) || [];
}

function calculateZoneValue(zoneId) {
    const products = getZoneProducts(zoneId);
    return products.reduce((sum, p) => sum + ((p.current_quantity || 0) * (p.unit_cost || 0)), 0);
}

function calculateAverageRotation(warehouseId) {
    const stock = getWarehouseStock(warehouseId);
    if (stock.length === 0) return 0;
    
    // Simulación de cálculo de rotación promedio
    const rotations = stock.map(s => s.avg_monthly_sales || 0);
    const avgRotation = rotations.reduce((sum, r) => sum + r, 0) / rotations.length;
    return Math.round(avgRotation || 30);
}

function getProductName(variantId) {
    const variant = WarehousesApp.data.product_variants?.find(v => v.id === variantId);
    if (!variant) return 'Producto desconocido';
    
    const product = WarehousesApp.data.products?.find(p => p.id === variant.product_id);
    return product?.product_name || variant.variant_name || 'Producto desconocido';
}

function getProductSKU(variantId) {
    const variant = WarehousesApp.data.product_variants?.find(v => v.id === variantId);
    return variant?.variant_sku || 'SKU-N/A';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initializeEventListeners() {
    // Alternar filtros
    const filtersToggle = document.getElementById('filters-toggle');
    if (filtersToggle) {
        filtersToggle.addEventListener('click', toggleFilters);
    }
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', (e) => {
        // Ctrl+N para nueva bodega
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            showWarehouseForm();
        }
        
        // F5 o Ctrl+R para recargar
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            location.reload();
        }
        
        // Escape para cerrar modales
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function toggleFilters() {
    const filtersContent = document.querySelector('.filters-content');
    const filtersToggle = document.getElementById('filters-toggle');
    
    if (filtersContent && filtersToggle) {
        filtersContent.classList.toggle('collapsed');
        filtersToggle.textContent = filtersContent.classList.contains('collapsed') ? 
            '👁️ Mostrar Filtros' : '🙈 Ocultar Filtros';
    }
}

// ============================================================================
// UTILIDADES UI
// ============================================================================

function updateBreadcrumb(items) {
    const breadcrumbNav = document.querySelector('.breadcrumb-nav .breadcrumb');
    if (!breadcrumbNav) return;
    
    breadcrumbNav.innerHTML = items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isObject = typeof item === 'object';
        
        return `
            <li class="${isLast ? 'active' : ''}">
                ${!isLast && isObject ? 
                    `<a href="javascript:void(0)" onclick="${item.action}">${item.text}</a>` :
                    !isLast && !isObject ?
                    `<a href="javascript:void(0)" onclick="${item}">${item}</a>` :
                    isObject ? item.text : item
                }
                ${!isLast ? '<span class="breadcrumb-separator">›</span>' : ''}
            </li>
        `;
    }).join('');
}

function updateResultsCounter(count) {
    const counter = document.getElementById('results-counter');
    if (counter) {
        const total = WarehousesApp.data.warehouses.length;
        counter.textContent = `Mostrando ${count} de ${total} bodegas`;
    }
}

// ============================================================================
// ESTADOS Y NOTIFICACIONES
// ============================================================================

function showLoadingState() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    WarehousesApp.isLoading = true;
    
    mainContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 400px;">
            <div style="text-align: center;">
                <div class="loading-skeleton skeleton-card" style="width: 200px; margin-bottom: 20px;"></div>
                <h3>Cargando Gestión de Bodegas...</h3>
                <p style="color: #6c757d;">Obteniendo información de bodegas y ubicaciones</p>
            </div>
        </div>
    `;
}

function hideLoadingState() {
    WarehousesApp.isLoading = false;
}

function showError(message) {
    createToast('error', 'Error', message);
}

function showSuccess(message) {
    createToast('success', 'Éxito', message);
}

function createToast(type, title, message) {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
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
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ============================================================================
// MODALES
// ============================================================================

function showModal(title, content, actions = []) {
    let modal = document.getElementById('warehouse-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'warehouse-modal';
        modal.className = 'modal form-modal';
        document.body.appendChild(modal);
    }
    
    const defaultActions = [
        {
            text: 'Cerrar',
            class: 'btn-secondary',
            action: 'closeModal()'
        }
    ];
    
    const modalActions = actions.length > 0 ? actions : defaultActions;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-actions">
                ${modalActions.map(action => 
                    `<button class="btn ${action.class}" onclick="${action.action}">${action.text}</button>`
                ).join('')}
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('warehouse-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ============================================================================
// EXPORTACIÓN
// ============================================================================

function exportLocations(warehouseId = null) {
    const stock = warehouseId ? 
        WarehousesApp.data.stock.filter(s => s.warehouse_id === warehouseId) :
        WarehousesApp.data.stock;
    
    const headers = ['Ubicación', 'Bodega', 'Zona', 'Producto', 'SKU', 'Stock Actual', 'Stock Mínimo', 'Stock Máximo', 'Estado'];
    
    const rows = stock.map(s => {
        const warehouse = WarehousesApp.data.warehouses.find(w => w.id === s.warehouse_id);
        const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === s.warehouse_zone_id);
        const productName = getProductName(s.product_variant_id);
        const productSKU = getProductSKU(s.product_variant_id);
        const status = s.current_quantity <= (s.minimum_stock || 0) ? 'BAJO' : 'OK';
        
        return [
            s.location || `${warehouse?.warehouse_code}-${zone?.zone_code || 'SZ'}`,
            warehouse?.warehouse_name || 'N/A',
            zone?.zone_name || 'Sin zona',
            productName,
            productSKU,
            s.current_quantity || 0,
            s.minimum_stock || 0,
            s.maximum_stock || 0,
            status
        ];
    });
    
    const csvData = [headers, ...rows].map(row => row.join(',')).join('\n');
    const filename = warehouseId ? 
        `ubicaciones_${WarehousesApp.data.warehouses.find(w => w.id === warehouseId)?.warehouse_code}_${new Date().toISOString().split('T')[0]}.csv` :
        `ubicaciones_todas_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csvData, filename);
    showSuccess('Reporte de ubicaciones exportado correctamente');
}

function downloadCSV(csvData, filename) {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

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

function formatCurrencyShort(amount) {
    if (amount >= 1000000000) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount / 1000000000) + 'B';
    } else if (amount >= 1000000) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount / 1000000) + 'M';
    } else if (amount >= 1000) {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount / 1000) + 'K';
    }
    return formatCurrency(amount);
}

// ============================================================================
// FUNCIONES DE NAVEGACIÓN
// ============================================================================

function goToInventoryDashboard() {
    window.location.href = '../dashboard/';
}

function goToStockConsultation() {
    window.location.href = '../consulta-stock/';
}

function goToMovements() {
    window.location.href = '../movimientos/';
}

function goToAlerts() {
    window.location.href = '../alertas/';
}

// ============================================================================
// FUNCIONES DE DEPURACIÓN
// ============================================================================

function debugWarehousesInfo() {
    console.log('🐛 Información de depuración - Gestión de Bodegas:');
    console.log('- Datos cargados:', WarehousesApp.data);
    console.log('- Vista actual:', WarehousesApp.currentView);
    console.log('- Bodega seleccionada:', WarehousesApp.selectedWarehouse);
    console.log('- Filtros aplicados:', WarehousesApp.filters);
    console.log('- Estado de carga:', WarehousesApp.isLoading);
    console.log('- Total bodegas:', WarehousesApp.data.warehouses?.length || 0);
    console.log('- Total zonas:', WarehousesApp.data.warehouse_zones?.length || 0);
}
