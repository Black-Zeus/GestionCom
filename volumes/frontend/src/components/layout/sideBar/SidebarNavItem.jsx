import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/store/sidebarStore';
import SidebarSubmenu from './SidebarSubmenu';
import SidebarTooltip from './SidebarTooltip';

function SidebarNavItem({ item, isCollapsed, isDarkMode, className }) {
  const location = useLocation();
  const { activeSection, setActiveSection, toggleSubmenu, openSubmenus } = useSidebar();

  const {
    id,
    text,
    icon,
    path,
    badge,
    hasSubmenu,
    submenu,
  } = item;

  // Estado local simple para el submenu
  const isSubmenuOpen = openSubmenus.includes(id);
  const [activeSubmenuItem, setActiveSubmenuItem] = useState(null);

  // Match por ruta para marcar activo
  const submenuMatch = useMemo(() => {
    if (!hasSubmenu || !submenu) return null;
    return submenu.find(subitem => {
      if (!subitem.path) return false;
      // Coincidencia exacta o que la ruta actual inicie con la ruta del subitem
      return location.pathname === subitem.path || 
             location.pathname.startsWith(subitem.path + '/');
    });
  }, [hasSubmenu, submenu, location.pathname]);

  // Mejorar lógica de elemento activo
  const isItemActive = useMemo(() => {
    if (hasSubmenu) {
      // Para items con submenú, está activo si algún subitem coincide
      return Boolean(submenuMatch);
    }
    
    if (path) {
      // Para items sin submenú, coincidencia exacta o de dashboard
      if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
      if (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
      return location.pathname === path || location.pathname.startsWith(path + '/');
    }
    
    // Fallback por texto de sección
    return activeSection === text;
  }, [hasSubmenu, submenuMatch, path, location.pathname, activeSection, text]);

  // Sincronizar estado activo con submenu match - SIN causar bucles
  useEffect(() => {
    if (submenuMatch && submenuMatch.id !== activeSubmenuItem) {
      setActiveSubmenuItem(submenuMatch.id);
      setActiveSection(submenuMatch.text);
    } else if (!hasSubmenu && isItemActive && activeSection !== text) {
      setActiveSection(text);
    }
  }, [submenuMatch?.id, isItemActive, hasSubmenu, text]); // Solo dependencias específicas

  const handleClickParent = (e) => {
    if (hasSubmenu) {
      e.preventDefault();
      toggleSubmenu(id);
      if (!activeSubmenuItem) setActiveSection(text);
    }
  };

  const handleSubmenuItemClick = (subitem) => {
    setActiveSection(subitem.text);
    setActiveSubmenuItem(subitem.id);
  };

  const ItemContent = () => (
    <>
      <span className={cn('w-5 text-center text-lg flex-shrink-0 mr-3 transition-all duration-300')}>
        {icon}
      </span>
      <span
        className={cn(
          'flex-1 transition-all duration-300 ease-bounce',
          'whitespace-nowrap overflow-hidden',
          'text-sm line-height-1.4',
          isCollapsed ? ['opacity-0', 'invisible', 'w-0'] : ['opacity-100', 'visible', 'w-auto']
        )}
      >
        {text}
      </span>
      {badge && !isCollapsed && (
        <span
          className={cn(
            'bg-danger-color text-white',
            'px-2 py-0.5',
            'rounded-full',
            'text-xs font-bold',
            'ml-auto',
            'transition-all duration-300 ease-bounce',
            'min-w-[18px] text-center'
          )}
        >
          {badge}
        </span>
      )}
      {hasSubmenu && !isCollapsed && (
        <span
          className={cn(
            'ml-auto transition-transform duration-300',
            'text-xs text-white/60 flex-shrink-0',
            isSubmenuOpen ? 'rotate-90' : 'rotate-0'
          )}
        >
          ▶
        </span>
      )}
    </>
  );

  // Si NO tiene submenú => usar NavLink (navegación real)
  if (!hasSubmenu) {
    return (
      <div className="relative">
        <NavLink
          to={path || '#'}
          end={path === '/'}
          onClick={() => setActiveSection(text)}
          className={({ isActive }) =>
            cn(
              // Estilos base
              'flex items-center px-6 py-3 relative cursor-pointer mb-0.5',
              'text-white/90 transition-all duration-200',
              
              // Borde izquierdo y efectos hover
              'border-l-4 border-transparent',
              'hover:bg-white/10 hover:text-white hover:border-l-blue-400',
              
              // Estado activo con estilos más visibles
              (isActive || isItemActive) && [
                'bg-blue-500/30 border-l-blue-400',
                'text-white font-semibold',
                'shadow-lg shadow-blue-500/20',
              ],
              
              // Estilos para collapsed
              isCollapsed && ['justify-center', 'px-4'],
              className
            )
          }
          data-tooltip={isCollapsed ? text : ''}
        >
          <ItemContent />
        </NavLink>
        {isCollapsed && <SidebarTooltip text={text} />}
      </div>
    );
  }

  // Con submenú => botón para expandir/contraer
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClickParent}
        className={cn(
          // Estilos base
          'flex items-center px-6 py-3 relative cursor-pointer mb-0.5 w-full text-left',
          'text-white/90 transition-all duration-200',
          
          // Borde izquierdo y efectos hover
          'border-l-4 border-transparent',
          'hover:bg-white/10 hover:text-white hover:border-l-blue-400',
          
          // Estado activo con estilos más visibles
          isItemActive && [
            'bg-blue-500/30 border-l-blue-400',
            'text-white font-semibold',
            'shadow-lg shadow-blue-500/20',
          ],
          
          // Estilos para collapsed
          isCollapsed && ['justify-center', 'px-4'],
          className
        )}
        data-tooltip={isCollapsed ? text : ''}
      >
        <ItemContent />
      </button>

      {isCollapsed && <SidebarTooltip text={text} />}

      {!isCollapsed && hasSubmenu && submenu && (
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