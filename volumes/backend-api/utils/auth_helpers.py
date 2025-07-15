"""
Auth Helper Functions
Funciones auxiliares para el sistema de autenticación
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import Request
from fastapi.responses import JSONResponse

from core.response import ResponseManager
from core.config import settings
from core.constants import ErrorCode

logger = logging.getLogger(__name__)

# ==========================================
# MODULE AVAILABILITY CHECKER
# ==========================================

def check_module_availability() -> Dict[str, bool]:
    """Check which authentication modules are available"""
    modules = {}
    
    try:
        from database import get_async_session
        from database.models.user import User
        from sqlalchemy import select
        modules['database'] = True
    except ImportError:
        modules['database'] = False
    
    try:
        from core.password_manager import verify_user_password
        modules['password_manager'] = True
    except ImportError:
        modules['password_manager'] = False
    
    try:
        from core.security import jwt_manager
        modules['jwt_manager'] = True
    except ImportError:
        modules['jwt_manager'] = False
    
    # Disable auth_service for now since it's causing issues
    # We'll use manual authentication which is more reliable
    modules['auth_service'] = False
    
    try:
        from cache.services.user_cache import get_user_secret, cache_user_auth_data, get_user_permissions
        modules['user_cache'] = True
    except ImportError:
        modules['user_cache'] = False
    
    try:
        from cache.services.rate_limit_service import rate_limit_service
        modules['rate_limit'] = True
    except ImportError:
        modules['rate_limit'] = False
    
    return modules

# ==========================================
# REQUEST HELPERS
# ==========================================

def get_client_ip(request: Request) -> str:
    """Extract client IP address safely"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return getattr(request.client, 'host', 'unknown') if request.client else 'unknown'

