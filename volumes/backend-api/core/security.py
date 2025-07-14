"""
Utilidades de seguridad para JWT con doble secreto y manejo de contraseñas
"""
import secrets
import hashlib
import uuid
from datetime import datetime, timezone, timedelta, timezone
from typing import Optional, Dict, Any, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt

from .config import settings
from .constants import JWTClaims, TokenType, ErrorCode
from .exceptions import (
    TokenExpiredException,
    TokenInvalidException,
    AuthenticationException,
    SystemException
)


# ==========================================
# Password Management
# ==========================================

class PasswordManager:
    """Manejador de contraseñas con bcrypt"""
    
    def __init__(self):
        self.pwd_context = CryptContext(
            schemes=["bcrypt"],
            deprecated="auto",
            bcrypt__rounds=12
        )
    
    def hash_password(self, password: str) -> str:
        """
        Generar hash de contraseña usando bcrypt
        """
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Verificar contraseña contra hash
        """
        try:
            return self.pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False
    
    def needs_update(self, hashed_password: str) -> bool:
        """
        Verificar si el hash necesita actualización
        """
        return self.pwd_context.needs_update(hashed_password)


# ==========================================
# User Secret Management
# ==========================================

class UserSecretManager:
    """Manejador de secrets individuales de usuarios"""
    
    @staticmethod
    def generate_user_secret() -> str:
        """
        Generar un nuevo secret para usuario usando SHA-256
        """
        # Combinar múltiples fuentes de entropía
        random_bytes = secrets.token_bytes(32)
        timestamp = str(datetime.utcnow().timestamp())
        uuid_str = str(uuid.uuid4())
        
        # Crear hash SHA-256
        combined = f"{random_bytes.hex()}{timestamp}{uuid_str}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    @staticmethod
    def combine_secrets(system_secret: str, user_secret: str) -> str:
        """
        Combinar secret del sistema con secret del usuario
        """
        combined = f"{system_secret}:{user_secret}"
        return hashlib.sha256(combined.encode()).hexdigest()


# ==========================================
# JWT Token Management
# ==========================================

class JWTManager:
    """Manejador de tokens JWT con doble secreto"""
    
    def __init__(self):
        self.algorithm = settings.JWT_ALGORITHM
        self.system_secret = settings.JWT_SECRET_SYSTEM
        self.access_token_expire_minutes = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    
    def _create_jwt_key(self, user_secret: str) -> str:
        """
        Crear clave JWT combinando secret del sistema y del usuario
        """
        return UserSecretManager.combine_secrets(self.system_secret, user_secret)
    
    def _generate_jti(self) -> str:
        """
        Generar JWT ID único
        """
        return str(uuid.uuid4())
    
    def create_access_token(
        self,
        user_id: int,
        user_secret: str,
        username: str,
        email: str,
        is_active: bool = True,
        roles: Optional[list] = None,
        permissions: Optional[list] = None,
        extra_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Crear access token JWT
        """
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            JWTClaims.USER_ID: user_id,
            JWTClaims.USERNAME: username,
            JWTClaims.EMAIL: email,
            JWTClaims.IS_ACTIVE: is_active,
            JWTClaims.ROLES: roles or [],
            JWTClaims.PERMISSIONS: permissions or [],
            JWTClaims.TOKEN_TYPE: TokenType.ACCESS,
            JWTClaims.JTI: self._generate_jti(),
            JWTClaims.ISSUED_AT: int(now.timestamp()),
            JWTClaims.EXPIRES_AT: int(expire.timestamp()),
            JWTClaims.NOT_BEFORE: int(now.timestamp()),
            JWTClaims.ISSUER: "inventario-api",
            JWTClaims.AUDIENCE: "inventario-users"
        }
        
        # Agregar claims adicionales si se proporcionan
        if extra_claims:
            payload.update(extra_claims)
        
        try:
            jwt_key = self._create_jwt_key(user_secret)
            token = jwt.encode(payload, jwt_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            raise SystemException(
                message="Error al generar token de acceso",
                details=f"Error interno: {str(e)}"
            )
    
    def create_refresh_token(
        self,
        user_id: int,
        user_secret: str,
        username: str,
        jti_access_token: Optional[str] = None
    ) -> str:
        """
        Crear refresh token JWT
        """
        now = datetime.now(timezone.utc)
        expire = now + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            JWTClaims.USER_ID: user_id,
            JWTClaims.USERNAME: username,
            JWTClaims.TOKEN_TYPE: TokenType.REFRESH,
            JWTClaims.JTI: self._generate_jti(),
            JWTClaims.ISSUED_AT: int(now.timestamp()),
            JWTClaims.EXPIRES_AT: int(expire.timestamp()),
            JWTClaims.NOT_BEFORE: int(now.timestamp()),
            JWTClaims.ISSUER: "inventario-api",
            JWTClaims.AUDIENCE: "inventario-users"
        }
        
        # Referenciar access token si se proporciona
        if jti_access_token:
            payload["access_jti"] = jti_access_token
        
        try:
            jwt_key = self._create_jwt_key(user_secret)
            token = jwt.encode(payload, jwt_key, algorithm=self.algorithm)
            return token
        except Exception as e:
            raise SystemException(
                message="Error al generar refresh token",
                details=f"Error interno: {str(e)}"
            )
    
    def decode_token(self, token: str, user_secret: str) -> Dict[str, Any]:
        """
        Decodificar y validar token JWT
        """
        try:
            jwt_key = self._create_jwt_key(user_secret)
            payload = jwt.decode(
                token,
                jwt_key,
                algorithms=[self.algorithm],
                audience="inventario-users",
                issuer="inventario-api"
            )
            
            # Validar campos obligatorios
            required_fields = [JWTClaims.USER_ID, JWTClaims.TOKEN_TYPE, JWTClaims.JTI]
            for field in required_fields:
                if field not in payload:
                    raise TokenInvalidException(f"Campo requerido '{field}' no encontrado en token")
            
            # Validar expiración manualmente (jose ya lo hace, pero por seguridad)
            if JWTClaims.EXPIRES_AT in payload:
                exp_timestamp = payload[JWTClaims.EXPIRES_AT]
                if datetime.now(timezone.utc).timestamp() > exp_timestamp:
                    raise TokenExpiredException()
            
            return payload
            
        except JWTError as e:
            error_msg = str(e).lower()
            
            if "expired" in error_msg:
                raise TokenExpiredException()
            elif "signature" in error_msg:
                raise TokenInvalidException("Firma del token inválida")
            elif "audience" in error_msg:
                raise TokenInvalidException("Audiencia del token inválida")
            elif "issuer" in error_msg:
                raise TokenInvalidException("Emisor del token inválido")
            else:
                raise TokenInvalidException(f"Token malformado: {str(e)}")
        
        except Exception as e:
            raise TokenInvalidException(f"Error al procesar token: {str(e)}")
    
    def extract_user_id_unsafe(self, token: str) -> Optional[int]:
        """
        Extraer user_id de token SIN validar (para obtener user_secret)
        USAR CON PRECAUCIÓN - Solo para obtener datos necesarios para validación
        """
        try:
            # Decodificar sin verificar firma
            payload = jwt.get_unverified_claims(token)
            return payload.get(JWTClaims.USER_ID)
        except Exception:
            return None
    
    def extract_jti_unsafe(self, token: str) -> Optional[str]:
        """
        Extraer JTI de token SIN validar (para blacklist)
        USAR CON PRECAUCIÓN - Solo para operaciones de blacklist
        """
        try:
            payload = jwt.get_unverified_claims(token)
            return payload.get(JWTClaims.JTI)
        except Exception:
            return None
    
    def get_token_remaining_time(self, token: str) -> Optional[int]:
        """
        Obtener tiempo restante del token en segundos
        """
        try:
            payload = jwt.get_unverified_claims(token)
            exp_timestamp = payload.get(JWTClaims.EXPIRES_AT)
            
            if exp_timestamp:
                remaining = exp_timestamp - datetime.now(timezone.utc).timestamp()
                return max(0, int(remaining))
            
            return None
        except Exception:
            return None


