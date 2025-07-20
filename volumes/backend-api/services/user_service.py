"""
volumes/backend-api/services/user_service.py
Servicio para operaciones de usuarios (complementa permissions_service)
"""
from typing import Optional, Dict, Any
from core.database_helper import DatabaseHelper
from core.validation_helper import ValidationHelper
from core.error_handler import ErrorHandler

class UserService:
    """Servicio para operaciones de usuarios"""
    
    async def get_user_info(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Obtener información completa del usuario"""
        if not ValidationHelper.validate_user_id(user_id, "get_user_info"):
            return None
        
        try:
            return await DatabaseHelper.execute_with_session(
                self._query_user_info, user_id
            )
        except Exception as e:
            return ErrorHandler.log_and_return_none(e, "get_user_info", user_id)
    
    async def _query_user_info(self, session, user_id: int) -> Optional[Dict[str, Any]]:
        """Query para información del usuario"""
        models = DatabaseHelper.get_permissions_models()
        
        from sqlalchemy import select
        
        stmt = select(
            models['User'].id,
            models['User'].username,
            models['User'].email,
            models['User'].first_name,
            models['User'].last_name,
            models['User'].is_active,
            models['User'].last_login_at,
            models['User'].created_at
        ).where(models['User'].id == user_id)
        
        result = await session.execute(stmt)
        user_row = result.first()
        
        if not user_row:
            return None
        
        # Obtener permisos del usuario
        from services.permissions_service import permissions_service
        permissions_data = await permissions_service.get_user_permissions(user_id)
        
        return {
            "id": user_row.id,
            "username": user_row.username,
            "email": user_row.email,
            "first_name": user_row.first_name,
            "last_name": user_row.last_name,
            "full_name": f"{user_row.first_name} {user_row.last_name}".strip(),
            "is_active": user_row.is_active,
            "last_login_at": user_row.last_login_at,
            "created_at": user_row.created_at,
            "roles": permissions_data.get("roles", []),
            "permissions": permissions_data.get("permissions", [])
        }

# Instancia global
user_service = UserService()