// ====================================
// LAYOUT STORE UNIFICADO - ZUSTAND
// Store principal para gestionar SOLO el estado del layout
// SIN duplicación de datos - Respeta principio SSOT
// Optimizado para Desktop/Tablet únicamente
// ====================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// ====================================
// CONFIGURACIÓN Y CONSTANTES
// ====================================

const STORAGE_KEY = 'layout-store';

const DROPDOWN_TYPES = {
    NOTIFICATIONS: 'notifications',
    MESSAGES: 'messages',
    SETTINGS: 'settings',
    USER_PROFILE: 'userProfile'
};

// ====================================
// UTILIDADES
// ====================================

const shouldLog = () => {
    return import.meta.env?.DEV || process.env.NODE_ENV === 'development';
};

const applyDarkModeToDOM = (isDark) => {
    if (typeof window !== 'undefined') {
        const html = document.documentElement;
        const body = document.body;

        if (isDark) {
            html.classList.add('dark');
            body.classList.add('dark-mode');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark-mode');
        }
    }
};

// ====================================
// LAYOUT STORE PRINCIPAL - SOLO UI STATE
// ====================================

export const useLayoutStore = create()(
    devtools(
        persist(
            (set, get) => ({
                // ==========================================
                // ESTADO PRINCIPAL - SOLO UI/LAYOUT
                // ==========================================

                // === DARK MODE ===
                isDarkMode: false,

                // === SIDEBAR ===
                sidebarCollapsed: false,
                activeSidebarSection: 'Dashboard',
                openSidebarSubmenus: [], // Array de IDs de submenús abiertos

                // === HEADER ===
                activeDropdown: null, // null | 'notifications' | 'messages' | 'settings' | 'userProfile'
                notifications: [], // Se carga desde service
                messages: [], // Se carga desde service
                unreadNotifications: 0,
                unreadMessages: 0,

                // === FOOTER - SOLO ESTADO DE UI ===
                activeFooterSelector: null, // null | 'branch' | 'cash' | 'user' | 'shift'

                // === DATOS ESPECÍFICOS DE LAYOUT (NO DE USUARIO) ===
                layoutContext: {
                    // Contexto actual de trabajo - NO datos del usuario
                    currentBranch: null,        // Se carga desde service
                    currentCashRegister: null,  // Se carga desde service  
                    currentShift: null,         // Se carga desde service
                    workingDate: null           // Fecha de trabajo actual
                },

                // === CONFIGURACIONES DE UI ===
                config: {
                    autoRefresh: true,
                    soundEnabled: true,
                    desktopNotifications: false,
                    compactMode: false,
                    showReadItems: true
                },

                // ==========================================
                // ACCIONES - DARK MODE
                // ==========================================

                toggleDarkMode: () => {
                    set((state) => {
                        const newDarkMode = !state.isDarkMode;
                        applyDarkModeToDOM(newDarkMode);

                        if (shouldLog()) {
                            console.log(`🌙 Dark mode: ${newDarkMode ? 'ON' : 'OFF'}`);
                        }

                        return { isDarkMode: newDarkMode };
                    });
                },

                setDarkMode: (enabled) => {
                    set({ isDarkMode: enabled });
                    applyDarkModeToDOM(enabled);
                },

                // ==========================================
                // ACCIONES - SIDEBAR
                // ==========================================

                toggleSidebar: () => {
                    set((state) => {
                        const newCollapsed = !state.sidebarCollapsed;

                        if (shouldLog()) {
                            console.log(`📂 Sidebar: ${newCollapsed ? 'Collapsed' : 'Expanded'}`);
                        }

                        return { sidebarCollapsed: newCollapsed };
                    });
                },

                setSidebarCollapsed: (collapsed) => {
                    set({ sidebarCollapsed: collapsed });
                },

                setActiveSidebarSection: (section) => {
                    set({ activeSidebarSection: section });
                },

                toggleSidebarSubmenu: (submenuId) => {
                    set((state) => {
                        const isOpen = state.openSidebarSubmenus.includes(submenuId);
                        const newSubmenus = isOpen
                            ? state.openSidebarSubmenus.filter(id => id !== submenuId)
                            : [...state.openSidebarSubmenus, submenuId];

                        return { openSidebarSubmenus: newSubmenus };
                    });
                },

                closeSidebarSubmenus: () => {
                    set({ openSidebarSubmenus: [] });
                },

                // ==========================================
                // ACCIONES - HEADER
                // ==========================================

                setActiveDropdown: (dropdown) => {
                    set({ activeDropdown: dropdown });
                },

                closeDropdown: () => {
                    set({ activeDropdown: null });
                },

                toggleDropdown: (dropdown) => {
                    set((state) => ({
                        activeDropdown: state.activeDropdown === dropdown ? null : dropdown
                    }));
                },

                setNotifications: (notifications) => {
                    const unreadCount = notifications.filter(n => !n.read).length;
                    set({
                        notifications,
                        unreadNotifications: unreadCount
                    });
                },

                setMessages: (messages) => {
                    const unreadCount = messages.filter(m => !m.read).length;
                    set({
                        messages,
                        unreadMessages: unreadCount
                    });
                },

                markNotificationAsRead: (notificationId) => {
                    set((state) => {
                        const updatedNotifications = state.notifications.map(notif =>
                            notif.id === notificationId ? { ...notif, read: true } : notif
                        );
                        const unreadCount = updatedNotifications.filter(n => !n.read).length;

                        return {
                            notifications: updatedNotifications,
                            unreadNotifications: unreadCount
                        };
                    });
                },

                markMessageAsRead: (messageId) => {
                    set((state) => {
                        const updatedMessages = state.messages.map(msg =>
                            msg.id === messageId ? { ...msg, read: true } : msg
                        );
                        const unreadCount = updatedMessages.filter(m => !m.read).length;

                        return {
                            messages: updatedMessages,
                            unreadMessages: unreadCount
                        };
                    });
                },

                // ==========================================
                // ACCIONES - FOOTER UI STATE
                // ==========================================

                setActiveFooterSelector: (selector) => {
                    set({ activeFooterSelector: selector });
                },

                closeFooterSelector: () => {
                    set({ activeFooterSelector: null });
                },

                // ==========================================
                // ACCIONES - CONTEXTO DE LAYOUT (NO USUARIO)
                // ==========================================

                setLayoutContext: (context) => {
                    set((state) => ({
                        layoutContext: { ...state.layoutContext, ...context }
                    }));
                },

                setCurrentBranch: (branch) => {
                    set((state) => ({
                        layoutContext: { ...state.layoutContext, currentBranch: branch }
                    }));
                },

                setCurrentCashRegister: (cashRegister) => {
                    set((state) => ({
                        layoutContext: { ...state.layoutContext, currentCashRegister: cashRegister }
                    }));
                },

                setCurrentShift: (shift) => {
                    set((state) => ({
                        layoutContext: { ...state.layoutContext, currentShift: shift }
                    }));
                },

                setWorkingDate: (date) => {
                    set((state) => ({
                        layoutContext: { ...state.layoutContext, workingDate: date }
                    }));
                },

                // ==========================================
                // ACCIONES - CONFIGURACIÓN
                // ==========================================

                updateConfig: (configUpdates) => {
                    set((state) => ({
                        config: { ...state.config, ...configUpdates }
                    }));
                },

                toggleConfigOption: (option) => {
                    set((state) => ({
                        config: {
                            ...state.config,
                            [option]: !state.config[option]
                        }
                    }));
                },

                // ==========================================
                // ACCIONES - UTILIDADES
                // ==========================================

                initialize: () => {
                    const state = get();

                    // Aplicar dark mode al DOM
                    applyDarkModeToDOM(state.isDarkMode);

                    if (shouldLog()) {
                        console.log('🚀 Layout store initialized');
                        console.log('📊 Initial state:', {
                            isDarkMode: state.isDarkMode,
                            sidebarCollapsed: state.sidebarCollapsed,
                            activeSidebarSection: state.activeSidebarSection
                        });
                    }
                },

                reset: () => {
                    set({
                        isDarkMode: false,
                        sidebarCollapsed: false,
                        activeSidebarSection: 'Dashboard',
                        openSidebarSubmenus: [],
                        activeDropdown: null,
                        notifications: [],
                        messages: [],
                        unreadNotifications: 0,
                        unreadMessages: 0,
                        activeFooterSelector: null,
                        layoutContext: {
                            currentBranch: null,
                            currentCashRegister: null,
                            currentShift: null,
                            workingDate: null
                        },
                        config: {
                            autoRefresh: true,
                            soundEnabled: true,
                            desktopNotifications: false,
                            compactMode: false,
                            showReadItems: true
                        }
                    });

                    // Reset DOM
                    applyDarkModeToDOM(false);

                    if (shouldLog()) {
                        console.log('🔄 Layout store reset');
                    }
                },

                // ==========================================
                // GETTERS / COMPUTED VALUES
                // ==========================================

                isSidebarSubmenuOpen: (submenuId) => {
                    return get().openSidebarSubmenus.includes(submenuId);
                },

                isDropdownOpen: (dropdown) => {
                    return get().activeDropdown === dropdown;
                },

                getTotalUnreadCount: () => {
                    const state = get();
                    return state.unreadNotifications + state.unreadMessages;
                },

                getLayoutClasses: () => {
                    const state = get();
                    return {
                        layout: `layout ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}`,
                        sidebar: `sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`,
                        main: `main ${state.sidebarCollapsed ? 'expanded' : ''}`,
                        root: state.isDarkMode ? 'dark' : ''
                    };
                }
            }),
            {
                name: STORAGE_KEY,
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({
                    // Solo persistir configuraciones de UI - NO datos
                    isDarkMode: state.isDarkMode,
                    sidebarCollapsed: state.sidebarCollapsed,
                    activeSidebarSection: state.activeSidebarSection,
                    config: state.config
                })
            }
        ),
        {
            name: 'layout-store'
        }
    )
);

