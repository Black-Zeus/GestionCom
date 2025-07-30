import { useState } from 'react';
import { cn } from '@/utils/cn';
import { sidebarUserProfileData } from '@/data/sidebarData';

/**
 * Componente de Perfil de Usuario en Sidebar
 * Incluye dropdown con acciones del usuario
 */
function SidebarUserProfile({ isCollapsed, isDarkMode, sessionInfo, className }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, actions } = sidebarUserProfileData.data;

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleAction = (action) => {
    setIsDropdownOpen(false);
    
    switch (action.action) {
      case 'profile':
        console.log('👤 Abrir perfil de usuario');
        break;
      case 'settings':
        console.log('⚙️ Abrir configuraciones');
        break;
      case 'preferences':
        console.log('🎛️ Abrir preferencias');
        break;
      case 'help':
        console.log('❓ Abrir ayuda');
        break;
      case 'logout':
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
          console.log('🚪 Cerrando sesión...');
        }
        break;
      default:
        console.log('Acción no reconocida:', action.action);
    }
  };

  return (
    <div className={cn(
      "mb-4 px-4",
      "relative",
      className
    )}>
      
      {/* Perfil clickeable */}
      <div
        onClick={toggleDropdown}
        className={cn(
          // Layout
          "flex items-center gap-3",
          "cursor-pointer",
          "p-3 rounded-lg",
          "relative min-h-16",
          
          // Transiciones
          "transition-all duration-300",
          
          // Estados hover
          "hover:bg-white/10 hover:-translate-y-0.5"
        )}
      >
        
        {/* Avatar */}
        <div className={cn(
          // Dimensiones
          "w-10 h-10",
          
          // Colores y forma
          "bg-gradient-to-br from-primary-color to-success-color",
          "rounded-full",
          "border-2 border-white/20",
          
          // Flexbox para centrar
          "flex items-center justify-center",
          
          // Texto
          "text-white font-bold text-lg",
          
          // Flex shrink
          "flex-shrink-0",
          
          // Transición
          "transition-all duration-300"
        )}>
          {user.avatar}
        </div>

        {/* Detalles del Usuario */}
        <div className={cn(
          "flex-1 min-w-0",
          "transition-all duration-300 ease-bounce",
          
          // Estados según collapse
          isCollapsed ? [
            "opacity-0",
            "invisible",
            "w-0"
          ] : [
            "opacity-100",
            "visible",
            "w-auto"
          ]
        )}>
          
          {/* Nombre del Usuario */}
          <div className={cn(
            "text-white font-semibold text-sm",
            "whitespace-nowrap overflow-hidden text-ellipsis",
            "max-w-30",
            "line-height-1.2 mb-0.5"
          )}>
            {user.full_name}
          </div>
          
          {/* Rol del Usuario */}
          <div className={cn(
            "text-white/70 text-xs",
            "whitespace-nowrap overflow-hidden text-ellipsis",
            "max-w-30",
            "line-height-1.2"
          )}>
            {user.role}
          </div>
        </div>

        {/* Flecha del Dropdown */}
        <span className={cn(
          "text-xs transition-transform duration-300",
          "text-white/60 margin-left-auto flex-shrink-0",
          
          // Estados según collapse
          isCollapsed ? [
            "opacity-0",
            "invisible"
          ] : [
            "opacity-100",
            "visible"
          ],
          
          // Rotación según estado
          isDropdownOpen ? "rotate-180" : "rotate-0"
        )}>
          ▼
        </span>
      </div>

      {/* Dropdown del Perfil */}
      {isDropdownOpen && !isCollapsed && (
        <div className={cn(
          // Posición
          "absolute bottom-full left-3 right-3",
          "mb-2 z-dropdown",
          
          // Apariencia
          "bg-white rounded-lg",
          "border border-gray-200",
          "shadow-xl",
          
          // Animación
          "animate-scale-in",
          
          // Overflow
          "overflow-hidden"
        )}>
          
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={cn(
                // Layout
                "w-full flex items-center",
                "px-4 py-3",
                "text-left",
                
                // Tipografía
                "text-sm",
                action.danger ? "text-danger-color" : "text-gray-700",
                
                // Transiciones
                "transition-all duration-200",
                
                // Estados hover
                "hover:bg-gray-50",
                action.danger && "hover:bg-red-50",
                
                // Bordes
                "border-b border-gray-100 last:border-b-0"
              )}
            >
              {/* Icono de la acción */}
              <span className="w-5 mr-3 text-center text-base">
                {action.icon}
              </span>

              {/* Texto de la acción */}
              <span className="flex-1">
                {action.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SidebarUserProfile;