import { lazy } from 'react';

const UsersPage = lazy(() => import('@/pages/admin/Users'));
const RolesPage = lazy(() => import('@/pages/admin/Roles'));
const WarehousesPage = lazy(() => import('@/pages/admin/Warehouses'));
const MenuConfigPage = lazy(() => import('@/pages/admin/MenuConfig'));
const CashPosPage  = lazy(() => import('@/pages/admin/CashPos'));

export const adminRoutes = [
    {
        path: '/admin/users',
        component: UsersPage,
        title: 'Gestión de Usuarios',
        requiresAuth: true,
        requiredRoles: ['admin']
    },
    {
        path: '/admin/roles',
        component: RolesPage,
        title: 'Roles y Permisos',
        requiresAuth: true,
        requiredRoles: ['admin']
    },
    {
        path: '/admin/warehouses',
        component: WarehousesPage,
        title: 'Gestión de Bodegas',
        requiresAuth: true,
        requiredRoles: ['admin', 'supervisor']
    },
    {
        path: '/admin/cash-pos',
        component: CashPosPage,
        title: 'Configuración de Caja POS',
        requiresAuth: true,
        requiredRoles: ['admin', 'supervisor']
    },
    {
        path: '/admin/menu',
        component: MenuConfigPage,
        title: 'Configuración de Menú',
        requiresAuth: true,
        requiredRoles: ['admin']
    }
];

export default adminRoutes;