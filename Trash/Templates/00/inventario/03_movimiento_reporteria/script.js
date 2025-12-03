/**
 * Movimientos de Inventario (Reportería) - Sistema de Inventario
 * Funcionalidad para análisis y consulta de movimientos históricos
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let MovementsApp = {
    data: {},
    currentPage: 1,
    itemsPerPage: 50,
    totalItems: 0,
    filteredData: [],
    groupedData: {},
    filters: {
        dateFrom: '',
        dateTo: '',
        movementType: '',
        warehouse: '',
        user: '',
        product: '',
        search: ''
    }
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Movimientos de Inventario');
    initializeApp();
});

async function initializeApp() {
    try {
        // Cargar datos
        await loadData();
        
        // Inicializar componentes
        initializeFilters();
        initializeDateRanges();
        initializeEventListeners();
        
        // Cargar datos iniciales
        loadMovementsData();
        
        console.log('✅ Movimientos de Inventario inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando movimientos:', error);
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
        
        MovementsApp.data = await response.json();
        console.log('📊 Datos cargados:', MovementsApp.data);
        
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
    populateUserFilter();
    populateMovementTypeFilter();
}

function initializeDateRanges() {
    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Establecer rango por defecto (última semana)
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    
    if (dateFromInput) {
        dateFromInput.value = oneWeekAgo.toISOString().split('T')[0];
        MovementsApp.filters.dateFrom = dateFromInput.value;
    }
    
    if (dateToInput) {
        dateToInput.value = today.toISOString().split('T')[0];
        MovementsApp.filters.dateTo = dateToInput.value;
    }
}

function populateWarehouseFilter() {
    const select = document.getElementById('warehouse-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todas las bodegas</option>';
    
    MovementsApp.data.warehouses.forEach(warehouse => {
        if (warehouse.is_active) {
            const option = document.createElement('option');
            option.value = warehouse.id;
            option.textContent = warehouse.warehouse_name;
            select.appendChild(option);
        }
    });
}

function populateUserFilter() {
    const select = document.getElementById('user-filter');
    if (!select) return;
    
    select.innerHTML = '<option value="">Todos los usuarios</option>';
    
    // Obtener usuarios únicos de los movimientos
    const users = [...new Set(MovementsApp.data.stock_movements
        .map(m => m.created_by_user_id)
        .filter(Boolean)
    )];
    
    users.forEach(userId => {
        const user = MovementsApp.data.users.find(u => u.id === userId);
        if (user) {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.first_name} ${user.last_name}`;
            select.appendChild(option);
        }
    });
}

function populateMovementTypeFilter() {
    const select = document.getElementById('movement-type-filter');
    if (!select) return;
    
    select.innerHTML = `
        <option value="">Todos los tipos</option>
        <option value="IN">Entradas</option>
        <option value="OUT">Salidas</option>
        <option value="TRANSFER">Transferencias</option>
        <option value="ADJUSTMENT">Ajustes</option>
    `;
}

function applyFilters() {
    // Obtener valores de filtros
    MovementsApp.filters = {
        dateFrom: document.getElementById('date-from')?.value || '',
        dateTo: document.getElementById('date-to')?.value || '',
        movementType: document.getElementById('movement-type-filter')?.value || '',
        warehouse: document.getElementById('warehouse-filter')?.value || '',
        user: document.getElementById('user-filter')?.value || '',
        product: document.getElementById('product-filter')?.value || '',
        search: document.getElementById('search-input')?.value.toLowerCase().trim() || ''
    };
    
    // Validar fechas
    if (MovementsApp.filters.dateFrom && MovementsApp.filters.dateTo) {
        if (new Date(MovementsApp.filters.dateFrom) > new Date(MovementsApp.filters.dateTo)) {
            showError('La fecha de inicio no puede ser mayor que la fecha de fin');
            return;
        }
    }
    
    // Resetear paginación
    MovementsApp.currentPage = 1;
    
    // Recargar datos
    loadMovementsData();
    
    console.log('🔍 Filtros aplicados:', MovementsApp.filters);
}

function clearFilters() {
    // Limpiar controles de filtro (excepto fechas)
    document.getElementById('movement-type-filter').value = '';
    document.getElementById('warehouse-filter').value = '';
    document.getElementById('user-filter').value = '';
    document.getElementById('product-filter').value = '';
    document.getElementById('search-input').value = '';
    
    // Mantener rango de fechas por defecto
    initializeDateRanges();
    
    // Aplicar filtros
    applyFilters();
    
    showSuccess('Filtros limpiados correctamente');
}

// ============================================================================
// CARGA Y PROCESAMIENTO DE MOVIMIENTOS
// ============================================================================

function loadMovementsData() {
    try {
        showTimelineLoading();
        
        // Preparar datos de movimientos
        const movementsData = prepareMovementsData();
        
        // Aplicar filtros
        MovementsApp.filteredData = applyMovementFilters(movementsData);
        
        // Agrupar por fecha
        MovementsApp.groupedData = groupMovementsByDate(MovementsApp.filteredData);
        
        // Actualizar totales
        MovementsApp.totalItems = MovementsApp.filteredData.length;
        
        // Renderizar componentes
        renderPeriodSummary();
        renderTrendsChart();
        renderTimeline();
        updateTimelineInfo();
        updatePagination();
        
        hideTimelineLoading();
        
    } catch (error) {
        console.error('❌ Error cargando movimientos:', error);
        showError('Error cargando datos de movimientos');
        hideTimelineLoading();
    }
}

function prepareMovementsData() {
    const movementsData = [];
    
    MovementsApp.data.stock_movements.forEach(movement => {
        // Obtener datos relacionados
        const variant = getVariantById(movement.product_variant_id);
        const product = variant ? getProductById(variant.product_id) : null;
        const warehouse = getWarehouseById(movement.warehouse_id);
        const zone = movement.warehouse_zone_id ? getZoneById(movement.warehouse_zone_id) : null;
        const user = getUserById(movement.created_by_user_id);
        
        if (product && variant && warehouse) {
            movementsData.push({
                id: movement.id,
                product_variant_id: movement.product_variant_id,
                warehouse_id: movement.warehouse_id,
                movement_type: movement.movement_type,
                reference_type: movement.reference_type,
                reference_document_id: movement.reference_document_id,
                quantity: movement.quantity,
                quantity_before: movement.quantity_before,
                quantity_after: movement.quantity_after,
                unit_cost: movement.unit_cost || 0,
                total_cost: movement.total_cost || 0,
                batch_lot_number: movement.batch_lot_number,
                expiry_date: movement.expiry_date,
                serial_number: movement.serial_number,
                notes: movement.notes,
                created_by_user_id: movement.created_by_user_id,
                created_at: movement.created_at,
                
                // Datos expandidos
                product_code: product.product_code,
                product_name: product.product_name,
                variant_name: variant.variant_name,
                variant_sku: variant.variant_sku,
                brand: product.brand || 'Sin marca',
                warehouse_name: warehouse.warehouse_name,
                warehouse_zone: zone ? zone.zone_name : 'Sin zona',
                user_name: user ? `${user.first_name} ${user.last_name}` : 'Usuario desconocido',
                
                // Campos calculados
                movement_date: movement.created_at.split('T')[0],
                movement_time: movement.created_at.split('T')[1]?.split('.')[0] || '',
                abs_quantity: Math.abs(movement.quantity),
                quantity_sign: movement.quantity >= 0 ? '+' : '',
                movement_description: getMovementDescription(movement)
            });
        }
    });
    
    // Ordenar por fecha descendente
    return movementsData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function applyMovementFilters(data) {
    return data.filter(movement => {
        // Filtro por rango de fechas
        if (MovementsApp.filters.dateFrom && movement.movement_date < MovementsApp.filters.dateFrom) {
            return false;
        }
        if (MovementsApp.filters.dateTo && movement.movement_date > MovementsApp.filters.dateTo) {
            return false;
        }
        
        // Filtro por tipo de movimiento
        if (MovementsApp.filters.movementType && movement.movement_type !== MovementsApp.filters.movementType) {
            return false;
        }
        
        // Filtro por bodega
        if (MovementsApp.filters.warehouse && movement.warehouse_id != MovementsApp.filters.warehouse) {
            return false;
        }
        
        // Filtro por usuario
        if (MovementsApp.filters.user && movement.created_by_user_id != MovementsApp.filters.user) {
            return false;
        }
        
        // Filtro por búsqueda general
        if (MovementsApp.filters.search) {
            const searchText = MovementsApp.filters.search;
            const searchFields = [
                movement.product_name,
                movement.product_code,
                movement.variant_sku,
                movement.brand,
                movement.warehouse_name,
                movement.user_name,
                movement.notes || '',
                movement.reference_document_id || '',
                movement.batch_lot_number || '',
                movement.serial_number || ''
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchText)) {
                return false;
            }
        }
        
        return true;
    });
}

function groupMovementsByDate(movements) {
    const grouped = {};
    
    movements.forEach(movement => {
        const date = movement.movement_date;
        if (!grouped[date]) {
            grouped[date] = {
                date: date,
                movements: [],
                summary: {
                    total_in: 0,
                    total_out: 0,
                    total_adjustments: 0,
                    total_transfers: 0,
                    count: 0
                }
            };
        }
        
        grouped[date].movements.push(movement);
        grouped[date].summary.count++;
        
        // Actualizar resumen
        if (movement.movement_type === 'IN') {
            grouped[date].summary.total_in += movement.abs_quantity;
        } else if (movement.movement_type === 'OUT') {
            grouped[date].summary.total_out += movement.abs_quantity;
        } else if (movement.movement_type === 'TRANSFER') {
            grouped[date].summary.total_transfers += movement.abs_quantity;
        } else if (movement.movement_type === 'ADJUSTMENT') {
            grouped[date].summary.total_adjustments += movement.abs_quantity;
        }
    });
    
    return grouped;
}

// ============================================================================
// RENDERIZADO DE COMPONENTES
// ============================================================================

function renderPeriodSummary() {
    const container = document.getElementById('period-summary');
    if (!container) return;
    
    const summary = calculatePeriodSummary();
    
    container.innerHTML = `
        <div class="summary-card entries">
            <div class="summary-icon">📥</div>
            <div class="summary-header">
                <h4 class="summary-title">Entradas</h4>
            </div>
            <div class="summary-value">${formatNumber(summary.total_in)}</div>
            <p class="summary-subtitle">${summary.in_movements} movimientos</p>
            <div class="summary-trend trend-up">
                <span>↗️ +${summary.in_percentage}%</span>
                <span>del período</span>
            </div>
        </div>
        
        <div class="summary-card exits">
            <div class="summary-icon">📤</div>
            <div class="summary-header">
                <h4 class="summary-title">Salidas</h4>
            </div>
            <div class="summary-value">${formatNumber(summary.total_out)}</div>
            <p class="summary-subtitle">${summary.out_movements} movimientos</p>
            <div class="summary-trend trend-down">
                <span>↘️ ${summary.out_percentage}%</span>
                <span>del período</span>
            </div>
        </div>
        
        <div class="summary-card transfers">
            <div class="summary-icon">🔄</div>
            <div class="summary-header">
                <h4 class="summary-title">Transferencias</h4>
            </div>
            <div class="summary-value">${formatNumber(summary.total_transfers)}</div>
            <p class="summary-subtitle">${summary.transfer_movements} movimientos</p>
            <div class="summary-trend trend-neutral">
                <span>→ ${summary.transfer_percentage}%</span>
                <span>del período</span>
            </div>
        </div>
        
        <div class="summary-card adjustments">
            <div class="summary-icon">⚖️</div>
            <div class="summary-header">
                <h4 class="summary-title">Ajustes</h4>
            </div>
            <div class="summary-value">${formatNumber(summary.total_adjustments)}</div>
            <p class="summary-subtitle">${summary.adjustment_movements} movimientos</p>
            <div class="summary-trend trend-neutral">
                <span>→ ${summary.adjustment_percentage}%</span>
                <span>del período</span>
            </div>
        </div>
    `;
    
    // Animar cards
    setTimeout(() => {
        container.querySelectorAll('.summary-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fade-in-up');
            }, index * 100);
        });
    }, 100);
}

function calculatePeriodSummary() {
    const summary = {
        total_in: 0,
        total_out: 0,
        total_transfers: 0,
        total_adjustments: 0,
        in_movements: 0,
        out_movements: 0,
        transfer_movements: 0,
        adjustment_movements: 0
    };
    
    MovementsApp.filteredData.forEach(movement => {
        if (movement.movement_type === 'IN') {
            summary.total_in += movement.abs_quantity;
            summary.in_movements++;
        } else if (movement.movement_type === 'OUT') {
            summary.total_out += movement.abs_quantity;
            summary.out_movements++;
        } else if (movement.movement_type === 'TRANSFER') {
            summary.total_transfers += movement.abs_quantity;
            summary.transfer_movements++;
        } else if (movement.movement_type === 'ADJUSTMENT') {
            summary.total_adjustments += movement.abs_quantity;
            summary.adjustment_movements++;
        }
    });
    
    const totalMovements = MovementsApp.filteredData.length;
    
    summary.in_percentage = totalMovements > 0 ? Math.round((summary.in_movements / totalMovements) * 100) : 0;
    summary.out_percentage = totalMovements > 0 ? Math.round((summary.out_movements / totalMovements) * 100) : 0;
    summary.transfer_percentage = totalMovements > 0 ? Math.round((summary.transfer_movements / totalMovements) * 100) : 0;
    summary.adjustment_percentage = totalMovements > 0 ? Math.round((summary.adjustment_movements / totalMovements) * 100) : 0;
    
    return summary;
}

function renderTrendsChart() {
    const container = document.getElementById('trends-chart');
    if (!container) return;
    
    const chartData = calculateChartData();
    
    container.innerHTML = `
        <div class="chart-header">
            <h4 class="chart-title">📈 Tendencias del Período</h4>
            <div class="chart-period">${getFilterPeriodText()}</div>
        </div>
        <div class="chart-placeholder">
            <div style="text-align: center;">
                <div style="font-size: 2em; margin-bottom: 10px;">📊</div>
                <div>Gráfico de tendencias diarias</div>
                <div style="font-size: 0.9em; opacity: 0.8; margin-top: 5px;">
                    Entradas vs Salidas por día
                </div>
            </div>
        </div>
        <div class="chart-stats">
            <div class="chart-stat">
                <div class="chart-stat-value color-in">${formatNumber(chartData.avg_in)}</div>
                <div class="chart-stat-label">Promedio Entradas</div>
            </div>
            <div class="chart-stat">
                <div class="chart-stat-value color-out">${formatNumber(chartData.avg_out)}</div>
                <div class="chart-stat-label">Promedio Salidas</div>
            </div>
            <div class="chart-stat">
                <div class="chart-stat-value">${formatNumber(chartData.net_avg)}</div>
                <div class="chart-stat-label">Movimiento Neto</div>
            </div>
        </div>
    `;
}

function calculateChartData() {
    const dailyData = Object.values(MovementsApp.groupedData);
    const totalDays = dailyData.length || 1;
    
    const totalIn = dailyData.reduce((sum, day) => sum + day.summary.total_in, 0);
    const totalOut = dailyData.reduce((sum, day) => sum + day.summary.total_out, 0);
    
    return {
        avg_in: Math.round(totalIn / totalDays),
        avg_out: Math.round(totalOut / totalDays),
        net_avg: Math.round((totalIn - totalOut) / totalDays)
    };
}

function renderTimeline() {
    const container = document.getElementById('timeline-content');
    if (!container) return;
    
    const dates = Object.keys(MovementsApp.groupedData).sort((a, b) => new Date(b) - new Date(a));
    
    if (dates.length === 0) {
        container.innerHTML = `
            <div class="timeline-empty">
                <div class="empty-icon">📦</div>
                <h4>No se encontraron movimientos</h4>
                <p>Ajusta los filtros para ver más resultados</p>
            </div>
        `;
        return;
    }
    
    // Calcular paginación por días
    const startIndex = (MovementsApp.currentPage - 1) * 7; // 7 días por página
    const endIndex = startIndex + 7;
    const pageDates = dates.slice(startIndex, endIndex);
    
    const timelineHtml = pageDates.map(date => {
        const dayData = MovementsApp.groupedData[date];
        return createDayGroup(dayData);
    }).join('');
    
    container.innerHTML = timelineHtml;
    
    // Agregar event listeners
    container.querySelectorAll('.movement-item').forEach(item => {
        item.addEventListener('click', () => {
            const movementId = parseInt(item.dataset.movementId);
            showMovementDetail(movementId);
        });
    });
}

function createDayGroup(dayData) {
    const date = new Date(dayData.date);
    const formattedDate = date.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const movementsHtml = dayData.movements.map(movement => createMovementItem(movement)).join('');
    
    return `
        <div class="timeline-day-group">
            <div class="day-header">
                <div class="day-header-content">
                    <div class="day-date">${formattedDate}</div>
                    <div class="day-summary">
                        <div class="day-stat">
                            <span style="color: #28a745;">📥 ${formatNumber(dayData.summary.total_in)}</span>
                        </div>
                        <div class="day-stat">
                            <span style="color: #dc3545;">📤 ${formatNumber(dayData.summary.total_out)}</span>
                        </div>
                        <div class="day-stat">
                            <span style="color: #6c757d;">${dayData.summary.count} movimientos</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="day-movements">
                ${movementsHtml}
            </div>
        </div>
    `;
}

function createMovementItem(movement) {
    const iconMap = {
        'IN': { icon: '📥', class: 'movement-in' },
        'OUT': { icon: '📤', class: 'movement-out' },
        'TRANSFER': { icon: '🔄', class: 'movement-transfer' },
        'ADJUSTMENT': { icon: '⚖️', class: 'movement-adjustment' }
    };
    
    const movementIcon = iconMap[movement.movement_type] || { icon: '📦', class: 'movement-in' };
    const quantityClass = movement.quantity >= 0 ? 'positive' : 'negative';
    
    return `
        <div class="movement-item" data-movement-id="${movement.id}">
            <div class="movement-icon ${movementIcon.class}">
                ${movementIcon.icon}
            </div>
            <div class="movement-details">
                <div class="movement-header">
                    <div class="movement-type">${getMovementTypeText(movement.reference_type)}</div>
                    <div class="movement-time">${movement.movement_time}</div>
                </div>
                <div class="movement-product">${movement.product_name}</div>
                <div class="movement-info">
                    <div class="movement-info-item">
                        <span>SKU:</span> ${movement.variant_sku}
                    </div>
                    <div class="movement-info-item">
                        <span>📍</span> ${movement.warehouse_name}
                    </div>
                    <div class="movement-info-item">
                        <span>👤</span> ${movement.user_name}
                    </div>
                    ${movement.reference_document_id ? `
                    <div class="movement-info-item">
                        <span>📄</span> Doc: ${movement.reference_document_id}
                    </div>
                    ` : ''}
                    ${movement.batch_lot_number ? `
                    <div class="movement-info-item">
                        <span class="movement-badge">Lote: ${movement.batch_lot_number}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="movement-quantity">
                <div class="quantity-value ${quantityClass}">
                    ${movement.quantity_sign}${formatNumber(movement.abs_quantity)}
                </div>
                <div class="quantity-unit">unidades</div>
                ${movement.total_cost ? `
                <div class="movement-value">${formatCurrency(Math.abs(movement.total_cost))}</div>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================================
// MODAL DE DETALLE
// ============================================================================

function showMovementDetail(movementId) {
    const movement = MovementsApp.filteredData.find(m => m.id === movementId);
    if (!movement) {
        showError('No se pudo cargar el detalle del movimiento');
        return;
    }
    
    const modalContent = createMovementDetailModal(movement);
    showModal('Detalle de Movimiento', modalContent, 'movement-detail-modal');
    
    console.log(`👁️ Mostrando detalle del movimiento: ${movement.id}`);
}

function createMovementDetailModal(movement) {
    const iconMap = {
        'IN': { icon: '📥', class: 'movement-in' },
        'OUT': { icon: '📤', class: 'movement-out' },
        'TRANSFER': { icon: '🔄', class: 'movement-transfer' },
        'ADJUSTMENT': { icon: '⚖️', class: 'movement-adjustment' }
    };
    
    const movementIcon = iconMap[movement.movement_type] || { icon: '📦', class: 'movement-in' };
    
    return `
        <div class="movement-detail-header">
            <div class="movement-detail-icon ${movementIcon.class}">
                ${movementIcon.icon}
            </div>
            <div class="movement-detail-info">
                <h3 class="movement-detail-title">
                    ${getMovementTypeText(movement.reference_type)} - ${movement.product_name}
                </h3>
                <div class="movement-detail-subtitle">
                    ${formatDateTime(movement.created_at)} | SKU: ${movement.variant_sku}
                </div>
            </div>
        </div>
        
        <div class="movement-detail-grid">
            <div class="detail-section">
                <h4>Información del Movimiento</h4>
                <table class="detail-table">
                    <tr>
                        <td>Tipo de movimiento:</td>
                        <td><span class="status-badge status-completed">${getMovementTypeText(movement.movement_type)}</span></td>
                    </tr>
                    <tr>
                        <td>Tipo de referencia:</td>
                        <td>${getMovementTypeText(movement.reference_type)}</td>
                    </tr>
                    <tr>
                        <td>Cantidad:</td>
                        <td><strong>${movement.quantity_sign}${formatNumber(movement.abs_quantity)} unidades</strong></td>
                    </tr>
                    <tr>
                        <td>Stock anterior:</td>
                        <td>${formatNumber(movement.quantity_before)}</td>
                    </tr>
                    <tr>
                        <td>Stock posterior:</td>
                        <td>${formatNumber(movement.quantity_after)}</td>
                    </tr>
                    <tr>
                        <td>Fecha y hora:</td>
                        <td>${formatDateTime(movement.created_at)}</td>
                    </tr>
                    ${movement.reference_document_id ? `
                    <tr>
                        <td>Documento:</td>
                        <td><a href="#" class="document-link">${movement.reference_document_id}</a></td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            <div class="detail-section">
                <h4>Ubicación y Usuario</h4>
                <table class="detail-table">
                    <tr>
                        <td>Bodega:</td>
                        <td>${movement.warehouse_name}</td>
                    </tr>
                    <tr>
                        <td>Zona:</td>
                        <td>${movement.warehouse_zone}</td>
                    </tr>
                    <tr>
                        <td>Usuario:</td>
                        <td>${movement.user_name}</td>
                    </tr>
                    ${movement.unit_cost ? `
                    <tr>
                        <td>Costo unitario:</td>
                        <td>${formatCurrency(movement.unit_cost)}</td>
                    </tr>
                    ` : ''}
                    ${movement.total_cost ? `
                    <tr>
                        <td>Costo total:</td>
                        <td><strong>${formatCurrency(Math.abs(movement.total_cost))}</strong></td>
                    </tr>
                    ` : ''}
                </table>
            </div>
        </div>
        
        ${(movement.batch_lot_number || movement.serial_number || movement.expiry_date || movement.notes) ? `
        <div class="detail-section" style="grid-column: 1 / -1;">
            <h4>Información Adicional</h4>
            <table class="detail-table">
                ${movement.batch_lot_number ? `
                <tr>
                    <td>Número de lote:</td>
                    <td><span class="movement-badge">${movement.batch_lot_number}</span></td>
                </tr>
                ` : ''}
                ${movement.serial_number ? `
                <tr>
                    <td>Número de serie:</td>
                    <td><span class="movement-badge">${movement.serial_number}</span></td>
                </tr>
                ` : ''}
                ${movement.expiry_date ? `
                <tr>
                    <td>Fecha de vencimiento:</td>
                    <td>${formatDate(movement.expiry_date)}</td>
                </tr>
                ` : ''}
                ${movement.notes ? `
                <tr>
                    <td>Observaciones:</td>
                    <td>${movement.notes}</td>
                </tr>
                ` : ''}
            </table>
        </div>
        ` : ''}
    `;
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function getMovementDescription(movement) {
    const typeTexts = {
        'PURCHASE': 'Compra de mercadería',
        'SALE': 'Venta a cliente',
        'TRANSFER': 'Transferencia entre bodegas',
        'ADJUSTMENT': 'Ajuste de inventario',
        'RETURN': 'Devolución de cliente',
        'DAMAGE': 'Producto dañado'
    };
    return typeTexts[movement.reference_type] || movement.reference_type;
}

function getMovementTypeText(type) {
    const types = {
        'PURCHASE': 'Compra',
        'SALE': 'Venta',
        'TRANSFER': 'Transferencia',
        'ADJUSTMENT': 'Ajuste',
        'RETURN': 'Devolución',
        'DAMAGE': 'Daño',
        'IN': 'Entrada',
        'OUT': 'Salida'
    };
    return types[type] || type;
}

function getVariantById(variantId) {
    return MovementsApp.data.product_variants.find(v => v.id === variantId);
}

function getProductById(productId) {
    return MovementsApp.data.products.find(p => p.id === productId);
}

function getWarehouseById(warehouseId) {
    return MovementsApp.data.warehouses.find(w => w.id === warehouseId);
}

function getZoneById(zoneId) {
    return MovementsApp.data.warehouse_zones.find(z => z.id === zoneId);
}

function getUserById(userId) {
    return MovementsApp.data.users.find(u => u.id === userId);
}

function getFilterPeriodText() {
    if (MovementsApp.filters.dateFrom && MovementsApp.filters.dateTo) {
        const fromDate = new Date(MovementsApp.filters.dateFrom).toLocaleDateString('es-CL');
        const toDate = new Date(MovementsApp.filters.dateTo).toLocaleDateString('es-CL');
        return `${fromDate} - ${toDate}`;
    }
    return 'Período personalizado';
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
// EXPORTACIÓN
// ============================================================================

function exportMovements() {
    try {
        const headers = [
            'Fecha',
            'Hora',
            'Tipo Movimiento',
            'Tipo Referencia',
            'Producto',
            'SKU',
            'Marca',
            'Bodega',
            'Zona',
            'Cantidad',
            'Stock Anterior',
            'Stock Posterior',
            'Costo Unitario',
            'Costo Total',
            'Usuario',
            'Documento',
            'Lote',
            'Serie',
            'Observaciones'
        ];
        
        const csvData = [headers];
        
        MovementsApp.filteredData.forEach(movement => {
            csvData.push([
                movement.movement_date,
                movement.movement_time,
                getMovementTypeText(movement.movement_type),
                getMovementTypeText(movement.reference_type),
                movement.product_name,
                movement.variant_sku,
                movement.brand,
                movement.warehouse_name,
                movement.warehouse_zone,
                movement.quantity,
                movement.quantity_before,
                movement.quantity_after,
                movement.unit_cost || '',
                movement.total_cost || '',
                movement.user_name,
                movement.reference_document_id || '',
                movement.batch_lot_number || '',
                movement.serial_number || '',
                movement.notes || ''
            ]);
        });
        
        const csvContent = csvData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `movimientos_inventario_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Movimientos exportados correctamente');
        console.log('📊 Movimientos exportados a CSV');
        
    } catch (error) {
        console.error('❌ Error exportando movimientos:', error);
        showError('Error al exportar los movimientos');
    }
}

// ============================================================================
// PAGINACIÓN
// ============================================================================

function updatePagination() {
    const dates = Object.keys(MovementsApp.groupedData);
    const totalPages = Math.ceil(dates.length / 7); // 7 días por página
    
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const start = (MovementsApp.currentPage - 1) * 7 + 1;
        const end = Math.min(start + 6, dates.length);
        paginationInfo.textContent = `Mostrando días ${start}-${end} de ${dates.length} días`;
    }
    
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.innerHTML = createPaginationControls(totalPages);
        paginationControls.addEventListener('click', handlePaginationClick);
    }
}

function createPaginationControls(totalPages) {
    if (totalPages <= 1) return '';
    
    let html = `
        <button class="page-btn" data-page="prev" ${MovementsApp.currentPage <= 1 ? 'disabled' : ''}>
            ← Anterior
        </button>
    `;
    
    const startPage = Math.max(1, MovementsApp.currentPage - 2);
    const endPage = Math.min(totalPages, MovementsApp.currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 8px;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="page-btn ${i === MovementsApp.currentPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 8px;">...</span>`;
        }
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `
        <button class="page-btn" data-page="next" ${MovementsApp.currentPage >= totalPages ? 'disabled' : ''}>
            Siguiente →
        </button>
    `;
    
    return html;
}

function handlePaginationClick(e) {
    if (!e.target.classList.contains('page-btn')) return;
    
    const page = e.target.dataset.page;
    const dates = Object.keys(MovementsApp.groupedData);
    const totalPages = Math.ceil(dates.length / 7);
    
    let newPage = MovementsApp.currentPage;
    
    if (page === 'prev' && MovementsApp.currentPage > 1) {
        newPage = MovementsApp.currentPage - 1;
    } else if (page === 'next' && MovementsApp.currentPage < totalPages) {
        newPage = MovementsApp.currentPage + 1;
    } else if (page !== 'prev' && page !== 'next') {
        newPage = parseInt(page);
    }
    
    if (newPage !== MovementsApp.currentPage) {
        MovementsApp.currentPage = newPage;
        renderTimeline();
        updatePagination();
        
        // Scroll al timeline
        document.getElementById('timeline-content').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// ============================================================================
// INFORMACIÓN Y ACTUALIZACIONES
// ============================================================================

function updateTimelineInfo() {
    const movementsCount = document.getElementById('movements-count');
    if (movementsCount) {
        movementsCount.textContent = `${formatNumber(MovementsApp.totalItems)} movimientos encontrados`;
    }
    
    const periodRange = document.getElementById('period-range');
    if (periodRange) {
        periodRange.textContent = `Período: ${getFilterPeriodText()}`;
    }
}

function refreshMovements() {
    console.log('🔄 Actualizando movimientos...');
    
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '🔄 Actualizando...';
    }
    
    setTimeout(() => {
        loadMovementsData();
        
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '🔄 Actualizar';
        }
        
        showSuccess('Movimientos actualizados correctamente');
        console.log('✅ Movimientos actualizados');
    }, 1000);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initializeEventListeners() {
    // Filtros
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const movementTypeFilter = document.getElementById('movement-type-filter');
    const warehouseFilter = document.getElementById('warehouse-filter');
    const userFilter = document.getElementById('user-filter');
    const searchInput = document.getElementById('search-input');
    
    if (dateFromInput) dateFromInput.addEventListener('change', applyFilters);
    if (dateToInput) dateToInput.addEventListener('change', applyFilters);
    if (movementTypeFilter) movementTypeFilter.addEventListener('change', applyFilters);
    if (warehouseFilter) warehouseFilter.addEventListener('change', applyFilters);
    if (userFilter) userFilter.addEventListener('change', applyFilters);
    
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
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const exportBtn = document.getElementById('export-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    if (exportBtn) exportBtn.addEventListener('click', exportMovements);
    if (refreshBtn) refreshBtn.addEventListener('click', refreshMovements);
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f' && searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        
        if (e.key === 'F5') {
            e.preventDefault();
            refreshMovements();
        }
        
        if (e.key === 'Escape') {
            clearFilters();
        }
        
        if (e.ctrlKey && e.key === 'e') {
            e.preventDefault();
            exportMovements();
        }
    });
}

// ============================================================================
// ESTADOS DE CARGA Y ERRORES
// ============================================================================

function showTimelineLoading() {
    const container = document.getElementById('timeline-content');
    if (container) {
        container.innerHTML = `
            <div class="timeline-loading">
                <div class="loading-spinner"></div>
                <h3>Cargando movimientos...</h3>
                <p>Procesando datos del período seleccionado</p>
            </div>
        `;
    }
}

function hideTimelineLoading() {
    // Los datos se mostrarán cuando se ejecute renderTimeline()
    console.log('✅ Carga de timeline completada');
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
    console.log('- Datos cargados:', MovementsApp.data);
    console.log('- Filtros actuales:', MovementsApp.filters);
    console.log('- Datos filtrados:', MovementsApp.filteredData.length);
    console.log('- Datos agrupados:', Object.keys(MovementsApp.groupedData).length, 'días');
    console.log('- Página actual:', MovementsApp.currentPage);
}

// Exponer funciones de depuración
if (typeof window !== 'undefined') {
    window.MovementsDebug = {
        app: MovementsApp,
        debugInfo,
        refreshMovements,
        exportMovements
    };
}

console.log('✅ Sistema de Movimientos de Inventario cargado correctamente');