// ====================================
// SELECTORES OPTIMIZADOS - SOLO LAYOUT
// ====================================

// Dark Mode
export const useDarkMode = () => useLayoutStore(state => ({
    isDarkMode: state.isDarkMode,
    toggleDarkMode: state.toggleDarkMode,
    setDarkMode: state.setDarkMode
}));

// Sidebar
export const useSidebar = () => useLayoutStore(state => ({
    isCollapsed: state.sidebarCollapsed,
    activeSection: state.activeSidebarSection,
    openSubmenus: state.openSidebarSubmenus,
    toggleSidebar: state.toggleSidebar,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setActiveSidebarSection: state.setActiveSidebarSection,
    toggleSidebarSubmenu: state.toggleSidebarSubmenu,
    isSidebarSubmenuOpen: state.isSidebarSubmenuOpen
}));

// Header
export const useHeader = () => useLayoutStore(state => ({
    activeDropdown: state.activeDropdown,
    notifications: state.notifications,
    messages: state.messages,
    unreadNotifications: state.unreadNotifications,
    unreadMessages: state.unreadMessages,
    setActiveDropdown: state.setActiveDropdown,
    closeDropdown: state.closeDropdown,
    toggleDropdown: state.toggleDropdown,
    setNotifications: state.setNotifications,
    setMessages: state.setMessages,
    markNotificationAsRead: state.markNotificationAsRead,
    markMessageAsRead: state.markMessageAsRead,
    getTotalUnreadCount: state.getTotalUnreadCount
}));

// Footer UI State
export const useFooterUI = () => useLayoutStore(state => ({
    activeFooterSelector: state.activeFooterSelector,
    setActiveFooterSelector: state.setActiveFooterSelector,
    closeFooterSelector: state.closeFooterSelector
}));

// Layout Context (contexto de trabajo, NO usuario)
export const useLayoutContext = () => useLayoutStore(state => ({
    layoutContext: state.layoutContext,
    setLayoutContext: state.setLayoutContext,
    setCurrentBranch: state.setCurrentBranch,
    setCurrentCashRegister: state.setCurrentCashRegister,
    setCurrentShift: state.setCurrentShift,
    setWorkingDate: state.setWorkingDate
}));

// Layout Classes
export const useLayoutClasses = () => useLayoutStore(state => state.getLayoutClasses());

// Hook de inicialización
export const useLayoutInit = () => {
    const initialize = useLayoutStore(state => state.initialize);

    React.useEffect(() => {
        initialize();
    }, [initialize]);
};