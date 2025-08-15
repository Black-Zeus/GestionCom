// ====================================
// volumes/frontend/src/pages/profile/Cards/AccountInfoCard.jsx
// Card de información de cuenta del usuario - Una columna
// ====================================

import React from "react";
import { mockUserData } from "@/data/mockData";
import { formatDateTimeTechnical } from "@/utils/formats";

const AccountInfoCard = () => {
  const { account } = mockUserData;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 flex-1 flex flex-col">
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
      </div>

      {/* Información de acceso - Sección 1 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          Información de Acceso
        </h4>

        <div className="space-y-4">
          {/* Último acceso */}
          <div className="flex flex-col space-y-1">
            <div className="grid grid-cols-[110px_1fr] items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Último acceso:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTimeTechnical(account.last_login_at)}
              </span>
            </div>

            {account.last_login_ip && (
              <div className="grid grid-cols-[110px_1fr]">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  IP:
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {account.last_login_ip}
                </span>
              </div>
            )}
          </div>


          {/* Estado de sesión */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Sesión reciente
              </span>
              <span
                className={`text-sm font-medium ${account.has_recent_login
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                  }`}
              >
                {account.has_recent_login ? "✅ Sí" : "❌ No"}
              </span>
            </div>

            <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Autenticado
              </span>
              <span
                className={`text-sm font-medium ${account.is_authenticated
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

      {/* Seguridad de contraseña - Sección 2 */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
          <span className="mr-2">🔐</span>
          Seguridad de Contraseña
        </h4>

        <div className="space-y-4">
          {/* Último cambio de contraseña */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Último cambio:
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDateTimeTechnical(account.password_changed_at)}
              </span>
            </div>
            <div className="flex justify-end">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Hace {account.password_age_days} días
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de alertas */}
      {(account.needs_password_change || account.password_age_days > 90) && (
        <div className="mb-6">
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

      {/* Footer con timestamp - Sección final */}
      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Cuenta creada:</span>
            <span>{formatDateTimeTechnical(account.created_at)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Actualizada:</span>
            <span>{formatDateTimeTechnical(account.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoCard;