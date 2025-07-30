import { cn } from '@/utils/cn';

/**
 * Componente de Submenú Expandible
 * Maneja los submenús que se despliegan desde items principales con selección mejorada
 */
function SidebarSubmenu({ items, isOpen, isDarkMode, activeSubmenuItem, onSubmenuItemClick, className }) {

  const handleSubmenuClick = (item) => {
    onSubmenuItemClick(item);
  };

  return (
    <div className={cn(
      // Transición de altura suave y elegante
      "overflow-hidden transition-all duration-400 ease-out",
      
      // Altura según estado con transform para suavidad
      isOpen ? "max-h-96 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2",
      
      // Fondo y borde mejorados
      "bg-black/15",
      "border-l-2 border-primary-color/60",
      "ml-6",
      
      className
    )}>
      
      <div className={cn(
        "py-1",
        // Agregar una transición adicional para el contenido
        "transition-all duration-300 ease-out",
        isOpen ? "delay-100" : ""
      )}>
        {items.map((subitem) => (
          <a
            key={subitem.id}
            href={subitem.path || "#"}
            onClick={(e) => {
              e.preventDefault();
              handleSubmenuClick(subitem);
            }}
            className={cn(
              // Layout
              "flex items-center",
              "pl-8 pr-6 py-3",
              "relative cursor-pointer",
              
              // Tipografía
              "text-sm text-white/80",
              
              // Transiciones suaves para submenús
              "transition-all duration-300 ease-out",
              
              // Estados hover mejorados
              "hover:bg-white/8 hover:text-white",
              "hover:translate-x-2 hover:pl-10",
              
              // Borde izquierdo en hover más visible
              "border-l-2 border-transparent hover:border-l-white/30",
              
              // Estado activo para subitem
              activeSubmenuItem === subitem.id && [
                "bg-white/10",
                "text-white",
                "border-l-white/50",
                "font-medium",
                "pl-10"
              ]
            )}
          >
            {/* Icono del subitem */}
            <span className="w-5 text-center text-base flex-shrink-0 mr-3">
              {subitem.icon}
            </span>

            {/* Texto del subitem */}
            <span className="flex-1 whitespace-nowrap overflow-hidden">
              {subitem.text}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default SidebarSubmenu;