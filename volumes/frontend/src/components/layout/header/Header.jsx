// ====================================
// HEADER COMPONENT - COMPONENTE PRINCIPAL INTEGRADO
// ====================================

import { useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { useHeaderStore, useDropdowns } from '@/store/headerStore';
import { useSidebar } from '@/store/sidebarStore';

// Componentes del Header
import HeaderBreadcrumb from './HeaderBreadcrumb';
import HeaderSearch from './HeaderSearch';
import HeaderActions from './HeaderActions';
import HeaderUserProfile from './HeaderUserProfile';

// Componentes de Dropdowns
import NotificationsDropdown from './dropdowns/NotificationsDropdown';
import MessagesDropdown from './dropdowns/MessagesDropdown';
import SettingsDropdown from './dropdowns/SettingsDropdown';
import UserProfileDropdown from './dropdowns/UserProfileDropdown';

/**
 * Componente principal del Header
 * Maneja la barra superior con navegación, búsqueda, acciones y dropdowns
 */
function Header({ className }) {
  const headerRef = useRef(null);
  
  // Estados del store
  const { 
    activeDropdown,
    closeAllDropdowns,
    isLoading,
    lastUpdate 
  } = useHeaderStore();
  
  const { closeAllDropdowns: closeDropdowns } = useDropdowns();
  const { toggleMobileSidebar } = useSidebar();

  // ====================================
  // EFECTOS Y HANDLERS
  // ====================================

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        closeAllDropdowns();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        closeAllDropdowns();
      }
    };

    const handleResize = () => {
      closeAllDropdowns();
    };

    // Event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      window.removeEventListener('resize', handleResize);
    };
  }, [closeAllDropdowns]);

  // Auto-actualización de datos
  useEffect(() => {
    const interval = setInterval(() => {
      // Aquí podrías actualizar datos en tiempo real
      // Por ejemplo, verificar nuevas notificaciones desde la API
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Handler para el menú móvil
  const handleMobileMenuToggle = () => {
    closeAllDropdowns();
    if (toggleMobileSidebar) {
      toggleMobileSidebar();
    }
  };

  // ====================================
  // RENDER
  // ====================================

  return (
    <header 
      ref={headerRef}
      className={cn(
        // Layout base
        "bg-white border-b border-gray-200",
        "flex items-center justify-between",
        "px-6 lg:px-8",
        "shadow-sm",
        "relative z-50",
        "transition-all duration-300 ease-smooth",
        
        // Altura fija
        "h-16",
        "min-h-16",
        "flex-shrink-0",
        
        // Modo oscuro
        "dark:bg-gray-900 dark:border-gray-700",
        "dark:shadow-lg",
        
        // Estados
        isLoading && "opacity-70 pointer-events-none",
        
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
            // Layout
            "lg:hidden flex items-center justify-center",
            "w-10 h-10 rounded-lg",
            
            // Estilos
            "text-gray-600 hover:text-gray-900",
            "hover:bg-gray-100",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            
            // Modo oscuro
            "dark:text-gray-300 dark:hover:text-white",
            "dark:hover:bg-gray-800"
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
      {/* SECCIÓN DERECHA */}
      {/* ================================ */}
      <div className="flex items-center gap-4 flex-shrink-0">
        
        {/* Barra de Búsqueda */}
        <HeaderSearch className="hidden md:block" />

        {/* Acciones del Header */}
        <HeaderActions />

        {/* Perfil de Usuario */}
        <HeaderUserProfile />
      </div>

      {/* ================================ */}
      {/* DROPDOWNS CONTEXTUALES */}
      {/* ================================ */}
      
      {/* Overlay para cerrar dropdowns */}
      {activeDropdown && (
        <div 
          className={cn(
            "fixed inset-0 z-40",
            "bg-black/10 backdrop-blur-sm",
            "lg:bg-transparent lg:backdrop-blur-none"
          )}
          onClick={closeAllDropdowns}
          aria-hidden="true"
        />
      )}

      {/* Dropdown de Notificaciones */}
      <NotificationsDropdown 
        isOpen={activeDropdown === 'notifications'}
        onClose={closeDropdowns}
      />

      {/* Dropdown de Mensajes */}
      <MessagesDropdown 
        isOpen={activeDropdown === 'messages'}
        onClose={closeDropdowns}
      />

      {/* Dropdown de Configuración */}
      <SettingsDropdown 
        isOpen={activeDropdown === 'settings'}
        onClose={closeDropdowns}
      />

      {/* Dropdown de Perfil de Usuario */}
      <UserProfileDropdown 
        isOpen={activeDropdown === 'userProfile'}
        onClose={closeDropdowns}
      />

      {/* ================================ */}
      {/* INDICADOR DE CARGA */}
      {/* ================================ */}
      {isLoading && (
        <div className={cn(
          "absolute top-0 left-0 right-0",
          "h-1 bg-gradient-to-r from-blue-500 to-purple-500",
          "animate-pulse"
        )}>
          <div className={cn(
            "h-full bg-gradient-to-r from-transparent via-white to-transparent",
            "animate-shimmer"
          )} />
        </div>
        
      )}    
    </header>
  );
}

export default Header;