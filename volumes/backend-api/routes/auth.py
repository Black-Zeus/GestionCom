"""
Router de autenticación - Versión completa
Endpoints para login, logout, validación de tokens y utilidades de auth
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.security import HTTPBearer
from fastapi.responses import JSONResponse

from database.schemas.auth import (LoginRequest, 
                              TokenValidateRequest, 
                              PasswordStrengthCheck, 
                              PasswordStrengthResponse
                            )

from database.schemas.token import (TokenValidateResponse
                            )

from core.config import settings
                                 
# ==========================================
# IMPORTS CORE REQUERIDOS
# ==========================================

from core.response import ResponseManager
from core.exceptions import (
    TokenInvalidException,
    TokenBlacklistedException
)
from core.constants import ErrorCode

# ==========================================
# IMPORTS CONDICIONALES
# ==========================================

# Database
try:
    from database import get_async_session
    from database.models.user import User
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    DATABASE_AVAILABLE = True
    print("✅ Database imports exitosos")
except ImportError as e:
    print(f"⚠️  Database no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    DATABASE_AVAILABLE = False
    AsyncSession = None
except Exception as e:
    print(f"⚠️  Database - Error inesperado: {type(e).__name__}: {e}")
    DATABASE_AVAILABLE = False
    AsyncSession = None

try:
    from core.password_manager import PasswordManager
    PASSWORD_MANAGER_AVAILABLE = True
    print("✅ PasswordManager cargado correctamente")
except ImportError as e:
    print(f"⚠️  PasswordManager no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    PASSWORD_MANAGER_AVAILABLE = False
except Exception as e:
    print(f"⚠️  PasswordManager - Error inesperado: {type(e).__name__}: {e}")
    PASSWORD_MANAGER_AVAILABLE = False

# JWT y servicios de autenticación
try:
    from core.security import jwt_manager
    JWT_MANAGER_AVAILABLE = True
    print("✅ JWT Manager cargado correctamente")
except ImportError as e:
    print(f"⚠️  JWT Manager no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    print(f"   💡 Verificar: core/security.py existe y jwt_manager está definido")
except Exception as e:
    print(f"⚠️  JWT Manager - Error inesperado: {type(e).__name__}: {e}")
    JWT_MANAGER_AVAILABLE = False

try:
    from cache.services.auth_service import auth_service
    AUTH_SERVICE_AVAILABLE = True
    print("✅ Auth Service cargado correctamente")
except ImportError as e:
    print(f"⚠️  Auth Service no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    print(f"   💡 Verificar: cache/services/auth_service.py existe y auth_service está definido")
    AUTH_SERVICE_AVAILABLE = False
except Exception as e:
    print(f"⚠️  Auth Service - Error inesperado: {type(e).__name__}: {e}")
    AUTH_SERVICE_AVAILABLE = False

try:
    from cache.services.user_cache import get_user_secret, cache_user_auth_data, get_user_permissions
    USER_CACHE_AVAILABLE = True
    print("✅ User Cache cargado correctamente")
except ImportError as e:
    print(f"⚠️  User Cache no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    print(f"   💡 Verificar: cache/services/user_cache.py existe y funciones están definidas")
    USER_CACHE_AVAILABLE = False
except Exception as e:
    print(f"⚠️  User Cache - Error inesperado: {type(e).__name__}: {e}")
    USER_CACHE_AVAILABLE = False

try:
    from cache.services.rate_limit_service import rate_limit_service
    RATE_LIMIT_AVAILABLE = True
    print("✅ Rate Limit Service cargado correctamente")
except ImportError as e:
    print(f"⚠️  Rate Limit Service no disponible - ImportError: {e}")
    print(f"   📍 Módulo específico: {e.name if hasattr(e, 'name') else 'No especificado'}")
    print(f"   💡 Verificar: cache/services/rate_limit_service.py existe y rate_limit_service está definido")
    RATE_LIMIT_AVAILABLE = False
except Exception as e:
    print(f"⚠️  Rate Limit Service - Error inesperado: {type(e).__name__}: {e}")
    RATE_LIMIT_AVAILABLE = False
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


# ==========================================
# UTILIDADES
# ==========================================

def get_client_ip(request: Request) -> str:
    """Extraer IP del cliente de manera segura"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    client_host = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
    return client_host

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@router.get("/", response_class=JSONResponse)
async def auth_info():
    """
    Información básica del sistema de autenticación
    """
    return ResponseManager.success(
        data={
            "name": "Sistema de Autenticación",
            "version": "2.0.0",
            "status": "active",
            "available_endpoints": [
                "POST /auth/login",
                "POST /auth/logout",
                "POST /auth/validate-token", 
                "GET /auth/password-requirements",
                "POST /auth/password-strength",
                "GET /auth/health"
            ],
            "dependencies_status": {
                "database": DATABASE_AVAILABLE,
                "password_manager": PASSWORD_MANAGER_AVAILABLE,
                "jwt_manager": JWT_MANAGER_AVAILABLE,
                "auth_service": AUTH_SERVICE_AVAILABLE,
                "user_cache": USER_CACHE_AVAILABLE,
                "rate_limit": RATE_LIMIT_AVAILABLE
            }
        },
        message="Información del sistema de autenticación"
    )

