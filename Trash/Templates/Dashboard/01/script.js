/* ====================================
   DASHBOARD JAVASCRIPT - FUNCIONALIDADES COMPLETAS
==================================== */

// ====================================
// CONFIGURACIÓN GLOBAL
// ====================================
const DashboardConfig = {
    updateInterval: 5000, // 5 segundos
    animationDuration: 300,
    autoCollapseOnMobile: true,
    enableRealTimeUpdates: true,
    enableNotifications: true
};

// ====================================
// CLASE PRINCIPAL DEL DASHBOARD
// ====================================
class Dashboard {
    constructor() {
        this.isInitialized = false;
        this.updateTimers = [];
        this.collapsedSections = new Set();
        this.notificationCount = 0;
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando Dashboard...');
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            this.setupSectionToggle();
            this.setupResponsiveHandlers();
            this.initializeDefaultStates();
            this.startRealTimeUpdates();
            this.setupKeyboardShortcuts();
            this.setupScrollHandlers();
            this.initializeTooltips();
            
            this.isInitialized = true;
            console.log('✅ Dashboard inicializado correctamente');
            
            // Disparar evento personalizado
            this.dispatchEvent('dashboardReady');
            
        } catch (error) {
            console.error('❌ Error inicializando dashboard:', error);
        }
    }

    // ====================================
    // TOGGLE DE SECCIONES
    // ====================================
    setupSectionToggle() {
        const headers = document.querySelectorAll('.section-header');
        
        headers.forEach(header => {
            header.addEventListener('click', (e) => this.toggleSection(e.currentTarget));
            
            // Agregar indicador visual de que es clickeable
            header.style.cursor = 'pointer';
            header.setAttribute('tabindex', '0');
            
            // Soporte para teclado
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleSection(e.currentTarget);
                }
            });
        });
    }

    toggleSection(header) {
        const section = header.parentElement;
        const sectionId = section.dataset.sectionId || section.querySelector('.section-header').textContent.trim();
        
        section.classList.toggle('collapsed');
        
        // Actualizar estado interno
        if (section.classList.contains('collapsed')) {
            this.collapsedSections.add(sectionId);
        } else {
            this.collapsedSections.delete(sectionId);
        }
        
        // Guardar estado en localStorage
        this.saveCollapsedState();
        
        // Disparar evento
        this.dispatchEvent('sectionToggled', { 
            sectionId, 
            collapsed: section.classList.contains('collapsed') 
        });
        
        // Animación suave
        this.animateToggle(section);
    }

    animateToggle(section) {
        const content = section.querySelector('.section-content');
        if (!content) return;

        if (section.classList.contains('collapsed')) {
            content.style.maxHeight = content.scrollHeight + 'px';
            setTimeout(() => {
                content.style.maxHeight = '0';
                content.style.opacity = '0';
            }, 10);
        } else {
            content.style.maxHeight = '0';
            content.style.opacity = '0';
            setTimeout(() => {
                content.style.maxHeight = content.scrollHeight + 'px';
                content.style.opacity = '1';
                
                setTimeout(() => {
                    content.style.maxHeight = 'none';
                }, DashboardConfig.animationDuration);
            }, 10);
        }
    }

    // ====================================
    // ESTADOS INICIALES
    // ====================================
    initializeDefaultStates() {
        // Cargar estado guardado
        this.loadCollapsedState();
        
        // Colapsar algunas secciones por defecto en móvil
        if (this.isMobile() && DashboardConfig.autoCollapseOnMobile) {
            this.collapseNonCriticalSections();
        }
        
        // Agregar IDs a las secciones si no los tienen
        this.addSectionIds();
        
        // Configurar estados visuales iniciales
        this.updateSectionStates();
    }

    addSectionIds() {
        const sections = document.querySelectorAll('.section');
        sections.forEach((section, index) => {
            if (!section.dataset.sectionId) {
                const header = section.querySelector('.section-header');
                const title = header ? header.textContent.trim() : `section-${index}`;
                section.dataset.sectionId = this.slugify(title);
            }
        });
    }

    collapseNonCriticalSections() {
        const criticalSections = ['dashboard-principal', 'punto-de-venta', 'control-de-caja'];
        const sections = document.querySelectorAll('.section');
        
        sections.forEach(section => {
            const sectionId = section.dataset.sectionId;
            if (!criticalSections.includes(sectionId)) {
                section.classList.add('collapsed');
                this.collapsedSections.add(sectionId);
            }
        });
    }

    // ====================================
    // ACTUALIZACIONES EN TIEMPO REAL
    // ====================================
    startRealTimeUpdates() {
        if (!DashboardConfig.enableRealTimeUpdates) return;
        
        // Actualizar métricas principales cada 5 segundos
        const metricsTimer = setInterval(() => {
            this.updateMetrics();
        }, DashboardConfig.updateInterval);
        
        // Actualizar alertas cada 10 segundos
        const alertsTimer = setInterval(() => {
            this.updateAlerts();
        }, DashboardConfig.updateInterval * 2);
        
        // Actualizar timestamp cada minuto
        const timestampTimer = setInterval(() => {
            this.updateTimestamps();
        }, 60000);
        
        this.updateTimers.push(metricsTimer, alertsTimer, timestampTimer);
        
        console.log('⏰ Actualizaciones en tiempo real iniciadas');
    }

    updateMetrics() {
        const metrics = document.querySelectorAll('.metric');
        
        metrics.forEach(metric => {
            if (Math.random() > 0.95) { // 5% probabilidad de actualización
                this.animateMetricUpdate(metric);
            }
        });
    }

    animateMetricUpdate(metric) {
        const originalValue = metric.textContent;
        
        // Simular nueva data (solo para demo)
        if (originalValue.includes('$')) {
            const currentValue = this.parseNumber(originalValue);
            const variation = (Math.random() - 0.5) * 0.1; // ±5% variación
            const newValue = Math.round(currentValue * (1 + variation));
            
            // Animación de cambio
            metric.style.transform = 'scale(1.1)';
            metric.style.color = variation > 0 ? '#28a745' : '#dc3545';
            
            setTimeout(() => {
                metric.textContent = this.formatCurrency(newValue);
                
                setTimeout(() => {
                    metric.style.transform = 'scale(1)';
                    metric.style.color = '#007bff';
                }, 150);
            }, 150);
        }
    }

    updateAlerts() {
        // Simular nuevas alertas ocasionalmente
        if (Math.random() > 0.9) { // 10% probabilidad
            this.addNewAlert();
        }
        
        // Actualizar timestamps de alertas existentes
        this.updateAlertTimestamps();
    }

    addNewAlert() {
        const alertsContainer = document.querySelector('.section[data-section-id*="notificaciones"] .table-mockup');
        if (!alertsContainer) return;
        
        const alerts = [
            { type: 'warning', message: 'Nuevo producto con stock bajo detectado', time: 'Ahora' },
            { type: 'danger', message: 'Cliente excedió límite de crédito', time: 'Hace 1 min' },
            { type: 'good', message: 'Factura pagada exitosamente', time: 'Hace 2 min' }
        ];
        
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        const newRow = this.createAlertRow(randomAlert);
        
        // Insertar al inicio
        const firstRow = alertsContainer.querySelector('.table-row');
        if (firstRow) {
            firstRow.parentNode.insertBefore(newRow, firstRow);
            
            // Animar entrada
            newRow.style.opacity = '0';
            newRow.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                newRow.style.transition = 'all 0.3s ease';
                newRow.style.opacity = '1';
                newRow.style.transform = 'translateX(0)';
            }, 100);
            
            // Remover alertas antiguas (mantener máximo 5)
            const rows = alertsContainer.querySelectorAll('.table-row');
            if (rows.length > 5) {
                rows[rows.length - 1].remove();
            }
        }
        
        this.notificationCount++;
        this.updateNotificationBadge();
    }

    createAlertRow(alert) {
        const row = document.createElement('div');
        row.className = 'table-row';
        row.innerHTML = `
            <span>
                <span class="status-indicator status-${alert.type}"></span>
                ${alert.message}
            </span>
            <span>${alert.time}</span>
        `;
        return row;
    }

    updateAlertTimestamps() {
        const timeElements = document.querySelectorAll('.table-row span:last-child');
        
        timeElements.forEach(element => {
            const text = element.textContent;
            if (text.includes('Hace') && text.includes('min')) {
                const minutes = parseInt(text.match(/\d+/)[0]);
                element.textContent = `Hace ${minutes + 1} min`;
            }
        });
    }

    updateTimestamps() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Actualizar timestamps dinámicos
        document.querySelectorAll('[data-timestamp]').forEach(element => {
            element.textContent = timeString;
        });
    }

    // ====================================
    // MANEJO RESPONSIVO
    // ====================================
    setupResponsiveHandlers() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // Detectar cambio de orientación en móviles
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.handleResize(), 500);
        });
    }

    handleResize() {
        const wasMobile = this.wasMobile;
        const isMobile = this.isMobile();
        
        // Si cambió de desktop a móvil
        if (!wasMobile && isMobile && DashboardConfig.autoCollapseOnMobile) {
            this.collapseNonCriticalSections();
        }
        
        // Si cambió de móvil a desktop
        if (wasMobile && !isMobile) {
            this.expandAllSections();
        }
        
        this.wasMobile = isMobile;
        
        // Recalcular heights de secciones colapsadas
        this.recalculateCollapsedSections();
        
        this.dispatchEvent('dashboardResized', { isMobile });
    }

    recalculateCollapsedSections() {
        const collapsedSections = document.querySelectorAll('.section.collapsed');
        
        collapsedSections.forEach(section => {
            const content = section.querySelector('.section-content');
            if (content) {
                content.style.maxHeight = '0';
            }
        });
    }

    expandAllSections() {
        const sections = document.querySelectorAll('.section.collapsed');
        sections.forEach(section => {
            section.classList.remove('collapsed');
        });
        this.collapsedSections.clear();
        this.saveCollapsedState();
    }

    // ====================================
    // ATAJOS DE TECLADO
    // ====================================
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Solo procesar si no estamos en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Ctrl/Cmd + teclas numéricas para ir a secciones
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                this.goToSection(parseInt(e.key) - 1);
            }
            
            // Ctrl/Cmd + A para expandir/colapsar todo
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.toggleAllSections();
            }
            
            // Escape para colapsar todo
            if (e.key === 'Escape') {
                this.collapseAllSections();
            }
            
            // F5 para actualizar datos
            if (e.key === 'F5') {
                e.preventDefault();
                this.refreshDashboard();
            }
        });
    }

    goToSection(index) {
        const sections = document.querySelectorAll('.section');
        if (sections[index]) {
            sections[index].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Expandir si está colapsada
            if (sections[index].classList.contains('collapsed')) {
                this.toggleSection(sections[index].querySelector('.section-header'));
            }
        }
    }

    toggleAllSections() {
        const hasCollapsed = document.querySelector('.section.collapsed');
        
        if (hasCollapsed) {
            this.expandAllSections();
        } else {
            this.collapseAllSections();
        }
    }

    collapseAllSections() {
        const sections = document.querySelectorAll('.section:not(.collapsed)');
        sections.forEach(section => {
            section.classList.add('collapsed');
            const sectionId = section.dataset.sectionId;
            this.collapsedSections.add(sectionId);
        });
        this.saveCollapsedState();
    }

    // ====================================
    // SCROLL Y NAVEGACIÓN
    // ====================================
    setupScrollHandlers() {
        let scrollTimer;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.handleScroll();
            }, 100);
        });
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Mostrar/ocultar botón de volver arriba
        this.toggleBackToTop(scrollTop > 300);
        
        // Lazy loading de contenido si es necesario
        this.checkLazyLoad();
    }

    toggleBackToTop(show) {
        let backToTopBtn = document.getElementById('backToTop');
        
        if (!backToTopBtn && show) {
            backToTopBtn = this.createBackToTopButton();
            document.body.appendChild(backToTopBtn);
        }
        
        if (backToTopBtn) {
            backToTopBtn.style.display = show ? 'block' : 'none';
        }
    }

    createBackToTopButton() {
        const button = document.createElement('button');
        button.id = 'backToTop';
        button.innerHTML = '↑';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #007bff;
            color: white;
            border: none;
            font-size: 20px;
            cursor: pointer;
            z-index: 1000;
            display: none;
            transition: all 0.3s ease;
        `;
        
        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#0056b3';
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#007bff';
            button.style.transform = 'scale(1)';
        });
        
        return button;
    }

    checkLazyLoad() {
        // Implementar lazy loading si es necesario
        // Por ahora, placeholder para funcionalidad futura
    }

    // ====================================
    // TOOLTIPS Y AYUDA
    // ====================================
    initializeTooltips() {
        // Agregar tooltips a elementos con título
        const elementsWithTitle = document.querySelectorAll('[title]');
        
        elementsWithTitle.forEach(element => {
            this.addTooltip(element);
        });
        
        // Agregar tooltips a métricas
        const metrics = document.querySelectorAll('.metric');
        metrics.forEach(metric => {
            const card = metric.closest('.card');
            if (card) {
                const title = card.querySelector('.card-title')?.textContent;
                if (title) {
                    metric.setAttribute('title', `Métrica: ${title}`);
                    this.addTooltip(metric);
                }
            }
        });
    }

    addTooltip(element) {
        element.addEventListener('mouseenter', (e) => this.showTooltip(e));
        element.addEventListener('mouseleave', () => this.hideTooltip());
        element.addEventListener('mousemove', (e) => this.moveTooltip(e));
    }

    showTooltip(e) {
        const title = e.target.getAttribute('title');
        if (!title) return;
        
        // Remover title para evitar tooltip nativo
        e.target.setAttribute('data-original-title', title);
        e.target.removeAttribute('title');
        
        let tooltip = document.getElementById('custom-tooltip');
        if (!tooltip) {
            tooltip = this.createTooltip();
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = title;
        tooltip.style.display = 'block';
        this.positionTooltip(tooltip, e);
    }

    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.id = 'custom-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10000;
            pointer-events: none;
            max-width: 200px;
            word-wrap: break-word;
            display: none;
        `;
        return tooltip;
    }

    positionTooltip(tooltip, e) {
        const x = e.pageX + 10;
        const y = e.pageY - 30;
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    moveTooltip(e) {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            this.positionTooltip(tooltip, e);
        }
    }

    hideTooltip() {
        const tooltip = document.getElementById('custom-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
        
        // Restaurar title original
        const elementWithTooltip = document.querySelector('[data-original-title]');
        if (elementWithTooltip) {
            elementWithTooltip.setAttribute('title', elementWithTooltip.getAttribute('data-original-title'));
            elementWithTooltip.removeAttribute('data-original-title');
        }
    }

    // ====================================
    // PERSISTENCIA DE ESTADO
    // ====================================
    saveCollapsedState() {
        try {
            const state = Array.from(this.collapsedSections);
            localStorage.setItem('dashboardCollapsedSections', JSON.stringify(state));
        } catch (error) {
            console.warn('No se pudo guardar el estado:', error);
        }
    }

    loadCollapsedState() {
        try {
            const saved = localStorage.getItem('dashboardCollapsedSections');
            if (saved) {
                const state = JSON.parse(saved);
                this.collapsedSections = new Set(state);
                
                // Aplicar estado guardado
                state.forEach(sectionId => {
                    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
                    if (section) {
                        section.classList.add('collapsed');
                    }
                });
            }
        } catch (error) {
            console.warn('No se pudo cargar el estado guardado:', error);
        }
    }

    updateSectionStates() {
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            const sectionId = section.dataset.sectionId;
            if (this.collapsedSections.has(sectionId)) {
                section.classList.add('collapsed');
            }
        });
    }

    // ====================================
    // NOTIFICACIONES
    // ====================================
    updateNotificationBadge() {
        let badge = document.getElementById('notification-badge');
        
        if (this.notificationCount > 0) {
            if (!badge) {
                badge = this.createNotificationBadge();
                const notificationSection = document.querySelector('[data-section-id*="notificaciones"] .section-header');
                if (notificationSection) {
                    notificationSection.appendChild(badge);
                }
            }
            
            if (badge) {
                badge.textContent = this.notificationCount > 99 ? '99+' : this.notificationCount;
                badge.style.display = 'inline-block';
            }
        } else if (badge) {
            badge.style.display = 'none';
        }
    }

    createNotificationBadge() {
        const badge = document.createElement('span');
        badge.id = 'notification-badge';
        badge.style.cssText = `
            background: #dc3545;
            color: white;
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            margin-left: 8px;
            min-width: 18px;
            text-align: center;
            display: inline-block;
        `;
        return badge;
    }

    // ====================================
    // UTILIDADES
    // ====================================
    isMobile() {
        return window.innerWidth <= 768;
    }

    slugify(text) {
        return text.toLowerCase()
                   .replace(/[^\w\s-]/g, '')
                   .replace(/[\s_-]+/g, '-')
                   .replace(/^-+|-+$/g, '');
    }

    parseNumber(text) {
        return parseInt(text.replace(/[^\d]/g, '')) || 0;
    }

    formatCurrency(number) {
        return '$' + number.toLocaleString('es-ES');
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    refreshDashboard() {
        console.log('🔄 Refrescando dashboard...');
        this.updateMetrics();
        this.updateAlerts();
        this.updateTimestamps();
        
        // Mostrar indicador de carga
        this.showLoadingIndicator();
        
        setTimeout(() => {
            this.hideLoadingIndicator();
            console.log('✅ Dashboard actualizado');
        }, 1000);
    }

    showLoadingIndicator() {
        document.body.classList.add('loading');
    }

    hideLoadingIndicator() {
        document.body.classList.remove('loading');
    }

    // ====================================
    // CLEANUP
    // ====================================
    destroy() {
        // Limpiar timers
        this.updateTimers.forEach(timer => clearInterval(timer));
        this.updateTimers = [];
        
        // Remover event listeners
        document.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('scroll', this.scrollHandler);
        
        // Limpiar estado
        this.collapsedSections.clear();
        this.isInitialized = false;
        
        console.log('🧹 Dashboard limpiado');
    }
}

