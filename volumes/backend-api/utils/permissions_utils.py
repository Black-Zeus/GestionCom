"""
volumes/backend-api/utils/permissions_utils.py
Utilidades centralizadas para manejo de permisos y autenticación
"""
import json
from fastapi import Request, HTTPException
from utils.log_helper import setup_logger
from utils.auth_helpers import AuthHelper, extract_bearer_token, get_client_ip
from core.response import ResponseManager
from core.constants import ErrorCode, ErrorType, HTTPStatus

logger = setup_logger(__name__)

# Inicializar helper de autenticación
auth_helper = AuthHelper()


async def get_current_user(request: Request) -> dict:
    """
    Dependency para obtener usuario autenticado desde el token JWT
    
    Args:
        request: Objeto Request de FastAPI
        
    Returns:
        dict: Payload del usuario autenticado
        
    Raises:
        HTTPException: 401 si no hay token o es inválido
    """
    token = extract_bearer_token(request)
    if not token:
        logger.warning(f"Acceso sin token - {request.method} {request.url.path} - IP: {get_client_ip(request)}")
        
        error_response = ResponseManager.error(
            message="Token de autenticación requerido",
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code=ErrorCode.AUTH_TOKEN_MISSING,
            error_type=ErrorType.AUTHENTICATION_ERROR,
            request=request
        )
        
        response_body = json.loads(error_response.body.decode('utf-8'))
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail=response_body)
    
    validation_result = await auth_helper.validate_token(token)
    if not validation_result["valid"]:
        logger.warning(f"Token inválido: {validation_result['reason']} - {request.method} {request.url.path} - IP: {get_client_ip(request)}")
        
        error_response = ResponseManager.error(
            message="Token inválido",
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code=ErrorCode.AUTH_TOKEN_INVALID,
            error_type=ErrorType.AUTHENTICATION_ERROR,
            details=validation_result.get("reason", "Token no válido"),
            request=request
        )
        
        response_body = json.loads(error_response.body.decode('utf-8'))
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail=response_body)
    
    return validation_result["payload"]


async def require_permission(module: str, actions, request: Request) -> dict:
    """
    Dependency para verificar permisos específicos de módulo y acción(es)
    
    Args:
        module: Nombre del módulo (ej: 'WAREHOUSE', 'USER', 'PRODUCT')
        actions: Acción o lista de acciones (ej: 'READ', ['read', 'manager', 'supervisor'])
        request: Objeto Request de FastAPI
        
    Returns:
        dict: Payload del usuario autenticado si tiene permisos
        
    Raises:
        HTTPException: 401 si no está autenticado, 403 si no tiene permisos
    """
    # Primero obtener usuario autenticado
    user_payload = await get_current_user(request)
    
    # Convertir actions a lista si es string
    if isinstance(actions, str):
        actions = [actions]
    
    # Verificar permisos específicos
    user_permissions = user_payload.get("permissions", [])
    username = user_payload.get("username", "unknown")
    user_id = user_payload.get("user_id", "unknown")
    
    # Crear lista de permisos válidos para este módulo y acciones
    valid_permissions = []
    for action in actions:
        valid_permissions.append(f"{module}_{action}".upper())
    
    # Agregar permiso de admin del módulo
    admin_permission = f"{module}_ADMIN".upper()
    valid_permissions.append(admin_permission)
    
    # Verificar si tiene al menos uno de los permisos válidos
    has_permission = any(perm in user_permissions for perm in valid_permissions)
    
    if not has_permission:
        # Log para auditoría (manteniendo info necesaria para seguridad)
        actions_str = ", ".join(actions)
        logger.warning(
            f"ACCESO DENEGADO - Usuario: {username} (ID: {user_id}) "
            f"sin permisos para {module}_{actions_str} en {request.method} {request.url.path} "
            f"- IP: {get_client_ip(request)}"
        )
        
        error_response = ResponseManager.error(
            message="Acceso denegado",
            status_code=HTTPStatus.FORBIDDEN,
            error_code=ErrorCode.PERMISSION_DENIED,
            error_type=ErrorType.PERMISSION_ERROR,
            details=f"Se requieren permisos de {module} para esta operación",
            request=request
        )
        
        response_body = json.loads(error_response.body.decode('utf-8'))
        raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=response_body)
    
    return user_payload