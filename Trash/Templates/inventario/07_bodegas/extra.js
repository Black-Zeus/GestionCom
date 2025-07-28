/**
 * Gestión de Bodegas - Funciones Adicionales
 * Funcionalidad extendida para formularios, filtros y acciones
 */

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

function saveWarehouse(warehouseId = null) {
    const isEdit = warehouseId !== null;
    
    // Obtener valores del formulario
    const formData = {
        warehouse_code: document.getElementById('warehouse_code').value.trim(),
        warehouse_name: document.getElementById('warehouse_name').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        region: document.getElementById('region').value,
        is_active: document.getElementById('is_active').checked
    };
    
    // Validaciones
    if (!formData.warehouse_code || !formData.warehouse_name || !formData.address || 
        !formData.city || !formData.region) {
        showError('Por favor completa todos los campos obligatorios');
        return;
    }
    
    // Validar código único (solo para nuevas bodegas)
    if (!isEdit) {
        const existingCode = WarehousesApp.data.warehouses.find(w => 
            w.warehouse_code.toLowerCase() === formData.warehouse_code.toLowerCase()
        );
        if (existingCode) {
            showError('El código de bodega ya existe');
            return;
        }
    }
    
    try {
        if (isEdit) {
            // Actualizar bodega existente
            const warehouseIndex = WarehousesApp.data.warehouses.findIndex(w => w.id === warehouseId);
            if (warehouseIndex >= 0) {
                WarehousesApp.data.warehouses[warehouseIndex] = {
                    ...WarehousesApp.data.warehouses[warehouseIndex],
                    ...formData
                };
                showSuccess('Bodega actualizada correctamente');
            }
        } else {
            // Crear nueva bodega
            const newWarehouse = {
                id: Math.max(...WarehousesApp.data.warehouses.map(w => w.id)) + 1,
                ...formData,
                total_products: 0,
                total_value: 0,
                critical_alerts: 0,
                out_of_stock: 0
            };
            WarehousesApp.data.warehouses.push(newWarehouse);
            showSuccess('Bodega creada correctamente');
        }
        
        closeModal();
        
        // Recargar vista
        if (WarehousesApp.currentView === 'grid') {
            loadWarehousesGrid();
        } else if (WarehousesApp.currentView === 'detail' && isEdit) {
            showWarehouseDetail(warehouseId);
        }
        
    } catch (error) {
        console.error('Error guardando bodega:', error);
        showError('Error al guardar la bodega');
    }
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

function viewLocationDetail(stockId) {
    const stockItem = WarehousesApp.data.stock.find(s => s.id === stockId);
    if (!stockItem) {
        showError('Ubicación no encontrada');
        return;
    }
    
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === stockItem.warehouse_id);
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === stockItem.warehouse_zone_id);
    const productName = getProductName(stockItem.product_variant_id);
    const productSKU = getProductSKU(stockItem.product_variant_id);
    const occupancy = calculateOccupancy(stockItem);
    
    const modalContent = `
        <div class="location-detail">
            <div class="detail-meta">
                <div class="meta-item">
                    <span class="meta-label">Ubicación</span>
                    <span class="meta-value">
                        <span class="location-code">${stockItem.location || `${warehouse?.warehouse_code}-${zone?.zone_code || 'SZ'}`}</span>
                    </span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Bodega</span>
                    <span class="meta-value">${warehouse?.warehouse_name || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Zona</span>
                    <span class="meta-value">${zone?.zone_name || 'Sin zona asignada'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Producto</span>
                    <span class="meta-value"><strong>${productName}</strong></span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">SKU</span>
                    <span class="meta-value">${productSKU}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Stock Actual</span>
                    <span class="meta-value"><strong>${formatNumber(stockItem.current_quantity)}</strong></span>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4 style="margin-bottom: 10px;">📊 Información de Stock</h4>
                <div class="detail-meta">
                    <div class="meta-item">
                        <span class="meta-label">Stock Mínimo</span>
                        <span class="meta-value">${formatNumber(stockItem.minimum_stock || 0)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Stock Máximo</span>
                        <span class="meta-value">${formatNumber(stockItem.maximum_stock || 0)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Stock Reservado</span>
                        <span class="meta-value">${formatNumber(stockItem.reserved_quantity || 0)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Stock Disponible</span>
                        <span class="meta-value">${formatNumber((stockItem.current_quantity || 0) - (stockItem.reserved_quantity || 0))}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Costo Unitario</span>
                        <span class="meta-value">${formatCurrency(stockItem.unit_cost || 0)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Valor Total</span>
                        <span class="meta-value">${formatCurrency((stockItem.current_quantity || 0) * (stockItem.unit_cost || 0))}</span>
                    </div>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
                <h4 style="margin-bottom: 10px;">📈 Ocupación de la Ubicación</h4>
                <div class="occupancy-indicator" style="margin-bottom: 10px;">
                    <div class="occupancy-bar" style="height: 12px;">
                        <div class="occupancy-fill ${occupancy.level}" style="width: ${occupancy.percentage}%"></div>
                    </div>
                    <span class="occupancy-percentage" style="font-size: 1.1em; font-weight: 600;">${occupancy.percentage}%</span>
                </div>
                <p style="font-size: 0.9em; color: #6c757d; margin: 0;">
                    ${occupancy.percentage >= 80 ? '🔴 Ocupación alta - Considerar redistribución' :
                      occupancy.percentage >= 50 ? '🟡 Ocupación media - Monitorear espacio' :
                      '🟢 Ocupación baja - Espacio disponible'}
                </p>
            </div>
            
            ${stockItem.last_movement_date ? `
                <div style="margin: 20px 0;">
                    <h4 style="margin-bottom: 10px;">🕒 Información de Movimientos</h4>
                    <div class="detail-meta">
                        <div class="meta-item">
                            <span class="meta-label">Último Movimiento</span>
                            <span class="meta-value">${new Date(stockItem.last_movement_date).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Tipo de Movimiento</span>
                            <span class="meta-value">${stockItem.last_movement_type || 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Última Venta</span>
                            <span class="meta-value">${stockItem.last_sale_date ? new Date(stockItem.last_sale_date).toLocaleDateString('es-CL') : 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Ventas Mensuales Promedio</span>
                            <span class="meta-value">${formatNumber(stockItem.avg_monthly_sales || 0)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Categoría de Rotación</span>
                            <span class="meta-value">
                                <span class="rotation-category rotation-${(stockItem.rotation_category || 'slow').toLowerCase()}">
                                    ${stockItem.rotation_category || 'SLOW'}
                                </span>
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Días hasta Agotamiento</span>
                            <span class="meta-value">${stockItem.days_until_stockout ? Math.round(stockItem.days_until_stockout) + ' días' : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${stockItem.batch_lot_number || stockItem.expiry_date ? `
                <div style="margin: 20px 0;">
                    <h4 style="margin-bottom: 10px;">🏷️ Información de Lote</h4>
                    <div class="detail-meta">
                        ${stockItem.batch_lot_number ? `
                            <div class="meta-item">
                                <span class="meta-label">Número de Lote</span>
                                <span class="meta-value">${stockItem.batch_lot_number}</span>
                            </div>
                        ` : ''}
                        ${stockItem.expiry_date ? `
                            <div class="meta-item">
                                <span class="meta-label">Fecha de Vencimiento</span>
                                <span class="meta-value">${new Date(stockItem.expiry_date).toLocaleDateString('es-CL')}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #495057;">Estado de la Ubicación:</span>
                    <span class="status-badge ${stockItem.current_quantity <= (stockItem.minimum_stock || 0) ? '' : 'status-active'}" 
                          style="${stockItem.current_quantity <= (stockItem.minimum_stock || 0) ? 'background: #f8d7da; color: #721c24;' : ''}">
                        ${stockItem.current_quantity <= (stockItem.minimum_stock || 0) ? '⚠️ STOCK BAJO' : '✅ STOCK OK'}
                    </span>
                </div>
            </div>
        </div>
    `;
    
    showModal(
        `📍 Detalle de Ubicación: ${stockItem.location || `${warehouse?.warehouse_code}-${zone?.zone_code || 'SZ'}`}`,
        modalContent,
        [
            {
                text: 'Cerrar',
                class: 'btn-secondary',
                action: 'closeModal()'
            },
            {
                text: '📊 Ver Movimientos',
                class: 'btn-info',
                action: `showMovementsHistory(${stockId})`
            },
            {
                text: '📋 Copiar Info',
                class: 'btn-primary',
                action: `copyLocationInfo(${stockId})`
            }
        ]
    );
}

function showMovementsHistory(stockId) {
    const stockItem = WarehousesApp.data.stock.find(s => s.id === stockId);
    if (!stockItem) return;
    
    // Buscar movimientos relacionados con este producto y bodega
    const movements = WarehousesApp.data.stock_movements?.filter(m => 
        m.product_variant_id === stockItem.product_variant_id && 
        m.warehouse_id === stockItem.warehouse_id
    ).slice(0, 10) || []; // Últimos 10 movimientos
    
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === stockItem.warehouse_id);
    const productName = getProductName(stockItem.product_variant_id);
    
    const modalContent = `
        <div style="margin-bottom: 20px;">
            <h4>📦 ${productName}</h4>
            <p style="color: #6c757d; margin: 0;">Ubicación: ${warehouse?.warehouse_name} - ${stockItem.location || 'Sin ubicación específica'}</p>
        </div>
        
        ${movements.length > 0 ? `
            <div style="max-height: 400px; overflow-y: auto;">
                ${movements.map(movement => `
                    <div style="border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin-bottom: 10px; background: ${movement.movement_type === 'IN' ? '#f8fff8' : '#fff8f8'};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div>
                                <strong style="color: ${movement.movement_type === 'IN' ? '#28a745' : '#dc3545'};">
                                    ${movement.movement_type === 'IN' ? '📥' : '📤'} ${movement.reference_type}
                                </strong>
                                <div style="font-size: 0.9em; color: #6c757d;">
                                    ${new Date(movement.created_at).toLocaleDateString('es-CL')} - ${movement.created_by_user || 'Sistema'}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.1em; font-weight: 600; color: ${movement.movement_type === 'IN' ? '#28a745' : '#dc3545'};">
                                    ${movement.quantity > 0 ? '+' : ''}${formatNumber(movement.quantity)}
                                </div>
                                <div style="font-size: 0.85em; color: #6c757d;">
                                    Stock: ${formatNumber(movement.quantity_after)}
                                </div>
                            </div>
                        </div>
                        ${movement.notes ? `
                            <div style="font-size: 0.9em; color: #495057; font-style: italic;">
                                ${movement.notes}
                            </div>
                        ` : ''}
                        ${movement.reference_document_id ? `
                            <div style="font-size: 0.85em; color: #6c757d; margin-top: 5px;">
                                Documento: ${movement.reference_document_id}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        ` : `
            <div style="text-align: center; padding: 40px; color: #6c757d;">
                <div style="font-size: 3em; margin-bottom: 15px;">📦</div>
                <h4>No hay movimientos registrados</h4>
                <p>No se encontraron movimientos para este producto en esta ubicación.</p>
            </div>
        `}
    `;
    
    showModal(
        '📊 Historial de Movimientos',
        modalContent,
        [
            {
                text: 'Cerrar',
                class: 'btn-secondary',
                action: 'closeModal()'
            },
            {
                text: '← Volver al Detalle',
                class: 'btn-primary',
                action: `viewLocationDetail(${stockId})`
            }
        ]
    );
}

function copyLocationInfo(stockId) {
    const stockItem = WarehousesApp.data.stock.find(s => s.id === stockId);
    if (!stockItem) return;
    
    const warehouse = WarehousesApp.data.warehouses.find(w => w.id === stockItem.warehouse_id);
    const zone = WarehousesApp.data.warehouse_zones.find(z => z.id === stockItem.warehouse_zone_id);
    const productName = getProductName(stockItem.product_variant_id);
    const productSKU = getProductSKU(stockItem.product_variant_id);
    
    const locationInfo = `
INFORMACIÓN DE UBICACIÓN
========================
Ubicación: ${stockItem.location || `${warehouse?.warehouse_code}-${zone?.zone_code || 'SZ'}`}
Bodega: ${warehouse?.warehouse_name || 'N/A'}
Zona: ${zone?.zone_name || 'Sin zona'}
Producto: ${productName}
SKU: ${productSKU}
Stock Actual: ${formatNumber(stockItem.current_quantity)}
Stock Mínimo: ${formatNumber(stockItem.minimum_stock || 0)}
Stock Disponible: ${formatNumber((stockItem.current_quantity || 0) - (stockItem.reserved_quantity || 0))}
Valor Total: ${formatCurrency((stockItem.current_quantity || 0) * (stockItem.unit_cost || 0))}
Generado: ${new Date().toLocaleString('es-CL')}
    `.trim();
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(locationInfo).then(() => {
            showSuccess('Información copiada al portapapeles');
            closeModal();
        }).catch(() => {
            showError('Error al copiar la información');
        });
    } else {
        // Fallback para navegadores más antiguos
        const textArea = document.createElement('textarea');
        textArea.value = locationInfo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccess('Información copiada al portapapeles');
        closeModal();
    }
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
// LIMPIEZA Y FINALIZACIÓN
// ============================================================================

window.addEventListener('beforeunload', () => {
    console.log('🧹 Limpiando recursos de Gestión de Bodegas - Extra');
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('❌ Error global en Extra JS:', e.error);
    showError('Ha ocurrido un error inesperado en el módulo extendido.');
});

// Exponer funciones adicionales para debugging
if (typeof window !== 'undefined') {
    window.WarehousesExtraDebug = {
        filters: {
            apply: applyFilters,
            clear: clearFilters,
            initialize: initializeFilters
        },
        forms: {
            showWarehouse: showWarehouseForm,
            saveWarehouse: saveWarehouse,
            showZone: showZoneForm,
            saveZone: saveZone
        },
        actions: {
            editWarehouse: editWarehouse,
            activateWarehouse: activateWarehouse,
            deactivateWarehouse: deactivateWarehouse,
            editZone: editZone,
            activateZone: activateZone,
            deactivateZone: deactivateZone
        },
        locations: {
            viewTable: viewLocationsTable,
            renderTable: renderLocationsTable,
            export: exportLocations
        },
        utils: {
            formatNumber: formatNumber,
            formatCurrency: formatCurrency,
            formatCurrencyShort: formatCurrencyShort
        }
    };
}

console.log('✅ Extra JS de Gestión de Bodegas cargado correctamente');