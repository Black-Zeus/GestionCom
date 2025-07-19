"""
volumes/backend-api/routes/auth.py
Router de autenticación - Refactorizado con flujo único
Solo contiene endpoints principales, toda la lógica en auth_helpers
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse

from database.schemas.auth import (
    LoginRequest, 
    TokenValidateRequest, 
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AdminChangePasswordRequest
)
from database.schemas.token import TokenValidateResponse
from core.response import ResponseManager
from core.constants import ErrorCode, HTTPStatus
from core.config import settings

# Import del helper principal
from utils.auth_helpers import (
    AuthHelper,
    extract_bearer_token,
    get_client_ip
)

# Import para validación de usuario autenticado
from utils.permissions_utils import get_current_user




# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Authentication"],
    responses={
        401: {"description": "Token inválido o expirado"},
        403: {"description": "Acceso denegado"},
        429: {"description": "Demasiadas solicitudes"},
        500: {"description": "Error interno del servidor"}
    }
)

# Inicializar helper de autenticación
auth_helper = AuthHelper()

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@router.get("/", response_class=JSONResponse)
async def auth_info(request: Request):
    """Información básica del sistema de autenticación"""
    from utils.routes_helper import get_auth_info
    return await  get_auth_info(router, request)

@router.post("/login", response_class=JSONResponse)
async def login(login_data: LoginRequest, request: Request):
    """Autenticar usuario y generar tokens de acceso"""
    
    logger.info(f"Intento de login para usuario: {login_data.username}")
    
    client_ip = get_client_ip(request)
    user_agent = request.headers.get('user-agent', 'unknown')
    
    return await auth_helper.authenticate_user(
        login_data=login_data,
        client_ip=client_ip,
        user_agent=user_agent,
        request=request
    )

@router.post("/validate-token", response_class=JSONResponse)
async def validate_token(token_data: TokenValidateRequest, request: Request):
    """Verificar validez y estado de un token JWT"""
    
    if not token_data.token:
        response_data = TokenValidateResponse(
            valid=False,
            status="invalid",
            reason="Token faltante",
            validated_at=datetime.now(timezone.utc)
        )
        return ResponseManager.success(
            data=response_data.model_dump(),
            message="Validación completada",
            request=request
        )
    
    validation_result = await auth_helper.validate_token(token_data.token)
    
    response_data = TokenValidateResponse(
        valid=validation_result["valid"],
        status=validation_result["status"],
        reason=validation_result["reason"],
        validated_at=datetime.now(timezone.utc)
    )
    
    response_dict = response_data.model_dump()
    if validation_result["valid"] and "payload" in validation_result:
        payload = validation_result["payload"]
        response_dict.update({
            "user_id": payload.get("user_id"),
            "username": payload.get("username"),
            "expires_at": payload.get("exp")
        })
    
    return ResponseManager.success(
        data=response_dict,
        message="Validación completada",
        request=request
    )

@router.post("/refresh", response_class=JSONResponse)
async def refresh_token(request: Request):
    """Renovar token de acceso usando refresh token"""
    
    # Extraer refresh token del header Authorization
    refresh_token = extract_bearer_token(request)
    if not refresh_token:
        return ResponseManager.error(
            message="Refresh token requerido",
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code=ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            details="Header Authorization con Bearer refresh_token es requerido",
            request=request
        )

    try:
        client_ip = get_client_ip(request)
        user_agent = request.headers.get('user-agent', 'unknown')
        
        # Llamar al helper para renovar tokens
        refresh_result = await auth_helper.refresh_access_token(
            refresh_token=refresh_token,
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        if refresh_result["success"]:
            response_data = {
                "access_token": refresh_result["access_token"],
                "refresh_token": refresh_result["refresh_token"], 
                "token_type": "bearer",
                "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "refreshed_at": datetime.now(timezone.utc).isoformat()
            }
            
            if "username" in refresh_result:
                response_data["username"] = refresh_result["username"]
                logger.info(f"Token renovado exitosamente para usuario: {refresh_result['username']}")
            
            return ResponseManager.success(
                data=response_data,
                message="Token renovado exitosamente",
                request=request
            )
        else:
            error_code = ErrorCode.AUTH_REFRESH_TOKEN_INVALID
            if refresh_result.get("reason") == "expired":
                error_code = ErrorCode.AUTH_TOKEN_EXPIRED
            elif refresh_result.get("reason") == "blacklisted":
                error_code = ErrorCode.AUTH_TOKEN_BLACKLISTED
            
            return ResponseManager.error(
                message="No se pudo renovar el token",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=error_code,
                details=refresh_result.get("error", "Refresh token inválido"),
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en refresh token: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante renovación de token",
            details=str(e),
            request=request
        )

@router.post("/logout", response_class=JSONResponse)
async def logout(request: Request):
    """Cerrar sesión y revocar tokens del usuario"""
    
    access_token = extract_bearer_token(request)
    if not access_token:
        return ResponseManager.error(
            message="Token requerido para logout",
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code=ErrorCode.AUTH_TOKEN_MISSING,
            details="Header Authorization con Bearer token es requerido",
            request=request
        )

    try:
        client_ip = get_client_ip(request)
        logout_result = await auth_helper.logout_user(access_token, client_ip)
        
        if logout_result["success"]:
            response_data = {
                "logged_out": True,
                "logout_at": datetime.now(timezone.utc).isoformat(),
                "method": logout_result["method"]
            }
            
            if "username" in logout_result:
                response_data["username"] = logout_result["username"]
                logger.info(f"Logout exitoso para usuario: {logout_result['username']}")
            
            if "tokens_revoked" in logout_result:
                response_data["tokens_revoked"] = logout_result["tokens_revoked"]
            
            return ResponseManager.success(
                data=response_data,
                message="Logout exitoso",
                request=request
            )
        else:
            return ResponseManager.error(
                message="Error durante logout",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                details=logout_result.get("error", "Error desconocido"),
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en logout: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante logout",
            details=str(e),
            request=request
        )
    
# ==========================================
# ENDPOINTS DE GESTIÓN DE CONTRASEÑAS
# ==========================================

@router.put("/change-password", response_class=JSONResponse)
async def change_password(
    password_data: ChangePasswordRequest, 
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Cambiar contraseña del usuario autenticado"""
    
    try:
        username = current_user.get("username", "unknown")
        user_id = current_user.get("user_id")
        
        logger.info(f"Cambio de contraseña para usuario: {username}")
        
        # Validar que las contraseñas nuevas coincidan
        if password_data.new_password != password_data.confirm_password:
            return ResponseManager.error(
                message="Las contraseñas no coinciden",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                details="new_password y confirm_password deben ser iguales",
                request=request
            )
        
        # Verificar contraseña actual y cambiar contraseña
        from database import get_async_session
        from database.models.users import User
        from sqlalchemy import select, update
        from core.password_manager import verify_user_password, hash_user_password
        
        async for db in get_async_session():
            # Obtener usuario de la BD
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return ResponseManager.error(
                    message="Usuario no encontrado",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND,
                    request=request
                )
            
            # Verificar contraseña actual
            if not verify_user_password(password_data.current_password, user.password_hash):
                return ResponseManager.error(
                    message="Contraseña actual incorrecta",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                    details="La contraseña actual no es correcta",
                    request=request
                )
            
            # Generar hash de nueva contraseña
            try:
                new_password_hash = hash_user_password(password_data.new_password)
            except Exception as e:
                logger.error(f"Error en cambio de contraseña: {e}")
                return ResponseManager.error(
                    message="Contraseña no cumple los requisitos de seguridad.",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                    details=str(e),
                    request=request
                )

            # Actualizar contraseña en BD
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(
                    password_hash=new_password_hash,
                    updated_at=datetime.now(timezone.utc)
                )
            )
            await db.commit()
            
            result = {
                "user_id": user_id,
                "username": username,
                "password_changed": True,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "tokens_invalidated": False,
                "changed_by": "self",
                "message": "Contraseña cambiada exitosamente. Su sesión actual permanece activa."
            }
            
            logger.info(f"Contraseña cambiada exitosamente para usuario: {username}")
            
            return ResponseManager.success(
                data=result,
                message="Contraseña cambiada exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en cambio de contraseña: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante cambio de contraseña",
            details=str(e),
            request=request
        )

