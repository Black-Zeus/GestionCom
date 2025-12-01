// ====================================
// USER PROFILE DROPDOWN COMPONENT - REACTIVO A userProfile (store) + DARKMODE
// ====================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useHeaderUser } from "@/store/headerStore";     // session (si lo necesitas)
import { useSidebar } from "@/store/sidebarStore";       // dark mode
import { logout } from "@/services/authService";
import { useAuth, useUserProfile } from "@/store/authStore"; // ✅ userProfile para datos vivos

// Helper para iniciales
const getInitials = ({ initials, fullName, username }) => {
  if (initials && initials.trim()) return initials.trim().slice(0, 2).toUpperCase();
  const source =
    (fullName && fullName.trim()) ||
    (username && username.trim()) ||
    "";
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

function UserProfileDropdown({ isOpen, onClose }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  // session/company si tu UI lo aprovecha
  const { session } = useHeaderUser();

  // auth: solo uso logout del store y user básico como fallback
  const { logout: logoutFromStore, user: authUser } = useAuth();

  // ✅ PERFIL COMPLETO (reactivo al PUT + refresh del service)
  const userProfile = useUserProfile();

  // dark mode (para estilos ya aplicados)
  const { isDarkMode } = useSidebar(); // eslint-disable-line @typescript-eslint/no-unused-vars

  // ViewModel: prioriza userProfile, cae a authUser si aún no está cargado
  const vm = useMemo(() => {
    const profile = userProfile || {};
    const fallback = authUser || {};

    const username = profile.username ?? fallback.username ?? "";
    const email = profile.email ?? fallback.email ?? "email@ejemplo.com";

    // displayName preferente; si no, usa fullName o nombre+apellido de fallback
    const fullName =
      profile.displayName ||
      profile.fullName ||
      fallback.full_name ||
      [fallback.first_name, fallback.last_name].filter(Boolean).join(" ") ||
      username ||
      "Usuario";

    const roles =
      profile.roleNames && profile.roleNames.length
        ? profile.roleNames
        : Array.isArray(fallback.roles)
        ? fallback.roles
        : [];

    // avatar_url no está en transformProfile por ahora; usamos el del authUser si existe
    const avatarUrl = profile.avatarUrl || fallback.avatar_url || null;

    // iniciales
    const initials = getInitials({ initials: profile.initials, fullName, username });

    return {
      username,
      email,
      fullName,
      primaryRole: roles[0] || "Usuario",
      roles,
      avatarUrl,
      initials,
    };
  }, [userProfile, authUser]);

  // ====================================
  // OPCIONES DEL MENÚ
  // ====================================

  const profileActions = [
    { id: "view_profile", label: "Ver Perfil", icon: "👤", description: "Ver información personal", url: "/profile", color: "blue" },
    { id: "account_settings", label: "Configuración de Cuenta", icon: "⚙️", description: "Preferencias y configuraciones", url: "/profile/settings", color: "purple" },
    { id: "notifications_settings", label: "Configurar Notificaciones", icon: "🔔", description: "Gestionar alertas y avisos", url: "/profile/notifications", color: "orange" },
    { id: "security", label: "Seguridad", icon: "🔐", description: "Contraseña y autenticación", url: "/profile/security", color: "red" },
  ];

  // ====================================
  // HANDLERS
  // ====================================

  const handleAction = async (action) => {
    onClose();
    switch (action.id) {
      case "view_profile":
      case "account_settings":
      case "notifications_settings":
      case "security":
        navigate(action.url);
        break;
      default:
        console.info(`Acción ${action.id} no implementada`);
    }
  };

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
      logoutFromStore();
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const getActionStyles = (action) => {
    const baseStyles = "px-4 py-3 flex items-center gap-3 w-full text-left transition-all duration-200";
    const colorMap = {
      blue: "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400",
      purple: "hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400",
      orange: "hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400",
      red: "hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400",
    };
    return cn(
      baseStyles,
      colorMap[action.color] || colorMap.blue,
      "text-gray-700 dark:text-gray-300",
      "hover:translate-x-1",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
    );
  };

  const renderActionButton = (action) => (
    <button
      key={action.id}
      onClick={() => handleAction(action)}
      onMouseEnter={() => setHoveredItem(action.id)}
      onMouseLeave={() => setHoveredItem(null)}
      className={getActionStyles(action)}
    >
      <span className="text-xl flex-shrink-0">{action.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{action.label}</div>
        <div className={cn("text-xs mt-0.5", "text-gray-500 dark:text-gray-400")}>
          {action.description}
        </div>
      </div>
      <div className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200", hoveredItem === action.id && "translate-x-1")}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute top-full right-0 mt-2",
        "z-50",
        "w-80 lg:w-96",
        "max-h-[36rem]",
        "bg-white dark:bg-gray-900",
        "rounded-xl shadow-xl",
        "border border-gray-200 dark:border-gray-700",
        "backdrop-blur-sm",
        "overflow-hidden",
        "transition-all duration-300",
        "animate-in slide-in-from-top-2 fade-in-0 duration-200"
      )}
    >
      {/* HEADER */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              <div
                className={cn(
                  "w-16 h-16 rounded-full",
                  "flex items-center justify-center",
                  "bg-white/20 backdrop-blur-sm",
                  "text-white font-bold text-xl",
                  "border-2 border-white/30"
                )}
              >
                {vm.avatarUrl ? (
                  <img
                    src={vm.avatarUrl}
                    alt={vm.fullName || vm.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{vm.initials}</span>
                )}
              </div>
            </div>

            {/* Info usuario */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight">
                {vm.fullName}
              </h3>
              <p className="text-white/80 text-sm">{vm.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/70">
                  {vm.primaryRole}
                </span>
                <span className="text-white/50">•</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white/70">@{vm.username}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className={cn("py-2", "bg-white dark:bg-gray-900")}>
        {profileActions.map(renderActionButton)}
      </div>

      {/* SESIÓN */}
      {session && (
        <div
          className={cn(
            "px-4 py-3",
            "border-t border-gray-200 dark:border-gray-700",
            "bg-gray-50 dark:bg-gray-800/50"
          )}
        >
          <div className="text-xs space-y-1">
            <div className={cn("flex justify-between", "text-gray-600 dark:text-gray-400")}>
              <span>Última conexión:</span>
              <span>
                {session.last_activity ? new Date(session.last_activity).toLocaleString() : "Ahora"}
              </span>
            </div>
            {session.device_info && (
              <div className={cn("flex justify-between", "text-gray-600 dark:text-gray-400")}>
                <span>Dispositivo:</span>
                <span className="truncate ml-2 max-w-32">{session.device_info}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGOUT */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center justify-center gap-2",
            "px-4 py-3 rounded-lg",
            "bg-red-50 hover:bg-red-100",
            "dark:bg-red-900/20 dark:hover:bg-red-900/30",
            "text-red-600 hover:text-red-700",
            "dark:text-red-400 dark:hover:text-red-300",
            "border border-red-200 hover:border-red-300",
            "dark:border-red-800 dark:hover:border-red-700",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
          )}
        >
          <span className="text-sm">🚪</span>
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}

export default UserProfileDropdown;
