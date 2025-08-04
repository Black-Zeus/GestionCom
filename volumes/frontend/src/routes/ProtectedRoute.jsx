
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/authStore';
import { ROUTES } from '@/constants';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requireRole = null,
  requirePermission = null,
  fallbackPath = ROUTES.LOGIN 
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized, 
    user 
  } = useAuth();

  // Mostrar loading mientras se inicializa la autenticación
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner 
          size="lg" 
          message="Verificando autenticación..." 
          variant="page"
        />
      </div>
    );
  }

  // Redirect a login si no está autenticado
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ 
          from: location,
          message: 'Debes iniciar sesión para acceder a esta página'
        }} 
        replace 
      />
    );
  }

  // Verificar rol requerido
  if (requireRole && user) {
    const userRoles = user.roles || [];
    const hasRequiredRole = Array.isArray(requireRole) 
      ? requireRole.some(role => userRoles.includes(role))
      : userRoles.includes(requireRole);

    if (!hasRequiredRole) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location,
            message: `Acceso denegado. Se requiere rol: ${Array.isArray(requireRole) ? requireRole.join(' o ') : requireRole}`
          }} 
          replace 
        />
      );
    }
  }

  // Verificar permiso requerido
  if (requirePermission && user) {
    const userPermissions = user.permissions || [];
    const hasRequiredPermission = Array.isArray(requirePermission)
      ? requirePermission.some(permission => userPermissions.includes(permission))
      : userPermissions.includes(requirePermission);

    if (!hasRequiredPermission) {
      return (
        <Navigate 
          to="/unauthorized" 
          state={{ 
            from: location,
            message: `Acceso denegado. Se requiere permiso: ${Array.isArray(requirePermission) ? requirePermission.join(' o ') : requirePermission}`
          }} 
          replace 
        />
      );
    }
  }

  // Usuario autenticado y autorizado - renderizar children
  return children;
};

export default ProtectedRoute;