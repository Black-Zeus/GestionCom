"""
Schemas Pydantic para autenticación JWT - Login, Refresh, Logout
Integrado con tu arquitectura de validaciones y respuestas
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
import re

from core.password_manager import PasswordManager


# ==========================================
# SCHEMAS DE LOGIN
# ==========================================
class LoginRequest_old(BaseModel):
    """Schema optimizado para login - username/email automático"""
    
    username: str = Field(
        ..., 
        min_length=3,
        max_length=50,
        description="Username o email del usuario"
    )
    password: str = Field(
        ..., 
        min_length=1,
        max_length=128,
        description="Contraseña del usuario"
    )
    remember_me: bool = Field(
        default=False, 
        description="Mantener sesión activa más tiempo"
    )
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validar y normalizar username o email automáticamente"""
        if not v:
            raise ValueError('Username/email es requerido')
        
        v = v.strip()
        
        # Si parece email, validar formato y normalizar
        if '@' in v:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v):
                raise ValueError('Formato de email inválido')
            return v.lower()  # Emails siempre en minúsculas
        
        # Si es username, validar formato y normalizar  
        v = v.lower()
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Username solo puede contener letras, números, puntos, guiones y guiones bajos')
        
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validar que la contraseña no esté vacía"""
        if not v:
            raise ValueError('Contraseña es requerida')
        return v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "admin.demo",
                "password": "admin123",
                "remember_me": False
            }
        }
    )

class LoginResponse(BaseModel):
    """Schema para respuesta de login exitoso"""
    
    # Información de tokens
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="Bearer", description="Tipo de token")
    expires_in: int = Field(..., description="Tiempo de expiración del access token en segundos")
    
    # Información del usuario
    user: "UserAuthInfo" = Field(..., description="Información básica del usuario autenticado")
    
    # Metadatos de la sesión
    login_at: datetime = Field(..., description="Timestamp del login")
    session_id: str = Field(..., description="ID único de la sesión")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "Bearer",
                "expires_in": 1800,
                "user": {
                    "id": 1,
                    "username": "juan.perez",
                    "email": "juan.perez@empresa.com",
                    "full_name": "Juan Pérez",
                    "is_active": True,
                    "roles": ["MANAGER", "USER"],
                    "permissions": ["PRODUCTS.VIEW", "INVENTORY.VIEW"]
                },
                "login_at": "2024-01-15T10:30:00Z",
                "session_id": "abc123def456"
            }
        }
    )

class UserAuthInfo(BaseModel):
    """Schema para información básica del usuario en respuestas de auth"""
    
    id: int = Field(..., description="ID único del usuario")
    username: str = Field(..., description="Username del usuario")
    email: str = Field(..., description="Email del usuario")
    full_name: str = Field(..., description="Nombre completo del usuario")
    first_name: str = Field(..., description="Nombre del usuario")
    last_name: str = Field(..., description="Apellido del usuario")
    is_active: bool = Field(..., description="Si el usuario está activo")
    can_login: bool = Field(..., description="Si el usuario puede hacer login")
    last_login_at: Optional[datetime] = Field(None, description="Último login previo")
    
    # Roles y permisos
    roles: List[str] = Field(default_factory=list, description="Códigos de roles asignados")
    permissions: List[str] = Field(default_factory=list, description="Códigos de permisos efectivos")
    
    # Metadatos útiles
    password_expires_at: Optional[datetime] = Field(None, description="Cuándo expira la contraseña")
    must_change_password: bool = Field(default=False, description="Si debe cambiar contraseña")
    
    model_config = ConfigDict(from_attributes=True)
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra= {
            "example": {
                    "id": 1,
                    "username": "juan.perez",
                    "email": "juan.perez@empresa.com",
                    "full_name": "Juan Pérez",
                    "first_name": "Juan",
                    "last_name": "Pérez",
                    "is_active": True,
                    "can_login": True,
                    "last_login_at": "2024-01-14T15:20:00Z",
                    "roles": ["MANAGER", "USER"],
                    "permissions": ["PRODUCTS.VIEW", "PRODUCTS.CREATE", "INVENTORY.VIEW"],
                    "password_expires_at": "2024-04-15T00:00:00Z",
                    "must_change_password": False
                }
            }
    )

# ==========================================
# SCHEMAS BÁSICOS (Locales)
# ==========================================
class LoginRequest(BaseModel):
    """Schema para solicitud de login"""
    
    username: str = Field(
        ..., 
        min_length=3,
        max_length=50,
        description="Username o email del usuario"
    )
    
    password: str = Field(
        ..., 
        min_length=1,
        max_length=128,
        description="Contraseña del usuario"
    )
    
    remember_me: bool = Field(
        default=False, 
        description="Si mantener la sesión por más tiempo"
    )
    

    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra= {
            "example": {
                "username": "admin",
                "password": "admin123", 
                "remember_me": False
            }
        }
    )

class TokenValidateRequest(BaseModel):
    """Schema para validación de token"""
    token: str = Field(..., description="Token a validar")

class PasswordStrengthCheck(BaseModel):
    """Schema para verificar fortaleza de contraseña"""
    password: str = Field(..., description="Contraseña a verificar")

class PasswordStrengthResponse(BaseModel):
    """Schema para respuesta de fortaleza"""
    is_valid: bool = Field(..., description="Si cumple requisitos")
    score: int = Field(..., description="Puntuación 0-100")
    errors: list = Field(default_factory=list, description="Errores encontrados")
    suggestions: list = Field(default_factory=list, description="Sugerencias")


# ==========================================
# SCHEMAS DE REFRESH TOKEN
# ==========================================

class RefreshTokenRequest(BaseModel):
    """Schema para solicitud de refresh token"""
    
    refresh_token: str = Field(
        ...,
        description="Refresh token JWT válido"
    )
    
    @field_validator('refresh_token')
    @classmethod
    def validate_refresh_token(cls, v):
        """Validar que el refresh token no esté vacío"""
        if not v or not v.strip():
            raise ValueError('Refresh token es requerido')
        return v.strip()
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
        )
        


class RefreshTokenResponse(BaseModel):
    """Schema para respuesta de refresh token"""
    
    access_token: str = Field(..., description="Nuevo JWT access token")
    refresh_token: Optional[str] = Field(None, description="Nuevo refresh token (si rotación está habilitada)")
    token_type: str = Field(default="Bearer", description="Tipo de token")
    expires_in: int = Field(..., description="Tiempo de expiración del access token en segundos")
    
    # Información actualizada del usuario (por si hubo cambios)
    user: Optional[UserAuthInfo] = Field(None, description="Información actualizada del usuario")
    
    refreshed_at: datetime = Field(..., description="Timestamp del refresh")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "Bearer",
                "expires_in": 1800,
                "refreshed_at": "2024-01-15T11:00:00Z"
            }
        }
    )


# ==========================================
# SCHEMAS DE LOGOUT
# ==========================================

class LogoutRequest(BaseModel):
    """Schema para solicitud de logout"""
    
    refresh_token: Optional[str] = Field(
        None,
        description="Refresh token a invalidar (opcional)"
    )
    
    logout_all_devices: bool = Field(
        default=False,
        description="Si cerrar sesión en todos los dispositivos"
    )
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "logout_all_devices": False
            }
        }
    )

class LogoutResponse(BaseModel):
    """Schema para respuesta de logout"""
    
    message: str = Field(default="Logout exitoso", description="Mensaje de confirmación")
    logged_out_at: datetime = Field(..., description="Timestamp del logout")
    tokens_invalidated: int = Field(..., description="Número de tokens invalidados")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "message": "Logout exitoso",
                "logged_out_at": "2024-01-15T12:00:00Z",
                "tokens_invalidated": 2
            }
        }
    )

# ==========================================
# SCHEMAS DE CAMBIO DE CONTRASEÑA
# ==========================================

class PasswordChangeRequest(BaseModel):
    """Schema para cambio de contraseña autenticado"""
    
    current_password: str = Field(
        ...,
        description="Contraseña actual"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña"
    )
    
    confirm_password: str = Field(
        ...,
        description="Confirmación de nueva contraseña"
    )
    
    invalidate_all_sessions: bool = Field(
        default=True,
        description="Si invalidar todas las sesiones existentes"
    )
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        """Validar fortaleza de nueva contraseña"""
        if not v:
            raise ValueError('Nueva contraseña es requerida')
        
        # Usar el validador del PasswordManager
        validation_result = PasswordManager.validate_password_strength(v)
        if not validation_result.is_valid:
            raise ValueError(f"Contraseña no cumple requisitos: {', '.join(validation_result.errors)}")
        
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v, info):
        """Validar que las contraseñas coincidan"""
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "current_password": "mi_contraseña_actual",
                "new_password": "Mi_Nueva_Contraseña_123!",
                "confirm_password": "Mi_Nueva_Contraseña_123!",
                "invalidate_all_sessions": True
            }
        }
    )


class PasswordChangeResponse(BaseModel):
    """Schema para respuesta de cambio de contraseña"""
    
    message: str = Field(default="Contraseña cambiada exitosamente", description="Mensaje de confirmación")
    changed_at: datetime = Field(..., description="Timestamp del cambio")
    sessions_invalidated: int = Field(..., description="Número de sesiones invalidadas")
    must_login_again: bool = Field(default=True, description="Si debe iniciar sesión nuevamente")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "message": "Contraseña cambiada exitosamente",
                "changed_at": "2024-01-15T12:30:00Z",
                "sessions_invalidated": 3,
                "must_login_again": True
            }
        }
    )


# ==========================================
# SCHEMAS DE RECUPERACIÓN DE CONTRASEÑA
# ==========================================

class PasswordResetRequest(BaseModel):
    """Schema para solicitar reset de contraseña"""
    
    email: EmailStr = Field(
        ...,
        description="Email del usuario para enviar link de recuperación"
    )
    
    recaptcha_token: Optional[str] = Field(
        None,
        description="Token de reCAPTCHA para prevenir spam"
    )
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "email": "juan.perez@empresa.com",
                "recaptcha_token": "03AGdBq24..."
            }
        }
    )


class PasswordResetResponse(BaseModel):
    """Schema para respuesta de solicitud de reset"""
    
    message: str = Field(
        default="Si el email existe, se envió un link de recuperación",
        description="Mensaje genérico por seguridad"
    )
    
    # No incluir información sensible que pueda revelar si el email existe
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "message": "Si el email existe, se envió un link de recuperación"
            }
        }
    )


class PasswordResetConfirm(BaseModel):
    """Schema para confirmar reset de contraseña con token"""
    
    token: str = Field(
        ...,
        description="Token de recuperación recibido por email"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña"
    )
    
    confirm_password: str = Field(
        ...,
        description="Confirmación de nueva contraseña"
    )
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v):
        """Validar fortaleza de nueva contraseña"""
        validation_result = PasswordManager.validate_password_strength(v)
        if not validation_result.is_valid:
            raise ValueError(f"Contraseña no cumple requisitos: {', '.join(validation_result.errors)}")
        return v
    
    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v, info):
        """Validar que las contraseñas coincidan"""
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "token": "abc123def456...",
                "new_password": "Mi_Nueva_Contraseña_123!",
                "confirm_password": "Mi_Nueva_Contraseña_123!"
            }
        }
    )


class PasswordResetConfirmResponse(BaseModel):
    """Schema para respuesta de confirmación de reset"""
    
    message: str = Field(default="Contraseña restablecida exitosamente", description="Mensaje de confirmación")
    reset_at: datetime = Field(..., description="Timestamp del reset")
    must_login: bool = Field(default=True, description="Si debe iniciar sesión")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "message": "Contraseña restablecida exitosamente",
                "reset_at": "2024-01-15T13:00:00Z",
                "must_login": True
            }
        }
    )


# ==========================================
# SCHEMAS DE VERIFICACIÓN Y UTILIDADES
# ==========================================

class TokenValidationRequest(BaseModel):
    """Schema para validar un token"""
    
    token: str = Field(..., description="Token a validar")
    token_type: Optional[str] = Field(default="access", description="Tipo de token (access|refresh)")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "access"
            }
        }
    )


class TokenValidationResponse(BaseModel):
    """Schema para respuesta de validación de token"""
    
    valid: bool = Field(..., description="Si el token es válido")
    token_type: str = Field(..., description="Tipo de token")
    expires_at: Optional[datetime] = Field(None, description="Cuándo expira el token")
    user_id: Optional[int] = Field(None, description="ID del usuario (si token válido)")
    username: Optional[str] = Field(None, description="Username (si token válido)")
    reason: Optional[str] = Field(None, description="Razón de invalidez (si aplica)")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "valid": True,
                "token_type": "access",
                "expires_at": "2024-01-15T11:30:00Z",
                "user_id": 1,
                "username": "juan.perez",
                "reason": None
            }
        }
    )


class PasswordStrengthCheck(BaseModel):
    """Schema para verificar fortaleza de contraseña"""
    
    password: str = Field(..., description="Contraseña a verificar")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "password": "mi_contraseña_a_verificar"
            }
        }
    )


class PasswordStrengthResponse(BaseModel):
    """Schema para respuesta de verificación de fortaleza"""
    
    is_valid: bool = Field(..., description="Si la contraseña es válida")
    score: int = Field(..., description="Puntaje de fortaleza (0-100)")
    errors: List[str] = Field(default_factory=list, description="Errores encontrados")
    suggestions: List[str] = Field(default_factory=list, description="Sugerencias de mejora")
    requirements: Dict[str, bool] = Field(default_factory=dict, description="Cumplimiento de requisitos")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "is_valid": False,
                "score": 60,
                "errors": ["Debe contener al menos una letra mayúscula"],
                "suggestions": ["Agregue letras mayúsculas (A-Z)"],
                "requirements": {
                    "min_length": True,
                    "has_lowercase": True,
                    "has_uppercase": False,
                    "has_digit": True,
                    "has_special": True
                }
            }
        }
    )


# ==========================================
# SCHEMAS DE SESIÓN Y DISPOSITIVOS
# ==========================================

class ActiveSession(BaseModel):
    """Schema para información de sesión activa"""
    
    session_id: str = Field(..., description="ID único de la sesión")
    device_info: Optional[str] = Field(None, description="Información del dispositivo")
    ip_address: Optional[str] = Field(None, description="Dirección IP")
    login_at: datetime = Field(..., description="Cuándo se inició la sesión")
    last_activity: datetime = Field(..., description="Última actividad")
    expires_at: datetime = Field(..., description="Cuándo expira la sesión")
    is_current: bool = Field(..., description="Si es la sesión actual")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "session_id": "abc123def456",
                "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "ip_address": "192.168.1.100",
                "login_at": "2024-01-15T10:30:00Z",
                "last_activity": "2024-01-15T11:45:00Z",
                "expires_at": "2024-02-14T10:30:00Z",
                "is_current": True
            }
        }
    )

class UserSessionsResponse(BaseModel):
    """Schema para respuesta de sesiones activas del usuario"""
    
    sessions: List[ActiveSession] = Field(..., description="Lista de sesiones activas")
    total_sessions: int = Field(..., description="Total de sesiones activas")
    current_session_id: str = Field(..., description="ID de la sesión actual")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "sessions": [
                    {
                        "session_id": "abc123",
                        "device_info": "Chrome on Windows",
                        "login_at": "2024-01-15T10:30:00Z",
                        "is_current": True
                    }
                ],
                "total_sessions": 1,
                "current_session_id": "abc123"
            }
        }
    )

class TerminateSessionRequest(BaseModel):
    """Schema para terminar sesión específica"""
    
    session_id: str = Field(..., description="ID de la sesión a terminar")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra = {
            "example": {
                "session_id": "abc123def456"
            }
        }
        )


# ==========================================
# REFERENCIA CIRCULAR - FORWARD REFERENCE
# ==========================================

# Actualizar el modelo LoginResponse para resolver la referencia circular
#LoginResponse.model_rebuild()