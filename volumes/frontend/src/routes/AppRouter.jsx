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
