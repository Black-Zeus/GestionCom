// ====================================
// CONFIGURACIÓN GLOBAL
// ====================================
const SidebarConfig = {
    storageKeys: {
        collapsed: 'sidebar_collapsed',
        darkMode: 'dark_mode_enabled',
        activeSection: 'active_sidebar_section'
    },
    breakpoints: {
        mobile: 768
    },
    animations: {
        duration: 300,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
};

// ====================================
// CLASE PRINCIPAL DEL SIDEBAR
// ====================================
class EnhancedSidebar {
    constructor() {
        this.isInitialized = false;
        this.isMobile = false;
        this.isCollapsed = false;
        this.isDarkMode = false;
        this.activeDropdown = null;
        this.eventListeners = [];
        
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Inicializando Enhanced Sidebar...');
        
        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        try {
            this.detectDeviceType();
            this.loadSavedSettings();
            this.setupNavigationHandlers();
            this.setupProfileDropdown();
            this.setupSidebarControls();
            this.setupResponsiveHandlers();
            this.setupKeyboardShortcuts();
            this.initializeTooltips();
            
            this.isInitialized = true;
            console.log('✅ Enhanced Sidebar inicializado correctamente');
            
            // Disparar evento personalizado
            this.dispatchEvent('sidebarReady');
            
        } catch (error) {
            console.error('❌ Error inicializando sidebar:', error);
        }
    }

    // ====================================
    // DETECCIÓN DE DISPOSITIVO Y CONFIGURACIÓN INICIAL
    // ====================================
    detectDeviceType() {
        this.isMobile = window.innerWidth <= SidebarConfig.breakpoints.mobile;
        
        if (this.isMobile) {
            this.isCollapsed = true; // En móvil siempre empieza colapsado
            document.body.classList.add('mobile-device');
        } else {
            document.body.classList.remove('mobile-device');
        }
    }

    loadSavedSettings() {
        try {
            // Cargar estado de collapse
            const savedCollapsed = localStorage.getItem(SidebarConfig.storageKeys.collapsed);
            if (savedCollapsed !== null && !this.isMobile) {
                this.isCollapsed = JSON.parse(savedCollapsed);
            }
            
            // Cargar modo oscuro
            const savedDarkMode = localStorage.getItem(SidebarConfig.storageKeys.darkMode);
            if (savedDarkMode !== null) {
                this.isDarkMode = JSON.parse(savedDarkMode);
            }
            
            // Aplicar configuraciones
            this.applySidebarState();
            this.applyTheme();
            
            console.log('📁 Configuraciones cargadas:', {
                collapsed: this.isCollapsed,
                darkMode: this.isDarkMode,
                mobile: this.isMobile
            });
            
        } catch (error) {
            console.warn('⚠️ Error cargando configuraciones:', error);
        }
    }

    // ====================================
    // MANEJO DEL ESTADO DEL SIDEBAR
    // ====================================
    toggleSidebar() {
        if (this.isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.toggleDesktopSidebar();
        }
    }

    toggleDesktopSidebar() {
        this.isCollapsed = !this.isCollapsed;
        this.applySidebarState();
        this.saveSettings();
        
        this.dispatchEvent('sidebarToggled', {
            collapsed: this.isCollapsed,
            mobile: false
        });
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (!sidebar || !overlay) return;
        
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            this.dispatchEvent('mobileSidebarOpened');
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            
            this.dispatchEvent('mobileSidebarClosed');
        }
    }

    applySidebarState() {
        const layout = document.querySelector('.layout');
        const sidebar = document.getElementById('sidebar');
        
        if (!layout || !sidebar) return;
        
        if (this.isCollapsed && !this.isMobile) {
            layout.classList.add('sidebar-collapsed');
            sidebar.classList.add('collapsed');
        } else {
            layout.classList.remove('sidebar-collapsed');
            sidebar.classList.remove('collapsed');
        }
    }

    // ====================================
    // MANEJO DEL TEMA (MODO OSCURO)
    // ====================================
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        this.saveSettings();
        
        this.dispatchEvent('themeChanged', {
            darkMode: this.isDarkMode
        });
    }

    applyTheme() {
        const body = document.body;
        const sidebar = document.getElementById('sidebar');
        const themeToggle = document.getElementById('themeToggle');
        
        if (this.isDarkMode) {
            body.classList.add('dark-mode');
            if (sidebar) sidebar.classList.add('dark-mode');
            if (themeToggle) themeToggle.classList.add('active');
        } else {
            body.classList.remove('dark-mode');
            if (sidebar) sidebar.classList.remove('dark-mode');
            if (themeToggle) themeToggle.classList.remove('active');
        }
    }

    // ====================================
    // NAVEGACIÓN Y MENÚS
    // ====================================
    setupNavigationHandlers() {
        // Manejar clics en elementos de navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => this.handleNavItemClick(e));
        });

        // Manejar submenús
        document.querySelectorAll('.nav-item.has-submenu').forEach(item => {
            this.addEventListener(item, 'click', (e) => this.handleSubmenuClick(e));
        });
    }

    handleNavItemClick(e) {
        const item = e.currentTarget;
        
        // Si es un submenu, no continuar con la navegación normal
        if (item.classList.contains('has-submenu')) {
            return;
        }
        
        // Remover clase active de todos los elementos
        document.querySelectorAll('.nav-item.active').forEach(activeItem => {
            activeItem.classList.remove('active');
        });
        
        // Agregar clase active al elemento clickeado
        item.classList.add('active');
        
        // Cerrar sidebar en móvil después de navegar
        if (this.isMobile) {
            setTimeout(() => this.closeMobileSidebar(), 150);
        }
        
        // Guardar sección activa
        const sectionText = item.querySelector('.text')?.textContent || item.textContent;
        localStorage.setItem(SidebarConfig.storageKeys.activeSection, sectionText);
        
        this.dispatchEvent('navigationChanged', {
            item: item,
            section: sectionText
        });
    }

    handleSubmenuClick(e) {
        e.preventDefault();
        const item = e.currentTarget;
        const submenu = item.nextElementSibling;
        
        if (!submenu || !submenu.classList.contains('nav-submenu')) return;
        
        // Toggle submenu
        const isOpen = item.classList.contains('open');
        
        // Cerrar otros submenús
        document.querySelectorAll('.nav-item.has-submenu.open').forEach(openItem => {
            if (openItem !== item) {
                openItem.classList.remove('open');
                const openSubmenu = openItem.nextElementSibling;
                if (openSubmenu) openSubmenu.classList.remove('open');
            }
        });
        
        // Toggle el submenu actual
        if (isOpen) {
            item.classList.remove('open');
            submenu.classList.remove('open');
        } else {
            item.classList.add('open');
            submenu.classList.add('open');
        }
        
        this.dispatchEvent('submenuToggled', {
            item: item,
            open: !isOpen
        });
    }

    // ====================================
    // DROPDOWN DEL PERFIL DE USUARIO
    // ====================================
    setupProfileDropdown() {
        const userProfile = document.querySelector('#userProfile');
        const dropdown = document.querySelector('#profileDropdown');
        
        if (!userProfile || !dropdown) return;
        
        // Click en el perfil para abrir/cerrar dropdown
        this.addEventListener(userProfile, 'click', (e) => {
            e.stopPropagation();
            this.toggleProfileDropdown();
        });
        
        // Manejar clics en elementos del dropdown
        dropdown.querySelectorAll('.profile-dropdown-item').forEach(item => {
            this.addEventListener(item, 'click', (e) => this.handleProfileAction(e));
        });
        
        // Cerrar dropdown al hacer clic fuera
        this.addEventListener(document, 'click', (e) => {
            if (!userProfile.contains(e.target) && !dropdown.contains(e.target)) {
                this.closeProfileDropdown();
            }
        });
    }

    toggleProfileDropdown() {
        const userProfile = document.querySelector('#userProfile');
        const dropdown = document.querySelector('#profileDropdown');
        
        if (!userProfile || !dropdown) return;
        
        const isOpen = dropdown.classList.contains('open');
        
        if (isOpen) {
            this.closeProfileDropdown();
        } else {
            this.openProfileDropdown();
        }
    }

    openProfileDropdown() {
        const userProfile = document.querySelector('#userProfile');
        const dropdown = document.querySelector('#profileDropdown');
        
        if (userProfile && dropdown) {
            userProfile.classList.add('open');
            dropdown.classList.add('open');
            this.activeDropdown = 'profile';
            
            this.dispatchEvent('profileDropdownOpened');
        }
    }

    closeProfileDropdown() {
        const userProfile = document.querySelector('#userProfile');
        const dropdown = document.querySelector('#profileDropdown');
        
        if (userProfile && dropdown) {
            userProfile.classList.remove('open');
            dropdown.classList.remove('open');
            this.activeDropdown = null;
            
            this.dispatchEvent('profileDropdownClosed');
        }
    }

    handleProfileAction(e) {
        e.preventDefault();
        const action = e.currentTarget.dataset.action;
        
        switch (action) {
            case 'profile':
                this.handleProfileView();
                break;
            case 'settings':
                this.handleSettings();
                break;
            case 'preferences':
                this.handlePreferences();
                break;
            case 'help':
                this.handleHelp();
                break;
            case 'logout':
                this.handleLogout();
                break;
            default:
                console.log('Acción no reconocida:', action);
        }
        
        this.closeProfileDropdown();
    }

    handleProfileView() {
        console.log('📋 Abrir perfil de usuario');
        this.dispatchEvent('profileViewRequested');
    }

    handleSettings() {
        console.log('⚙️ Abrir configuraciones');
        this.dispatchEvent('settingsRequested');
    }

    handlePreferences() {
        console.log('🎛️ Abrir preferencias');
        this.dispatchEvent('preferencesRequested');
    }

    handleHelp() {
        console.log('❓ Abrir ayuda');
        this.dispatchEvent('helpRequested');
    }

    handleLogout() {
        console.log('🚪 Cerrar sesión');
        
        // Mostrar confirmación
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            this.dispatchEvent('logoutRequested');
            console.log('👋 Cerrando sesión...');
        }
    }

    // ====================================
    // CONTROLES DEL SIDEBAR
    // ====================================
    setupSidebarControls() {
        // Botón de toggle circular
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            this.addEventListener(toggleBtn, 'click', (e) => {
                e.preventDefault();
                this.toggleSidebar();
                // Añadir animación de click
                toggleBtn.classList.add('clicked');
                setTimeout(() => toggleBtn.classList.remove('clicked'), 300);
            });
        }

        // Toggle de tema
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            this.addEventListener(themeToggle, 'click', () => this.toggleTheme());
        }
        
        // Botón del menú móvil
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            this.addEventListener(menuToggle, 'click', () => this.toggleMobileSidebar());
        }
        
        // Overlay para cerrar en móvil
        const overlay = document.getElementById('overlay');
        if (overlay) {
            this.addEventListener(overlay, 'click', () => this.closeMobileSidebar());
        }
    }

    // ====================================
    // MANEJO RESPONSIVO
    // ====================================
    setupResponsiveHandlers() {
        let resizeTimer;
        
        this.addEventListener(window, 'resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 150);
        });
        
        // Detectar cambio de orientación
        this.addEventListener(window, 'orientationchange', () => {
            setTimeout(() => this.handleResize(), 300);
        });
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.detectDeviceType();
        
        // Si cambió de móvil a desktop
        if (wasMobile && !this.isMobile) {
            this.closeMobileSidebar();
            document.body.style.overflow = '';
            
            // Aplicar estado de collapse guardado
            const savedCollapsed = localStorage.getItem(SidebarConfig.storageKeys.collapsed);
            if (savedCollapsed !== null) {
                this.isCollapsed = JSON.parse(savedCollapsed);
            }
            this.applySidebarState();
        }
        
        // Si cambió de desktop a móvil
        if (!wasMobile && this.isMobile) {
            this.closeMobileSidebar();
            this.isCollapsed = true;
            this.applySidebarState();
        }
        
        this.dispatchEvent('sidebarResized', {
            wasMobile,
            isMobile: this.isMobile
        });
    }

    // ====================================
    // ATAJOS DE TECLADO
    // ====================================
    setupKeyboardShortcuts() {
        this.addEventListener(document, 'keydown', (e) => {
            // Solo procesar si no estamos en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            // Ctrl/Cmd + B para toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
            
            // Ctrl/Cmd + Shift + D para toggle modo oscuro
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Escape para cerrar dropdowns y sidebar móvil
            if (e.key === 'Escape') {
                if (this.activeDropdown) {
                    this.closeProfileDropdown();
                } else if (this.isMobile) {
                    this.closeMobileSidebar();
                }
            }
            
            // Alt + número para navegación rápida
            if (e.altKey && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                this.navigateToSection(parseInt(e.key) - 1);
            }
        });
    }

    navigateToSection(index) {
        const navItems = document.querySelectorAll('.nav-item:not(.has-submenu)');
        if (navItems[index]) {
            navItems[index].click();
        }
    }

    // ====================================
    // TOOLTIPS PARA MODO COLAPSADO
    // ====================================
    initializeTooltips() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const textElement = item.querySelector('.text');
            if (textElement) {
                const tooltip = textElement.textContent.trim();
                item.setAttribute('data-tooltip', tooltip);
            }
        });
    }

    // ====================================
    // PERSISTENCIA Y CONFIGURACIÓN
    // ====================================
    saveSettings() {
        try {
            localStorage.setItem(SidebarConfig.storageKeys.collapsed, JSON.stringify(this.isCollapsed));
            localStorage.setItem(SidebarConfig.storageKeys.darkMode, JSON.stringify(this.isDarkMode));
        } catch (error) {
            console.warn('⚠️ Error guardando configuraciones:', error);
        }
    }

    resetSettings() {
        try {
            Object.values(SidebarConfig.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.isCollapsed = false;
            this.isDarkMode = false;
            this.applySidebarState();
            this.applyTheme();
            
            console.log('🔄 Configuraciones restablecidas');
            this.dispatchEvent('settingsReset');
            
        } catch (error) {
            console.error('❌ Error restableciendo configuraciones:', error);
        }
    }

    // ====================================
    // UTILIDADES Y HELPERS
    // ====================================
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { 
            detail: {
                ...detail,
                timestamp: Date.now(),
                sidebar: this
            }
        });
        document.dispatchEvent(event);
    }

    getState() {
        return {
            isCollapsed: this.isCollapsed,
            isDarkMode: this.isDarkMode,
            isMobile: this.isMobile,
            activeDropdown: this.activeDropdown,
            isInitialized: this.isInitialized
        };
    }

    // ====================================
    // MÉTODOS PÚBLICOS PARA API
    // ====================================
    collapse() {
        if (!this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    expand() {
        if (this.isCollapsed && !this.isMobile) {
            this.toggleSidebar();
        }
    }

    enableDarkMode() {
        if (!this.isDarkMode) {
            this.toggleTheme();
        }
    }

    disableDarkMode() {
        if (this.isDarkMode) {
            this.toggleTheme();
        }
    }

    navigateTo(sectionName) {
        const navItems = document.querySelectorAll('.nav-item');
        
        for (let item of navItems) {
            const text = item.querySelector('.text')?.textContent || item.textContent;
            if (text.toLowerCase().includes(sectionName.toLowerCase())) {
                item.click();
                break;
            }
        }
    }

    // ====================================
    // CLEANUP
    // ====================================
    destroy() {
        // Remover todos los event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
        
        // Limpiar estados
        this.isInitialized = false;
        this.activeDropdown = null;
        
        console.log('🧹 Enhanced Sidebar limpiado');
    }
}

// ====================================
// API PÚBLICA GLOBAL
// ====================================
window.SidebarAPI = {
    instance: null,
    
    init() {
        if (!this.instance) {
            this.instance = new EnhancedSidebar();
        }
        return this.instance;
    },
    
    toggle() {
        if (this.instance) {
            this.instance.toggleSidebar();
        }
    },
    
    collapse() {
        if (this.instance) {
            this.instance.collapse();
        }
    },
    
    expand() {
        if (this.instance) {
            this.instance.expand();
        }
    },
    
    toggleTheme() {
        if (this.instance) {
            this.instance.toggleTheme();
        }
    },
    
    navigateTo(section) {
        if (this.instance) {
            this.instance.navigateTo(section);
        }
    },
    
    getState() {
        return this.instance ? this.instance.getState() : null;
    },
    
    reset() {
        if (this.instance) {
            this.instance.resetSettings();
        }
    }
};

// ====================================
// FUNCIONES GLOBALES DE COMPATIBILIDAD
// ====================================
window.toggleSidebar = function() {
    if (window.SidebarAPI.instance) {
        window.SidebarAPI.instance.toggleSidebar();
    }
};

window.toggleSubmenu = function(element) {
    // Esta función se mantiene para compatibilidad con HTML inline
    const event = new Event('click');
    element.dispatchEvent(event);
};

window.toggleTheme = function() {
    if (window.SidebarAPI.instance) {
        window.SidebarAPI.instance.toggleTheme();
    }
};