@router.post("/login", response_class=JSONResponse)
async def login(login_data: LoginRequest, request: Request):
    """
    Endpoint de autenticación JWT con doble secreto
    
    Autenticación completa que incluye:
    - Validación de credenciales en BD
    - Generación de JWT access + refresh tokens
    - Rate limiting de seguridad
    - Logging de eventos
    """
    try:
        # ==========================================
        # 1. VALIDACIONES INICIALES
        # ==========================================
        
        logger.info(f"Intento de login para usuario: {login_data.username}")
        
        if not login_data.username or not login_data.password:
            return ResponseManager.error(
                message="Username y password son requeridos",
                status_code=400,
                error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                details="Ambos campos son obligatorios"
            )
        
        # Extraer información del request
        client_ip = get_client_ip(request)
        user_agent = request.headers.get('user-agent', 'unknown')
        username = login_data.username.strip().lower()
        
        # ==========================================
        # 2. VERIFICAR RATE LIMITING
        # ==========================================
        
        if RATE_LIMIT_AVAILABLE:
            try:
                # ✅ Rate limit por IP - usar configuración
                ip_allowed, ip_remaining, ip_reset = await rate_limit_service.check_rate_limit(
                    key=f"login_ip_{client_ip}",
                    limit=settings.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR,  # ✅ Desde config
                    window_seconds=3600  # 1 hora fija para IP rate limit
                )
                
                if not ip_allowed:
                    logger.warning(f"Rate limit excedido para IP: {client_ip}")
                    return ResponseManager.error(
                        message="Demasiados intentos de login desde esta IP",
                        status_code=429,
                        error_code=ErrorCode.RATE_LIMIT_IP_BLOCKED,
                        details="Intente nuevamente en 1 hora"
                    )
                
                # ✅ Rate limit por usuario - usar configuración 
                user_allowed, user_remaining, user_reset = await rate_limit_service.check_rate_limit(
                    key=f"login_user_{username}",
                    limit=settings.MAX_LOGIN_ATTEMPTS,                   # ✅ Desde config
                    window_seconds=settings.LOCKOUT_DURATION_MINUTES * 60  # ✅ Desde config convertido a segundos
                )
                
                if not user_allowed:
                    logger.warning(f"Rate limit excedido para usuario: {username}")
                    return ResponseManager.error(
                        message="Demasiados intentos fallidos para este usuario",
                        status_code=429,
                        error_code=ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED,
                        details=f"Cuenta temporalmente bloqueada por {settings.LOCKOUT_DURATION_MINUTES} minutos"  # ✅ Dinámico
                    )
                    
            except Exception as e:
                logger.warning(f"Error en rate limiting: {e}, continuando")
                # ==========================================
                # 3. USAR AUTH SERVICE SI ESTÁ DISPONIBLE
                # ==========================================
                
                if AUTH_SERVICE_AVAILABLE and DATABASE_AVAILABLE:
                    try:
                        # Obtener sesión de BD
                        async for db in get_async_session():
                            # Crear el objeto de request que espera el auth_service
                            try:
                                from database.schemas.auth import LoginRequest as AuthLoginRequest
                                
                                auth_request = AuthLoginRequest(
                                    username=login_data.username,
                                    password=login_data.password,
                                    remember_me=login_data.remember_me,
                                    device_info=user_agent  # Usar user_agent del request
                                )
                                
                                # Usar función de conveniencia que sí existe
                                from cache.services.auth_service import authenticate_user_credentials
                                
                                # Autenticar usando la función de conveniencia
                                auth_result = await authenticate_user_credentials(
                                    username=login_data.username,
                                    password=login_data.password,
                                    db_session=db,
                                    ip_address=client_ip,
                                    user_agent=user_agent,
                                    remember_me=login_data.remember_me,
                                    device_info=user_agent
                                )
                                
                                # Preparar respuesta usando los datos del LoginResponse
                                response_data = {
                                    "access_token": auth_result.access_token,
                                    "refresh_token": auth_result.refresh_token,
                                    "token_type": auth_result.token_type,
                                    "expires_in": auth_result.expires_in,
                                    "user_info": {
                                        "id": auth_result.user.id,
                                        "username": auth_result.user.username,
                                        "email": auth_result.user.email,
                                        "full_name": auth_result.user.full_name,
                                        "is_active": auth_result.user.is_active,
                                        "roles": auth_result.user.roles,
                                        "permissions": auth_result.user.permissions
                                    },
                                    "session_info": {
                                        "session_id": auth_result.session_id,
                                        "login_at": auth_result.login_at.isoformat(),
                                        "ip_address": client_ip,
                                        "device_info": user_agent,
                                        "remember_me": login_data.remember_me
                                    }
                                }
                                
                                logger.info(f"Login exitoso via auth_service para: {username}")
                                return ResponseManager.success(
                                    data=response_data,
                                    message="Login exitoso"
                                )
                                
                            except ImportError:
                                logger.debug("Schema auth no disponible, usando implementación fallback")
                                break
                            except Exception as e:
                                logger.error(f"Error en auth_service: {e}")
                                break
                            
                    except Exception as e:
                        logger.error(f"Error obteniendo sesión de BD: {e}")
        
        # ==========================================
        # 4. IMPLEMENTACIÓN FALLBACK MANUAL
        # ==========================================
        
        if not DATABASE_AVAILABLE:
            logger.warning("Base de datos no disponible, usando credenciales de prueba")
            
            if username == "admin" and login_data.password == "admin123":
                return ResponseManager.success(
                    data={
                        "access_token": f"test_token_{int(datetime.now().timestamp())}",
                        "refresh_token": f"test_refresh_{int(datetime.now().timestamp())}",
                        "token_type": "Bearer",
                        "expires_in": 3600,
                        "user_info": {
                            "id": 1,
                            "username": username,
                            "email": f"{username}@test.com",
                            "full_name": "Usuario de Prueba",
                            "is_active": True,
                            "roles": ["user"]
                        },
                        "session_info": {
                            "session_id": f"test_session_{int(datetime.now().timestamp())}",
                            "login_at": datetime.now(timezone.utc).isoformat(),
                            "ip_address": client_ip,
                            "device_info": user_agent,
                            "remember_me": login_data.remember_me
                        }
                    },
                    message="Login exitoso (modo testing - sin BD)"
                )
            else:
                return ResponseManager.error(
                    message="Credenciales inválidas",
                    status_code=401,
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                    details="Usuario: admin, Password: admin123 (modo testing)"
                )
        
        # Implementación manual con BD disponible
        try:
            async for db in get_async_session():
                # Buscar usuario
                if '@' in username:
                    query = select(User).where(User.email == username)
                else:
                    query = select(User).where(User.username == username)
                
                result = await db.execute(query)
                user = result.scalar_one_or_none()
                
                if not user:
                    logger.warning(f"Usuario no encontrado: {username}")
                    
                    # Registrar intento fallido en rate limiting
                    if RATE_LIMIT_AVAILABLE:
                        try:
                            # Usar método que sí existe
                            await rate_limit_service.check_rate_limit(
                                key=f"failed_{client_ip}",
                                limit=999,  # Solo registrar, no limitar
                                window_seconds=3600
                            )
                            await rate_limit_service.check_rate_limit(
                                key=f"failed_{username}",
                                limit=999,  # Solo registrar, no limitar
                                window_seconds=900
                            )
                        except Exception as e:
                            logger.warning(f"Error registrando intento fallido: {e}")
                    
                    return ResponseManager.error(
                        message="Credenciales inválidas",
                        status_code=401,
                        error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                        details="Usuario o contraseña incorrectos"
                    )
                
                # Verificar que el usuario esté activo
                if not user.is_active:
                    logger.warning(f"Intento de login con usuario inactivo: {username}")
                    return ResponseManager.error(
                        message="Cuenta de usuario inactiva",
                        status_code=401,
                        error_code=ErrorCode.AUTH_USER_INACTIVE,
                        details="Contacte al administrador para activar su cuenta"
                    )
                
                # Verificar contraseña
                try:
                    if PASSWORD_MANAGER_AVAILABLE:
                        from core.password_manager import verify_user_password
                        password_valid = verify_user_password(
                            login_data.password, 
                            user.password_hash
                        )
                    else:
                        # Fallback usando bcrypt directo
                        import bcrypt
                        password_valid = bcrypt.checkpw(
                            login_data.password.encode('utf-8'),
                            user.password_hash.encode('utf-8')
                        )
                    
                    if not password_valid:
                        logger.warning(f"Contraseña incorrecta para usuario: {username}")
                        
                        # Registrar intento fallido en rate limiting
                        if RATE_LIMIT_AVAILABLE:
                            try:
                                # Usar método que sí existe
                                await rate_limit_service.check_rate_limit(
                                    key=f"failed_{client_ip}",
                                    limit=999,  # Solo registrar, no limitar
                                    window_seconds=3600
                                )
                                await rate_limit_service.check_rate_limit(
                                    key=f"failed_{username}",
                                    limit=999,  # Solo registrar, no limitar
                                    window_seconds=900
                                )
                            except Exception as e:
                                logger.warning(f"Error registrando intento fallido: {e}")
                        
                        return ResponseManager.error(
                            message="Credenciales inválidas",
                            status_code=401,
                            error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                            details="Usuario o contraseña incorrectos"
                        )
                        
                except Exception as e:
                    logger.error(f"Error verificando contraseña: {e}")
                    return ResponseManager.error(
                        message="Error interno en autenticación",
                        status_code=500,
                        error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                        details="Error al verificar credenciales"
                    )
                
                # Generar tokens manualmente si JWT está disponible
                if JWT_MANAGER_AVAILABLE and USER_CACHE_AVAILABLE:
                    try:
                        # Obtener user secret
                        user_secret = await get_user_secret(user.id)
                        if not user_secret:
                            from cache.services.user_cache import create_user_secret
                            user_secret = await create_user_secret(user.id)
                        
                        # Obtener roles y permisos
                        try:
                            permissions_data = await get_user_permissions(user.id)
                            roles = permissions_data.get("roles", ["user"])
                            permissions = permissions_data.get("permissions", [])
                        except:
                            roles = ["user"]
                            permissions = []
                        
                        # Generar tokens
                        session_id = str(uuid.uuid4())
                        
                        access_token = jwt_manager.create_access_token(
                            user_id=user.id,
                            user_secret=user_secret,
                            username=user.username,
                            email=user.email,
                            is_active=user.is_active,
                            roles=roles,
                            permissions=permissions,
                            extra_claims={
                                "session_id": session_id,
                                "device_info": user_agent,  # Usar user_agent del request
                                "ip_address": client_ip,
                                "remember_me": login_data.remember_me
                            }
                        )
                        
                        refresh_token = jwt_manager.create_refresh_token(
                            user_id=user.id,
                            user_secret=user_secret,
                            username=user.username
                        )
                        
                        # Actualizar último login
                        user.last_login_at = datetime.now(timezone.utc)
                        await db.commit()
                        
                        # Cachear datos del usuario
                        try:
                            await cache_user_auth_data(
                                user_id=user.id,
                                username=user.username,
                                email=user.email,
                                is_active=user.is_active,
                                full_name=f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
                            )
                        except:
                            pass
                        
                        # Registrar login exitoso en rate limiting
                        if RATE_LIMIT_AVAILABLE:
                            try:
                                # Limpiar contadores de fallos (esto es suficiente)
                                await rate_limit_service.reset_rate_limit(f"failed_{client_ip}")
                                await rate_limit_service.reset_rate_limit(f"failed_{username}")
                            except Exception as e:
                                logger.warning(f"Error limpiando contadores de fallos: {e}")
                        
                        response_data = {
                            "access_token": access_token,
                            "refresh_token": refresh_token,
                            "token_type": "Bearer",
                            "expires_in": 30 * 60 if not login_data.remember_me else 24 * 60 * 60,
                            "user_info": {
                                "id": user.id,
                                "username": user.username,
                                "email": user.email,
                                "full_name": f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.username,
                                "is_active": user.is_active,
                                "roles": roles,
                                "permissions": permissions
                            },
                            "session_info": {
                                "session_id": session_id,
                                "login_at": datetime.now(timezone.utc).isoformat(),
                                "ip_address": client_ip,
                                "device_info": user_agent,  # Usar user_agent del request
                                "remember_me": login_data.remember_me
                            }
                        }
                        
                        logger.info(f"Login exitoso manual para: {username} (ID: {user.id})")
                        return ResponseManager.success(
                            data=response_data,
                            message="Login exitoso"
                        )
                        
                    except Exception as e:
                        logger.error(f"Error generando tokens: {e}")
                        return ResponseManager.error(
                            message="Error interno generando autenticación",
                            status_code=500,
                            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                            details="Error al crear sesión de usuario"
                        )
                else:
                    # Fallback básico sin JWT
                    return ResponseManager.success(
                        data={
                            "access_token": f"basic_token_{user.id}_{int(datetime.now().timestamp())}",
                            "refresh_token": f"basic_refresh_{user.id}_{int(datetime.now().timestamp())}",
                            "token_type": "Bearer",
                            "expires_in": 3600,
                            "user_info": {
                                "id": user.id,
                                "username": user.username,
                                "email": user.email,
                                "full_name": f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.username,
                                "is_active": user.is_active,
                                "roles": ["user"]
                            },
                            "session_info": {
                                "session_id": f"basic_session_{user.id}_{int(datetime.now().timestamp())}",
                                "login_at": datetime.now(timezone.utc).isoformat(),
                                "ip_address": client_ip,
                                "device_info": user_agent,  # Usar user_agent del request
                                "remember_me": login_data.remember_me
                            }
                        },
                        message="Login exitoso (modo básico)"
                    )
                    
        except Exception as e:
            logger.error(f"Error en implementación manual: {e}")
            return ResponseManager.error(
                message="Error interno del servidor",
                status_code=500,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                details="Error inesperado durante la autenticación"
            )
            
    except Exception as e:
        logger.error(f"Error inesperado en login: {str(e)}")
        return ResponseManager.error(
            message="Error interno del servidor",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details="Error inesperado durante la autenticación"
        )

