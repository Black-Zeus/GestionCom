"""
volumes/backend-api/core/constants.py
Constantes y códigos de error del sistema
Centraliza todos los códigos de error, tipos de error, estados HTTP y configuraciones
utilizadas en toda la aplicación para mantener consistencia y facilitar mantenimiento.
"""
from enum import Enum
from typing import Dict


class ErrorCode(str, Enum):
    """
    Códigos de error estandarizados del sistema
    
    Formato: CATEGORIA_XXX donde XXX es un número secuencial de 3 dígitos
    Categorías:
    - AUTH: Errores de autenticación y autorización
    - VAL: Errores de validación de datos
    - RES: Errores relacionados con recursos (CRUD)
    - RATE: Errores de límite de velocidad
    - SYS: Errores del sistema y servicios
    - PERM: Errores específicos de permisos
    """
    
    # ==========================================
    # Authentication Errors (AUTH_XXX)
    # Errores relacionados con login, tokens y sesiones
    # ==========================================
    AUTH_INVALID_CREDENTIALS = "AUTH_001"    # Usuario/contraseña incorrectos
    AUTH_TOKEN_EXPIRED = "AUTH_002"          # Token JWT expirado
    AUTH_TOKEN_INVALID = "AUTH_003"          # Token JWT malformado o inválido
    AUTH_TOKEN_MISSING = "AUTH_004"          # No se proporcionó token
    AUTH_TOKEN_BLACKLISTED = "AUTH_005"      # Token en lista negra (logout)
    AUTH_USER_INACTIVE = "AUTH_006"          # Cuenta de usuario desactivada
    AUTH_USER_NOT_FOUND = "AUTH_007"         # Usuario no existe en el sistema
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_008"  # Sin permisos para la acción
    AUTH_ACCOUNT_LOCKED = "AUTH_009"         # Cuenta bloqueada por seguridad
    AUTH_TOO_MANY_ATTEMPTS = "AUTH_010"      # Exceso de intentos de login
    AUTH_SECRET_MISMATCH = "AUTH_011"        # Error en validación de secreto
    AUTH_REFRESH_TOKEN_INVALID = "AUTH_012"  # Refresh token inválido o expirado
    
    # ==========================================
    # Validation Errors (VAL_XXX)
    # Errores en validación de datos de entrada
    # ==========================================
    VALIDATION_FIELD_REQUIRED = "VAL_001"   # Campo obligatorio faltante
    VALIDATION_FIELD_FORMAT = "VAL_002"     # Formato de campo incorrecto
    VALIDATION_FIELD_LENGTH = "VAL_003"     # Longitud de campo inválida
    VALIDATION_EMAIL_INVALID = "VAL_004"    # Email con formato incorrecto
    VALIDATION_PASSWORD_WEAK = "VAL_005"    # Contraseña no cumple políticas
    VALIDATION_JSON_INVALID = "VAL_006"     # JSON malformado
    
    # ==========================================
    # Resource Errors (RES_XXX)
    # Errores en operaciones CRUD de recursos
    # ==========================================
    RESOURCE_NOT_FOUND = "RES_001"          # Recurso no existe (404)
    RESOURCE_DUPLICATE = "RES_002"          # Recurso ya existe (409)
    RESOURCE_CONFLICT = "RES_003"           # Conflicto en operación (409)
    RESOURCE_FORBIDDEN = "RES_004"          # Acceso al recurso denegado (403)
    RESOURCE_LOCKED = "RES_005"             # Recurso bloqueado para edición (423)
    
    # ==========================================
    # Rate Limiting Errors (RATE_XXX)
    # Errores por exceso de solicitudes
    # ==========================================
    RATE_LIMIT_EXCEEDED = "RATE_001"        # Límite general excedido
    RATE_LIMIT_LOGIN_EXCEEDED = "RATE_002"  # Límite de intentos de login
    RATE_LIMIT_IP_BLOCKED = "RATE_003"      # IP bloqueada por abuso
    
    # ==========================================
    # System Errors (SYS_XXX)
    # Errores internos del sistema y servicios
    # ==========================================
    SYSTEM_INTERNAL_ERROR = "SYS_001"       # Error interno no categorizado
    SYSTEM_SERVICE_UNAVAILABLE = "SYS_002"  # Servicio temporalmente no disponible
    SYSTEM_DATABASE_ERROR = "SYS_003"       # Error en base de datos
    SYSTEM_REDIS_ERROR = "SYS_004"          # Error en Redis/cache
    SYSTEM_CONFIGURATION_ERROR = "SYS_005"  # Error en configuración del sistema
    
    # ==========================================
    # Permission Errors (PERM_XXX)
    # Errores específicos del sistema de permisos
    # ==========================================
    PERMISSION_DENIED = "PERM_001"          # Permiso específico denegado
    PERMISSION_NOT_FOUND = "PERM_002"       # Permiso no existe en el sistema
    PERMISSION_ROLE_REQUIRED = "PERM_003"   # Rol específico requerido


