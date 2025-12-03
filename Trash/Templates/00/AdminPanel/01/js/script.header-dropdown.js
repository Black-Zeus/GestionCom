class HeaderDropdowns {
    constructor() {
        this.activeDropdown = null;
        this.eventListeners = [];
        this.init();
    }

    init() {
        console.log('🎯 Inicializando Header Dropdowns...');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupDropdowns());
        } else {
            this.setupDropdowns();
        }
    }

    setupDropdowns() {
        try {
            this.setupNotificationsDropdown();
            this.setupMessagesDropdown();
            this.setupSettingsDropdown();
            this.setupUserProfileDropdown(); // ← AGREGAR ESTA LÍNEA
            this.setupGlobalHandlers();
            this.setupConfigToggles();
            
            console.log('✅ Header Dropdowns inicializados correctamente');
            
            // Simular actualizaciones en tiempo real
            this.startRealTimeUpdates();
        } catch (error) {
            console.error('❌ Error inicializando dropdowns:', error);
        }
    }

     setupUserProfileDropdown() {
        const userProfile = document.getElementById('headerUserProfile');
        const dropdown = document.getElementById('userProfileDropdown');
        
        if (userProfile && dropdown) {
            this.addEventListener(userProfile, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown('userProfile', dropdown);
            });

            // Manejar clics en opciones del perfil
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                this.addEventListener(item, 'click', (e) => {
                    this.handleUserProfileClick(e, item);
                });
            });
        }
    }

    handleUserProfileClick(e, item) {
        e.stopPropagation();
        
        const title = item.querySelector('.dropdown-item-title')?.textContent;
        console.log('👤 Opción de perfil clickeada:', title);
        
        if (title?.includes('Perfil')) {
            this.closeAllDropdowns();
            this.showAlert('👤 Perfil', 'Se abriría la página de perfil', 'info');
        } else if (title?.includes('Configuraciones')) {
            this.closeAllDropdowns();
            this.showAlert('⚙️ Configuraciones', 'Se abriría configuraciones', 'info');
        } else if (title?.includes('Notificaciones')) {
            this.closeAllDropdowns();
            this.showAlert('🔔 Notificaciones', 'Se abriría configuración de notificaciones', 'info');
        } else if (title?.includes('Cerrar Sesión')) {
            this.closeAllDropdowns();
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                this.showAlert('🚪 Cerrando Sesión', 'Redirigiendo...', 'warning');
            }
        }
    }
    // ====================================
    // DROPDOWN DE NOTIFICACIONES
    // ====================================
    setupNotificationsDropdown() {
        const btn = document.getElementById('notificationsBtn');
        const dropdown = document.getElementById('notificationsDropdown');
        
        if (btn && dropdown) {
            this.addEventListener(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown('notifications', dropdown);
            });

            // Manejar clics en elementos de notificación
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                this.addEventListener(item, 'click', (e) => {
                    this.handleNotificationClick(e, item);
                });
            });

            // Botón marcar todas como leídas
            const markAllBtn = dropdown.querySelector('.dropdown-action-btn');
            if (markAllBtn) {
                this.addEventListener(markAllBtn, 'click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.markAllNotificationsRead();
                });
            }
        }
    }

    handleNotificationClick(e, item) {
        e.stopPropagation();
        
        // Marcar como leída
        if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            this.updateNotificationBadge();
            
            // Efecto visual
            item.style.background = 'rgba(40, 167, 69, 0.1)';
            setTimeout(() => {
                item.style.background = '';
            }, 1000);
        }
        
        // Obtener tipo de notificación y manejar acción
        const title = item.querySelector('.dropdown-item-title')?.textContent;
        console.log('📢 Notificación clickeada:', title);
        
        // Mostrar feedback
        this.showNotificationFeedback(title);
    }

    markAllNotificationsRead() {
        const dropdown = document.getElementById('notificationsDropdown');
        const unreadItems = dropdown.querySelectorAll('.dropdown-item.unread');
        
        unreadItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.remove('unread');
                item.style.background = 'rgba(40, 167, 69, 0.1)';
                setTimeout(() => {
                    item.style.background = '';
                }, 500);
            }, index * 100);
        });
        
        setTimeout(() => {
            this.updateNotificationBadge();
        }, unreadItems.length * 100 + 200);
        
        console.log('✅ Todas las notificaciones marcadas como leídas');
    }

    updateNotificationBadge() {
        const dropdown = document.getElementById('notificationsDropdown');
        const badge = document.querySelector('#notificationsBtn .badge');
        const headerBadge = dropdown.querySelector('.dropdown-badge');
        
        const unreadCount = dropdown.querySelectorAll('.dropdown-item.unread').length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
                badge.style.animation = 'badgeBounce 0.5s ease';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (headerBadge) {
            headerBadge.textContent = unreadCount;
        }
    }

    // ====================================
    // DROPDOWN DE MENSAJES
    // ====================================
    setupMessagesDropdown() {
        const btn = document.getElementById('messagesBtn');
        const dropdown = document.getElementById('messagesDropdown');
        
        if (btn && dropdown) {
            this.addEventListener(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown('messages', dropdown);
            });

            // Manejar clics en mensajes
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                this.addEventListener(item, 'click', (e) => {
                    this.handleMessageClick(e, item);
                });
            });

            // Botón nuevo mensaje
            const newMessageBtn = dropdown.querySelector('.dropdown-action-btn');
            if (newMessageBtn) {
                this.addEventListener(newMessageBtn, 'click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openNewMessage();
                });
            }
        }
    }

    handleMessageClick(e, item) {
        e.stopPropagation();
        
        // Marcar como leído
        if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            this.updateMessageBadge();
            
            // Efecto visual
            item.style.background = 'rgba(52, 152, 219, 0.1)';
            setTimeout(() => {
                item.style.background = '';
            }, 1000);
        }
        
        const sender = item.querySelector('.dropdown-item-title')?.textContent;
        console.log('💬 Mensaje clickeado de:', sender);
        
        this.showMessageFeedback(sender);
    }

    openNewMessage() {
        console.log('✏️ Abriendo editor de nuevo mensaje...');
        this.closeAllDropdowns();
        this.showAlert('📝 Nuevo Mensaje', 'Se abriría el editor de mensajes', 'info');
    }

    updateMessageBadge() {
        const dropdown = document.getElementById('messagesDropdown');
        const badge = document.querySelector('#messagesBtn .badge');
        const headerBadge = dropdown.querySelector('.dropdown-badge');
        
        const unreadCount = dropdown.querySelectorAll('.dropdown-item.unread').length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (headerBadge) {
            headerBadge.textContent = unreadCount;
        }
    }

    // ====================================
    // DROPDOWN DE CONFIGURACIÓN
    // ====================================
    setupSettingsDropdown() {
        const btn = document.getElementById('settingsBtn');
        const dropdown = document.getElementById('settingsDropdown');
        
        if (btn && dropdown) {
            this.addEventListener(btn, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleDropdown('settings', dropdown);
            });

            // Manejar clics en opciones de configuración
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                this.addEventListener(item, 'click', (e) => {
                    this.handleSettingClick(e, item);
                });
            });
        }
    }

    handleSettingClick(e, item) {
        e.stopPropagation();
        
        const title = item.querySelector('.dropdown-item-title')?.textContent;
        console.log('⚙️ Configuración clickeada:', title);
        
        if (title?.includes('Tema')) {
            // Toggle tema
            if (window.SidebarAPI && window.SidebarAPI.instance) {
                window.SidebarAPI.instance.toggleTheme();
            }
            this.closeAllDropdowns();
            this.showAlert('🌙 Tema', 'Tema cambiado', 'success');
        } else if (title?.includes('Avanzada')) {
            this.closeAllDropdowns();
            this.showAlert('🔧 Configuración', 'Se abriría configuración avanzada', 'info');
        } else if (title?.includes('Dashboard')) {
            this.closeAllDropdowns();
            this.showAlert('📊 Dashboard', 'Se abriría personalización del dashboard', 'info');
        }
    }

    // ====================================
    // TOGGLES DE CONFIGURACIÓN
    // ====================================
    setupConfigToggles() {
        document.querySelectorAll('.config-toggle').forEach(toggle => {
            this.addEventListener(toggle, 'click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleConfigToggle(toggle);
            });
        });
    }

    handleConfigToggle(toggle) {
        const setting = toggle.dataset.setting;
        const isActive = toggle.classList.contains('active');
        
        if (isActive) {
            toggle.classList.remove('active');
        } else {
            toggle.classList.add('active');
        }
        
        // Animación del toggle
        toggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggle.style.transform = 'scale(1)';
        }, 100);
        
        console.log(`🔧 Configuración ${setting}: ${!isActive ? 'activada' : 'desactivada'}`);
        
        this.saveConfigSetting(setting, !isActive);
        this.showAlert('⚙️ Configuración', `${setting} ${!isActive ? 'activada' : 'desactivada'}`, 'success');
    }

    saveConfigSetting(setting, value) {
        try {
            const config = JSON.parse(localStorage.getItem('user_config') || '{}');
            config[setting] = value;
            localStorage.setItem('user_config', JSON.stringify(config));
            console.log('💾 Configuración guardada:', setting, value);
        } catch (error) {
            console.warn('⚠️ Error guardando configuración:', error);
        }
    }

    // ====================================
    // MANEJO GENERAL DE DROPDOWNS
    // ====================================
    toggleDropdown(type, dropdown) {
        // Cerrar otros dropdowns
        if (this.activeDropdown && this.activeDropdown !== type) {
            this.closeAllDropdowns();
        }
        
        // Toggle el dropdown actual
        if (dropdown.classList.contains('open')) {
            this.closeDropdown(dropdown);
            this.activeDropdown = null;
        } else {
            this.openDropdown(dropdown);
            this.activeDropdown = type;
        }
    }

    openDropdown(dropdown) {
        dropdown.classList.add('open');
        const overlay = document.getElementById('dropdownOverlay');
        if (overlay) {
            overlay.classList.add('active');
        }
        
        // Animación de entrada para los elementos
        const items = dropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.05}s`;
            item.style.animation = 'dropdownItemSlide 0.3s ease-out forwards';
        });
    }

    closeDropdown(dropdown) {
        dropdown.classList.remove('open');
        
        // Si no hay más dropdowns abiertos, cerrar overlay
        if (!document.querySelector('.header-dropdown.open')) {
            const overlay = document.getElementById('dropdownOverlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
        }
    }

    closeAllDropdowns() {
        document.querySelectorAll('.header-dropdown.open').forEach(dropdown => {
            this.closeDropdown(dropdown);
        });
        this.activeDropdown = null;
    }

    // ====================================
    // EVENT HANDLERS GLOBALES
    // ====================================
    setupGlobalHandlers() {
        // Cerrar dropdowns al hacer clic fuera
        this.addEventListener(document, 'click', (e) => {
            if (!e.target.closest('.header-dropdown-container')) {
                this.closeAllDropdowns();
            }
        });

        // Cerrar con Escape
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
            }
        });

        // Overlay click
        const overlay = document.getElementById('dropdownOverlay');
        if (overlay) {
            this.addEventListener(overlay, 'click', () => {
                this.closeAllDropdowns();
            });
        }

        // Cerrar al redimensionar ventana
        this.addEventListener(window, 'resize', () => {
            this.closeAllDropdowns();
        });

        // Menu toggle para móvil
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            this.addEventListener(menuToggle, 'click', (e) => {
                e.preventDefault();
                if (window.SidebarAPI && window.SidebarAPI.instance) {
                    window.SidebarAPI.instance.toggleMobileSidebar();
                }
            });
        }
    }

    // ====================================
    // SIMULACIÓN DE DATOS EN TIEMPO REAL
    // ====================================
    startRealTimeUpdates() {
        // Simular nuevas notificaciones cada 30 segundos
        setInterval(() => {
            if (Math.random() > 0.8) { // 20% probabilidad
                this.addNewNotification();
            }
        }, 30000);

        // Simular nuevos mensajes cada 45 segundos
        setInterval(() => {
            if (Math.random() > 0.9) { // 10% probabilidad
                this.addNewMessage();
            }
        }, 45000);
    }

    addNewNotification() {
        const dropdown = document.getElementById('notificationsDropdown');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (!content) return;
        
        const notifications = [
            {
                icon: '⚠️',
                title: 'Stock Bajo Detectado',
                message: 'El producto "Cable USB" tiene solo 5 unidades restantes.',
                time: 'Ahora',
                status: 'urgent'
            },
            {
                icon: '💰',
                title: 'Pago Recibido',
                message: 'Cliente XYZ ha realizado un pago de $25,000.',
                time: 'Ahora',
                status: 'normal'
            }
        ];
        
        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        
        const newItem = document.createElement('div');
        newItem.className = 'dropdown-item unread';
        newItem.innerHTML = `
            <div class="dropdown-icon notification">${randomNotification.icon}</div>
            <div class="dropdown-item-content">
                <div class="dropdown-item-title">${randomNotification.title}</div>
                <div class="dropdown-item-message">${randomNotification.message}</div>
                <div class="dropdown-item-meta">
                    <span class="dropdown-item-time">${randomNotification.time}</span>
                    <span class="dropdown-item-status ${randomNotification.status}">${randomNotification.status === 'urgent' ? 'Urgente' : 'Normal'}</span>
                </div>
            </div>
        `;
        
        // Agregar event listener al nuevo elemento
        this.addEventListener(newItem, 'click', (e) => {
            this.handleNotificationClick(e, newItem);
        });
        
        // Insertar al inicio con animación
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateX(-20px)';
        content.insertBefore(newItem, content.firstChild);
        
        setTimeout(() => {
            newItem.style.transition = 'all 0.3s ease';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateX(0)';
        }, 100);
        
        this.updateNotificationBadge();
        console.log('🔔 Nueva notificación agregada:', randomNotification.title);
    }

    addNewMessage() {
        const dropdown = document.getElementById('messagesDropdown');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (!content) return;
        
        const messages = [
            {
                avatar: 'LM',
                sender: 'Luis Morales',
                message: 'El inventario de la bodega sur está listo para revisión.',
                time: 'Ahora'
            },
            {
                avatar: 'PS',
                sender: 'Patricia Silva',
                message: '¿Podemos programar una reunión para revisar las ventas?',
                time: 'Ahora'
            }
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const newItem = document.createElement('div');
        newItem.className = 'dropdown-item unread';
        newItem.innerHTML = `
            <div class="dropdown-avatar">${randomMessage.avatar}</div>
            <div class="dropdown-item-content">
                <div class="dropdown-item-title">${randomMessage.sender}</div>
                <div class="dropdown-item-message">${randomMessage.message}</div>
                <div class="dropdown-item-meta">
                    <span class="dropdown-item-time">${randomMessage.time}</span>
                    <span class="dropdown-item-status normal">Nuevo</span>
                </div>
            </div>
        `;
        
        // Agregar event listener
        this.addEventListener(newItem, 'click', (e) => {
            this.handleMessageClick(e, newItem);
        });
        
        // Insertar al inicio con animación
        newItem.style.opacity = '0';
        newItem.style.transform = 'translateX(-20px)';
        content.insertBefore(newItem, content.firstChild);
        
        setTimeout(() => {
            newItem.style.transition = 'all 0.3s ease';
            newItem.style.opacity = '1';
            newItem.style.transform = 'translateX(0)';
        }, 100);
        
        this.updateMessageBadge();
        console.log('💬 Nuevo mensaje agregado de:', randomMessage.sender);
    }

    // ====================================
    // UTILIDADES Y FEEDBACK
    // ====================================
    showAlert(title, message, type = 'info') {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.style.position = 'fixed';
        alert.style.top = '80px';
        alert.style.right = '20px';
        alert.style.zIndex = '10000';
        alert.style.minWidth = '300px';
        alert.style.animation = 'slideInRight 0.3s ease';
        
        const icons = {
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            info: '💡'
        };
        
        alert.innerHTML = `
            <div class="alert-icon">${icons[type] || icons.info}</div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-message">${message}</div>
            </div>
            <button class="alert-close">&times;</button>
        `;
        
        document.body.appendChild(alert);
        
        const closeBtn = alert.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(alert)) {
                    document.body.removeChild(alert);
                }
            }, 300);
        });
        
        // Auto-close después de 5 segundos
        setTimeout(() => {
            if (document.body.contains(alert)) {
                alert.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (document.body.contains(alert)) {
                        document.body.removeChild(alert);
                    }
                }, 300);
            }
        }, 5000);
    }

    showNotificationFeedback(title) {
        this.showAlert('📢 Notificación', `Abrir: ${title}`, 'info');
    }

    showMessageFeedback(sender) {
        this.showAlert('💬 Mensaje', `Abrir mensaje de: ${sender}`, 'info');
    }

    // ====================================
    // UTILIDADES
    // ====================================
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    // ====================================
    // API PÚBLICA
    // ====================================
    getActiveDropdown() {
        return this.activeDropdown;
    }

    openSpecificDropdown(type) {
        const dropdowns = {
            notifications: document.getElementById('notificationsDropdown'),
            messages: document.getElementById('messagesDropdown'),
            settings: document.getElementById('settingsDropdown')
        };
        
        const dropdown = dropdowns[type];
        if (dropdown) {
            this.closeAllDropdowns();
            this.openDropdown(dropdown);
            this.activeDropdown = type;
        }
    }

    // ====================================
    // CLEANUP
    // ====================================
    destroy() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        console.log('🧹 Header Dropdowns limpiado');
    }
}

// ====================================
// API GLOBAL
// ====================================
window.HeaderDropdownsAPI = {
    instance: null,
    
    init() {
        if (!this.instance) {
            this.instance = new HeaderDropdowns();
        }
        return this.instance;
    },
    
    openDropdown(type) {
        if (this.instance) {
            this.instance.openSpecificDropdown(type);
        }
    },
    
    closeAll() {
        if (this.instance) {
            this.instance.closeAllDropdowns();
        }
    },
    
    getActive() {
        return this.instance ? this.instance.getActiveDropdown() : null;
    }
};

// ====================================
// FUNCIONES GLOBALES PARA COMPATIBILIDAD
// ====================================
window.openDropdown = function(type) {
    if (window.HeaderDropdownsAPI.instance) {
        window.HeaderDropdownsAPI.instance.openSpecificDropdown(type);
    }
};

window.closeAllDropdowns = function() {
    if (window.HeaderDropdownsAPI.instance) {
        window.HeaderDropdownsAPI.instance.closeAllDropdowns();
    }
};

window.testDropdowns = function() {
    console.log('🧪 Probando dropdowns...');
    
    // Probar notificaciones
    setTimeout(() => {
        window.openDropdown('notifications');
        console.log('📝 Abierto: Notificaciones');
    }, 500);
    
    // Probar mensajes
    setTimeout(() => {
        window.closeAllDropdowns();
        window.openDropdown('messages');
        console.log('📝 Abierto: Mensajes');
    }, 2000);
    
    // Probar configuración
    setTimeout(() => {
        window.closeAllDropdowns();
        window.openDropdown('settings');
        console.log('📝 Abierto: Configuración');
    }, 3500);
    
    // Cerrar todo
    setTimeout(() => {
        window.closeAllDropdowns();
        console.log('📝 Todos cerrados');
    }, 5000);
};

