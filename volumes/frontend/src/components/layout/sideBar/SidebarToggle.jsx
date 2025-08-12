import { cn } from '@/utils/cn';

/**
 * Botón de Toggle Circular del Sidebar
 * Botón flotante que permite colapsar/expandir el sidebar
 */
function SidebarToggle({ isCollapsed, onClick, isDarkMode, className }) {
  
  return (
    <button
      onClick={onClick}
      className={cn(
        // Posición fija para estar sobre todo
        "fixed top-4",
        "z-[99999]", // Z-index súper alto para estar sobre header
        
        // Posición dinámica según estado del sidebar
        isCollapsed ? "left-[62px]" : "left-[242px]",
        
        // Dimensiones y forma
        "w-10 h-10",
        "rounded-full",
        
        // Colores y bordes mejorados
        "bg-white",
        "border-2 border-primary-color",
        
        // Sombra específica del sidebar
        "sidebar-toggle-shadow",
        
        // Flexbox para centrar contenido
        "flex items-center justify-center",
        
        // Cursor y transiciones suaves
        "cursor-pointer",
        "sidebar-smooth-transition",
        
        // Texto
        "text-secondary-color font-bold text-base",
        
        // Estados hover y active mejorados
        "hover:bg-primary-color hover:text-white hover:scale-110",
        "hover:border-primary-color",
        "active:scale-95",

        // Forzar texto color negro en Flecha/Icono
        "!text-black",
        
        className
      )}
      aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
    >
      {/* Flecha mejorada con mejor contraste */}
      <span 
        className={cn(
          "transition-all duration-500 ease-out",
          "block leading-none",
          "transform",
          isCollapsed ? "rotate-0 scale-110" : "rotate-180 scale-100"
        )}
      >
        ➤
      </span>
    </button>
  );
}

export default SidebarToggle;