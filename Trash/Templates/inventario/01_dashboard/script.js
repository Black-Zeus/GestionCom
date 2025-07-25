/**
 * Dashboard de Inventario - Sistema de Control de Stock
 * Funcionalidad principal para gestión de inventario en tiempo real
 */

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

let InventoryApp = {
    data: {},
    currentWarehouse: 1,
    refreshInterval: null,
    isLoading: false,
    alertsFilter: 'all',
    chartPeriod: '7d'
};

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Dashboard de Inventario');

    initializeApp();
});

async function initializeApp() {
    try {
        showLoadingState();

        // Cargar datos
        await loadData();

        // Inicializar componentes
        initializeWarehouseSelector();
        initializeRefreshSystem();
        initializeAlertFilters();
        initializeChartControls();
        initializeEventListeners();

        // Cargar dashboard inicial
        await loadDashboard();

        hideLoadingState();

        console.log('✅ Dashboard inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando dashboard:', error);
        showError('Error cargando el dashboard. Por favor, recarga la página.');
    }
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

async function loadData() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        InventoryApp.data = await response.json();
        console.log('📊 Datos cargados:', InventoryApp.data);

        // Establecer bodega por defecto
        InventoryApp.currentWarehouse = InventoryApp.data.dashboard_config.default_warehouse_id;

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        throw error;
    }
}

// ============================================================================
// GESTIÓN DE BODEGAS
// ============================================================================

function initializeWarehouseSelector() {
    const warehouseTabsContainer = document.getElementById('warehouse-tabs');
    if (!warehouseTabsContainer) return;

    // Crear pestañas de bodegas
    InventoryApp.data.warehouses.forEach(warehouse => {
        if (!warehouse.is_active) return;

        const tab = document.createElement('button');
        tab.className = `warehouse-tab ${warehouse.id === InventoryApp.currentWarehouse ? 'active' : ''}`;
        tab.dataset.warehouseId = warehouse.id;
        tab.innerHTML = `
            <div><strong>${warehouse.warehouse_name}</strong></div>
            <div style="font-size: 0.8em; opacity: 0.8;">${warehouse.city}</div>
        `;

        tab.addEventListener('click', () => selectWarehouse(warehouse.id));
        warehouseTabsContainer.appendChild(tab);
    });

    // Mostrar información de la bodega actual
    updateWarehouseInfo();
}

function selectWarehouse(warehouseId) {
    if (InventoryApp.currentWarehouse === warehouseId) return;

    InventoryApp.currentWarehouse = warehouseId;

    // Actualizar UI de pestañas
    document.querySelectorAll('.warehouse-tab').forEach(tab => {
        tab.classList.toggle('active', parseInt(tab.dataset.warehouseId) === warehouseId);
    });

    // Actualizar información de bodega
    updateWarehouseInfo();

    // Recargar dashboard
    loadDashboard();

    console.log(`📍 Bodega seleccionada: ${warehouseId}`);
}

function updateWarehouseInfo() {
    const warehouse = getCurrentWarehouse();
    if (!warehouse) return;

    const infoContainer = document.getElementById('warehouse-info');
    if (!infoContainer) return;

    infoContainer.innerHTML = `
        <div class="warehouse-detail">
            <strong>Dirección</strong>
            ${warehouse.address}
        </div>
        <div class="warehouse-detail">
            <strong>Región</strong>
            ${warehouse.region}
        </div>
        <div class="warehouse-detail">
            <strong>Total Productos</strong>
            ${formatNumber(warehouse.total_products)}
        </div>
        <div class="warehouse-detail">
            <strong>Valor Inventario</strong>
            ${formatCurrency(warehouse.total_value)}
        </div>
    `;
}

function getCurrentWarehouse() {
    return InventoryApp.data.warehouses.find(w => w.id === InventoryApp.currentWarehouse);
}

// ============================================================================
// DASHBOARD PRINCIPAL
// ============================================================================

async function loadDashboard() {
    try {
        showSectionLoading('kpis');
        showSectionLoading('alerts');
        showSectionLoading('movements');
        showSectionLoading('rotation');

        // Cargar componentes en paralelo
        await Promise.all([
            loadKPIs(),
            loadAlerts(),
            loadRecentMovements(),
            loadRotationAnalysis(),
            loadChart()
        ]);

        updateLastRefresh();

    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showError('Error actualizando el dashboard');
    }
}