@router.post("/validate-token", response_class=JSONResponse)
async def validate_token(token_data: TokenValidateRequest):
    """
    Endpoint para validar tokens JWT
    
    Valida un token usando el middleware de autenticación existente
    """
    try:
        if not token_data.token:
            response_data = TokenValidateResponse(
                valid=False,
                status="invalid",  # ✅ Usar valor válido del enum
                reason="Token faltante",
                validated_at=datetime.now(timezone.utc)
            )
            return ResponseManager.success(
                data=response_data.model_dump(),
                message="Validación completada"
            )
        
        # Si hay JWT manager disponible, validar el token
        if JWT_MANAGER_AVAILABLE:
            try:
                # Crear request temporal para usar el middleware
                from fastapi import Request
                from fastapi.datastructures import Headers, URL
                
                # Crear request simulado con el token
                scope = {
                    "type": "http",
                    "method": "GET",
                    "path": "/validate",
                    "headers": [
                        (b"authorization", f"Bearer {token_data.token}".encode())
                    ]
                }
                
                temp_request = Request(scope)
                
                # Usar el middleware de autenticación
                from middleware.auth_middleware import authenticate_request
                
                await authenticate_request(temp_request)
                
                # Si llegamos aquí, el token es válido
                user_info = temp_request.state.user
                
                response_data = TokenValidateResponse(
                    valid=True,
                    status="valid",
                    reason="Token válido y activo",
                    validated_at=datetime.now(timezone.utc)
                )
                
                return ResponseManager.success(
                    data={
                        **response_data.model_dump(),
                        "user": user_info,
                        "token_info": {
                            "jti": getattr(temp_request.state, 'token_jti', None),
                            "issued_at": getattr(temp_request.state, 'token_issued_at', None),
                            "expires_at": getattr(temp_request.state, 'token_expires_at', None)
                        }
                    },
                    message="Token válido"
                )
                
            except TokenInvalidException:
                response_data = TokenValidateResponse(
                    valid=False,
                    status="invalid",
                    reason="Token inválido o malformado",
                    validated_at=datetime.now(timezone.utc)
                )
            except TokenBlacklistedException:
                response_data = TokenValidateResponse(
                    valid=False,
                    status="blacklisted",
                    reason="Token ha sido revocado",
                    validated_at=datetime.now(timezone.utc)
                )
            except Exception as e:
                response_data = TokenValidateResponse(
                    valid=False,
                    status="invalid",  # ✅ FIX: Cambiar "error" por "invalid"
                    reason=f"Error validando token: {str(e)}",
                    validated_at=datetime.now(timezone.utc)
                )
        else:
            # Fallback básico sin JWT manager
            if token_data.token.startswith(("test_", "basic_", "fake_")):
                response_data = TokenValidateResponse(
                    valid=True,
                    status="valid",
                    reason="Token de prueba válido",
                    validated_at=datetime.now(timezone.utc)
                )
            else:
                response_data = TokenValidateResponse(
                    valid=False,
                    status="invalid",  # ✅ También asegurar coherencia aquí
                    reason="Validación JWT no disponible",
                    validated_at=datetime.now(timezone.utc)
                )
        
        return ResponseManager.success(
            data=response_data.model_dump(),
            message="Validación completada"
        )
        
    except Exception as e:
        logger.error(f"Error validando token: {e}")
        return ResponseManager.error(
            message="Error validando token",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details=str(e)
        )      

