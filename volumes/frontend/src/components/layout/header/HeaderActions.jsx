// ====================================
// HEADER ACTIONS COMPONENT
// ====================================

import { cn } from '@/utils/cn';
import { useDropdowns, useNotifications, useMessages } from '@/store/headerStore';

/**
 * Componente de acciones del header
 * Contiene los botones de notificaciones, mensajes y configuración
 */
function HeaderActions({ className }) {
  const { openDropdown, isOpen } = useDropdowns();
  const { unreadCount: notificationsCount } = useNotifications();
  const { unreadCount: messagesCount } = useMessages();

  // ====================================
  // HANDLERS
  // ====================================

  const handleNotificationsClick = () => {
    openDropdown('notifications');
  };

  const handleMessagesClick = () => {
    openDropdown('messages');
  };

  const handleSettingsClick = () => {
    openDropdown('settings');
  };

  // ====================================
  // RENDER HELPERS
  // ====================================

  const renderActionButton = ({ 
    id, 
    icon, 
    label, 
    badgeCount = 0, 
    badgeType = 'danger',
    onClick,
    ariaLabel 
  }) => {
    const isActive = isOpen(id);

    return (
      <button
        onClick={onClick}
        className={cn(
          // Layout base
          "relative flex items-center justify-center",
          "w-10 h-10 rounded-full",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          
          // Estados base
          "text-gray-600 hover:text-gray-900",
          "hover:bg-gray-100",
          
          // Estado activo
          isActive && [
            "bg-blue-50 text-blue-600 ring-2 ring-blue-500",
            "dark:bg-blue-900/20 dark:text-blue-400"
          ],
          
          // Modo oscuro
          "dark:text-gray-300 dark:hover:text-white",
          "dark:hover:bg-gray-800",
          
          // Animaciones
          "transform hover:scale-105 active:scale-95"
        )}
        aria-label={ariaLabel}
        title={label}
      >
        {/* Icono */}
        <span className="text-lg">
          {icon}
        </span>

        {/* Badge de notificación */}
        {badgeCount > 0 && (
          <span 
            className={cn(
              // Posición
              "absolute -top-1 -right-1",
              "min-w-5 h-5 rounded-full",
              "flex items-center justify-center",
              
              // Estilos base
              "text-xs font-bold text-white",
              "shadow-sm",
              
              // Colores por tipo
              badgeType === 'danger' && "bg-red-500",
              badgeType === 'success' && "bg-green-500", 
              badgeType === 'warning' && "bg-yellow-500",
              badgeType === 'info' && "bg-blue-500",
              
              // Animación
              "animate-pulse",
              
              // Responsive del texto
              badgeCount > 99 ? "px-1" : "px-0"
            )}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}

        {/* Indicador de pulso para nuevas notificaciones */}
        {badgeCount > 0 && (
          <span 
            className={cn(
              "absolute -top-1 -right-1",
              "w-5 h-5 rounded-full",
              "border-2 border-white dark:border-gray-900",
              
              // Colores de pulso
              badgeType === 'danger' && "bg-red-500",
              badgeType === 'success' && "bg-green-500",
              badgeType === 'warning' && "bg-yellow-500", 
              badgeType === 'info' && "bg-blue-500",
              
              // Animación de pulso
              "animate-ping opacity-75"
            )}
          />
        )}
      </button>
    );
  };

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <div 
      className={cn(
        "flex items-center gap-2",
        className
      )}
    >
      {/* Botón de Notificaciones */}
      {renderActionButton({
        id: 'notifications',
        icon: '🔔',
        label: 'Notificaciones',
        badgeCount: notificationsCount,
        badgeType: 'danger',
        onClick: handleNotificationsClick,
        ariaLabel: `Notificaciones${notificationsCount > 0 ? ` (${notificationsCount} nuevas)` : ''}`
      })}

      {/* Botón de Mensajes */}
      {renderActionButton({
        id: 'messages', 
        icon: '✉️',
        label: 'Mensajes',
        badgeCount: messagesCount,
        badgeType: 'success',
        onClick: handleMessagesClick,
        ariaLabel: `Mensajes${messagesCount > 0 ? ` (${messagesCount} nuevos)` : ''}`
      })}

      {/* Botón de Configuración */}
      {renderActionButton({
        id: 'settings',
        icon: '⚙️', 
        label: 'Configuración Rápida',
        onClick: handleSettingsClick,
        ariaLabel: 'Configuración rápida del sistema'
      })}

      {/* Separador visual */}
      <div className={cn(
        "w-px h-6 bg-gray-300 mx-2",
        "dark:bg-gray-600"
      )} />
    </div>
  );
}

export default HeaderActions;