// ./src/routes/treeRoutes.jsx

import { Suspense } from 'react';
import { createLazyImport } from '@/utils/lazyImports';

// ====================
// LAZY IMPORTS SEGÚN ESTRUCTURA REAL
// ====================

const App = createLazyImport(() => import('../App'));
const Layout = createLazyImport(() => import('@/components/layout'));

// AUTH
const LoginPage = createLazyImport(() => import('@/pages/auth/Login/index'));
const UnauthorizedPage = createLazyImport(() => import('@/pages/auth/Login/Unauthorized'));
const ForgotPasswordPage = createLazyImport(() => import('@/pages/auth/Forgot/ForgotPassword'));
const ResetPasswordPage = createLazyImport(() => import('@/pages/auth/Reset/ResetPassword'));

// DASHBOARD
const DashboardPage = createLazyImport(() => import('@/pages/dashboard/Dashboard'));
const AnalyticsPage = createLazyImport(() => import('@/pages/dashboard/Analytics'));

// INVENTORY
const InventoryListPage = createLazyImport(() => import('@/pages/inventory/InventoryList'));
const InventoryDetailPage = createLazyImport(() => import('@/pages/inventory/InventoryDetail'));
const InventoryCreatePage = createLazyImport(() => import('@/pages/inventory/InventoryCreate'));

// ADMIN/USERS
const UsersPage = createLazyImport(() => import('@/pages/admin/Users'));
const UserDetailPage = createLazyImport(() => import('@/pages/admin/UserDetail'));

// SETTINGS
const SettingsPage = createLazyImport(() => import('@/pages/settings/Settings'));
const ProfilePage = createLazyImport(() => import('@/pages/settings/Profile'));

// OTRAS
const SalesPage = createLazyImport(() => import('@/pages/sales/Sales'));
const POSPage = createLazyImport(() => import('@/pages/pos/PointOfSale'));
const ReportsPage = createLazyImport(() => import('@/pages/reports/Reports'));
const ModalDemo = createLazyImport(() => import('@/demos/ModalDemo'));

// 404
const NotFoundPage = createLazyImport(() => import('@/pages/NotFoundPage'));

// ====================
// FALLBACKS
// ====================

const AppLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Cargando Sistema
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Iniciando aplicación...
      </p>
    </div>
  </div>
);

const LayoutLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-gray-600 dark:text-gray-400">Cargando interfaz...</p>
    </div>
  </div>
);

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
    </div>
  </div>
);

// ====================
// SUSPENSE WRAPPER
// ====================
const withSuspense = (LazyComponent, fallback = <PageLoadingFallback />) => (
  <Suspense fallback={fallback}>
    <LazyComponent />
  </Suspense>
);

// ====================
// RUTAS
// ====================
export function getAppRoutes() {
  return [
    {
      path: '/',
      element: withSuspense(App, <AppLoadingFallback />),
      children: [
        // RUTAS DE AUTENTICACIÓN (sin Layout)
        { path: 'login', element: withSuspense(LoginPage) },
        { path: 'unauthorized', element: withSuspense(UnauthorizedPage) },
        { path: 'forgot', element: withSuspense(ForgotPasswordPage) },
        { path: 'reset', element: withSuspense(ResetPasswordPage) },
        
        // RUTAS PRINCIPALES (con Layout)
        {
          path: '',
          element: withSuspense(Layout, <LayoutLoadingFallback />),
          children: [
            // DASHBOARD
            { path: '', element: withSuspense(DashboardPage) },
            { path: 'analytics', element: withSuspense(AnalyticsPage) },
            // DEMOS
            { path: 'modals', element: withSuspense(ModalDemo) },
            // INVENTORY
            { path: 'inventory', element: withSuspense(InventoryListPage) },
            { path: 'inventory/create', element: withSuspense(InventoryCreatePage) },
            { path: 'inventory/:id', element: withSuspense(InventoryDetailPage) },
            // USERS
            { path: 'users', element: withSuspense(UsersPage) },
            { path: 'users/:id', element: withSuspense(UserDetailPage) },
            // SETTINGS
            { path: 'settings', element: withSuspense(SettingsPage) },
            { path: 'profile', element: withSuspense(ProfilePage) },
            // POS, SALES, REPORTS
            { path: 'pos', element: withSuspense(POSPage) },
            { path: 'sales', element: withSuspense(SalesPage) },
            { path: 'reports', element: withSuspense(ReportsPage) },
            // 404 catch-all
            { path: '*', element: withSuspense(NotFoundPage) },
          ],
        },
      ],
    },
  ];
}

export default getAppRoutes;
