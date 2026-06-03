import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ModuleSpinner from '@/components/common/loading/ModuleSpinner';
import AppLayout from '@/layouts/AppLayout';
import { navigablePages } from '@/data/modules';
import RequireAuth from './guards/RequireAuth';

const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const UnderConstruction = lazy(() => import('@/pages/modules/UnderConstruction'));
const ErrorPage = lazy(() => import('@/pages/errors/ErrorPage'));

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
        {navigablePages.map((module) => (
          <Route
            key={module.id}
            path={module.path.replace(/^\//, '')}
            element={<Page><UnderConstruction /></Page>}
          />
        ))}
        <Route path="error/301" element={<Page><ErrorPage code="301" /></Page>} />
        <Route path="error/302" element={<Page><ErrorPage code="302" /></Page>} />
        <Route path="error/400" element={<Page><ErrorPage code="400" /></Page>} />
        <Route path="error/401" element={<Page><ErrorPage code="401" /></Page>} />
        <Route path="error/403" element={<Page><ErrorPage code="403" /></Page>} />
        <Route path="error/500" element={<Page><ErrorPage code="500" /></Page>} />
        <Route path="*" element={<Page><ErrorPage code="404" /></Page>} />
      </Route>
    </Route>
  </Routes>
);

export default AppRouter;
