// ====================================
// src/utils/LazyRoutes.jsx - VERSIÓN FINAL
// ====================================

import { createLazyImport } from '@/utils/lazyImports';

// ====================================
// COMPONENTES PRINCIPALES
// ====================================
export const App = createLazyImport(() => import('../App'));
export const Layout = createLazyImport(() => import('@/components/layout'));

// ====================================
// AUTH PAGES - Carga bajo demanda
// ====================================
export const LoginPage = createLazyImport(
  () => import('@/pages/auth/Login'),
  3, // 3 reintentos
  1000 // 1 segundo entre reintentos
);

export const ForgotPasswordPage = createLazyImport(
  () => import('@/pages/auth/Forgot/ForgotPassword')
);

export const ResetPasswordPage = createLazyImport(
  () => import('@/pages/auth/Reset/ResetPassword')
);

// ====================================
// DASHBOARD PAGES - Lazy con prioridad
// ====================================
export const DashboardPage = createLazyImport(
  () => import('@/pages/dashboard/Dashboard')
);

export const AnalyticsPage = createLazyImport(
  () => import('@/pages/dashboard/Analytics')
);

// ====================================
// TUS PÁGINAS EXISTENTES - Adaptadas
// ====================================
export const ModalDemo = createLazyImport(
  () => import('@/demos/ModalDemo')
);

// Tus páginas de inventario existentes
export const InventoryListPage = createLazyImport(
  () => import('@/pages/InventoryListPage')
);

export const InventoryDetailPage = createLazyImport(
  () => import('@/pages/InventoryDetailPage')
);

export const InventoryCreatePage = createLazyImport(
  () => import('@/pages/InventoryCreatePage')
);

// Tu página de usuarios existente
export const UsersPage = createLazyImport(
  () => import('@/pages/UsersPage')
);

// Tu página de NotFound existente
export const NotFoundPage = createLazyImport(
  () => import('@/pages/NotFoundPage')
);

// ====================================
// USER MANAGEMENT - Admin lazy (nuevas páginas futuras)
// ====================================
export const UserDetailPage = createLazyImport(
  () => import('@/pages/admin/UserDetail')
);

// ====================================
// SETTINGS - Lazy con preload condicional (nuevas páginas futuras)
// ====================================
export const SettingsPage = createLazyImport(
  () => import('@/pages/settings/Settings')
);

export const ProfilePage = createLazyImport(
  () => import('@/pages/settings/Profile')
);

// ====================================
// FUNCIÓN PARA TUS RUTAS EXISTENTES CON LAZY LOADING
// ====================================
export function getAppRoutes() {
  return [
    {
      path: '/',
      element: <App />, // App provee ErrorBoundary y recursos globales
      children: [
        {
          path: '',
          element: <Layout />, // Layout global (sidebar, header, etc)
          children: [
            { path: '', element: <DashboardPage /> },
            { path: 'modals', element: <ModalDemo /> },
            { path: 'inventory', element: <InventoryListPage /> },
            { path: 'inventory/create', element: <InventoryCreatePage /> },
            { path: 'inventory/:id', element: <InventoryDetailPage /> },
            { path: 'users', element: <UsersPage /> },
            // Agrega aquí otras rutas...
            { path: '*', element: <NotFoundPage /> },
          ],
        },
      ],
    },
  ];
}