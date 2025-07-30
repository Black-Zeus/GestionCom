/**
 * services/authService.js
 * Servicio de autenticación - Encapsula todas las llamadas de auth
 * Login, logout, refresh, validación de tokens, cambio de contraseñas
 */

import api from '@/services/axiosInterceptor';
import { API_ENDPOINTS } from '@/constants';
import { parseError, getFormattedError } from '@/utils/errors';
import { shouldLog } from '@/utils/environment';

// ==========================================
// AUTH SERVICE CLASS
// ==========================================

class AuthService {
  
  // ==========================================
  // AUTHENTICATION METHODS
  // ==========================================

  /**
   * Autenticar usuario (login)
   * @param {Object} credentials - Credenciales de login
   * @param {string} credentials.username - Usuario
   * @param {string} credentials.password - Contraseña
   * @param {boolean} credentials.remember_me - Recordar sesión
   * @returns {Promise<Object>} Respuesta del login
   */
  async login(credentials) {
    try {
      if (shouldLog()) {
        console.log('🔐 Attempting login for:', credentials.username);
      }

      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        username: credentials.username,
        password: credentials.password,
        remember_me: credentials.remember_me || false
      });

      if (response.data?.success && response.data?.data) {
        if (shouldLog()) {
          console.log('✅ Login successful for:', credentials.username);
        }
        return response.data;
      }

