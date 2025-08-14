// ====================================
// volumes/frontend/src/pages/profile/Cards/AccountInfoCard.jsx
// Card de información de cuenta del usuario
// ====================================

import React from "react";
import { mockUserData } from "@/data/mockData";

const AccountInfoCard = () => {
  const { account } = mockUserData;

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (isActive) => {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }`}
      >
        {isActive ? "✅ Activa" : "❌ Inactiva"}
      </span>
    );
  };

  const getPasswordStatusBadge = (needsChange, ageInDays) => {
    if (needsChange) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          🔴 Cambio requerido
        </span>
      );
    }

    if (ageInDays > 90) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          ⚠️ Recomendado cambiar
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        ✅ Actualizada
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header del Card */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
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
        {getStatusBadge(account.is_active)}
      </div>

      {/* Grid de información */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda - Acceso y sesión */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Información de Acceso
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Último acceso:
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(account.last_login_at)}
                  </div>
                  {account.last_login_ip && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      IP: {account.last_login_ip}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Sesión reciente:
                </span>
                <span
                  className={`text-sm font-medium ${
                    account.has_recent_login
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {account.has_recent_login ? "✅ Sí" : "❌ No"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Autenticado:
                </span>
                <span
                  className={`text-sm font-medium ${
                    account.is_authenticated
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {account.is_authenticated ? "✅ Sí" : "❌ No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha - Seguridad */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Seguridad de Contraseña
            </h4>

            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Último cambio:
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(account.password_changed_at)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Hace {account.password_age_days} días
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Estado:
                </span>
                {getPasswordStatusBadge(
                  account.needs_password_change,
                  account.password_age_days
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de alertas */}
      {(account.needs_password_change || account.password_age_days > 90) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">
                  ⚠️
                </span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Acción recomendada
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {account.needs_password_change
                    ? "Tu contraseña debe ser cambiada. Por favor, actualízala en la sección de seguridad."
                    : "Tu contraseña tiene más de 90 días. Se recomienda cambiarla por seguridad."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con timestamp */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>Cuenta creada: {formatDate(account.created_at)}</span>
          <span>Actualizada: {formatDate(account.updated_at)}</span>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoCard;
