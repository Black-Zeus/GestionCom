"""
Dependencies de autenticación para FastAPI
Integra middleware de auth con sistema de dependencies para proteger rutas
"""
import logging
import time
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.exceptions import (
    TokenMissingException,
    TokenInvalidException,
    TokenBlacklistedException,
    UserInactiveException,
    AuthenticationException,
    PermissionDeniedException
)
from core.constants import ErrorCode
from auth_middleware import authenticate_request
from cache.services.user_cache import user_cache_service


# Configurar logger
logger = logging.getLogger(__name__)

# Security scheme para extraer token
security = HTTPBearer(auto_error=False)


# ==========================================
# DEPENDENCIES PRINCIPALES
# ==========================================

async def require_authentication(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> None:
    """
    Dependency que requiere autenticación válida
    
    Ejecuta la validación completa de JWT usando tu auth_middleware.
    Debe usarse en endpoints que requieren autenticación.
    
    Raises:
        HTTPException: Si la autenticación falla
    """
    try:
        # Verificar que hay credentials
        if not credentials:
            raise TokenMissingException()
        
        # Ejecutar autenticación completa usando tu middleware
        await authenticate_request(request)
        
        # Si llegamos aquí, la autenticación fue exitosa
        # El middleware ya guardó la información en request.state
        
    except TokenMissingException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso requerido",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except TokenInvalidException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"}
        )
    except TokenBlacklistedException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"}
        )
    except UserInactiveException as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message
        )
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Unexpected error in authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno de autenticación"
        )


async def get_current_user(
    request: Request,
    _: None = Depends(require_authentication)
) -> Dict[str, Any]:
    """
    Dependency para obtener información completa del usuario actual
    
    Returns:
        Dict con información del usuario autenticado
        
    Raises:
        HTTPException: Si no hay usuario autenticado
    """
    try:
        # Obtener información del usuario desde request.state
        # (fue guardada por authenticate_request)
        user_info = getattr(request.state, 'user', None)
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Información de usuario no disponible"
            )
        
        return user_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo información de usuario"
        )


async def get_current_user_id(
    request: Request,
    _: None = Depends(require_authentication)
) -> int:
    """
    Dependency para obtener solo el ID del usuario actual
    
    Returns:
        ID del usuario autenticado
        
    Raises:
        HTTPException: Si no hay usuario autenticado
    """
    try:
        user_id = getattr(request.state, 'user_id', None)
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ID de usuario no disponible"
            )
        
        return user_id
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current user ID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo ID de usuario"
        )


async def get_current_username(
    request: Request,
    _: None = Depends(require_authentication)
) -> str:
    """
    Dependency para obtener username del usuario actual
    
    Returns:
        Username del usuario autenticado
        
    Raises:
        HTTPException: Si no hay usuario autenticado
    """
    try:
        username = getattr(request.state, 'username', None)
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username no disponible"
            )
        
        return username
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting current username: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo username"
        )


async def get_current_token_jti(
    request: Request,
    _: None = Depends(require_authentication)
) -> str:
    """
    Dependency para obtener JTI del token actual
    
    Returns:
        JTI del token actual
        
    Raises:
        HTTPException: Si no hay token válido
    """
    try:
        token_jti = getattr(request.state, 'token_jti', None)
        
        if not token_jti:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="JTI de token no disponible"
            )
        
        return token_jti
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting token JTI: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error obteniendo JTI de token"
        )


# ==========================================
# DEPENDENCIES OPCIONALES (NO REQUIEREN AUTH)
# ==========================================

