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

        // Actualizar el store
        set(authState);

        if (shouldLog()) {
          console.log('✅ Auth state updated after login');
        }
      },

      // ==========================================
      // ACTIONS - LOGOUT
      // ==========================================

      /**
       * Limpia el estado de autenticación
       * @param {string} reason - Razón del logout (opcional)
       */
      logout: (reason = 'Manual logout') => {
        if (shouldLog()) {
          console.log(`🚪 Logging out: ${reason}`);
        }

        // Limpiar localStorage
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });

        // Reset del store
        set({
          ...initialState,
          isInitialized: true
        });
      },

      // ==========================================
      // ACTIONS - TOKEN MANAGEMENT
      // ==========================================

      /**
       * Actualiza solo los tokens (para refresh)
       * @param {Object} tokens - Nuevos tokens
       */
      updateTokens: (tokens) => {
        if (!tokens.access_token) {
          throw new Error('Access token is required');
        }

        // Actualizar localStorage
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refresh_token);
        }

        // Actualizar store
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || get().refreshToken,
          lastError: null
        });

        if (shouldLog()) {
          console.log('🔄 Tokens updated');
        }
      },

      /**
       * Actualiza información del usuario
       * @param {Object} userInfo - Nueva información del usuario
       */
      updateUser: (userInfo) => {
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));

        set({
          user: userInfo,
          lastError: null
        });

        if (shouldLog()) {
          console.log('👤 User info updated');
        }
      },

      // ==========================================
      // ACTIONS - ERROR HANDLING
      // ==========================================

      /**
       * Establece un error de autenticación
       * @param {string|Error} error - Error a establecer
       */
      setError: (error) => {
        const errorMessage = error instanceof Error ? error.message : error;

        set({
          lastError: errorMessage,
          isLoading: false
        });

        if (shouldLog()) {
          console.error('❌ Auth error set:', errorMessage);
        }
      },

      /**
       * Limpia el último error
       */
      clearError: () => {
        set({ lastError: null });
      },

      // ==========================================
      // ACTIONS - LOADING
      // ==========================================

      /**
       * Establece el estado de carga
       * @param {boolean} isLoading - Estado de carga
       */
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      // ==========================================
      // ACTIONS - INITIALIZATION
      // ==========================================

      /**
       * Inicializa el estado desde localStorage
       */
      initializeAuth: () => {
        try {
          const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
          const userInfoString = localStorage.getItem(STORAGE_KEYS.USER_INFO);

          if (accessToken && userInfoString) {
            const userInfo = JSON.parse(userInfoString);

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
          fullName: user.full_name,
          initials: (user.full_name || user.username || user.email)
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase()
            .substring(0, 2),
          roles: user.roles || [],
          permissions: user.permissions || []
        };
      },

      /**
       * Verifica si la sesión está próxima a expirar
       * @param {number} bufferMinutes - Minutos de buffer antes de expiración
       * @returns {boolean}
       */
      isSessionExpiringSoon: (bufferMinutes = 5) => {
        const { accessToken } = get();
        if (!accessToken) return false;

        try {
          // Decodificar el token JWT sin verificar la firma
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          const expirationTime = payload.exp * 1000; // Convertir a milliseconds
          const currentTime = Date.now();
          const bufferTime = bufferMinutes * 60 * 1000; // Convertir minutos a milliseconds

          return (expirationTime - currentTime) <= bufferTime;
        } catch (error) {
          console.error('Error checking token expiration:', error);
          return true; // Si hay error, asumir que expira pronto
        }
      }
    }),

    // ==========================================
    // PERSIST CONFIGURATION
    // ==========================================
    {
      name: STORAGE_KEYS.AUTH_STATE,
      storage: createJSONStorage(() => localStorage),

      // Solo persistir datos esenciales
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionInfo: state.sessionInfo,
        loginTimestamp: state.loginTimestamp
      }),

      // Version para migración si es necesario
      version: 1,

      // Función de migración si cambia la estructura
      migrate: (persistedState, version) => {
        if (version === 0) {
          // Migrar de versión 0 a 1 si es necesario
          return {
            ...persistedState,
            isInitialized: false
          };
        }
        return persistedState;
      }
    }
  )
);

// ==========================================
// SELECTORS OPTIMIZADOS
// ==========================================

export const authSelectors = {
  // Auth status
  isAuthenticated: (state) => state.isAuthenticated,
  isLoading: (state) => state.isLoading,
  isInitialized: (state) => state.isInitialized,

  // User data
  user: (state) => state.user,
  userDisplay: (state) => state.getUserDisplay(),

  // Tokens
  accessToken: (state) => state.accessToken,
  refreshToken: (state) => state.refreshToken,
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