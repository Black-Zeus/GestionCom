import { cn } from '@/utils/cn';
import SidebarNavItem from './SidebarNavItem';

/**
 * Componente de Sección de Navegación del Sidebar
 * Renderiza una sección (ej: "Principal", "Inventario") con sus items
 */
function SidebarNavSection({ section, isCollapsed, isDarkMode, className }) {
  const { id, title, items } = section;

  return (
    <div className={cn(
      // Espaciado entre secciones
      "mb-8 last:mb-6",
      
      className
    )}>
      
      {/* Título de la Sección */}
      <div className={cn(
        // Padding horizontal
        "px-6 pb-2 mb-2",
        
        // Tipografía
        "text-xs font-semibold",
        "text-white/60",
        "uppercase tracking-wide",
        
        // Transiciones para collapse
        "transition-all duration-300 ease-bounce",
        "whitespace-nowrap",
        
        // Estados según collapse
        isCollapsed ? [
          "opacity-0",
          "invisible",
          "h-0",
          "p-0",
          "m-0"
        ] : [
          "opacity-100",
          "visible",
          "h-auto"
        ]
      )}>
        {title}
      </div>

      {/* Items de la Sección */}
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            item={item}
            isCollapsed={isCollapsed}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
    </div>
  );
}

export default SidebarNavSection;