function loadKPIs() {
    const warehouse = getCurrentWarehouse();
    if (!warehouse) return;

    const kpisContainer = document.getElementById('dashboard-kpis');
    if (!kpisContainer) return;

    // Calcular métricas adicionales
    const warehouseStock = getWarehouseStock();
    const totalValue = calculateTotalValue(warehouseStock);
    const lowStockCount = warehouseStock.filter(s => s.current_quantity <= s.minimum_stock).length;
    const outOfStockCount = warehouseStock.filter(s => s.current_quantity === 0).length;

    const kpis = [
        {
            title: 'Total Productos',
            value: formatNumber(warehouse.total_products),
            subtitle: 'SKUs activos',
            icon: '📦',
            type: 'info',
            trend: { direction: 'up', value: '+2.3%' }
        },
        {
            title: 'Valor Inventario',
            value: formatCurrency(totalValue),
            subtitle: 'Valor total stock',
            icon: '💰',
            type: 'success',
            trend: { direction: 'up', value: '+5.8%' }
        },
        {
            title: 'Alertas Críticas',
            value: warehouse.critical_alerts,
            subtitle: 'Requieren atención',
            icon: '⚠️',
            type: warehouse.critical_alerts > 20 ? 'critical' : 'warning',
            trend: { direction: 'down', value: '-12%' }
        },
        {
            title: 'Sin Stock',
            value: outOfStockCount,
            subtitle: 'Productos agotados',
            icon: '📋',
            type: outOfStockCount > 10 ? 'critical' : 'warning',
            trend: { direction: 'neutral', value: '0%' }
        }
    ];

    kpisContainer.innerHTML = kpis.map(kpi => createKPICard(kpi)).join('');

    // Animar las tarjetas
    setTimeout(() => {
        kpisContainer.querySelectorAll('.kpi-card').forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('fadeInUp');
            }, index * 100);
        });
    }, 100);
}

function createKPICard(kpi) {
    const trendClass = kpi.trend.direction === 'up' ? 'trend-up' :
        kpi.trend.direction === 'down' ? 'trend-down' : 'trend-neutral';
    const trendIcon = kpi.trend.direction === 'up' ? '↗️' :
        kpi.trend.direction === 'down' ? '↘️' : '→';

    return `
        <div class="kpi-card ${kpi.type}">
            <div class="kpi-icon">${kpi.icon}</div>
            <div class="kpi-header">
                <h4 class="kpi-title">${kpi.title}</h4>
            </div>
            <div class="kpi-value">${kpi.value}</div>
            <p class="kpi-subtitle">${kpi.subtitle}</p>
            <div class="kpi-trend ${trendClass}">
                <span>${trendIcon} ${kpi.trend.value}</span>
                <span style="margin-left: 5px;">vs mes anterior</span>
            </div>
        </div>
    `;
}

// ============================================================================
// SISTEMA DE ALERTAS
// ============================================================================

function initializeAlertFilters() {
    const filterButtons = document.querySelectorAll('.alert-filter-btn');

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setAlertFilter(filter);
        });
    });
}

