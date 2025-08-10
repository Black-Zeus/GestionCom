// ProtectedRoute.jsx - Guard para rutas protegidas
// Verifica autenticación y roles antes de permitir acceso

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore'; // Ajusta según tu store

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
    const location = useLocation();
    const { isAuthenticated, user, isLoading } = useAuth();

    // Mostrar loading mientras verifica auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // Redirigir a login si no está autenticado
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname }}
                replace
            />
        );
    }

    // Verificar roles si son requeridos
    if (requiredRoles.length > 0) {
        const userRoles = user?.roles || [];
        const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
                        <p className="text-gray-600 mb-6">No tienes permisos para acceder a esta página</p>
                        <a
                            href="/"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Volver al Inicio
                        </a>
                    </div>
                </div>
            );
        }
    }

    return children;
};

export default ProtectedRoute;