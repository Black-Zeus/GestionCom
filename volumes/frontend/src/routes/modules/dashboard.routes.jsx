// dashboard.routes.jsx - Módulo de rutas del dashboard
// Rutas protegidas: dashboard principal y analytics

import { lazy } from 'react';

// Componentes lazy
const DashboardPage = lazy(() => import('@/pages/dashboard/Dashboard'));
const AnalyticsPage = lazy(() => import('@/pages/dashboard/Analytics'));

export const dashboardRoutes = [
    {
        path: '/',
        component: DashboardPage,
        title: 'Dashboard',
        requiresAuth: true
    },
    {
        path: '/dashboard',
        component: DashboardPage,
        title: 'Dashboard',
        requiresAuth: true
    },
    {
        path: '/analytics',
        component: AnalyticsPage,
        title: 'Analytics',
        requiresAuth: true
    }
];

export default dashboardRoutes;