class ErrorType(str, Enum):
    """
    Tipos de error para categorización y manejo
    
    Permite agrupar errores por categoría para aplicar
    lógica específica de manejo en el frontend o logging
    """
    AUTHENTICATION_ERROR = "AuthenticationError"    # Problemas de login/auth
    VALIDATION_ERROR = "ValidationError"            # Datos de entrada inválidos
    PERMISSION_ERROR = "PermissionError"            # Problemas de autorización
    RATE_LIMIT_ERROR = "RateLimitError"            # Límites de velocidad
    SYSTEM_ERROR = "SystemError"                    # Errores internos
    DATABASE_ERROR = "DatabaseError"                # Errores de BD
    CACHE_ERROR = "CacheError"                      # Errores de cache
    RESOURCE_ERROR = "ResourceError"                # Errores de recursos CRUD
    BUSINESS_ERROR = "BusinessError"                # Errores de lógica de negocio
    CONFIGURATION_ERROR = "ConfigurationError"      # Errores de configuración


class HTTPStatus(int, Enum):
    """
    Códigos de estado HTTP más utilizados en la API
    
    Centraliza los códigos HTTP para evitar números mágicos
    y facilitar mantenimiento
    """
    # Respuestas exitosas (2xx)
    OK = 200                    # Solicitud exitosa
    CREATED = 201              # Recurso creado exitosamente
    ACCEPTED = 202             # Solicitud aceptada para procesamiento
    NO_CONTENT = 204           # Exitosa pero sin contenido de respuesta
    
    # Errores del cliente (4xx)
    BAD_REQUEST = 400          # Solicitud malformada
    UNAUTHORIZED = 401         # Autenticación requerida
    FORBIDDEN = 403            # Acceso denegado
    NOT_FOUND = 404           # Recurso no encontrado
    METHOD_NOT_ALLOWED = 405   # Método HTTP no permitido
    CONFLICT = 409             # Conflicto con estado actual
    UNPROCESSABLE_ENTITY = 422 # Entidad no procesable (validación)
    TOO_MANY_REQUESTS = 429    # Límite de velocidad excedido
    
    # Errores del servidor (5xx)
    INTERNAL_SERVER_ERROR = 500 # Error interno del servidor
    BAD_GATEWAY = 502          # Gateway/proxy error
    SERVICE_UNAVAILABLE = 503   # Servicio temporalmente no disponible
    GATEWAY_TIMEOUT = 504      # Timeout en gateway/proxy


