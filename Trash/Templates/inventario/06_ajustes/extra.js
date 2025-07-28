/**
 * Funciones de Soporte para Módulo de Ajustes de Inventario
 * Archivo complementario con utilidades y funciones auxiliares
 */

// ============================================================================
// FUNCIONES DE DATOS Y GETTERS
// ============================================================================

function getAdjustmentReason(reasonId) {
    return AdjustmentsApp.extendedData.adjustment_reasons?.find(r => r.id === reasonId) || null;
}

function getWarehouse(warehouseId) {
    return AdjustmentsApp.data.warehouses?.find(w => w.id === warehouseId) || null;
}

function getUser(userId) {
    return AdjustmentsApp.data.users?.find(u => u.id === userId) || null;
}

function getVariantById(variantId) {
    return AdjustmentsApp.data.product_variants?.find(v => v.id === variantId) || null;
}

function getProductByVariantId(variantId) {
    const variant = getVariantById(variantId);
    if (!variant) return null;
    return AdjustmentsApp.data.products?.find(p => p.id === variant.product_id) || null;
}

function getCurrentStock(variantId) {
    return AdjustmentsApp.data.stock?.find(s => 
        s.product_variant_id === variantId && 
        s.warehouse_id === AdjustmentsApp.currentWarehouse
    ) || null;
}

function getWarehouseZone(zoneId) {
    return AdjustmentsApp.data.warehouse_zones?.find(z => z.id === zoneId) || null;
}

function getAdjustmentItems(adjustmentId) {
    return AdjustmentsApp.extendedData.adjustment_items?.filter(i => i.adjustment_id === adjustmentId) || [];
}

function getAdjustmentWorkflow(adjustmentId) {
    return AdjustmentsApp.extendedData.approval_workflow?.filter(w => w.adjustment_id === adjustmentId) || [];
}

function getCurrentUserId() {
    return 1; // Simulado - en prod vendría de la sesión
}

function getDefaultVariant(productId) {
    return AdjustmentsApp.data.product_variants?.find(v => 
        v.product_id === productId && v.is_default_variant
    ) || AdjustmentsApp.data.product_variants?.find(v => v.product_id === productId) || null;
}

function searchProducts(query) {
    const searchTerm = query.toLowerCase();
    return AdjustmentsApp.data.products?.filter(product => 
        product.product_name.toLowerCase().includes(searchTerm) ||
        product.product_code.toLowerCase().includes(searchTerm) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm))
    ).slice(0, 10) || []; // Limitar a 10 resultados
}

// ============================================================================
// FUNCIONES DE FORMATO Y TEXTO
// ============================================================================

function getStatusText(status) {
    const statusMap = {
        'DRAFT': 'Borrador',
        'PENDING': 'Pendiente',
        'APPROVED': 'Aprobado',
        'REJECTED': 'Rechazado',
        'APPLIED': 'Aplicado'
    };
    return statusMap[status] || status;
}

function getCountStatusText(status) {
    const statusMap = {
        'SCHEDULED': 'Programado',
        'IN_PROGRESS': 'En Proceso',
        'COMPLETED': 'Completado',
        'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
}

function getCountTypeText(type) {
    const typeMap = {
        'FULL': 'Conteo Completo',
        'ZONE': 'Por Zona',
        'SPECIFIC': 'Productos Específicos',
        'RANDOM': 'Aleatorio'
    };
    return typeMap[type] || type;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat('es-CL').format(num);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(amount);
}

// ============================================================================
// FUNCIONES DE UI Y ESTADO
// ============================================================================

function showLoadingState() {
    console.log('⏳ Ejecutando showLoadingState...');
    
    const container = document.querySelector('.container');
    if (!container) {
        console.warn('⚠️ Container no encontrado');
        return;
    }

    const loadingHtml = `
        <div class="loading-section">
            <div class="loading-spinner-adjustments"></div>
            <div class="loading-text">
                <h3>Cargando Módulo de Ajustes...</h3>
                <p>Obteniendo datos del sistema</p>
            </div>
        </div>
    `;
    
    // Guardar el contenido original
    container.setAttribute('data-original-content', container.innerHTML);
    container.innerHTML = loadingHtml;
    console.log('✅ Estado de loading aplicado');
}

function hideLoadingState() {
    console.log('🎯 Ejecutando hideLoadingState...');
    
    const container = document.querySelector('.container');
    if (!container) {
        console.warn('⚠️ Container no encontrado para ocultar loading');
        return;
    }
    
    // Restaurar contenido original si existe
    const originalContent = container.getAttribute('data-original-content');
    if (originalContent) {
        container.innerHTML = originalContent;
        container.removeAttribute('data-original-content');
        console.log('✅ Contenido original restaurado');
    } else {
        // Si no hay contenido original, remover solo la sección de loading
        const loadingSection = container.querySelector('.loading-section');
        if (loadingSection) {
            loadingSection.remove();
            console.log('✅ Loading section removida');
        }
    }
    
    // Asegurar visibilidad
    container.style.display = 'block';
    container.style.opacity = '1';
    
    console.log('✅ Loading state ocultado correctamente');
}

function showError(message) {
    showToast('error', 'Error', message);
}

function showSuccess(message) {
    showToast('success', 'Éxito', message);
}

function showWarning(message) {
    showToast('warning', 'Advertencia', message);
}

function showInfo(message) {
    showToast('info', 'Información', message);
}

function showToast(type, title, message) {
    const toast = createToast(type, title, message);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

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

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================================================
// INICIALIZACIÓN DE COMPONENTES
// ============================================================================

function initializeEventListeners() {
    // Event listener para cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal.show');
            modals.forEach(modal => modal.classList.remove('show'));
        }
    });

    // Event listeners para formularios
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    });

    // Inicializar búsqueda de productos
    initializeProductSearch();
    
    // Inicializar upload de archivos
    initializeFileUpload();
}

