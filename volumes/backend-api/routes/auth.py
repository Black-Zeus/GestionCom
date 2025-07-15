"""
Router de autenticación - Versión simplificada
Endpoints principales de autenticación con funciones auxiliares separadas
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse

from database.schemas.auth import (
    LoginRequest, 
    TokenValidateRequest, 
    PasswordStrengthCheck, 
    PasswordStrengthResponse
)
from database.schemas.token import TokenValidateResponse
from core.config import settings
from core.response import ResponseManager
from core.constants import ErrorCode

# Import auth helpers
from utils.auth_helpers import (
    check_module_availability,
    get_client_ip,
    extract_bearer_token,
    authenticate_with_service,
    authenticate_manual,
    authenticate_testing,
    check_duplicate_request,
    check_rate_limits,
    register_failed_attempt,
    validate_jwt_token,
    logout_user,
    validate_password_strength
)

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Authentication"],
    responses={
        401: {"description": "Token inválido o expirado"},
        403: {"description": "Acceso denegado"},
        429: {"description": "Demasiadas solicitudes"},
        500: {"description": "Error interno del servidor"}
    }
)

security = HTTPBearer()

# Check module availability once at startup
MODULES = check_module_availability()

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@router.get("/", response_class=JSONResponse)
async def auth_info(request: Request):
    """Información básica del sistema de autenticación"""
    
    data = {
        "name": "Sistema de Autenticación",
        "version": "2.1.0",
        "status": "active",
        "available_endpoints": [
            "POST /auth/login",
            "POST /auth/logout",
            "POST /auth/validate-token", 
            "GET /auth/password-requirements",
            "POST /auth/password-strength",
            "GET /auth/health"
        ],
        "dependencies_status": MODULES
    }
    
    return ResponseManager.success(
        data=data,
        message="Información del sistema de autenticación",
        request=request
    )

@router.post("/login", response_class=JSONResponse)
async def login(login_data: LoginRequest, request: Request):
    """
    Endpoint de autenticación JWT
    
    Features:
    - Validación de credenciales
    - Generación de tokens JWT
    - Rate limiting
    - Prevención de requests duplicados
    """
    logger.info(f"Login attempt for user: {login_data.username}")
    
    # ==========================================
    # 1. VALIDACIONES BÁSICAS
    # ==========================================
    
    if not login_data.username or not login_data.password:
        return ResponseManager.error(
            message="Username y password son requeridos",
            status_code=400,
            error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
            details="Ambos campos son obligatorios",
            request=request
        )
    
    # Extract request information
    client_ip = get_client_ip(request)
    user_agent = request.headers.get('user-agent', 'unknown')
    username = login_data.username.strip().lower()
    
    # ==========================================
    # 2. VERIFICAR REQUESTS DUPLICADOS
    # ==========================================
    
    is_duplicate = await check_duplicate_request(client_ip, username, login_data.password, MODULES)
    if is_duplicate:
        logger.warning(f"Duplicate request detected for {username} from {client_ip}")
        return ResponseManager.error(
            message="Request duplicado detectado",
            status_code=429,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            details="Por favor espere antes de intentar nuevamente",
            request=request
        )
    
    # ==========================================
    # 3. VERIFICAR RATE LIMITING
    # ==========================================
    
    rate_limit_ok, block_reason = await check_rate_limits(client_ip, username, MODULES)
    if not rate_limit_ok:
        if block_reason == "IP blocked":
            return ResponseManager.error(
                message="Demasiados intentos de login desde esta IP",
                status_code=429,
                error_code=ErrorCode.RATE_LIMIT_IP_BLOCKED,
                details="Intente nuevamente en 1 hora",
                request=request
            )
        else:  # User blocked
            return ResponseManager.error(
                message="Demasiados intentos fallidos para este usuario",
                status_code=429,
                error_code=ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED,
                details=f"Cuenta bloqueada por {settings.LOCKOUT_DURATION_MINUTES} minutos",
                request=request
            )
    
    # ==========================================
    # 4. AUTENTICACIÓN PRINCIPAL
    # ==========================================
    
    try:
        # Choose authentication strategy based on available modules
        if MODULES['auth_service'] and MODULES['database']:
            return await authenticate_with_service(
                login_data, client_ip, user_agent, username, request, MODULES
            )
        elif MODULES['database']:
            return await authenticate_manual(
                login_data, client_ip, user_agent, username, request, MODULES
            )
        else:
            return await authenticate_testing(
                login_data, client_ip, user_agent, username, request, MODULES
            )
            
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        
        # Register failed attempt
        await register_failed_attempt(client_ip, username, None, MODULES)
        
        return ResponseManager.internal_server_error(
            message="Error inesperado durante la autenticación",
            details=str(e),
            request=request
        )

@router.post("/validate-token", response_class=JSONResponse)
async def validate_token(token_data: TokenValidateRequest, request: Request):
    """Validar tokens JWT"""
    
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
    
    # Validate token using helper
    validation_result = await validate_jwt_token(token_data.token, MODULES)
    
    response_data = TokenValidateResponse(
        valid=validation_result["valid"],
        status=validation_result["status"],
        reason=validation_result["reason"],
        validated_at=datetime.now(timezone.utc)
    )
    
    # Add payload data if token is valid
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

@router.post("/logout", response_class=JSONResponse)
async def logout(request: Request):
    """Logout - revoca tokens del usuario"""
    
    # Extract token from header
    access_token = extract_bearer_token(request)
    if not access_token:
        return ResponseManager.error(
            message="Token requerido para logout",
            status_code=401,
            error_code=ErrorCode.AUTH_TOKEN_MISSING,
            details="Header Authorization con Bearer token es requerido",
            request=request
        )
    
    client_ip = get_client_ip(request)
    
    try:
        # Logout using helper function
        logout_result = await logout_user(access_token, client_ip, MODULES)
        
        if logout_result["success"]:
            response_data = {
                "logged_out": True,
                "logout_at": datetime.now(timezone.utc).isoformat(),
                "method": logout_result["method"]
            }
            
            # Add additional info if available
            if "username" in logout_result:
                response_data["username"] = logout_result["username"]
                logger.info(f"Logout successful for user: {logout_result['username']}")
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
                status_code=500,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                details=logout_result.get("error", "Error desconocido"),
                request=request
            )
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return ResponseManager.internal_server_error(
            message="Error durante logout",
            details=str(e),
            request=request
        )

@router.get("/password-requirements", response_class=JSONResponse)
async def get_password_requirements(request: Request):
    """Obtener requisitos de contraseña del sistema"""
    
    requirements = {
        "min_length": 8,
        "max_length": 128,
        "require_lowercase": True,
        "require_uppercase": True,
        "require_digit": True,
        "require_special": True,
        "forbidden_patterns": [
            "123456", "password", "qwerty", "admin", "user"
        ],
        "special_characters": "!@#$%^&*()_+-=[]{}|;:,.<>?",
        "password_history": 5,
        "expiration_days": 90,
        "description": "Contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y caracteres especiales"
    }
    
    return ResponseManager.success(
        data=requirements,
        message="Requisitos de contraseña obtenidos",
        request=request
    )

@router.post("/password-strength", response_class=JSONResponse)
async def check_password_strength(password_data: PasswordStrengthCheck, request: Request):
    """Verificar fortaleza de contraseña según los requisitos del sistema"""
    
    try:
        # Use helper function to validate password strength
        strength_result = validate_password_strength(password_data.password)
        
        response_data = PasswordStrengthResponse(
            is_valid=strength_result["is_valid"],
            score=strength_result["score"],
            errors=strength_result["errors"],
            suggestions=strength_result["suggestions"]
        )
        
        return ResponseManager.success(
            data=response_data.model_dump(),
            message="Análisis de fortaleza completado",
            request=request
        )
        
    except Exception as e:
        logger.error(f"Password strength check error: {e}")
        return ResponseManager.internal_server_error(
            message="Error verificando fortaleza de contraseña",
            details=str(e),
            request=request
        )

@router.get("/health", response_class=JSONResponse)
async def auth_health_check(request: Request):
    """Health check del sistema de autenticación"""
    
    try:
        # Calculate general status (exclude auth_service from calculation since manual auth works)
        critical_modules = {
            'database': MODULES['database'],
            'password_manager': MODULES['password_manager'], 
            'jwt_manager': MODULES['jwt_manager'],
            'user_cache': MODULES['user_cache'],
            'rate_limit': MODULES['rate_limit']
        }
        
        available_count = sum(critical_modules.values())
        total_count = len(critical_modules)
        health_percentage = (available_count / total_count) * 100
        
        # Determine status based on critical modules only
        if health_percentage == 100:
            status = "healthy"
            status_code = 200
        elif health_percentage >= 80:  # Allow one non-critical module to be down
            status = "healthy"
            status_code = 200
        elif health_percentage >= 60:
            status = "degraded"
            status_code = 200
        else:
            status = "unhealthy"
            status_code = 503
        
        health_data = {
            "status": status,
            "health_percentage": health_percentage,
            "dependencies": MODULES,  # Show all modules for transparency
            "critical_modules": critical_modules,  # Show which ones we actually check
            "available_endpoints": 6,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "notes": "Sistema de autenticación con JWT y doble secreto. AuthService opcional (manual auth available)",
            "authentication_methods": {
                "manual_auth": MODULES['database'] and MODULES['password_manager'],
                "service_auth": MODULES['auth_service'],
                "testing_auth": True  # Always available as fallback
            }
        }
        
        if status in ["healthy", "degraded"]:
            return ResponseManager.success(
                data=health_data,
                message=f"Sistema de autenticación {status}" + (f" ({health_percentage:.1f}%)" if status == "degraded" else ""),
                request=request
            )
        else:
            return ResponseManager.error(
                message=f"Sistema de autenticación en estado: {status}",
                status_code=status_code,
                error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                details=f"Health percentage: {health_percentage}%. Critical services failing: {[k for k, v in critical_modules.items() if not v]}",
                request=request
            )
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return ResponseManager.internal_server_error(
            message="Error en health check",
            details=str(e),
            request=request
        )

# ==========================================
# ENDPOINT DE DEBUG (TEMPORAL)
# ==========================================

@router.post("/debug-login", response_class=JSONResponse)
async def debug_login(login_data: LoginRequest, request: Request):
    """
    Endpoint temporal para debug de problemas de login
    ⚠️ SOLO PARA DESARROLLO - REMOVER EN PRODUCCIÓN
    """
    
    # Only allow in development
    if settings.ENVIRONMENT == "production":
        return ResponseManager.error(
            message="Endpoint no disponible en producción",
            status_code=403,
            error_code=ErrorCode.PERMISSION_DENIED,
            request=request
        )
    
    try:
        username = login_data.username.strip().lower()
        password = login_data.password
        
        logger.info(f"=== DEBUG LOGIN ===")
        logger.info(f"Username: {username}")
        logger.info(f"Password length: {len(password)}")
        logger.info(f"Modules available: {MODULES}")
        
        debug_data = {
            "username": username,
            "password_length": len(password),
            "modules_available": MODULES,
            "user_found": False,
            "verification_methods": {}
        }
        
        # Try to find user in database
        if MODULES['database']:
            from database import get_async_session
            from database.models.user import User
            from sqlalchemy import select
            
            async for db in get_async_session():
                if '@' in username:
                    query = select(User).where(User.email == username)
                else:
                    query = select(User).where(User.username == username)
                
                result = await db.execute(query)
                user = result.scalar_one_or_none()
                
                if user:
                    debug_data.update({
                        "user_found": True,
                        "user_id": user.id,
                        "username_db": user.username,
                        "is_active": user.is_active,
                        "password_hash_preview": user.password_hash[:20] + "..." if user.password_hash else None
                    })
                    
                    # Test password verification methods
                    if MODULES['password_manager']:
                        try:
                            from core.password_manager import verify_user_password
                            debug_data["verification_methods"]["password_manager"] = verify_user_password(password, user.password_hash)
                        except Exception as e:
                            debug_data["verification_methods"]["password_manager"] = f"Error: {e}"
                    
                    try:
                        import bcrypt
                        debug_data["verification_methods"]["bcrypt_direct"] = bcrypt.checkpw(
                            password.encode('utf-8'),
                            user.password_hash.encode('utf-8')
                        )
                    except Exception as e:
                        debug_data["verification_methods"]["bcrypt_direct"] = f"Error: {e}"
                
                break
        
        return ResponseManager.success(
            data=debug_data,
            message="Debug completado",
            request=request
        )
        
    except Exception as e:
        logger.error(f"Debug login error: {e}")
        return ResponseManager.internal_server_error(
            message="Error en debug",
            details=str(e),
            request=request
        )