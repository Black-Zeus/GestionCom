import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useSidebar } from '@/store/sidebarStore';
import SidebarSubmenu from './SidebarSubmenu';
import SidebarTooltip from './SidebarTooltip';

function SidebarNavItem({ item, isCollapsed, isDarkMode, className }) {
  const location = useLocation();
  const { activeSection, setActiveSection } = useSidebar();

  const {
    id,
    text,
    icon,
    path,
    badge,
    hasSubmenu,
    submenu,
  } = item;

  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const [activeSubmenuItem, setActiveSubmenuItem] = useState(null);

  // Match por ruta para marcar activo
  const submenuMatch = useMemo(() => {
    if (!hasSubmenu || !submenu) return null;
    return submenu.find(
      (s) => s.path && location.pathname.startsWith(s.path)
    );
  }, [hasSubmenu, submenu, location.pathname]);

  const isItemActive = useMemo(() => {
    if (hasSubmenu) return Boolean(submenuMatch);
    if (path) return location.pathname === path;
    return activeSection === text; // fallback por si hay items sin path
  }, [hasSubmenu, submenuMatch, path, location.pathname, activeSection, text]);

  // Abrir submenú y fijar subitem activo según la URL
  useEffect(() => {
    if (submenuMatch) {
      setIsSubmenuOpen(true);
      setActiveSubmenuItem(submenuMatch.id);
      setActiveSection(submenuMatch.text);
    } else if (!hasSubmenu && isItemActive) {
      setActiveSection(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submenuMatch, isItemActive, hasSubmenu]);

  const handleClickParent = (e) => {
    if (hasSubmenu) {
      e.preventDefault();
      setIsSubmenuOpen((v) => !v);
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

  // Si NO tiene submenú => usar NavLink (marca activo al navegar o recargar)
  if (!hasSubmenu) {
    return (
      <div className="relative">
        <NavLink
          to={path || '#'}
          end
          onClick={() => setActiveSection(text)}
          className={({ isActive }) =>
            cn(
              'flex items-center px-6 py-3 relative cursor-pointer border-l-3 border-transparent mb-0.5',
              'sidebar-nav-item text-white/90 sidebar-smooth-transition',
              'hover:bg-white/10 hover:text-white hover:border-l-primary-color hover:translate-x-0.5',
              (isActive || isItemActive) && [
                'bg-primary-color/20',
                'text-white',
                'border-l-primary-color',
                'font-medium',
                'shadow-sm',
              ],
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

  // Con submenú => botón para expandir/contraer; subitems usan NavLink
  return (
    <div className="relative">
      <a
        href="#"
        onClick={handleClickParent}
        className={cn(
          'flex items-center px-6 py-3 relative cursor-pointer border-l-3 border-transparent mb-0.5',
          'sidebar-nav-item text-white/90 sidebar-smooth-transition',
          'hover:bg-white/10 hover:text-white hover:border-l-primary-color hover:translate-x-0.5',
          isItemActive && [
            'bg-primary-color/20',
            'text-white',
            'border-l-primary-color',
            'font-medium',
            'shadow-sm',
          ],
          isCollapsed && ['justify-center', 'px-4'],
          className
        )}
        data-tooltip={isCollapsed ? text : ''}
      >
        <ItemContent />
      </a>

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
