"""
volumes/backend-api/core/exceptions.py
Excepciones personalizadas del sistema
"""
from typing import Optional, Dict, Any
from .constants import ErrorCode, ErrorType, HTTPStatus


class BaseAppException(Exception):
    """Excepción base para la aplicación"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        error_type: ErrorType,
        status_code: HTTPStatus = HTTPStatus.INTERNAL_SERVER_ERROR,
        details: Optional[str] = None,
        field: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.error_type = error_type
        self.status_code = status_code
        self.details = details
        self.field = field
        self.extra_data = extra_data or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir excepción a diccionario para respuesta"""
        return {
            "code": self.error_code,
            "type": self.error_type,
            "details": self.details,
            "field": self.field,
            **self.extra_data
        }


# ==========================================
# Authentication Exceptions
# ==========================================

class AuthenticationException(BaseAppException):
    """Excepción base para errores de autenticación"""
    
    def __init__(
        self,
        message: str = "Error de autenticación",
        error_code: ErrorCode = ErrorCode.AUTH_INVALID_CREDENTIALS,
        status_code: HTTPStatus = HTTPStatus.UNAUTHORIZED,
        details: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            error_type=ErrorType.AUTHENTICATION_ERROR,
            status_code=status_code,
            details=details,
            **kwargs
        )


class InvalidCredentialsException(AuthenticationException):
    """Credenciales inválidas"""
    
    def __init__(self, details: Optional[str] = None):
        super().__init__(
            message="Credenciales inválidas",
            error_code=ErrorCode.AUTH_INVALID_CREDENTIALS,
            details=details or "El correo electrónico o la contraseña son incorrectos"
        )


class TokenExpiredException(AuthenticationException):
    """Token expirado"""
    
    def __init__(self, token_type: str = "access"):
        super().__init__(
            message="Token ha expirado",
            error_code=ErrorCode.AUTH_TOKEN_EXPIRED,
            details=f"El {token_type} token ha expirado, solicite uno nuevo"
        )


class TokenInvalidException(AuthenticationException):
    """Token inválido"""
    
    def __init__(self, details: Optional[str] = None):
        super().__init__(
            message="Token inválido",
            error_code=ErrorCode.AUTH_TOKEN_INVALID,
            details=details or "El token proporcionado no es válido"
        )


class TokenMissingException(AuthenticationException):
    """Token faltante"""
    
    def __init__(self):
        super().__init__(
            message="Token de autenticación requerido",
            error_code=ErrorCode.AUTH_TOKEN_MISSING,
            details="Debe proporcionar un token de autenticación válido en el header Authorization"
        )


class TokenBlacklistedException(AuthenticationException):
    """Token en blacklist"""
    
    def __init__(self, reason: Optional[str] = None):
        super().__init__(
            message="Token ha sido revocado",
            error_code=ErrorCode.AUTH_TOKEN_BLACKLISTED,
            details=reason or "El token ha sido invalidado y ya no puede ser utilizado"
        )


class UserInactiveException(AuthenticationException):
    """Usuario inactivo"""
    
    def __init__(self):
        super().__init__(
            message="Cuenta de usuario inactiva",
            error_code=ErrorCode.AUTH_USER_INACTIVE,
            details="Su cuenta ha sido desactivada, contacte al administrador"
        )


class UserNotFoundException(AuthenticationException):
    """Usuario no encontrado"""
    
    def __init__(self):
        super().__init__(
            message="Usuario no encontrado",
            error_code=ErrorCode.AUTH_USER_NOT_FOUND,
            status_code=HTTPStatus.NOT_FOUND,
            details="No existe un usuario con las credenciales proporcionadas"
        )


class AccountLockedException(AuthenticationException):
    """Cuenta bloqueada"""
    
    def __init__(self, unlock_time: Optional[str] = None):
        details = "Su cuenta ha sido bloqueada temporalmente debido a múltiples intentos fallidos"
        if unlock_time:
            details += f". Intente nuevamente después de {unlock_time}"
        
        super().__init__(
            message="Cuenta bloqueada temporalmente",
            error_code=ErrorCode.AUTH_ACCOUNT_LOCKED,
            details=details
        )


class InsufficientPermissionsException(AuthenticationException):
    """Permisos insuficientes"""
    
    def __init__(self, required_permission: Optional[str] = None):
        details = "No tiene permisos para realizar esta operación"
        if required_permission:
            details += f". Permiso requerido: {required_permission}"
        
        super().__init__(
            message="Permisos insuficientes",
            error_code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
            status_code=HTTPStatus.FORBIDDEN,
            details=details
        )


