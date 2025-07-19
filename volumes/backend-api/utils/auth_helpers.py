"""
volumes/backend-api/utils/auth_helpers.py
"""
from utils.log_helper import setup_logger
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, Any, TYPE_CHECKING

from fastapi import Request
from fastapi.responses import JSONResponse

from core.response import ResponseManager
from core.config import settings
from core.constants import ErrorCode, HTTPStatus

# Imports para typing - evita problemas de import circular
if TYPE_CHECKING:
    from database.models.users import User
 
logger = setup_logger(__name__)

# ==========================================
# FUNCIONES AUXILIARES DE REQUEST
# ==========================================

def get_client_ip(request: Request) -> str:
    """Extraer IP del cliente de manera segura"""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return getattr(request.client, 'host', 'unknown') if request.client else 'unknown'

def extract_bearer_token(request: Request) -> Optional[str]:
    """Extraer token Bearer del header Authorization"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header.split("Bearer ")[-1].strip()

# ==========================================
# CLASE PRINCIPAL DE AUTENTICACIÓN
# ==========================================

class AuthHelper:
    """Helper principal de autenticación con flujo único"""
    
    def __init__(self):
        self.modules = self._check_module_availability()
        logger.info(f"AuthHelper inicializado con módulos: {self.modules}")
    
    def _check_module_availability(self) -> Dict[str, bool]:
        """Usar ModuleChecker centralizado"""
        from core.module_checker import ModuleChecker
        return ModuleChecker.get_available_modules()
 
    async def get_system_status(self) -> Dict[str, Any]:
        """Obtener estado del sistema y dependencias"""
        try:
            return {
                "database": self.modules.get('database', False),
                "password_manager": self.modules.get('password_manager', False),
                "jwt_manager": self.modules.get('jwt_manager', False),
                "user_cache": self.modules.get('user_cache', False),
                "rate_limit": self.modules.get('rate_limit', False),
                "all_systems_operational": all(self.modules.values()),
                "total_modules": len(self.modules),
                "active_modules": sum(1 for status in self.modules.values() if status)
            }
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {
                "error": str(e),
                "all_systems_operational": False
            }

    # ==========================================
    # FLUJO ÚNICO DE AUTENTICACIÓN
    # ==========================================
    
    async def authenticate_user(
        self,
        login_data,
        client_ip: str,
        user_agent: str,
        request: Request
    ) -> JSONResponse:
        """Flujo único de autenticación - reemplaza todos los métodos anteriores"""
        
        logger.info(f"Iniciando autenticación para usuario: {login_data.username}")
        
        try:
            # Validaciones básicas
            if not login_data.username or not login_data.password:
                return ResponseManager.error(
                    message="Username y password son requeridos",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                    details="Ambos campos son obligatorios",
                    request=request
                )
            
            username = login_data.username.strip().lower()
            
            # Verificar rate limiting
            rate_limit_response = await self._check_rate_limits(client_ip, username, request)
            if rate_limit_response:
                return rate_limit_response
            
            # Autenticación contra base de datos
            user_data = await self._authenticate_against_database(username, login_data.password, request)
            if isinstance(user_data, JSONResponse):
                return user_data  # Error response
            
            # Generar tokens JWT
            tokens = await self._generate_auth_tokens(user_data, login_data, client_ip, user_agent)
            
            # Actualizar datos del usuario
            await self._update_user_login_data(user_data["id"], client_ip)
            
            # Limpiar intentos fallidos
            await self._clear_failed_attempts(client_ip, username)

            # Respuesta exitosa
            response_data = {
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "token_type": "Bearer",
                "expires_in": tokens["expires_in"],
                "user_info": {
                    "id": user_data["id"],
                    "username": user_data["username"],
                    "email": user_data["email"],
                    "full_name": user_data.get("full_name", user_data["username"]),
                    "is_active": user_data["is_active"],
                    "roles": user_data.get("roles", ["user"]),
                    "permissions": user_data.get("permissions", [])
                },
                "session_info": {
                    "session_id": tokens["session_id"],
                    "login_at": datetime.now(timezone.utc).isoformat(),
                    "ip_address": client_ip,
                    "device_info": user_agent,
                    "remember_me": login_data.remember_me
                }
            }
            
            logger.info(f"Login exitoso para: {username} (ID: {user_data['id']})")
            return ResponseManager.success(
                data=response_data,
                message="Login exitoso",
                request=request
            )
            
        except Exception as e:
            await self._register_failed_attempt(client_ip, username)
            logger.error(f"Error en autenticación para {username}: {e}")
            
            return ResponseManager.internal_server_error(
                message="Error inesperado durante la autenticación",
                details=str(e),
                request=request
            )
    
    async def _check_rate_limits(self, client_ip: str, username: str, request: Request) -> Optional[JSONResponse]:
        """Verificar límites de intentos de login"""
        if not self.modules['rate_limit']:
            return None
        
        try:
            from cache.services.rate_limit_service import rate_limit_service
            
            # Rate limit por IP
            ip_allowed, _, _ = await rate_limit_service.check_rate_limit(
                key=f"login_ip_{client_ip}",
                limit=getattr(settings, 'RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR', 10),
                window_seconds=3600,
                increment=False
            )
            
            if not ip_allowed:
                return ResponseManager.error(
                    message="Demasiados intentos de login desde esta IP",
                    status_code=429,
                    error_code=ErrorCode.RATE_LIMIT_IP_BLOCKED,
                    details="Intente nuevamente en 1 hora",
                    request=request
                )
            
            # Rate limit por usuario
            user_allowed, _, _ = await rate_limit_service.check_rate_limit(
                key=f"login_user_{username}",
                limit=getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5),
                window_seconds=getattr(settings, 'LOCKOUT_DURATION_MINUTES', 30) * 60,
                increment=False
            )
            
            if not user_allowed:
                return ResponseManager.error(
                    message="Demasiados intentos fallidos para este usuario",
                    status_code=429,
                    error_code=ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED,
                    details=f"Cuenta bloqueada por {getattr(settings, 'LOCKOUT_DURATION_MINUTES', 30)} minutos",
                    request=request
                )
                
        except ImportError:
            logger.warning("Servicio de rate limiting no disponible")
        except Exception as e:
            logger.warning(f"Error en rate limiting: {e}")
        
        return None

    async def _authenticate_against_database(
            self, username: str, password: str, request: Request
        ) -> Dict[str, Any] | JSONResponse:
            """Autenticar credenciales contra la base de datos"""
            
            logger.info(f"Iniciando autenticación contra BD para usuario: {username}")
            
            if not self.modules['database']:
                logger.error("Sistema de base de datos no disponible")
                return ResponseManager.error(
                    message="Sistema de base de datos no disponible",
                    status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                    error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                    details="No se puede verificar credenciales",
                    request=request
                )
            
            logger.info("Módulo de base de datos disponible, procediendo con autenticación")
            
            try:
                logger.info("Importando dependencias de base de datos")
                # Imports dinámicos dentro del método para evitar problemas
                from database import get_async_session
                from sqlalchemy import select
                
                # Import dinámico del modelo User
                from database.models.users import User
                logger.info("Dependencias importadas correctamente")
                
                logger.info("Obteniendo sesión de base de datos")
                async for db in get_async_session():
                    logger.info(f"Sesión de BD obtenida, buscando usuario: {username}")
                    
                    # Buscar usuario en BD
                    if '@' in username:
                        logger.info("Identificador detectado como email, buscando por email")
                        query = select(User).where(User.email == username)
                    else:
                        logger.info("Identificador detectado como username, buscando por username")
                        query = select(User).where(User.username == username)
                    
                    logger.info("Ejecutando consulta en base de datos")
                    result = await db.execute(query)
                    user = result.scalar_one_or_none()
                    
                    if not user:
                        logger.warning(f"Usuario no encontrado en BD: {username}")
                        return ResponseManager.error(
                            message="Credenciales inválidas",
                            status_code=HTTPStatus.UNAUTHORIZED,
                            error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                            details="Usuario o contraseña incorrectos",
                            request=request
                        )
                    
                    logger.info(f"Usuario encontrado en BD - ID: {user.id}, Username: {user.username}")
                    
                    # Verificar que el usuario esté activo
                    logger.info(f"Verificando estado activo del usuario: {user.is_active}")
                    if not user.is_active:
                        logger.warning(f"Usuario inactivo: {username}")
                        return ResponseManager.error(
                            message="Cuenta de usuario inactiva",
                            status_code=HTTPStatus.UNAUTHORIZED,
                            error_code=ErrorCode.AUTH_USER_INACTIVE,
                            details="Contacte al administrador para activar su cuenta",
                            request=request
                        )
                    
                    logger.info("Usuario activo, procediendo con verificación de contraseña")
                    # Verificar contraseña
                    password_valid = await self._verify_password(password, user.password_hash)
                    
                    if not password_valid:
                        logger.warning(f"Contraseña inválida para usuario: {username}")
                        return ResponseManager.error(
                            message="Credenciales inválidas",
                            status_code=HTTPStatus.UNAUTHORIZED,
                            error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
                            details="Usuario o contraseña incorrectos",
                            request=request
                        )
                    
                    logger.info("Contraseña verificada correctamente, obteniendo roles y permisos")
                    # Obtener roles y permisos
                    roles, permissions = await self._get_user_roles_permissions(user.id)
                    logger.info(f"Roles obtenidos: {len(roles)} roles, {len(permissions)} permisos")
                    
                    logger.info(f"Autenticación exitosa para usuario: {username} (ID: {user.id})")
                    return {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "is_active": user.is_active,
                        "full_name": self._get_user_full_name(user),
                        "roles": roles,
                        "permissions": permissions
                    }
                    
            except Exception as e:
                logger.error(f"Error crítico en autenticación de BD para usuario {username}: {str(e)}")
                logger.error(f"Tipo de error: {type(e).__name__}")
                logger.error(f"Traceback completo:", exc_info=True)
                return ResponseManager.internal_server_error(
                    message="Error en la autenticación",
                    details=str(e),
                    request=request
                )
  
    async def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verificar contraseña usando el método disponible"""
        try:
            if self.modules['password_manager']:
                from core.password_manager import verify_user_password
                return verify_user_password(password, password_hash)
            else:
                import bcrypt
                return bcrypt.checkpw(
                    password.encode('utf-8'),
                    password_hash.encode('utf-8')
                )
        except Exception as e:
            logger.error(f"Error en verificación de contraseña: {e}")
            return False
    
    async def _get_user_roles_permissions(self, user_id: int) -> tuple[list, list]:
            """Obtener roles y permisos del usuario usando relaciones y/o cache"""
            try:
                # Intentar primero con cache para optimización
                if self.modules['user_cache']:
                    from cache.services.user_cache import get_user_permissions
                    try:
                        permissions_data = await get_user_permissions(user_id)
                        if permissions_data:
                            return (
                                permissions_data.get("roles", []),
                                permissions_data.get("permissions", [])
                            )
                    except Exception as e:
                        logger.info(f"Cache falló: {e}")
                
                # Si no hay cache, obtener desde BD usando queries directas
                roles, permissions = await self._get_roles_permissions_from_db(user_id)
                return roles, permissions
                
            except Exception as e:
                logger.error(f"Error obteniendo roles/permisos: {e}")
                return [], []  # ✅ Devolver listas vacías sin fallback hardcodeado
        
    async def _get_roles_permissions_from_db(self, user_id: int) -> tuple[list, list]:
        """Delegar a PermissionsService - VERSIÓN CORREGIDA"""
        try:
            
            from services.permissions_service import permissions_service
            
            result = await permissions_service.get_user_permissions(user_id)
            return (
                result.get("roles", []),
                result.get("permissions", [])
            )
            
        except Exception as e:
            logger.error(f"Error obteniendo roles/permisos de BD: {e}")
            return [], []

    def _get_user_full_name(self, user) -> str:
        """Obtener nombre completo del usuario de manera segura"""
        try:
            first_name = getattr(user, 'first_name', '') or ''
            last_name = getattr(user, 'last_name', '') or ''
            full_name = f"{first_name} {last_name}".strip()
            return full_name if full_name else user.username
        except Exception:
            return user.username
    
    # ==========================================
    # GENERACIÓN DE TOKENS
    # ==========================================
    
    async def _generate_auth_tokens(
        self, user_data: Dict, login_data, client_ip: str, user_agent: str
    ) -> Dict[str, Any]:
        """Generar tokens JWT usando el sistema de doble secreto"""
        
        if not self.modules['jwt_manager']:
            # Fallback básico
            timestamp = int(datetime.now().timestamp())
            return {
                "access_token": f"basic_token_{user_data['id']}_{timestamp}",
                "refresh_token": f"basic_refresh_{user_data['id']}_{timestamp}",
                "expires_in": 3600,
                "session_id": f"basic_session_{user_data['id']}_{timestamp}"
            }
        
        try:
            from core.security import jwt_manager
            
            # Obtener user secret
            user_secret = await self._get_or_create_user_secret(user_data["id"])
            
            # Generar session ID
            session_id = str(uuid.uuid4())
            
            # Crear tokens
            access_token = jwt_manager.create_access_token(
                user_id=user_data["id"],
                user_secret=user_secret,
                username=user_data["username"],
                email=user_data["email"],
                is_active=user_data["is_active"],
                roles=user_data["roles"],
                permissions=user_data["permissions"],
                extra_claims={
                    "session_id": session_id,
                    "device_info": user_agent,
                    "ip_address": client_ip,
                    "remember_me": login_data.remember_me
                }
            )
            
            refresh_token = jwt_manager.create_refresh_token(
                user_id=user_data["id"],
                user_secret=user_secret,
                username=user_data["username"]
            )
            
            expires_in = 30 * 60 if not login_data.remember_me else 24 * 60 * 60
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Error creando tokens JWT: {e}")
            # Fallback a tokens básicos
            timestamp = int(datetime.now().timestamp())
            return {
                "access_token": f"fallback_token_{user_data['id']}_{timestamp}",
                "refresh_token": f"fallback_refresh_{user_data['id']}_{timestamp}",
                "expires_in": 3600,
                "session_id": f"fallback_session_{user_data['id']}_{timestamp}"
            }
    
    async def _get_or_create_user_secret(self, user_id: int) -> str:
        """Obtener o crear user secret"""
        if not self.modules['user_cache']:
            return secrets.token_urlsafe(32)
        
        try:
            from cache.services.user_cache import get_user_secret, create_user_secret
            
            user_secret = await get_user_secret(user_id)
            if not user_secret:
                await create_user_secret(user_id)
                user_secret = await get_user_secret(user_id)
            
            return user_secret or secrets.token_urlsafe(32)
            
        except Exception as e:
            logger.warning(f"No se pudo obtener/crear user secret: {e}")
            return secrets.token_urlsafe(32)
    
    # ==========================================
    # FUNCIONES AUXILIARES
    # ==========================================
    
    async def _update_user_login_data(self, user_id: int, client_ip: str):
        """Actualizar datos de último login"""
        try:
            if self.modules['database']:
                # Imports dinámicos
                from database import get_async_session
                from database.models.users import User
                from sqlalchemy import update
                
                async for db in get_async_session():
                    await db.execute(
                        update(User)
                        .where(User.id == user_id)
                        .values(
                            last_login_at=datetime.now(timezone.utc),
                            last_login_ip=client_ip[:45]  # Truncar IP si es muy larga
                        )
                    )
                    await db.commit()
                    break
                    
        except Exception as e:
            logger.warning(f"No se pudo actualizar último login: {e}")
    
    async def _clear_failed_attempts(self, client_ip: str, username: str):
        """Limpiar intentos fallidos"""
        try:
            if self.modules['rate_limit']:
                from cache.services.rate_limit_service import rate_limit_service
                await rate_limit_service.reset_rate_limit(f"failed_{client_ip}")
                await rate_limit_service.reset_rate_limit(f"failed_{username}")
        except Exception as e:
            logger.warning(f"Error limpiando intentos fallidos: {e}")
    
    async def _register_failed_attempt(self, client_ip: str, username: str):
        """Registrar intento fallido"""
        try:
            if self.modules['rate_limit']:
                from cache.services.rate_limit_service import rate_limit_service
                await rate_limit_service.check_rate_limit(
                    key=f"login_ip_{client_ip}",
                    limit=getattr(settings, 'RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR', 10),
                    window_seconds=3600
                )
                await rate_limit_service.check_rate_limit(
                    key=f"login_user_{username}",
                    limit=getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5),
                    window_seconds=getattr(settings, 'LOCKOUT_DURATION_MINUTES', 30) * 60
                )
        except Exception as e:
            logger.warning(f"Error registrando intento fallido: {e}")
    
    async def _get_user_data_for_refresh(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Obtener datos del usuario para refresh token"""
        
        if not self.modules['database']:
            return None
        
        try:
            from database import get_async_session
            from sqlalchemy import select
            from database.models.users import User
            
            async for db in get_async_session():
                query = select(User).where(User.id == user_id)
                result = await db.execute(query)
                user = result.scalar_one_or_none()
                
                if not user or not user.is_active:
                    return None
                
                # Obtener roles y permisos actualizados
                roles, permissions = await self._get_user_roles_permissions(user.id)
                
                return {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_active": user.is_active,
                    "full_name": self._get_user_full_name(user),
                    "roles": roles,
                    "permissions": permissions
                }
                
        except Exception as e:
            logger.error(f"Error obteniendo datos de usuario para refresh: {e}")
            return None

    async def _revoke_old_refresh_token(self, refresh_token: str):
        """Revocar refresh token anterior"""
        try:
            if not self.modules['jwt_manager']:
                return
                
            from core.security import jwt_manager
            
            # Extraer JTI del refresh token
            jti = jwt_manager.extract_jti_unsafe(refresh_token)
            
            if jti:
                try:
                    from cache.services.blacklist_service import blacklist_token
                    await blacklist_token(
                        jti=jti,
                        reason="token_refresh",
                        user_id=None
                    )
                    logger.debug(f"Refresh token revocado: {jti}")
                except ImportError:
                    logger.debug("Servicio de blacklist no disponible")
                    
        except Exception as e:
            logger.warning(f"Error revocando refresh token: {e}")

    async def _generate_refresh_tokens(
        self,
        user_data: Dict[str, Any],
        client_ip: str,
        user_agent: str,
        user_secret: str
    ) -> Dict[str, Any]:
        """Generar nuevos tokens para refresh"""
        
        try:
            from core.security import jwt_manager
            
            # Generar nuevo session ID
            session_id = str(uuid.uuid4())
            
            # Crear nuevo access token
            access_token = jwt_manager.create_access_token(
                user_id=user_data["id"],
                user_secret=user_secret,
                username=user_data["username"],
                email=user_data["email"],
                is_active=user_data["is_active"],
                roles=user_data["roles"],
                permissions=user_data["permissions"],
                extra_claims={
                    "session_id": session_id,
                    "device_info": user_agent,
                    "ip_address": client_ip,
                    "refreshed": True
                }
            )
            
            # Crear nuevo refresh token
            refresh_token = jwt_manager.create_refresh_token(
                user_id=user_data["id"],
                user_secret=user_secret,
                username=user_data["username"]
            )
            
            # Tiempo de expiración del access token
            expires_in = getattr(settings, 'JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 30) * 60
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": expires_in,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Error generando tokens para refresh: {e}")
            # Fallback a tokens básicos
            timestamp = int(datetime.now().timestamp())
            return {
                "access_token": f"refresh_fallback_token_{user_data['id']}_{timestamp}",
                "refresh_token": f"refresh_fallback_refresh_{user_data['id']}_{timestamp}",
                "expires_in": 1800,
                "session_id": f"refresh_fallback_session_{user_data['id']}_{timestamp}"
            }
        
    # ==========================================
    # VALIDACIÓN DE TOKENS
    # ==========================================
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validar token JWT"""
        if not self.modules['jwt_manager']:
            # Validación básica para tokens de prueba
            if token.startswith(("test_", "basic_", "fallback_")):
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
                    "reason": "Sistema JWT no disponible"
                }
        
        try:
            from core.security import jwt_manager
            
            # Extraer user_id del token
            user_id = jwt_manager.extract_user_id_unsafe(token)
            if not user_id:
                return {
                    "valid": False,
                    "status": "invalid",
                    "reason": "No se pudo extraer user_id del token"
                }
            
            # Obtener user secret
            user_secret = await self._get_or_create_user_secret(user_id)
            
            # Validar token completo
            payload = jwt_manager.decode_token(token, user_secret)
            
            return {
                "valid": True,
                "status": "valid",
                "reason": "Token válido y activo",
                "payload": payload
            }
            
        except Exception as e:
            error_str = str(e).lower()
            
            if "blacklist" in error_str:
                return {"valid": False, "status": "blacklisted", "reason": "Token ha sido revocado"}
            elif "expired" in error_str:
                return {"valid": False, "status": "expired", "reason": "Token ha expirado"}
            else:
                return {"valid": False, "status": "invalid", "reason": f"Token inválido: {str(e)}"}
    
    # ==========================================
    # LOGOUT
    # ==========================================
    
    async def logout_user(self, access_token: str, client_ip: str) -> Dict[str, Any]:
        """Cerrar sesión del usuario"""
        try:
            if self.modules['jwt_manager']:
                from core.security import jwt_manager
                
                user_id = jwt_manager.extract_user_id_unsafe(access_token)
                jti = jwt_manager.extract_jti_unsafe(access_token)
                
                if user_id and jti:
                    # Intentar blacklist del token
                    try:
                        from cache.services.blacklist_service import blacklist_token
                        await blacklist_token(
                            jti=jti,
                            reason="user_logout",
                            user_id=user_id
                        )
                    except ImportError:
                        logger.debug("Servicio de blacklist no disponible")
                    
                    return {
                        "success": True,
                        "method": "jwt_blacklist",
                        "user_id": user_id
                    }
            
            return {"success": True, "method": "basic"}
            
        except Exception as e:
            logger.error(f"Error en logout: {e}")
            return {"success": False, "error": str(e)}
        
    # ==========================================
    # AGREGAR ESTE MÉTODO A LA CLASE AuthHelper
    # Posición: después del método logout_user
    # ==========================================

    async def refresh_access_token(
        self,
        refresh_token: str,
        client_ip: str,
        user_agent: str
    ) -> Dict[str, Any]:
        """Renovar access token usando refresh token"""
        
        logger.info("Iniciando renovación de access token")
        
        try:
            # Validar que JWT manager esté disponible
            if not self.modules['jwt_manager']:
                return {
                    "success": False,
                    "error": "Sistema JWT no disponible",
                    "reason": "service_unavailable"
                }
            
            from core.security import jwt_manager
            
            # Extraer user_id del refresh token
            user_id = jwt_manager.extract_user_id_unsafe(refresh_token)
            if not user_id:
                return {
                    "success": False,
                    "error": "No se pudo extraer user_id del refresh token",
                    "reason": "invalid"
                }
            
            # Obtener user secret
            user_secret = await self._get_or_create_user_secret(user_id)
            
            # Validar refresh token
            try:
                payload = jwt_manager.decode_token(refresh_token, user_secret)
                
                # Verificar que sea un refresh token
                if payload.get("token_type") != "refresh":
                    return {
                        "success": False,
                        "error": "Token no es un refresh token",
                        "reason": "invalid"
                    }
                    
            except Exception as e:
                error_str = str(e).lower()
                
                if "blacklist" in error_str:
                    return {
                        "success": False,
                        "error": "Refresh token ha sido revocado",
                        "reason": "blacklisted"
                    }
                elif "expired" in error_str:
                    return {
                        "success": False,
                        "error": "Refresh token ha expirado",
                        "reason": "expired"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Refresh token inválido: {str(e)}",
                        "reason": "invalid"
                    }
            
            # Obtener datos actualizados del usuario
            user_data = await self._get_user_data_for_refresh(user_id)
            if not user_data:
                return {
                    "success": False,
                    "error": "Usuario no encontrado o inactivo",
                    "reason": "user_not_found"
                }
            
            # Revocar refresh token anterior (security best practice)
            await self._revoke_old_refresh_token(refresh_token)
            
            # Generar nuevos tokens
            new_tokens = await self._generate_refresh_tokens(
                user_data, client_ip, user_agent, user_secret
            )
            
            logger.info(f"Token renovado exitosamente para usuario: {user_data['username']}")
            
            return {
                "success": True,
                "access_token": new_tokens["access_token"],
                "refresh_token": new_tokens["refresh_token"],
                "expires_in": new_tokens["expires_in"],
                "username": user_data["username"]
            }
            
        except Exception as e:
            logger.error(f"Error en refresh token: {e}")
            return {
                "success": False,
                "error": f"Error inesperado: {str(e)}",
                "reason": "internal_error"
            }