// ====================================
// API PÚBLICA
// ====================================
window.DashboardAPI = {
    instance: null,
    
    init() {
        if (!this.instance) {
            this.instance = new Dashboard();
        }
        return this.instance;
    },
    
    toggleSection(sectionId) {
        if (this.instance) {
            const section = document.querySelector(`[data-section-id="${sectionId}"]`);
            if (section) {
                const header = section.querySelector('.section-header');
                this.instance.toggleSection(header);
            }
        }
    },
    
    goToSection(sectionId) {
        const section = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    },
    
    refresh() {
        if (this.instance) {
            this.instance.refreshDashboard();
        }
    },
    
    getState() {
        if (this.instance) {
            return {
                collapsed: Array.from(this.instance.collapsedSections),
                notifications: this.instance.notificationCount,
                isMobile: this.instance.isMobile()
            };
        }
        return null;
    }
};

// ====================================
// AUTO-INICIALIZACIÓN
// ====================================
// Inicializar automáticamente cuando se carga el script
(function() {
    'use strict';
    
    console.log('📊 Dashboard JavaScript cargado');
    
    // Inicializar dashboard
    window.DashboardAPI.init();
    
    // Exponer funciones globales para compatibilidad
    window.toggleSection = function(header) {
        if (window.DashboardAPI.instance) {
            window.DashboardAPI.instance.toggleSection(header);
        }
    };
    
    // Event listeners para eventos personalizados
    document.addEventListener('dashboardReady', function(e) {
        console.log('🎉 Dashboard listo para usar');
    });
    
    document.addEventListener('sectionToggled', function(e) {
        console.log(`📂 Sección ${e.detail.sectionId} ${e.detail.collapsed ? 'colapsada' : 'expandida'}`);
    });
    
    document.addEventListener('dashboardResized', function(e) {
        console.log(`📱 Dashboard redimensionado - Móvil: ${e.detail.isMobile}`);
    });
    
})();