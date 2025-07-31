// ====================================
// HEADER BREADCRUMB COMPONENT
// ====================================

import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

/**
 * Componente de navegación breadcrumb para el header
 * Muestra la ruta actual de navegación
 */
function HeaderBreadcrumb({ className }) {
  const location = useLocation();

  // ====================================
  // CONFIGURACIÓN DE RUTAS
  // ====================================
  
  const routeConfig = {
    '/': { label: 'Dashboard', icon: '🏠' },
    '/dashboard': { label: 'Dashboard', icon: '📊' },
    '/inventory': { label: 'Inventario', icon: '📦' },
    '/inventory/products': { label: 'Productos', icon: '📝' },
    '/inventory/categories': { label: 'Categorías', icon: '📁' },
    '/inventory/stock': { label: 'Control de Stock', icon: '📈' },
    '/inventory/movements': { label: 'Movimientos', icon: '🔄' },
    '/inventory/alerts': { label: 'Alertas de Stock', icon: '⚠️' },
    '/inventory/transfers': { label: 'Transferencias', icon: '🚚' },
    '/sales': { label: 'Ventas', icon: '💰' },
    '/sales/pos': { label: 'Punto de Venta', icon: '💳' },
    '/sales/invoices': { label: 'Facturas', icon: '🧾' },
    '/sales/receipts': { label: 'Boletas', icon: '🎫' },
    '/sales/quotes': { label: 'Cotizaciones', icon: '💱' },
    '/sales/returns': { label: 'Devoluciones', icon: '↩️' },
    '/clients': { label: 'Clientes', icon: '👥' },
    '/clients/management': { label: 'Gestión de Clientes', icon: '👤' },
    '/clients/accounts': { label: 'Cuentas por Cobrar', icon: '💳' },
    '/clients/credit': { label: 'Límites de Crédito', icon: '🏦' },
    '/finance': { label: 'Financiero', icon: '💵' },
    '/finance/cash': { label: 'Control de Caja', icon: '💰' },
    '/finance/reports': { label: 'Reportes Financieros', icon: '📈' },
    '/reports': { label: 'Reportes', icon: '📊' },
    '/reports/sales': { label: 'Reportes de Ventas', icon: '💹' },
    '/reports/inventory': { label: 'Análisis de Inventario', icon: '📋' },
    '/settings': { label: 'Configuración', icon: '⚙️' },
    '/users': { label: 'Usuarios', icon: '👨‍💼' },
    '/help': { label: 'Ayuda', icon: '❓' }
  };

  // ====================================
  // GENERACIÓN DE BREADCRUMBS
  // ====================================
  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs = [];

    // Siempre agregar "Inicio" como primer elemento
    if (location.pathname !== '/') {
      crumbs.push({
        label: 'Inicio',
        icon: '🏠',
        path: '/',
        isLast: false
      });
    }

    // Construir breadcrumbs basado en los segmentos de la ruta
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const config = routeConfig[currentPath];
      const isLast = index === pathSegments.length - 1;

      if (config) {
        crumbs.push({
          label: config.label,
          icon: config.icon,
          path: currentPath,
          isLast
        });
      } else {
        // Si no hay configuración, usar el segmento capitalizado
        const fallbackLabel = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        crumbs.push({
          label: fallbackLabel,
          icon: '📄',
          path: currentPath,
          isLast
        });
      }
    });

    // Si estamos en la raíz, mostrar solo Dashboard
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      return [{
        label: 'Dashboard',
        icon: '📊',
        path: '/',
        isLast: true
      }];
    }

    return crumbs;
  }, [location.pathname]);

  // ====================================
  // HANDLERS
  // ====================================
  
  const handleBreadcrumbClick = (path, event) => {
    // Aquí podrías agregar lógica adicional antes de navegar
    //console.log('📍 Navegando a:', path);
  };

  // ====================================
  // RENDER
  // ====================================

  return (
    <nav 
      className={cn(
        // Layout base
        "flex items-center gap-2",
        "min-w-0 flex-1",
        "text-sm",
        
        // Responsive
        "max-w-md lg:max-w-lg xl:max-w-xl",
        
        className
      )}
      aria-label="Navegación breadcrumb"
    >
      <ol className="flex items-center gap-2 min-w-0">
        {breadcrumbs.map((crumb, index) => (
          <li 
            key={crumb.path} 
            className="flex items-center gap-2 min-w-0"
          >
            {/* Separador (no para el primer elemento) */}
            {index > 0 && (
              <span 
                className={cn(
                  "text-gray-400 select-none flex-shrink-0",
                  "dark:text-gray-500"
                )}
                aria-hidden="true"
              >
                ›
              </span>
            )}

            {/* Breadcrumb Item */}
            {crumb.isLast ? (
              // Elemento actual (no clickeable)
              <span 
                className={cn(
                  "flex items-center gap-1.5",
                  "text-gray-900 font-medium",
                  "truncate",
                  "dark:text-gray-100"
                )}
                aria-current="page"
              >
                <span className="flex-shrink-0 text-base" aria-hidden="true">
                  {crumb.icon}
                </span>
                <span className="truncate">
                  {crumb.label}
                </span>
              </span>
            ) : (
              // Elemento navegable (clickeable)
              <Link
                to={crumb.path}
                onClick={(e) => handleBreadcrumbClick(crumb.path, e)}
                className={cn(
                  // Layout
                  "flex items-center gap-1.5",
                  "px-2 py-1 rounded-md",
                  "min-w-0",
                  
                  // Estilos base
                  "text-gray-600 hover:text-gray-900",
                  "hover:bg-gray-100",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  
                  // Truncate text
                  "truncate",
                  
                  // Modo oscuro
                  "dark:text-gray-400 dark:hover:text-gray-100",
                  "dark:hover:bg-gray-800"
                )}
                title={crumb.label}
              >
                <span className="flex-shrink-0 text-base" aria-hidden="true">
                  {crumb.icon}
                </span>
                <span className="truncate">
                  {crumb.label}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ol>

      {/* Indicador de ruta larga en móvil */}
      {breadcrumbs.length > 3 && (
        <div className={cn(
          "md:hidden flex-shrink-0",
          "text-gray-400 text-xs",
          "dark:text-gray-500"
        )}>
          <span title={`${breadcrumbs.length} niveles de navegación`}>
            +{breadcrumbs.length - 2}
          </span>
        </div>
      )}
    </nav>
  );
}

export default HeaderBreadcrumb;