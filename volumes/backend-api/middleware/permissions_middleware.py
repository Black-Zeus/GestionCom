"""
volumes/backend-api/middleware/permissions_middleware.py
Middleware para verificar permisos en endpoints protegidos
"""
from typing import List
from services.permissions_service import permissions_service
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class PermissionsMiddleware:
    """Middleware para verificación de permisos"""
    
    @staticmethod
    async def check_user_permission(user_id: int, required_permission: str) -> bool:
        """Verificar si usuario tiene un permiso específico"""
        try:
            permissions_data = await permissions_service.get_user_permissions(user_id)
            user_permissions = permissions_data.get("permissions", [])
            
            return required_permission in user_permissions
            
        except Exception as e:
            logger.error(f"Error checking permission {required_permission} for user {user_id}: {e}")
            return False
    
    @staticmethod
    async def check_user_role(user_id: int, required_role: str) -> bool:
        """Verificar si usuario tiene un rol específico"""
        try:
            permissions_data = await permissions_service.get_user_permissions(user_id)
            user_roles = permissions_data.get("roles", [])
            
            return required_role in user_roles
            
        except Exception as e:
            logger.error(f"Error checking role {required_role} for user {user_id}: {e}")
            return False
    
    @staticmethod
    async def require_permissions(user_id: int, required_permissions: List[str]) -> bool:
        """Verificar múltiples permisos (todos requeridos)"""
        try:
            permissions_data = await permissions_service.get_user_permissions(user_id)
            user_permissions = permissions_data.get("permissions", [])
            
            # Verificar que el usuario tenga TODOS los permisos requeridos
            return all(perm in user_permissions for perm in required_permissions)
            
        except Exception as e:
            logger.error(f"Error checking multiple permissions for user {user_id}: {e}")
            return False