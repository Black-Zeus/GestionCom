// ====================================
// HEADER COMPONENT - DROPDOWNS FUNCIONANDO (perfil dinámico)
// ====================================

import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { useSidebar } from "@/store/sidebarStore";

// Data del usuario (store de auth)
import { useUserProfile, useAuth } from "@/store/authStore";

// Componentes del Header
import HeaderBreadcrumb from "./HeaderBreadcrumb";
import HeaderSearch from "./HeaderSearch";

// Dropdowns
import NotificationsDropdown from "./dropdowns/NotificationsDropdown";
import MessagesDropdown from "./dropdowns/MessagesDropdown";
import SettingsDropdown from "./dropdowns/SettingsDropdown";
import UserProfileDropdown from "./dropdowns/UserProfileDropdown";

// ===== Helpers de nombre/iniciales =====
const getInitials = ({ initials, fullName, username }) => {
  if (initials && initials.trim()) return initials.trim().slice(0, 2).toUpperCase();
  const src = (fullName && fullName.trim()) || (username && username.trim()) || "";
  if (!src) return "U";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const extractFirstAndLast = (p, f) => {
  let first = p.firstName ?? f.first_name ?? null;
  let last  = p.lastName  ?? f.last_name  ?? null;
  const full = (p.fullName || f.full_name || "").trim();
  if ((!first || !last) && full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (!first && parts.length > 0) first = parts[0];
    if (!last && parts.length > 1)  last  = parts[parts.length - 1];
  }
  return { first, last };
};

const mapRole = (r) => {
  if (!r) return "Sin rol";
  // Mapea códigos comunes a etiquetas en español
  switch (r) {
    case "ADMIN": return "Administrador";
    case "MANAGER": return "Gerente";
    case "SUPERVISOR": return "Supervisor";
    case "CASHIER": return "Cajero";
    default: return r; // si ya viene “Administrador” desde roleNames, se muestra tal cual
  }
};

function Header({ className }) {
  const headerRef = useRef(null);

  // Dropdowns locales
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [messagesCount, setMessagesCount] = useState(5);

  // Sidebar (menú móvil / darkmode)
  const { toggleMobileOpen, isDarkMode } = useSidebar(); // eslint-disable-line

  // ===== Datos del usuario (store) =====
  const userProfile = useUserProfile();
  const { user: authUser } = useAuth(); // fallback básico

  // ViewModel: prioriza userProfile
  const vm = useMemo(() => {
    const p = userProfile || {};
    const f = authUser || {};

    const username = p.username ?? f.username ?? "";
    const fullName =
      p.fullName ||
      f.full_name ||
      [f.first_name, f.last_name].filter(Boolean).join(" ") ||
      username ||
      "Usuario";

    const { first, last } = extractFirstAndLast(p, f);

    // “Nombre InicialApellido,” => “Victor S,” (coma solo si hay apellido)
    const compactName = (() => {
      const firstPart = (first || username || "Usuario").trim();
      const lastInitial = last ? `${last.charAt(0).toUpperCase()},` : "";
      return `${firstPart} ${lastInitial}`.trim();
    })();

    const roles = (Array.isArray(p.roleNames) && p.roleNames.length
      ? p.roleNames          // ya vienen legibles (“Administrador”)
      : Array.isArray(f.roles)
      ? f.roles              // códigos (“ADMIN”)
      : []);

    const primaryRole = roles.length ? mapRole(roles[0]) : "Sin rol";
    const initials = getInitials({ initials: p.initials, fullName, username });

    return { compactName, primaryRole, initials };
  }, [userProfile, authUser]);

  // ===== Dropdown handlers =====
  const openDropdown = (type) => setActiveDropdown(activeDropdown === type ? null : type);
  const closeAllDropdowns = () => setActiveDropdown(null);
  const handleMobileMenuToggle = () => { closeAllDropdowns(); toggleMobileOpen(); };

  const handleNotificationsClick = () => openDropdown("notifications");
  const handleMessagesClick = () => openDropdown("messages");
  const handleSettingsClick = () => openDropdown("settings");
  const handleUserProfileClick = () => openDropdown("userProfile");

  // Cerrar al hacer clic fuera / ESC
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) closeAllDropdowns();
    };
    const handleEscapeKey = (e) => { if (e.key === "Escape") closeAllDropdowns(); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // ===== Render helper para botones (notificaciones, mensajes, settings) =====
  const renderActionButton = ({ id, icon, label, badgeCount = 0, onClick, ariaLabel }) => {
    const isActive = activeDropdown === id;
    return (
      <button
        onClick={onClick}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
          "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800",
          isActive && ["bg-blue-50 text-blue-600 ring-2 ring-blue-500", "dark:bg-blue-900/20 dark:text-blue-400"],
          "transform hover:scale-105 active:scale-95"
        )}
        aria-label={ariaLabel}
        title={label}
      >
        <span className="text-lg">{icon}</span>
        {badgeCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 min-w-5 h-5 rounded-full flex items-center justify-center",
            "text-xs font-bold text-white bg-red-500 shadow-sm animate-pulse",
            badgeCount > 99 ? "text-[10px] px-1" : "px-1"
          )}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    );
  };

  // ===== Render =====
  return (
    <header
      ref={headerRef}
      className={cn(
        "flex items-center justify-between px-6 lg:px-8 relative z-50",
        "h-16 min-h-16 flex-shrink-0",
        "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700",
        "shadow-sm dark:shadow-lg transition-all duration-300 ease-in-out",
        className
      )}
      role="banner"
    >
      {/* Izquierda: menú móvil + breadcrumb */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={handleMobileMenuToggle}
          className={cn(
            "lg:hidden flex items-center justify-center w-10 h-10 rounded-lg",
            "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800",
            "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          )}
          aria-label="Abrir menú de navegación"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <HeaderBreadcrumb />
      </div>

      {/* Centro: búsqueda */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <HeaderSearch />
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {renderActionButton({
          id: "notifications",
          icon: "🔔",
          label: "Notificaciones",
          badgeCount: notificationsCount,
          onClick: handleNotificationsClick,
          ariaLabel: `Notificaciones (${notificationsCount} nuevas)`,
        })}

        {renderActionButton({
          id: "messages",
          icon: "💬",
          label: "Mensajes",
          badgeCount: messagesCount,
          onClick: handleMessagesClick,
          ariaLabel: `Mensajes (${messagesCount} no leídos)`,
        })}

        {renderActionButton({
          id: "settings",
          icon: "⚙️",
          label: "Configuración",
          badgeCount: 0,
          onClick: handleSettingsClick,
          ariaLabel: "Configuración del sistema",
        })}

        {/* ===== Botón Perfil de Usuario (dinámico) ===== */}
        <button
          onClick={handleUserProfileClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 min-w-0",
            "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
            "dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800",
            activeDropdown === "userProfile" && [
              "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
              "dark:bg-blue-900/20 dark:text-blue-400",
            ]
          )}
          aria-label="Perfil de usuario"
          title="Perfil de usuario"
        >
          {/* Avatar (iniciales) */}
          <div
            className={cn(
              "w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500",
              "flex items-center justify-center text-white font-semibold text-sm",
              "transition-transform duration-200 hover:scale-110"
            )}
          >
            {vm.initials}
          </div>

          {/* Texto (solo desktop) */}
          <div className="hidden lg:block min-w-0">
            <div className="text-sm font-medium truncate">{vm.compactName}</div>
            <div className={cn("text-xs truncate", "text-gray-500 dark:text-gray-400")}>
              {vm.primaryRole}
            </div>
          </div>

          {/* Flecha */}
          <svg
            className={cn(
              "hidden lg:block w-4 h-4 transition-transform duration-200",
              activeDropdown === "userProfile" && "rotate-180"
            )}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdowns */}
      <NotificationsDropdown isOpen={activeDropdown === "notifications"} onClose={closeAllDropdowns} />
      <MessagesDropdown     isOpen={activeDropdown === "messages"}      onClose={closeAllDropdowns} />
      <SettingsDropdown     isOpen={activeDropdown === "settings"}      onClose={closeAllDropdowns} />
      <UserProfileDropdown  isOpen={activeDropdown === "userProfile"}   onClose={closeAllDropdowns} />

      {/* Búsqueda móvil */}
      {activeDropdown === "mobileSearch" && (
        <div className={cn(
          "absolute top-full left-0 right-0 p-4 z-50",
          "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg"
        )}>
          <HeaderSearch mobile />
        </div>
      )}
    </header>
  );
}

export default Header;