def extract_bearer_token(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split("Bearer ")[-1].strip()

# ==========================================
# AUTHENTICATION STRATEGIES
# ==========================================

async def authenticate_with_service(
    login_data,
    client_ip: str,
    user_agent: str,
    username: str,
    request: Request,
    modules: Dict[str, bool]
) -> JSONResponse:
    """Authenticate using AuthService"""
    print(f"🔵 [1] ENTRANDO a authenticate_with_service para: {username}")
    try:
        from database import get_async_session
        
        # Try to import and use the convenience function first
        try:
            from cache.services.auth_service import authenticate_user_credentials
            
            async for db in get_async_session():
                auth_result = await authenticate_user_credentials(
                    username=login_data.username,
                    password=login_data.password,
                    db_session=db,
                    ip_address=client_ip,
                    user_agent=user_agent,
                    remember_me=login_data.remember_me,
                    device_info=user_agent
                )
                
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
                
                logger.info(f"Login successful via AuthService convenience function for: {username}")
                return ResponseManager.success(
                    data=response_data,
                    message="Login exitoso",
                    request=request
                )
        
        except ImportError:
            # If convenience function is not available, try direct AuthService usage
            logger.warning("authenticate_user_credentials not available, trying direct AuthService")
            
            from cache.services.auth_service import AuthService
            from database.schemas.auth import LoginRequest
            
            async for db in get_async_session():
                auth_service = AuthService(db)
                
                # Create proper LoginRequest object
                auth_request = LoginRequest(
                    username=login_data.username,
                    password=login_data.password,
                    remember_me=login_data.remember_me,
                    device_info=user_agent
                )
                
                # Use the login method that exists in AuthService
                auth_result = await auth_service.login(
                    request=auth_request,
                    ip_address=client_ip,
                    user_agent=user_agent
                )
                
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
                
                logger.info(f"Login successful via AuthService direct method for: {username}")
                return ResponseManager.success(
                    data=response_data,
                    message="Login exitoso",
                    request=request
                )
            
    except Exception as e:
        logger.error(f"AuthService error: {e}")
        raise

async def authenticate_manual(
    login_data,
    client_ip: str,
    user_agent: str,
    username: str,
    request: Request,
    modules: Dict[str, bool]
) -> JSONResponse:
    """Manual authentication with database"""
    print(f"🟢 [2] ENTRANDO a authenticate_manual para: {username}")
    try:
        from database import get_async_session
        from database.models.user import User
        from sqlalchemy import select
        
        async for db in get_async_session():
            # Find user
            if '@' in username:
                query = select(User).where(User.email == username)
            else:
                query = select(User).where(User.username == username)
            
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            # User not found
            if not user:
                print(f"🔴 [2.1] Usuario NO encontrado: {username}")
                await register_failed_attempt(client_ip, username, modules)
                return ResponseManager.error(
                    message="Credenciales inválidas",
                    status_code=401,
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                    details="Usuario o contraseña incorrectos",
                    request=request
                )
            
            print(f"✅ [2.2] Usuario encontrado: {user.username} (ID: {user.id})")
            
            # User inactive
            if not user.is_active:
                print(f"⚠️ [2.3] Usuario INACTIVO: {username}")
                return ResponseManager.error(
                    message="Cuenta de usuario inactiva",
                    status_code=401,
                    error_code=ErrorCode.AUTH_USER_INACTIVE,
                    details="Contacte al administrador para activar su cuenta",
                    request=request
                )
            
            print(f"✅ [2.4] Usuario activo, verificando contraseña...")
            
            # Verify password
            password_valid = await verify_password(login_data.password, user.password_hash, modules)
            
            if not password_valid:
                print(f"❌ [2.5] Contraseña INCORRECTA para: {username}")
                await register_failed_attempt(client_ip, username, user.id, modules)
                return ResponseManager.error(
                    message="Credenciales inválidas",
                    status_code=401,
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                    details="Usuario o contraseña incorrectos",
                    request=request
                )
            
            print(f"✅ [2.6] Contraseña CORRECTA, generando respuesta...")
            
            # Generate success response
            print(f"🎯 [2.7] LLAMANDO A generate_success_response con user_id: {user.id}")
            try:
                result = await generate_success_response(
                    user, login_data, client_ip, user_agent, db, request, modules
                )
                print(f"✅ [2.8] generate_success_response completado exitosamente")
                return result
            except Exception as e:
                print(f"💥 [2.9] ERROR en la llamada a generate_success_response: {e}")
                raise
            
    except Exception as e:
        logger.error(f"Manual authentication error: {e}")
        raise

async def authenticate_testing(
    login_data,
    client_ip: str,
    user_agent: str,
    username: str,
    request: Request,
    modules: Dict[str, bool]
) -> JSONResponse:
    """Testing mode authentication (no database)"""
    print(f"🟡 [3] ENTRANDO a authenticate_testing para: {username}")
    logger.warning("Database unavailable, using test credentials")
    
    if username == "admin" and login_data.password == "admin123":
        response_data = {
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
        }
        
        return ResponseManager.success(
            data=response_data,
            message="Login exitoso (modo testing - sin BD)",
            request=request
        )
    else:
        return ResponseManager.error(
            message="Credenciales inválidas",
            status_code=401,
            error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
            details="Usuario: admin, Password: admin123 (modo testing)",
            request=request
        )

# ==========================================
# PASSWORD VERIFICATION
# ==========================================

async def verify_password(password: str, password_hash: str, modules: Dict[str, bool]) -> bool:
    """Verify password using available method"""
    try:
        if modules['password_manager']:
            from core.password_manager import verify_user_password
            return verify_user_password(password, password_hash)
        else:
            import bcrypt
            return bcrypt.checkpw(
                password.encode('utf-8'),
                password_hash.encode('utf-8')
            )
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

# ==========================================
# TOKEN GENERATION
# ==========================================

async def generate_success_response(
    user,
    login_data,
    client_ip: str,
    user_agent: str,
    db,
    request: Request,
    modules: Dict[str, bool]
) -> JSONResponse:
    """Generate successful login response"""
    
    print(f"🔥 ENTRANDO A generate_success_response para user_id: {user.id}")
    print(f"🔧 Módulos disponibles: {modules}")
    
    try:
        # Generate tokens if JWT is available
        if modules['jwt_manager'] and modules['user_cache']:
            from core.security import jwt_manager
            from cache.services.user_cache import get_user_secret, get_user_permissions
            
            # Get user secret
            user_secret = await get_user_secret(user.id)
            if not user_secret:
                # If user_secret doesn't exist, create a simple one
                import secrets
                user_secret = secrets.token_urlsafe(32)
                try:
                    from cache.services.user_cache import create_user_secret
                    await create_user_secret(user.id)
                    user_secret = await get_user_secret(user.id)
                except Exception as e:
                    logger.warning(f"Could not create user secret: {e}, using temporary secret")
            
            # Get roles and permissions
            try:
                permissions_data = await get_user_permissions(user.id)
                roles = permissions_data.get("roles", ["user"])
                permissions = permissions_data.get("permissions", [])
            except Exception as e:
                logger.warning(f"Could not get user permissions: {e}, using defaults")
                roles = ["user"]
                permissions = []
            
            # Generate tokens
            session_id = str(uuid.uuid4())
            
            try:
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
                        "device_info": user_agent,
                        "ip_address": client_ip,
                        "remember_me": login_data.remember_me
                    }
                )
                
                refresh_token = jwt_manager.create_refresh_token(
                    user_id=user.id,
                    user_secret=user_secret,
                    username=user.username
                )
                
                expires_in = 30 * 60 if not login_data.remember_me else 24 * 60 * 60
                
            except Exception as e:
                logger.error(f"Error creating JWT tokens: {e}, falling back to basic tokens")
                # Fallback to basic tokens
                access_token = f"basic_token_{user.id}_{int(datetime.now().timestamp())}"
                refresh_token = f"basic_refresh_{user.id}_{int(datetime.now().timestamp())}"
                expires_in = 3600
            
        else:
            # Basic fallback without JWT
            print(f"⚠️ [4.20] Usando fallback básico sin JWT")
            access_token = f"basic_token_{user.id}_{int(datetime.now().timestamp())}"
            refresh_token = f"basic_refresh_{user.id}_{int(datetime.now().timestamp())}"
            session_id = f"basic_session_{user.id}_{int(datetime.now().timestamp())}"
            roles = ["user"]
            permissions = []
            expires_in = 3600
        
        print(f"📝 [4.30] Preparando respuesta final...")
        
        # Update last login
        try:
            user.last_login_at = datetime.now(timezone.utc)
            await db.commit()
            print(f"✅ [4.31] Last login actualizado")
        except Exception as e:
            logger.warning(f"Could not update last login: {e}")
            print(f"⚠️ [4.32] Error actualizando last login: {e}")
            # Don't fail the login for this
        
        # Cache user data if possible
        if modules['user_cache']:
            print(f"💾 [4.33] Intentando cachear datos del usuario...")
            try:
                from cache.services.user_cache import cache_user_auth_data
                await cache_user_auth_data(
                    user_id=user.id,
                    username=user.username,
                    email=user.email,
                    is_active=user.is_active,
                    full_name=f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
                )
                print(f"✅ [4.34] Datos cacheados correctamente")
            except Exception as e:
                logger.warning(f"Cache error: {e}")
                print(f"⚠️ [4.35] Error cacheando: {e}")
        
        # Clear failed attempts
        print(f"🧹 [4.36] Limpiando intentos fallidos...")
        await clear_failed_attempts(client_ip, user.username, modules)
        
        print(f"🎉 [4.37] Generando respuesta exitosa final...")
        
        # Get user full name safely
        full_name = ""
        try:
            first_name = getattr(user, 'first_name', '') or ''
            last_name = getattr(user, 'last_name', '') or ''
            full_name = f"{first_name} {last_name}".strip()
            if not full_name:
                full_name = user.username
        except Exception:
            full_name = user.username
        
        # Prepare response
        response_data = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "user_info": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": full_name,
                "is_active": user.is_active,
                "roles": roles,
                "permissions": permissions
            },
            "session_info": {
                "session_id": session_id,
                "login_at": datetime.now(timezone.utc).isoformat(),
                "ip_address": client_ip,
                "device_info": user_agent,
                "remember_me": login_data.remember_me
            }
        }
        
        logger.info(f"Login successful for: {user.username} (ID: {user.id})")
        print(f"🏆 [4.38] ÉXITO TOTAL - Login completado para: {user.username}")
        return ResponseManager.success(
            data=response_data,
            message="Login exitoso",
            request=request
        )
        
    except Exception as e:
        logger.error(f"Error generating success response: {e}")
        print(f"💥 [4.99] ERROR FATAL en generate_success_response: {e}")
        print(f"💥 [4.99] Tipo de error: {type(e).__name__}")
        import traceback
        print(f"💥 [4.99] Traceback: {traceback.format_exc()}")
        raise

