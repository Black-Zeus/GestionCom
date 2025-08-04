
import { useEffect } from 'react';
import { useAuth } from '@/store/authStore';

const criticalRoutes = {
  authenticated: [
    () => import('@/pages/dashboard/Dashboard'),
    () => import('@/pages/inventory/InventoryList')
  ],
  admin: [
    () => import('@/pages/admin/Users')
  ]
};

export const useResourcePreloader = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Precargar rutas críticas después del login
    const timer = setTimeout(() => {
      criticalRoutes.authenticated.forEach(importFn => {
        importFn().catch(console.warn);
      });

      // Precargar rutas admin si es admin
      if (user?.roles?.includes('admin')) {
        criticalRoutes.admin.forEach(importFn => {
          importFn().catch(console.warn);
        });
      }
    }, 2000); // Esperar 2 segundos después del login

    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.roles]);
};