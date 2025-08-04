import { lazy } from 'react';

// ====================================
// UTILITY FUNCTION PARA LAZY IMPORTS CON RETRY
// ====================================

/**
 * Crea un import lazy con retry automático y mejor error handling
 */
const createLazyImport = (importFn, retries = 3, delay = 1000) => {
  return lazy(() => 
    new Promise((resolve, reject) => {
      const attemptImport = (remainingRetries) => {
        importFn()
          .then(resolve)
          .catch((error) => {
            if (remainingRetries > 0) {
              console.warn(`Import failed, retrying... (${remainingRetries} attempts left)`);
              setTimeout(() => attemptImport(remainingRetries - 1), delay);
            } else {
              console.error('Import failed after all retries:', error);
              reject(error);
            }
          });
      };
      attemptImport(retries);
    })
  );
};

// ====================================
// AUTH PAGES - Carga bajo demanda
// ====================================
export const LoginPage = createLazyImport(
  () => import('@/pages/auth/Login'),
  3, // 3 reintentos
  1000 // 1 segundo entre reintentos
);

export const ForgotPasswordPage = createLazyImport(
  () => import('@/pages/auth/Forgot/ForgotPassword').catch(() => {
    // Fallback temporal si no existe el archivo
    console.warn('ForgotPassword page not found, using fallback');
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Recuperar Contraseña</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/login" className="text-blue-600 hover:underline">Volver al Login</a>
          </div>
        </div>
      )
    };
  })
);

export const ResetPasswordPage = createLazyImport(
  () => import('@/pages/auth/Reset/ResetPassword').catch(() => {
    // Fallback temporal si no existe el archivo
    console.warn('ResetPassword page not found, using fallback');
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Restablecer Contraseña</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/login" className="text-blue-600 hover:underline">Volver al Login</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// DASHBOARD PAGES - Lazy con prioridad
// ====================================
export const DashboardPage = createLazyImport(
  () => import('@/pages/dashboard/Dashboard').catch(() => {
    // Fallback temporal si no existe el archivo
    console.warn('Dashboard page not found, using fallback');
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto p-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Dashboard del Sistema
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Bienvenido al sistema de inventario y punto de venta
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Inventario</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">Gestión de productos y stock</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Ventas</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">Punto de venta y facturación</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Reportes</h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">Analytics y estadísticas</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">
                Esta es una página temporal. El dashboard completo está en desarrollo.
              </p>
            </div>
          </div>
        </div>
      )
    };
  })
);

export const AnalyticsPage = createLazyImport(
  () => import('@/pages/dashboard/Analytics').catch(() => {
    // Fallback temporal
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// INVENTORY PAGES - Lazy pesado
// ====================================
export const InventoryListPage = createLazyImport(
  () => import('@/pages/inventory/InventoryList').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Lista de Inventario</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

export const InventoryDetailPage = createLazyImport(
  () => import('@/pages/inventory/InventoryDetail').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Detalle de Producto</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/inventory" className="text-blue-600 hover:underline">Volver al Inventario</a>
          </div>
        </div>
      )
    };
  })
);

export const InventoryCreatePage = createLazyImport(
  () => import('@/pages/inventory/InventoryCreate').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Crear Producto</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/inventory" className="text-blue-600 hover:underline">Volver al Inventario</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// USER MANAGEMENT - Admin lazy
// ====================================
export const UsersPage = createLazyImport(
  () => import('@/pages/admin/Users').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Gestión de Usuarios</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

export const UserDetailPage = createLazyImport(
  () => import('@/pages/admin/UserDetail').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Detalle de Usuario</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/admin/users" className="text-blue-600 hover:underline">Volver a Usuarios</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// SETTINGS - Lazy con preload condicional
// ====================================
export const SettingsPage = createLazyImport(
  () => import('@/pages/settings/Settings').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Configuración</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

export const ProfilePage = createLazyImport(
  () => import('@/pages/settings/Profile').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Mi Perfil</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// SALES PAGES - Lazy para POS
// ====================================
export const POSPage = createLazyImport(
  () => import('@/pages/pos/PointOfSale').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Punto de Venta</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

export const SalesPage = createLazyImport(
  () => import('@/pages/sales/Sales').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Ventas</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// REPORTS PAGES - Lazy para reportes
// ====================================
export const ReportsPage = createLazyImport(
  () => import('@/pages/reports/Reports').catch(() => {
    return {
      default: () => (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Reportes</h1>
            <p className="text-gray-600 mb-4">Esta página está en desarrollo</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">Volver al Dashboard</a>
          </div>
        </div>
      )
    };
  })
);

// ====================================
// UTILITY FUNCTIONS PARA PRELOAD
// ====================================

/**
 * Precargar componente lazy de forma condicional
 */
export const preloadLazy = (lazyComponent, condition = true) => {
  if (condition && typeof lazyComponent._payload?._result !== 'object') {
    // Solo precarga si no está ya cargado
    import(lazyComponent._payload._result);
  }
};

/**
 * Hook para precargar en hover/focus
 */
export const usePreloadOnHover = (lazyComponent) => {
  const preload = React.useCallback(() => {
    preloadLazy(lazyComponent);
  }, [lazyComponent]);

  return {
    onMouseEnter: preload,
    onFocus: preload
  };
};

// ====================================
// EXPORT DE UTILIDADES
// ====================================
export { createLazyImport };

// ====================================
// EXPORT POR DEFECTO CON TODAS LAS RUTAS
// ====================================
export default {
  // Auth
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  
  // Dashboard
  DashboardPage,
  AnalyticsPage,
  
  // Inventory
  InventoryListPage,
  InventoryDetailPage,
  InventoryCreatePage,
  
  // Admin
  UsersPage,
  UserDetailPage,
  
  // Settings
  SettingsPage,
  ProfilePage,
  
  // Sales/POS
  POSPage,
  SalesPage,
  
  // Reports
  ReportsPage,
  
  // Utilities
  preloadLazy,
  usePreloadOnHover,
  createLazyImport
};