# ==========================================
# RATE LIMITING HELPERS
# ==========================================

async def check_duplicate_request(
    client_ip: str,
    username: str,
    password: str,
    modules: Dict[str, bool]
) -> bool:
    """Check for duplicate login requests"""
    if not modules['rate_limit']:
        return False
    
    try:
        from cache.services.rate_limit_service import rate_limit_service
        
        request_key = f"login_attempt:{client_ip}:{username}:{hash(password)}"
        duplicate_check = await rate_limit_service.check_rate_limit(
            key=request_key,
            limit=1,
            window_seconds=5
        )
        
        return not duplicate_check[0]  # True if duplicate
        
    except Exception as e:
        logger.warning(f"Error checking duplicates: {e}")
        return False

async def check_rate_limits(
    client_ip: str,
    username: str,
    modules: Dict[str, bool]
) -> tuple[bool, Optional[str]]:
    """Check rate limits for IP and user"""
    if not modules['rate_limit']:
        return True, None
    
    try:
        from cache.services.rate_limit_service import rate_limit_service
        
        # Rate limit by IP
        ip_allowed, _, _ = await rate_limit_service.check_rate_limit(
            key=f"login_ip_{client_ip}",
            limit=settings.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR,
            window_seconds=3600,
            increment=False
        )
        
        if not ip_allowed:
            return False, "IP blocked"
        
        # Rate limit by user
        user_allowed, _, _ = await rate_limit_service.check_rate_limit(
            key=f"login_user_{username}",
            limit=settings.MAX_LOGIN_ATTEMPTS,
            window_seconds=settings.LOCKOUT_DURATION_MINUTES * 60,
            increment=False
        )
        
        if not user_allowed:
            return False, "User blocked"
        
        return True, None
        
    except Exception as e:
        logger.warning(f"Rate limiting error: {e}")
        return True, None