@router.post("/logout", response_class=JSONResponse)
async def logout(request: Request):
    """
    Endpoint para logout - revoca tokens del usuario
    """
    try:
        # Extraer token del header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return ResponseManager.error(
                message="Token requerido para logout",
                status_code=401,
                error_code=ErrorCode.AUTH_TOKEN_MISSING,
                details="Header Authorization con Bearer token es requerido"
            )
        
        access_token = auth_header.split("Bearer ")[-1].strip()
        client_ip = get_client_ip(request)
        
        # Si hay auth service disponible, usarlo
        if AUTH_SERVICE_AVAILABLE and DATABASE_AVAILABLE:
            try:
                async for db in get_async_session():
                    # Usar auth service para logout
                    logout_result = await auth_service.logout_user(
                        access_token=access_token,
                        ip_address=client_ip,
                        db=db
                    )
                    
                    logger.info(f"Logout exitoso para usuario: {logout_result.get('username', 'unknown')}")
                    
                    return ResponseManager.success(
                        data={
                            "logged_out": True,
                            "logout_at": datetime.now(timezone.utc).isoformat(),
                            "tokens_revoked": logout_result.get('tokens_revoked', 1)
                        },
                        message="Logout exitoso"
                    )
                    
            except Exception as e:
                logger.error(f"Error en auth_service logout: {e}")
        
        # Implementación fallback
        if JWT_MANAGER_AVAILABLE:
            try:
                # Extraer user_id del token para blacklist
                user_id = jwt_manager.extract_user_id_unsafe(access_token)
                jti = jwt_manager.extract_jti_unsafe(access_token)
                
                if user_id and jti:
                    # Blacklistear el token si hay servicio de blacklist
                    try:
                        from cache.services.blacklist_service import blacklist_token
                        await blacklist_token(
                            jti=jti,
                            reason="user_logout",
                            user_id=user_id
                        )
                    except ImportError:
                        logger.debug("Blacklist service no disponible")
                    
                    logger.info(f"Logout manual exitoso para usuario ID: {user_id}")
                    return ResponseManager.success(
                        data={
                            "logged_out": True,
                            "logout_at": datetime.now(timezone.utc).isoformat()
                        },
                        message="Logout exitoso"
                    )
                        
            except Exception as e:
                logger.error(f"Error en logout manual: {e}")
        
        # Fallback básico
        return ResponseManager.success(
            data={
                "logged_out": True,
                "logout_at": datetime.now(timezone.utc).isoformat()
            },
            message="Logout exitoso (modo básico)"
        )
        
    except Exception as e:
        logger.error(f"Error en logout: {str(e)}")
        return ResponseManager.error(
            message="Error durante logout",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details=str(e)
        )