# ==========================================
# Security Utilities
# ==========================================

class SecurityUtils:
    """Utilidades de seguridad generales"""
    
    @staticmethod
    def generate_random_string(length: int = 32) -> str:
        """
        Generar string aleatorio seguro
        """
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_numeric_code(length: int = 6) -> str:
        """
        Generar código numérico aleatorio
        """
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    @staticmethod
    def hash_string(text: str, salt: Optional[str] = None) -> str:
        """
        Generar hash SHA-256 de string con salt opcional
        """
        if salt:
            text = f"{text}{salt}"
        return hashlib.sha256(text.encode()).hexdigest()
    
    @staticmethod
    def constant_time_compare(a: str, b: str) -> bool:
        """
        Comparación en tiempo constante para prevenir timing attacks
        """
        return secrets.compare_digest(a, b)
    
    @staticmethod
    def mask_email(email: str) -> str:
        """
        Enmascarar email para logs (user@domain.com -> u***@d*****.com)
        """
        try:
            username, domain = email.split('@')
            masked_username = username[0] + '*' * (len(username) - 1)
            
            domain_parts = domain.split('.')
            if len(domain_parts) >= 2:
                masked_domain = domain_parts[0][0] + '*' * (len(domain_parts[0]) - 1)
                masked_domain += '.' + domain_parts[-1]
            else:
                masked_domain = domain
            
            return f"{masked_username}@{masked_domain}"
        except Exception:
            return "***@***.***"
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, list[str]]:
        """
        Validar fuerza de contraseña
        Retorna (es_válida, lista_de_errores)
        """
        errors = []
        
        if len(password) < 8:
            errors.append("Debe tener al menos 8 caracteres")
        
        if len(password) > 128:
            errors.append("No puede tener más de 128 caracteres")
        
        if not any(c.islower() for c in password):
            errors.append("Debe contener al menos una letra minúscula")
        
        if not any(c.isupper() for c in password):
            errors.append("Debe contener al menos una letra mayúscula")
        
        if not any(c.isdigit() for c in password):
            errors.append("Debe contener al menos un número")
        
        # Opcional: caracteres especiales
        special_chars = "@$!%*?&"
        if not any(c in special_chars for c in password):
            errors.append(f"Se recomienda usar caracteres especiales: {special_chars}")
        
        return len(errors) == 0, errors


# ==========================================
# Instancias globales
# ==========================================

# Instancias reutilizables
password_manager = PasswordManager()
jwt_manager = JWTManager()
security_utils = SecurityUtils()

# Funciones de conveniencia para compatibilidad con tu código actual
def verify_jwt_token(token: str) -> Dict[str, Any]:
    """
    Función de compatibilidad - DEBE ser reemplazada por el flujo completo
    Esta función requiere obtener el user_secret desde cache/BD
    """
    # NOTA: Esta función necesita ser integrada con el cache service
    # para obtener el user_secret. Ver auth/dependencies.py para implementación completa
    raise NotImplementedError(
        "Esta función debe ser reemplazada por el flujo completo en auth/dependencies.py"
    )


def hash_password(password: str) -> str:
    """Función de conveniencia para hash de contraseñas"""
    return password_manager.hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Función de conveniencia para verificación de contraseñas"""
    return password_manager.verify_password(plain_password, hashed_password)