async def register_failed_attempt(
    client_ip: str,
    username: str,
    user_id: Optional[int] = None,
    modules: Dict[str, bool] = None
):
    """Register failed login attempt"""
    if not modules or not modules['rate_limit']:
        return
    
    try:
        from cache.services.rate_limit_service import rate_limit_service
        
        await rate_limit_service.check_rate_limit(
            key=f"login_ip_{client_ip}",
            limit=settings.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR,
            window_seconds=3600
        )
        await rate_limit_service.check_rate_limit(
            key=f"login_user_{username}",
            limit=settings.MAX_LOGIN_ATTEMPTS,
            window_seconds=settings.LOCKOUT_DURATION_MINUTES * 60
        )
    except Exception as e:
        logger.warning(f"Error registering failed attempt: {e}")

async def clear_failed_attempts(
    client_ip: str,
    username: str,
    modules: Dict[str, bool]
):
    """Clear failed login attempt counters"""
    if not modules or not modules['rate_limit']:
        return
    
    try:
        from cache.services.rate_limit_service import rate_limit_service
        
        await rate_limit_service.reset_rate_limit(f"failed_{client_ip}")
        await rate_limit_service.reset_rate_limit(f"failed_{username}")
    except Exception as e:
        logger.warning(f"Error clearing failed attempts: {e}")

# ==========================================
# TOKEN VALIDATION HELPERS
# ==========================================

async def validate_jwt_token(token: str, modules: Dict[str, bool]) -> Dict[str, Any]:
    """Validate JWT token and return result"""
    if not modules['jwt_manager']:
        # Basic fallback validation
        if token.startswith(("test_", "basic_", "fake_")):
            return {
                "valid": True,
                "status": "valid",
                "reason": "Token de prueba válido",
                "payload": {"test": True}
            }
        else:
            return {
                "valid": False,
                "status": "invalid",
                "reason": "Validación JWT no disponible"
            }
    
    try:
        from core.security import jwt_manager
        
        # First, try to extract user_id from token without validation
        try:
            user_id = jwt_manager.extract_user_id_unsafe(token)
            if not user_id:
                return {
                    "valid": False,
                    "status": "invalid",
                    "reason": "No se pudo extraer user_id del token"
                }
        except Exception as e:
            return {
                "valid": False,
                "status": "invalid",
                "reason": f"Token malformado: {str(e)}"
            }
        
        # Get user secret if available
        user_secret = None
        if modules['user_cache']:
            try:
                from cache.services.user_cache import get_user_secret
                user_secret = await get_user_secret(user_id)
            except Exception as e:
                logger.warning(f"Could not get user secret: {e}")
        
        # If no user secret available, return invalid
        if not user_secret:
            return {
                "valid": False,
                "status": "invalid",
                "reason": "User secret no disponible para validación"
            }
        
        # Now validate the token with user secret
        try:
            payload = jwt_manager.decode_token(token, user_secret)
            return {
                "valid": True,
                "status": "valid",
                "reason": "Token válido y activo",
                "payload": payload
            }
        except Exception as e:
            error_type = type(e).__name__
            
            if "blacklist" in error_type.lower():
                return {
                    "valid": False,
                    "status": "blacklisted",
                    "reason": "Token ha sido revocado"
                }
            elif "expired" in str(e).lower():
                return {
                    "valid": False,
                    "status": "expired",
                    "reason": "Token ha expirado"
                }
            else:
                return {
                    "valid": False,
                    "status": "invalid",
                    "reason": f"Token inválido: {str(e)}"
                }
        
    except Exception as e:
        return {
            "valid": False,
            "status": "invalid",
            "reason": f"Error en validación: {str(e)}"
        }

