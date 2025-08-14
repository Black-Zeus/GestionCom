// stores/sidebarStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shouldLog } from '@/utils/environment';

const useSidebarStore = create(
  persist(
    (set, get) => ({
      // ==========================================
      // ESTADOS DEL SIDEBAR
      // ==========================================

      // Layout states
      isCollapsed: false,
      isMobileOpen: false,
      isDarkMode: false,

      // Navigation states
      activeSection: 'Dashboard',
      openSubmenus: [], // Array de IDs de submenús abiertos

      // User profile dropdown
      isProfileDropdownOpen: false,

      // Session/user info display
      sessionInfo: {
        branch: 'Central',
        cashRegister: '#1234',
        shift: 'Mañana',
        shiftStatus: 'success'
      },

      // ==========================================
      // ACCIONES - LAYOUT
      // ==========================================

      /**
       * Toggle sidebar collapsed/expanded (desktop)
       */
      toggleCollapsed: () => {
        set((state) => {
          const newCollapsed = !state.isCollapsed;

          if (shouldLog()) {
            //console.log(`🔄 Sidebar ${newCollapsed ? 'collapsed' : 'expanded'}`);
          }

          return { isCollapsed: newCollapsed };
        });
      },

      /**
       * Set collapsed state directly
       */
      setCollapsed: (collapsed) => {
        set({ isCollapsed: collapsed });
      },

      /**
       * Toggle sidebar mobile open/close
       */
      toggleMobileOpen: () => {
        set((state) => {
          const newOpen = !state.isMobileOpen;

          // Controlar scroll del body
          if (typeof window !== 'undefined') {
            document.body.style.overflow = newOpen ? 'hidden' : '';
          }

          return { isMobileOpen: newOpen };
        });
      },

      /**
       * Close mobile sidebar
       */
      closeMobile: () => {
        set({ isMobileOpen: false });
        if (typeof window !== 'undefined') {
          document.body.style.overflow = '';
        }
      },

      // ==========================================
      // ACCIONES - TEMA
      // ==========================================

      /**
       * Toggle dark/light mode
       */
      toggleTheme: () => {
        set((state) => {
          const newDarkMode = !state.isDarkMode;

          // ✅ CORRECCIÓN CRÍTICA: Aplicar clase 'dark' según tailwind.config.js
          if (typeof window !== 'undefined') {
            if (newDarkMode) {
              document.body.classList.add('dark');
            } else {
              document.body.classList.remove('dark');
            }
          }

          if (shouldLog()) {
            //console.log(`🌙 Theme: ${newDarkMode ? 'Dark' : 'Light'}`);
          }

          return { isDarkMode: newDarkMode };
        });
      },

      /**
       * Set theme directly
       */
      setTheme: (isDark) => {
        set({ isDarkMode: isDark });

        // ✅ CORRECCIÓN CRÍTICA: Aplicar clase 'dark' según tailwind.config.js
        if (typeof window !== 'undefined') {
          if (isDark) {
            document.body.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
          }
        }
      },

      // ==========================================
      // ACCIONES - NAVEGACIÓN
      // ==========================================

      /**
       * Set active navigation section
       */
      setActiveSection: (section) => {
        set({ activeSection: section });

        if (shouldLog()) {
          //console.log(`📍 Active section: ${section}`);
        }
      },

      /**
       * Toggle submenu open/close
       */
      toggleSubmenu: (submenuId) => {
        set((state) => {
          const isOpen = state.openSubmenus.includes(submenuId);
          let newOpenSubmenus;

          if (isOpen) {
            // Cerrar submenu
            newOpenSubmenus = state.openSubmenus.filter(id => id !== submenuId);
          } else {
            // Abrir submenu (cerrar otros si es necesario)
            newOpenSubmenus = [...state.openSubmenus, submenuId];
          }

          return { openSubmenus: newOpenSubmenus };
        });
      },

      /**
       * Close all submenus
       */
      closeAllSubmenus: () => {
        set({ openSubmenus: [] });
      },

      /**
       * Navigate to section and close mobile if needed
       */
      navigateTo: (section, closeMobileAfter = true) => {
        set((state) => {
          const updates = { activeSection: section };

          // Cerrar mobile sidebar si está abierto
          if (closeMobileAfter && state.isMobileOpen) {
            updates.isMobileOpen = false;

            // Restaurar scroll del body
            if (typeof window !== 'undefined') {
              document.body.style.overflow = '';
            }
          }

          return updates;
        });
      },

      /**
       * Toggle profile dropdown
       */
      toggleProfileDropdown: () => {
        set((state) => ({ isProfileDropdownOpen: !state.isProfileDropdownOpen }));
      },

      /**
       * Close profile dropdown
       */
      closeProfileDropdown: () => {
        set({ isProfileDropdownOpen: false });
      },

      /**
       * Update session info
       */
      updateSessionInfo: (newInfo) => {
        set((state) => ({
          sessionInfo: { ...state.sessionInfo, ...newInfo }
        }));
      },

      // ==========================================
      // ACCIONES - UTILIDADES
      // ==========================================

      /**
       * Initialize sidebar (called on app load)
       */
      initialize: () => {
        const state = get();

        // ✅ CORRECCIÓN CRÍTICA: Aplicar clase 'dark' según tailwind.config.js
        if (typeof window !== 'undefined') {
          if (state.isDarkMode) {
            document.body.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
          }
        }

        if (shouldLog()) {
          //console.log('🚀 Sidebar store initialized');
        }
      },

      /**
       * Reset to default state
       */
      reset: () => {
        set({
          isCollapsed: false,
          isMobileOpen: false,
          isDarkMode: false,
          activeSection: 'Dashboard',
          openSubmenus: [],
          isProfileDropdownOpen: false,
          sessionInfo: {
            branch: 'Central',
            cashRegister: '#1234',
            shift: 'Mañana',
            shiftStatus: 'success'
          }
        });

        // ✅ CORRECCIÓN CRÍTICA: Limpiar clase 'dark' según tailwind.config.js
        if (typeof window !== 'undefined') {
          document.body.classList.remove('dark');
          document.body.style.overflow = '';
        }
      },

      // ==========================================
      // GETTERS / COMPUTED VALUES
      // ==========================================

      /**
       * Check if submenu is open
       */
      isSubmenuOpen: (submenuId) => {
        return get().openSubmenus.includes(submenuId);
      },

      /**
       * Get current layout classes for CSS
       */
      getLayoutClasses: () => {
        const state = get();
        return {
          layout: `layout ${state.isCollapsed ? 'sidebar-collapsed' : ''}`,
          sidebar: `sidebar ${state.isCollapsed ? 'collapsed' : ''} ${state.isMobileOpen ? 'open' : ''}`,
          main: `main ${state.isCollapsed ? 'expanded' : ''}`,
          overlay: `overlay ${state.isMobileOpen ? 'active' : ''}`
        };
      }
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir datos importantes
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        isDarkMode: state.isDarkMode,
        activeSection: state.activeSection,
        sessionInfo: state.sessionInfo
      }),
      // Callback después de cargar desde localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.initialize();
        }
      }
    }
  )
);

