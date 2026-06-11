/* eslint-disable react/prop-types */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import ModuleSpinner from '@/components/common/loading/ModuleSpinner';
import AppLayout from '@/layouts/AppLayout';
import { navigablePages } from '@/data/modules';
import RequireAuth from './guards/RequireAuth';
import RequirePermission from './guards/RequirePermission';

const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const UnderConstruction = lazy(() => import('@/pages/modules/UnderConstruction'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminRoles = lazy(() => import('@/pages/admin/AdminRoles'));
const AdminWarehouses = lazy(() => import('@/pages/admin/AdminWarehouses'));
const AdminCashPos = lazy(() => import('@/pages/admin/AdminCashPos'));
const AdminSalesPoints = lazy(() => import('@/pages/admin/AdminSalesPoints'));
const AdminOperatorAssignments = lazy(() => import('@/pages/admin/AdminOperatorAssignments'));
const AdminPettyCashCategories = lazy(() => import('@/pages/admin/AdminPettyCashCategories'));
const AdminPettyCashFunds = lazy(() => import('@/pages/admin/AdminPettyCashFunds'));
const PettyCashExpenses = lazy(() => import('@/pages/cash/PettyCashExpenses'));
const CashPos = lazy(() => import('@/pages/cash/CashPos'));
const NewSale = lazy(() => import('@/pages/sales/NewSale'));
const SalesHistory = lazy(() => import('@/pages/sales/SalesHistory'));
const SalesReturns = lazy(() => import('@/pages/sales/SalesReturns'));
const SalesPriceQuery = lazy(() => import('@/pages/sales/SalesPriceQuery'));
const AdminPaymentMethods = lazy(() => import('@/pages/admin/AdminPaymentMethods'));
const AdminMeasurementUnits = lazy(() => import('@/pages/admin/AdminMeasurementUnits'));
const AdminProductCategories = lazy(() => import('@/pages/admin/AdminProductCategories'));
const AdminProductAttributes = lazy(() => import('@/pages/admin/AdminProductAttributes'));
const AdminDocumentSeries = lazy(() => import('@/pages/admin/AdminDocumentSeries'));
const AdminDocumentTypes = lazy(() => import('@/pages/admin/AdminDocumentTypes'));
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'));
const AdminPriceLists = lazy(() => import('@/pages/admin/AdminPriceLists'));
const AdminTaxConfig = lazy(() => import('@/pages/admin/AdminTaxConfig'));
const AdminCompanyConfig = lazy(() => import('@/pages/admin/AdminCompanyConfig'));
const AdminCompanyFormPage = lazy(() => import('@/pages/admin/AdminCompanyFormPage'));
const AdminCustomersMaintainers = lazy(() => import('@/pages/admin/AdminCustomersMaintainers'));
const AdminCustomerFormPage = lazy(() => import('@/pages/admin/AdminCustomerFormPage'));
const AdminCustomerAuthorized = lazy(() => import('@/pages/admin/AdminCustomerAuthorized'));
const AdminCustomerCredit = lazy(() => import('@/pages/admin/AdminCustomerCredit'));
const AdminSuppliersMaintainers = lazy(() => import('@/pages/admin/AdminSuppliersMaintainers'));
const AdminSupplierFormPage = lazy(() => import('@/pages/admin/AdminSupplierFormPage'));
const AdminSupplierContacts = lazy(() => import('@/pages/admin/AdminSupplierContacts'));
const AdminSupplierAddresses = lazy(() => import('@/pages/admin/AdminSupplierAddresses'));
const AdminSupplierProducts = lazy(() => import('@/pages/admin/AdminSupplierProducts'));
const AdminProductSupportMaintainers = lazy(() => import('@/pages/admin/AdminProductSupportMaintainers'));
const AdminProductBarcodes = lazy(() => import('@/pages/admin/AdminProductBarcodes'));
const AdminProductFlagSettings = lazy(() => import('@/pages/admin/AdminProductFlagSettings'));
const AdminProductUnits = lazy(() => import('@/pages/admin/AdminProductUnits'));
const AdminWarehouseZones = lazy(() => import('@/pages/admin/AdminWarehouseZones'));
const AdminWarehouseZoneLocations = lazy(() => import('@/pages/admin/AdminWarehouseZoneLocations'));
const AdminStockCriticalConfig = lazy(() => import('@/pages/admin/AdminStockCriticalConfig'));
const AdminPhysicalInventory = lazy(() => import('@/pages/admin/AdminPhysicalInventory'));
const AdminStockTransfers = lazy(() => import('@/pages/admin/AdminStockTransfers'));
const AdminStockMovements = lazy(() => import('@/pages/admin/AdminStockMovements'));
const AdminStockConversions = lazy(() => import('@/pages/admin/AdminStockConversions'));
const AdminInventoryTrackingReports = lazy(() => import('@/pages/admin/AdminInventoryTrackingReports'));
const AdminSystemParameterMaintainers = lazy(() => import('@/pages/admin/AdminSystemParameterMaintainers'));
const AdminSalesConfigMaintainers = lazy(() => import('@/pages/admin/AdminSalesConfigMaintainers'));
const AdminPromotionItems = lazy(() => import('@/pages/admin/AdminPromotionItems'));
const AdminReturnReasons = lazy(() => import('@/pages/admin/AdminReturnReasons'));
const AdminFinanceMaintainers = lazy(() => import('@/pages/admin/AdminFinanceMaintainers'));
const AdminFinanceCurrencies = lazy(() => import('@/pages/admin/AdminFinanceCurrencies'));
const AdminBankReconciliationSettings = lazy(() => import('@/pages/admin/AdminBankReconciliationSettings'));
const AdminDocumentTemplates = lazy(() => import('@/pages/admin/AdminDocumentTemplates'));
const AdminNotificationSettings = lazy(() => import('@/pages/admin/AdminNotificationSettings'));
const NotificationInbox = lazy(() => import('@/pages/notifications/NotificationInbox'));
const Profile = lazy(() => import('@/pages/profile/Profile'));
const GlobalSearchResults = lazy(() => import('@/pages/search/GlobalSearchResults'));
const AdminRolePermissions = lazy(() => import('@/pages/admin/AdminRolePermissions'));
const AdminUserPermissions = lazy(() => import('@/pages/admin/AdminUserPermissions'));
const ErrorPage = lazy(() => import('@/pages/errors/ErrorPage'));

const moduleComponents = {
  users: AdminUsers,
  roles: AdminRoles,
  warehouses: AdminWarehouses,
  'cash-pos-admin': AdminCashPos,
  'sales-points-admin': AdminSalesPoints,
  'operator-assignments-admin': AdminOperatorAssignments,
  'petty-cash': AdminPettyCashFunds,
  'petty-cash-expenses': PettyCashExpenses,
  'cash-pos': CashPos,
  'new-sale': NewSale,
  'sales-history': SalesHistory,
  'sales-returns': SalesReturns,
  returns: SalesReturns,
  'price-query': SalesPriceQuery,
  'petty-cash-admin': AdminPettyCashCategories,
  'petty-cash-categories': AdminPettyCashCategories,
  'payment-methods': AdminPaymentMethods,
  'measurement-units': AdminMeasurementUnits,
  categories: AdminProductCategories,
  'product-attributes': AdminProductAttributes,
  'document-series': AdminDocumentTypes,
  products: AdminProducts,
  'price-lists': AdminPriceLists,
  'tax-config': AdminTaxConfig,
  'company-config': AdminCompanyConfig,
  customers: AdminCustomersMaintainers,
  'authorized-persons': AdminCustomerAuthorized,
  'customer-credit': AdminCustomerCredit,
  suppliers: AdminSuppliersMaintainers,
  'supplier-contacts': AdminSupplierContacts,
  'supplier-addresses': AdminSupplierAddresses,
  'supplier-products': AdminSupplierProducts,
  'product-brand-models': AdminProductSupportMaintainers,
  barcodes: AdminProductBarcodes,
  'product-flag-settings': AdminProductFlagSettings,
  'product-units': AdminProductUnits,
  'stock-critical-config': AdminStockCriticalConfig,
  'physical-inventory': AdminPhysicalInventory,
  'stock-movements': AdminStockMovements,
  'stock-conversions': AdminStockConversions,
  'inventory-tracking-reports': AdminInventoryTrackingReports,
  transfers: AdminStockTransfers,
  'system-parameters': AdminSystemParameterMaintainers,
  promotions: AdminSalesConfigMaintainers,
  'return-reasons': AdminReturnReasons,
  'finance-banking': AdminFinanceMaintainers,
  'finance-currencies': AdminFinanceCurrencies,
  'bank-reconciliation-settings': AdminBankReconciliationSettings,
  'document-templates': AdminDocumentTemplates,
  'notification-settings': AdminNotificationSettings,
  notifications: NotificationInbox,
  profile: Profile,
};

const routeAliases = [
  { from: 'admin/sales-points', to: '/cash/sales-points' },
  { from: 'admin/operator-assignments', to: '/cash/operator-assignments' },
  { from: 'products', to: '/inventory/products' },
  { from: 'stock/movements', to: '/inventory/stock/movements' },
  { from: 'stock/conversions', to: '/inventory/stock/conversions' },
  { from: 'stock/physical', to: '/inventory/stock/physical' },
  { from: 'stock/tracking-reports', to: '/inventory/stock/tracking-reports' },
  { from: 'stock/adjustments', to: '/inventory/stock/adjustments' },
  { from: 'stock/transfers', to: '/inventory/stock/transfers' },
  { from: 'stock/transfers/:transferId', to: '/inventory/stock/transfers', param: 'transferId' },
  { from: 'inventory/stock-critical', to: '/inventory/stock/critical' },
  { from: 'price-lists', to: '/inventory/pricing/price-lists' },
  { from: 'categories', to: '/inventory/products/categories' },
  { from: 'product-attributes', to: '/inventory/products/attributes' },
  { from: 'products/brands-models', to: '/inventory/products/brands-models' },
  { from: 'barcodes', to: '/inventory/products/barcodes' },
  { from: 'products/units', to: '/inventory/products/units' },
  { from: 'returns', to: '/documents/returns' },
  { from: 'returns/reasons', to: '/documents/returns/reasons' },
  { from: 'returns/credit-notes', to: '/documents/returns/credit-notes' },
  { from: 'config/document-templates', to: '/documents/templates' },
  { from: 'admin/cash-pos', to: '/admin/cash/pos' },
  { from: 'admin/cash-petty', to: '/admin/cash/petty-cash-categories' },
  { from: 'admin/petty-cash-categories', to: '/admin/cash/petty-cash-categories' },
];

const RedirectTo = ({ to, param }) => {
  const location = useLocation();
  const params = useParams();
  const paramSuffix = param && params[param] ? `/${encodeURIComponent(params[param])}` : '';
  return <Navigate to={`${to}${paramSuffix}${location.search}${location.hash}`} replace />;
};

const Page = ({ children }) => (
  <Suspense fallback={<ModuleSpinner />}>
    {children}
  </Suspense>
);

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<Page><Login /></Page>} />
    <Route path="/forgot-password" element={<Page><ForgotPassword /></Page>} />
    <Route path="/reset-password" element={<Page><ResetPassword /></Page>} />

    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="admin/roles/permissions"
          element={(
            <Page>
              <RequirePermission permissions={['USER_MANAGER']}>
                <AdminRolePermissions />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="admin/users/permissions"
          element={(
            <Page>
              <RequirePermission permissions={['USER_MANAGER']}>
                <AdminUserPermissions />
              </RequirePermission>
            </Page>
          )}
        />
        <Route path="search" element={<Page><GlobalSearchResults /></Page>} />
        <Route
          path="config/company/new"
          element={(
            <Page>
              <RequirePermission permissions={['COMPANY_CONFIG_ACCESS', 'COMPANY_CONFIG_MANAGE']}>
                <AdminCompanyFormPage mode="create" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="config/company/edit/:companyRut"
          element={(
            <Page>
              <RequirePermission permissions={['COMPANY_CONFIG_ACCESS', 'COMPANY_CONFIG_MANAGE']}>
                <AdminCompanyFormPage mode="edit" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="customers/new"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminCustomerFormPage mode="create" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="customers/edit/:customerCode"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminCustomerFormPage mode="edit" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="customers/authorized-persons"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminCustomerAuthorized />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="customers/credit-limits"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminCustomerCredit />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="suppliers/new"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminSupplierFormPage mode="create" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="suppliers/edit/:supplierCode"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminSupplierFormPage mode="edit" />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="suppliers/contacts"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminSupplierContacts />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="suppliers/addresses"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminSupplierAddresses />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="suppliers/products"
          element={(
            <Page>
              <RequirePermission permissions={['FOUNDATION_MAINTAINERS_ACCESS', 'FOUNDATION_MAINTAINERS_MANAGE']}>
                <AdminSupplierProducts />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="inventory/warehouses/zones"
          element={(
            <Page>
              <RequirePermission permissions={['WAREHOUSE_READ', 'WAREHOUSE_MANAGER', 'WAREHOUSE_SUPERVISOR', 'WAREHOUSE_ADMIN', 'WAREHOUSES_ACCESS', 'INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE']}>
                <AdminWarehouseZones />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="inventory/warehouses/zones/locations"
          element={(
            <Page>
              <RequirePermission permissions={['WAREHOUSE_READ', 'WAREHOUSE_MANAGER', 'WAREHOUSE_SUPERVISOR', 'WAREHOUSE_ADMIN', 'WAREHOUSES_ACCESS', 'INVENTORY_MAINTAINERS_ACCESS', 'INVENTORY_MAINTAINERS_MANAGE']}>
                <AdminWarehouseZoneLocations />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="inventory/stock/transfers/:transferId"
          element={(
            <Page>
              <RequirePermission permissions={['TRANSFERS_ACCESS', 'STOCK_TRANSFER', 'TRANSFER_RECEPTIONS_MANAGE']}>
                <AdminStockTransfers />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="documents/series/series"
          element={(
            <Page>
              <RequirePermission permissions={['DOCUMENT_SERIES_ACCESS', 'DOCUMENT_SERIES_MANAGE']}>
                <AdminDocumentSeries />
              </RequirePermission>
            </Page>
          )}
        />
        <Route
          path="sales/promotions/items"
          element={(
            <Page>
              <RequirePermission permissions={['SALES_MAINTAINERS_ACCESS', 'SALES_MAINTAINERS_MANAGE']}>
                <AdminPromotionItems />
              </RequirePermission>
            </Page>
          )}
        />
        {routeAliases.map((alias) => (
          <Route
            key={alias.from}
            path={alias.from}
            element={<RedirectTo to={alias.to} param={alias.param} />}
          />
        ))}
        {navigablePages.map((module) => {
          const ModuleComponent = moduleComponents[module.id] || UnderConstruction;
          const moduleContent = <ModuleComponent />;
          const permissionContent = module.permissions?.length ? (
            <RequirePermission permissions={module.permissions}>
              {moduleContent}
            </RequirePermission>
          ) : moduleContent;
          const protectedContent = module.visibilityPermissions?.length ? (
            <RequirePermission permissions={module.visibilityPermissions}>
              {permissionContent}
            </RequirePermission>
          ) : permissionContent;

          return (
            <Route
              key={module.id}
              path={module.path.replace(/^\//, '')}
              element={
                <Page>
                  {protectedContent}
                </Page>
              }
            />
          );
        })}
        <Route path="error/301" element={<Page><ErrorPage code="301" /></Page>} />
        <Route path="error/302" element={<Page><ErrorPage code="302" /></Page>} />
        <Route path="error/400" element={<Page><ErrorPage code="400" /></Page>} />
        <Route path="error/401" element={<Page><ErrorPage code="401" /></Page>} />
        <Route path="error/403" element={<Page><ErrorPage code="403" /></Page>} />
        <Route path="error/500" element={<Page><ErrorPage code="500" /></Page>} />
        <Route path="*" element={<Page><UnderConstruction /></Page>} />
      </Route>
    </Route>
  </Routes>
);

export default AppRouter;