function setAlertFilter(filter) {
    InventoryApp.alertsFilter = filter;

    // Actualizar UI de filtros
    document.querySelectorAll('.alert-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    // Recargar alertas
    loadAlerts();
}

function loadAlerts() {
    const alertsContainer = document.getElementById('alerts-list');
    if (!alertsContainer) return;

    let alerts = getWarehouseAlerts();

    // Aplicar filtro
    if (InventoryApp.alertsFilter !== 'all') {
        alerts = alerts.filter(alert => alert.alert_level.toLowerCase() === InventoryApp.alertsFilter);
    }

    // Ordenar por nivel de prioridad y fecha
    alerts.sort((a, b) => {
        const priorityOrder = { 'URGENT': 0, 'CRITICAL': 1, 'WARNING': 2, 'INFO': 3 };
        const aPriority = priorityOrder[a.alert_level] || 999;
        const bPriority = priorityOrder[b.alert_level] || 999;

        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }

        return new Date(b.created_at) - new Date(a.created_at);
    });

    if (alerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="empty-alerts">
                <div class="empty-alerts-icon">✅</div>
                <h4>No hay alertas ${InventoryApp.alertsFilter === 'all' ? '' : 'de este tipo'}</h4>
                <p>Todo está funcionando correctamente</p>
            </div>
        `;
        return;
    }

    alertsContainer.innerHTML = alerts.map(alert => createAlertItem(alert)).join('');

    // Agregar event listeners
    alertsContainer.querySelectorAll('.alert-item').forEach(item => {
        item.addEventListener('click', () => {
            const alertId = parseInt(item.dataset.alertId);
            showAlertDetail(alertId);
        });
    });
}

function createAlertItem(alert) {
    const product = getProductByVariantId(alert.product_variant_id);
    const variant = getVariantById(alert.product_variant_id);
    const timeAgo = getTimeAgo(alert.created_at);

    return `
        <div class="alert-item ${alert.alert_level.toLowerCase()}" data-alert-id="${alert.id}">
            <div class="alert-header">
                <h5 class="alert-title">${alert.alert_title}</h5>
                <span class="alert-level ${alert.alert_level.toLowerCase()}">${alert.alert_level}</span>
            </div>
            <p class="alert-message">${alert.alert_message}</p>
            <div class="alert-actions">
                <span class="alert-suggestion">${alert.suggested_action}</span>
                <span class="alert-time">${timeAgo}</span>
            </div>
        </div>
    `;
}

function showAlertDetail(alertId) {
    const alert = InventoryApp.data.stock_alerts.find(a => a.id === alertId);
    if (!alert) return;

    const product = getProductByVariantId(alert.product_variant_id);
    const variant = getVariantById(alert.product_variant_id);

    const modalContent = `
        <div class="alert-detail-header">
            <h3>${alert.alert_title}</h3>
            <span class="alert-detail-level ${alert.alert_level.toLowerCase()}">${alert.alert_level}</span>
        </div>
        
        <div class="alert-product-info">
            <h4>Información del Producto</h4>
            <div class="product-info-grid">
                <div class="product-info-item">
                    <span class="product-info-label">Producto</span>
                    <span class="product-info-value">${product?.product_name || 'N/A'}</span>
                </div>
                <div class="product-info-item">
                    <span class="product-info-label">SKU</span>
                    <span class="product-info-value">${variant?.variant_sku || 'N/A'}</span>
                </div>
                <div class="product-info-item">
                    <span class="product-info-label">Stock Actual</span>
                    <span class="product-info-value">${alert.current_stock}</span>
                </div>
                <div class="product-info-item">
                    <span class="product-info-label">Stock Mínimo</span>
                    <span class="product-info-value">${alert.minimum_stock || 'N/A'}</span>
                </div>
                <div class="product-info-item">
                    <span class="product-info-label">Días hasta agotamiento</span>
                    <span class="product-info-value">${alert.days_until_stockout ? Math.round(alert.days_until_stockout) : 'N/A'} días</span>
                </div>
            </div>
        </div>
        
        <div class="alert-actions-panel">
            <h4>Acciones Sugeridas</h4>
            <ul class="suggested-actions">
                <li>
                    <span class="action-priority high">ALTA</span>
                    ${alert.suggested_action}
                </li>
                <li>
                    <span class="action-priority medium">MEDIA</span>
                    Notificar al departamento de compras
                </li>
                <li>
                    <span class="action-priority low">BAJA</span>
                    Revisar histórico de ventas
                </li>
            </ul>
        </div>
    `;

    showModal('Detalle de Alerta', modalContent);
}

// ============================================================================
// MOVIMIENTOS RECIENTES
// ============================================================================

function loadRecentMovements() {
    const movementsContainer = document.getElementById('recent-movements-list');
    if (!movementsContainer) return;

    const movements = getWarehouseMovements().slice(0, 10); // Últimos 10

    if (movements.length === 0) {
        movementsContainer.innerHTML = `
            <div class="no-data">
                <div class="no-data-icon">📦</div>
                <h4>No hay movimientos recientes</h4>
                <p>Los movimientos aparecerán aquí cuando se registren</p>
            </div>
        `;
        return;
    }

    movementsContainer.innerHTML = movements.map(movement => createMovementItem(movement)).join('');
}

function createMovementItem(movement) {
    const product = getProductByVariantId(movement.product_variant_id);
    const variant = getVariantById(movement.product_variant_id);
    const timeAgo = getTimeAgo(movement.created_at);

    const iconMap = {
        'IN': { icon: '📥', class: 'movement-in' },
        'OUT': { icon: '📤', class: 'movement-out' },
        'TRANSFER': { icon: '🔄', class: 'movement-transfer' },
        'ADJUSTMENT': { icon: '⚖️', class: 'movement-adjustment' }
    };

    const movementIcon = iconMap[movement.movement_type] || { icon: '📦', class: 'movement-in' };
    const quantityClass = movement.quantity > 0 ? 'positive' : 'negative';
    const quantitySign = movement.quantity > 0 ? '+' : '';

    return `
        <div class="movement-item">
            <div class="movement-icon ${movementIcon.class}">
                ${movementIcon.icon}
            </div>
            <div class="movement-details">
                <div class="movement-product">${product?.product_name || 'Producto desconocido'}</div>
                <div class="movement-info">
                    <span>SKU: ${variant?.variant_sku || 'N/A'}</span>
                    <span>Tipo: ${getMovementTypeText(movement.reference_type)}</span>
                    <span>Usuario: ${movement.created_by_user}</span>
                    <span>${timeAgo}</span>
                </div>
            </div>
            <div class="movement-quantity ${quantityClass}">
                ${quantitySign}${Math.abs(movement.quantity)}
            </div>
        </div>
    `;
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

// ============================================================================
// ANÁLISIS DE ROTACIÓN
// ============================================================================

function loadRotationAnalysis() {
    const rotationContainer = document.getElementById('rotation-analysis');
    if (!rotationContainer) return;

    const rotationData = InventoryApp.data.rotation_analysis;

    rotationContainer.innerHTML = rotationData.map(rotation => createRotationCard(rotation)).join('');
}

function createRotationCard(rotation) {
    const categoryClass = `rotation-${rotation.category.toLowerCase().replace('_', '-')}`;

    return `
        <div class="rotation-card">
            <div class="rotation-category ${categoryClass}">
                ${getRotationCategoryText(rotation.category)}
            </div>
            <div class="rotation-percentage">${rotation.percentage}%</div>
            <div class="rotation-count">${rotation.products_count} productos</div>
            <div class="rotation-days">${rotation.avg_days_inventory} días promedio</div>
        </div>
    `;
}

function getRotationCategoryText(category) {
    const categories = {
        'FAST': 'Rotación Rápida',
        'MEDIUM': 'Rotación Media',
        'SLOW': 'Rotación Lenta',
        'NO_MOVEMENT': 'Sin Movimiento'
    };
    return categories[category] || category;
}

// ============================================================================
// GRÁFICO DE MOVIMIENTOS
// ============================================================================

function initializeChartControls() {
    const periodButtons = document.querySelectorAll('.chart-period-btn');

    periodButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const period = e.target.dataset.period;
            setChartPeriod(period);
        });
    });
}

function setChartPeriod(period) {
    InventoryApp.chartPeriod = period;

    // Actualizar UI de botones
    document.querySelectorAll('.chart-period-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    // Recargar gráfico
    loadChart();
}

function loadChart() {
    const chartContainer = document.getElementById('movements-chart');
    if (!chartContainer) return;

    // Simular datos del gráfico basados en daily_movements_summary
    const chartData = InventoryApp.data.daily_movements_summary;

    // Por ahora mostrar placeholder - en implementación real se usaría Chart.js o similar
    chartContainer.innerHTML = `
        <div class="chart-placeholder">
            <div style="margin-bottom: 20px;">
                <h4>Movimientos de los Últimos ${getPeriodText(InventoryApp.chartPeriod)}</h4>
            </div>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                <div style="text-align: center;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📊</div>
                    <div>Gráfico de movimientos</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">Entradas vs Salidas por día</div>
                </div>
            </div>
            <div style="margin-top: 15px; display: flex; justify-content: space-around; font-size: 0.9em; color: #6c757d;">
                <div>📈 Entradas: ${chartData[0]?.total_in || 0}</div>
                <div>📉 Salidas: ${chartData[0]?.total_out || 0}</div>
                <div>⚖️ Ajustes: ${chartData[0]?.total_adjustments || 0}</div>
            </div>
        </div>
    `;
}

function getPeriodText(period) {
    const periods = {
        '7d': '7 Días',
        '30d': '30 Días',
        '90d': '90 Días'
    };
    return periods[period] || '7 Días';
}

// ============================================================================
// SISTEMA DE ACTUALIZACIÓN
// ============================================================================

function initializeRefreshSystem() {
    const refreshBtn = document.getElementById('manual-refresh-btn');
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            manualRefresh();
        });
    }

    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', (e) => {
            toggleAutoRefresh(e.target.checked);
        });
    }

    // Iniciar auto-refresh si está habilitado
    const config = InventoryApp.data.dashboard_config;
    if (config.alerts_auto_refresh) {
        startAutoRefresh();
    }
}

function startAutoRefresh() {
    if (InventoryApp.refreshInterval) {
        clearInterval(InventoryApp.refreshInterval);
    }

    const interval = InventoryApp.data.dashboard_config.refresh_interval_seconds * 1000;

    InventoryApp.refreshInterval = setInterval(() => {
        console.log('🔄 Auto-refresh ejecutado');
        loadDashboard();
    }, interval);

    updateRefreshIndicator(true);
}

function stopAutoRefresh() {
    if (InventoryApp.refreshInterval) {
        clearInterval(InventoryApp.refreshInterval);
        InventoryApp.refreshInterval = null;
    }

    updateRefreshIndicator(false);
}

function toggleAutoRefresh(enabled) {
    if (enabled) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

function manualRefresh() {
    console.log('🔄 Refresh manual ejecutado');
    loadDashboard();
}

function updateRefreshIndicator(isActive) {
    const indicator = document.querySelector('.refresh-indicator');
    if (indicator) {
        indicator.classList.toggle('updating', isActive);
    }
}

function updateLastRefresh() {
    const lastRefreshElement = document.getElementById('last-refresh');
    if (lastRefreshElement) {
        const now = new Date();
        lastRefreshElement.textContent = `Última actualización: ${now.toLocaleTimeString()}`;
    }
}

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

function getWarehouseStock() {
    return InventoryApp.data.stock.filter(s => s.warehouse_id === InventoryApp.currentWarehouse);
}

function getWarehouseAlerts() {
    return InventoryApp.data.stock_alerts.filter(a => {
        const stock = InventoryApp.data.stock.find(s =>
            s.product_variant_id === a.product_variant_id &&
            s.warehouse_id === InventoryApp.currentWarehouse
        );
        return stock && !a.is_resolved;
    });
}

function getWarehouseMovements() {
    return InventoryApp.data.stock_movements.filter(m => m.warehouse_id === InventoryApp.currentWarehouse);
}

function getProductByVariantId(variantId) {
    const variant = InventoryApp.data.product_variants.find(v => v.id === variantId);
    if (!variant) return null;
    return InventoryApp.data.products.find(p => p.id === variant.product_id);
}

function getVariantById(variantId) {
    return InventoryApp.data.product_variants.find(v => v.id === variantId);
}

function calculateTotalValue(stockItems) {
    return stockItems.reduce((total, item) => {
        return total + (item.current_quantity * item.unit_cost);
    }, 0);
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
// ESTADOS DE CARGA Y ERRORES
// ============================================================================

function showLoadingState() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Mostrar skeleton de carga completo
    container.innerHTML = `
        <div class="dashboard-loading">
            <div class="loading-content">
                <div class="loading-spinner-large"></div>
                <h3>Cargando Dashboard de Inventario...</h3>
                <p>Obteniendo datos en tiempo real</p>
            </div>
        </div>
    `;
}

function hideLoadingState() {
    // El contenido se mostrará cuando se ejecute loadDashboard
}

function showSectionLoading(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    section.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100px;">
            <div class="loading-spinner"></div>
        </div>
    `;
}

function showError(message) {
    const toast = createToast('error', 'Error', message);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showSuccess(message) {
    const toast = createToast('success', 'Éxito', message);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.remove();
    }, 3000);
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

function showModal(title, content) {
    // Crear modal si no existe
    let modal = document.getElementById('generic-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
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
// EVENT LISTENERS GENERALES
// ============================================================================

function initializeEventListeners() {
    // Teclas de acceso rápido
    document.addEventListener('keydown', (e) => {
        // F5 o Ctrl+R para refresh
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
            e.preventDefault();
            manualRefresh();
        }

        // Escape para cerrar modales
        if (e.key === 'Escape') {
            closeModal('generic-modal');
        }
    });

    // Manejar pérdida de conexión
    window.addEventListener('online', () => {
        showSuccess('Conexión restaurada. Actualizando datos...');
        loadDashboard();
    });

    window.addEventListener('offline', () => {
        showError('Sin conexión a internet. Los datos pueden no estar actualizados.');
        stopAutoRefresh();
    });

    // Visibilidad de la página (pausar auto-refresh cuando no está visible)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('📱 Página oculta - pausando auto-refresh');
            stopAutoRefresh();
        } else {
            console.log('📱 Página visible - reanudando auto-refresh');
            if (InventoryApp.data.dashboard_config.alerts_auto_refresh) {
                startAutoRefresh();
            }
            // Actualizar inmediatamente cuando la página vuelve a ser visible
            loadDashboard();
        }
    });
}

