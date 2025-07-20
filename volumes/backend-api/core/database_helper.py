"""
volumes/backend-api/core/database_helper.py
Helper centralizado para operaciones de BD
Elimina duplicación de imports y manejo de sesiones
"""
from database.database import db_manager
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class DatabaseHelper:
    """Helper centralizado para operaciones de BD"""
    
    @staticmethod
    def get_permissions_models():
        """Imports centralizados para modelos de permisos"""
        from database.models.users import User
        from database.models.user_roles import UserRole
        from database.models.user_permissions import UserPermission
        from database.models.roles import Role
        from database.models.permissions import Permission
        from database.models.role_permissions import RolePermission
        
        return {
            'User': User,
            'UserRole': UserRole, 
            'UserPermission': UserPermission,
            'Role': Role,
            'Permission': Permission,
            'RolePermission': RolePermission
        }
    
    @staticmethod
    async def execute_with_session(query_func, *args, **kwargs):
        """Wrapper para manejo centralizado de sesiones"""
        try:
            async with db_manager.get_session() as session:
                return await query_func(session, *args, **kwargs)
        except Exception as e:
            logger.error(f"Database operation failed: {e}")
            raise