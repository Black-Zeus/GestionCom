"""
Middleware de autenticación JWT con doble secreto integrado a tu estructura existente
"""
import asyncio
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

from core.security import jwt_manager
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.exceptions import (
    TokenMissingException,
    TokenInvalidException,
    TokenBlacklistedException,
    UserInactiveException,
    AuthenticationException
)


async def authenticate_request(request: Request) -> None:
    """
    Verifica la autenticación del usuario mediante JWT con doble secreto.
    Versión actualizada de tu función original.
    """
    # ==========================================
    # 1. EXTRAER TOKEN DEL HEADER
    # ==========================================
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        raise TokenMissingException()
    
    token = auth_header.split("Bearer ")[-1].strip()
    
    if not token:
        raise TokenMissingException()
    
    try:
        # ==========================================
        # 2. EXTRACCIÓN INICIAL (SIN VALIDAR)
        # ==========================================
        
        # Extraer user_id para obtener user_secret (sin validar firma aún)
        user_id = jwt_manager.extract_user_id_unsafe(token)
        if not user_id:
            raise TokenInvalidException("No se pudo extraer información del usuario del token")
        
        # Extraer JTI para verificar blacklist
        jti = jwt_manager.extract_jti_unsafe(token)
        if not jti:
            raise TokenInvalidException("Token sin identificador válido")
        
        # ==========================================
        # 3. VERIFICAR BLACKLIST (REDIS)
        # ==========================================
        
        # Importación dinámica para evitar circular imports
        from cache.services.blacklist_service import is_token_blacklisted
        
        if await is_token_blacklisted(jti, user_id):
            raise TokenBlacklistedException("Token ha sido revocado")
        
        # ==========================================
        # 4. OBTENER USER SECRET (CACHE/BD)
        # ==========================================
        
        # Importación dinámica para evitar circular imports
        from cache.services.user_cache import get_user_secret
        
        user_secret = await get_user_secret(user_id)
        if not user_secret:
            raise AuthenticationException(
                message="Error de autenticación",
                error_code=ErrorCode.AUTH_SECRET_MISMATCH,
                details="No se pudo obtener información de seguridad del usuario"
            )
        
        # ==========================================
        # 5. VALIDAR TOKEN CON DOBLE SECRETO
        # ==========================================
        
        payload = jwt_manager.decode_token(token, user_secret)
        
        # ==========================================
        # 6. VALIDACIONES ADICIONALES
        # ==========================================
        
        # Verificar que el usuario esté activo
        is_active = payload.get("is_active", False)
        if not is_active:
            raise UserInactiveException()
        
        # Verificar que sea un access token
        token_type = payload.get("token_type")
        if token_type != "access":
            raise TokenInvalidException("Se requiere un access token")
        
        # ==========================================
        # 7. GUARDAR INFORMACIÓN EN REQUEST STATE
        # ==========================================
        
        # Información básica del usuario
        request.state.user = {
            "user_id": payload.get("user_id"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "is_active": payload.get("is_active"),
            "roles": payload.get("roles", []),
            "permissions": payload.get("permissions", [])
        }
        
        # IDs para referencia rápida
        request.state.user_id = payload.get("user_id")
        request.state.username = payload.get("username")
        
        # Información del token
        request.state.token_jti = payload.get("jti")
        request.state.token_issued_at = payload.get("iat")
        request.state.token_expires_at = payload.get("exp")
        
        # Flag de autenticación exitosa
        request.state.authenticated = True
        
    except AuthenticationException:
        # Re-lanzar excepciones de autenticación tal como están
        raise
        
    except Exception as e:
        # Cualquier otro error se convierte en token inválido
        raise TokenInvalidException(f"Error al procesar token: {str(e)}")


# ==========================================
# FUNCIONES DE UTILIDAD PARA EL MIDDLEWARE
# ==========================================

def get_current_user_from_request(request: Request) -> Optional[Dict[str, Any]]:
    """
    Obtener información del usuario actual desde el request state
    """
    return getattr(request.state, 'user', None)


def get_current_user_id_from_request(request: Request) -> Optional[int]:
    """
    Obtener ID del usuario actual desde el request state
    """
    return getattr(request.state, 'user_id', None)


def is_user_authenticated(request: Request) -> bool:
    """
    Verificar si el usuario está autenticado
    """
    return getattr(request.state, 'authenticated', False)


def has_permission(request: Request, permission: str) -> bool:
    """
    Verificar si el usuario tiene un permiso específico
    """
    user = get_current_user_from_request(request)
    if not user:
        return False
    
    permissions = user.get("permissions", [])
    return permission in permissions


def has_role(request: Request, role: str) -> bool:
    """
    Verificar si el usuario tiene un rol específico
    """
    user = get_current_user_from_request(request)
    if not user:
        return False
    
    roles = user.get("roles", [])
    return role in roles


# ==========================================
# MIDDLEWARE EXCEPTION HANDLER
# ==========================================

def create_auth_error_response(exception: Exception, request: Request) -> JSONResponse:
    """
    Crear respuesta de error para excepciones de autenticación
    Integrado con tu ResponseManager
    """
    if isinstance(exception, AuthenticationException):
        return ResponseManager.from_exception(exception, request)
    
    elif isinstance(exception, HTTPException):
        # Convertir HTTPException a nuestro formato
        if exception.status_code == 401:
            return ResponseManager.unauthorized(
                message=exception.detail,
                request=request
            )
        elif exception.status_code == 403:
            return ResponseManager.forbidden(
                message=exception.detail,
                request=request
            )
        else:
            return ResponseManager.error(
                message=exception.detail,
                status_code=exception.status_code,
                request=request
            )
    
    else:
        # Error inesperado en autenticación
        return ResponseManager.internal_server_error(
            message="Error en el sistema de autenticación",
            details=str(exception),
            request=request
        )


# ==========================================
# COMPATIBILIDAD CON TU CÓDIGO ACTUAL
# ==========================================

# Esta función mantiene compatibilidad con tu authMiddleware.py actual
# pero ahora usa el sistema JWT mejorado internamente
async def verify_jwt_token_legacy(token: str) -> Dict[str, Any]:
    """
    Función de compatibilidad para mantener tu código actual funcionando.
    
    IMPORTANTE: Esta función hace una validación simplificada.
    Para máxima seguridad, usar authenticate_request() completa.
    """
    try:
        # Extraer user_id sin validar
        user_id = jwt_manager.extract_user_id_unsafe(token)
        if not user_id:
            raise ValueError("Token inválido")
        
        # Obtener user secret (requiere imports dinámicos)
        from cache.services.user_cache import get_user_secret
        
        user_secret = await get_user_secret(user_id)
        if not user_secret:
            raise ValueError("Usuario no encontrado")
        
        # Validar token completo
        payload = jwt_manager.decode_token(token, user_secret)
        
        return payload
        
    except Exception as e:
        raise ValueError(f"Token inválido: {str(e)}")