// ============================================================================
// FUNCIONES DE NAVEGACIÓN
// ============================================================================

function navigateToStock() {
    // En una implementación real, esto navegaría al submódulo de consulta de stock
    console.log('🔗 Navegando a Consulta de Stock');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

function navigateToMovements() {
    // En una implementación real, esto navegaría al submódulo de movimientos
    console.log('🔗 Navegando a Movimientos de Inventario');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

function navigateToAlerts() {
    // En una implementación real, esto navegaría al submódulo de alertas
    console.log('🔗 Navegando a Centro de Alertas');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

function navigateToWarehouses() {
    // En una implementación real, esto navegaría al submódulo de bodegas
    console.log('🔗 Navegando a Gestión de Bodegas');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

function navigateToAdjustments() {
    // En una implementación real, esto navegaría al submódulo de ajustes
    console.log('🔗 Navegando a Ajustes de Inventario');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

function navigateToReports() {
    // En una implementación real, esto navegaría al submódulo de reportes
    console.log('🔗 Navegando a Reportes de Inventario');
    showSuccess('Funcionalidad de navegación será implementada en la siguiente fase');
}

// ============================================================================
// ACCIONES ESPECÍFICAS DE ALERTAS
// ============================================================================

function resolveAlert(alertId) {
    console.log(`🔧 Resolviendo alerta ${alertId}`);

    // En implementación real, esto haría una llamada API
    const alert = InventoryApp.data.stock_alerts.find(a => a.id === alertId);
    if (alert) {
        alert.is_resolved = true;
        showSuccess('Alerta marcada como resuelta');
        loadAlerts();
        closeModal('generic-modal');
    }
}

function snoozeAlert(alertId, hours = 24) {
    console.log(`⏰ Posponiendo alerta ${alertId} por ${hours} horas`);
    showSuccess(`Alerta pospuesta por ${hours} horas`);
    closeModal('generic-modal');
}

function createReorderSuggestion(alertId) {
    console.log(`📋 Creando sugerencia de reorden para alerta ${alertId}`);
    showSuccess('Sugerencia de reorden creada y enviada al departamento de compras');
    closeModal('generic-modal');
}

// ============================================================================
// FUNCIONES DE EXPORTACIÓN
// ============================================================================

function exportAlerts() {
    console.log('📊 Exportando alertas...');

    const alerts = getWarehouseAlerts();
    const csvData = convertAlertsToCSV(alerts);
    downloadCSV(csvData, `alertas_inventario_${new Date().toISOString().split('T')[0]}.csv`);

    showSuccess('Reporte de alertas exportado correctamente');
}

function exportMovements() {
    console.log('📊 Exportando movimientos...');

    const movements = getWarehouseMovements();
    const csvData = convertMovementsToCSV(movements);
    downloadCSV(csvData, `movimientos_inventario_${new Date().toISOString().split('T')[0]}.csv`);

    showSuccess('Reporte de movimientos exportado correctamente');
}

function convertAlertsToCSV(alerts) {
    const headers = ['ID', 'Tipo', 'Nivel', 'Producto', 'SKU', 'Stock Actual', 'Stock Mínimo', 'Mensaje', 'Acción Sugerida', 'Fecha'];

    const rows = alerts.map(alert => {
        const product = getProductByVariantId(alert.product_variant_id);
        const variant = getVariantById(alert.product_variant_id);

        return [
            alert.id,
            alert.alert_type,
            alert.alert_level,
            product?.product_name || '',
            variant?.variant_sku || '',
            alert.current_stock,
            alert.minimum_stock || '',
            `"${alert.alert_message}"`,
            `"${alert.suggested_action}"`,
            new Date(alert.created_at).toLocaleDateString('es-CL')
        ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function convertMovementsToCSV(movements) {
    const headers = ['ID', 'Producto', 'SKU', 'Tipo Movimiento', 'Tipo Referencia', 'Cantidad', 'Costo Unitario', 'Costo Total', 'Usuario', 'Fecha'];

    const rows = movements.map(movement => {
        const product = getProductByVariantId(movement.product_variant_id);
        const variant = getVariantById(movement.product_variant_id);

        return [
            movement.id,
            product?.product_name || '',
            variant?.variant_sku || '',
            movement.movement_type,
            movement.reference_type,
            movement.quantity,
            movement.unit_cost || '',
            movement.total_cost || '',
            movement.created_by_user,
            new Date(movement.created_at).toLocaleDateString('es-CL')
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
// FUNCIONES DE BÚSQUEDA
// ============================================================================

function searchProducts(query) {
    if (!query || query.length < 2) return [];

    const searchTerm = query.toLowerCase();

    return InventoryApp.data.products.filter(product => {
        return product.product_name.toLowerCase().includes(searchTerm) ||
            product.product_code.toLowerCase().includes(searchTerm) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm));
    });
}

function searchByBarcode(barcode) {
    // En implementación real, esto buscaría en product_barcodes
    console.log(`🔍 Buscando por código de barras: ${barcode}`);

    // Simular búsqueda por SKU por ahora
    return InventoryApp.data.product_variants.find(variant =>
        variant.variant_sku === barcode
    );
}

// ============================================================================
// CONFIGURACIÓN DE DASHBOARD
// ============================================================================

function updateDashboardConfig(newConfig) {
    InventoryApp.data.dashboard_config = { ...InventoryApp.data.dashboard_config, ...newConfig };

    // Aplicar nuevas configuraciones
    if (newConfig.refresh_interval_seconds) {
        stopAutoRefresh();
        if (InventoryApp.data.dashboard_config.alerts_auto_refresh) {
            startAutoRefresh();
        }
    }

    console.log('⚙️ Configuración de dashboard actualizada:', newConfig);
}

function resetDashboardConfig() {
    // Restaurar configuración por defecto
    const defaultConfig = {
        refresh_interval_seconds: 30,
        alerts_auto_refresh: true,
        show_value_in_currency: "CLP",
        default_warehouse_id: 1,
        max_alerts_display: 5,
        chart_days_history: 30,
        critical_stock_threshold_percentage: 50,
        low_stock_threshold_percentage: 75
    };

    updateDashboardConfig(defaultConfig);
    showSuccess('Configuración restaurada a valores por defecto');
}

// ============================================================================
// FUNCIONES DE DEPURACIÓN Y DESARROLLO
// ============================================================================

function debugInfo() {
    console.log('🐛 Información de depuración:');
    console.log('- Datos cargados:', InventoryApp.data);
    console.log('- Bodega actual:', InventoryApp.currentWarehouse);
    console.log('- Filtro de alertas:', InventoryApp.alertsFilter);
    console.log('- Período de gráfico:', InventoryApp.chartPeriod);
    console.log('- Auto-refresh activo:', InventoryApp.refreshInterval !== null);
    console.log('- Estado de carga:', InventoryApp.isLoading);
}

// Exponer funciones de depuración en desarrollo
if (typeof window !== 'undefined') {
    window.InventoryDebug = {
        app: InventoryApp,
        debugInfo,
        manualRefresh,
        loadDashboard,
        resetConfig: resetDashboardConfig
    };
}

// ============================================================================
// LIMPIEZA Y FINALIZACIÓN
// ============================================================================

// Limpiar recursos cuando se cierra la página
window.addEventListener('beforeunload', () => {
    if (InventoryApp.refreshInterval) {
        clearInterval(InventoryApp.refreshInterval);
    }

    console.log('🧹 Recursos de dashboard limpiados');
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('❌ Error global capturado:', e.error);
    showError('Ha ocurrido un error inesperado. Por favor, recarga la página.');
});

// Manejar promesas rechazadas
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promesa rechazada no manejada:', e.reason);
    showError('Error de conexión. Verificando estado del sistema...');
});

console.log('✅ Sistema de Dashboard de Inventario cargado correctamente');

// ============================================================================
// FALLBACK DE DATOS PARA DESARROLLO
// ============================================================================

// Si hay problemas cargando data.json, usar datos de ejemplo
function loadFallbackData() {
    console.log('⚠️ Usando datos de fallback para desarrollo');

    InventoryApp.data = {
        "dashboard_config": {
            "refresh_interval_seconds": 30,
            "alerts_auto_refresh": true,
            "default_warehouse_id": 1
        },
        "warehouses": [
            {
                "id": 1,
                "warehouse_code": "BOD-PRINCIPAL",
                "warehouse_name": "Bodega Principal Santiago",
                "address": "Av. Libertador 1234, Santiago",
                "city": "Santiago",
                "region": "Metropolitana",
                "is_active": true,
                "total_products": 1247,
                "total_value": 45234567.89,
                "critical_alerts": 23,
                "out_of_stock": 12
            }
        ],
        "stock": [
            {
                "id": 1,
                "product_variant_id": 1,
                "warehouse_id": 1,
                "current_quantity": 25,
                "reserved_quantity": 3,
                "minimum_stock": 10,
                "unit_cost": 450000.00
            }
        ],
        "stock_alerts": [
            {
                "id": 1,
                "product_variant_id": 1,
                "warehouse_id": 1,
                "alert_type": "LOW_STOCK",
                "alert_level": "CRITICAL",
                "current_stock": 8,
                "minimum_stock": 15,
                "alert_title": "Stock Crítico - Producto de Prueba",
                "alert_message": "Stock bajo el mínimo requerido",
                "suggested_action": "Solicitar reposición urgente",
                "created_at": "2024-07-25T10:00:00Z",
                "is_resolved": false
            }
        ],
        "stock_movements": [],
        "daily_movements_summary": [
            {
                "date": "2024-07-25",
                "total_in": 45,
                "total_out": 67,
                "total_adjustments": 3
            }
        ],
        "rotation_analysis": [
            {
                "category": "FAST",
                "products_count": 127,
                "percentage": 45.2,
                "avg_days_inventory": 15.8
            }
        ],
        "products": [],
        "product_variants": []
    };

    InventoryApp.currentWarehouse = 1;
    return Promise.resolve();
}

// Modificar la función loadData para usar fallback si falla
async function loadDataWithFallback() {
    try {
        console.log('🔄 Intentando cargar data.json...');
        const response = await fetch('data.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        InventoryApp.data = await response.json();
        console.log('✅ data.json cargado correctamente');

        InventoryApp.currentWarehouse = InventoryApp.data.dashboard_config.default_warehouse_id;

    } catch (error) {
        console.warn('⚠️ Error cargando data.json, usando datos de fallback:', error);
        await loadFallbackData();
    }
}

// Reemplazar la llamada en initializeApp
async function initializeAppFixed() {
    try {
        showLoadingState();

        // Usar función con fallback
        await loadDataWithFallback();

        // Crear contenido básico si no existe
        createBasicHTML();

        // Inicializar componentes
        initializeWarehouseSelector();
        initializeRefreshSystem();
        initializeAlertFilters();
        initializeChartControls();
        initializeEventListeners();

        // Cargar dashboard inicial
        await loadDashboard();

        hideLoadingState();

        console.log('✅ Dashboard inicializado correctamente con fallback');

    } catch (error) {
        console.error('❌ Error crítico inicializando dashboard:', error);
        showCriticalError();
    }
}

// Crear HTML básico si no existe
function createBasicHTML() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Si no existe el HTML básico, crearlo
    if (!document.getElementById('warehouse-tabs')) {
        container.innerHTML = `
            <div class="header">
                <h1>📦 Dashboard de Inventario</h1>
                <div class="user-info">
                    <div><strong>Usuario:</strong> Juan Pérez - Jefe de Bodega</div>
                    <div id="current-date-time"></div>
                </div>
            </div>

            <div class="refresh-info">
                <div class="refresh-status">
                    <div class="refresh-indicator"></div>
                    <span id="last-refresh">Última actualización: --:--:--</span>
                </div>
                <div class="refresh-controls">
                    <button class="refresh-btn" id="manual-refresh-btn">🔄 Actualizar</button>
                </div>
            </div>

            <div class="warehouse-selector">
                <h3>🏪 Selección de Bodega</h3>
                <div class="warehouse-tabs" id="warehouse-tabs"></div>
                <div class="warehouse-info" id="warehouse-info"></div>
            </div>

            <div class="dashboard-kpis" id="dashboard-kpis"></div>

            <div class="alerts-center">
                <div class="alerts-header">
                    <h3 class="alerts-title">⚠️ Centro de Alertas</h3>
                    <div class="alerts-filter">
                        <button class="alert-filter-btn active" data-filter="all">Todas</button>
                        <button class="alert-filter-btn" data-filter="critical">Críticas</button>
                    </div>
                </div>
                <div class="alerts-list" id="alerts-list"></div>
            </div>

            <div class="rotation-analysis" id="rotation-analysis"></div>
            
            <div class="movements-chart-section">
                <div class="chart-container" id="movements-chart"></div>
            </div>

            <div class="recent-movements">
                <div class="movements-list" id="recent-movements-list"></div>
            </div>
        `;
    }
}

function showCriticalError() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #dc3545;">
                <div style="font-size: 4em; margin-bottom: 20px;">❌</div>
                <h2>Error Crítico</h2>
                <p>No se pudo inicializar el dashboard. Verifica:</p>
                <ul style="text-align: left; display: inline-block; margin: 20px 0;">
                    <li>Que todos los archivos estén en la misma carpeta</li>
                    <li>Que data.json sea válido</li>
                    <li>Que no haya errores en la consola</li>
                </ul>
                <button onclick="location.reload()" class="btn btn-primary">
                    🔄 Recargar Página
                </button>
            </div>
        `;
    }
}

// Reemplazar la inicialización
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Dashboard de Inventario con manejo de errores');
    initializeAppFixed();
});