// stores/sidebarStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shouldLog } from '@/utils/environment';
import { sidebarNavData } from '@/data/sidebarData'; // Import estático

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
      activePath: null,
      openSubmenus: [], // Array de IDs de submenús abiertos

      // Data states (vendrá de API, inicializado con mock)
      sidebarData: sidebarNavData, // Inicializar con datos mock
      isLoadingSidebarData: false,
      sidebarDataError: null,

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
          if (typeof window !== 'undefined') {
            if (newDarkMode) {
              document.body.classList.add('dark');
            } else {
              document.body.classList.remove('dark');
            }
          }
          if (shouldLog()) {
            //console.log(`🌙 Theme: ${newDarkMode ? 'dark' : 'light'}`);
          }
          return { isDarkMode: newDarkMode };
        });
      },

      /**
       * Set theme directly
       */
      setTheme: (isDark) => {
        set({ isDarkMode: isDark });
        if (typeof window !== 'undefined') {
          if (isDark) {
            document.body.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
          }
        }
      },

      // ==========================================
      // ACCIONES - NAVEGACIÓN DINÁMICA
      // ==========================================

      /**
       * Set active section
       */
      setActiveSection: (section) => {
        set({ activeSection: section });
        if (shouldLog()) {
          //console.log(`📍 Active section: ${section}`);
        }
      },

      /**
       * Set active path
       */
      setActivePath: (path) => {
        set({ activePath: path });
      },

      /**
       * Toggle submenu open/close - Solo permite 1 submenu abierto a la vez
       */
      toggleSubmenu: (submenuId) => {
        set((state) => {
          const isCurrentlyOpen = state.openSubmenus.includes(submenuId);
          
          if (isCurrentlyOpen) {
            // Si está abierto, lo cerramos (array vacío)
            return { openSubmenus: [] };
          } else {
            // Si está cerrado, cerramos todos los demás y abrimos solo este
            return { openSubmenus: [submenuId] };
          }
        });
        
        if (shouldLog()) {
          const state = get();
          console.log(`🔄 Submenu toggled: ${submenuId}, Open submenus: ${state.openSubmenus}`);
        }
      },

      /**
       * Check if submenu is open
       */
      isSubmenuOpen: (submenuId) => {
        return get().openSubmenus.includes(submenuId);
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
      navigateTo: (section, path = null, closeMobileAfter = true) => {
        set((state) => {
          const updates = { 
            activeSection: section,
            activePath: path 
          };

          // Cerrar mobile sidebar si está abierto
          if (closeMobileAfter && state.isMobileOpen) {
            updates.isMobileOpen = false;
            if (typeof window !== 'undefined') {
              document.body.style.overflow = '';
            }
          }

          return updates;
        });
      },

      /**
       * Sync with current route - DINÁMICO basado en sidebarData
       */
      syncWithRoute: (pathname) => {
        const state = get();
        const { sidebarData } = state;
        
        if (!sidebarData?.data?.sections) {
          // Si no hay data todavía, solo actualizar path
          set({ activePath: pathname });
          return;
        }

        let foundActiveSection = null;
        let foundSubmenuParent = null;
        let requiredOpenSubmenus = [];

        // Buscar en todas las secciones y items
        for (const section of sidebarData.data.sections) {
          for (const item of section.items) {
            // Verificar item principal
            if (item.path && this._pathMatches(pathname, item.path)) {
              foundActiveSection = item.text;
              break;
            }

            // Verificar subitems si tiene submenu
            if (item.hasSubmenu && item.submenu) {
              for (const subitem of item.submenu) {
                if (subitem.path && this._pathMatches(pathname, subitem.path)) {
                  foundActiveSection = subitem.text;
                  foundSubmenuParent = item.id;
                  requiredOpenSubmenus = [item.id]; // Solo un submenu abierto
                  break;
                }
              }
            }

            if (foundActiveSection) break;
          }
          if (foundActiveSection) break;
        }

        // Fallback si no se encuentra coincidencia exacta
        if (!foundActiveSection) {
          foundActiveSection = pathname === '/' || pathname === '/dashboard' ? 'Dashboard' : 'Dashboard';
        }

        // Actualizar estado solo si hay cambios
        const currentOpenSubmenus = state.openSubmenus;
        if (foundActiveSection !== state.activeSection || 
            pathname !== state.activePath ||
            JSON.stringify(requiredOpenSubmenus) !== JSON.stringify(currentOpenSubmenus)) {
          
          set({
            activeSection: foundActiveSection,
            activePath: pathname,
            openSubmenus: requiredOpenSubmenus // Solo el submenu necesario
          });

          if (shouldLog()) {
            console.log(`🔄 Synced sidebar: ${pathname} -> ${foundActiveSection}`);
          }
        }
      },

      /**
       * Helper para verificar coincidencia de paths
       */
      _pathMatches: (currentPath, itemPath) => {
        if (currentPath === itemPath) return true;
        if (itemPath === '/' && currentPath === '/dashboard') return true;
        if (itemPath === '/dashboard' && currentPath === '/') return true;
        return currentPath.startsWith(itemPath + '/');
      },

      // ==========================================
      // ACCIONES - DATA MANAGEMENT
      // ==========================================

      /**
       * Set sidebar data (desde API o mock)
       */
      setSidebarData: (data) => {
        set({ 
          sidebarData: data,
          isLoadingSidebarData: false,
          sidebarDataError: null 
        });
      },

      /**
       * Set loading state
       */
      setSidebarDataLoading: (loading) => {
        set({ isLoadingSidebarData: loading });
      },

      /**
       * Set error state
       */
      setSidebarDataError: (error) => {
        set({ 
          sidebarDataError: error,
          isLoadingSidebarData: false 
        });
      },

      /**
       * Load sidebar data (para llamar desde API service)
       */
      loadSidebarData: async (apiFunction) => {
        set({ isLoadingSidebarData: true, sidebarDataError: null });
        
        try {
          const data = await apiFunction();
          get().setSidebarData(data);
        } catch (error) {
          get().setSidebarDataError(error.message || 'Error loading sidebar data');
          console.error('Error loading sidebar data:', error);
        }
      },

      // ==========================================
      // ACCIONES - UTILIDADES
      // ==========================================

      /**
       * Initialize sidebar (called on app load)
       */
      initialize: () => {
        const state = get();
        
        if (typeof window !== 'undefined') {
          if (state.isDarkMode) {
            document.body.classList.add('dark');
          } else {
            document.body.classList.remove('dark');
          }
        }

        if (shouldLog()) {
          console.log('🏗️ Sidebar initialized with data:', !!state.sidebarData);
        }
      },

      /**
       * Reset sidebar to default state
       */
      reset: () => {
        set({
          isCollapsed: false,
          isMobileOpen: false,
          isDarkMode: false,
          activeSection: 'Dashboard',
          activePath: null,
          openSubmenus: []
          // NO resetear sidebarData - eso se maneja por separado
        });

        if (typeof window !== 'undefined') {
          document.body.classList.remove('dark');
          document.body.style.overflow = '';
        }

        if (shouldLog()) {
          //console.log('🔄 Sidebar reset to defaults');
        }
      },

      // ==========================================
      // GETTERS / COMPUTED VALUES
      // ==========================================

      /**
       * Get layout classes for CSS
       */
      getLayoutClasses: () => {
        const state = get();
        return {
          layout: `layout ${state.isCollapsed ? 'sidebar-collapsed' : ''}`,
          sidebar: `sidebar ${state.isCollapsed ? 'collapsed' : ''} ${state.isMobileOpen ? 'open' : ''}`,
          main: `main ${state.isCollapsed ? 'expanded' : ''}`,
          overlay: `overlay ${state.isMobileOpen ? 'active' : ''}`
        };
      },

      /**
       * Get sections data (computed value simple)
       */
      getSections: () => {
        const state = get();
        return state.sidebarData?.data?.sections || [];
      },
    }),
    {
      name: 'sidebar-store',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir configuraciones de UI, NO datos de API
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        isDarkMode: state.isDarkMode,
        activeSection: state.activeSection,
        activePath: state.activePath
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
  activePath: (state) => state.activePath,
  openSubmenus: (state) => state.openSubmenus,

  // Data
  sidebarData: (state) => state.sidebarData,
  isLoadingSidebarData: (state) => state.isLoadingSidebarData,
  sidebarDataError: (state) => state.sidebarDataError,
  sections: (state) => state.getSections(),

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
 * Hook específico para data del sidebar - SIMPLIFICADO
 */
export const useSidebarData = () => {
  return useSidebarStore((state) => {
    const sections = state.sidebarData?.data?.sections || [];
    return {
      sidebarData: state.sidebarData,
      sections: sections,
      isLoading: state.isLoadingSidebarData,
      error: state.sidebarDataError,
      setSidebarData: state.setSidebarData,
      loadSidebarData: state.loadSidebarData
    };
  });
};

/**
 * Hook específico para navegación
 */
export const useSidebarNavigation = () => {
  return useSidebarStore((state) => ({
    activeSection: state.activeSection,
    activePath: state.activePath,
    setActiveSection: state.setActiveSection,
    setActivePath: state.setActivePath,
    navigateTo: state.navigateTo,
    openSubmenus: state.openSubmenus,
    toggleSubmenu: state.toggleSubmenu,
    isSubmenuOpen: state.isSubmenuOpen,
    syncWithRoute: state.syncWithRoute
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