# ==========================================
# Validation Exceptions
# ==========================================

class ValidationException(BaseAppException):
    """Excepción base para errores de validación"""
    
    def __init__(
        self,
        message: str = "Error de validación",
        error_code: ErrorCode = ErrorCode.VALIDATION_FIELD_REQUIRED,
        field: Optional[str] = None,
        details: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            error_type=ErrorType.VALIDATION_ERROR,
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            field=field,
            details=details,
            **kwargs
        )


class FieldRequiredException(ValidationException):
    """Campo requerido"""
    
    def __init__(self, field_name: str):
        super().__init__(
            message=f"El campo '{field_name}' es requerido",
            error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
            field=field_name,
            details=f"Debe proporcionar un valor para el campo '{field_name}'"
        )


class InvalidEmailException(ValidationException):
    """Email inválido"""
    
    def __init__(self, email: str):
        super().__init__(
            message="Formato de email inválido",
            error_code=ErrorCode.VALIDATION_EMAIL_INVALID,
            field="email",
            details=f"El email '{email}' no tiene un formato válido"
        )


class WeakPasswordException(ValidationException):
    """Contraseña débil"""
    
    def __init__(self):
        super().__init__(
            message="Contraseña no cumple requisitos de seguridad",
            error_code=ErrorCode.VALIDATION_PASSWORD_WEAK,
            field="password",
            details="La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número"
        )


# ==========================================
# Rate Limiting Exceptions
# ==========================================

class RateLimitException(BaseAppException):
    """Excepción base para límites de tasa"""
    
    def __init__(
        self,
        message: str = "Límite de solicitudes excedido",
        error_code: ErrorCode = ErrorCode.RATE_LIMIT_EXCEEDED,
        retry_after: Optional[int] = None,
        **kwargs
    ):
        extra_data = kwargs.get("extra_data", {})
        if retry_after:
            extra_data["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code=error_code,
            error_type=ErrorType.RATE_LIMIT_ERROR,
            status_code=HTTPStatus.TOO_MANY_REQUESTS,
            extra_data=extra_data,
            **kwargs
        )


class TooManyRequestsException(RateLimitException):
    """Demasiadas solicitudes"""
    
    def __init__(self, retry_after: Optional[int] = None):
        super().__init__(
            message="Límite de solicitudes excedido",
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            details="Ha excedido el límite de solicitudes permitidas",
            retry_after=retry_after
        )


class TooManyLoginAttemptsException(RateLimitException):
    """Demasiados intentos de login"""
    
    def __init__(self, retry_after: Optional[int] = None):
        super().__init__(
            message="Límite de intentos de login excedido",
            error_code=ErrorCode.RATE_LIMIT_LOGIN_EXCEEDED,
            details="Ha excedido el límite de intentos de login. Intente más tarde",
            retry_after=retry_after
        )


# ==========================================
# System Exceptions
# ==========================================

class SystemException(BaseAppException):
    """Excepción base para errores del sistema"""
    
    def __init__(
        self,
        message: str = "Error interno del sistema",
        error_code: ErrorCode = ErrorCode.SYSTEM_INTERNAL_ERROR,
        details: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            error_type=ErrorType.SYSTEM_ERROR,
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            details=details,
            **kwargs
        )


class DatabaseException(SystemException):
    """Error de base de datos"""
    
    def __init__(self, details: Optional[str] = None):
        super().__init__(
            message="Error de base de datos",
            error_code=ErrorCode.SYSTEM_DATABASE_ERROR,
            details=details or "Error al conectar o consultar la base de datos"
        )


class CacheException(SystemException):
    """Error de cache/Redis"""
    
    def __init__(self, details: Optional[str] = None):
        super().__init__(
            message="Error de cache",
            error_code=ErrorCode.SYSTEM_REDIS_ERROR,
            details=details or "Error al conectar o consultar el servicio de cache"
        )


class ConfigurationException(SystemException):
    """Error de configuración"""
    
    def __init__(self, setting_name: str):
        super().__init__(
            message="Error de configuración",
            error_code=ErrorCode.SYSTEM_CONFIGURATION_ERROR,
            details=f"Configuración faltante o inválida: {setting_name}"
        )