// ====================================
// volumes/frontend/src/pages/profile/Cards/RolesCard.jsx
// Card de roles y permisos del usuario
// ====================================

import React, { useState } from "react";
import { mockUserData } from "@/data/mockData";

const RolesCard = () => {
  const { roles } = mockUserData;
  const [showAllPermissions, setShowAllPermissions] = useState(false);

  const getRoleBadge = (roleName) => {
    const roleColors = {
      Administrador:
        "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      Gerente:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      Supervisor:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      Cajero:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      Vendedor:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      Bodeguero:
        "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };

    const colorClass =
      roleColors[roleName] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {roleName}
      </span>
    );
  };

  const getPermissionIcon = (permission) => {
    const icons = {
      USER_READ: "👁️",
      USER_WRITE: "✏️",
      USER_MANAGER: "👑",
      PRODUCT_READ: "📦",
      PRODUCT_WRITE: "📝",
      INVENTORY_READ: "📊",
      INVENTORY_WRITE: "📋",
      SALES_READ: "💰",
      SALES_WRITE: "🛒",
      REPORTS_READ: "📈",
      WAREHOUSE_ACCESS: "🏪",
      CASH_REGISTER: "💳",
    };
    return icons[permission] || "🔐";
  };

  const displayedPermissions = showAllPermissions
    ? roles.permission_codes
    : roles.permission_codes.slice(0, 8);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <span className="text-purple-600 dark:text-purple-400 text-lg">
              👑
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Roles y Permisos
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nivel de acceso y funcionalidades disponibles
          </p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roles.role_names.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Roles</div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roles.permission_codes.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Permisos
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {roles.warehouse_count}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Bodegas
          </div>
        </div>
      </div>

      {/* Roles asignados */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Roles Asignados
        </h4>
        <div className="flex flex-wrap gap-2">
          {roles.role_names.map((role, index) => (
            <div key={index}>{getRoleBadge(role)}</div>
          ))}
        </div>
      </div>

      {/* Indicadores especiales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Administrador
          </span>
          <span
            className={`text-lg ${
              roles.has_admin_role ? "text-green-500" : "text-gray-400"
            }`}
          >
            {roles.has_admin_role ? "✅" : "❌"}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Gerente
          </span>
          <span
            className={`text-lg ${
              roles.has_manager_role ? "text-green-500" : "text-gray-400"
            }`}
          >
            {roles.has_manager_role ? "✅" : "❌"}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Cajero
          </span>
          <span
            className={`text-lg ${
              roles.is_cashier ? "text-green-500" : "text-gray-400"
            }`}
          >
            {roles.is_cashier ? "✅" : "❌"}
          </span>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Supervisor
          </span>
          <span
            className={`text-lg ${
              roles.is_supervisor ? "text-green-500" : "text-gray-400"
            }`}
          >
            {roles.is_supervisor ? "✅" : "❌"}
          </span>
        </div>
      </div>

      {/* Permisos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Permisos Asignados
          </h4>
          {roles.permission_codes.length > 8 && (
            <button
              onClick={() => setShowAllPermissions(!showAllPermissions)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
            >
              {showAllPermissions
                ? "Ver menos"
                : `Ver todos (${roles.permission_codes.length})`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayedPermissions.map((permission, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs"
            >
              <span className="text-sm">{getPermissionIcon(permission)}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {permission.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Límite de caja chica */}
      {roles.petty_cash_limit && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Límite de caja chica:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              ${roles.petty_cash_limit?.toLocaleString("es-CL")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesCard;
