/**
 * stores/authStore.js
 * Store de autenticación con Zustand
 * Maneja tokens, user info, estado de login/logout y persistencia
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { shouldLog } from '@/utils/environment';

// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  AUTH_STATE: 'auth_state'
};

// ==========================================
// INITIAL STATE
// ==========================================

const initialState = {
  // Auth tokens
  accessToken: null,
  refreshToken: null,
  
  // User information
  user: null,
  
  // Auth status
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  
  // Login session info
  sessionInfo: null,
  loginTimestamp: null,
  
  // Error handling
  lastError: null
};

// ==========================================
// AUTH STORE
// ==========================================

const useAuthStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ==========================================
      // ACTIONS - LOGIN
      // ==========================================

      /**
       * Configura el estado después de un login exitoso
       * @param {Object} loginResponse - Respuesta del login del backend
       */
      login: (loginResponse) => {
        const { data } = loginResponse;
        
        if (!data?.access_token || !data?.user_info) {
          throw new Error('Invalid login response format');
        }

        const authState = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user_info,
          isAuthenticated: true,
          isLoading: false,
          sessionInfo: data.session_info || null,
          loginTimestamp: new Date().toISOString(),
          lastError: null
        };

        // Guardar tokens en localStorage separadamente (para axios interceptor)
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
        if (data.refresh_token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
        }
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(data.user_info));

        set(authState);

        if (shouldLog()) {
          console.log('🔐 User logged in:', data.user_info.username);
        }

        return authState;
      },

      // ==========================================
      // ACTIONS - LOGOUT
      // ==========================================

      /**
       * Limpia todo el estado de auth (logout)
       * @param {string} reason - Razón del logout (opcional)
       */
      logout: (reason = 'Manual logout') => {
        // Limpiar localStorage
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });

        // Reset state
        set({
          ...initialState,
          isInitialized: true, // Mantener inicializado
        });

        if (shouldLog()) {
          console.log('🚪 User logged out:', reason);
        }
      },

      // ==========================================
      // ACTIONS - TOKEN MANAGEMENT
      // ==========================================

      /**
       * Actualiza tokens (usado por axios interceptor después de refresh)
       * @param {string} accessToken - Nuevo access token
       * @param {string} refreshToken - Nuevo refresh token (opcional)
       */
      updateTokens: (accessToken, refreshToken = null) => {
        const updates = { accessToken };
        
        if (refreshToken) {
          updates.refreshToken = refreshToken;
        }

        // Actualizar localStorage
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        set(updates);

        if (shouldLog()) {
          console.log('🔄 Tokens updated');
        }
      },

      /**
       * Marca tokens como inválidos (sin hacer logout completo)
       */
      invalidateTokens: () => {
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        });

        // Limpiar solo tokens, mantener user info temporalmente
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      },

      // ==========================================
      // ACTIONS - USER INFO
      // ==========================================

      /**
       * Actualiza información del usuario
       * @param {Object} userInfo - Nueva información del usuario
       */
      updateUser: (userInfo) => {
        const updatedUser = { ...get().user, ...userInfo };
        
        set({ user: updatedUser });
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(updatedUser));

        if (shouldLog()) {
          console.log('👤 User info updated');
        }
      },

      /**
       * Actualiza solo los permisos del usuario
       * @param {Array} permissions - Nueva lista de permisos
       */
      updatePermissions: (permissions) => {
        const currentUser = get().user;
        if (currentUser) {
          get().updateUser({ permissions });
        }
      },

      // ==========================================
      // ACTIONS - LOADING STATES
      // ==========================================

      /**
       * Establece estado de carga
       * @param {boolean} isLoading - Estado de carga
       */
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      /**
       * Establece que el store ha sido inicializado
       */
      setInitialized: () => {
        set({ isInitialized: true });
      },

      /**
       * Establece el último error
       * @param {string|null} error - Mensaje de error
       */
      setError: (error) => {
        set({ lastError: error });
      },

      // ==========================================
      // ACTIONS - INITIALIZATION
      // ==========================================

      /**
       * Inicializa el store desde localStorage
       * Usado al cargar la app para restaurar sesión
       */
      initializeFromStorage: () => {
        try {
          const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);

          if (accessToken && userInfoStr) {
            const userInfo = JSON.parse(userInfoStr);
            
            set({
              accessToken,
              refreshToken,
              user: userInfo,
              isAuthenticated: true,
              isInitialized: true,
              lastError: null
            });

            if (shouldLog()) {
              console.log('🔄 Auth state restored from storage');
            }
          } else {
            set({ isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing auth from storage:', error);
          get().logout('Storage initialization error');
        }
      },

      // ==========================================
      // GETTERS / COMPUTED VALUES
      // ==========================================

      /**
       * Verifica si el usuario tiene un rol específico
       * @param {string} role - Rol a verificar
       * @returns {boolean}
       */
      hasRole: (role) => {
        const user = get().user;
        return user?.roles?.includes(role) || false;
      },

      /**
       * Verifica si el usuario tiene un permiso específico
       * @param {string} permission - Permiso a verificar
       * @returns {boolean}
       */
      hasPermission: (permission) => {
        const user = get().user;
        return user?.permissions?.includes(permission) || false;
      },

      /**
       * Verifica si el usuario tiene cualquiera de los permisos dados
       * @param {Array<string>} permissions - Lista de permisos
       * @returns {boolean}
       */
      hasAnyPermission: (permissions) => {
        const user = get().user;
        if (!user?.permissions) return false;
        
        return permissions.some(permission => 
          user.permissions.includes(permission)
        );
      },

      /**
       * Verifica si el usuario tiene todos los permisos dados
       * @param {Array<string>} permissions - Lista de permisos
       * @returns {boolean}
       */
      hasAllPermissions: (permissions) => {
        const user = get().user;
        if (!user?.permissions) return false;
        
        return permissions.every(permission => 
          user.permissions.includes(permission)
        );
      },

      /**
       * Obtiene información básica del usuario para mostrar en UI
       * @returns {Object|null}
       */
      getUserDisplay: () => {
        const user = get().user;
        if (!user) return null;

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name || user.username,
          isActive: user.is_active,
          roles: user.roles || [],
          initials: (user.full_name || user.username)
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        };
      },

      /**
       * Verifica si la sesión está próxima a expirar
       * @param {number} bufferMinutes - Minutos de buffer (default: 5)
       * @returns {boolean}
       */
      isSessionExpiringSoon: (bufferMinutes = 5) => {
        // Esta lógica podría expandirse si el backend envía tiempo de expiración
        // Por ahora, returna false - el refresh automático maneja la expiración
        return false;
      }
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      // Solo persistir ciertos campos críticos
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionInfo: state.sessionInfo,
        loginTimestamp: state.loginTimestamp
      }),
      // Callback después de hidratar desde storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setInitialized();
          if (shouldLog()) {
            console.log('🏪 Auth store rehydrated');
          }
        }
      }
    }
  )
);

// ==========================================
// SELECTORS (para optimizar re-renders)
// ==========================================

/**
 * Selectors para usar con React components
 * Ayudan a optimizar re-renders al subscribirse solo a campos específicos
 */
export const authSelectors = {
  // Estados básicos
  isAuthenticated: (state) => state.isAuthenticated,
  isLoading: (state) => state.isLoading,
  isInitialized: (state) => state.isInitialized,
  
  // User info
  user: (state) => state.user,
  userDisplay: (state) => state.getUserDisplay(),
  username: (state) => state.user?.username,
  userEmail: (state) => state.user?.email,
  
  // Tokens
  hasTokens: (state) => !!(state.accessToken && state.refreshToken),
  
  // Error
  lastError: (state) => state.lastError,

  // Session
  sessionInfo: (state) => state.sessionInfo
};

// ==========================================
// HOOKS HELPERS
// ==========================================

/**
 * Hook para usar auth con selectors optimizados
 * @param {Function} selector - Selector function (opcional)
 */
export const useAuth = (selector = null) => {
  if (selector) {
    return useAuthStore(selector);
  }
  return useAuthStore();
};

/**
 * Hook específico para verificar autenticación
 */
export const useIsAuthenticated = () => {
  return useAuthStore(authSelectors.isAuthenticated);
};

/**
 * Hook específico para info del usuario
 */
export const useUser = () => {
  return useAuthStore(authSelectors.user);
};

/**
 * Hook específico para display del usuario
 */
export const useUserDisplay = () => {
  return useAuthStore(authSelectors.userDisplay);
};

// ==========================================
// EXPORT POR DEFECTO
// ==========================================

export default useAuthStore;