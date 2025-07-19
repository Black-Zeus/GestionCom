"""
volumes/backend-api/cache/services/auth_service.py
AuthService refactorizado - Separación de responsabilidades
Solo maneja el flujo principal de autenticación, delega el resto
"""
import secrets
from utils.log_helper import setup_logger
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import jwt_manager
from core.exceptions import AuthenticationException, SystemException
from core.constants import ErrorCode

from database.schemas.auth import LoginRequest
from cache.services.user_cache import user_cache_service

logger = setup_logger(__name__)


class AuthService:
    """
    Servicio principal de autenticación - Solo flujo core
    Delega responsabilidades específicas a otros servicios
    """
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        
        # Inyectar dependencias
        self.user_service = None
        self.token_service = None
        self.security_service = None
        
    def _ensure_dependencies(self):
        """Lazy loading de dependencias para evitar imports circulares"""
        if not self.user_service:
            # ✅ UserService está definido en este mismo archivo
            self.user_service = UserService(self.db_session)
            
        if not self.token_service:
            # ✅ TokenService está definido en este mismo archivo  
            self.token_service = TokenService()
            
        if not self.security_service:
            # ✅ SecurityService está definido en este mismo archivo
            self.security_service = SecurityService()
            
        
    
    # ==========================================
    # MÉTODOS PRINCIPALES - SOLO FLUJO CORE
    # ==========================================
    
    async def authenticate_user(
        self,
        request: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Flujo principal de autenticación - Orquesta otros servicios
        """
        try:
            self._ensure_dependencies()
            
            logger.info(f"Login attempt for: {request.username}")
            
            # 1. Verificar rate limiting (delegado)
            await self.security_service.check_login_rate_limits(request.username, ip_address)
            
            # 2. Autenticar credenciales (delegado)
            user = await self.user_service.authenticate_credentials(
                request.username, 
                request.password
            )
            
            # 3. Generar tokens (delegado)
            tokens = await self.token_service.create_user_tokens(
                user=user,
                session_data={
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "device_info": request.device_info,
                    "remember_me": request.remember_me
                }
            )
            
            # 4. Post-login cleanup (delegado)
            await self.user_service.handle_successful_login(user.id)
            
            # 5. Preparar respuesta
            return {
                "tokens": tokens,
                "user": await self._build_user_info(user),
                "session": {
                    "session_id": tokens["session_id"],
                    "login_at": datetime.now(timezone.utc).isoformat(),
                    "ip_address": ip_address,
                    "remember_me": request.remember_me
                }
            }
            
        except Exception as e:
            # Registrar fallo (delegado)
            if hasattr(self, 'security_service'):
                await self.security_service.record_failed_login(
                    request.username, ip_address
                )
            raise e
    
    async def refresh_access_token(
        self,
        refresh_token: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Refrescar access token - Flujo simplificado
        """
        try:
            self._ensure_dependencies()
            
            # 1. Validar refresh token (delegado)
            token_data = await self.token_service.validate_refresh_token(refresh_token)
            
            # 2. Verificar usuario activo (delegado)
            user = await self.user_service.get_active_user(token_data["user_id"])
            
            # 3. Generar nuevo access token (delegado)
            new_tokens = await self.token_service.refresh_user_tokens(
                user=user,
                refresh_token=refresh_token,
                ip_address=ip_address
            )
            
            return {
                "access_token": new_tokens["access_token"],
                "refresh_token": new_tokens.get("refresh_token"),
                "expires_in": new_tokens["expires_in"],
                "refreshed_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in token refresh: {e}")
            raise e
    
    async def logout_user(
        self,
        access_token: str,
        ip_address: Optional[str] = None,
        logout_all_devices: bool = False
    ) -> Dict[str, Any]:
        """
        Logout de usuario - Flujo simplificado
        """
        try:
            self._ensure_dependencies()
            
            # 1. Extraer info del token (delegado)
            token_data = await self.token_service.extract_token_data(access_token)
            
            # 2. Invalidar tokens (delegado)
            result = await self.token_service.invalidate_user_tokens(
                user_id=token_data["user_id"],
                current_jti=token_data["jti"],
                logout_all_devices=logout_all_devices
            )
            
            # 3. Cleanup (delegado)
            await self.user_service.handle_logout(token_data["user_id"])
            
            return {
                "logged_out": True,
                "logout_at": datetime.now(timezone.utc).isoformat(),
                "tokens_revoked": result.get("tokens_revoked", 1)
            }
            
        except Exception as e:
            logger.error(f"Error in logout: {e}")
            raise e
    
    # ==========================================
    # MÉTODOS PRIVADOS - SOLO HELPERS SIMPLES
    # ==========================================
    
    async def _build_user_info(self, user) -> Dict[str, Any]:
        """Construir información del usuario para respuesta"""
        try:
            # Obtener permisos (cache)
            permissions_data = await user_cache_service.get_user_permissions(user.id)
            
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "can_login": True,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "roles": permissions_data.get("roles", []),
                "permissions": permissions_data.get("permissions", [])
            }
        except Exception as e:
            logger.warning(f"Error building user info: {e}")
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
                "is_active": user.is_active,
                "roles": [],
                "permissions": []
            }


