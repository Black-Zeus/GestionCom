"""
volumes/backend-api/database/schemas/auth.py
"""
# ==========================================
# SCHEMAS ESENCIALES RECOMENDADOS (LIMPIO)
# ==========================================

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re

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
        description="Mantener sesión activa más tiempo"
    )
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validar y normalizar username o email"""
        if not v:
            raise ValueError('Username/email es requerido')
        
        v = v.strip()
        
        # Si parece email, validar formato
        if '@' in v:
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, v):
                raise ValueError('Formato de email inválido')
            return v.lower()
        
        # Si es username, validar formato
        v = v.lower()
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Username solo puede contener letras, números, puntos, guiones y guiones bajos')
        
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


class UserAuthInfo(BaseModel):
    """Información del usuario autenticado"""
    
    id: int = Field(..., description="ID único del usuario")
    username: str = Field(..., description="Username del usuario")
    email: str = Field(..., description="Email del usuario")
    full_name: str = Field(..., description="Nombre completo")
    first_name: str = Field(..., description="Nombre")
    last_name: str = Field(..., description="Apellido")
    is_active: bool = Field(..., description="Si está activo")
    
    # Roles y permisos
    roles: List[str] = Field(default_factory=list, description="Roles asignados")
    permissions: List[str] = Field(default_factory=list, description="Permisos efectivos")
    
    # Metadatos útiles
    last_login_at: Optional[datetime] = Field(None, description="Último login previo")
    must_change_password: bool = Field(default=False, description="Si debe cambiar contraseña")
    
    model_config = ConfigDict(from_attributes=True)


class LoginResponse(BaseModel):
    """Respuesta de login exitoso"""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="Bearer", description="Tipo de token")
    expires_in: int = Field(..., description="Expiración en segundos")
    
    user: UserAuthInfo = Field(..., description="Información del usuario")
    login_at: datetime = Field(..., description="Timestamp del login")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIs...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
                "token_type": "Bearer",
                "expires_in": 1800,
                "user": {
                    "id": 1,
                    "username": "usuario",
                    "email": "usuario@ejemplo.com",
                    "full_name": "Administrador Demo",
                    "roles": ["ADMIN"],
                    "permissions": ["WAREHOUSE_ADMIN", "USER_ADMIN"]
                },
                "login_at": "2024-01-15T10:30:00Z"
            }
        }
    )

# ==========================================
# REFRESH TOKEN (SIN BODY - SOLO HEADER)
# ==========================================

class RefreshTokenResponse(BaseModel):
    """Respuesta de refresh token"""
    
    access_token: str = Field(..., description="Nuevo access token")
    refresh_token: str = Field(..., description="Nuevo refresh token")
    token_type: str = Field(default="Bearer", description="Tipo de token")
    expires_in: int = Field(..., description="Expiración en segundos")
    refreshed_at: datetime = Field(..., description="Timestamp del refresh")
    username: Optional[str] = Field(None, description="Username del usuario")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIs...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
                "token_type": "Bearer",
                "expires_in": 1800,
                "refreshed_at": "2024-01-15T11:00:00Z",
                "username": "admin.demo"
            }
        }
    )


# ==========================================
# TOKEN VALIDATION
# ==========================================

class TokenValidateRequest(BaseModel):
    """Solicitud de validación de token"""
    token: str = Field(..., description="Token a validar")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIs..."
            }
        }
    )


class TokenValidateResponse(BaseModel):
    """Respuesta de validación de token"""
    
    valid: bool = Field(..., description="Si el token es válido")
    status: str = Field(..., description="Estado del token")
    reason: Optional[str] = Field(None, description="Razón si es inválido")
    validated_at: datetime = Field(..., description="Timestamp de validación")
    
    # Campos opcionales si token es válido
    user_id: Optional[int] = Field(None, description="ID del usuario")
    username: Optional[str] = Field(None, description="Username")
    expires_at: Optional[datetime] = Field(None, description="Cuándo expira")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "valid": True,
                "status": "active",
                "reason": None,
                "validated_at": "2024-01-15T10:45:00Z",
                "user_id": 1,
                "username": "usuario",
                "expires_at": "2024-01-15T12:30:00Z"
            }
        }
    )


# ==========================================
# PASSWORD STRENGTH (SIMPLIFICADO)
# ==========================================

class PasswordStrengthCheck(BaseModel):
    """Verificación de fortaleza de contraseña"""
    password: str = Field(..., description="Contraseña a verificar")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "password": "mi_contraseña_123"
            }
        }
    )


class PasswordStrengthResponse(BaseModel):
    """Respuesta de verificación de fortaleza"""
    
    is_valid: bool = Field(..., description="Si cumple requisitos")
    score: int = Field(..., description="Puntuación 0-100")
    errors: List[str] = Field(default_factory=list, description="Errores encontrados")
    suggestions: List[str] = Field(default_factory=list, description="Sugerencias")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_valid": False,
                "score": 60,
                "errors": ["Debe contener al menos una mayúscula"],
                "suggestions": ["Agregue letras mayúsculas (A-Z)"]
            }
        }
    )


# ==========================================
# LOGOUT (SIMPLIFICADO)
# ==========================================

class LogoutResponse(BaseModel):
    """Respuesta de logout"""
    
    logged_out: bool = Field(default=True, description="Si el logout fue exitoso")
    logout_at: datetime = Field(..., description="Timestamp del logout")
    method: str = Field(..., description="Método de logout usado")
    username: Optional[str] = Field(None, description="Username que hizo logout")
    tokens_revoked: Optional[int] = Field(None, description="Tokens revocados")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "logged_out": True,
                "logout_at": "2024-01-15T12:00:00Z",
                "method": "token_revocation",
                "username": "admin.demo",
                "tokens_revoked": 2
            }
        }
    )


class ChangePasswordRequest(BaseModel):
    """Petición para cambio de contraseña por el propio usuario"""

    current_password: str = Field(..., min_length=1, description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "MiContraseñaActual123",
                "new_password": "NuevaContraseñaSegura456",
                "confirm_password": "NuevaContraseñaSegura456"
            }
        }
    )


class ForgotPasswordRequest(BaseModel):
    """Petición de recuperación de contraseña (envío de código por email)"""

    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$', description="Correo electrónico del usuario")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "usuario@ejemplo.com"
            }
        }
    )


class ResetPasswordRequest(BaseModel):
    """Petición para establecer nueva contraseña con código de recuperación"""

    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$', description="Correo electrónico del usuario")
    reset_code: str = Field(..., min_length=6, max_length=6, pattern=r'^\d{6}$', description="Código de 6 dígitos")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "usuario@ejemplo.com",
                "reset_code": "123456",
                "new_password": "newPassword123",
                "confirm_password": "newPassword123"
            }
        }
    )


class AdminChangePasswordRequest(BaseModel):
    """Petición para que un administrador cambie la contraseña de otro usuario"""

    target_user_id: int = Field(..., gt=0, description="ID del usuario objetivo")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")
    confirm_password: str = Field(..., min_length=8, description="Confirmación de nueva contraseña")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio (opcional)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "target_user_id": 101,
                "new_password": "newPassword123",
                "confirm_password": "newPassword123",
                "reason": "Cambio solicitado por el usuario vía mesa de ayuda"
            }
        }
    )