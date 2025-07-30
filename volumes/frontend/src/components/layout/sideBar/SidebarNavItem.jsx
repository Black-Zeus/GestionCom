import { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/store/sidebarStore';
import SidebarSubmenu from './SidebarSubmenu';
import SidebarTooltip from './SidebarTooltip';

/**
 * Componente de Item Individual de Navegación
 * Maneja items simples y items con submenú con estados activos mejorados
 */
function SidebarNavItem({ item, isCollapsed, isDarkMode, className }) {
  const { activeSection, setActiveSection } = useSidebar();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [activeSubmenuItem, setActiveSubmenuItem] = useState(null);
  
  const { 
    id, 
    text, 
    icon, 
    path, 
    badge, 
    hasSubmenu, 
    submenu, 
    active 
  } = item;

  // Verificar si este item o algún subitem está activo
  const isItemActive = activeSection === text || 
    (hasSubmenu && submenu?.some(subitem => activeSection === subitem.text));

  // Auto-abrir submenu si algún subitem está activo
  useEffect(() => {
    if (hasSubmenu && submenu) {
      const activeSubitem = submenu.find(subitem => activeSection === subitem.text);
      if (activeSubitem) {
        setIsSubmenuOpen(true);
        setActiveSubmenuItem(activeSubitem.id);
      }
    }
  }, [activeSection, hasSubmenu, submenu]);

  const handleClick = (e) => {
    if (hasSubmenu) {
      e.preventDefault();
      setIsSubmenuOpen(!isSubmenuOpen);
      // Si no hay subitem activo, marcar el item principal como activo
      if (!activeSubmenuItem) {
        setActiveSection(text);
      }
    } else {
      // Navegar y actualizar sección activa
      setActiveSection(text);
      console.log(`Navegando a: ${path || text}`);
    }
  };

  const handleSubmenuItemClick = (subitem) => {
    setActiveSection(subitem.text);
    setActiveSubmenuItem(subitem.id);
    console.log(`Navegando a subitem: ${subitem.path || subitem.text}`);
  };

  const ItemContent = () => (
    <>
      {/* Icono */}
      <span className={cn(
        "w-5 text-center text-lg flex-shrink-0",
        "mr-3",
        "transition-all duration-300"
      )}>
        {icon}
      </span>

      {/* Texto */}
      <span className={cn(
        "flex-1 transition-all duration-300 ease-bounce",
        "whitespace-nowrap overflow-hidden",
        "text-sm line-height-1.4",
        
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
        {text}
      </span>

      {/* Badge */}
      {badge && !isCollapsed && (
        <span className={cn(
          "bg-danger-color text-white",
          "px-2 py-0.5",
          "rounded-full",
          "text-xs font-bold",
          "ml-auto",
          "transition-all duration-300 ease-bounce",
          "min-w-[18px] text-center"
        )}>
          {badge}
        </span>
      )}

      {/* Flecha de Submenú */}
      {hasSubmenu && !isCollapsed && (
        <span className={cn(
          "ml-auto transition-transform duration-300",
          "text-xs text-white/60 flex-shrink-0",
          isSubmenuOpen ? "rotate-90" : "rotate-0"
        )}>
          ▶
        </span>
      )}
    </>
  );

  return (
    <div className="relative">
      {/* Item Principal */}
      <a
        href={path || "#"}
        onClick={handleClick}
        className={cn(
          // Layout
          "flex items-center",
          "px-6 py-3",
          "relative cursor-pointer",
          "border-l-3 border-transparent",
          "mb-0.5",
          
          // Clase específica del sidebar para efectos CSS
          "sidebar-nav-item",
          isItemActive && "active",
          
          // Colores base
          "text-white/90",
          
          // Transiciones suaves con clase específica
          "sidebar-smooth-transition",
          
          // Estados hover
          "hover:bg-white/10 hover:text-white",
          "hover:border-l-primary-color hover:translate-x-0.5",
          
          // Estado activo mejorado - tanto para item principal como subitems
          isItemActive && [
            "bg-primary-color/20",
            "text-white",
            "border-l-primary-color",
            "font-medium",
            "shadow-sm"
          ],
          
          // Justificación cuando está colapsado
          isCollapsed && [
            "justify-center",
            "px-4"
          ],
          
          className
        )}
        data-tooltip={isCollapsed ? text : ""}
      >
        <ItemContent />
      </a>

      {/* Tooltip para modo colapsado */}
      {isCollapsed && (
        <SidebarTooltip text={text} />
      )}

      {/* Submenú */}
      {hasSubmenu && submenu && !isCollapsed && (
        <SidebarSubmenu
          items={submenu}
          isOpen={isSubmenuOpen}
          isDarkMode={isDarkMode}
          activeSubmenuItem={activeSubmenuItem}
          onSubmenuItemClick={handleSubmenuItemClick}
        />
      )}
    </div>
  );
}

export default SidebarNavItem;