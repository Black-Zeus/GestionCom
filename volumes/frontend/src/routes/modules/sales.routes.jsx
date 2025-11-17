import { lazy } from 'react';

const NewSalePage = lazy(() => import('@/pages/sales/NewSale'));
const SalesHistoryPage = lazy(() => import('@/pages/sales/SalesHistory'));
const CustomersPage = lazy(() => import('@/pages/sales/customers/Customers'));
const CorporateCustomersPage = lazy(() => import('@/pages/sales/customers/CorporateCustomers'));
const AuthorizedPersonsPage = lazy(() => import('@/pages/sales/customers/AuthorizedPersons'));
const CustomerCreditPage = lazy(() => import('@/pages/sales/customers/CustomerCredit'));
const CustomerPurchaseHistoryPage = lazy(() => import('@/pages/sales/customers/PurchaseHistory'));
const CustomerAccountStatusPage = lazy(() => import('@/pages/sales/customers/AccountStatus'));
const PromotionsPage = lazy(() => import('@/pages/sales/Promotions'));

export const salesRoutes = [
    // Operaciones de venta
    {
        path: '/sales/new',
        component: NewSalePage,
        title: 'Nueva Venta',
        requiresAuth: true
    },
    {
        path: '/sales/history',
        component: SalesHistoryPage,
        title: 'Historial de Ventas',
        requiresAuth: true
    },

    // Gestión de clientes
    {
        path: '/customers',
        component: CustomersPage,
        title: 'Lista de Clientes',
        requiresAuth: true
    },
    {
        path: '/customers/corporate',
        component: CorporateCustomersPage,
        title: 'Clientes Empresariales',
        requiresAuth: true
    },
    {
        path: '/customers/authorized-persons',
        component: AuthorizedPersonsPage,
        title: 'Personas Autorizadas',
        requiresAuth: true
    },
    {
        path: '/customers/credit-limits',
        component: CustomerCreditPage,
        title: 'Créditos y Límites',
        requiresAuth: true
    },
    {
        path: '/customers/purchase-history',
        component: CustomerPurchaseHistoryPage,
        title: 'Historial de Compras',
        requiresAuth: true
    },
    {
        path: '/customers/account-status',
        component: CustomerAccountStatusPage,
        title: 'Estado de Cuenta',
        requiresAuth: true
    }
];

export default salesRoutes;