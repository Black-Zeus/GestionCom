"""
volumes/backend-api/decorators/auth_decorators.py
Decoradores para proteger endpoints con permisos
"""
from functools import wraps
from fastapi import HTTPException
from middleware.permissions_middleware import PermissionsMiddleware
from core.constants import HTTPStatus

def require_permission(permission: str):
    """Decorador para requerir un permiso específico"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extraer user_id del contexto/token
            user_id = kwargs.get('current_user_id')  # Ajustar según tu implementación
            
            if not user_id:
                raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Usuario no autenticado")
            
            has_permission = await PermissionsMiddleware.check_user_permission(user_id, permission)
            
            if not has_permission:
                raise HTTPException(
                    status_code=HTTPStatus.FORBIDDEN, 
                    detail=f"Permiso requerido: {permission}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role: str):
    """Decorador para requerir un rol específico"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            user_id = kwargs.get('current_user_id')
            
            if not user_id:
                raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Usuario no autenticado")
            
            has_role = await PermissionsMiddleware.check_user_role(user_id, role)
            
            if not has_role:
                raise HTTPException(
                    status_code=HTTPStatus.FORBIDDEN, 
                    detail=f"Rol requerido: {role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator