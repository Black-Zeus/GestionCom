
import React from 'react';
import ProtectedRoute from './ProtectedRoute';

const RoleBasedRoute = ({ 
  children, 
  allowedRoles = [], 
  allowedPermissions = [],
  ...props 
}) => {
  return (
    <ProtectedRoute 
      requireRole={allowedRoles.length > 0 ? allowedRoles : null}
      requirePermission={allowedPermissions.length > 0 ? allowedPermissions : null}
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
};

export { RoleBasedRoute };