      throw new Error('Invalid login response format');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Login failed:', formattedError);
      }

      throw formattedError;
    }
  }

  /**
   * Cerrar sesión (logout)
   * @returns {Promise<Object>} Respuesta del logout
   */
  async logout() {
    try {
      if (shouldLog()) {
        console.log('🚪 Attempting logout');
      }

      const response = await api.post(API_ENDPOINTS.AUTH.LOGOUT);

      if (response.data?.success) {
        if (shouldLog()) {
          console.log('✅ Logout successful');
        }
        return response.data;
      }

      throw new Error('Invalid logout response');

    } catch (error) {
      // En caso de error de logout, aún consideramos exitoso
      // porque el usuario quiere cerrar sesión
      if (shouldLog()) {
        console.warn('⚠️ Logout API failed, but proceeding:', error.message);
      }

      return {
        success: true,
        message: 'Logout completed (with API error)',
        data: { logged_out: true }
      };
    }
  }

  /**
   * Renovar token de acceso
   * Nota: Normalmente esto lo maneja el axios interceptor automáticamente
   * @returns {Promise<Object>} Nuevos tokens
   */
  async refreshToken() {
    try {
      if (shouldLog()) {
        console.log('🔄 Attempting token refresh');
      }

      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH);

      if (response.data?.success && response.data?.data) {
        if (shouldLog()) {
          console.log('✅ Token refresh successful');
        }
        return response.data;
      }

      throw new Error('Invalid refresh response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Token refresh failed:', formattedError);
      }

      throw formattedError;
    }
  }

  // ==========================================
  // TOKEN VALIDATION
  // ==========================================

  /**
   * Validar token JWT
   * @param {string} token - Token a validar
   * @returns {Promise<Object>} Resultado de validación
   */
  async validateToken(token) {
    try {
      if (!token) {
        throw new Error('Token is required for validation');
      }

      if (shouldLog()) {
        console.log('🔍 Validating token');
      }

      const response = await api.post(API_ENDPOINTS.AUTH.VALIDATE_TOKEN, {
        token: token
      });

      if (response.data?.success && response.data?.data) {
        const isValid = response.data.data.valid;
        
        if (shouldLog()) {
          console.log(`✅ Token validation: ${isValid ? 'VALID' : 'INVALID'}`);
        }

        return response.data;
      }

      throw new Error('Invalid validation response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Token validation failed:', formattedError);
      }

      throw formattedError;
    }
  }

  // ==========================================
  // PASSWORD MANAGEMENT
  // ==========================================

  /**
   * Cambiar contraseña del usuario autenticado
   * @param {Object} passwordData - Datos de cambio de contraseña
   * @param {string} passwordData.current_password - Contraseña actual
   * @param {string} passwordData.new_password - Nueva contraseña
   * @param {string} passwordData.confirm_password - Confirmación de nueva contraseña
   * @returns {Promise<Object>} Resultado del cambio
   */
  async changePassword(passwordData) {
    try {
      if (shouldLog()) {
        console.log('🔑 Attempting password change');
      }

      // Validaciones básicas en frontend
      if (!passwordData.current_password) {
        throw new Error('Current password is required');
      }

      if (!passwordData.new_password) {
        throw new Error('New password is required');
      }

      if (passwordData.new_password !== passwordData.confirm_password) {
        throw new Error('Password confirmation does not match');
      }

      const response = await api.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });

      if (response.data?.success) {
        if (shouldLog()) {
          console.log('✅ Password changed successfully');
        }
        return response.data;
      }

      throw new Error('Invalid password change response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Password change failed:', formattedError);
      }

      throw formattedError;
    }
  }

  /**
   * Cambiar contraseña de cualquier usuario (solo administradores)
   * @param {Object} adminPasswordData - Datos de cambio admin
   * @param {number} adminPasswordData.target_user_id - ID del usuario objetivo
   * @param {string} adminPasswordData.new_password - Nueva contraseña
   * @param {string} adminPasswordData.confirm_password - Confirmación
   * @param {string} adminPasswordData.reason - Razón del cambio (opcional)
   * @returns {Promise<Object>} Resultado del cambio
   */
  async adminChangePassword(adminPasswordData) {
    try {
      if (shouldLog()) {
        console.log('🔑 Attempting admin password change for user:', adminPasswordData.target_user_id);
      }

      // Validaciones básicas
      if (!adminPasswordData.target_user_id) {
        throw new Error('Target user ID is required');
      }

      if (!adminPasswordData.new_password) {
        throw new Error('New password is required');
      }

      if (adminPasswordData.new_password !== adminPasswordData.confirm_password) {
        throw new Error('Password confirmation does not match');
      }

      const response = await api.put(API_ENDPOINTS.AUTH.CHANGE_PASSWORD_ADMIN, {
        target_user_id: adminPasswordData.target_user_id,
        new_password: adminPasswordData.new_password,
        confirm_password: adminPasswordData.confirm_password,
        reason: adminPasswordData.reason || 'Password reset by administrator'
      });

      if (response.data?.success) {
        if (shouldLog()) {
          console.log('✅ Admin password change successful');
        }
        return response.data;
      }

      throw new Error('Invalid admin password change response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Admin password change failed:', formattedError);
      }

      throw formattedError;
    }
  }

  // ==========================================
  // PASSWORD RESET FLOW
  // ==========================================

  /**
   * Solicitar código de recuperación de contraseña
   * @param {string} email - Email del usuario
   * @returns {Promise<Object>} Resultado de la solicitud
   */
  async forgotPassword(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }

      if (shouldLog()) {
        console.log('📧 Requesting password reset for:', email);
      }

      const response = await api.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.toLowerCase().trim()
      });

      if (response.data?.success) {
        if (shouldLog()) {
          console.log('✅ Password reset requested successfully');
        }
        return response.data;
      }

      throw new Error('Invalid forgot password response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Forgot password failed:', formattedError);
      }

      throw formattedError;
    }
  }

  /**
   * Restablecer contraseña usando código de recuperación
   * @param {Object} resetData - Datos de restablecimiento
   * @param {string} resetData.email - Email del usuario
   * @param {string} resetData.reset_code - Código de recuperación
   * @param {string} resetData.new_password - Nueva contraseña
   * @param {string} resetData.confirm_password - Confirmación
   * @returns {Promise<Object>} Resultado del restablecimiento
   */
  async resetPassword(resetData) {
    try {
      if (shouldLog()) {
        console.log('🔄 Attempting password reset for:', resetData.email);
      }

      // Validaciones básicas
      if (!resetData.email) {
        throw new Error('Email is required');
      }

      if (!resetData.reset_code) {
        throw new Error('Reset code is required');
      }

      if (!resetData.new_password) {
        throw new Error('New password is required');
      }

      if (resetData.new_password !== resetData.confirm_password) {
        throw new Error('Password confirmation does not match');
      }

      const response = await api.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
        email: resetData.email.toLowerCase().trim(),
        reset_code: resetData.reset_code.trim(),
        new_password: resetData.new_password,
        confirm_password: resetData.confirm_password
      });

      if (response.data?.success) {
        if (shouldLog()) {
          console.log('✅ Password reset successful');
        }
        return response.data;
      }

      throw new Error('Invalid password reset response');

    } catch (error) {
      const formattedError = getFormattedError(error);
      
      if (shouldLog()) {
        console.error('❌ Password reset failed:', formattedError);
      }

      throw formattedError;
    }
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Verifica si hay tokens válidos en storage
   * @returns {boolean} True si hay tokens
   */
  hasValidTokens() {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    return !!(accessToken && refreshToken);
  }

  /**
   * Obtiene información del usuario desde el token (sin validar en servidor)
   * @returns {Object|null} Info del usuario decodificada del token
   */
  getUserFromToken() {
    try {
      const accessToken = localStorage.getItem('access_token');
      
      if (!accessToken) return null;

      // Decodificar JWT (sin verificar firma - solo para info básica)
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) return null;

      const payload = JSON.parse(atob(tokenParts[1]));
      
      return {
        user_id: payload.user_id,
        username: payload.username,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        exp: payload.exp,
        iat: payload.iat
      };

    } catch (error) {
      if (shouldLog()) {
        console.warn('⚠️ Could not decode token:', error.message);
      }
      return null;
    }
  }

  /**
   * Verifica si el token está próximo a expirar
   * @param {number} bufferMinutes - Minutos de buffer (default: 5)
   * @returns {boolean} True si expira pronto
   */
  isTokenExpiringSoon(bufferMinutes = 5) {
    try {
      const userInfo = this.getUserFromToken();
      
      if (!userInfo?.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      const expirationBuffer = bufferMinutes * 60;
      
      return (userInfo.exp - now) <= expirationBuffer;

    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene el tiempo restante del token en segundos
   * @returns {number} Segundos restantes (0 si expirado)
   */
  getTokenTimeRemaining() {
    try {
      const userInfo = this.getUserFromToken();
      
      if (!userInfo?.exp) return 0;

      const now = Math.floor(Date.now() / 1000);
      const remaining = userInfo.exp - now;
      
      return Math.max(0, remaining);

    } catch (error) {
      return 0;
    }
  }

  /**
   * Limpia toda la información de auth del localStorage
   */
  clearAuthData() {
    const keysToRemove = [
      'access_token',
      'refresh_token', 
      'user_info',
      'auth_state'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    if (shouldLog()) {
      console.log('🧹 Auth data cleared from storage');
    }
  }
}

// ==========================================
// SINGLETON INSTANCE
// ==========================================

const authService = new AuthService();

// ==========================================
// CONVENIENCE METHODS (funciones directas)
// ==========================================

/**
 * Login rápido - función directa
 * @param {Object} credentials - Credenciales
 * @returns {Promise<Object>} Respuesta del login
 */
export const login = (credentials) => authService.login(credentials);

/**
 * Logout rápido - función directa
 * @returns {Promise<Object>} Respuesta del logout
 */
export const logout = () => authService.logout();

/**
 * Validar token rápido - función directa
 * @param {string} token - Token a validar
 * @returns {Promise<Object>} Respuesta de la validación
 */
export const validateToken = (token) => authService.validateToken(token);

/**
 * Refresh token rápido - función directa
 * @returns {Promise<Object>} Respuesta del refresh
 */
export const refreshToken = () => authService.refreshToken();

/**
 * Cambio de contraseña rápido - función directa
 * @param {Object} passwordData - Datos de la contraseña
 * @returns {Promise<Object>} Respuesta del cambio
 */
export const changePassword = (passwordData) => authService.changePassword(passwordData);

/**
 * Cambio de contraseña admin rápido - función directa
 * @param {Object} adminPasswordData - Datos del cambio admin
 * @returns {Promise<Object>} Respuesta del cambio
 */
export const adminChangePassword = (adminPasswordData) => authService.adminChangePassword(adminPasswordData);

/**
 * Forgot password rápido - función directa
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Respuesta de la solicitud
 */
export const forgotPassword = (email) => authService.forgotPassword(email);

/**
 * Reset password rápido - función directa
 * @param {Object} resetData - Datos del reset
 * @returns {Promise<Object>} Respuesta del reset
 */
export const resetPassword = (resetData) => authService.resetPassword(resetData);

// ==========================================
// UTILITY EXPORTS
// ==========================================

/**
 * Verifica si hay tokens válidos en storage
 * @returns {boolean} True si hay tokens
 */
export const hasValidTokens = () => authService.hasValidTokens();

/**
 * Obtiene información del usuario desde el token
 * @returns {Object|null} Info del usuario
 */
export const getUserFromToken = () => authService.getUserFromToken();

/**
 * Verifica si el token está próximo a expirar
 * @param {number} bufferMinutes - Minutos de buffer
 * @returns {boolean} True si expira pronto
 */
export const isTokenExpiringSoon = (bufferMinutes) => authService.isTokenExpiringSoon(bufferMinutes);

/**
 * Obtiene el tiempo restante del token en segundos
 * @returns {number} Segundos restantes
 */
export const getTokenTimeRemaining = () => authService.getTokenTimeRemaining();

/**
 * Limpia toda la información de auth del localStorage
 */
export const clearAuthData = () => authService.clearAuthData();

// ==========================================
// EXPORT POR DEFECTO
// ==========================================

export default authService;