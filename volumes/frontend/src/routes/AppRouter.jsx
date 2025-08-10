// AppRouter.jsx - Router principal limpio y modular
// Usa React Router pero de forma simple y organizada

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { allRoutes } from './modules';
import ProtectedRoute from './guards/ProtectedRoute';
import PublicRoute from './guards/PublicRoute';
import LazyWrapper from './LazyWrapper';

// Import de páginas de error
import NotFoundPage from '@/pages/errorPages/NotFoundPage';
import ServerErrorPage from '@/pages/errorPages/ServerErrorPage';
import ForbiddenPage from '@/pages/errorPages/ForbiddenPage';

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                {allRoutes.map((route) => {
                    const { path, component: Component, isPublic, requiresAuth, roles, ...routeProps } = route;

                    // Determinar el tipo de protección
                    let routeElement = <Component {...routeProps} />;

                    // Wrap con LazyWrapper para loading
                    routeElement = (
                        <LazyWrapper>
                            {routeElement}
                        </LazyWrapper>
                    );

                    // Wrap con guards de protección
                    if (isPublic) {
                        routeElement = (
                            <PublicRoute>
                                {routeElement}
                            </PublicRoute>
                        );
                    } else if (requiresAuth) {
                        routeElement = (
                            <ProtectedRoute requiredRoles={roles}>
                                {routeElement}
                            </ProtectedRoute>
                        );
                    }

                    return (
                        <Route
                            key={path}
                            path={path}
                            element={routeElement}
                        />
                    );
                })}

                {/* Rutas de error explícitas */}
                <Route
                    path="/ForbiddenPage"
                    element={
                        <LazyWrapper>
                            <ForbiddenPage />
                        </LazyWrapper>
                    }
                />
                <Route
                    path="/ServerErrorPage"
                    element={
                        <LazyWrapper>
                            <ServerErrorPage />
                        </LazyWrapper>
                    }
                />

                {/* Ruta 404 - siempre al final */}
                <Route
                    path="*"
                    element={
                        <LazyWrapper>
                            <NotFoundPage />
                        </LazyWrapper>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;