@router.get("/password-requirements", response_class=JSONResponse)
async def get_password_requirements():
    """
    Obtener requisitos de contraseña del sistema
    """
    try:
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
            message="Requisitos de contraseña obtenidos"
        )
        
    except Exception as e:
        logger.error(f"Error obteniendo requisitos: {e}")
        return ResponseManager.error(
            message="Error obteniendo requisitos",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details=str(e)
        )

@router.post("/password-strength", response_class=JSONResponse)
async def check_password_strength(password_data: PasswordStrengthCheck):
    """
    Verificar fortaleza de contraseña según los requisitos del sistema
    """
    try:
        password = password_data.password
        
        errors = []
        suggestions = []
        score = 0
        
        # Validación de longitud
        if len(password) < 8:
            errors.append("La contraseña debe tener al menos 8 caracteres")
            suggestions.append("Usa al menos 8 caracteres")
        else:
            score += 20
            
        # Validación de minúsculas
        if not any(c.islower() for c in password):
            errors.append("Debe contener al menos una letra minúscula")
            suggestions.append("Agrega letras minúsculas")
        else:
            score += 20
            
        # Validación de mayúsculas
        if not any(c.isupper() for c in password):
            errors.append("Debe contener al menos una letra mayúscula")
            suggestions.append("Agrega letras mayúsculas")
        else:
            score += 20
            
        # Validación de números
        if not any(c.isdigit() for c in password):
            errors.append("Debe contener al menos un número")
            suggestions.append("Agrega números")
        else:
            score += 20
            
        # Validación de caracteres especiales
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Debe contener al menos un carácter especial")
            suggestions.append("Agrega caracteres especiales (!@#$%^&*)")
        else:
            score += 20
        
        # Validación de patrones prohibidos
        forbidden_patterns = ["123456", "password", "qwerty", "admin", "user"]
        for pattern in forbidden_patterns:
            if pattern.lower() in password.lower():
                errors.append(f"No debe contener patrones comunes como '{pattern}'")
                suggestions.append("Evita patrones predecibles")
                score = max(0, score - 10)
                break
        
        # Bonificación por longitud extra
        if len(password) >= 12:
            score = min(100, score + 10)
        
        response_data = PasswordStrengthResponse(
            is_valid=len(errors) == 0,
            score=min(100, score),
            errors=errors,
            suggestions=suggestions
        )
        
        return ResponseManager.success(
            data=response_data.model_dump(),
            message="Análisis de fortaleza completado"
        )
        
    except Exception as e:
        logger.error(f"Error verificando fortaleza: {e}")
        return ResponseManager.error(
            message="Error verificando fortaleza de contraseña",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details=str(e)
        )

