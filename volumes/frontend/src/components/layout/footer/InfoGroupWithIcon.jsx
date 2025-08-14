// ====================================
// INFO GROUP WITH ICON COMPONENT - VERSIÓN COMPLETAMENTE CLICKEABLE
// Componente reutilizable para mostrar información operativa
// ✅ MODIFICADO: Todo el contenido es clickeable, no solo el icono
// ====================================

import { cn } from "@/utils/cn";

/**
 * Componente para mostrar grupos de información completamente clickeables
 * ✅ NUEVO: Soporte para onClick en todo el componente + onIconClick específico
 *
 * @param {string} label - Etiqueta del campo (ej: "Sucursal:")
 * @param {string} value - Valor principal a mostrar
 * @param {string} role - Rol adicional (ej: "Admin") - opcional
 * @param {string} status - Estado visual: 'normal', 'success', 'warning', 'danger'
 * @param {boolean} withIndicator - Mostrar indicador de estado (punto animado)
 * @param {boolean} compact - Versión compacta para móvil
 * @param {string} title - Tooltip al hacer hover
 * @param {string|React.Node} icon - Icono a mostrar (emoji o componente)
 * @param {Function} onClick - Handler cuando se hace click en TODO el componente ✅ NUEVO
 * @param {Function} onIconClick - Handler cuando se hace click SOLO en el icono
 * @param {boolean} clickable - Si todo el componente es clickeable ✅ NUEVO
 * @param {boolean} iconClickable - Si el icono es clickeable por separado
 * @param {string} iconPosition - Posición del icono: 'left' o 'right'
 * @param {string} className - Clases adicionales
 */
