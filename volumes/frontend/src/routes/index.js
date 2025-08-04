// ./src/routes/index.js
export { default as ProtectedRoute } from './ProtectedRoute';
export { PublicRoute } from './PublicRoute';
export { AdminRoute } from './AdminRoute';
export { RoleBasedRoute } from './RoleBasedRoute';

// Re-export useAuth hook
export { useAuth } from '../hooks/useAuth';