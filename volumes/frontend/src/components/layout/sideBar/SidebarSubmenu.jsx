import { cn } from '@/utils/cn';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * Componente de Submenú Expandible
 * Navega con React Router cuando existe `path`; si no, sólo invoca el callback.
 */
function SidebarSubmenu({
  items,
  isOpen,
  isDarkMode,
  activeSubmenuItem,
  onSubmenuItemClick,
  className,
}) {
  const location = useLocation();

  const baseItemCls = cn(
    'flex items-center',
    'pl-8 pr-6 py-3',
    'relative cursor-pointer',
    'text-sm text-white/80',
    'transition-all duration-300 ease-out',
    'hover:bg-white/8 hover:text-white',
    'hover:translate-x-2 hover:pl-10',
    'border-l-2 border-transparent hover:border-l-white/30'
  );

  const activeCls = cn(
    'bg-white/10',
    'text-white',
    'border-l-white/50',
    'font-medium',
    'pl-10'
  );

  // Helper para verificar si un subitem está activo
  const isSubitemActive = (subitem) => {
    if (!subitem.path) return activeSubmenuItem === subitem.id;
    
    // Verificar coincidencia de ruta
    if (location.pathname === subitem.path) return true;
    if (subitem.path === '/' && location.pathname === '/dashboard') return true;
    if (subitem.path === '/dashboard' && location.pathname === '/') return true;
    return location.pathname.startsWith(subitem.path + '/');
  };

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-400 ease-out',
        isOpen ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2',
        'bg-black/15',
        'border-l-2 border-primary-color/60',
        'ml-6',
        className
      )}
    >
      <div className={cn('py-1', 'transition-all duration-300 ease-out', isOpen ? 'delay-100' : '')}>
        {items?.map((subitem) => {
          if (!subitem) return null;

          const isActive = isSubitemActive(subitem);

          const content = (
            <>
              {/* Icono */}
              <span className="w-5 text-center text-base flex-shrink-0 mr-3">
                {subitem.icon || '•'}
              </span>
              {/* Texto */}
              <span className="flex-1 whitespace-nowrap overflow-hidden">
                {subitem.text}
              </span>
            </>
          );

          // Caso 1: hay path -> usar NavLink (navegación real)
          if (subitem.path) {
            return (
              <NavLink
                key={subitem.id}
                to={subitem.path}
                end={subitem.path === '/'}
                onClick={() => onSubmenuItemClick?.(subitem)}
                className={({ isActive: navIsActive }) =>
                  cn(baseItemCls, (isActive || navIsActive) && activeCls)
                }
              >
                {content}
              </NavLink>
            );
          }

          // Caso 2: sin path -> botón (solo callback)
          return (
            <button
              key={subitem.id}
              type="button"
              onClick={() => onSubmenuItemClick?.(subitem)}
              className={cn(baseItemCls, isActive && activeCls, 'w-full text-left')}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SidebarSubmenu;