function InfoGroupWithIcon({
  label,
  value,
  role,
  status = "normal",
  withIndicator = false,
  compact = false,
  title,
  icon,
  onClick, // ✅ NUEVO: Click en todo el componente
  onIconClick,
  clickable = !!onClick, // ✅ NUEVO: Auto-detecta si es clickeable
  iconClickable = !!onIconClick,
  iconPosition = "left",
  className,
  ...props
}) {
  // ====================================
  // CONFIGURACIÓN DE ESTILOS
  // ====================================

  const statusColors = {
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
    normal: "text-gray-700 dark:text-gray-300",
  };

  const indicatorColors = {
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
    normal: "bg-gray-500",
  };

  // ====================================
  // HANDLERS
  // ====================================

  // ✅ NUEVO: Handler para click en todo el componente
  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  // Handler para click específico del icono
  const handleIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ IMPORTANTE: Evita que se dispare el onClick general

    if (onIconClick && iconClickable) {
      onIconClick(e);
    }
  };

  // ====================================
  // COMPONENTES AUXILIARES
  // ====================================

  // Componente del icono
  const IconComponent = () => {
    if (!icon) return null;

    const iconElement =
      typeof icon === "string" ? <span className="text-sm">{icon}</span> : icon;

    // ✅ MODIFICADO: Icono clickeable independiente si se especifica
    if (onIconClick && iconClickable) {
      return (
        <button
          onClick={handleIconClick}
          className={cn(
            "flex items-center justify-center",
            "transition-all duration-200",
            "rounded-sm p-1",
            "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "active:scale-95",
            "cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500",
            compact && "p-0.5"
          )}
          title={`${title} - Click para cambiar`}
          aria-label={`Cambiar ${label.toLowerCase()}`}
        >
          {iconElement}
        </button>
      );
    }

    // Icono no clickeable
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
            "w-2 h-2 rounded-full transition-all duration-200",
            indicatorColors[status],
            status === "success" && "animate-pulse",
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
      <span
        className={cn(
          "text-gray-500 dark:text-gray-400",
          "text-xs lg:text-sm",
          compact && "text-xs"
        )}
      >
        {label}
      </span>

      <span
        className={cn(
          "font-semibold transition-all duration-200",
          "text-xs lg:text-sm",
          statusColors[status],
          compact && "text-xs"
        )}
      >
        {value}
      </span>

      {/* Rol adicional */}
      {role && (
        <span
          className={cn(
            "text-gray-500 dark:text-gray-400 transition-all duration-200",
            compact ? "text-xs max-sm:text-[10px]" : "text-xs lg:text-sm"
          )}
        >
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

  // ✅ MODIFICADO: El componente base puede ser clickeable
  const Component = clickable ? "button" : "div";

  return (
    <Component
      onClick={clickable ? handleClick : undefined}
      className={cn(
        // Layout base
        "flex items-center whitespace-nowrap",
        "transition-all duration-200",
        "gap-1",

        // ✅ NUEVO: Estilos para componente clickeable
        clickable && [
          "cursor-pointer",
          "rounded-md px-2 py-1",
          "hover:bg-gray-100 dark:hover:bg-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "focus:ring-blue-500 dark:focus:ring-offset-gray-900",
          "active:scale-[0.98]",
        ],

        // Responsive - Modo compacto
        compact && [
          "max-sm:flex-col max-sm:gap-0",
          "max-sm:text-xs max-sm:items-start",
        ],

        className
      )}
      title={title}
      disabled={clickable && props.disabled}
      {...(clickable ? {} : props)} // Solo pasar props extra si no es button
    >
      {/* Icono a la izquierda */}
      {iconPosition === "left" && <IconComponent />}

      {/* Contenido principal */}
      <div
        className={cn(
          "flex items-center",
          "transition-all duration-200",
          compact ? "gap-0.5" : "gap-1",
          compact && "max-sm:flex-col max-sm:items-start max-sm:gap-0"
        )}
      >
        <MainContent />
      </div>

      {/* Icono a la derecha */}
      {iconPosition === "right" && <IconComponent />}
    </Component>
  );
}

// ====================================
// VARIANTES PREDEFINIDAS - ACTUALIZADAS PARA SER COMPLETAMENTE CLICKEABLES
// ====================================

/**
 * Variante específica para Sucursal
 * ✅ MODIFICADO: Completamente clickeable
 */
export const BranchInfoGroup = ({ branch, branchCode, onClick, ...props }) => (
  <InfoGroupWithIcon
    label="Sucursal:"
    value={branch}
    role={branchCode}
    icon="🏢"
    status="normal"
    iconPosition="left"
    title={`Sucursal: ${branch} (${branchCode})`}
    onClick={onClick} // ✅ NUEVO: Todo clickeable
    clickable={!!onClick} // ✅ NUEVO: Auto-detecta
    {...props}
  />
);

/**
 * Variante específica para Caja
 * ✅ MODIFICADO: Completamente clickeable
 */
export const CashInfoGroup = ({ cashRegister, onClick, ...props }) => (
  <InfoGroupWithIcon
    label="Caja:"
    value={cashRegister}
    icon="💰"
    status="normal"
    iconPosition="left"
    title={`Caja Registradora: ${cashRegister}`}
    onClick={onClick} // ✅ NUEVO: Todo clickeable
    clickable={!!onClick} // ✅ NUEVO: Auto-detecta
    {...props}
  />
);

/**
 * Variante específica para Usuario
 * ✅ MODIFICADO: Puede ser clickeable o no
 */
export const UserInfoGroup = ({
  user,
  userFullName,
  userRole,
  onClick,
  ...props
}) => (
  <InfoGroupWithIcon
    label="Usuario:"
    value={userFullName || user}
    role={userRole}
    icon="👤"
    status="normal"
    iconPosition="left"
    compact={true}
    title={`Usuario: ${userFullName || user} (${userRole})`}
    onClick={onClick} // ✅ NUEVO: Opcional
    clickable={!!onClick} // ✅ NUEVO: Solo si se pasa onClick
    {...props}
  />
);

/**
 * Variante específica para Turno
 * ✅ MODIFICADO: Puede ser clickeable
 */
export const ShiftInfoGroup = ({ shift, shiftStatus, onClick, ...props }) => (
  <InfoGroupWithIcon
    label="Turno:"
    value={shift}
    icon="🕐"
    status={shiftStatus || "normal"}
    iconPosition="left"
    title={`Turno: ${shift}`}
    onClick={onClick} // ✅ NUEVO: Opcional
    clickable={!!onClick} // ✅ NUEVO: Solo si se pasa onClick
    withIndicator={true} // Mostrar indicador de estado para turnos
    {...props}
  />
);

export default InfoGroupWithIcon;