// ==========================================
// SELECTORS OPTIMIZADOS
// ==========================================

export const sidebarSelectors = {
  // Layout states
  isCollapsed: (state) => state.isCollapsed,
  isMobileOpen: (state) => state.isMobileOpen,
  isDarkMode: (state) => state.isDarkMode,

  // Navigation
  activeSection: (state) => state.activeSection,
  openSubmenus: (state) => state.openSubmenus,

  // Profile
  isProfileDropdownOpen: (state) => state.isProfileDropdownOpen,

  // Session
  sessionInfo: (state) => state.sessionInfo,

  // Computed
  layoutClasses: (state) => state.getLayoutClasses(),

  // Specific checks
  isSubmenuOpen: (submenuId) => (state) => state.isSubmenuOpen(submenuId)
};

// ==========================================
// HOOKS HELPERS
// ==========================================

/**
 * Hook principal del sidebar
 */
export const useSidebar = (selector = null) => {
  if (selector) {
    return useSidebarStore(selector);
  }
  return useSidebarStore();
};

/**
 * Hook específico para layout classes
 */
export const useSidebarLayout = () => {
  return useSidebarStore(sidebarSelectors.layoutClasses);
};

/**
 * Hook específico para navegación
 */
export const useSidebarNavigation = () => {
  return useSidebarStore((state) => ({
    activeSection: state.activeSection,
    setActiveSection: state.setActiveSection,
    navigateTo: state.navigateTo,
    openSubmenus: state.openSubmenus,
    toggleSubmenu: state.toggleSubmenu,
    isSubmenuOpen: state.isSubmenuOpen
  }));
};

/**
 * Hook específico para tema
 */
export const useSidebarTheme = () => {
  return useSidebarStore((state) => ({
    isDarkMode: state.isDarkMode,
    toggleTheme: state.toggleTheme,
    setTheme: state.setTheme
  }));
};

// ==========================================
// EXPORT POR DEFECTO
// ==========================================

export default useSidebarStore;