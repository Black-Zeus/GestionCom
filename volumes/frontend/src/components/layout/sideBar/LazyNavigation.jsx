
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePreloadOnHover } from '@/utils/lazyImports';
import { ROUTES } from '@/constants';

// Imports lazy para preload
import {
  DashboardPage,
  InventoryListPage,
  UsersPage,
  SettingsPage
} from '@/router/LazyRoutes';

const navigationItems = [
  {
    name: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'home',
    lazyComponent: DashboardPage
  },
  {
    name: 'Inventario',
    href: '/inventory',
    icon: 'box',
    lazyComponent: InventoryListPage
  },
  {
    name: 'Usuarios',
    href: ROUTES.USERS_MANAGEMENT,
    icon: 'users',
    lazyComponent: UsersPage,
    requireRole: 'admin'
  },
  {
    name: 'Configuración',
    href: ROUTES.SETTINGS,
    icon: 'settings',
    lazyComponent: SettingsPage
  }
];

const LazyNavigation = () => {
  const location = useLocation();

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.href;
        const preloadProps = usePreloadOnHover(item.lazyComponent);

        return (
          <Link
            key={item.name}
            to={item.href}
            {...preloadProps} // Preload en hover
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
          >
            <span className="mr-3">📊</span>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
};

export default LazyNavigation;
