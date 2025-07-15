"""
Constantes y códigos de error del sistema
"""
from enum import Enum
from typing import Dict, Any


class ErrorCode(str, Enum):
    """Códigos de error estandarizados"""
    
    # ==========================================
    # Authentication Errors (AUTH_XXX)
    # ==========================================
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_TOKEN_INVALID = "AUTH_003"
    AUTH_TOKEN_MISSING = "AUTH_004"
    AUTH_TOKEN_BLACKLISTED = "AUTH_005"
    AUTH_USER_INACTIVE = "AUTH_006"
    AUTH_USER_NOT_FOUND = "AUTH_007"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_008"
    AUTH_ACCOUNT_LOCKED = "AUTH_009"
    AUTH_TOO_MANY_ATTEMPTS = "AUTH_010"
    AUTH_SECRET_MISMATCH = "AUTH_011"
    AUTH_REFRESH_TOKEN_INVALID = "AUTH_012"
    
    # ==========================================
    # Validation Errors (VAL_XXX)
    # ==========================================
    VALIDATION_FIELD_REQUIRED = "VAL_001"
    VALIDATION_FIELD_FORMAT = "VAL_002"
    VALIDATION_FIELD_LENGTH = "VAL_003"
    VALIDATION_EMAIL_INVALID = "VAL_004"
    VALIDATION_PASSWORD_WEAK = "VAL_005"
    VALIDATION_JSON_INVALID = "VAL_006"
    
    # ==========================================
    # Rate Limiting Errors (RATE_XXX)
    # ==========================================
    RATE_LIMIT_EXCEEDED = "RATE_001"
    RATE_LIMIT_LOGIN_EXCEEDED = "RATE_002"
    RATE_LIMIT_IP_BLOCKED = "RATE_003"
    
    # ==========================================
    # System Errors (SYS_XXX)
    # ==========================================
    SYSTEM_INTERNAL_ERROR = "SYS_001"
    SYSTEM_SERVICE_UNAVAILABLE = "SYS_002"
    SYSTEM_DATABASE_ERROR = "SYS_003"
    SYSTEM_REDIS_ERROR = "SYS_004"
    SYSTEM_CONFIGURATION_ERROR = "SYS_005"
    
    # ==========================================
    # Permission Errors (PERM_XXX)
    # ==========================================
    PERMISSION_DENIED = "PERM_001"
    PERMISSION_NOT_FOUND = "PERM_002"
    PERMISSION_ROLE_REQUIRED = "PERM_003"


class ErrorType(str, Enum):
    """Tipos de error para categorización"""
    AUTHENTICATION_ERROR = "AuthenticationError"
    VALIDATION_ERROR = "ValidationError"
    PERMISSION_ERROR = "PermissionError"
    RATE_LIMIT_ERROR = "RateLimitError"
    SYSTEM_ERROR = "SystemError"
    DATABASE_ERROR = "DatabaseError"
    CACHE_ERROR = "CacheError"


class HTTPStatus(int, Enum):
    """Códigos de estado HTTP más usados"""
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    TOO_MANY_REQUESTS = 429
    
    INTERNAL_SERVER_ERROR = 500
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503
    GATEWAY_TIMEOUT = 504


# ==========================================
# Mapeo de códigos de error a mensajes
# ==========================================
ERROR_MESSAGES: Dict[str, str] = {
    # Authentication
    ErrorCode.AUTH_INVALID_CREDENTIALS: "Credenciales inválidas",
    ErrorCode.AUTH_TOKEN_EXPIRED: "Token ha expirado",
    ErrorCode.AUTH_TOKEN_INVALID: "Token inválido",
    ErrorCode.AUTH_TOKEN_MISSING: "Token de autenticación requerido",
    ErrorCode.AUTH_TOKEN_BLACKLISTED: "Token ha sido revocado",
    ErrorCode.AUTH_USER_INACTIVE: "Cuenta de usuario inactiva",
    ErrorCode.AUTH_USER_NOT_FOUND: "Usuario no encontrado",
    ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS: "Permisos insuficientes",
    ErrorCode.AUTH_ACCOUNT_LOCKED: "Cuenta bloqueada temporalmente",
    ErrorCode.AUTH_TOO_MANY_ATTEMPTS: "Demasiados intentos de acceso",
    ErrorCode.AUTH_SECRET_MISMATCH: "Error en validación de seguridad",
    ErrorCode.AUTH_REFRESH_TOKEN_INVALID: "Refresh token inválido",
    
    # Validation
    ErrorCode.VALIDATION_FIELD_REQUIRED: "Campo requerido",
    ErrorCode.VALIDATION_FIELD_FORMAT: "Formato de campo inválido",
    ErrorCode.VALIDATION_FIELD_LENGTH: "Longitud de campo inválida",
    ErrorCode.VALIDATION_EMAIL_INVALID: "Formato de email inválido",
    ErrorCode.VALIDATION_PASSWORD_WEAK: "Contraseña no cumple requisitos de seguridad",
    ErrorCode.VALIDATION_JSON_INVALID: "Formato JSON inválido",
    
    # Rate Limiting
    ErrorCode.RATE_LIMIT_EXCEEDED: "Límite de solicitudes excedido",
    ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED: "Límite de intentos de login excedido",
    ErrorCode.RATE_LIMIT_IP_BLOCKED: "IP bloqueada por exceso de solicitudes",
    
    # System
    ErrorCode.SYSTEM_INTERNAL_ERROR: "Error interno del sistema",
    ErrorCode.SYSTEM_SERVICE_UNAVAILABLE: "Servicio no disponible",
    ErrorCode.SYSTEM_DATABASE_ERROR: "Error de base de datos",
    ErrorCode.SYSTEM_REDIS_ERROR: "Error de cache",
    ErrorCode.SYSTEM_CONFIGURATION_ERROR: "Error de configuración",
    
    # Permissions
    ErrorCode.PERMISSION_DENIED: "Acceso denegado",
    ErrorCode.PERMISSION_NOT_FOUND: "Permiso no encontrado",
    ErrorCode.PERMISSION_ROLE_REQUIRED: "Rol requerido para esta operación",
}