# ==========================================
# LOGOUT HELPERS
# ==========================================

async def logout_user(
    access_token: str,
    client_ip: str,
    modules: Dict[str, bool]
) -> Dict[str, Any]:
    """Logout user and revoke tokens"""
    try:
        # Use auth service if available
        if modules['auth_service'] and modules['database'] and modules['jwt_manager']:
            from database import get_async_session
            from cache.services.auth_service import logout_user as auth_logout
            from core.security import jwt_manager
            
            try:
                # Extract user info from token
                user_id = jwt_manager.extract_user_id_unsafe(access_token)
                jti = jwt_manager.extract_jti_unsafe(access_token)
                
                if user_id and jti:
                    async for db in get_async_session():
                        logout_result = await auth_logout(
                            current_user_id=user_id,
                            current_token_jti=jti,
                            db_session=db,
                            logout_all_devices=False
                        )
                        
                        return {
                            "success": True,
                            "method": "auth_service",
                            "username": "unknown",  # logout_result doesn't return username
                            "tokens_revoked": 1
                        }
            except Exception as e:
                logger.error(f"Auth service logout error: {e}")
                # Fall through to manual method
        
        # Manual JWT logout
        if modules['jwt_manager']:
            from core.security import jwt_manager
            
            try:
                user_id = jwt_manager.extract_user_id_unsafe(access_token)
                jti = jwt_manager.extract_jti_unsafe(access_token)
                
                if user_id and jti:
                    # Try to blacklist token
                    try:
                        from cache.services.blacklist_service import blacklist_token
                        await blacklist_token(
                            jti=jti,
                            reason="user_logout",
                            user_id=user_id
                        )
                    except ImportError:
                        logger.debug("Blacklist service not available")
                    
                    return {
                        "success": True,
                        "method": "manual_jwt",
                        "user_id": user_id
                    }
            except Exception as e:
                logger.error(f"Manual logout error: {e}")
        
        # Basic fallback
        return {
            "success": True,
            "method": "basic"
        }
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# ==========================================
# PASSWORD STRENGTH VALIDATION
# ==========================================

def validate_password_strength(password: str) -> Dict[str, Any]:
    """Validate password strength according to system requirements"""
    errors = []
    suggestions = []
    score = 0
    
    # Length validation
    if len(password) < 8:
        errors.append("La contraseña debe tener al menos 8 caracteres")
        suggestions.append("Usa al menos 8 caracteres")
    else:
        score += 20
        
    # Lowercase validation
    if not any(c.islower() for c in password):
        errors.append("Debe contener al menos una letra minúscula")
        suggestions.append("Agrega letras minúsculas")
    else:
        score += 20
        
    # Uppercase validation
    if not any(c.isupper() for c in password):
        errors.append("Debe contener al menos una letra mayúscula")
        suggestions.append("Agrega letras mayúsculas")
    else:
        score += 20
        
    # Digit validation
    if not any(c.isdigit() for c in password):
        errors.append("Debe contener al menos un número")
        suggestions.append("Agrega números")
    else:
        score += 20
        
    # Special character validation
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        errors.append("Debe contener al menos un carácter especial")
        suggestions.append("Agrega caracteres especiales (!@#$%^&*)")
    else:
        score += 20
    
    # Forbidden patterns validation
    forbidden_patterns = ["123456", "password", "qwerty", "admin", "user"]
    for pattern in forbidden_patterns:
        if pattern.lower() in password.lower():
            errors.append(f"No debe contener patrones comunes como '{pattern}'")
            suggestions.append("Evita patrones predecibles")
            score = max(0, score - 10)
            break
    
    # Length bonus
    if len(password) >= 12:
        score = min(100, score + 10)
    
    return {
        "is_valid": len(errors) == 0,
        "score": min(100, score),
        "errors": errors,
        "suggestions": suggestions
    }