// ./src/routes/PublicRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import { ROUTES } from '@/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const PublicRoute = ({
    children,
    redirectPath = ROUTES.DASHBOARD
}) => {
    const location = useLocation();
    const {
        isAuthenticated,
        isLoading,
        isInitialized
    } = useAuth();

    // Mostrar loading mientras se inicializa
    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <LoadingSpinner
                    size="lg"
                    message="Cargando..."
                    variant="page"
                />
            </div>
        );
    }

    // Si ya está autenticado, redirigir al dashboard (o ruta especificada)
    if (isAuthenticated) {
        // Usar la ruta 'from' del state si existe (después del login)
        const from = location.state?.from?.pathname || redirectPath;
        return <Navigate to={from} replace />;
    }

    // No autenticado - mostrar página pública (login, etc.)
    return children;
};

export { PublicRoute };