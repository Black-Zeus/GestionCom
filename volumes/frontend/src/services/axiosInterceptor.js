/**
 * services/axiosInterceptor.js
 * Configuración de axios con interceptors automáticos
 * Manejo de auth, refresh tokens y errores centralizados
 */

import axios from 'axios';
import { getApiUrl, shouldLog } from '@/utils/environment';
import { API_ENDPOINTS } from '@/constants';
import { parseError, shouldLogout, isRetryableError } from '@/utils/errors';

// ==========================================
// CONFIGURACIÓN BASE DE AXIOS
// ==========================================

const axiosInstance = axios.create({
  baseURL: getApiUrl(), // Usa environment manager
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// ==========================================
// STORAGE HELPERS
// ==========================================

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER_INFO: 'user_info'
};

const getToken = (type) => localStorage.getItem(TOKEN_KEYS[type]);
const setToken = (type, token) => localStorage.setItem(TOKEN_KEYS[type], token);
const removeToken = (type) => localStorage.removeItem(TOKEN_KEYS[type]);
const clearAllTokens = () => {
  Object.values(TOKEN_KEYS).forEach(key => localStorage.removeItem(key));
};

// ==========================================
// REFRESH TOKEN LOGIC
// ==========================================

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

const refreshAccessToken = async () => {
  const refreshToken = getToken('REFRESH');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const response = await axios.post(
      getApiUrl(API_ENDPOINTS.AUTH.REFRESH),
      {},
      {
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data?.success && response.data?.data) {
      const { access_token, refresh_token } = response.data.data;
      
      // Guardar nuevos tokens
      setToken('ACCESS', access_token);
      if (refresh_token) {
        setToken('REFRESH', refresh_token);
      }

      if (shouldLog()) {
        console.log('✅ Token refreshed successfully');
      }

      return access_token;
    }

    throw new Error('Invalid refresh response');

  } catch (error) {
    if (shouldLog()) {
      console.error('❌ Token refresh failed:', error);
    }
    
    // Limpiar tokens si el refresh falló
    clearAllTokens();
    
    // Trigger logout - se maneja en el response interceptor
    throw error;
  }
};

// ==========================================
// REQUEST INTERCEPTOR
// ==========================================

axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = getToken('ACCESS');
    
    // Agregar token de acceso si existe
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log en desarrollo
    if (shouldLog()) {
      console.log(`🔄 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    if (shouldLog()) {
      console.error('❌ Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================

axiosInstance.interceptors.response.use(
  (response) => {
    // Log successful responses en desarrollo
    if (shouldLog()) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log errors en desarrollo
    if (shouldLog()) {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${error.response?.status || 'Network Error'}`);
    }

    // ==========================================
    // MANEJO DE TOKEN EXPIRADO (401)
    // ==========================================
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Evitar refresh infinito en endpoints de auth
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');
      const isRefreshEndpoint = originalRequest.url?.includes('/auth/refresh');
      
      if (isRefreshEndpoint || isAuthEndpoint) {
        // Si falló refresh o login, limpiar tokens
        clearAllTokens();
        return Promise.reject(error);
      }

      // Marcar request como retry
      originalRequest._retry = true;

      if (isRefreshing) {
        // Si ya estamos refreshing, agregar a cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        
        // Reintentar request original con nuevo token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        
        // Notificar que se requiere login
        triggerLogout('Token refresh failed');
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ==========================================
    // MANEJO DE OTROS ERRORES DE AUTH
    // ==========================================
    const parsedError = parseError(error);
    
    if (shouldLogout(parsedError.code)) {
      clearAllTokens();
      triggerLogout(`Auth error: ${parsedError.code}`);
    }

    // ==========================================
    // RETRY AUTOMÁTICO PARA ERRORES TEMPORALES
    // ==========================================
    if (isRetryableError(parsedError.code) && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      
      // Esperar 1 segundo antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (shouldLog()) {
        console.log(`🔄 Retrying request: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
      }
      
      return axiosInstance(originalRequest);
    }

    return Promise.reject(error);
  }
);

// ==========================================
// LOGOUT HANDLER
// ==========================================

let logoutCallbacks = [];

const triggerLogout = (reason) => {
  if (shouldLog()) {
    console.warn(`⚠️ Triggering logout: ${reason}`);
  }

  // Ejecutar callbacks de logout
  logoutCallbacks.forEach(callback => {
    try {
      callback(reason);
    } catch (error) {
      console.error('Error in logout callback:', error);
    }
  });
};

// ==========================================
// UTILIDADES PÚBLICAS
// ==========================================

/**
 * Registra un callback para ser ejecutado cuando se requiera logout
 * @param {Function} callback - Función a ejecutar en logout
 */
export const onLogoutRequired = (callback) => {
  logoutCallbacks.push(callback);
  
  // Retornar función para remover el callback
  return () => {
    logoutCallbacks = logoutCallbacks.filter(cb => cb !== callback);
  };
};

/**
 * Configura tokens manualmente (útil después del login)
 * @param {string} accessToken 
 * @param {string} refreshToken 
 */
export const setAuthTokens = (accessToken, refreshToken) => {
  if (accessToken) setToken('ACCESS', accessToken);
  if (refreshToken) setToken('REFRESH', refreshToken);
  
  if (shouldLog()) {
    console.log('🔐 Auth tokens configured');
  }
};

/**
 * Limpia todos los tokens (útil en logout)
 */
export const clearAuthTokens = () => {
  clearAllTokens();
  
  if (shouldLog()) {
    console.log('🧹 Auth tokens cleared');
  }
};

/**
 * Verifica si hay token de acceso
 */
export const hasAccessToken = () => {
  return !!getToken('ACCESS');
};

/**
 * Obtiene el token de acceso actual
 */
export const getAccessToken = () => {
  return getToken('ACCESS');
};

/**
 * Fuerza un refresh del token manualmente
 */
export const forceTokenRefresh = async () => {
  try {
    const newToken = await refreshAccessToken();
    return newToken;
  } catch (error) {
    throw new Error('Failed to refresh token');
  }
};

// ==========================================
// EXPORT POR DEFECTO
// ==========================================

export default axiosInstance;