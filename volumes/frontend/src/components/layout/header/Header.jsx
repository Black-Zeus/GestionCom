// ====================================
// HEADER COMPONENT - DROPDOWNS FUNCIONANDO
// ====================================

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useSidebar } from "@/store/sidebarStore";

// Componentes del Header
import HeaderBreadcrumb from "./HeaderBreadcrumb";
import HeaderSearch from "./HeaderSearch";

// Componentes de Dropdowns
import NotificationsDropdown from "./dropdowns/NotificationsDropdown";
import MessagesDropdown from "./dropdowns/MessagesDropdown";
import SettingsDropdown from "./dropdowns/SettingsDropdown";
import UserProfileDropdown from "./dropdowns/UserProfileDropdown";

/**
 * Componente principal del Header
 * ✅ CORREGIDO: Dropdowns funcionando + Sin botón de darkMode
 */
function Header({ className }) {
  const headerRef = useRef(null);

  // ==========================================
  // ESTADO LOCAL PARA DROPDOWNS (SIMPLIFICADO)
  // ==========================================
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [messagesCount, setMessagesCount] = useState(5);

  // ✅ CONECTAR AL SIDEBAR STORE SOLO PARA MOBILE
  const { toggleMobileOpen, isDarkMode } = useSidebar();

  // ====================================
  // HANDLERS DE DROPDOWNS
  // ====================================

  const openDropdown = (dropdownType) => {
    setActiveDropdown(activeDropdown === dropdownType ? null : dropdownType);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };

  // Handler para el menú móvil
  const handleMobileMenuToggle = () => {
    closeAllDropdowns();
    toggleMobileOpen();
  };

  // ====================================
  // HANDLERS DE BOTONES
  // ====================================

  const handleNotificationsClick = () => {
    openDropdown("notifications");
  };

  const handleMessagesClick = () => {
    openDropdown("messages");
  };

  const handleSettingsClick = () => {
    openDropdown("settings");
  };

  const handleUserProfileClick = () => {
    openDropdown("userProfile");
  };

  // ====================================
  // EFECTOS
  // ====================================

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        closeAllDropdowns();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        closeAllDropdowns();
      }
    };

    // Event listeners
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // ====================================
  // RENDER HELPERS
  // ====================================

  const renderActionButton = ({
    id,
    icon,
    label,
    badgeCount = 0,
    onClick,
    ariaLabel,
  }) => {
    const isActive = activeDropdown === id;

    return (
      <button
        onClick={onClick}
        className={cn(
          // Layout base
          "relative flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",

          // Estados base
          "text-gray-600 hover:text-gray-900",
          "hover:bg-gray-100",
          "dark:text-gray-300 dark:hover:text-white",
          "dark:hover:bg-gray-800",

          // Estado activo
          isActive && [
            "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
            "dark:bg-blue-900/20 dark:text-blue-400",
          ],

          // Animaciones
          "transform hover:scale-105 active:scale-95"
        )}
        aria-label={ariaLabel}
        title={label}
      >
        {/* Icono */}
        <span className="text-lg">{icon}</span>

        {/* Badge de notificación */}
        {badgeCount > 0 && (
          <span
            className={cn(
              // Posición
              "absolute -top-1 -right-1",
              "min-w-5 h-5 rounded-full",
              "flex items-center justify-center",

              // Estilos
              "text-xs font-bold text-white",
              "bg-red-500 shadow-sm",
              "animate-pulse",

              // Contenido dinámico
              badgeCount > 99 ? "text-[10px] px-1" : "px-1"
            )}
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    );
  };

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <header
      ref={headerRef}
      className={cn(
        // Layout base
        "flex items-center justify-between",
        "px-6 lg:px-8",
        "relative z-50",

        // Altura fija
        "h-16 min-h-16 flex-shrink-0",

        // ✅ ESTILOS SINCRONIZADOS CON DARKMODE
        "bg-white dark:bg-gray-900",
        "border-b border-gray-200 dark:border-gray-700",
        "shadow-sm dark:shadow-lg",

        // ✅ TRANSICIONES SUAVES
        "transition-all duration-300 ease-in-out",

        className
      )}
      role="banner"
    >
      {/* ================================ */}
      {/* SECCIÓN IZQUIERDA */}
      {/* ================================ */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Botón Menú Móvil */}
        <button
          onClick={handleMobileMenuToggle}
          className={cn(
            "lg:hidden flex items-center justify-center",
            "w-10 h-10 rounded-lg",
            "text-gray-600 hover:text-gray-900",
            "hover:bg-gray-100",
            "dark:text-gray-300 dark:hover:text-white",
            "dark:hover:bg-gray-800",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          )}
          aria-label="Abrir menú de navegación"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Breadcrumb Navigation */}
        <HeaderBreadcrumb />
      </div>

      {/* ================================ */}
      {/* SECCIÓN CENTRAL - BÚSQUEDA */}
      {/* ================================ */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <HeaderSearch />
      </div>

      {/* ================================ */}
      {/* SECCIÓN DERECHA - ACCIONES */}
      {/* ================================ */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* ✅ BOTÓN DE NOTIFICACIONES */}
        {renderActionButton({
          id: "notifications",
          icon: "🔔",
          label: "Notificaciones",
          badgeCount: notificationsCount,
          onClick: handleNotificationsClick,
          ariaLabel: `Notificaciones (${notificationsCount} nuevas)`,
        })}

        {/* ✅ BOTÓN DE MENSAJES */}
        {renderActionButton({
          id: "messages",
          icon: "💬",
          label: "Mensajes",
          badgeCount: messagesCount,
          onClick: handleMessagesClick,
          ariaLabel: `Mensajes (${messagesCount} no leídos)`,
        })}

        {/* ✅ BOTÓN DE CONFIGURACIÓN */}
        {renderActionButton({
          id: "settings",
          icon: "⚙️",
          label: "Configuración",
          badgeCount: 0,
          onClick: handleSettingsClick,
          ariaLabel: "Configuración del sistema",
        })}

        {/* ✅ BOTÓN DE PERFIL DE USUARIO */}
        <button
          onClick={handleUserProfileClick}
          className={cn(
            // Layout
            "flex items-center gap-3 px-3 py-2",
            "rounded-lg transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
            "min-w-0",

            // Estados base
            "text-gray-700 hover:text-gray-900",
            "hover:bg-gray-100",
            "dark:text-gray-300 dark:hover:text-white",
            "dark:hover:bg-gray-800",

            // Estado activo
            activeDropdown === "userProfile" && [
              "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
              "dark:bg-blue-900/20 dark:text-blue-400",
            ]
          )}
          aria-label="Perfil de usuario"
        >
          {/* Avatar */}
          <div
            className={cn(
              "w-8 h-8 rounded-full",
              "bg-gradient-to-br from-blue-500 to-purple-500",
              "flex items-center justify-center",
              "text-white font-semibold text-sm",
              "transition-transform duration-200",
              "hover:scale-110"
            )}
          >
            U
          </div>

          {/* Info del usuario - Solo desktop */}
          <div className="hidden lg:block min-w-0">
            <div className="text-sm font-medium truncate">Usuario Admin</div>
            <div
              className={cn(
                "text-xs truncate",
                "text-gray-500 dark:text-gray-400"
              )}
            >
              Administrador
            </div>
          </div>

          {/* Flecha dropdown - Solo desktop */}
          <svg
            className={cn(
              "hidden lg:block w-4 h-4 transition-transform duration-200",
              activeDropdown === "userProfile" && "rotate-180"
            )}
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
        </button>
      </div>

      {/* ================================ */}
      {/* DROPDOWNS CONTEXTUALES */}
      {/* ================================ */}

      {/* ✅ NOTIFICACIONES DROPDOWN */}
      <NotificationsDropdown
        isOpen={activeDropdown === "notifications"}
        onClose={closeAllDropdowns}
      />

      {/* ✅ MENSAJES DROPDOWN */}
      <MessagesDropdown
        isOpen={activeDropdown === "messages"}
        onClose={closeAllDropdowns}
      />

      {/* ✅ CONFIGURACIÓN DROPDOWN */}
      <SettingsDropdown
        isOpen={activeDropdown === "settings"}
        onClose={closeAllDropdowns}
      />

      {/* ✅ PERFIL USUARIO DROPDOWN */}
      <UserProfileDropdown
        isOpen={activeDropdown === "userProfile"}
        onClose={closeAllDropdowns}
      />

      {/* ================================ */}
      {/* BÚSQUEDA MÓVIL */}
      {/* ================================ */}
      {activeDropdown === "mobileSearch" && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 p-4 z-50",
            "bg-white dark:bg-gray-900",
            "border-b border-gray-200 dark:border-gray-700",
            "shadow-lg"
          )}
        >
          <HeaderSearch mobile />
        </div>
      )}
    </header>
  );
}

export default Header;