# ==========================================
# Mapeo de códigos de error a mensajes
# Proporciona mensajes legibles para usuarios finales
# ==========================================
ERROR_MESSAGES: Dict[str, str] = {
    # Mensajes de errores de autenticación
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
    
    # Mensajes de errores de validación
    ErrorCode.VALIDATION_FIELD_REQUIRED: "Campo requerido",
    ErrorCode.VALIDATION_FIELD_FORMAT: "Formato de campo inválido",
    ErrorCode.VALIDATION_FIELD_LENGTH: "Longitud de campo inválida",
    ErrorCode.VALIDATION_EMAIL_INVALID: "Formato de email inválido",
    ErrorCode.VALIDATION_PASSWORD_WEAK: "Contraseña no cumple requisitos de seguridad",
    ErrorCode.VALIDATION_JSON_INVALID: "Formato JSON inválido",
    
    # Mensajes de errores de recursos
    ErrorCode.RESOURCE_NOT_FOUND: "Recurso no encontrado",
    ErrorCode.RESOURCE_DUPLICATE: "Recurso ya existe", 
    ErrorCode.RESOURCE_CONFLICT: "Conflicto con recurso existente",
    ErrorCode.RESOURCE_FORBIDDEN: "Acceso al recurso denegado",
    ErrorCode.RESOURCE_LOCKED: "Recurso bloqueado temporalmente",

    # Mensajes de errores de límite de velocidad
    ErrorCode.RATE_LIMIT_EXCEEDED: "Límite de solicitudes excedido",
    ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED: "Límite de intentos de login excedido",
    ErrorCode.RATE_LIMIT_IP_BLOCKED: "IP bloqueada por exceso de solicitudes",
    
    # Mensajes de errores del sistema
    ErrorCode.SYSTEM_INTERNAL_ERROR: "Error interno del sistema",
    ErrorCode.SYSTEM_SERVICE_UNAVAILABLE: "Servicio no disponible",
    ErrorCode.SYSTEM_DATABASE_ERROR: "Error de base de datos",
    ErrorCode.SYSTEM_REDIS_ERROR: "Error de cache",
    ErrorCode.SYSTEM_CONFIGURATION_ERROR: "Error de configuración",
    
    # Mensajes de errores de permisos
    ErrorCode.PERMISSION_DENIED: "Acceso denegado",
    ErrorCode.PERMISSION_NOT_FOUND: "Permiso no encontrado",
    ErrorCode.PERMISSION_ROLE_REQUIRED: "Rol requerido para esta operación",
}


# ==========================================
# Constantes de Redis Keys
# Patrones para keys de Redis organizados por funcionalidad
# ==========================================
class RedisKeys:
    """
    Patrones estandarizados para keys de Redis
    
    Mantiene consistencia en el naming de keys y facilita
    el mantenimiento del cache. Usa métodos de clase para
    generar keys con parámetros dinámicos.
    """
    
    # Cache de secretos de usuario para validación JWT
    USER_SECRET = "user:secret:{user_id}"
    
    # Listas negras de tokens (logout y revocación)
    TOKEN_BLACKLIST = "token:blacklist:{jti}"
    REFRESH_BLACKLIST = "refresh:blacklist:{jti}"
    
    # Rate limiting por IP y usuario
    RATE_LIMIT_IP = "rate:ip:{ip_address}"
    RATE_LIMIT_LOGIN = "rate:login:{ip_address}"
    RATE_LIMIT_USER = "rate:user:{user_id}"
    
    # Bloqueo temporal de usuarios por seguridad
    USER_LOCKOUT = "lockout:user:{user_id}"
    
    @classmethod
    def user_secret(cls, user_id: int) -> str:
        """Generar key para secreto de usuario"""
        return cls.USER_SECRET.format(user_id=user_id)
    
    @classmethod
    def token_blacklist(cls, jti: str) -> str:
        """Generar key para token en lista negra"""
        return cls.TOKEN_BLACKLIST.format(jti=jti)
    
    @classmethod
    def refresh_blacklist(cls, jti: str) -> str:
        """Generar key para refresh token en lista negra"""
        return cls.REFRESH_BLACKLIST.format(jti=jti)
    
    @classmethod
    def rate_limit_ip(cls, ip_address: str) -> str:
        """Generar key para rate limiting por IP"""
        return cls.RATE_LIMIT_IP.format(ip_address=ip_address)
    
    @classmethod
    def rate_limit_login(cls, ip_address: str) -> str:
        """Generar key para rate limiting de login por IP"""
        return cls.RATE_LIMIT_LOGIN.format(ip_address=ip_address)
    
    @classmethod
    def rate_limit_user(cls, user_id: int) -> str:
        """Generar key para rate limiting por usuario"""
        return cls.RATE_LIMIT_USER.format(user_id=user_id)
    
    @classmethod
    def user_lockout(cls, user_id: int) -> str:
        """Generar key para bloqueo temporal de usuario"""
        return cls.USER_LOCKOUT.format(user_id=user_id)