@router.get("/health", response_class=JSONResponse)
async def auth_health_check():
    """
    Health check del sistema de autenticación
    """
    try:
        # Verificar dependencias
        dependencies = {
            "database": DATABASE_AVAILABLE,
            "password_manager": PASSWORD_MANAGER_AVAILABLE,
            "jwt_manager": JWT_MANAGER_AVAILABLE,
            "auth_service": AUTH_SERVICE_AVAILABLE,
            "user_cache": USER_CACHE_AVAILABLE,
            "rate_limit": RATE_LIMIT_AVAILABLE
        }
        
        # Calcular estado general
        available_count = sum(dependencies.values())
        total_count = len(dependencies)
        health_percentage = (available_count / total_count) * 100
        
        if health_percentage == 100:
            status = "healthy"
            status_code = 200
        elif health_percentage >= 50:
            status = "degraded"
            status_code = 200
        else:
            status = "unhealthy"
            status_code = 503
        
        health_data = {
            "status": status,
            "health_percentage": health_percentage,
            "dependencies": dependencies,
            "available_endpoints": 6,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "notes": "Sistema de autenticación con JWT y doble secreto",
            "critical_services": {
                "authentication": DATABASE_AVAILABLE or AUTH_SERVICE_AVAILABLE,
                "token_generation": JWT_MANAGER_AVAILABLE,
                "security": PASSWORD_MANAGER_AVAILABLE
            }
        }
        
        if status == "healthy":
            return ResponseManager.success(
                data=health_data,
                message="Sistema de autenticación saludable"
            )
        else:
            return ResponseManager.error(
                message=f"Sistema de autenticación en estado: {status}",
                status_code=status_code,
                error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                details=health_data
            )
        
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        return ResponseManager.error(
            message="Error en health check",
            status_code=500,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            details=str(e)
        )
        
