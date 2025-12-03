/**
 * Transferencias de Mercadería - Sistema de Control de Inventario
 * Funcionalidad principal para gestión de transferencias entre bodegas
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let TransfersApp = {
    data: {},
    extendedData: {},
    currentView: 'ENVIAR',
    currentWarehouse: 1,
    refreshInterval: null,
    isLoading: false,
    selectedTransfer: null,
    transferItems: [],
    currentFilters: {
        status: 'all',
        priority: 'all',
        warehouse: 'all',
        dateFrom: '',
        dateTo: ''
    }
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚚 Inicializando Módulo de Transferencias');
    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingState();

        // Cargar datos
        await loadData();
        await loadExtendedData();

        // Inicializar componentes
        initializeNavigation();
        initializeEventListeners();
        initializeRefreshSystem();

        // Cargar vista inicial
        await loadTransfersView();

        hideLoadingState();

        console.log('✅ Módulo de Transferencias inicializado correctamente');

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

        TransfersApp.data = await response.json();
        console.log('📊 Datos base cargados:', TransfersApp.data);

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

        TransfersApp.extendedData = await response.json();
        console.log('📊 Datos extendidos cargados:', TransfersApp.extendedData);

    } catch (error) {
        console.error('❌ Error cargando data_extend.json:', error);
        throw error;
    }
}

// ============================================================================
// NAVEGACIÓN Y VISTAS
// ============================================================================

function initializeNavigation() {
    const tabs = document.querySelectorAll('.transfer-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            if (view) {
                switchView(view);
            }
        });
    });

    // Actualizar badges de los tabs
    updateTabBadges();
}

function switchView(view) {
    if (TransfersApp.currentView === view) return;

    TransfersApp.currentView = view;

    // Actualizar UI de tabs
    document.querySelectorAll('.transfer-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view === view);
    });

    // Cargar vista correspondiente
    loadTransfersView();

    console.log(`🔄 Vista cambiada a: ${view}`);
}

function updateTabBadges() {
    const transfers = TransfersApp.extendedData.transfer_documents || [];
    
    // Calcular contadores
    const pending = transfers.filter(t => ['ENVIADO', 'EN_TRANSITO'].includes(t.status)).length;
    const urgent = transfers.filter(t => t.priority === 'URGENTE' && t.status !== 'RECIBIDO_TOTAL').length;
    const objections = transfers.filter(t => t.status === 'RECIBIDO_PARCIAL').length;

    // Actualizar badges
    updateBadge('ENVIAR', 0);
    updateBadge('RECIBIR', pending);
    updateBadge('REPORTES', objections);
}

function updateBadge(view, count) {
    const tab = document.querySelector(`[data-view="${view}"]`);
    if (!tab) return;

    let badge = tab.querySelector('.tab-badge');
    
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'tab-badge';
            tab.appendChild(badge);
        }
        badge.textContent = count;
    } else if (badge) {
        badge.remove();
    }
}

// ============================================================================
// CARGA DE VISTAS PRINCIPALES
// ============================================================================

async function loadTransfersView() {
    try {
        showSectionLoading('transfers-content');

        // Cargar KPIs
        await loadKPIs();

        // Cargar contenido según vista
        switch (TransfersApp.currentView) {
            case 'ENVIAR':
                await loadSendView();
                break;
            case 'RECIBIR':
                await loadReceiveView();
                break;
            case 'REPORTES':
                await loadReportsView();
                break;
        }

        updateLastRefresh();

    } catch (error) {
        console.error('❌ Error cargando vista:', error);
        showError('Error actualizando la vista');
    }
}

function loadKPIs() {
    const transfers = TransfersApp.extendedData.transfer_documents || [];
    const today = new Date().toISOString().split('T')[0];

    // Calcular métricas
    const enTransito = transfers.filter(t => t.status === 'EN_TRANSITO').length;
    const pendientes = transfers.filter(t => ['ENVIADO', 'EN_TRANSITO'].includes(t.status)).length;
    const urgentes = transfers.filter(t => t.priority === 'URGENTE' && !['RECIBIDO_TOTAL', 'CANCELADO'].includes(t.status)).length;
    const hoy = transfers.filter(t => t.transfer_date === today).length;

    const kpis = [
        {
            title: 'En Tránsito',
            value: enTransito,
            subtitle: 'Transferencias activas',
            icon: '🚚',
            type: enTransito > 5 ? 'warning' : 'info',
            trend: { direction: 'up', value: '+2' }
        },
        {
            title: 'Pendientes Recepción',
            value: pendientes,
            subtitle: 'Esperando confirmación',
            icon: '📥',
            type: pendientes > 3 ? 'urgent' : 'success',
            trend: { direction: 'down', value: '-1' }
        },
        {
            title: 'Urgentes',
            value: urgentes,
            subtitle: 'Requieren atención',
            icon: '⚡',
            type: urgentes > 0 ? 'urgent' : 'success',
            trend: { direction: 'neutral', value: '0' }
        },
        {
            title: 'Hoy',
            value: hoy,
            subtitle: 'Transferencias del día',
            icon: '📅',
            type: 'info',
            trend: { direction: 'up', value: '+3' }
        }
    ];

    const kpisContainer = document.getElementById('transfers-kpis');
    if (kpisContainer) {
        kpisContainer.innerHTML = kpis.map(kpi => createKPICard(kpi)).join('');
    }
}

function createKPICard(kpi) {
    const trendClass = kpi.trend.direction === 'up' ? 'trend-up' :
        kpi.trend.direction === 'down' ? 'trend-down' : 'trend-neutral';
    const trendIcon = kpi.trend.direction === 'up' ? '↗️' :
        kpi.trend.direction === 'down' ? '↘️' : '→';

    return `
        <div class="transfer-kpi-card ${kpi.type}">
            <div class="kpi-icon">${kpi.icon}</div>
            <div class="kpi-header">
                <h4 class="kpi-title">${kpi.title}</h4>
            </div>
            <div class="kpi-value">${kpi.value}</div>
            <p class="kpi-subtitle">${kpi.subtitle}</p>
            <div class="kpi-trend ${trendClass}">
                <span>${trendIcon} ${kpi.trend.value}</span>
                <span style="margin-left: 5px;">vs ayer</span>
            </div>
        </div>
    `;
}

// ============================================================================
// VISTA DE ENVÍO
// ============================================================================

async function loadSendView() {
    const contentContainer = document.getElementById('transfers-content');
    if (!contentContainer) return;

    const transfers = getFilteredTransfers('sent');

    contentContainer.innerHTML = `
        <div class="transfers-section">
            <div class="transfers-header">
                <h3 class="transfers-title">
                    📤 Transferencias Enviadas
                </h3>
                <div class="transfers-actions">
                    <button class="btn btn-success" onclick="openNewTransferModal()">
                        <span>📦</span> Nueva Transferencia
                    </button>
                    <button class="btn btn-secondary" onclick="exportTransfers()">
                        <span>📊</span> Exportar
                    </button>
                </div>
            </div>
            
            <div class="transfer-search">
                <input type="text" class="search-field" placeholder="Buscar por número, destino..." 
                       onkeyup="filterTransfers()" id="search-input">
                <select class="search-field" onchange="filterTransfers()" id="status-filter">
                    <option value="all">Todos los estados</option>
                    <option value="BORRADOR">Borrador</option>
                    <option value="ENVIADO">Enviado</option>
                    <option value="EN_TRANSITO">En Tránsito</option>
                    <option value="RECIBIDO_TOTAL">Recibido</option>
                    <option value="CANCELADO">Cancelado</option>
                </select>
                <select class="search-field" onchange="filterTransfers()" id="priority-filter">
                    <option value="all">Todas las prioridades</option>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENTE">Urgente</option>
                </select>
            </div>

            <table class="transfers-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Destino</th>
                        <th>Items</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                        <th>Valor</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="transfers-table-body">
                    ${createTransfersTableRows(transfers)}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================================================
// VISTA DE RECEPCIÓN
// ============================================================================

async function loadReceiveView() {
    const contentContainer = document.getElementById('transfers-content');
    if (!contentContainer) return;

    const transfers = getFilteredTransfers('received');

    contentContainer.innerHTML = `
        <div class="transfers-section">
            <div class="transfers-header">
                <h3 class="transfers-title">
                    📥 Transferencias por Recibir
                </h3>
                <div class="transfers-actions">
                    <button class="btn btn-info" onclick="refreshReceiveView()">
                        <span>🔄</span> Actualizar
                    </button>
                    <button class="btn btn-secondary" onclick="exportPendingTransfers()">
                        <span>📋</span> Lista Pendientes
                    </button>
                </div>
            </div>

            <div class="transfer-alert alert-info">
                <span>ℹ️</span>
                <span>Transferencias pendientes de recepción en tu bodega. Haz clic en "Recibir" para procesar.</span>
            </div>
            
            <table class="transfers-table">
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha Envío</th>
                        <th>Origen</th>
                        <th>Items</th>
                        <th>Estado</th>
                        <th>Llegada Estimada</th>
                        <th>Valor</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="receive-table-body">
                    ${createReceiveTableRows(transfers)}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================================================
// VISTA DE REPORTES
// ============================================================================

async function loadReportsView() {
    const contentContainer = document.getElementById('transfers-content');
    if (!contentContainer) return;

    const transfers = TransfersApp.extendedData.transfer_documents || [];
    const summary = TransfersApp.extendedData.transfer_summary || [];

    contentContainer.innerHTML = `
        <div class="transfers-section">
            <div class="transfers-header">
                <h3 class="transfers-title">
                    📊 Reportes y Estadísticas
                </h3>
                <div class="transfers-actions">
                    <button class="btn btn-primary" onclick="generateDetailedReport()">
                        <span>📈</span> Reporte Detallado
                    </button>
                    <button class="btn btn-secondary" onclick="exportMetrics()">
                        <span>📊</span> Exportar Métricas
                    </button>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                <div class="form-section">
                    <h4 class="section-title">📈 Resumen Semanal</h4>
                    ${createWeeklySummary(summary)}
                </div>
                <div class="form-section">
                    <h4 class="section-title">⚠️ Alertas y Objeciones</h4>
                    ${createAlertsReport(transfers)}
                </div>
            </div>

            <div class="form-section">
                <h4 class="section-title">🔄 Transferencias Recientes</h4>
                <table class="transfers-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Ruta</th>
                            <th>Estado</th>
                            <th>Tiempo Proceso</th>
                            <th>Valor</th>
                            <th>Incidencias</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${createReportsTableRows(transfers.slice(0, 10))}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================================================
// GENERACIÓN DE TABLAS
// ============================================================================

function createTransfersTableRows(transfers) {
    if (transfers.length === 0) {
        return `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h4>No hay transferencias</h4>
                    <p>Crea una nueva transferencia para comenzar</p>
                </td>
            </tr>
        `;
    }

    return transfers.map(transfer => {
        const warehouse = getWarehouseById(transfer.target_warehouse_id);
        const statusClass = `status-${transfer.status.toLowerCase()}`;
        const priorityClass = `priority-${transfer.priority.toLowerCase()}`;

        return `
            <tr class="${priorityClass}" onclick="viewTransferDetail(${transfer.id})">
                <td>
                    <strong>${transfer.transfer_number}</strong>
                    ${transfer.tracking_number ? `<br><small style="color: #6c757d;">${transfer.tracking_number}</small>` : ''}
                </td>
                <td>${formatDate(transfer.transfer_date)}</td>
                <td>
                    <div class="warehouse-info">
                        <div class="warehouse-name">${warehouse?.warehouse_name || 'N/A'}</div>
                        <div class="warehouse-detail">${warehouse?.city || ''}</div>
                    </div>
                </td>
                <td>
                    <span class="transfer-items-count">${transfer.total_items} items</span>
                    <br><small>${transfer.total_quantity} unidades</small>
                </td>
                <td><span class="transfer-status ${statusClass}">${getStatusText(transfer.status)}</span></td>
                <td><span class="priority-badge ${transfer.priority.toLowerCase()}">${transfer.priority}</span></td>
                <td><span class="transfer-value">${formatCurrency(transfer.estimated_value)}</span></td>
                <td>
                    <div class="transfer-actions">
                        <button class="action-btn action-view" onclick="event.stopPropagation(); viewTransferDetail(${transfer.id})" title="Ver detalle">
                            👁️
                        </button>
                        ${transfer.status === 'BORRADOR' ? `
                            <button class="action-btn action-edit" onclick="event.stopPropagation(); editTransfer(${transfer.id})" title="Editar">
                                ✏️
                            </button>
                        ` : ''}
                        ${transfer.status === 'EN_TRANSITO' ? `
                            <button class="action-btn action-track" onclick="event.stopPropagation(); trackTransfer(${transfer.id})" title="Rastrear">
                                📍
                            </button>
                        ` : ''}
                        ${['BORRADOR', 'ENVIADO'].includes(transfer.status) ? `
                            <button class="action-btn action-cancel" onclick="event.stopPropagation(); cancelTransfer(${transfer.id})" title="Cancelar">
                                ❌
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function createReceiveTableRows(transfers) {
    if (transfers.length === 0) {
        return `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-icon">📥</div>
                    <h4>No hay transferencias pendientes</h4>
                    <p>Todas las transferencias han sido recibidas</p>
                </td>
            </tr>
        `;
    }

    return transfers.map(transfer => {
        const warehouse = getWarehouseById(transfer.source_warehouse_id);
        const statusClass = `status-${transfer.status.toLowerCase()}`;
        const isOverdue = transfer.estimated_arrival && new Date(transfer.estimated_arrival) < new Date();

        return `
            <tr class="${isOverdue ? 'priority-urgent' : ''}" onclick="viewTransferDetail(${transfer.id})">
                <td>
                    <strong>${transfer.transfer_number}</strong>
                    ${transfer.tracking_number ? `<br><small style="color: #6c757d;">${transfer.tracking_number}</small>` : ''}
                </td>
                <td>${formatDate(transfer.transfer_date)}</td>
                <td>
                    <div class="warehouse-info">
                        <div class="warehouse-name">${warehouse?.warehouse_name || 'N/A'}</div>
                        <div class="warehouse-detail">${warehouse?.city || ''}</div>
                    </div>
                </td>
                <td>
                    <span class="transfer-items-count">${transfer.total_items} items</span>
                    <br><small>${transfer.total_quantity} unidades</small>
                </td>
                <td><span class="transfer-status ${statusClass}">${getStatusText(transfer.status)}</span></td>
                <td>
                    ${transfer.estimated_arrival ? `
                        <div>${formatDateTime(transfer.estimated_arrival)}</div>
                        ${isOverdue ? '<small style="color: #dc3545; font-weight: 600;">⏰ Retrasado</small>' : ''}
                    ` : 'No definida'}
                </td>
                <td><span class="transfer-value">${formatCurrency(transfer.estimated_value)}</span></td>
                <td>
                    <div class="transfer-actions">
                        <button class="action-btn action-view" onclick="event.stopPropagation(); viewTransferDetail(${transfer.id})" title="Ver detalle">
                            👁️
                        </button>
                        ${['ENVIADO', 'EN_TRANSITO'].includes(transfer.status) ? `
                            <button class="action-btn action-receive" onclick="event.stopPropagation(); openReceiveModal(${transfer.id})" title="Recibir">
                                📥
                            </button>
                        ` : ''}
                        <button class="action-btn action-track" onclick="event.stopPropagation(); trackTransfer(${transfer.id})" title="Rastrear">
                            📍
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function createReportsTableRows(transfers) {
    return transfers.map(transfer => {
        const sourceWarehouse = getWarehouseById(transfer.source_warehouse_id);
        const targetWarehouse = getWarehouseById(transfer.target_warehouse_id);
        const processingTime = calculateProcessingTime(transfer);
        const hasIssues = transfer.status === 'RECIBIDO_PARCIAL' || transfer.status === 'OBJETADO';

        return `
            <tr onclick="viewTransferDetail(${transfer.id})">
                <td><strong>${transfer.transfer_number}</strong></td>
                <td>${formatDate(transfer.transfer_date)}</td>
                <td>
                    <small>${sourceWarehouse?.city || 'N/A'} → ${targetWarehouse?.city || 'N/A'}</small>
                </td>
                <td><span class="transfer-status status-${transfer.status.toLowerCase()}">${getStatusText(transfer.status)}</span></td>
                <td>${processingTime}</td>
                <td><span class="transfer-value">${formatCurrency(transfer.estimated_value)}</span></td>
                <td>
                    ${hasIssues ? '<span style="color: #dc3545;">⚠️ Con incidencias</span>' : 
                                 '<span style="color: #28a745;">✅ Sin incidencias</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

function getFilteredTransfers(view) {
    const transfers = TransfersApp.extendedData.transfer_documents || [];
    
    switch (view) {
        case 'sent':
            return transfers.filter(t => 
                t.source_warehouse_id === TransfersApp.currentWarehouse ||
                TransfersApp.currentWarehouse === 'all'
            );
        case 'received':
            return transfers.filter(t => 
                t.target_warehouse_id === TransfersApp.currentWarehouse &&
                ['ENVIADO', 'EN_TRANSITO'].includes(t.status)
            );
        default:
            return transfers;
    }
}

function filterTransfers() {
    const searchTerm = document.getElementById('search-input')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const priorityFilter = document.getElementById('priority-filter')?.value || 'all';

    TransfersApp.currentFilters = {
        search: searchTerm,
        status: statusFilter,
        priority: priorityFilter
    };

    // Recargar la vista actual
    loadTransfersView();
}

// ============================================================================
// MODALES - NUEVA TRANSFERENCIA
// ============================================================================

function openNewTransferModal() {
    const warehouses = TransfersApp.data.warehouses || [];
    const products = getAvailableProducts();

    const modalContent = `
        <div class="transfer-form">
            <div class="form-section">
                <h4 class="section-title">📋 Información General</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Bodega Origen *</label>
                        <select class="form-control" id="source-warehouse" onchange="updateAvailableStock()">
                            ${warehouses.map(w => `
                                <option value="${w.id}" ${w.id === TransfersApp.currentWarehouse ? 'selected' : ''}>
                                    ${w.warehouse_name} - ${w.city}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Bodega Destino *</label>
                        <select class="form-control" id="target-warehouse" required>
                            <option value="">Seleccionar destino...</option>
                            ${warehouses.filter(w => w.id !== TransfersApp.currentWarehouse).map(w => `
                                <option value="${w.id}">
                                    ${w.warehouse_name} - ${w.city}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Motivo de Transferencia *</label>
                        <select class="form-control" id="transfer-reason" required>
                            ${(TransfersApp.extendedData.transfer_reasons || []).map(r => `
                                <option value="${r.id}">${r.reason_name}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Prioridad</label>
                        <select class="form-control" id="transfer-priority">
                            <option value="NORMAL">Normal</option>
                            <option value="URGENTE">Urgente</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Notas</label>
                    <textarea class="form-control" id="transfer-notes" placeholder="Información adicional sobre la transferencia..."></textarea>
                </div>
            </div>

            <div class="form-section transfer-products-section">
                <h4 class="section-title">📦 Productos a Transferir</h4>
                <div class="products-search">
                    <input type="text" class="product-search-input" placeholder="Buscar productos por código o nombre..." 
                           onkeyup="searchProducts()" id="product-search">
                    <button class="btn btn-primary" onclick="showProductSelector()">+ Agregar Producto</button>
                </div>
                
                <table class="transfer-items-table" id="transfer-items-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Stock Disponible</th>
                            <th>Cantidad</th>
                            <th>Valor Unit.</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="transfer-items-body">
                        <tr>
                            <td colspan="6" class="empty-state">
                                <div class="empty-state-icon">📦</div>
                                <p>No hay productos agregados. Usa el buscador para agregar productos.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div class="reception-summary" style="margin-top: 20px;">
                    <div class="reception-totals">
                        <div class="total-item">
                            <div class="total-value" id="total-items">0</div>
                            <div class="total-label">Items</div>
                        </div>
                        <div class="total-item">
                            <div class="total-value" id="total-quantity">0</div>
                            <div class="total-label">Unidades</div>
                        </div>
                        <div class="total-item">
                            <div class="total-value" id="total-value">$0</div>
                            <div class="total-label">Valor Total</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalActions = `
        <button class="btn btn-secondary" onclick="closeModal('transfer-modal')">Cancelar</button>
        <button class="btn btn-primary" onclick="saveTransfer()">Guardar Borrador</button>
        <button class="btn btn-success" onclick="sendTransfer()">Enviar Transferencia</button>
    `;

    showModal('Nueva Transferencia', modalContent, modalActions);
    
    // Resetear items
    TransfersApp.transferItems = [];
}

// ============================================================================
// MODAL DE RECEPCIÓN
// ============================================================================

function openReceiveModal(transferId) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    const items = getTransferItems(transferId);
    const sourceWarehouse = getWarehouseById(transfer.source_warehouse_id);

    const modalContent = `
        <div class="transfer-summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">Número</span>
                    <span class="summary-value">${transfer.transfer_number}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Origen</span>
                    <span class="summary-value">${sourceWarehouse?.warehouse_name || 'N/A'}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Fecha Envío</span>
                    <span class="summary-value">${formatDate(transfer.transfer_date)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Estado</span>
                    <span class="summary-value">${getStatusText(transfer.status)}</span>
                </div>
            </div>
            
            <div class="transfer-timeline">
                <div class="timeline-step completed">
                    <div class="step-circle">1</div>
                    <div class="step-label">Enviado</div>
                </div>
                <div class="timeline-step ${transfer.status === 'EN_TRANSITO' ? 'active' : 'completed'}">
                    <div class="step-circle">2</div>
                    <div class="step-label">En Tránsito</div>
                </div>
                <div class="timeline-step active">
                    <div class="step-circle">3</div>
                    <div class="step-label">Recepción</div>
                </div>
                <div class="timeline-step">
                    <div class="step-circle">4</div>
                    <div class="step-label">Finalizado</div>
                </div>
            </div>
        </div>

        <div class="transfer-alert alert-info">
            <span>ℹ️</span>
            <span>Revisa cada producto y confirma las cantidades recibidas. Puedes objetar productos dañados o faltantes.</span>
        </div>

        <table class="reception-items-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Solicitado</th>
                    <th>Enviado</th>
                    <th>Recibido</th>
                    <th>Condición</th>
                    <th>Observaciones</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => createReceptionItemRow(item)).join('')}
            </tbody>
        </table>

        <div class="reception-summary">
            <div class="reception-totals">
                <div class="total-item">
                    <div class="total-value" id="receive-total-items">${items.length}</div>
                    <div class="total-label">Items</div>
                </div>
                <div class="total-item">
                    <div class="total-value" id="receive-total-sent">${items.reduce((sum, item) => sum + item.sent_quantity, 0)}</div>
                    <div class="total-label">Enviado</div>
                </div>
                <div class="total-item">
                    <div class="total-value" id="receive-total-received">0</div>
                    <div class="total-label">Recibido</div>
                </div>
            </div>
            
            <div class="reception-notes">
                <label>Notas de Recepción</label>
                <textarea class="notes-textarea" id="reception-notes" 
                          placeholder="Comentarios sobre la recepción, estado general, incidencias..."></textarea>
            </div>
        </div>
    `;

    const modalActions = `
        <button class="btn btn-secondary" onclick="closeModal('receive-modal')">Cancelar</button>
        <button class="btn btn-warning" onclick="processPartialReception(${transferId})">Recepción Parcial</button>
        <button class="btn btn-success" onclick="processCompleteReception(${transferId})">Recepción Completa</button>
    `;

    showModal('Recibir Transferencia', modalContent, modalActions, 'receive-modal');
    
    // Inicializar campos con valores por defecto
    setTimeout(() => {
        items.forEach(item => {
            const input = document.getElementById(`received-${item.id}`);
            if (input) {
                input.value = item.sent_quantity;
                input.addEventListener('input', updateReceptionTotals);
            }
        });
        updateReceptionTotals();
    }, 100);
}

function createReceptionItemRow(item) {
    const product = getProductByVariantId(item.product_variant_id);
    const variant = getVariantById(item.product_variant_id);

    return `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="product-name">${product?.product_name || 'N/A'}</div>
                    <div class="product-details">
                        <span>SKU: ${variant?.variant_sku || 'N/A'}</span>
                        ${item.batch_lot_number ? `<span>Lote: ${item.batch_lot_number}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="text-center"><strong>${item.requested_quantity}</strong></td>
            <td class="text-center"><strong>${item.sent_quantity}</strong></td>
            <td class="text-center">
                <input type="number" class="received-quantity-input" 
                       id="received-${item.id}" 
                       min="0" 
                       max="${item.sent_quantity}" 
                       value="${item.sent_quantity}"
                       onchange="validateReceivedQuantity(this, ${item.sent_quantity})">
            </td>
            <td>
                <select class="condition-select" id="condition-${item.id}">
                    <option value="BUENO">Bueno</option>
                    <option value="REGULAR">Regular</option>
                    <option value="MALO">Malo</option>
                    <option value="DAÑADO">Dañado</option>
                </select>
            </td>
            <td>
                <textarea class="objection-notes" id="notes-${item.id}" 
                          placeholder="Observaciones..."></textarea>
            </td>
        </tr>
    `;
}

// ============================================================================
// PROCESAMIENTO DE RECEPCIONES
// ============================================================================

function processCompleteReception(transferId) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    const items = getTransferItems(transferId);
    const receivedData = collectReceptionData(items);
    const notes = document.getElementById('reception-notes')?.value || '';

    // Validar que todas las cantidades coincidan
    const hasDiscrepancies = receivedData.some(item => 
        parseInt(item.receivedQuantity) !== parseInt(item.sentQuantity)
    );

    if (hasDiscrepancies) {
        showWarning('Hay diferencias en las cantidades. ¿Deseas proceder como recepción parcial?');
        return;
    }

    // Procesar recepción completa
    transfer.status = 'RECIBIDO_TOTAL';
    transfer.received_at = new Date().toISOString();
    transfer.received_by_user_id = 1; // Usuario actual

    // Actualizar items
    items.forEach(item => {
        const receivedItem = receivedData.find(r => r.itemId === item.id);
        if (receivedItem) {
            item.received_quantity = receivedItem.receivedQuantity;
            item.received_condition = receivedItem.condition;
        }
    });

    // Crear registro de recepción
    createReceptionRecord(transferId, 'TOTAL', receivedData, notes);

    // Actualizar stock
    updateStockFromReception(transferId, receivedData);

    closeModal('receive-modal');
    showSuccess('Transferencia recibida completamente');
    loadTransfersView();
}

function processPartialReception(transferId) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    const items = getTransferItems(transferId);
    const receivedData = collectReceptionData(items);
    const notes = document.getElementById('reception-notes')?.value || '';

    // Procesar recepción parcial
    transfer.status = 'RECIBIDO_PARCIAL';
    transfer.received_at = new Date().toISOString();
    transfer.received_by_user_id = 1;

    // Actualizar items
    items.forEach(item => {
        const receivedItem = receivedData.find(r => r.itemId === item.id);
        if (receivedItem) {
            item.received_quantity = receivedItem.receivedQuantity;
            item.received_condition = receivedItem.condition;
        }
    });

    // Crear registro de recepción
    createReceptionRecord(transferId, 'PARCIAL', receivedData, notes);

    // Crear objeciones para diferencias
    createObjections(transferId, receivedData);

    // Actualizar stock
    updateStockFromReception(transferId, receivedData);

    closeModal('receive-modal');
    showSuccess('Recepción parcial procesada. Se han registrado las objeciones.');
    loadTransfersView();
}

function collectReceptionData(items) {
    return items.map(item => {
        const receivedInput = document.getElementById(`received-${item.id}`);
        const conditionSelect = document.getElementById(`condition-${item.id}`);
        const notesTextarea = document.getElementById(`notes-${item.id}`);

        return {
            itemId: item.id,
            productVariantId: item.product_variant_id,
            sentQuantity: item.sent_quantity,
            receivedQuantity: parseInt(receivedInput?.value || 0),
            condition: conditionSelect?.value || 'BUENO',
            notes: notesTextarea?.value || ''
        };
    });
}

function validateReceivedQuantity(input, maxQuantity) {
    const value = parseInt(input.value);
    
    if (value > maxQuantity) {
        input.value = maxQuantity;
        showWarning(`No puedes recibir más de ${maxQuantity} unidades`);
    }
    
    if (value < 0) {
        input.value = 0;
    }

    // Marcar como objeción si hay diferencia
    if (value !== maxQuantity) {
        input.classList.add('objection');
    } else {
        input.classList.remove('objection');
    }

    updateReceptionTotals();
}

function updateReceptionTotals() {
    const receivedInputs = document.querySelectorAll('.received-quantity-input');
    let totalReceived = 0;

    receivedInputs.forEach(input => {
        totalReceived += parseInt(input.value || 0);
    });

    const totalReceivedElement = document.getElementById('receive-total-received');
    if (totalReceivedElement) {
        totalReceivedElement.textContent = totalReceived;
    }
}

// ============================================================================
// GESTIÓN DE STOCK Y REGISTROS
// ============================================================================

function updateStockFromReception(transferId, receivedData) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    receivedData.forEach(item => {
        if (item.receivedQuantity > 0) {
            // Buscar registro de stock en bodega destino
            let stockRecord = TransfersApp.data.stock.find(s => 
                s.product_variant_id === item.productVariantId && 
                s.warehouse_id === transfer.target_warehouse_id
            );

            if (stockRecord) {
                // Actualizar stock existente
                stockRecord.current_quantity += item.receivedQuantity;
                stockRecord.last_movement_date = new Date().toISOString();
                stockRecord.last_movement_type = 'IN';
            } else {
                // Crear nuevo registro de stock
                const newStockId = Math.max(...TransfersApp.data.stock.map(s => s.id)) + 1;
                stockRecord = {
                    id: newStockId,
                    product_variant_id: item.productVariantId,
                    warehouse_id: transfer.target_warehouse_id,
                    warehouse_zone_id: null,
                    current_quantity: item.receivedQuantity,
                    reserved_quantity: 0,
                    minimum_stock: 0,
                    maximum_stock: 0,
                    last_movement_date: new Date().toISOString(),
                    last_movement_type: 'IN',
                    rotation_category: 'MEDIUM',
                    last_sale_date: null,
                    avg_monthly_sales: 0
                };
                TransfersApp.data.stock.push(stockRecord);
            }

            // Crear movimiento de stock
            createStockMovement(item, transfer, 'IN');
        }
    });

    console.log('📦 Stock actualizado desde recepción');
}

function createStockMovement(item, transfer, movementType) {
    const newMovementId = Math.max(...TransfersApp.data.stock_movements.map(m => m.id)) + 1;
    
    const movement = {
        id: newMovementId,
        product_variant_id: item.productVariantId,
        warehouse_id: transfer.target_warehouse_id,
        warehouse_zone_id: null,
        movement_type: movementType,
        reference_type: 'TRANSFER',
        reference_document_id: transfer.id,
        quantity: item.receivedQuantity,
        quantity_before: 0, // Se calcularia en implementación real
        quantity_after: item.receivedQuantity,
        unit_cost: null,
        total_cost: null,
        batch_lot_number: null,
        expiry_date: null,
        serial_number: null,
        notes: `Recepción transferencia ${transfer.transfer_number}`,
        created_by_user_id: 1,
        created_at: new Date().toISOString()
    };

    TransfersApp.data.stock_movements.push(movement);
}

function createReceptionRecord(transferId, receptionType, receivedData, notes) {
    if (!TransfersApp.extendedData.transfer_receipts) {
        TransfersApp.extendedData.transfer_receipts = [];
    }

    const newReceiptId = Math.max(
        ...(TransfersApp.extendedData.transfer_receipts.map(r => r.id) || [0])
    ) + 1;

    const receipt = {
        id: newReceiptId,
        transfer_document_id: transferId,
        receipt_date: new Date().toISOString().split('T')[0],
        received_by_user_id: 1,
        total_items_received: receivedData.length,
        total_quantity_received: receivedData.reduce((sum, item) => sum + item.receivedQuantity, 0),
        reception_type: receptionType,
        general_condition: determineGeneralCondition(receivedData),
        receiver_notes: notes,
        requires_return: receivedData.some(item => item.receivedQuantity < item.sentQuantity),
        processed_at: new Date().toISOString()
    };

    TransfersApp.extendedData.transfer_receipts.push(receipt);
    console.log('📝 Registro de recepción creado');
}

function createObjections(transferId, receivedData) {
    if (!TransfersApp.extendedData.transfer_objections) {
        TransfersApp.extendedData.transfer_objections = [];
    }

    const receipt = TransfersApp.extendedData.transfer_receipts.find(r => r.transfer_document_id === transferId);
    if (!receipt) return;

    receivedData.forEach(item => {
        if (item.receivedQuantity < item.sentQuantity) {
            const newObjectionId = Math.max(
                ...(TransfersApp.extendedData.transfer_objections.map(o => o.id) || [0])
            ) + 1;

            const objection = {
                id: newObjectionId,
                transfer_receipt_id: receipt.id,
                transfer_item_id: item.itemId,
                objection_type: 'CANTIDAD_INCORRECTA',
                expected_quantity: item.sentQuantity,
                received_quantity: item.receivedQuantity,
                objected_quantity: item.sentQuantity - item.receivedQuantity,
                objection_reason: item.condition === 'BUENO' ? 'Cantidad faltante' : `Producto en condición: ${item.condition}`,
                objection_description: item.notes || 'Sin observaciones adicionales',
                resolution_action: 'DEVOLUCION_PARCIAL',
                estimated_loss: 0,
                photos_attached: false,
                created_at: new Date().toISOString()
            };

            TransfersApp.extendedData.transfer_objections.push(objection);
        }
    });

    console.log('⚠️ Objeciones creadas para diferencias');
}

// ============================================================================
// DETALLE DE TRANSFERENCIA
// ============================================================================

function viewTransferDetail(transferId) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    const items = getTransferItems(transferId);
    const sourceWarehouse = getWarehouseById(transfer.source_warehouse_id);
    const targetWarehouse = getWarehouseById(transfer.target_warehouse_id);
    const receipts = getTransferReceipts(transferId);

    const modalContent = `
        <div class="transfer-summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">Número</span>
                    <span class="summary-value">${transfer.transfer_number}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Estado</span>
                    <span class="summary-value">
                        <span class="transfer-status status-${transfer.status.toLowerCase()}">
                            ${getStatusText(transfer.status)}
                        </span>
                    </span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Prioridad</span>
                    <span class="summary-value">
                        <span class="priority-badge ${transfer.priority.toLowerCase()}">
                            ${transfer.priority}
                        </span>
                    </span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Fecha</span>
                    <span class="summary-value">${formatDate(transfer.transfer_date)}</span>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div class="form-section">
                <h4 class="section-title">📤 Origen</h4>
                <div><strong>${sourceWarehouse?.warehouse_name || 'N/A'}</strong></div>
                <div style="color: #6c757d; font-size: 0.9em;">${sourceWarehouse?.address || ''}</div>
                <div style="color: #6c757d; font-size: 0.9em;">${sourceWarehouse?.city || ''}, ${sourceWarehouse?.region || ''}</div>
            </div>
            <div class="form-section">
                <h4 class="section-title">📥 Destino</h4>
                <div><strong>${targetWarehouse?.warehouse_name || 'N/A'}</strong></div>
                <div style="color: #6c757d; font-size: 0.9em;">${targetWarehouse?.address || ''}</div>
                <div style="color: #6c757d; font-size: 0.9em;">${targetWarehouse?.city || ''}, ${targetWarehouse?.region || ''}</div>
            </div>
        </div>

        ${transfer.tracking_number ? `
            <div class="tracking-info">
                <div class="tracking-header">
                    <h4>📍 Información de Seguimiento</h4>
                    <span class="tracking-number">${transfer.tracking_number}</span>
                </div>
                <div class="transport-method">
                    <span>🚚</span>
                    <span>${getTransportMethodText(transfer.transport_method)}</span>
                    ${transfer.estimated_arrival ? `
                        <span style="margin-left: auto;">Llegada estimada: ${formatDateTime(transfer.estimated_arrival)}</span>
                    ` : ''}
                </div>
            </div>
        ` : ''}

        <div class="form-section">
            <h4 class="section-title">📦 Productos</h4>
            <table class="transfer-items-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Solicitado</th>
                        <th>Enviado</th>
                        <th>Recibido</th>
                        <th>Estado</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => createDetailItemRow(item)).join('')}
                </tbody>
            </table>
        </div>

        ${receipts.length > 0 ? `
            <div class="form-section">
                <h4 class="section-title">📝 Historial de Recepción</h4>
                ${receipts.map(receipt => `
                    <div class="transfer-alert alert-info">
                        <div><strong>Recepción ${receipt.reception_type.toLowerCase()}</strong></div>
                        <div>Fecha: ${formatDate(receipt.receipt_date)}</div>
                        <div>Recibido por: Usuario ${receipt.received_by_user_id}</div>
                        ${receipt.receiver_notes ? `<div>Notas: ${receipt.receiver_notes}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        ` : ''}

        ${transfer.notes ? `
            <div class="form-section">
                <h4 class="section-title">📋 Notas</h4>
                <p>${transfer.notes}</p>
            </div>
        ` : ''}
    `;

    showModal(`Detalle - ${transfer.transfer_number}`, modalContent);
}

function createDetailItemRow(item) {
    const product = getProductByVariantId(item.product_variant_id);
    const variant = getVariantById(item.product_variant_id);

    const receivedQuantity = item.received_quantity ?? '-';
    const condition = item.received_condition || '-';
    const isPartial = item.received_quantity && item.received_quantity < item.sent_quantity;

    return `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="product-name">${product?.product_name || 'N/A'}</div>
                    <div class="product-details">
                        <span>SKU: ${variant?.variant_sku || 'N/A'}</span>
                        ${item.batch_lot_number ? `<span>Lote: ${item.batch_lot_number}</span>` : ''}
                    </div>
                </div>
            </td>
            <td class="text-center"><strong>${item.requested_quantity}</strong></td>
            <td class="text-center"><strong>${item.sent_quantity}</strong></td>
            <td class="text-center">
                <strong style="color: ${isPartial ? '#dc3545' : '#28a745'};">
                    ${receivedQuantity}
                </strong>
            </td>
            <td class="text-center">
                <span class="condition-badge ${condition.toLowerCase()}">${condition}</span>
            </td>
            <td class="text-center"><span class="transfer-value">${formatCurrency(item.line_total)}</span></td>
        </tr>
    `;
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function getTransferItems(transferId) {
    return TransfersApp.extendedData.transfer_items?.filter(item => 
        item.transfer_document_id === transferId
    ) || [];
}

function getTransferReceipts(transferId) {
    return TransfersApp.extendedData.transfer_receipts?.filter(receipt => 
        receipt.transfer_document_id === transferId
    ) || [];
}

function getWarehouseById(warehouseId) {
    return TransfersApp.data.warehouses?.find(w => w.id === warehouseId);
}

function getProductByVariantId(variantId) {
    const variant = TransfersApp.data.product_variants?.find(v => v.id === variantId);
    if (!variant) return null;
    return TransfersApp.data.products?.find(p => p.id === variant.product_id);
}

function getVariantById(variantId) {
    return TransfersApp.data.product_variants?.find(v => v.id === variantId);
}

function getStatusText(status) {
    const statusTexts = {
        'BORRADOR': 'Borrador',
        'ENVIADO': 'Enviado',
        'EN_TRANSITO': 'En Tránsito',
        'RECIBIDO_TOTAL': 'Recibido',
        'RECIBIDO_PARCIAL': 'Recepción Parcial',
        'OBJETADO': 'Objetado',
        'CANCELADO': 'Cancelado'
    };
    return statusTexts[status] || status;
}

function getTransportMethodText(method) {
    const methods = {
        'VEHICULO_EMPRESA': 'Vehículo de la Empresa',
        'COURIER_EXTERNO': 'Courier Externo',
        'TRANSPORTE_PUBLICO': 'Transporte Público',
        'RETIRO_PERSONAL': 'Retiro Personal'
    };
    return methods[method] || method;
}

function determineGeneralCondition(receivedData) {
    const conditions = receivedData.map(item => item.condition);
    if (conditions.every(c => c === 'BUENO')) return 'BUENO';
    if (conditions.some(c => ['MALO', 'DAÑADO'].includes(c))) return 'MALO';
    return 'REGULAR';
}

function calculateProcessingTime(transfer) {
    if (!transfer.received_at || !transfer.sent_at) return 'N/A';
    
    const sent = new Date(transfer.sent_at);
    const received = new Date(transfer.received_at);
    const diffHours = Math.abs(received - sent) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
        return `${Math.round(diffHours)} horas`;
    } else {
        return `${Math.round(diffHours / 24)} días`;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CL');
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CL');
}

function formatCurrency(amount) {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// ============================================================================
// REPORTES Y RESÚMENES
// ============================================================================

function createWeeklySummary(summary) {
    if (!summary || summary.length === 0) {
        return '<p style="color: #6c757d;">No hay datos de resumen disponibles</p>';
    }

    const latest = summary[0];
    return `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #007bff;">${latest.total_transfers}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Transferencias Total</div>
            </div>
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #28a745;">${latest.completed_today}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Completadas Hoy</div>
            </div>
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #ffc107;">${latest.pending_reception}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Pendientes</div>
            </div>
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #dc3545;">${latest.objections_today}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Objeciones</div>
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
            <div style="font-size: 0.9em; color: #6c757d;">
                <strong>Valor transferido:</strong> ${formatCurrency(latest.total_value_transferred)} | 
                <strong>Tiempo promedio:</strong> ${latest.average_processing_time_hours}h
            </div>
        </div>
    `;
}

function createAlertsReport(transfers) {
    const objected = transfers.filter(t => t.status === 'RECIBIDO_PARCIAL' || t.status === 'OBJETADO');
    const overdue = transfers.filter(t => 
        t.estimated_arrival && 
        new Date(t.estimated_arrival) < new Date() && 
        ['ENVIADO', 'EN_TRANSITO'].includes(t.status)
    );

    return `
        <div style="display: grid; gap: 15px;">
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #dc3545;">${objected.length}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Con Objeciones</div>
            </div>
            <div>
                <div style="font-size: 1.5em; font-weight: 700; color: #ffc107;">${overdue.length}</div>
                <div style="font-size: 0.9em; color: #6c757d;">Retrasadas</div>
            </div>
            ${objected.length > 0 ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                    <div style="font-size: 0.9em; font-weight: 600; margin-bottom: 8px;">Últimas Objeciones:</div>
                    ${objected.slice(0, 3).map(t => `
                        <div style="font-size: 0.8em; color: #6c757d; margin-bottom: 4px;">
                            • ${t.transfer_number} - ${getWarehouseById(t.source_warehouse_id)?.city || 'N/A'}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================================================
// ACCIONES DE TRANSFERENCIAS
// ============================================================================

function trackTransfer(transferId) {
    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    const modalContent = `
        <div class="tracking-info">
            <div class="tracking-header">
                <h4>📍 Seguimiento de Transferencia</h4>
                <span class="tracking-number">${transfer.tracking_number || 'Sin número de seguimiento'}</span>
            </div>
            
            <div class="transfer-timeline">
                <div class="timeline-step completed">
                    <div class="step-circle">✓</div>
                    <div class="step-label">Creado</div>
                </div>
                <div class="timeline-step ${['ENVIADO', 'EN_TRANSITO', 'RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? 'completed' : ''}">
                    <div class="step-circle">${['ENVIADO', 'EN_TRANSITO', 'RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? '✓' : '2'}</div>
                    <div class="step-label">Enviado</div>
                </div>
                <div class="timeline-step ${['EN_TRANSITO', 'RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? 'completed' : transfer.status === 'ENVIADO' ? 'active' : ''}">
                    <div class="step-circle">${['EN_TRANSITO', 'RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? '✓' : '🚚'}</div>
                    <div class="step-label">En Tránsito</div>
                </div>
                <div class="timeline-step ${['RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? 'completed' : transfer.status === 'EN_TRANSITO' ? 'active' : ''}">
                    <div class="step-circle">${['RECIBIDO_TOTAL', 'RECIBIDO_PARCIAL'].includes(transfer.status) ? '✓' : '📥'}</div>
                    <div class="step-label">Recibido</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
                <div>
                    <strong>Estado Actual:</strong><br>
                    <span class="transfer-status status-${transfer.status.toLowerCase()}">${getStatusText(transfer.status)}</span>
                </div>
                <div>
                    <strong>Método de Transporte:</strong><br>
                    ${getTransportMethodText(transfer.transport_method)}
                </div>
                <div>
                    <strong>Fecha de Envío:</strong><br>
                    ${transfer.sent_at ? formatDateTime(transfer.sent_at) : 'No enviado'}
                </div>
                <div>
                    <strong>Llegada Estimada:</strong><br>
                    ${transfer.estimated_arrival ? formatDateTime(transfer.estimated_arrival) : 'No definida'}
                </div>
            </div>
            
            ${transfer.received_at ? `
                <div class="transfer-alert alert-success" style="margin-top: 15px;">
                    <span>✅</span>
                    <span>Transferencia recibida el ${formatDateTime(transfer.received_at)}</span>
                </div>
            ` : ''}
        </div>
    `;

    showModal('Seguimiento de Transferencia', modalContent);
}

function cancelTransfer(transferId) {
    if (!confirm('¿Estás seguro de que deseas cancelar esta transferencia?')) return;

    const transfer = TransfersApp.extendedData.transfer_documents.find(t => t.id === transferId);
    if (!transfer) return;

    transfer.status = 'CANCELADO';
    
    showSuccess('Transferencia cancelada correctamente');
    loadTransfersView();
}

function editTransfer(transferId) {
    showInfo('Funcionalidad de edición en desarrollo. Solo se pueden editar transferencias en estado BORRADOR.');
}

// ============================================================================
// EXPORTACIÓN Y REPORTES
// ============================================================================

function exportTransfers() {
    const transfers = getFilteredTransfers('sent');
    const csvData = convertTransfersToCSV(transfers);
    downloadCSV(csvData, `transferencias_enviadas_${new Date().toISOString().split('T')[0]}.csv`);
    showSuccess('Transferencias exportadas correctamente');
}

function exportPendingTransfers() {
    const transfers = getFilteredTransfers('received');
    const csvData = convertTransfersToCSV(transfers);
    downloadCSV(csvData, `transferencias_pendientes_${new Date().toISOString().split('T')[0]}.csv`);
    showSuccess('Transferencias pendientes exportadas correctamente');
}

function generateDetailedReport() {
    showInfo('Generando reporte detallado...');
    
    setTimeout(() => {
        const reportContent = createDetailedReport();
        const newWindow = window.open('', '_blank');
        newWindow.document.write(reportContent);
        newWindow.document.close();
        showSuccess('Reporte generado en nueva ventana');
    }, 1000);
}

function createDetailedReport() {
    const transfers = TransfersApp.extendedData.transfer_documents || [];
    const today = new Date().toLocaleDateString('es-CL');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Transferencias</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
                .metric { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
                th { background: #f5f5f5; }
                .status { padding: 3px 8px; border-radius: 3px; font-size: 0.8em; }
                .status-enviado { background: #fff3cd; color: #856404; }
                .status-recibido_total { background: #d1e7dd; color: #0f5132; }
                .status-en_transito { background: #cff4fc; color: #055160; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📦 Reporte de Transferencias</h1>
                <p>Generado el ${today}</p>
            </div>
            
            <div class="summary">
                <div class="metric">
                    <h3>${transfers.length}</h3>
                    <p>Total Transferencias</p>
                </div>
                <div class="metric">
                    <h3>${transfers.filter(t => t.status === 'EN_TRANSITO').length}</h3>
                    <p>En Tránsito</p>
                </div>
                <div class="metric">
                    <h3>${transfers.filter(t => t.status === 'RECIBIDO_TOTAL').length}</h3>
                    <p>Completadas</p>
                </div>
                <div class="metric">
                    <h3>${transfers.filter(t => t.status === 'RECIBIDO_PARCIAL').length}</h3>
                    <p>Con Objeciones</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Número</th>
                        <th>Fecha</th>
                        <th>Origen</th>
                        <th>Destino</th>
                        <th>Estado</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${transfers.map(t => {
                        const source = getWarehouseById(t.source_warehouse_id);
                        const target = getWarehouseById(t.target_warehouse_id);
                        return `
                            <tr>
                                <td>${t.transfer_number}</td>
                                <td>${formatDate(t.transfer_date)}</td>
                                <td>${source?.warehouse_name || 'N/A'}</td>
                                <td>${target?.warehouse_name || 'N/A'}</td>
                                <td><span class="status status-${t.status.toLowerCase()}">${getStatusText(t.status)}</span></td>
                                <td>${formatCurrency(t.estimated_value)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
}

function convertTransfersToCSV(transfers) {
    const headers = ['Número', 'Fecha', 'Origen', 'Destino', 'Estado', 'Prioridad', 'Items', 'Valor', 'Tracking'];

    const rows = transfers.map(transfer => {
        const source = getWarehouseById(transfer.source_warehouse_id);
        const target = getWarehouseById(transfer.target_warehouse_id);

        return [
            transfer.transfer_number,
            formatDate(transfer.transfer_date),
            source?.warehouse_name || 'N/A',
            target?.warehouse_name || 'N/A',
            getStatusText(transfer.status),
            transfer.priority,
            transfer.total_items,
            transfer.estimated_value,
            transfer.tracking_number || ''
        ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
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
// SISTEMA DE ACTUALIZACIÓN
// ============================================================================

function initializeRefreshSystem() {
    const config = TransfersApp.extendedData.dashboard_config;
    if (config && config.auto_refresh_interval_seconds) {
        startAutoRefresh(config.auto_refresh_interval_seconds * 1000);
    }
}

function startAutoRefresh(interval = 30000) {
    if (TransfersApp.refreshInterval) {
        clearInterval(TransfersApp.refreshInterval);
    }

    TransfersApp.refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refresh de transferencias');
        updateTabBadges();
        loadKPIs();
    }, interval);
}

function refreshReceiveView() {
    showInfo('Actualizando vista de recepción...');
    loadTransfersView();
}

function updateLastRefresh() {
    // En implementación real, esto actualizaría el timestamp de última actualización
    console.log('🕒 Última actualización:', new Date().toLocaleTimeString());
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initializeEventListeners() {
    // Listener para detectar cambios de visibilidad
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (TransfersApp.refreshInterval) {
                clearInterval(TransfersApp.refreshInterval);
            }
        } else {
            initializeRefreshSystem();
        }
    });

    // Listener para teclado
    document.addEventListener('keydown', (e) => {
        // F5 para refresh
        if (e.key === 'F5') {
            e.preventDefault();
            loadTransfersView();
        }
        
        // Escape para cerrar modales
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// ============================================================================
// FUNCIONES DE UI GLOBAL
// ============================================================================

function showLoadingState() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Crear overlay de loading
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'initial-loading-overlay';
    loadingOverlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(255, 255, 255, 0.9); display: flex; 
                    align-items: center; justify-content: center; z-index: 9999;">
            <div style="text-align: center;">
                <div class="loading-spinner-large" style="width: 60px; height: 60px; 
                     border: 4px solid #f3f3f3; border-top: 4px solid #007bff; 
                     border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                <h3 style="color: #2c3e50; margin-bottom: 10px;">Cargando Transferencias...</h3>
                <p style="color: #6c757d;">Obteniendo datos del sistema</p>
            </div>
        </div>
    `;

    // Reducir opacidad del container
    container.style.opacity = '0.3';
    container.style.pointerEvents = 'none';
    
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

function showSectionLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.innerHTML = `
        <div class="transfer-loading">
            <div class="loading-spinner"></div>
            <span>Cargando...</span>
        </div>
    `;
}

function showModal(title, content, actions = '', modalId = 'generic-modal') {
    // Crear modal si no existe
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const modalActions = actions || `
        <button class="btn btn-secondary" onclick="closeModal('${modalId}')">Cerrar</button>
    `;

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="close" onclick="closeModal('${modalId}')">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; 
                 padding: 20px; border-top: 1px solid #e9ecef;">
                ${modalActions}
            </div>
        </div>
    `;

    modal.classList.add('show');

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

function closeModal(modalId = 'generic-modal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

function showSuccess(message) {
    showNotification('success', '✅ Éxito', message);
}

function showError(message) {
    showNotification('error', '❌ Error', message);
}

function showWarning(message) {
    showNotification('warning', '⚠️ Advertencia', message);
}

function showInfo(message) {
    showNotification('info', 'ℹ️ Información', message);
}

function showNotification(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">${title.split(' ')[0]}</div>
        <div class="toast-content">
            <div class="toast-title">${title.split(' ').slice(1).join(' ')}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Agregar a container de toasts
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; top: 80px; right: 20px; z-index: 1050; 
            pointer-events: none; max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Mostrar toast
    setTimeout(() => {
        toast.classList.add('show');
        toast.style.pointerEvents = 'auto';
    }, 100);

    // Remover automáticamente
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// ============================================================================
// VALIDACIONES Y HELPERS
// ============================================================================

function getAvailableProducts() {
    // En implementación real, esto filtraría productos con stock disponible
    return TransfersApp.data.products || [];
}

function validateTransferForm() {
    const sourceWarehouse = document.getElementById('source-warehouse')?.value;
    const targetWarehouse = document.getElementById('target-warehouse')?.value;
    const reason = document.getElementById('transfer-reason')?.value;

    if (!sourceWarehouse || !targetWarehouse || !reason) {
        showError('Todos los campos obligatorios deben ser completados');
        return false;
    }

    if (sourceWarehouse === targetWarehouse) {
        showError('La bodega origen y destino no pueden ser la misma');
        return false;
    }

    if (TransfersApp.transferItems.length === 0) {
        showError('Debe agregar al menos un producto a la transferencia');
        return false;
    }

    return true;
}

console.log('✅ Script de Transferencias cargado correctamente');