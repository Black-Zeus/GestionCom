
import React from 'react';
import ProtectedRoute from './ProtectedRoute';

const AdminRoute = ({ children, ...props }) => {
  return (
    <ProtectedRoute 
      requireRole="admin" 
      fallbackPath="/unauthorized"
      {...props}
    >
      {children}
    </ProtectedRoute>
  );
};

export { AdminRoute };