@router.put("/change-password-by-admin", response_class=JSONResponse)
async def admin_change_password(
    admin_password_data: AdminChangePasswordRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Cambiar contraseña de cualquier usuario (solo administradores)"""
    
    try:
        admin_username = current_user.get("username", "unknown")
        admin_user_id = current_user.get("user_id")
        admin_roles = current_user.get("roles", [])
        
        # Verificar que el usuario actual es administrador
        if "ADMIN" not in admin_roles:
            logger.warning(f"Intento de cambio de contraseña admin por usuario no autorizado: {admin_username}")
            return ResponseManager.error(
                message="Acceso denegado",
                status_code=HTTPStatus.FORBIDDEN,
                error_code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
                details="Se requieren permisos de administrador",
                request=request
            )
        
        logger.info(f"Cambio de contraseña admin por: {admin_username} para usuario ID: {admin_password_data.target_user_id}")
        
        # Validar que las contraseñas nuevas coincidan
        if admin_password_data.new_password != admin_password_data.confirm_password:
            return ResponseManager.error(
                message="Las contraseñas no coinciden",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                details="new_password y confirm_password deben ser iguales",
                request=request
            )
        
        from database import get_async_session
        from database.models.users import User
        from sqlalchemy import select, update
        from core.password_manager import hash_user_password
        
        async for db in get_async_session():
            # Obtener usuario target
            query = select(User).where(User.id == admin_password_data.target_user_id)
            result = await db.execute(query)
            target_user = result.scalar_one_or_none()
            
            if not target_user:
                return ResponseManager.error(
                    message="Usuario objetivo no encontrado",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND,
                    details=f"No existe usuario con ID: {admin_password_data.target_user_id}",
                    request=request
                )
            
            # Generar hash de nueva contraseña
            new_password_hash = hash_user_password(admin_password_data.new_password)
            
            # Actualizar contraseña
            await db.execute(
                update(User)
                .where(User.id == admin_password_data.target_user_id)
                .values(
                    password_hash=new_password_hash,
                    updated_at=datetime.now(timezone.utc)
                )
            )
            await db.commit()
            
            # INVALIDAR TODOS LOS TOKENS del usuario target - Crítico por seguridad
            try:
                from cache.services.user_cache import invalidate_user_secret
                await invalidate_user_secret(admin_password_data.target_user_id)
                logger.info(f"Tokens invalidados para usuario: {target_user.username}")
                tokens_invalidated = True
            except ImportError:
                logger.warning("Cache no disponible - tokens no invalidados")
                tokens_invalidated = False
            
            result = {
                "target_user_id": admin_password_data.target_user_id,
                "target_username": target_user.username,
                "password_changed": True,
                "changed_at": datetime.now(timezone.utc).isoformat(),
                "changed_by": "admin",
                "admin_user_id": admin_user_id,
                "admin_username": admin_username,
                "tokens_invalidated": tokens_invalidated,
                "reason": admin_password_data.reason or "Password reset by administrator",
                "message": f"Contraseña cambiada exitosamente para usuario: {target_user.username}. Todas las sesiones del usuario han sido cerradas."
            }
            
            # Log de auditoría crítico
            logger.info(
                f"ADMIN_PASSWORD_CHANGE - Admin: {admin_username} (ID: {admin_user_id}) "
                f"cambió contraseña de usuario: {target_user.username} (ID: {admin_password_data.target_user_id}) "
                f"- Razón: {admin_password_data.reason or 'No especificada'}"
            )
            
            return ResponseManager.success(
                data=result,
                message="Contraseña cambiada exitosamente por administrador",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en cambio de contraseña admin: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante cambio de contraseña administrativa",
            details=str(e),
            request=request
        )

@router.post("/forgot-password", response_class=JSONResponse)
async def forgot_password(
    forgot_data: ForgotPasswordRequest, 
    request: Request
):
    """Generar código de recuperación de contraseña"""
    
    try:
        logger.info(f"Solicitud de recuperación para email: {forgot_data.email}")
        
        # Verificar que el email existe en la BD
        from database import get_async_session
        from database.models.users import User
        from sqlalchemy import select
        import secrets
        
        async for db in get_async_session():
            # Buscar usuario por email
            query = select(User).where(User.email == forgot_data.email.lower())
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                # Por seguridad, no revelar si el email existe o no
                return ResponseManager.success(
                    data={
                        "email": forgot_data.email,
                        "code_sent": True,
                        "expires_in_minutes": 15,
                        "message": "Si el email existe, se enviará un código de recuperación"
                    },
                    message="Solicitud procesada",
                    request=request
                )
            
            if not user.is_active:
                return ResponseManager.error(
                    message="Cuenta de usuario inactiva",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.AUTH_USER_INACTIVE,
                    request=request
                )
            
            # Rate limiting usando Redis - CRÍTICO para seguridad
            rate_limit_key = f"forgot_password_rate:{forgot_data.email}"
            
            try:
                # Import local para evitar circular import
                from cache.redis_client import redis_client
                
                # Verificar cuántos códigos se han solicitado
                current_count = await redis_client.incr(rate_limit_key)
                
                if current_count == 1:
                    # Primera solicitud, establecer TTL (convertir minutos a segundos)
                    await redis_client.expire(rate_limit_key, settings.RATE_LIMIT_WINDOW * 60)
                
                if current_count > settings.RESET_PASSWORD_REQUESTS_PER_HOUR:
                    return ResponseManager.error(
                        message="Demasiadas solicitudes",
                        status_code=HTTPStatus.TOO_MANY_REQUESTS,
                        error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
                        details=f"Máximo {settings.RESET_PASSWORD_REQUESTS_PER_HOUR} códigos por hora. Intente más tarde.",
                        request=request
                    )
                    
            except Exception as rate_error:
                logger.error(f"Rate limiting failed (Redis): {rate_error}")
                # SIN RATE LIMITING = RIESGO DE SEGURIDAD CRÍTICO
                return ResponseManager.error(
                    message="Servicio temporalmente no disponible",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                    error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                    details="No se puede procesar la solicitud en este momento. Intente más tarde.",
                    request=request
                )
            
            # Generar código
            reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(settings.RESET_PASSWORD_CODE_LENGTH)])
            expires_at = datetime.now(timezone.utc).timestamp() + (settings.RESET_PASSWORD_CODE_EXPIRE_MINUTES * 60)
            
            # Preparar datos del código
            cache_data = {
                "code": reset_code,
                "user_id": user.id,
                "email": user.email,
                "expires_at": expires_at,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Guardar código en Redis con TTL
            reset_code_key = f"reset_code:{forgot_data.email}"
            
            try:
                # Import local para evitar circular import  
                from cache.redis_client import redis_client
                
                success = await redis_client.setex(
                    reset_code_key, 
                    settings.RESET_PASSWORD_CODE_EXPIRE_MINUTES * 60, 
                    cache_data
                )
                if not success:
                    raise Exception("Redis setex returned False")
                    
                logger.debug("Código guardado en Redis exitosamente")
                    
            except Exception as redis_error:
                logger.error(f"Error crítico guardando código en Redis: {redis_error}")
                # SIN PERSISTENCIA = NO SE PUEDE VALIDAR CÓDIGO = FALLA CRÍTICA
                return ResponseManager.error(
                    message="Servicio temporalmente no disponible",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                    error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                    details="No se puede procesar la solicitud en este momento. Intente más tarde.",
                    request=request
                )
            
            result = {
                "email": forgot_data.email,
                "code_sent": True,
                "expires_in_minutes": settings.RESET_PASSWORD_CODE_EXPIRE_MINUTES,
                "requested_at": datetime.now(timezone.utc).isoformat(),
                "message": f"Si el email es válido, se ha enviado un código de recuperación (válido por {settings.RESET_PASSWORD_CODE_EXPIRE_MINUTES} minutos)"
            }
            
            # SOLO PARA DESARROLLO - REMOVER EN PRODUCCIÓN
            if settings.DEBUG_MODE or settings.ENVIRONMENT == "dev":
                result["code"] = reset_code
                result["message"] = f"Código de recuperación: {reset_code} (válido por {settings.RESET_PASSWORD_CODE_EXPIRE_MINUTES} minutos)"
            
            logger.info(f"Código de recuperación generado para: {forgot_data.email} - {reset_code}")
            
            return ResponseManager.success(
                data=result,
                message="Código de recuperación generado",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en forgot password: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante generación de código",
            details=str(e),
            request=request
        )

@router.post("/reset-password", response_class=JSONResponse)
async def reset_password(
    reset_data: ResetPasswordRequest, 
    request: Request
):
    """Restablecer contraseña usando código de recuperación"""
    
    try:
        logger.info(f"Reset de contraseña para email: {reset_data.email}")
        
        # Validar que las contraseñas coincidan
        if reset_data.new_password != reset_data.confirm_password:
            return ResponseManager.error(
                message="Las contraseñas no coinciden",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                details="new_password y confirm_password deben ser iguales",
                request=request
            )
        
        # Validar formato del código
        if (not reset_data.reset_code or 
            len(reset_data.reset_code) != settings.RESET_PASSWORD_CODE_LENGTH or 
            not reset_data.reset_code.isdigit()):
            return ResponseManager.error(
                message="Código de recuperación inválido",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                details=f"El código debe tener exactamente {settings.RESET_PASSWORD_CODE_LENGTH} dígitos",
                request=request
            )
        
        # Verificar código usando Redis
        reset_code_key = f"reset_code:{reset_data.email}"
        
        try:
            # Import local para evitar circular import
            from cache.redis_client import redis_client
            
            # Obtener código desde Redis
            cached_data = await redis_client.get(reset_code_key)
            
            if not cached_data:
                return ResponseManager.error(
                    message="Código de recuperación inválido o expirado",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    details="El código no existe o ha expirado",
                    request=request
                )
            
            # Verificar que el código coincida
            if cached_data["code"] != reset_data.reset_code:
                return ResponseManager.error(
                    message="Código de recuperación incorrecto",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    details="El código proporcionado no es correcto",
                    request=request
                )
            
            # Verificar expiración
            if datetime.now(timezone.utc).timestamp() > cached_data["expires_at"]:
                # Eliminar código expirado
                await redis_client.delete(reset_code_key)
                return ResponseManager.error(
                    message="Código de recuperación expirado",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    details="El código ha expirado. Solicite uno nuevo.",
                    request=request
                )
            
            user_id = cached_data["user_id"]
            
        except Exception as redis_error:
            logger.error(f"Error verificando código en Redis: {redis_error}")
            return ResponseManager.error(
                message="Error verificando código de recuperación",
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                details="No se pudo verificar el código. Intente nuevamente.",
                request=request
            )
        
        # Actualizar contraseña en BD
        from database import get_async_session
        from database.models.users import User
        from sqlalchemy import select, update
        from core.password_manager import hash_user_password
        
        async for db in get_async_session():
            # Buscar usuario por ID (ya validado en forgot-password)
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user or not user.is_active:
                # Por seguridad, respuesta genérica sin revelar detalles
                return ResponseManager.error(
                    message="No se pudo procesar la solicitud",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                    details="Código inválido o usuario no disponible",
                    request=request
                )
            
            # Generar hash de nueva contraseña
            new_password_hash = hash_user_password(reset_data.new_password)
            
            # Actualizar contraseña
            await db.execute(
                update(User)
                .where(User.id == user_id)
                .values(
                    password_hash=new_password_hash,
                    updated_at=datetime.now(timezone.utc)
                )
            )
            await db.commit()
            
            # Eliminar código usado
            try:
                # Import local para evitar circular import
                from cache.redis_client import redis_client
                await redis_client.delete(reset_code_key)
                logger.debug("Código de recuperación eliminado")
            except Exception as del_error:
                logger.warning(f"No se pudo eliminar código: {del_error}")
            
            # INVALIDAR TODOS LOS TOKENS - Crítico para seguridad
            try:
                from cache.services.user_cache import invalidate_user_secret
                await invalidate_user_secret(user_id)
                logger.info(f"Tokens invalidados para usuario: {user.username}")
                tokens_invalidated = True
            except ImportError:
                logger.warning("Cache no disponible - tokens no invalidados")
                tokens_invalidated = False
            
            result = {
                "password_reset": True,
                "reset_at": datetime.now(timezone.utc).isoformat(),
                "tokens_invalidated": tokens_invalidated,
                "message": "Contraseña restablecida exitosamente. Todas las sesiones activas han sido cerradas."
            }
            
            logger.info(f"Contraseña restablecida para usuario ID: {user_id}")
            
            return ResponseManager.success(
                data=result,
                message="Contraseña restablecida exitosamente",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Error en reset password: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante restablecimiento de contraseña",
            details=str(e),
            request=request
        )