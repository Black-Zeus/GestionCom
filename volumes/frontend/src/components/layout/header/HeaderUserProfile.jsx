// ====================================
// HEADER USER PROFILE COMPONENT
// ====================================

import { cn } from "@/utils/cn";
import { useDropdowns, useHeaderUser } from "@/store/headerStore";

/**
 * Componente del perfil de usuario en el header
 * Muestra información del usuario y permite acceder al dropdown de perfil
 */
function HeaderUserProfile({ className }) {
  const { openDropdown, isOpen } = useDropdowns();
  const { user, session } = useHeaderUser();

  // ====================================
  // HANDLERS
  // ====================================

  const handleProfileClick = () => {
    openDropdown("userProfile");
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const getStatusColor = (status) => {
    switch (status?.availability) {
      case "available":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.availability) {
      case "available":
        return "Disponible";
      case "busy":
        return "Ocupado";
      case "away":
        return "Ausente";
      default:
        return "Desconectado";
    }
  };

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <button
      onClick={handleProfileClick}
      className={cn(
        // Layout
        "flex items-center gap-3 px-3 py-2",
        "rounded-xl transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500",
        "min-w-0", // Para permitir truncate en textos

        // Estados base
        "text-gray-700 hover:text-gray-900",
        "hover:bg-gray-100",

        // Estado activo
        isOpen("userProfile") && [
          "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
          "dark:bg-blue-900/20 dark:text-blue-400",
        ],

        // Modo oscuro
        "dark:text-gray-200 dark:hover:text-white",
        "dark:hover:bg-gray-800",

        // Responsive
        "hidden sm:flex",

        className
      )}
      aria-label={`Perfil de ${user?.profile?.full_name || "Usuario"}`}
      title={`${user?.profile?.full_name || "Usuario"} - ${getStatusLabel(
        user?.status
      )}`}
    >
      {/* Avatar con indicador de estado */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            // Tamaño y forma
            "w-8 h-8 rounded-full",
            "flex items-center justify-center",

            // Estilos del avatar
            "bg-gradient-to-r from-blue-500 to-purple-500",
            "text-white font-semibold text-sm",
            "border-2 border-white dark:border-gray-900",
            "shadow-sm",

            // Animación en hover
            "transition-transform duration-200",
            "group-hover:scale-110"
          )}
        >
          {user?.profile?.avatar_url ? (
            <img
              src={user.profile.avatar_url}
              alt={user.profile.full_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span>
              {user?.profile?.avatar ||
                user?.profile?.full_name?.charAt(0)?.toUpperCase() ||
                "U"}
            </span>
          )}
        </div>

        {/* Indicador de estado online */}
        {user?.status?.online && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5",
              "w-3 h-3 rounded-full border-2 border-white dark:border-gray-900",
              getStatusColor(user.status),
              "transition-colors duration-200"
            )}
          >
            {/* Pulso para estado disponible */}
            {user.status.availability === "available" && (
              <div
                className={cn(
                  "absolute inset-0 rounded-full",
                  "bg-green-500 animate-ping opacity-75"
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Información del Usuario */}
      <div className="flex-1 min-w-0 text-left hidden md:block">
        {/* Nombre */}
        <div
          className={cn(
            "font-medium text-sm leading-tight",
            "truncate max-w-24 lg:max-w-32"
          )}
        >
          {user?.profile?.display_name || user?.profile?.full_name || "Usuario"}
        </div>

        {/* Rol */}
        <div
          className={cn(
            "text-xs text-gray-500 dark:text-gray-400",
            "truncate max-w-24 lg:max-w-32"
          )}
        >
          {user?.role?.name || "Sin rol"}
        </div>
      </div>

      {/* Flecha del dropdown */}
      <div
        className={cn(
          "flex-shrink-0 text-gray-400 transition-transform duration-200",
          "hidden lg:block",
          isOpen("userProfile") && "rotate-180"
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
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {/* Información adicional en tooltip (móvil) */}
      <div
        className={cn(
          "sm:hidden absolute top-full left-0 mt-1",
          "bg-gray-900 text-white text-xs rounded px-2 py-1",
          "opacity-0 pointer-events-none transition-opacity duration-200",
          "whitespace-nowrap z-tooltip",
          "group-hover:opacity-100"
        )}
      >
        {user?.profile?.full_name} - {user?.role?.name}
      </div>
    </button>
  );
}

export default HeaderUserProfile;
