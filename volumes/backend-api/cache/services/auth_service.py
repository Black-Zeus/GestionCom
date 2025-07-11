"""
Servicio principal de autenticación - Login, Logout, Refresh, Password Management
Integra todos los componentes del sistema de auth: JWT, cache, secrets, etc.
"""
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_
from sqlalchemy.orm import selectinload

from core.config import settings
from core.security import jwt_manager
from core.password_manager import PasswordManager, hash_user_password, verify_user_password
from core.exceptions import (
    AuthenticationException,
    ValidationException,
    UserInactiveException,
    TokenInvalidException,
    TokenBlacklistedException,
    RateLimitException,
    SystemException
)
from core.constants import ErrorCode, HTTPStatus

# Schemas
from schemas.auth import (
    LoginRequest, LoginResponse, UserAuthInfo,
    RefreshTokenRequest, RefreshTokenResponse,
    LogoutRequest, LogoutResponse,
    PasswordChangeRequest, PasswordChangeResponse,
    PasswordResetRequest, PasswordResetResponse,
    PasswordResetConfirm, PasswordResetConfirmResponse
)
from schemas.token import TokenType, BlacklistReason

# Services
from services.user_secret_service import UserSecretService
from cache.services.user_cache import user_cache_service

# Models
from models.user import User


# Configurar logger
logger = logging.getLogger(__name__)


