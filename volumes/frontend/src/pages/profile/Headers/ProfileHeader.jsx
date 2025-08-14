// ====================================
// volumes/frontend/src/pages/profile/Headers/ProfileHeader.jsx
// Header principal de la página de perfil
// ====================================

import React from "react";
import { mockUserData } from "@/data/mockData";

const ProfileHeader = () => {
  const { personal, account, roles } = mockUserData;

  const formatLastLogin = (dateString) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("es-CL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (isActive) => {
    return isActive
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  const getMainRole = () => {
    if (roles.has_admin_role)
      return {
        role: "Administrador",
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: "👑",
      };
    if (roles.has_manager_role)
      return {
        role: "Gerente",
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        icon: "🎖️",
      };
    if (roles.is_supervisor)
      return {
        role: "Supervisor",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: "👨‍💼",
      };
    if (roles.is_cashier)
      return {
        role: "Cajero",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: "💳",
      };
    return {
      role: "Usuario",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
      icon: "👤",
    };
  };

  const mainRole = getMainRole();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-lg shadow-lg p-8 text-white mb-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
        {/* Información principal del usuario */}
        <div className="flex items-center space-x-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
              <span className="text-4xl font-bold text-white">
                {personal.initials}
              </span>
            </div>

            {/* Badge de estado */}
            <div className="absolute -bottom-1 -right-1">
              <div
                className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                  account.is_active ? "bg-green-500" : "bg-red-500"
                }`}
              >
                <span className="text-xs text-white">
                  {account.is_active ? "✓" : "✕"}
                </span>
              </div>
            </div>
          </div>

          {/* Información del usuario */}
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {personal.full_name}
              </h1>
              <p className="text-blue-100 dark:text-purple-100 text-lg">
                @{personal.username}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Rol principal */}
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${mainRole.color}`}
              >
                <span className="mr-1">{mainRole.icon}</span>
                {mainRole.role}
              </span>

              {/* Estado de cuenta */}
              <span
                className={`text-sm font-medium ${getStatusColor(
                  account.is_active
                )}`}
              >
                {account.is_active ? "🟢 Activo" : "🔴 Inactivo"}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-2 text-blue-100 dark:text-purple-100">
              <span className="text-sm">📧</span>
              <span className="text-sm">{personal.email}</span>
            </div>
          </div>
        </div>

        {/* Panel de estadísticas rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          {/* Roles */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white">
              {roles.role_names.length}
            </div>
            <div className="text-xs text-blue-100 dark:text-purple-100">
              Roles
            </div>
          </div>

          {/* Permisos */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white">
              {roles.permission_codes.length}
            </div>
            <div className="text-xs text-blue-100 dark:text-purple-100">
              Permisos
            </div>
          </div>

          {/* Bodegas */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white">
              {roles.warehouse_count}
            </div>
            <div className="text-xs text-blue-100 dark:text-purple-100">
              Bodegas
            </div>
          </div>

          {/* Días desde último login */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-2xl font-bold text-white">
              {account.has_recent_login
                ? "✓"
                : Math.floor(
                    (new Date() - new Date(account.last_login_at)) /
                      (1000 * 60 * 60 * 24)
                  ) || 0}
            </div>
            <div className="text-xs text-blue-100 dark:text-purple-100">
              {account.has_recent_login ? "Reciente" : "Días sin acceso"}
            </div>
          </div>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 pt-6 border-t border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Último acceso */}
          <div className="flex items-center space-x-2">
            <span className="text-blue-200 dark:text-purple-200">🕒</span>
            <div>
              <div className="text-blue-100 dark:text-purple-100">
                Último acceso:
              </div>
              <div className="text-white font-medium">
                {formatLastLogin(account.last_login_at)}
              </div>
            </div>
          </div>

          {/* Teléfono */}
          {personal.phone && (
            <div className="flex items-center space-x-2">
              <span className="text-blue-200 dark:text-purple-200">📱</span>
              <div>
                <div className="text-blue-100 dark:text-purple-100">
                  Teléfono:
                </div>
                <div className="text-white font-medium">{personal.phone}</div>
              </div>
            </div>
          )}

          {/* Cuenta desde */}
          <div className="flex items-center space-x-2">
            <span className="text-blue-200 dark:text-purple-200">📅</span>
            <div>
              <div className="text-blue-100 dark:text-purple-100">
                Miembro desde:
              </div>
              <div className="text-white font-medium">
                {new Date(account.created_at).toLocaleDateString("es-CL", {
                  year: "numeric",
                  month: "long",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas importantes */}
      {(account.needs_password_change || !account.has_recent_login) && (
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-start space-x-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
            <span className="text-yellow-300 text-lg">⚠️</span>
            <div>
              <div className="text-yellow-100 font-medium text-sm">
                Acción requerida
              </div>
              <div className="text-yellow-200 text-sm mt-1">
                {account.needs_password_change &&
                  "Tu contraseña debe ser actualizada. "}
                {!account.has_recent_login &&
                  "No has accedido recientemente al sistema."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
