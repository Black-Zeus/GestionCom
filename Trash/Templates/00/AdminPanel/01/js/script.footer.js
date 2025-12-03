// ====================================
// FUNCIONALIDAD DEL FOOTER MINIMALISTA
// Agregar al final de script.js o crear archivo separado
// ====================================

class SystemFooter {
    constructor() {
        this.eventListeners = [];
        this.sessionStartTime = Date.now();
        this.notificationTimeout = null;
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupFooter());
        } else {
            this.setupFooter();
        }
    }

    setupFooter() {
        try {
            this.setupFooterLinks();
            this.startSessionTimer();
            this.loadUserSession();
            
            console.log('🦶 Footer del sistema inicializado correctamente');
            
            // Mostrar notificación de bienvenida
            setTimeout(() => {
                this.showFooterNotification('Sistema listo para operar', 'success');
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error inicializando footer:', error);
        }
    }

    // ====================================
    // MANEJO DE ENLACES DEL FOOTER
    // ====================================
    setupFooterLinks() {
        document.querySelectorAll('.footer-link').forEach(link => {
            this.addEventListener(link, 'click', (e) => {
                e.preventDefault();
                this.handleFooterLink(e.currentTarget);
            });
        });
    }

    handleFooterLink(link) {
        const action = link.dataset.action;
        const linkText = link.textContent;
        
        const actions = {
            terms: () => this.openModal('Términos y Condiciones', 'Se abrirían los términos del sistema'),
            privacy: () => this.openModal('Política de Privacidad', 'Se abriría la política de privacidad'),
            support: () => this.openModal('Soporte Técnico', 'Se abriría el centro de soporte'),
            help: () => this.openModal('Centro de Ayuda', 'Se abriría la documentación del sistema')
        };

        if (actions[action]) {
            actions[action]();
        } else {
            this.showFooterNotification(`📄 Abriendo: ${linkText}`, 'info');
        }
        
        console.log(`🔗 Enlace clickeado: ${linkText}`);
    }

    openModal(title, content) {
        // Por ahora usar alert, pero puedes integrar con tu sistema de modales
        alert(`${title}\n\n${content}`);
        this.showFooterNotification(`📄 ${title}`, 'info');
    }

    // ====================================
    // GESTIÓN DE INFORMACIÓN OPERATIVA
    // ====================================
    updateBranch(branchName) {
        const element = document.getElementById('currentBranch');
        if (element) {
            element.textContent = branchName;
            this.showFooterNotification(`🏢 Sucursal cambiada a: ${branchName}`, 'success');
        }
    }

    updateCashRegister(cashNumber) {
        const element = document.getElementById('currentCashRegister');
        if (element) {
            element.textContent = cashNumber;
            this.showFooterNotification(`💰 Caja cambiada a: ${cashNumber}`, 'success');
        }
    }

    updateUser(username, fullName, role) {
        const usernameElement = document.getElementById('currentUsername');
        const roleElement = document.getElementById('currentUserRole');
        
        if (usernameElement) usernameElement.textContent = username;
        if (roleElement) roleElement.textContent = role;
        
        this.showFooterNotification(`👤 Usuario: ${fullName} (${role})`, 'success');
    }

    updateShift(shiftName, status = 'success') {
        const shiftElement = document.getElementById('currentShift');
        const statusDot = document.getElementById('shiftStatusDot');
        
        if (shiftElement) {
            shiftElement.textContent = shiftName;
            shiftElement.className = `footer-value ${status}`;
        }
        
        if (statusDot) {
            statusDot.className = `status-dot ${status === 'success' ? 'pulse' : status}`;
        }
        
        this.showFooterNotification(`🕐 Turno: ${shiftName}`, status);
    }

    // ====================================
    // NOTIFICACIONES DEL FOOTER
    // ====================================
    showFooterNotification(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('footerNotification');
        const text = document.getElementById('footerNotificationText');
        
        if (!notification || !text) return;
        
        // Limpiar timeout anterior
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Configurar notificación
        text.textContent = message;
        notification.className = `footer-notification show ${type}`;
        
        // Auto-ocultar
        this.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    // ====================================
    // GESTIÓN DE SESIÓN
    // ====================================
    loadUserSession() {
        // Cargar información desde localStorage o API
        try {
            const sessionData = localStorage.getItem('currentSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                this.updateUser(session.username, session.fullName, session.role);
                this.updateBranch(session.branch);
                this.updateCashRegister(session.cashRegister);
                this.updateShift(session.shift, session.shiftStatus);
            }
        } catch (error) {
            console.warn('⚠️ Error cargando sesión:', error);
        }
    }

    saveUserSession(sessionData) {
        try {
            localStorage.setItem('currentSession', JSON.stringify({
                username: sessionData.username,
                fullName: sessionData.fullName,
                role: sessionData.role,
                branch: sessionData.branch,
                cashRegister: sessionData.cashRegister,
                shift: sessionData.shift,
                shiftStatus: sessionData.shiftStatus || 'success',
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn('⚠️ Error guardando sesión:', error);
        }
    }

    startSessionTimer() {
        // Actualizar cada minuto para optimizar rendimiento
        setInterval(() => {
            // Aquí podrías actualizar información en tiempo real
            // como verificar estado del servidor, etc.
        }, 60000);
    }

    getSessionDuration() {
        return Date.now() - this.sessionStartTime;
    }

    // ====================================
    // MÉTODOS PÚBLICOS PARA EL SISTEMA
    // ====================================
    changeBranch(branchName) {
        this.updateBranch(branchName);
    }

    changeCashRegister(cashNumber) {
        this.updateCashRegister(cashNumber);
    }

    changeUser(username, fullName, role) {
        this.updateUser(username, fullName, role);
    }

    changeShift(shiftName, status = 'success') {
        this.updateShift(shiftName, status);
    }

    notifySystemStatus(message, type = 'info') {
        this.showFooterNotification(message, type);
    }

    // ====================================
    // UTILIDADES
    // ====================================
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    destroy() {
        // Limpiar event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Limpiar timeouts
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        console.log('🧹 Footer del sistema limpiado');
    }
}

// ====================================
// API GLOBAL DEL FOOTER
// ====================================
window.SystemFooterAPI = {
    instance: null,
    
    init() {
        if (!this.instance) {
            this.instance = new SystemFooter();
        }
        return this.instance;
    },
    
    changeBranch(branchName) {
        if (this.instance) {
            this.instance.changeBranch(branchName);
        }
    },
    
    changeCashRegister(cashNumber) {
        if (this.instance) {
            this.instance.changeCashRegister(cashNumber);
        }
    },
    
    changeUser(username, fullName, role) {
        if (this.instance) {
            this.instance.changeUser(username, fullName, role);
        }
    },
    
    changeShift(shiftName, status = 'success') {
        if (this.instance) {
            this.instance.changeShift(shiftName, status);
        }
    },
    
    notify(message, type = 'info') {
        if (this.instance) {
            this.instance.notifySystemStatus(message, type);
        }
    },
    
    saveSession(sessionData) {
        if (this.instance) {
            this.instance.saveUserSession(sessionData);
        }
    }
};

// ====================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ====================================
window.updateSystemFooter = function(type, value) {
    const api = window.SystemFooterAPI;
    
    switch(type) {
        case 'branch':
            api.changeBranch(value);
            break;
        case 'cash':
            api.changeCashRegister(value);
            break;
        case 'user':
            api.changeUser(value.username, value.fullName, value.role);
            break;
        case 'shift':
            api.changeShift(value.name, value.status);
            break;
        default:
            console.warn('Tipo de actualización no reconocido:', type);
    }
};

window.notifyFooter = function(message, type = 'info') {
    window.SystemFooterAPI.notify(message, type);
};