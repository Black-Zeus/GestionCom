// ====================================
// USER PROFILE DROPDOWN COMPONENT - SIMPLIFICADO
// ====================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useHeaderUser } from "@/store/headerStore";
import { logout } from "@/services/authService";
import { useAuth } from "@/store/authStore";

/**
 * Componente dropdown del perfil de usuario simplificado
 * Solo muestra información del usuario y acciones básicas
 */
function UserProfileDropdown({ isOpen, onClose }) {
  const [hoveredItem, setHoveredItem] = useState(null);
  const navigate = useNavigate();

  const { user, company, session } = useHeaderUser();
  const { logout: logoutFromStore, user: authUser } = useAuth();

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

  const handleProfileAction = (action) => {
    onClose();
    navigate(action.url);
  };

  const handleLogout = async () => {
    try {
      await logout();
      logoutFromStore("User logout");
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Logout local incluso si la API falla
      logoutFromStore("Logout error");
      navigate("/login");
    }
    onClose();
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const renderActionItem = (action, handler) => (
    <button
      key={action.id}
      onClick={() => handler(action)}
      onMouseEnter={() => setHoveredItem(action.id)}
      onMouseLeave={() => setHoveredItem(null)}
      className={cn(
        // Layout
        "w-full flex items-center gap-3 px-4 py-3",
        "text-left transition-all duration-200",

        // Estados hover
        "hover:bg-gray-50 dark:hover:bg-gray-800",
        hoveredItem === action.id && "bg-gray-50 dark:bg-gray-800",

        // Focus
        "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
      )}
    >
      {/* Icono */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          `bg-${action.color}-100 dark:bg-${action.color}-900/30`
        )}
      >
        <span className="text-sm">{action.icon}</span>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {action.label}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {action.description}
        </div>
      </div>

      {/* Arrow */}
      <div
        className={cn(
          "text-gray-400 transition-transform duration-200",
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
        "z-dropdown",

        // Tamaño
        "w-80 lg:w-96",
        "max-h-[36rem]",

        // Estilos
        "bg-white rounded-xl shadow-xl border border-gray-200",
        "backdrop-blur-sm",
        "overflow-hidden",

        // Modo oscuro
        "dark:bg-gray-900 dark:border-gray-700",

        // Animación
        "animate-slide-in-up"
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
                  {authUser?.roles?.[0] || "Sin rol"}
                </span>
                {/* Comentado temporalmente - información de compañía */}
                {/* {company?.name && (
                  <>
                    <span className="text-white/50">•</span>
                    <span className="text-xs text-white/70">
                      {company.name}
                    </span>
                  </>
                )} */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================ */}
      {/* OPCIONES DE PERFIL */}
      {/* ================================ */}
      <div className="border-b border-gray-100 dark:border-gray-700">
        <div className="px-4 py-2">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Perfil y Cuenta
          </h4>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {profileActions.map((action) =>
            renderActionItem(action, handleProfileAction)
          )}
        </div>
      </div>

      {/* ================================ */}
      {/* INFORMACIÓN DE SESIÓN */}
      {/* ================================ */}
      {session && (
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="px-4 py-3">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Información de Sesión
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {session.login_time && (
                <div className="flex justify-between">
                  <span>Última conexión:</span>
                  <span>{new Date(session.login_time).toLocaleString()}</span>
                </div>
              )}
              {session.ip_address && (
                <div className="flex justify-between">
                  <span>IP:</span>
                  <span className="font-mono">{session.ip_address}</span>
                </div>
              )}
              {session.device_info && (
                <div className="flex justify-between">
                  <span>Dispositivo:</span>
                  <span
                    className="truncate max-w-32"
                    title={session.device_info}
                  >
                    {session.device_info}
                  </span>
                </div>
              )}
            </div>
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

            // Estilos
            "bg-red-50 hover:bg-red-100",
            "text-red-600 hover:text-red-700",
            "border border-red-200 hover:border-red-300",
            "transition-all duration-200",

            // Focus
            "focus:outline-none focus:ring-2 focus:ring-red-500",

            // Modo oscuro
            "dark:bg-red-900/20 dark:hover:bg-red-900/30",
            "dark:text-red-400 dark:hover:text-red-300",
            "dark:border-red-800 dark:hover:border-red-700"
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