# Agregar este endpoint temporal para debug en routes/auth.py

@router.post("/debug-login", response_class=JSONResponse)
async def debug_login(login_data: LoginRequest, request: Request):
    """
    Endpoint temporal para debug de problemas de login
    """
    try:
        username = login_data.username.strip().lower()
        password = login_data.password
        
        logger.info(f"=== DEBUG LOGIN ===")
        logger.info(f"Username: {username}")
        logger.info(f"Password length: {len(password)}")
        logger.info(f"Password: {password}")  # ¡SOLO PARA DEBUG!
        
        # Buscar usuario en BD
        if DATABASE_AVAILABLE:
            async for db in get_async_session():
                if '@' in username:
                    query = select(User).where(User.email == username)
                else:
                    query = select(User).where(User.username == username)
                
                result = await db.execute(query)
                user = result.scalar_one_or_none()
                
                if not user:
                    return ResponseManager.error(
                        message=f"Usuario no encontrado: {username}",
                        status_code=404,
                        error_code=ErrorCode.AUTH_USER_NOT_FOUND
                    )
                
                logger.info(f"Usuario encontrado: ID={user.id}, username={user.username}")
                logger.info(f"Hash en BD: {user.password_hash}")
                logger.info(f"Usuario activo: {user.is_active}")
                
                # Probar verificación con diferentes métodos
                verification_results = {}
                
                # Método 1: PasswordManager (si disponible)
                if PASSWORD_MANAGER_AVAILABLE:
                    try:
                        from core.password_manager import verify_user_password
                        verification_results["password_manager"] = verify_user_password(password, user.password_hash)
                    except Exception as e:
                        verification_results["password_manager"] = f"Error: {e}"
                else:
                    verification_results["password_manager"] = "No disponible"
                
                # Método 2: bcrypt directo
                try:
                    import bcrypt
                    verification_results["bcrypt_direct"] = bcrypt.checkpw(
                        password.encode('utf-8'),
                        user.password_hash.encode('utf-8')
                    )
                except Exception as e:
                    verification_results["bcrypt_direct"] = f"Error: {e}"
                
                # Método 3: core.security (si disponible)
                try:
                    from core.security import verify_password
                    verification_results["core_security"] = verify_password(password, user.password_hash)
                except Exception as e:
                    verification_results["core_security"] = f"Error: {e}"
                
                logger.info(f"Resultados de verificación: {verification_results}")
                
                return ResponseManager.success(
                    data={
                        "user_found": True,
                        "user_id": user.id,
                        "username": user.username,
                        "is_active": user.is_active,
                        "password_hash": user.password_hash,
                        "verification_methods": verification_results,
                        "services_available": {
                            "PASSWORD_MANAGER_AVAILABLE": PASSWORD_MANAGER_AVAILABLE,
                            "DATABASE_AVAILABLE": DATABASE_AVAILABLE,
                        }
                    },
                    message="Debug completado"
                )
                
    except Exception as e:
        logger.error(f"Error en debug login: {e}")
        return ResponseManager.error(
            message=f"Error en debug: {str(e)}",
            status_code=500
        )