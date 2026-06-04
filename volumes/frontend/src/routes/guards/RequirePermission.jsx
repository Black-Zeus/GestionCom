/* eslint-disable react/prop-types */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

const RequirePermission = ({ permissions = [], requireAll = false, children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasAllPermissions = useAuthStore((state) => state.hasAllPermissions);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  const hasAccess = requiredPermissions.length === 0
    || (requireAll ? hasAllPermissions(requiredPermissions) : hasAnyPermission(requiredPermissions));

  if (!hasAccess) {
    return <Navigate to="/error/403" replace />;
  }

  return children || <Outlet />;
};

export default RequirePermission;
