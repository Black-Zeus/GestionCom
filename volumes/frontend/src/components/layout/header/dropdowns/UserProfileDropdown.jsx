// ====================================
// USER PROFILE DROPDOWN COMPONENT - CORREGIDO PARA DARKMODE
// ====================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useHeaderUser } from "@/store/headerStore";
import { useSidebar } from "@/store/sidebarStore"; // ✅ AÑADIDO: Para darkMode sincronizado
import { logout } from "@/services/authService";
import { useAuth } from "@/store/authStore";

/**
 * Componente dropdown del perfil de usuario
 * ✅ CORREGIDO: Sincronizado con darkMode del sistema
 */
function UserProfileDropdown({ isOpen, onClose }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  const { user, company, session } = useHeaderUser();
  const { logout: logoutFromStore, user: authUser } = useAuth();

  // ✅ CONECTAR AL SIDEBAR STORE PARA DARKMODE SINCRONIZADO
  const { isDarkMode } = useSidebar();

  // ====================================
  // OPCIONES DEL MENÚ - SIMPLIFICADAS
  // ====================================

  const profileActions = [
    {
      id: "view_profile",
      label: "Ver Perfil",
      icon: "👤",
      description: "Ver información personal",
      url: "/profile",
      color: "blue",
    },
    {
      id: "account_settings",
      label: "Configuración de Cuenta",
      icon: "⚙️",
      description: "Preferencias y configuraciones",
      url: "/profile/settings",
      color: "purple",
    },
    {
      id: "notifications_settings",
      label: "Configurar Notificaciones",
      icon: "🔔",
      description: "Gestionar alertas y avisos",
      url: "/profile/notifications",
      color: "orange",
    },
    {
      id: "security",
      label: "Seguridad",
      icon: "🔐",
      description: "Contraseña y autenticación",
      url: "/profile/security",
      color: "red",
    },
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
        console.log(`Acción ${action.id} no implementada`);
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
    const baseStyles =
      "px-4 py-3 flex items-center gap-3 w-full text-left transition-all duration-200";

    // ✅ COLORES SINCRONIZADOS CON DARKMODE
    const colorMap = {
      blue: "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400",
      purple:
        "hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400",
      orange:
        "hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400",
      red: "hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400",
    };

    return cn(
      baseStyles,
      colorMap[action.color] || colorMap.blue,
      // ✅ TEXTOS BASE SINCRONIZADOS
      "text-gray-700 dark:text-gray-300",
      // Efectos hover
      "hover:translate-x-1",
      // Focus states
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
      {/* Icono */}
      <span className="text-xl flex-shrink-0">{action.icon}</span>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="font-medium">{action.label}</div>
        <div
          className={cn(
            "text-xs mt-0.5",
            // ✅ DESCRIPCIÓN SINCRONIZADA CON DARKMODE
            "text-gray-500 dark:text-gray-400"
          )}
        >
          {action.description}
        </div>
      </div>

      {/* Flecha */}
      <div
        className={cn(
          "text-gray-400 dark:text-gray-500 transition-transform duration-200",
          hoveredItem === action.id && "translate-x-1"
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
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
        // Posición
        "absolute top-full right-0 mt-2",
        "z-50", // ✅ MEJORADO: z-index explícito

        // Tamaño
        "w-80 lg:w-96",
        "max-h-[36rem]",

        // ✅ ESTILOS SINCRONIZADOS CON DARKMODE
        "bg-white dark:bg-gray-900",
        "rounded-xl shadow-xl",
        "border border-gray-200 dark:border-gray-700",
        "backdrop-blur-sm",
        "overflow-hidden",

        // ✅ TRANSICIONES SUAVES
        "transition-all duration-300",

        // Animación
        "animate-in slide-in-from-top-2 fade-in-0 duration-200"
      )}
    >
      {/* ================================ */}
      {/* HEADER CON INFO DEL USUARIO */}
      {/* ================================ */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar grande */}
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
                {authUser?.avatar_url ? (
                  <img
                    src={authUser.avatar_url}
                    alt={authUser.full_name || authUser.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>
                    {(
                      authUser?.full_name?.charAt(0) ||
                      authUser?.username?.charAt(0) ||
                      "U"
                    ).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Info del usuario */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight">
                {authUser?.full_name || authUser?.username || "Usuario"}
              </h3>
              <p className="text-white/80 text-sm">
                {authUser?.email || "email@ejemplo.com"}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/70">
                  {authUser?.roles?.[0] || "Usuario"}
                </span>
                <span className="text-white/50">•</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white/70">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* ACCIONES DEL PERFIL */}
      {/* ================================ */}
      <div
        className={cn(
          "py-2",
          // ✅ FONDO SINCRONIZADO
          "bg-white dark:bg-gray-900"
        )}
      >
        {profileActions.map(renderActionButton)}
      </div>

      {/* ================================ */}
      {/* INFORMACIÓN DE SESIÓN */}
      {/* ================================ */}
      {session && (
        <div
          className={cn(
            "px-4 py-3",
            // ✅ BORDES SINCRONIZADOS
            "border-t border-gray-200 dark:border-gray-700",
            // ✅ FONDO SINCRONIZADO
            "bg-gray-50 dark:bg-gray-800/50"
          )}
        >
          <div className="text-xs space-y-1">
            <div
              className={cn(
                "flex justify-between",
                // ✅ TEXTOS SINCRONIZADOS
                "text-gray-600 dark:text-gray-400"
              )}
            >
              <span>Última conexión:</span>
              <span>
                {session.last_activity
                  ? new Date(session.last_activity).toLocaleString()
                  : "Ahora"}
              </span>
            </div>
            {session.device_info && (
              <div
                className={cn(
                  "flex justify-between",
                  // ✅ TEXTOS SINCRONIZADOS
                  "text-gray-600 dark:text-gray-400"
                )}
              >
                <span>Dispositivo:</span>
                <span className="truncate ml-2 max-w-32">
                  {session.device_info}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================ */}
      {/* ACCIÓN DE LOGOUT */}
      {/* ================================ */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className={cn(
            // Layout
            "w-full flex items-center justify-center gap-2",
            "px-4 py-3 rounded-lg",

            // ✅ ESTILOS SINCRONIZADOS CON DARKMODE
            "bg-red-50 hover:bg-red-100",
            "dark:bg-red-900/20 dark:hover:bg-red-900/30",
            "text-red-600 hover:text-red-700",
            "dark:text-red-400 dark:hover:text-red-300",
            "border border-red-200 hover:border-red-300",
            "dark:border-red-800 dark:hover:border-red-700",

            // Transiciones
            "transition-all duration-200",

            // Focus
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