class AuthService:
    """
    Servicio principal de autenticación
    Maneja todo el flujo de auth: login, logout, refresh, passwords
    """
    
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session
        self.user_secret_service = UserSecretService(db_session)
        
        # Configuración de seguridad
        self.max_login_attempts = 5
        self.lockout_duration_minutes = 30
        self.password_reset_token_ttl_hours = 24
        
        # Rate limiting
        self.login_rate_limit_per_ip = 10  # por hora
        self.password_reset_rate_limit = 3  # por hora por IP
    
    # ==========================================
    # LOGIN Y AUTENTICACIÓN
    # ==========================================
    
    async def login(
        self,
        request: LoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> LoginResponse:
        """
        Autenticar usuario y generar tokens JWT
        
        Args:
            request: Datos de login
            ip_address: IP del cliente
            user_agent: User agent del cliente
            
        Returns:
            LoginResponse con tokens y datos del usuario
            
        Raises:
            AuthenticationException: Credenciales inválidas
            UserInactiveException: Usuario inactivo
            RateLimitException: Demasiados intentos
        """
        try:
            logger.info(f"Login attempt for user: {request.username}")
            
            # 1. Verificar rate limiting
            await self._check_login_rate_limits(request.username, ip_address)
            
            # 2. Obtener usuario por username/email
            user = await self._get_user_by_login_identifier(request.username)
            if not user:
                await self._record_failed_login_attempt(request.username, ip_address)
                raise AuthenticationException(
                    message="Credenciales inválidas",
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS
                )
            
            # 3. Verificar que el usuario esté activo
            if not user.is_active:
                raise UserInactiveException()
            
            # 4. Verificar contraseña
            if not verify_user_password(request.password, user.password_hash):
                await self._record_failed_login_attempt(request.username, ip_address, user.id)
                raise AuthenticationException(
                    message="Credenciales inválidas",
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS
                )
            
            # 5. Verificar lockout del usuario
            if await self._is_user_locked_out(user.id):
                raise AuthenticationException(
                    message="Usuario bloqueado temporalmente",
                    error_code=ErrorCode.AUTH_USER_LOCKED,
                    details="Demasiados intentos fallidos. Intente más tarde."
                )
            
            # 6. Generar o obtener user secret
            user_secret = await self.user_secret_service.get_or_create_user_secret(user.id)
            
            # 7. Obtener roles y permisos del usuario
            permissions_data = await user_cache_service.get_user_permissions(user.id)
            roles = permissions_data.get("roles", [])
            permissions = permissions_data.get("permissions", [])
            
            # 8. Generar tokens JWT
            session_id = self._generate_session_id()
            
            # Calcular tiempo de expiración (remember_me extiende la sesión)
            access_token_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
            refresh_token_days = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
            
            if request.remember_me:
                refresh_token_days = refresh_token_days * 2  # Extender refresh token
            
            # Access Token
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
                    "device_info": request.device_info,
                    "ip_address": ip_address,
                    "remember_me": request.remember_me
                }
            )
            
            # Refresh Token
            access_payload = jwt_manager.decode_token_unsafe(access_token)
            access_jti = access_payload.get("jti")
            
            refresh_token = jwt_manager.create_refresh_token(
                user_id=user.id,
                user_secret=user_secret,
                username=user.username,
                jti_access_token=access_jti
            )
            
            # 9. Actualizar último login
            await self._update_user_last_login(user.id)
            
            # 10. Limpiar intentos fallidos
            await self._clear_failed_login_attempts(user.id)
            
            # 11. Cachear datos del usuario
            await user_cache_service.cache_user_auth_data(
                user_id=user.id,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                full_name=f"{user.first_name} {user.last_name}"
            )
            
            # 12. Crear respuesta
            user_info = UserAuthInfo(
                id=user.id,
                username=user.username,
                email=user.email,
                full_name=f"{user.first_name} {user.last_name}",
                first_name=user.first_name,
                last_name=user.last_name,
                is_active=user.is_active,
                can_login=True,
                last_login_at=user.last_login_at,
                roles=roles,
                permissions=permissions,
                password_expires_at=self._calculate_password_expiry(user.password_changed_at),
                must_change_password=self._must_change_password(user.password_changed_at)
            )
            
            logger.info(f"Login successful for user {user.id} ({user.username})")
            
            return LoginResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="Bearer",
                expires_in=access_token_minutes * 60,  # En segundos
                user=user_info,
                login_at=datetime.now(timezone.utc),
                session_id=session_id
            )
            
        except (AuthenticationException, UserInactiveException, RateLimitException):
            raise
        except Exception as e:
            logger.error(f"Error in login for {request.username}: {e}")
            raise SystemException(
                message="Error interno en login",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # REFRESH TOKEN
    # ==========================================
    
    async def refresh_token(
        self,
        request: RefreshTokenRequest,
        ip_address: Optional[str] = None
    ) -> RefreshTokenResponse:
        """
        Renovar access token usando refresh token
        
        Args:
            request: Refresh token request
            ip_address: IP del cliente
            
        Returns:
            RefreshTokenResponse con nuevo access token
            
        Raises:
            TokenInvalidException: Refresh token inválido
            TokenBlacklistedException: Token en blacklist
            UserInactiveException: Usuario inactivo
        """
        try:
            logger.debug("Refresh token request received")
            
            # 1. Extraer user_id del refresh token (sin validar aún)
            user_id = jwt_manager.extract_user_id_unsafe(request.refresh_token)
            if not user_id:
                raise TokenInvalidException("Refresh token inválido")
            
            # 2. Obtener user secret para validar token
            user_secret = await user_cache_service.get_user_secret(user_id)
            if not user_secret:
                raise TokenInvalidException("No se pudo validar refresh token")
            
            # 3. Validar refresh token completo
            payload = jwt_manager.decode_token(request.refresh_token, user_secret)
            
            # 4. Verificar que sea un refresh token
            if payload.get("token_type") != TokenType.REFRESH:
                raise TokenInvalidException("Se requiere un refresh token")
            
            # 5. Verificar que no esté en blacklist
            jti = payload.get("jti")
            if await self._is_token_blacklisted(jti):
                raise TokenBlacklistedException("Refresh token ha sido revocado")
            
            # 6. Obtener usuario y verificar que esté activo
            user = await self._get_user_by_id(user_id)
            if not user or not user.is_active:
                raise UserInactiveException()
            
            # 7. Obtener roles y permisos actualizados
            permissions_data = await user_cache_service.get_user_permissions(user.id)
            roles = permissions_data.get("roles", [])
            permissions = permissions_data.get("permissions", [])
            
            # 8. Generar nuevo access token
            new_access_token = jwt_manager.create_access_token(
                user_id=user.id,
                user_secret=user_secret,
                username=user.username,
                email=user.email,
                is_active=user.is_active,
                roles=roles,
                permissions=permissions,
                extra_claims={
                    "session_id": payload.get("session_id"),
                    "ip_address": ip_address,
                    "refreshed_from": jti
                }
            )
            
            # 9. Opcionalmente generar nuevo refresh token (rotación)
            new_refresh_token = None
            if settings.JWT_REFRESH_TOKEN_ROTATION:
                # Blacklistear el refresh token anterior
                await self._blacklist_token(
                    jti=jti,
                    reason=BlacklistReason.TOKEN_ROTATION,
                    user_id=user.id
                )
                
                # Generar nuevo refresh token
                new_access_payload = jwt_manager.decode_token_unsafe(new_access_token)
                new_access_jti = new_access_payload.get("jti")
                
                new_refresh_token = jwt_manager.create_refresh_token(
                    user_id=user.id,
                    user_secret=user_secret,
                    username=user.username,
                    jti_access_token=new_access_jti
                )
            
            # 10. Crear información actualizada del usuario (opcional)
            updated_user_info = None
            if settings.INCLUDE_USER_INFO_IN_REFRESH:
                updated_user_info = UserAuthInfo(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    full_name=f"{user.first_name} {user.last_name}",
                    first_name=user.first_name,
                    last_name=user.last_name,
                    is_active=user.is_active,
                    can_login=True,
                    last_login_at=user.last_login_at,
                    roles=roles,
                    permissions=permissions,
                    password_expires_at=self._calculate_password_expiry(user.password_changed_at),
                    must_change_password=self._must_change_password(user.password_changed_at)
                )
            
            logger.info(f"Token refresh successful for user {user.id}")
            
            return RefreshTokenResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="Bearer",
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user=updated_user_info,
                refreshed_at=datetime.now(timezone.utc)
            )
            
        except (TokenInvalidException, TokenBlacklistedException, UserInactiveException):
            raise
        except Exception as e:
            logger.error(f"Error in refresh token: {e}")
            raise SystemException(
                message="Error renovando token",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # LOGOUT
    # ==========================================
    
    async def logout(
        self,
        request: LogoutRequest,
        current_user_id: int,
        current_token_jti: str
    ) -> LogoutResponse:
        """
        Cerrar sesión del usuario
        
        Args:
            request: Logout request
            current_user_id: ID del usuario actual
            current_token_jti: JTI del token actual
            
        Returns:
            LogoutResponse con confirmación
        """
        try:
            logger.info(f"Logout request for user {current_user_id}")
            
            tokens_invalidated = 0
            
            # 1. Blacklistear el access token actual
            await self._blacklist_token(
                jti=current_token_jti,
                reason=BlacklistReason.USER_LOGOUT,
                user_id=current_user_id
            )
            tokens_invalidated += 1
            
            # 2. Blacklistear refresh token si se proporciona
            if request.refresh_token:
                try:
                    # Extraer JTI del refresh token
                    refresh_payload = jwt_manager.decode_token_unsafe(request.refresh_token)
                    refresh_jti = refresh_payload.get("jti")
                    
                    if refresh_jti:
                        await self._blacklist_token(
                            jti=refresh_jti,
                            reason=BlacklistReason.USER_LOGOUT,
                            user_id=current_user_id
                        )
                        tokens_invalidated += 1
                except Exception as e:
                    logger.warning(f"Error blacklisting refresh token: {e}")
            
            # 3. Si logout_all_devices, blacklistear todos los tokens del usuario
            if request.logout_all_devices:
                try:
                    bulk_result = await self._blacklist_all_user_tokens(
                        user_id=current_user_id,
                        reason=BlacklistReason.USER_LOGOUT,
                        exclude_current=False  # Ya blacklisteamos el actual arriba
                    )
                    tokens_invalidated += bulk_result.get("total_blacklisted", 0) - 1  # Restar el actual que ya contamos
                except Exception as e:
                    logger.warning(f"Error in logout all devices: {e}")
            
            # 4. Invalidar cache del usuario
            await user_cache_service.invalidate_all_user_cache(current_user_id)
            
            logger.info(f"Logout successful for user {current_user_id}, {tokens_invalidated} tokens invalidated")
            
            return LogoutResponse(
                message="Logout exitoso",
                logged_out_at=datetime.now(timezone.utc),
                tokens_invalidated=tokens_invalidated
            )
            
        except Exception as e:
            logger.error(f"Error in logout for user {current_user_id}: {e}")
            raise SystemException(
                message="Error en logout",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # CAMBIO DE CONTRASEÑA
    # ==========================================
    
    async def change_password(
        self,
        request: PasswordChangeRequest,
        current_user_id: int
    ) -> PasswordChangeResponse:
        """
        Cambiar contraseña del usuario autenticado
        
        Args:
            request: Password change request
            current_user_id: ID del usuario actual
            
        Returns:
            PasswordChangeResponse con confirmación
            
        Raises:
            AuthenticationException: Contraseña actual incorrecta
            ValidationException: Nueva contraseña inválida
        """
        try:
            logger.info(f"Password change request for user {current_user_id}")
            
            # 1. Obtener usuario
            user = await self._get_user_by_id(current_user_id)
            if not user:
                raise AuthenticationException(
                    message="Usuario no encontrado",
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND
                )
            
            # 2. Verificar contraseña actual
            if not verify_user_password(request.current_password, user.password_hash):
                raise AuthenticationException(
                    message="Contraseña actual incorrecta",
                    error_code=ErrorCode.AUTH_INVALID_CREDENTIALS
                )
            
            # 3. Validar nueva contraseña (ya validada en schema, pero doble check)
            validation_result = PasswordManager.validate_password_strength(request.new_password)
            if not validation_result.is_valid:
                raise ValidationException(
                    message="Nueva contraseña no cumple requisitos",
                    error_code=ErrorCode.VALIDATION_PASSWORD_WEAK,
                    details=validation_result.errors
                )
            
            # 4. Verificar que la nueva contraseña sea diferente
            if verify_user_password(request.new_password, user.password_hash):
                raise ValidationException(
                    message="La nueva contraseña debe ser diferente a la actual",
                    error_code=ErrorCode.VALIDATION_PASSWORD_SAME
                )
            
            # 5. Hashear nueva contraseña
            new_password_hash = hash_user_password(request.new_password)
            
            # 6. Actualizar contraseña en BD
            await self._update_user_password(current_user_id, new_password_hash)
            
            # 7. Regenerar user secret (invalida todos los tokens existentes)
            await self.user_secret_service.regenerate_user_secret(
                user_id=current_user_id,
                invalidate_tokens=True
            )
            
            # 8. Blacklistear todas las sesiones si se requiere
            sessions_invalidated = 0
            if request.invalidate_all_sessions:
                try:
                    bulk_result = await self._blacklist_all_user_tokens(
                        user_id=current_user_id,
                        reason=BlacklistReason.PASSWORD_CHANGE,
                        exclude_current=False
                    )
                    sessions_invalidated = bulk_result.get("total_blacklisted", 0)
                except Exception as e:
                    logger.warning(f"Error invalidating sessions after password change: {e}")
            
            # 9. Invalidar cache del usuario
            await user_cache_service.invalidate_all_user_cache(current_user_id)
            
            logger.info(f"Password changed successfully for user {current_user_id}")
            
            return PasswordChangeResponse(
                message="Contraseña cambiada exitosamente",
                changed_at=datetime.now(timezone.utc),
                sessions_invalidated=sessions_invalidated,
                must_login_again=True
            )
            
        except (AuthenticationException, ValidationException):
            raise
        except Exception as e:
            logger.error(f"Error changing password for user {current_user_id}: {e}")
            raise SystemException(
                message="Error cambiando contraseña",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # MÉTODOS PRIVADOS - CONSULTAS DE BASE DE DATOS
    # ==========================================
    
    async def _get_user_by_login_identifier(self, identifier: str) -> Optional[User]:
        """
        Obtener usuario por username o email
        """
        try:
            stmt = select(User).where(
                and_(
                    or_(
                        User.username == identifier.lower(),
                        User.email == identifier.lower()
                    ),
                    User.deleted_at.is_(None)
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting user by identifier {identifier}: {e}")
            return None
    
    async def _get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Obtener usuario por ID
        """
        try:
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def _update_user_last_login(self, user_id: int) -> None:
        """
        Actualizar timestamp de último login
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    last_login_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
            )
            
            await self.db_session.execute(stmt)
            await self.db_session.commit()
            
        except Exception as e:
            logger.error(f"Error updating last login for user {user_id}: {e}")
            await self.db_session.rollback()
    
    async def _update_user_password(self, user_id: int, new_password_hash: str) -> None:
        """
        Actualizar contraseña del usuario
        """
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    password_hash=new_password_hash,
                    password_changed_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
            )
            
            result = await self.db_session.execute(stmt)
            if result.rowcount == 0:
                raise SystemException("No se pudo actualizar la contraseña")
            
            await self.db_session.commit()
            
        except Exception as e:
            logger.error(f"Error updating password for user {user_id}: {e}")
            await self.db_session.rollback()
            raise
    
    # ==========================================
    # MÉTODOS PRIVADOS - SEGURIDAD Y RATE LIMITING
    # ==========================================
    
    async def _check_login_rate_limits(self, username: str, ip_address: Optional[str]) -> None:
        """
        Verificar rate limits para login
        """
        try:
            # Importación dinámica para evitar circular imports
            from cache.services.rate_limit_service import check_rate_limit
            
            # Rate limit por IP
            if ip_address:
                ip_key = f"login_attempts_ip:{ip_address}"
                if not await check_rate_limit(ip_key, self.login_rate_limit_per_ip, 3600):
                    raise RateLimitException(
                        message="Demasiados intentos de login desde esta IP",
                        retry_after=3600
                    )
            
            # Rate limit por username
            username_key = f"login_attempts_user:{username}"
            if not await check_rate_limit(username_key, self.max_login_attempts, 1800):
                raise RateLimitException(
                    message="Demasiados intentos de login para este usuario",
                    retry_after=1800
                )
                
        except ImportError:
            # Si no hay servicio de rate limiting, continuar sin rate limit
            logger.warning("Rate limiting service not available")
        except RateLimitException:
            raise
        except Exception as e:
            logger.warning(f"Error checking rate limits: {e}")
    
    async def _record_failed_login_attempt(
        self,
        username: str,
        ip_address: Optional[str],
        user_id: Optional[int] = None
    ) -> None:
        """
        Registrar intento fallido de login
        """
        try:
            # Incrementar contadores de rate limiting
            from cache.services.rate_limit_service import increment_counter
            
            if ip_address:
                await increment_counter(f"login_attempts_ip:{ip_address}", 3600)
            
            await increment_counter(f"login_attempts_user:{username}", 1800)
            
            if user_id:
                await increment_counter(f"failed_attempts_user:{user_id}", 1800)
                
        except ImportError:
            logger.warning("Rate limiting service not available for recording failed attempts")
        except Exception as e:
            logger.warning(f"Error recording failed login attempt: {e}")
    
    async def _clear_failed_login_attempts(self, user_id: int) -> None:
        """
        Limpiar intentos fallidos después de login exitoso
        """
        try:
            from cache.services.rate_limit_service import clear_counter
            
            await clear_counter(f"failed_attempts_user:{user_id}")
            
        except ImportError:
            pass
        except Exception as e:
            logger.warning(f"Error clearing failed login attempts: {e}")
    
    async def _is_user_locked_out(self, user_id: int) -> bool:
        """
        Verificar si el usuario está bloqueado
        """
        try:
            from cache.services.rate_limit_service import get_counter_value
            
            failed_attempts = await get_counter_value(f"failed_attempts_user:{user_id}")
            return failed_attempts >= self.max_login_attempts
            
        except ImportError:
            return False
        except Exception as e:
            logger.warning(f"Error checking user lockout: {e}")
            return False
    
    # ==========================================
    # MÉTODOS PRIVADOS - TOKEN MANAGEMENT
    # ==========================================
    
    async def _is_token_blacklisted(self, jti: str) -> bool:
        """
        Verificar si un token está en blacklist
        """
        try:
            from cache.services.blacklist_service import is_token_blacklisted
            
            return await is_token_blacklisted(jti)
            
        except ImportError:
            logger.warning("Blacklist service not available")
            return False
        except Exception as e:
            logger.warning(f"Error checking token blacklist: {e}")
            return False
    
    async def _blacklist_token(
        self,
        jti: str,
        reason: BlacklistReason,
        user_id: int,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """
        Agregar token a blacklist
        """
        try:
            from cache.services.blacklist_service import blacklist_token
            
            return await blacklist_token(
                jti=jti,
                reason=reason.value,
                user_id=user_id,
                expires_at=expires_at
            )
            
        except ImportError:
            logger.warning("Blacklist service not available")
            return False
        except Exception as e:
            logger.error(f"Error blacklisting token {jti}: {e}")
            return False
    
    async def _blacklist_all_user_tokens(
        self,
        user_id: int,
        reason: BlacklistReason,
        exclude_current: bool = False,
        current_jti: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Blacklistear todos los tokens de un usuario
        """
        try:
            from cache.services.blacklist_service import blacklist_user_tokens
            
            return await blacklist_user_tokens(
                user_id=user_id,
                reason=reason.value,
                exclude_jti=current_jti if exclude_current else None
            )
            
        except ImportError:
            logger.warning("Blacklist service not available")
            return {"total_blacklisted": 0}
        except Exception as e:
            logger.error(f"Error blacklisting all tokens for user {user_id}: {e}")
            return {"total_blacklisted": 0}
    
    # ==========================================
    # MÉTODOS PRIVADOS - UTILIDADES
    # ==========================================
    
    def _generate_session_id(self) -> str:
        """
        Generar ID único de sesión
        """
        return f"sess_{secrets.token_urlsafe(16)}"
    
    def _calculate_password_expiry(self, password_changed_at: Optional[datetime]) -> Optional[datetime]:
        """
        Calcular cuándo expira la contraseña
        """
        if not password_changed_at:
            return None
        
        # Configurar política de expiración de contraseñas
        password_max_age_days = getattr(settings, 'PASSWORD_MAX_AGE_DAYS', 90)
        
        return password_changed_at + timedelta(days=password_max_age_days)
    
    def _must_change_password(self, password_changed_at: Optional[datetime]) -> bool:
        """
        Verificar si el usuario debe cambiar su contraseña
        """
        if not password_changed_at:
            return True  # Nunca cambió contraseña
        
        password_expiry = self._calculate_password_expiry(password_changed_at)
        if not password_expiry:
            return False
        
        return datetime.now(timezone.utc) > password_expiry


# ==========================================
# FACTORY Y FUNCIONES DE CONVENIENCIA
# ==========================================

def create_auth_service(db_session: AsyncSession) -> AuthService:
    """
    Factory para crear instancia del servicio de autenticación
    """
    return AuthService(db_session)


async def authenticate_user_credentials(
    username: str,
    password: str,
    db_session: AsyncSession,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    remember_me: bool = False,
    device_info: Optional[str] = None
) -> LoginResponse:
    """
    Función de conveniencia para autenticar usuario
    """
    auth_service = create_auth_service(db_session)
    
    login_request = LoginRequest(
        username=username,
        password=password,
        remember_me=remember_me,
        device_info=device_info
    )
    
    return await auth_service.login(
        request=login_request,
        ip_address=ip_address,
        user_agent=user_agent
    )


async def refresh_user_token(
    refresh_token: str,
    db_session: AsyncSession,
    ip_address: Optional[str] = None
) -> RefreshTokenResponse:
    """
    Función de conveniencia para refresh de token
    """
    auth_service = create_auth_service(db_session)
    
    refresh_request = RefreshTokenRequest(refresh_token=refresh_token)
    
    return await auth_service.refresh_token(
        request=refresh_request,
        ip_address=ip_address
    )


async def logout_user(
    current_user_id: int,
    current_token_jti: str,
    db_session: AsyncSession,
    refresh_token: Optional[str] = None,
    logout_all_devices: bool = False
) -> LogoutResponse:
    """
    Función de conveniencia para logout
    """
    auth_service = create_auth_service(db_session)
    
    logout_request = LogoutRequest(
        refresh_token=refresh_token,
        logout_all_devices=logout_all_devices
    )
    
    return await auth_service.logout(
        request=logout_request,
        current_user_id=current_user_id,
        current_token_jti=current_token_jti
    )


async def change_user_password(
    current_user_id: int,
    current_password: str,
    new_password: str,
    confirm_password: str,
    db_session: AsyncSession,
    invalidate_all_sessions: bool = True
) -> PasswordChangeResponse:
    """
    Función de conveniencia para cambio de contraseña
    """
    auth_service = create_auth_service(db_session)
    
    password_request = PasswordChangeRequest(
        current_password=current_password,
        new_password=new_password,
        confirm_password=confirm_password,
        invalidate_all_sessions=invalidate_all_sessions
    )
    
    return await auth_service.change_password(
        request=password_request,
        current_user_id=current_user_id
    )