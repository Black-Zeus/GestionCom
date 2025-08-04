
import { useAuth as useAuthStore } from '@/store/authStore';

export const useAuth = () => {
  const auth = useAuthStore();
  
  return {
    // Estados
    ...auth,
    
    // Helpers adicionales
    hasRole: (role) => {
      const userRoles = auth.user?.roles || [];
      return Array.isArray(role) 
        ? role.some(r => userRoles.includes(r))
        : userRoles.includes(role);
    },
    
    hasPermission: (permission) => {
      const userPermissions = auth.user?.permissions || [];
      return Array.isArray(permission)
        ? permission.some(p => userPermissions.includes(p))
        : userPermissions.includes(permission);
    },
    
    hasAnyRole: (roles) => {
      const userRoles = auth.user?.roles || [];
      return roles.some(role => userRoles.includes(role));
    },
    
    hasAnyPermission: (permissions) => {
      const userPermissions = auth.user?.permissions || [];
      return permissions.some(permission => userPermissions.includes(permission));
    },
    
    isAdmin: () => {
      const userRoles = auth.user?.roles || [];
      return userRoles.includes('admin') || userRoles.includes('administrator');
    },
    
    isManager: () => {
      const userRoles = auth.user?.roles || [];
      return userRoles.includes('manager') || userRoles.includes('supervisor');
    }
  };
};