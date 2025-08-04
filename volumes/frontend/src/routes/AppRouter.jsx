// ./src/routes/AppRouter.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants';
import LazyWrapper from '@/components/common/LazyWrapper';
import ProtectedRoute from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';

// Import de páginas lazy
import {
  LoginPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  AnalyticsPage,
  InventoryListPage,
  InventoryDetailPage,
  InventoryCreatePage,
  UsersPage,
  UserDetailPage,
  SettingsPage,
  ProfilePage
} from './LazyRoutes';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* AUTH ROUTES - Public */}
        <Route path={ROUTES.LOGIN} element={
          <PublicRoute>
            <LazyWrapper fallback={<div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600">Cargando sistema de acceso...</p>
              </div>
            </div>}>
              <LoginPage />
            </LazyWrapper>
          </PublicRoute>
        } />

        <Route path={ROUTES.FORGOT_PASSWORD} element={
          <PublicRoute>
            <LazyWrapper>
              <ForgotPasswordPage />
            </LazyWrapper>
          </PublicRoute>
        } />

        <Route path={ROUTES.RESET_PASSWORD} element={
          <PublicRoute>
            <LazyWrapper>
              <ResetPasswordPage />
            </LazyWrapper>
          </PublicRoute>
        } />

        {/* PROTECTED ROUTES */}
        <Route path={ROUTES.DASHBOARD} element={
          <ProtectedRoute>
            <LazyWrapper 
              fallback={<div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">Cargando dashboard...</p>
                </div>
              </div>}
            >
              <DashboardPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        <Route path="/analytics" element={
          <ProtectedRoute>
            <LazyWrapper>
              <AnalyticsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        {/* INVENTORY ROUTES */}
        <Route path="/inventory" element={
          <ProtectedRoute>
            <LazyWrapper>
              <InventoryListPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        <Route path="/inventory/:id" element={
          <ProtectedRoute>
            <LazyWrapper>
              <InventoryDetailPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        <Route path="/inventory/create" element={
          <ProtectedRoute>
            <LazyWrapper>
              <InventoryCreatePage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        {/* ADMIN ROUTES */}
        <Route path={ROUTES.USERS_MANAGEMENT} element={
          <ProtectedRoute requireRole="admin">
            <LazyWrapper>
              <UsersPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        <Route path="/admin/users/:id" element={
          <ProtectedRoute requireRole="admin">
            <LazyWrapper>
              <UserDetailPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        {/* SETTINGS ROUTES */}
        <Route path={ROUTES.SETTINGS} element={
          <ProtectedRoute>
            <LazyWrapper>
              <SettingsPage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        <Route path={ROUTES.PROFILE} element={
          <ProtectedRoute>
            <LazyWrapper>
              <ProfilePage />
            </LazyWrapper>
          </ProtectedRoute>
        } />

        {/* REDIRECTS */}
        <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path="*" element={
          <LazyWrapper>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Página no encontrada</p>
                <a href={ROUTES.DASHBOARD} className="text-blue-600 hover:underline">
                  Volver al Dashboard
                </a>
              </div>
            </div>
          </LazyWrapper>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;