async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Dependency opcional para obtener usuario si está autenticado
    
    No falla si no hay autenticación, retorna None.
    Útil para endpoints que funcionan con o sin autenticación.
    
    Returns:
        Dict con info del usuario o None si no está autenticado
    """
    try:
        if not credentials:
            return None
        
        # Intentar autenticación
        await authenticate_request(request)
        
        # Si fue exitosa, retornar información del usuario
        return getattr(request.state, 'user', None)
        
    except Exception:
        # Si falla la autenticación, retornar None silenciosamente
        return None


async def get_optional_current_user_id(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[int]:
    """
    Dependency opcional para obtener user ID si está autenticado
    
    Returns:
        ID del usuario o None si no está autenticado
    """
    try:
        if not credentials:
            return None
        
        await authenticate_request(request)
        return getattr(request.state, 'user_id', None)
        
    except Exception:
        return None


# ==========================================
# DEPENDENCIES DE AUTORIZACIÓN (PERMISOS/ROLES)
# ==========================================

def require_permissions(*required_permissions: str):
    """
    Factory para crear dependency que requiere permisos específicos
    
    Args:
        *required_permissions: Lista de permisos requeridos
        
    Returns:
        Dependency function
        
    Example:
        @app.get("/admin", dependencies=[Depends(require_permissions("ADMIN.VIEW"))])
    """
    async def permission_dependency(
        request: Request,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> None:
        try:
            user_permissions = current_user.get("permissions", [])
            
            # Verificar que el usuario tenga TODOS los permisos requeridos
            missing_permissions = []
            for permission in required_permissions:
                if permission not in user_permissions:
                    missing_permissions.append(permission)
            
            if missing_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permisos insuficientes. Requeridos: {', '.join(missing_permissions)}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking permissions: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verificando permisos"
            )
    
    return permission_dependency


def require_any_permission(*required_permissions: str):
    """
    Factory para crear dependency que requiere AL MENOS UNO de los permisos
    
    Args:
        *required_permissions: Lista de permisos (necesita solo uno)
        
    Returns:
        Dependency function
    """
    async def permission_dependency(
        request: Request,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> None:
        try:
            user_permissions = current_user.get("permissions", [])
            
            # Verificar que tenga al menos uno de los permisos
            has_permission = any(
                permission in user_permissions 
                for permission in required_permissions
            )
            
            if not has_permission:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Se requiere uno de estos permisos: {', '.join(required_permissions)}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking permissions: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verificando permisos"
            )
    
    return permission_dependency


def require_roles(*required_roles: str):
    """
    Factory para crear dependency que requiere roles específicos
    
    Args:
        *required_roles: Lista de roles requeridos
        
    Returns:
        Dependency function
        
    Example:
        @app.get("/admin", dependencies=[Depends(require_roles("ADMIN", "SUPER_ADMIN"))])
    """
    async def role_dependency(
        request: Request,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> None:
        try:
            user_roles = current_user.get("roles", [])
            
            # Verificar que el usuario tenga TODOS los roles requeridos
            missing_roles = []
            for role in required_roles:
                if role not in user_roles:
                    missing_roles.append(role)
            
            if missing_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Roles insuficientes. Requeridos: {', '.join(missing_roles)}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking roles: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verificando roles"
            )
    
    return role_dependency


def require_any_role(*required_roles: str):
    """
    Factory para crear dependency que requiere AL MENOS UNO de los roles
    
    Args:
        *required_roles: Lista de roles (necesita solo uno)
        
    Returns:
        Dependency function
    """
    async def role_dependency(
        request: Request,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> None:
        try:
            user_roles = current_user.get("roles", [])
            
            # Verificar que tenga al menos uno de los roles
            has_role = any(role in user_roles for role in required_roles)
            
            if not has_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Se requiere uno de estos roles: {', '.join(required_roles)}"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error checking roles: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verificando roles"
            )
    
    return role_dependency


# ==========================================
# DEPENDENCIES ADMINISTRATIVAS
# ==========================================

async def require_admin(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> None:
    """
    Dependency que requiere privilegios de administrador
    
    Verifica que el usuario tenga rol de admin o permisos administrativos.
    
    Raises:
        HTTPException: Si no tiene privilegios de admin
    """
    try:
        user_roles = current_user.get("roles", [])
        user_permissions = current_user.get("permissions", [])
        
        # Verificar roles administrativos
        admin_roles = ["SUPER_ADMIN", "ADMIN"]
        has_admin_role = any(role in user_roles for role in admin_roles)
        
        # Verificar permisos administrativos
        admin_permissions = ["ADMIN.ALL", "SYSTEM.ADMIN"]
        has_admin_permission = any(permission in user_permissions for permission in admin_permissions)
        
        if not (has_admin_role or has_admin_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requieren privilegios de administrador"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking admin privileges: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verificando privilegios administrativos"
        )


async def require_super_admin(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> None:
    """
    Dependency que requiere privilegios de super administrador
    
    Raises:
        HTTPException: Si no tiene privilegios de super admin
    """
    try:
        user_roles = current_user.get("roles", [])
        
        if "SUPER_ADMIN" not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Se requieren privilegios de super administrador"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking super admin privileges: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error verificando privilegios de super administrador"
        )


# ==========================================
# DEPENDENCIES DE VERIFICACIÓN DE USUARIO
# ==========================================

def require_user_or_admin(user_id_field: str = "user_id"):
    """
    Factory para crear dependency que permite acceso al propio usuario o admin
    
    Args:
        user_id_field: Nombre del campo que contiene el user_id en path/query params
        
    Returns:
        Dependency function
        
    Example:
        @app.get("/users/{user_id}", dependencies=[Depends(require_user_or_admin("user_id"))])
    """
    async def user_or_admin_dependency(
        request: Request,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ) -> None:
        try:
            # Obtener user_id del path/query parameters
            path_params = request.path_params
            query_params = request.query_params
            
            target_user_id = path_params.get(user_id_field) or query_params.get(user_id_field)
            
            if not target_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Parámetro {user_id_field} requerido"
                )
            
            try:
                target_user_id = int(target_user_id)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Parámetro {user_id_field} debe ser un entero válido"
                )
            
            current_user_id = current_user.get("user_id")
            user_roles = current_user.get("roles", [])
            
            # Permitir si es el mismo usuario o si es admin
            is_same_user = current_user_id == target_user_id
            is_admin = any(role in ["SUPER_ADMIN", "ADMIN"] for role in user_roles)
            
            if not (is_same_user or is_admin):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo puedes acceder a tu propia información o ser administrador"
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in user or admin check: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error verificando permisos de usuario"
            )
    
    return user_or_admin_dependency


# ==========================================
# DEPENDENCIES DE RATE LIMITING ESPECÍFICO
# ==========================================

def require_rate_limit_check(limit: int, window_seconds: int = 60):
    """
    Factory para crear dependency de rate limiting específico para endpoints
    
    Args:
        limit: Número máximo de requests
        window_seconds: Ventana de tiempo en segundos
        
    Returns:
        Dependency function
    """
    async def rate_limit_dependency(
        request: Request,
        current_user_id: Optional[int] = Depends(get_optional_current_user_id)
    ) -> None:
        try:
            # Determinar clave para rate limiting
            if current_user_id:
                rate_limit_key = f"endpoint_user_{current_user_id}_{request.url.path}"
            else:
                client_ip = getattr(request.state, 'ip_address', 'unknown')
                rate_limit_key = f"endpoint_ip_{client_ip}_{request.url.path}"
            
            # Verificar rate limit
            from cache.services.rate_limit_service import check_rate_limit
            
            allowed, remaining, reset_time = await check_rate_limit(
                key=rate_limit_key,
                limit=limit,
                window_seconds=window_seconds
            )
            
            if not allowed:
                retry_after = max(1, reset_time - int(time.time()))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demasiadas solicitudes para este endpoint",
                    headers={"Retry-After": str(retry_after)}
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in rate limit check: {e}")
            # En caso de error, permitir la solicitud (fail open)
            pass
    
    return rate_limit_dependency


# ==========================================
# UTILITIES Y HELPERS
# ==========================================

async def get_user_permissions(user_id: int) -> List[str]:
    """
    Helper para obtener permisos de usuario desde cache
    
    Args:
        user_id: ID del usuario
        
    Returns:
        Lista de permisos del usuario
    """
    try:
        permissions_data = await user_cache_service.get_user_permissions(user_id)
        return permissions_data.get("permissions", [])
        
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        return []


async def get_user_roles(user_id: int) -> List[str]:
    """
    Helper para obtener roles de usuario desde cache
    
    Args:
        user_id: ID del usuario
        
    Returns:
        Lista de roles del usuario
    """
    try:
        permissions_data = await user_cache_service.get_user_permissions(user_id)
        return permissions_data.get("roles", [])
        
    except Exception as e:
        logger.error(f"Error getting user roles: {e}")
        return []


def check_permission(user_permissions: List[str], required_permission: str) -> bool:
    """
    Helper para verificar si una lista de permisos incluye el requerido
    
    Args:
        user_permissions: Lista de permisos del usuario
        required_permission: Permiso requerido
        
    Returns:
        True si tiene el permiso
    """
    # Verificación exacta
    if required_permission in user_permissions:
        return True
    
    # Verificación con wildcards (ej: ADMIN.* incluye ADMIN.VIEW)
    permission_parts = required_permission.split(".")
    if len(permission_parts) >= 2:
        wildcard_permission = f"{permission_parts[0]}.*"
        if wildcard_permission in user_permissions:
            return True
    
    # Verificación de permisos globales
    if "ADMIN.ALL" in user_permissions or "SYSTEM.ADMIN" in user_permissions:
        return True
    
    return False


def check_role(user_roles: List[str], required_role: str) -> bool:
    """
    Helper para verificar si una lista de roles incluye el requerido
    
    Args:
        user_roles: Lista de roles del usuario
        required_role: Rol requerido
        
    Returns:
        True si tiene el rol
    """
    return required_role in user_roles