function initializeModals() {
    // Cerrar modales al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Botones de cerrar modales
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
}

// ============================================================================
// FUNCIONES DE CONTEOS CÍCLICOS
// ============================================================================

function showCycleCountDetail(countId) {
    const count = AdjustmentsApp.extendedData.cycle_counts?.find(c => c.id === countId);
    if (!count) return;

    const modal = document.getElementById('cycle-count-detail-modal');
    if (!modal) {
        console.warn('Modal de detalle de conteo no encontrado');
        return;
    }

    loadCycleCountDetailContent(count);
    modal.classList.add('show');
}

function loadCycleCountDetailContent(count) {
    const container = document.getElementById('cycle-count-detail-content');
    if (!container) return;

    const assignedUser = getUser(count.assigned_user_id);
    const warehouse = getWarehouse(count.warehouse_id);
    const zone = count.warehouse_zone_id ? getWarehouseZone(count.warehouse_zone_id) : null;
    const items = getCycleCountItems(count.id);

    container.innerHTML = `
        <div class="count-detail-header">
            <h3>${count.count_code} - ${count.count_name}</h3>
            <span class="count-status ${count.status.toLowerCase()}">${getCountStatusText(count.status)}</span>
        </div>

        <div class="count-info-section">
            <div class="info-grid">
                <div><strong>Bodega:</strong> ${warehouse?.warehouse_name || 'N/A'}</div>
                <div><strong>Zona:</strong> ${zone?.zone_name || 'Todas las zonas'}</div>
                <div><strong>Tipo:</strong> ${getCountTypeText(count.count_type)}</div>
                <div><strong>Fecha Programada:</strong> ${formatDate(count.scheduled_date)}</div>
                <div><strong>Asignado a:</strong> ${assignedUser?.first_name} ${assignedUser?.last_name}</div>
                <div><strong>Progreso:</strong> ${count.counted_products}/${count.total_products} productos</div>
            </div>
        </div>

        ${count.status === 'SCHEDULED' ? `
            <div class="count-actions">
                <button class="btn btn-primary" onclick="startCycleCount(${count.id})">
                    ▶️ Iniciar Conteo
                </button>
            </div>
        ` : ''}

        ${items.length > 0 ? `
            <div class="count-items-section">
                <h4>Productos Contados</h4>
                <table class="count-items-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>SKU</th>
                            <th>Esperado</th>
                            <th>Contado</th>
                            <th>Diferencia</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => createCountItemRow(item)).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}

        ${count.status === 'COMPLETED' && count.differences_found > 0 ? `
            <div class="count-summary">
                <div class="alert warning">
                    <strong>⚠️ Diferencias Encontradas:</strong> ${count.differences_found} productos con diferencias.
                    ${count.generated_adjustment_id ? `
                        <br>Se generó el ajuste automático: 
                        <a href="#" onclick="showAdjustmentDetail(${count.generated_adjustment_id})">
                            Ver Ajuste Generado
                        </a>
                    ` : ''}
                </div>
            </div>
        ` : ''}
    `;
}

function getCycleCountItems(countId) {
    return AdjustmentsApp.extendedData.cycle_count_items?.filter(i => i.cycle_count_id === countId) || [];
}

function createCountItemRow(item) {
    const variant = getVariantById(item.product_variant_id);
    const product = getProductByVariantId(item.product_variant_id);
    const difference = item.counted_quantity - item.expected_quantity;
    
    return `
        <tr>
            <td>${product?.product_name || 'N/A'}</td>
            <td>${variant?.variant_sku || 'N/A'}</td>
            <td>${item.expected_quantity}</td>
            <td>${item.counted_quantity || '-'}</td>
            <td class="difference-display ${getDifferenceClass(difference)}">
                ${difference > 0 ? '+' : ''}${difference}
            </td>
            <td>
                ${item.counted_quantity !== null ? 
                    (difference === 0 ? '✅ Correcto' : '⚠️ Con diferencia') : 
                    '⏳ Pendiente'
                }
            </td>
        </tr>
    `;
}

function startCycleCount(countId) {
    if (!confirm('¿Iniciar este conteo cíclico? Esto cambiará su estado a "En Proceso".')) {
        return;
    }

    try {
        const countIndex = AdjustmentsApp.extendedData.cycle_counts.findIndex(c => c.id === countId);
        if (countIndex === -1) return;

        AdjustmentsApp.extendedData.cycle_counts[countIndex].status = 'IN_PROGRESS';
        AdjustmentsApp.extendedData.cycle_counts[countIndex].started_at = new Date().toISOString();

        loadCycleCountsSection();
        closeModal('cycle-count-detail-modal');
        showSuccess('Conteo cíclico iniciado correctamente');

    } catch (error) {
        console.error('Error iniciando conteo:', error);
        showError('Error iniciando el conteo cíclico');
    }
}

// ============================================================================
// FUNCIONES DE REPORTES Y EXPORTACIÓN
// ============================================================================

function loadReportsSection() {
    const container = document.getElementById('reports-container');
    if (!container) return;

    const statistics = AdjustmentsApp.extendedData.adjustment_statistics || [];
    const currentPeriod = statistics.find(s => s.period === '2024-07') || {};

    container.innerHTML = `
        <div class="reports-header">
            <h3>📊 Reportes y Estadísticas</h3>
            <div class="reports-actions">
                <button class="btn btn-secondary" onclick="exportAdjustmentsReport()">
                    📊 Exportar Reporte
                </button>
                <button class="btn btn-info" onclick="generateStatisticsReport()">
                    📈 Generar Estadísticas
                </button>
            </div>
        </div>
        
        <div class="reports-grid">
            <div class="report-chart">
                <h4 class="chart-title">Ajustes por Período</h4>
                <div class="chart-placeholder">
                    📊 Gráfico de Ajustes por Mes<br>
                    Julio: ${currentPeriod.total_adjustments || 0} ajustes
                </div>
            </div>
            
            <div class="report-statistics">
                <h4>Estadísticas del Período Actual</h4>
                <table class="statistics-table">
                    <tbody>
                        <tr>
                            <td>Total Ajustes:</td>
                            <td class="stat-value">${currentPeriod.total_adjustments || 0}</td>
                        </tr>
                        <tr>
                            <td>Items Ajustados:</td>
                            <td class="stat-value">${currentPeriod.total_items_adjusted || 0}</td>
                        </tr>
                        <tr>
                            <td>Tasa Aprobación:</td>
                            <td class="stat-value">
                                ${currentPeriod.total_adjustments ? 
                                    Math.round((currentPeriod.approved_adjustments / currentPeriod.total_adjustments) * 100) : 0}%
                            </td>
                        </tr>
                        <tr>
                            <td>Tiempo Promedio:</td>
                            <td class="stat-value">${currentPeriod.avg_approval_time_hours || 0}h</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="reasons-summary">
            <h4>Ajustes por Causal</h4>
            <div class="reasons-grid">
                ${Object.entries(currentPeriod.by_reason || {}).map(([reason, count]) => {
                    const reasonObj = AdjustmentsApp.extendedData.adjustment_reasons?.find(r => r.reason_code === reason);
                    return `
                        <div class="reason-stat">
                            <div class="reason-color" style="background: ${reasonObj?.color || '#6c757d'}"></div>
                            <div class="reason-info">
                                <div class="reason-name">${reasonObj?.reason_name || reason}</div>
                                <div class="reason-count">${count} ajustes</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function exportAdjustmentsReport() {
    try {
        const adjustments = getFilteredAdjustments();
        const csvData = convertAdjustmentsToCSV(adjustments);
        downloadCSV(csvData, `reporte_ajustes_${new Date().toISOString().split('T')[0]}.csv`);
        showSuccess('Reporte exportado correctamente');
    } catch (error) {
        console.error('Error exportando reporte:', error);
        showError('Error exportando el reporte');
    }
}

function convertAdjustmentsToCSV(adjustments) {
    const headers = [
        'Número', 'Causal', 'Estado', 'Bodega', 'Items', 'Fecha', 
        'Creado Por', 'Aprobado Por', 'Descripción'
    ];

    const rows = adjustments.map(adj => {
        const reason = getAdjustmentReason(adj.reason_id);
        const warehouse = getWarehouse(adj.warehouse_id);
        const createdBy = getUser(adj.created_by_user_id);
        const approvedBy = adj.approved_by_user_id ? getUser(adj.approved_by_user_id) : null;

        return [
            adj.adjustment_number,
            reason?.reason_name || '',
            getStatusText(adj.status),
            warehouse?.warehouse_name || '',
            adj.total_items,
            adj.adjustment_date,
            `${createdBy?.first_name || ''} ${createdBy?.last_name || ''}`,
            approvedBy ? `${approvedBy.first_name} ${approvedBy.last_name}` : '',
            `"${adj.description || ''}"`
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

function generateStatisticsReport() {
    showInfo('Generando reporte estadístico...');
    
    setTimeout(() => {
        const stats = calculateDetailedStatistics();
        showStatisticsModal(stats);
    }, 1000);
}

function calculateDetailedStatistics() {
    const adjustments = AdjustmentsApp.extendedData.inventory_adjustments || [];
    const items = AdjustmentsApp.extendedData.adjustment_items || [];
    
    return {
        totalAdjustments: adjustments.length,
        totalItems: items.length,
        byStatus: {
            draft: adjustments.filter(a => a.status === 'DRAFT').length,
            pending: adjustments.filter(a => a.status === 'PENDING').length,
            approved: adjustments.filter(a => a.status === 'APPROVED').length,
            rejected: adjustments.filter(a => a.status === 'REJECTED').length,
            applied: adjustments.filter(a => a.status === 'APPLIED').length
        },
        positiveAdjustments: items.filter(i => i.adjustment_quantity > 0).length,
        negativeAdjustments: items.filter(i => i.adjustment_quantity < 0).length,
        avgProcessingTime: '4.2 horas' // Simulado
    };
}

function showStatisticsModal(stats) {
    const modal = document.getElementById('statistics-modal');
    if (!modal) {
        // Crear modal dinámicamente si no existe
        const modalHtml = `
            <div id="statistics-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>📊 Estadísticas Detalladas</h2>
                        <button class="close" onclick="closeModal('statistics-modal')">&times;</button>
                    </div>
                    <div class="modal-body" id="statistics-content">
                        <!-- Contenido se carga dinámicamente -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const content = document.getElementById('statistics-content');
    if (content) {
        content.innerHTML = `
            <div class="statistics-summary">
                <h4>Resumen General</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalAdjustments}</div>
                        <div class="stat-label">Total Ajustes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.totalItems}</div>
                        <div class="stat-label">Items Ajustados</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.positiveAdjustments}</div>
                        <div class="stat-label">Incrementos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${stats.negativeAdjustments}</div>
                        <div class="stat-label">Decrementos</div>
                    </div>
                </div>
                
                <h4>Distribución por Estado</h4>
                <div class="status-distribution">
                    ${Object.entries(stats.byStatus).map(([status, count]) => `
                        <div class="status-bar">
                            <span class="status-name">${getStatusText(status.toUpperCase())}</span>
                            <div class="status-progress">
                                <div class="status-fill" style="width: ${(count/stats.totalAdjustments)*100}%"></div>
                            </div>
                            <span class="status-count">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    document.getElementById('statistics-modal').classList.add('show');
}

// ============================================================================
// FUNCIONES DE VALIDACIÓN Y UTILIDADES
// ============================================================================

function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error-input');
            isValid = false;
        } else {
            field.classList.remove('error-input');
        }
    });

    return isValid;
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        form.querySelectorAll('.error-input').forEach(field => {
            field.classList.remove('error-input');
        });
    }
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

// Función de inicialización global para extra.js
function initializeExtraFunctions() {
    console.log('📝 Funciones auxiliares de Ajustes cargadas');
    
    // Auto-inicializar componentes críticos
    initializeEventListeners();
    initializeModals();
    
    // Configurar eventos globales
    window.addEventListener('beforeunload', () => {
        console.log('🧹 Limpiando recursos de Ajustes');
    });
}

// Auto-ejecutar cuando se carga el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtraFunctions);
} else {
    initializeExtraFunctions();
}

console.log('✅ Extra.js para Ajustes de Inventario cargado correctamente');