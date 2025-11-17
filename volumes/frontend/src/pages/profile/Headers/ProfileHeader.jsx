// ====================================
// volumes/frontend/src/pages/profile/Headers/ProfileHeader.jsx
// Header principal de la página de perfil (reactivo al store)
// ====================================

import React, { useMemo, useEffect } from "react";
import { useUserProfile, useProfileLoading, useAuth } from "@/store/authStore";
import { formatDateTimeTechnical } from "@/utils/formats";

// Fallback simple si backend no provee flag "isRecentlyActive"
const computeHasRecentLogin = (lastLoginAt, days = 30) => {
  if (!lastLoginAt) return false;
  const last = new Date(lastLoginAt).getTime();
  const now = Date.now();
  const diffDays = (now - last) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
};

const ProfileHeader = () => {
  const userProfile = useUserProfile();
  const isProfileLoading = useProfileLoading();
  const { loadUserProfile } = useAuth();

  // Cargar perfil si no está disponible
  useEffect(() => {
    if (!userProfile && !isProfileLoading) {
      loadUserProfile();
    }
  }, [userProfile, isProfileLoading, loadUserProfile]);

  // ViewModel: adapta userProfile al shape usado por el header original
  const vm = useMemo(() => {
    if (!userProfile) return null;

    const roles = {
      has_admin_role: !!userProfile.hasAdminRole,
      has_manager_role: !!userProfile.hasManagerRole,
      is_supervisor: !!userProfile.isSupervisor,
      is_cashier: !!userProfile.isCashier,
      role_names: userProfile.roleNames || [],
      permission_codes: userProfile.permissions || [], // mapea a "permissions" del perfil
      warehouse_count: userProfile.warehouseCount || 0,
    };

    const account = {
      is_active: !!userProfile.isActive,
      last_login_at: userProfile.lastLoginAt || null,
      has_recent_login:
        typeof userProfile.isRecentlyActive === "boolean"
          ? userProfile.isRecentlyActive
          : computeHasRecentLogin(userProfile.lastLoginAt),
      needs_password_change: !!userProfile.needsPasswordChange,
    };

    const personal = {
      initials: userProfile.initials || "",
      full_name: userProfile.displayName || userProfile.fullName || "",
      username: userProfile.username || "",
      email: userProfile.email || "",
      phone: userProfile.phone || "",
    };

    return { personal, account, roles };
  }, [userProfile]);

  // Loading / vacío
  if (isProfileLoading && !vm) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-lg shadow-lg p-8 text-white mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-white/30 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!vm) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 rounded-lg shadow-lg p-8 text-white mb-8">
        <div className="text-white/90">No se pudo cargar el perfil.</div>
      </div>
    );
  }

  const { personal, account, roles } = vm;

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
            </div>

            {/* Email */}
            <div className="flex items-center space-x-2 text-blue-100 dark:text-purple-100">
              <span className="text-sm">📧</span>
              <span className="text-sm">{personal.email}</span>
            </div>
          </div>
        </div>

        {/* Panel de estadísticas y datos adicionales alineado a la derecha */}
        <div className="flex justify-end w-full gap-6 pr-4">
          {/* Contadores en grid 2x2 */}
          <div className="grid grid-cols-2 gap-4 text-center">
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

            {/* Estado de la cuenta */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              {(() => {
                const isActive = account.is_active;
                const palette = isActive
                  ? {
                      label: "ACTIVO",
                      badge:
                        "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200",
                      iconFill: "text-green-600 dark:text-green-300",
                      desc: "Estado de cuenta",
                    }
                  : {
                      label: "INACTIVO",
                      badge:
                        "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
                      iconFill: "text-red-600 dark:text-red-300",
                      desc: "Estado de cuenta",
                    };

                return (
                  <div className="flex flex-col items-center text-center">
                    <span
                      role="status"
                      aria-live="polite"
                      aria-label={`Cuenta ${palette.label.toLowerCase()}`}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${palette.badge}`}
                    >
                      {isActive ? (
                        <svg
                          className={`h-4 w-4 ${palette.iconFill}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 7L9 18l-5-5"
                          />
                        </svg>
                      ) : (
                        <svg
                          className={`h-4 w-4 ${palette.iconFill}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 5.636a9 9 0 1 0 0 12.728A9 9 0 0 0 18.364 5.636zm-12.728 0L18.364 18.364"
                          />
                        </svg>
                      )}
                      {palette.label}
                    </span>

                    <div className="mt-2 text-xs text-blue-100 dark:text-purple-100">
                      {palette.desc}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Información adicional */}
          <div className="grid grid-cols-1 gap-4 w-[220px]">
            {/* Último acceso */}
            <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <span className="text-blue-200 dark:text-purple-200 text-xl">
                🕒
              </span>
              <div>
                <div className="text-blue-100 dark:text-purple-100 text-sm">
                  Último acceso:
                </div>
                <div className="text-white font-medium">
                  {formatDateTimeTechnical(account.last_login_at)}
                </div>
              </div>
            </div>

            {/* Teléfono */}
            {personal.phone && (
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <span className="text-blue-200 dark:text-purple-200 text-xl">
                  📱
                </span>
                <div>
                  <div className="text-blue-100 dark:text-purple-100 text-sm">
                    Teléfono:
                  </div>
                  <div className="text-white font-medium">{personal.phone}</div>
                </div>
              </div>
            )}
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