# ==========================================
# Constantes de Redis Keys
# ==========================================
class RedisKeys:
    """Patrones de keys para Redis"""
    
    # User secrets cache
    USER_SECRET = "user:secret:{user_id}"
    
    # Token blacklist
    TOKEN_BLACKLIST = "token:blacklist:{jti}"
    REFRESH_BLACKLIST = "refresh:blacklist:{jti}"
    
    # Rate limiting
    RATE_LIMIT_IP = "rate:ip:{ip_address}"
    RATE_LIMIT_LOGIN = "rate:login:{ip_address}"
    RATE_LIMIT_USER = "rate:user:{user_id}"
    
    # User lockout
    USER_LOCKOUT = "lockout:user:{user_id}"
    
    @classmethod
    def user_secret(cls, user_id: int) -> str:
        return cls.USER_SECRET.format(user_id=user_id)
    
    @classmethod
    def token_blacklist(cls, jti: str) -> str:
        return cls.TOKEN_BLACKLIST.format(jti=jti)
    
    @classmethod
    def refresh_blacklist(cls, jti: str) -> str:
        return cls.REFRESH_BLACKLIST.format(jti=jti)
    
    @classmethod
    def rate_limit_ip(cls, ip_address: str) -> str:
        return cls.RATE_LIMIT_IP.format(ip_address=ip_address)
    
    @classmethod
    def rate_limit_login(cls, ip_address: str) -> str:
        return cls.RATE_LIMIT_LOGIN.format(ip_address=ip_address)
    
    @classmethod
    def rate_limit_user(cls, user_id: int) -> str:
        return cls.RATE_LIMIT_USER.format(user_id=user_id)
    
    @classmethod
    def user_lockout(cls, user_id: int) -> str:
        return cls.USER_LOCKOUT.format(user_id=user_id)


# ==========================================
# Constantes de JWT
# ==========================================
class JWTClaims:
    """Claims estándar de JWT"""
    USER_ID = "user_id"
    USERNAME = "username"
    EMAIL = "email"
    IS_ACTIVE = "is_active"
    ROLES = "roles"
    PERMISSIONS = "permissions"
    JTI = "jti"  # JWT ID para tracking
    TOKEN_TYPE = "token_type"  # access | refresh
    ISSUED_AT = "iat"
    EXPIRES_AT = "exp"
    NOT_BEFORE = "nbf"
    ISSUER = "iss"
    AUDIENCE = "aud"


class TokenType(str, Enum):
    """Tipos de token JWT"""
    ACCESS = "access"
    REFRESH = "refresh"


# ==========================================
# Configuración por defecto
# ==========================================
DEFAULT_PAGINATION_LIMIT = 50
DEFAULT_PAGINATION_OFFSET = 0
MAX_PAGINATION_LIMIT = 1000

# Timeouts
DEFAULT_REQUEST_TIMEOUT = 30  # seconds
DEFAULT_DATABASE_TIMEOUT = 10  # seconds
DEFAULT_CACHE_TIMEOUT = 5  # seconds

# Security
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$"

# Headers
TRACE_ID_HEADER = "X-Trace-ID"
REQUEST_ID_HEADER = "X-Request-ID"
API_VERSION_HEADER = "X-API-Version"

# Rutas que requieren autenticación
# En core/constants.py
PRIVATE_ROUTES = [
    # Rutas principales del sistema
    "/users",              # Gestión de usuarios
    "/inventory",          # Gestión de inventarios
    "/admin",              # Panel administrativo
    "/reports",            # Reportes y estadísticas
    
    # Rutas de autenticación que requieren JWT
    "/auth/logout",        # Logout requiere token activo
    "/auth/validate-token" # Validación requiere el token a verificar
]
RESPONSE_MANAGER_AVAILABLE = True