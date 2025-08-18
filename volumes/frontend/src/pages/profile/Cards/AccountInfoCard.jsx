// ====================================
// volumes/frontend/src/pages/profile/Cards/AccountInfoCard.jsx
// Card de información de cuenta del usuario - IMPLEMENTACIÓN COMPLETA CON API REAL
// ====================================

import React from "react";
import { useUserProfile, useProfileLoading } from "@/store/authStore";
import { formatDate, formatTimeAgo } from "@/utils/formats";

const AccountInfoCard = () => {
  const userProfile = useUserProfile();
  const isProfileLoading = useProfileLoading();

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  const getPasswordStatusBadge = (needsChange, ageInDays) => {
    if (needsChange) {
      return (
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          🔴 Cambio requerido
        </span>
      );
    }

    if (ageInDays > 90) {
      return (
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          ⚠️ Recomendado cambiar
        </span>
      );
    }

    if (ageInDays > 60) {
      return (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          ℹ️ Próximo a vencer
        </span>
      );
    }

    return (
      <span className="text-xs font-medium text-green-600 dark:text-green-400">
        ✅ Actualizada
      </span>
    );
  };

  const getSecurityScoreBadge = (score) => {
    if (!score || typeof score.security_percentage !== 'number') {
      return (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          ❓ Sin evaluar
        </span>
      );
    }

    const percentage = score.security_percentage;
    
    if (percentage >= 90) {
      return (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          🛡️ Excelente ({percentage}%)
        </span>
      );
    }
    
    if (percentage >= 70) {
      return (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          🔒 Buena ({percentage}%)
        </span>
      );
    }
    
    if (percentage >= 50) {
      return (
        <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
          ⚠️ Regular ({percentage}%)
        </span>
      );
    }
    
    return (
      <span className="text-xs font-medium text-red-600 dark:text-red-400">
        🚨 Mejorar ({percentage}%)
      </span>
    );
  };

  const getProfileCompletenessBadge = (completeness) => {
    if (!completeness || typeof completeness.completion_percentage !== 'number') {
      return (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          ❓ Sin evaluar
        </span>
      );
    }

    const percentage = completeness.completion_percentage;
    
    if (percentage === 100) {
      return (
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          ✅ Completo (100%)
        </span>
      );
    }
    
    if (percentage >= 80) {
      return (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          📋 Casi completo ({percentage}%)
        </span>
      );
    }
    
    return (
      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
        📝 Incompleto ({percentage}%)
      </span>
    );
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (isProfileLoading && !userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-gray-400 text-xl">⚠️</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No se pudo cargar la información de la cuenta
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header del Card */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-lg">
                🔐
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Información de Cuenta
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Estado y configuración de seguridad
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {userProfile.isActive ? "✅ Activa" : "❌ Inactiva"}
        </span>
      </div>

      {/* Grid de información */}
      <div className="space-y-6">
        {/* Sección de Acceso y Sesión */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">🔑</span>
            Información de Acceso
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Último acceso:
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTimeAgo(userProfile.lastLoginAt)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(userProfile.lastLoginAt)}
                  </div>
                  {userProfile.lastLoginIp && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      IP: {userProfile.lastLoginIp}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Sesión activa:
                </span>
                <span
                  className={`text-sm font-medium ${
                    userProfile.isRecentlyActive
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {userProfile.isRecentlyActive ? "✅ Sí" : "❌ No"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Autenticado:
                </span>
                <span
                  className={`text-sm font-medium ${
                    userProfile.isAuthenticated
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {userProfile.isAuthenticated ? "✅ Sí" : "❌ No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Seguridad de Contraseña */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">🔒</span>
            Seguridad de Contraseña
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Último cambio:
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatTimeAgo(userProfile.passwordChangedAt)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(userProfile.passwordChangedAt)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Antigüedad:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.passwordAgeDays} días
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Estado:
                </span>
                {getPasswordStatusBadge(
                  userProfile.needsPasswordChange,
                  userProfile.passwordAgeDays
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Puntaje seguridad:
                </span>
                {getSecurityScoreBadge(userProfile.securityScore)}
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Permisos y Caja Chica */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">💰</span>
            Permisos Especiales
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Caja chica:
                </span>
                <span
                  className={`text-sm font-medium ${
                    userProfile.hasPettyCashAccess
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {userProfile.hasPettyCashAccess ? "✅ Autorizado" : "❌ Sin acceso"}
                </span>
              </div>

              {userProfile.pettyCashLimit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Límite asignado:
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${userProfile.pettyCashLimit?.toLocaleString('es-CL')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Roles activos:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.roleCount || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Permisos totales:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.permissionCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Permisos y Caja Chica */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">💰</span>
            Permisos Especiales
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Caja chica:
                </span>
                <span
                  className={`text-sm font-medium ${
                    userProfile.hasPettyCashAccess
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {userProfile.hasPettyCashAccess ? "✅ Autorizado" : "❌ Sin acceso"}
                </span>
              </div>

              {userProfile.pettyCashLimit && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Límite asignado:
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${userProfile.pettyCashLimit?.toLocaleString('es-CL')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Roles activos:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.roleCount || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Permisos totales:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {userProfile.permissionCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Salud de la Cuenta */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
            <span className="mr-2">🛡️</span>
            Salud de la Cuenta
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Security Score */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Puntuación de seguridad:
                </span>
                {getSecurityScoreBadge(userProfile.securityScore)}
              </div>

              {userProfile.securityScore && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Nivel de seguridad:
                    </span>
                    <span className={`text-sm font-medium ${
                      userProfile.securityScore.security_level === 'EXCELLENT' ? 'text-green-600 dark:text-green-400' :
                      userProfile.securityScore.security_level === 'GOOD' ? 'text-blue-600 dark:text-blue-400' :
                      userProfile.securityScore.security_level === 'FAIR' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {userProfile.securityScore.security_level === 'EXCELLENT' && '🛡️ Excelente'}
                      {userProfile.securityScore.security_level === 'GOOD' && '🔒 Bueno'}
                      {userProfile.securityScore.security_level === 'FAIR' && '⚠️ Regular'}
                      {userProfile.securityScore.security_level === 'POOR' && '🚨 Malo'}
                      {!['EXCELLENT', 'GOOD', 'FAIR', 'POOR'].includes(userProfile.securityScore.security_level) && 
                        `📊 ${userProfile.securityScore.security_level || 'Sin evaluar'}`}
                    </span>
                  </div>

                  {/* Barra de progreso de seguridad */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progreso de seguridad</span>
                      <span>{userProfile.securityScore.security_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          userProfile.securityScore.security_percentage >= 90 ? 'bg-green-500' :
                          userProfile.securityScore.security_percentage >= 70 ? 'bg-blue-500' :
                          userProfile.securityScore.security_percentage >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${userProfile.securityScore.security_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {userProfile.securityScore.issues_count > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Problemas detectados:
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {userProfile.securityScore.issues_count}
                      </span>
                    </div>
                  )}

                  {userProfile.securityScore.recommendations_count > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Recomendaciones:
                      </span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {userProfile.securityScore.recommendations_count}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Profile Completeness */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Completitud del perfil:
                </span>
                {getProfileCompletenessBadge(userProfile.profileCompleteness)}
              </div>

              {userProfile.profileCompleteness && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Campos completados:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {userProfile.profileCompleteness.completed_fields || 0} / {userProfile.profileCompleteness.total_fields || 0}
                    </span>
                  </div>

                  {/* Barra de progreso de completitud */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progreso del perfil</span>
                      <span>{userProfile.profileCompleteness.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          userProfile.profileCompleteness.completion_percentage === 100 ? 'bg-green-500' :
                          userProfile.profileCompleteness.completion_percentage >= 80 ? 'bg-blue-500' :
                          'bg-yellow-500'
                        }`}
                        style={{ width: `${userProfile.profileCompleteness.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {userProfile.profileCompleteness.missing_fields?.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">
                        Campos faltantes:
                      </span>
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        {userProfile.profileCompleteness.missing_fields.join(", ")}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección de alertas de seguridad */}
      {(userProfile.needsPasswordChange || userProfile.passwordAgeDays > 90 || 
        (userProfile.securityScore && userProfile.securityScore.security_percentage < 70)) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">
                  ⚠️
                </span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Recomendaciones de Seguridad
                </h4>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                  {userProfile.needsPasswordChange && (
                    <p>• Tu contraseña debe ser cambiada inmediatamente.</p>
                  )}
                  {userProfile.passwordAgeDays > 90 && !userProfile.needsPasswordChange && (
                    <p>• Se recomienda cambiar tu contraseña (más de 90 días).</p>
                  )}
                  {userProfile.securityScore && userProfile.securityScore.security_percentage < 70 && (
                    <p>• Tu puntuación de seguridad es baja. Revisa las configuraciones de tu cuenta.</p>
                  )}
                  {userProfile.securityScore?.recommendations_count > 0 && (
                    <p>• Tienes {userProfile.securityScore.recommendations_count} recomendaciones pendientes.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con timestamps */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Cuenta creada: {formatDate(userProfile.createdAt)}</span>
          <span>Actualizada: {formatDate(userProfile.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoCard;