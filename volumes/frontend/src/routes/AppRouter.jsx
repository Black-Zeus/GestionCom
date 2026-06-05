/* eslint-disable react/prop-types */
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
const AdminPettyCash = lazy(() => import('@/pages/admin/AdminPettyCash'));
const AdminPaymentMethods = lazy(() => import('@/pages/admin/AdminPaymentMethods'));
const AdminMeasurementUnits = lazy(() => import('@/pages/admin/AdminMeasurementUnits'));
const AdminProductCategories = lazy(() => import('@/pages/admin/AdminProductCategories'));
const AdminProductAttributes = lazy(() => import('@/pages/admin/AdminProductAttributes'));
const AdminDocumentSeries = lazy(() => import('@/pages/admin/AdminDocumentSeries'));
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
const AdminSupplierProducts = lazy(() => import('@/pages/admin/AdminSupplierProducts'));
const AdminProductSupportMaintainers = lazy(() => import('@/pages/admin/AdminProductSupportMaintainers'));
const AdminProductBarcodes = lazy(() => import('@/pages/admin/AdminProductBarcodes'));
const AdminProductUnits = lazy(() => import('@/pages/admin/AdminProductUnits'));
const AdminProductMedia = lazy(() => import('@/pages/admin/AdminProductMedia'));
const AdminInventoryMaintainers = lazy(() => import('@/pages/admin/AdminInventoryMaintainers'));
const AdminStockCriticalConfig = lazy(() => import('@/pages/admin/AdminStockCriticalConfig'));
const AdminSystemParameterMaintainers = lazy(() => import('@/pages/admin/AdminSystemParameterMaintainers'));
const AdminSalesConfigMaintainers = lazy(() => import('@/pages/admin/AdminSalesConfigMaintainers'));
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
  'petty-cash-admin': AdminPettyCash,
  'payment-methods': AdminPaymentMethods,
  'measurement-units': AdminMeasurementUnits,
  categories: AdminProductCategories,
  'product-attributes': AdminProductAttributes,
  'document-series': AdminDocumentSeries,
  products: AdminProducts,
  'price-lists': AdminPriceLists,
  'tax-config': AdminTaxConfig,
  'company-config': AdminCompanyConfig,
  customers: AdminCustomersMaintainers,
  'authorized-persons': AdminCustomerAuthorized,
  'customer-credit': AdminCustomerCredit,
  suppliers: AdminSuppliersMaintainers,
  'supplier-contacts': AdminSupplierContacts,
  'supplier-products': AdminSupplierProducts,
  'product-brand-models': AdminProductSupportMaintainers,
  barcodes: AdminProductBarcodes,
  'product-units': AdminProductUnits,
  'product-media': AdminProductMedia,
  'warehouse-zones': AdminInventoryMaintainers,
  'stock-critical-config': AdminStockCriticalConfig,
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