# ==========================================
# Constantes de JWT
# Claims estándar y tipos de token utilizados
# ==========================================
class JWTClaims:
    """
    Claims estándar utilizados en tokens JWT
    
    Define los nombres de campos utilizados en el payload
    de los tokens para mantener consistencia
    """
    USER_ID = "user_id"              # ID único del usuario
    USERNAME = "username"            # Nombre de usuario
    EMAIL = "email"                  # Email del usuario
    IS_ACTIVE = "is_active"         # Estado activo del usuario
    ROLES = "roles"                  # Lista de roles del usuario
    PERMISSIONS = "permissions"      # Lista de permisos del usuario
    JTI = "jti"                     # JWT ID para tracking y revocación
    TOKEN_TYPE = "token_type"       # Tipo de token (access/refresh)
    ISSUED_AT = "iat"               # Timestamp de emisión
    EXPIRES_AT = "exp"              # Timestamp de expiración
    NOT_BEFORE = "nbf"              # Token no válido antes de este timestamp
    ISSUER = "iss"                  # Emisor del token
    AUDIENCE = "aud"                # Audiencia del token


class TokenType(str, Enum):
    """Tipos de token JWT soportados por el sistema"""
    ACCESS = "access"               # Token de acceso para API calls
    REFRESH = "refresh"             # Token para renovar access tokens


# ==========================================
# Configuración por defecto
# Valores predeterminados para paginación y timeouts
# ==========================================

# Paginación de APIs
DEFAULT_PAGINATION_LIMIT = 50      # Límite por defecto de registros por página
DEFAULT_PAGINATION_OFFSET = 0      # Offset inicial para paginación
MAX_PAGINATION_LIMIT = 1000        # Máximo de registros permitidos por página

# Timeouts en segundos para operaciones críticas
DEFAULT_REQUEST_TIMEOUT = 30       # Timeout general para requests HTTP
DEFAULT_DATABASE_TIMEOUT = 10      # Timeout para operaciones de base de datos
DEFAULT_CACHE_TIMEOUT = 5          # Timeout para operaciones de cache

# Políticas de seguridad para contraseñas
MIN_PASSWORD_LENGTH = 8            # Longitud mínima de contraseña
MAX_PASSWORD_LENGTH = 128          # Longitud máxima de contraseña
PASSWORD_REGEX = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$"  # Al menos 1 mayúscula, 1 minúscula, 1 número

# Headers estándar para trazabilidad y versionado
TRACE_ID_HEADER = "X-Trace-ID"     # Header para ID de trazabilidad
REQUEST_ID_HEADER = "X-Request-ID"  # Header para ID de request único
API_VERSION_HEADER = "X-API-Version"  # Header para versión de API

# ==========================================
# Configuración de seguridad
# Rutas que requieren autenticación JWT
# ==========================================
PRIVATE_ROUTES = [
    # Gestión de usuarios - requiere autenticación
    "/users",
    
    # Operaciones de autenticación que requieren token válido
    "/auth/logout",                 # Logout requiere token activo para invalidar
    "/auth/validate-token",         # Validación requiere el token a verificar
    "/auth/refresh",                # Refresh requiere refresh token válido
    "/auth/change-password",

    # Módulos de negocio que requieren autenticación
    "/warehouses",                  # Gestión de almacenes y bodegas
    "/menu-items",                  # Gestión de Menus
    "/user-menus",                  # Gestión de Menus del usuario
]

# Flag para indicar si ResponseManager está disponible
# Permite fallback a respuestas básicas si hay problemas
RESPONSE_MANAGER_AVAILABLE = True