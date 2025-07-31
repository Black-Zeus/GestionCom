// ====================================
// INFO GROUP WITH ICON COMPONENT
// Componente reutilizable para mostrar información operativa con icono clickeable
// ====================================

import { cn } from '@/utils/cn';

/**
 * Componente para mostrar grupos de información con icono clickeable
 * Usado en el footer para sucursal, caja, usuario y turno
 * 
 * @param {string} label - Etiqueta del campo (ej: "Sucursal:")
 * @param {string} value - Valor principal a mostrar
 * @param {string} role - Rol adicional (ej: "Admin") - opcional
 * @param {string} status - Estado visual: 'normal', 'success', 'warning', 'danger'
 * @param {boolean} withIndicator - Mostrar indicador de estado (punto animado)
 * @param {boolean} compact - Versión compacta para móvil
 * @param {string} title - Tooltip al hacer hover
 * @param {string|React.Node} icon - Icono a mostrar (emoji o componente)
 * @param {Function} onIconClick - Handler cuando se hace click en el icono
 * @param {boolean} iconClickable - Si el icono es clickeable (por defecto true si hay onIconClick)
 * @param {string} iconPosition - Posición del icono: 'left' o 'right'
 * @param {string} className - Clases adicionales
 */
function InfoGroupWithIcon({ 
  label, 
  value, 
  role, 
  status = 'normal', 
  withIndicator = false,
  compact = false,
  title,
  icon,
  onIconClick,
  iconClickable = true,
  iconPosition = 'left',
  className,
  ...props 
}) {
  
  // ====================================
  // CONFIGURACIÓN DE ESTILOS
  // ====================================
  
  const statusColors = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400', 
    danger: 'text-red-600 dark:text-red-400',
    normal: 'text-gray-900 dark:text-gray-100'
  };

  const indicatorColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    normal: 'bg-gray-500'
  };

  // ====================================
  // HANDLERS
  // ====================================

  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onIconClick && iconClickable) {
      onIconClick();
    }
  };

  // ====================================
  // COMPONENTES AUXILIARES
  // ====================================

  // Componente del icono
  const IconComponent = () => {
    if (!icon) return null;

    const iconElement = typeof icon === 'string' ? (
      <span className="text-sm">{icon}</span>
    ) : (
      icon
    );

    if (onIconClick && iconClickable) {
      return (
        <button
          onClick={handleIconClick}
          className={cn(
            // Estilos base del botón
            "flex items-center justify-center",
            "transition-all duration-200 ease-in-out",
            "rounded-sm p-1",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
            
            // Estados de hover y active
            "text-gray-400 hover:text-blue-500",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "active:scale-95",
            
            // Cursor
            "cursor-pointer",
            
            // Responsive
            compact && "p-0.5"
          )}
          title={title ? `${title} - Click para cambiar` : `Cambiar ${label.toLowerCase()}`}
          aria-label={`Cambiar ${label.toLowerCase()}`}
        >
          {iconElement}
        </button>
      );
    }

    return (
      <span 
        className={cn(
          "text-gray-400 flex items-center justify-center",
          compact && "text-xs"
        )}
        title={title}
      >
        {iconElement}
      </span>
    );
  };

  // Componente del indicador de estado
  const StatusIndicator = () => {
    if (!withIndicator) return null;

    return (
      <div className="flex items-center ml-1">
        <div 
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            indicatorColors[status],
            status === 'success' && "animate-pulse",
            compact && "w-1.5 h-1.5"
          )}
          title={`Estado: ${status}`}
        />
      </div>
    );
  };

  // Componente del contenido principal
  const MainContent = () => (
    <>
      <span className={cn(
        "text-gray-500 dark:text-gray-400",
        "text-xs lg:text-sm",
        compact && "text-xs"
      )}>
        {label}
      </span>
      
      <span className={cn(
        "font-semibold transition-colors duration-200",
        "text-xs lg:text-sm",
        statusColors[status],
        compact && "text-xs"
      )}>
        {value}
      </span>
      
      {/* Rol adicional */}
      {role && (
        <span className={cn(
          "text-gray-500 dark:text-gray-400",
          "transition-colors duration-200",
          compact ? "text-xs max-sm:text-[10px]" : "text-xs lg:text-sm"
        )}>
          ({role})
        </span>
      )}
      
      {/* Indicador de estado */}
      <StatusIndicator />
    </>
  );

  // ====================================
  // RENDER PRINCIPAL
  // ====================================

  return (
    <div 
      className={cn(
        // Layout base
        "flex items-center whitespace-nowrap",
        "transition-all duration-200 ease-in-out",
        
        // Espaciado base
        "gap-1",
        
        // Responsive - Modo compacto
        compact && [
          "max-sm:flex-col max-sm:gap-0",
          "max-sm:text-xs max-sm:items-start"
        ],
        
        // Hover effect sutil en todo el grupo
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        "rounded-sm px-1 py-0.5",
        "-mx-1 -my-0.5",
        
        className
      )}
      title={title}
      {...props}
    >
      
      {/* Icono a la izquierda */}
      {iconPosition === 'left' && <IconComponent />}
      
      {/* Contenido principal */}
      <div className={cn(
        "flex items-center",
        "transition-all duration-200",
        compact ? "gap-0.5" : "gap-1",
        compact && "max-sm:flex-col max-sm:items-start max-sm:gap-0"
      )}>
        <MainContent />
      </div>
      
      {/* Icono a la derecha */}
      {iconPosition === 'right' && <IconComponent />}
      
    </div>
  );
}

// ====================================
// VARIANTES PREDEFINIDAS
// ====================================

/**
 * Variante específica para Sucursal
 */
export const BranchInfoGroup = (props) => (
  <InfoGroupWithIcon
    icon="🏢"
    status="normal"
    iconPosition="left"
    {...props}
  />
);

/**
 * Variante específica para Caja
 */
export const CashInfoGroup = (props) => (
  <InfoGroupWithIcon
    icon="💰"
    status="normal"
    iconPosition="left"
    {...props}
  />
);

/**
 * Variante específica para Usuario
 */
export const UserInfoGroup = (props) => (
  <InfoGroupWithIcon
    icon="👤"
    status="normal"
    iconPosition="left"
    compact={true}
    {...props}
  />
);

// ====================================
// EXPORT POR DEFECTO Y VARIANTES
// ====================================

export default InfoGroupWithIcon;