# ==========================================
# SERVICIOS ESPECIALIZADOS (SEPARADOS)
# ==========================================

class UserService:
    """Servicio especializado en operaciones de usuario"""
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
    
    async def authenticate_credentials(self, username: str, password: str):
        """Autenticar credenciales de usuario"""
        from database.models.users import User
        from sqlalchemy import select, and_, or_
        from core.password_manager import verify_user_password
        
        # Buscar usuario
        stmt = select(User).where(
            and_(
                or_(User.username == username.lower(), User.email == username.lower()),
                User.deleted_at.is_(None)
            )
        )
        
        result = await self.db_session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise AuthenticationException(
                message="Credenciales inválidas",
                error_code=ErrorCode.AUTH_INVALID_CREDENTIALS
            )
        
        if not user.is_active:
            raise AuthenticationException(
                message="Usuario inactivo",
                error_code=ErrorCode.AUTH_USER_INACTIVE
            )
        
        if not verify_user_password(password, user.password_hash):
            raise AuthenticationException(
                message="Credenciales inválidas",
                error_code=ErrorCode.AUTH_INVALID_CREDENTIALS
            )
        
        return user
    
    async def get_active_user(self, user_id: int):
        """Obtener usuario activo por ID"""
        from database.models.users import User
        from sqlalchemy import select, and_
        
        stmt = select(User).where(
            and_(User.id == user_id, User.deleted_at.is_(None))
        )
        
        result = await self.db_session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise AuthenticationException(
                message="Usuario no válido",
                error_code=ErrorCode.AUTH_USER_INACTIVE
            )
        
        return user
    
    async def handle_successful_login(self, user_id: int):
        """Manejar post-login exitoso"""
        from database.models.users import User
        from sqlalchemy import update
        
        try:
            # Actualizar último login
            stmt = update(User).where(User.id == user_id).values(
                last_login_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            await self.db_session.execute(stmt)
            await self.db_session.commit()
            
            # Limpiar intentos fallidos (si hay servicio)
            try:
                from cache.services.security_service import SecurityService
                security = SecurityService()
                await security.clear_failed_attempts(user_id)
            except ImportError:
                pass
                
        except Exception as e:
            logger.warning(f"Error in post-login handling: {e}")
    
    async def handle_logout(self, user_id: int):
        """Manejar cleanup de logout"""
        try:
            # Invalidar cache
            await user_cache_service.invalidate_all_user_cache(user_id)
        except Exception as e:
            logger.warning(f"Error in logout cleanup: {e}")


class TokenService:
    """Servicio especializado en manejo de tokens"""
    
    async def create_user_tokens(self, user, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crear tokens para usuario autenticado"""
        try:
            # Obtener user secret
            from cache.services.user_cache import get_user_secret, create_user_secret
            user_secret = await get_user_secret(user.id)
            if not user_secret:
                user_secret = await create_user_secret(user.id)
            
            # Obtener permisos
            permissions_data = await user_cache_service.get_user_permissions(user.id)
            
            # Generar session ID
            session_id = f"sess_{secrets.token_urlsafe(16)}"
            
            # Crear access token
            access_token = jwt_manager.create_access_token(
                user_id=user.id,
                user_secret=user_secret,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                roles=permissions_data.get("roles", []),
                permissions=permissions_data.get("permissions", []),
                extra_claims={
                    "session_id": session_id,
                    **session_data
                }
            )
            
            # Crear refresh token
            refresh_token = jwt_manager.create_refresh_token(
                user_id=user.id,
                user_secret=user_secret,
                username=user.username
            )
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Error creating tokens: {e}")
            raise SystemException("Error generando tokens de autenticación")
    
    async def validate_refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Validar refresh token y extraer datos"""
        try:
            # Extraer user_id sin validar firma
            user_id = jwt_manager.extract_user_id_unsafe(refresh_token)
            if not user_id:
                raise AuthenticationException("Refresh token inválido")
            
            # Obtener user secret y validar completo
            from cache.services.user_cache import get_user_secret
            user_secret = await get_user_secret(user_id)
            if not user_secret:
                raise AuthenticationException("No se pudo validar token")
            
            payload = jwt_manager.decode_token(refresh_token, user_secret)
            
            # Verificar tipo de token
            if payload.get("token_type") != "refresh":
                raise AuthenticationException("Se requiere refresh token")
            
            return payload
            
        except Exception as e:
            logger.error(f"Error validating refresh token: {e}")
            raise AuthenticationException("Refresh token inválido")
    
    async def refresh_user_tokens(
        self, 
        user, 
        refresh_token: str, 
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generar nuevos tokens"""
        # Similar a create_user_tokens pero para refresh
        # Implementación simplificada...
        pass
    
    async def extract_token_data(self, access_token: str) -> Dict[str, Any]:
        """Extraer datos del access token"""
        try:
            user_id = jwt_manager.extract_user_id_unsafe(access_token)
            jti = jwt_manager.extract_jti_unsafe(access_token)
            
            if not user_id or not jti:
                raise AuthenticationException("Token inválido")
            
            return {"user_id": user_id, "jti": jti}
            
        except Exception as e:
            logger.error(f"Error extracting token data: {e}")
            raise AuthenticationException("Token inválido para logout")
    
    async def invalidate_user_tokens(
        self,
        user_id: int,
        current_jti: str,
        logout_all_devices: bool = False
    ) -> Dict[str, Any]:
        """Invalidar tokens del usuario"""
        try:
            from cache.services.blacklist_service import blacklist_token
            
            # Blacklistear token actual
            await blacklist_token(
                jti=current_jti,
                reason="user_logout",
                user_id=user_id
            )
            
            tokens_revoked = 1
            
            if logout_all_devices:
                # Blacklistear todos los tokens
                try:
                    from cache.services.blacklist_service import blacklist_all_user_tokens
                    result = await blacklist_all_user_tokens(user_id, "user_logout")
                    tokens_revoked = result.get("total_blacklisted", 1)
                except ImportError:
                    pass
            
            return {"tokens_revoked": tokens_revoked}
            
        except ImportError:
            return {"tokens_revoked": 0}
        except Exception as e:
            logger.error(f"Error invalidating tokens: {e}")
            return {"tokens_revoked": 0}


class SecurityService:
    """Servicio especializado en seguridad y rate limiting"""
    
    async def check_login_rate_limits(self, username: str, ip_address: Optional[str]):
        """Verificar rate limits para login"""
        try:
            from cache.services.rate_limit_service import rate_limit_service
            
            if ip_address:
                ip_allowed = await rate_limit_service.check_ip_rate_limit(
                    ip=ip_address,
                    action="login_attempt",
                    limit=10,
                    window_minutes=60
                )
                
                if not ip_allowed:
                    raise AuthenticationException("Demasiados intentos desde esta IP")
            
            user_allowed = await rate_limit_service.check_user_rate_limit(
                username=username,
                action="login_attempt",
                limit=5,
                window_minutes=15
            )
            
            if not user_allowed:
                raise AuthenticationException("Demasiados intentos para este usuario")
                
        except ImportError:
            # Sin rate limiting disponible
            pass
    
    async def record_failed_login(self, username: str, ip_address: Optional[str]):
        """Registrar intento fallido"""
        try:
            from cache.services.rate_limit_service import rate_limit_service
            await rate_limit_service.record_failed_attempt(ip_address, username, "invalid_credentials")
        except ImportError:
            pass
    
    async def clear_failed_attempts(self, user_id: int):
        """Limpiar intentos fallidos"""
        try:
            from cache.services.rate_limit_service import rate_limit_service
            await rate_limit_service.clear_failed_attempts(str(user_id))
        except ImportError:
            pass


# ==========================================
# FACTORY Y PROXY (SIMPLIFICADOS)
# ==========================================

def create_auth_service(db_session: AsyncSession) -> AuthService:
    """Factory para crear instancia del servicio"""
    return AuthService(db_session)


class AuthServiceProxy:
    """Proxy simplificado"""
    
    async def authenticate_user(self, request, ip_address=None, user_agent=None, db=None):
        if not db:
            raise SystemException("Database session required")
        
        service = create_auth_service(db)
        return await service.authenticate_user(request, ip_address, user_agent)
    
    async def refresh_token(self, request, ip_address=None, db=None):
        if not db:
            raise SystemException("Database session required")
        
        service = create_auth_service(db)
        return await service.refresh_access_token(request.refresh_token, ip_address)
    
    async def logout_user(self, access_token, ip_address=None, db=None):
        if not db:
            raise SystemException("Database session required")
        
        service = create_auth_service(db)
        return await service.logout_user(access_token, ip_address)


# Instancia global
auth_service = AuthServiceProxy()