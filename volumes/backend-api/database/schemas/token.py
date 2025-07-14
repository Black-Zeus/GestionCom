"""
Schemas Pydantic para manejo específico de tokens JWT
Complementa schemas/auth.py con funcionalidades avanzadas de tokens
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field, field_validator, ConfigDict


# ==========================================
# ENUMS PARA TOKENS
# ==========================================

class TokenType(str, Enum):
    """Tipos de tokens JWT"""
    ACCESS = "access"
    REFRESH = "refresh"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"
    API_KEY = "api_key"


class TokenStatus(str, Enum):
    """Estados de un token"""
    VALID = "valid"
    EXPIRED = "expired"
    REVOKED = "revoked"
    BLACKLISTED = "blacklisted"
    INVALID = "invalid"
    MALFORMED = "malformed"


class BlacklistReason(str, Enum):
    """Razones para blacklist de tokens"""
    USER_LOGOUT = "user_logout"
    PASSWORD_CHANGE = "password_change"
    USER_DEACTIVATED = "user_deactivated"
    SECURITY_BREACH = "security_breach"
    ADMIN_REVOCATION = "admin_revocation"
    TOKEN_ROTATION = "token_rotation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"


# ==========================================
# SCHEMAS BASE PARA TOKENS
# ==========================================

class TokenInfo(BaseModel):
    """Schema base para información de token"""
    
    jti: str = Field(..., description="JWT ID único del token")
    token_type: TokenType = Field(..., description="Tipo de token")
    user_id: int = Field(..., description="ID del usuario propietario")
    username: str = Field(..., description="Username del usuario")
    issued_at: datetime = Field(..., description="Cuándo fue emitido")
    expires_at: datetime = Field(..., description="Cuándo expira")
    not_before: Optional[datetime] = Field(None, description="No válido antes de esta fecha")
    issuer: str = Field(..., description="Emisor del token")
    audience: str = Field(..., description="Audiencia del token")
    
    # Metadatos adicionales
    device_info: Optional[str] = Field(None, description="Información del dispositivo")
    ip_address: Optional[str] = Field(None, description="IP desde donde se emitió")
    user_agent: Optional[str] = Field(None, description="User agent del cliente")
    
    class Config:
        json_schema_extra = {
            "example": {
                "jti": "abc123def456ghi789",
                "token_type": "access",
                "user_id": 1,
                "username": "juan.perez",
                "issued_at": "2024-01-15T10:30:00Z",
                "expires_at": "2024-01-15T11:00:00Z",
                "not_before": "2024-01-15T10:30:00Z",
                "issuer": "inventario-api",
                "audience": "inventario-users",
                "device_info": "Chrome on Windows",
                "ip_address": "192.168.1.100"
            }
        }


class TokenClaims(BaseModel):
    """Schema para claims completos de JWT"""
    
    # Claims estándar JWT (RFC 7519)
    iss: str = Field(..., description="Issuer")
    sub: str = Field(..., description="Subject (user_id como string)")
    aud: str = Field(..., description="Audience")
    exp: int = Field(..., description="Expiration time (timestamp)")
    nbf: int = Field(..., description="Not before (timestamp)")
    iat: int = Field(..., description="Issued at (timestamp)")
    jti: str = Field(..., description="JWT ID")
    
    # Claims personalizados de la aplicación
    user_id: int = Field(..., description="ID del usuario")
    username: str = Field(..., description="Username del usuario")
    email: str = Field(..., description="Email del usuario")
    token_type: TokenType = Field(..., description="Tipo de token")
    is_active: bool = Field(..., description="Si el usuario está activo")
    
    # Roles y permisos
    roles: List[str] = Field(default_factory=list, description="Roles del usuario")
    permissions: List[str] = Field(default_factory=list, description="Permisos efectivos")
    
    # Metadatos de sesión
    session_id: Optional[str] = Field(None, description="ID de sesión")
    device_fingerprint: Optional[str] = Field(None, description="Fingerprint del dispositivo")
    
    # Para refresh tokens
    access_jti: Optional[str] = Field(None, description="JTI del access token asociado (solo refresh tokens)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "iss": "inventario-api",
                "sub": "1",
                "aud": "inventario-users",
                "exp": 1705312200,
                "nbf": 1705310400,
                "iat": 1705310400,
                "jti": "abc123def456",
                "user_id": 1,
                "username": "juan.perez",
                "email": "juan.perez@empresa.com",
                "token_type": "access",
                "is_active": True,
                "roles": ["MANAGER", "USER"],
                "permissions": ["PRODUCTS.VIEW", "INVENTORY.VIEW"],
                "session_id": "sess_abc123"
            }
        }


# ==========================================
# SCHEMAS PARA CREACIÓN DE TOKENS
# ==========================================

class TokenCreateRequest(BaseModel):
    """Schema para solicitar creación de token"""
    
    user_id: int = Field(..., gt=0, description="ID del usuario")
    token_type: TokenType = Field(..., description="Tipo de token a crear")
    expires_in_minutes: Optional[int] = Field(None, gt=0, description="Expiración en minutos (override configuración)")
    include_permissions: bool = Field(default=True, description="Si incluir roles y permisos")
    
    # Metadatos opcionales
    device_info: Optional[str] = Field(None, max_length=500, description="Información del dispositivo")
    ip_address: Optional[str] = Field(None, description="Dirección IP")
    session_id: Optional[str] = Field(None, description="ID de sesión")
    
    # Para tokens especiales
    additional_claims: Optional[Dict[str, Any]] = Field(None, description="Claims adicionales")
    
    @field_validator('expires_in_minutes')
    @classmethod
    def validate_expires_in_minutes(cls, v):
        """Validar tiempo de expiración"""
        if v is not None:
            if v < 1:
                raise ValueError('expires_in_minutes debe ser positivo')
            if v > 43200:  # 30 días máximo
                raise ValueError('expires_in_minutes no puede exceder 43200 (30 días)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "token_type": "access",
                "expires_in_minutes": 30,
                "include_permissions": True,
                "device_info": "Chrome on Windows",
                "ip_address": "192.168.1.100",
                "session_id": "sess_abc123"
            }
        }


class TokenCreateResponse(BaseModel):
    """Schema para respuesta de creación de token"""
    
    token: str = Field(..., description="Token JWT generado")
    token_info: TokenInfo = Field(..., description="Información del token")
    raw_claims: TokenClaims = Field(..., description="Claims del token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_info": {
                    "jti": "abc123def456",
                    "token_type": "access",
                    "user_id": 1,
                    "expires_at": "2024-01-15T11:00:00Z"
                },
                "raw_claims": {
                    "user_id": 1,
                    "username": "juan.perez",
                    "token_type": "access"
                }
            }
        }


# ==========================================
# SCHEMAS PARA VALIDACIÓN DE TOKENS
# ==========================================

class TokenValidateRequest(BaseModel):
    """Schema para validar token (más completo que auth.py)"""
    
    token: str = Field(..., description="Token JWT a validar")
    expected_type: Optional[TokenType] = Field(None, description="Tipo esperado de token")
    validate_permissions: bool = Field(default=False, description="Si validar permisos específicos")
    required_permissions: List[str] = Field(default_factory=list, description="Permisos requeridos")
    required_roles: List[str] = Field(default_factory=list, description="Roles requeridos")
    validate_device: bool = Field(default=False, description="Si validar fingerprint del dispositivo")
    device_fingerprint: Optional[str] = Field(None, description="Fingerprint esperado del dispositivo")
    
    @field_validator('token')
    @classmethod
    def validate_token_format(cls, v):
        """Validar formato básico de JWT"""
        if not v or not v.strip():
            raise ValueError('Token es requerido')
        
        v = v.strip()
        
        # JWT debe tener 3 partes separadas por puntos
        parts = v.split('.')
        if len(parts) != 3:
            raise ValueError('Token JWT debe tener 3 partes separadas por puntos')
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "expected_type": "access",
                "validate_permissions": True,
                "required_permissions": ["PRODUCTS.VIEW"],
                "required_roles": ["USER"],
                "validate_device": False
            }
        }


class TokenValidateResponse(BaseModel):
    """Schema para respuesta de validación de token"""
    
    valid: bool = Field(..., description="Si el token es válido")
    status: TokenStatus = Field(..., description="Estado del token")
    reason: Optional[str] = Field(None, description="Razón si es inválido")
    
    # Información si es válido
    token_info: Optional[TokenInfo] = Field(None, description="Información del token")
    claims: Optional[TokenClaims] = Field(None, description="Claims del token")
    
    # Validaciones específicas
    permissions_valid: Optional[bool] = Field(None, description="Si los permisos son válidos")
    roles_valid: Optional[bool] = Field(None, description="Si los roles son válidos")
    device_valid: Optional[bool] = Field(None, description="Si el dispositivo es válido")
    
    # Metadatos de validación
    validated_at: datetime = Field(..., description="Cuándo se validó")
    time_to_expiry: Optional[int] = Field(None, description="Segundos hasta expiración")
    
    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "status": "valid",
                "reason": None,
                "token_info": {
                    "jti": "abc123",
                    "user_id": 1,
                    "expires_at": "2024-01-15T11:00:00Z"
                },
                "permissions_valid": True,
                "roles_valid": True,
                "validated_at": "2024-01-15T10:45:00Z",
                "time_to_expiry": 900
            }
        }


# ==========================================
# SCHEMAS PARA BLACKLIST
# ==========================================

class TokenBlacklistRequest(BaseModel):
    """Schema para blacklist de token"""
    
    token: Optional[str] = Field(None, description="Token a blacklistear (opcional si se provee jti)")
    jti: Optional[str] = Field(None, description="JTI del token a blacklistear")
    user_id: Optional[int] = Field(None, description="ID del usuario (para validación)")
    reason: BlacklistReason = Field(..., description="Razón del blacklist")
    expires_at: Optional[datetime] = Field(None, description="Cuándo expira el blacklist (por defecto: expiración del token)")
    
    # Metadatos
    blacklisted_by_user_id: Optional[int] = Field(None, description="Quién blacklisteó el token")
    notes: Optional[str] = Field(None, max_length=500, description="Notas adicionales")
    
    @field_validator('jti', 'token')
    @classmethod
    def validate_token_identifier(cls, v, info):
        """Validar que al menos token o jti esté presente"""
        # Esta validación se hará a nivel de modelo completo
        return v
    
    def model_validate(self):
        """Validación a nivel de modelo"""
        if not self.token and not self.jti:
            raise ValueError('Debe proporcionar token o jti')
        return self
    
    class Config:
        json_schema_extra = {
            "example": {
                "jti": "abc123def456",
                "user_id": 1,
                "reason": "user_logout",
                "blacklisted_by_user_id": 1,
                "notes": "Logout manual del usuario"
            }
        }


class TokenBlacklistResponse(BaseModel):
    """Schema para respuesta de blacklist"""
    
    blacklisted: bool = Field(..., description="Si se blacklisteó exitosamente")
    jti: str = Field(..., description="JTI del token blacklisteado")
    reason: BlacklistReason = Field(..., description="Razón del blacklist")
    blacklisted_at: datetime = Field(..., description="Cuándo se blacklisteó")
    expires_at: Optional[datetime] = Field(None, description="Cuándo expira el blacklist")
    
    class Config:
        json_schema_extra = {
            "example": {
                "blacklisted": True,
                "jti": "abc123def456",
                "reason": "user_logout",
                "blacklisted_at": "2024-01-15T12:00:00Z",
                "expires_at": "2024-01-15T13:00:00Z"
            }
        }


class TokenBlacklistBulkRequest(BaseModel):
    """Schema para blacklist masivo de tokens"""
    
    user_id: int = Field(..., gt=0, description="ID del usuario")
    reason: BlacklistReason = Field(..., description="Razón del blacklist")
    token_types: List[TokenType] = Field(default_factory=list, description="Tipos de tokens a blacklistear (vacío = todos)")
    exclude_current: bool = Field(default=False, description="Si excluir el token actual")
    current_jti: Optional[str] = Field(None, description="JTI del token actual a excluir")
    
    # Filtros temporales
    issued_after: Optional[datetime] = Field(None, description="Solo tokens emitidos después de esta fecha")
    issued_before: Optional[datetime] = Field(None, description="Solo tokens emitidos antes de esta fecha")
    
    # Metadatos
    blacklisted_by_user_id: Optional[int] = Field(None, description="Quién ejecuta el blacklist")
    notes: Optional[str] = Field(None, max_length=500, description="Notas del blacklist masivo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "reason": "password_change",
                "token_types": ["access", "refresh"],
                "exclude_current": True,
                "current_jti": "current_token_jti",
                "blacklisted_by_user_id": 1,
                "notes": "Blacklist por cambio de contraseña"
            }
        }


class TokenBlacklistBulkResponse(BaseModel):
    """Schema para respuesta de blacklist masivo"""
    
    total_blacklisted: int = Field(..., description="Total de tokens blacklisteados")
    blacklisted_jtis: List[str] = Field(..., description="Lista de JTIs blacklisteados")
    failed_jtis: List[str] = Field(default_factory=list, description="JTIs que fallaron")
    reason: BlacklistReason = Field(..., description="Razón del blacklist")
    blacklisted_at: datetime = Field(..., description="Cuándo se ejecutó")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_blacklisted": 3,
                "blacklisted_jtis": ["jti1", "jti2", "jti3"],
                "failed_jtis": [],
                "reason": "password_change",
                "blacklisted_at": "2024-01-15T12:30:00Z"
            }
        }


# ==========================================
# SCHEMAS PARA GESTIÓN DE TOKENS ACTIVOS
# ==========================================

class ActiveTokenInfo(BaseModel):
    """Schema para información de token activo"""
    
    jti: str = Field(..., description="JWT ID")
    token_type: TokenType = Field(..., description="Tipo de token")
    issued_at: datetime = Field(..., description="Fecha de emisión")
    expires_at: datetime = Field(..., description="Fecha de expiración")
    last_used: Optional[datetime] = Field(None, description="Último uso del token")
    
    # Metadatos del dispositivo/sesión
    device_info: Optional[str] = Field(None, description="Información del dispositivo")
    ip_address: Optional[str] = Field(None, description="IP de emisión")
    user_agent: Optional[str] = Field(None, description="User agent")
    session_id: Optional[str] = Field(None, description="ID de sesión")
    
    # Estado
    is_current: bool = Field(default=False, description="Si es el token actual de la petición")
    time_to_expiry: int = Field(..., description="Segundos hasta expiración")
    
    class Config:
        json_schema_extra = {
            "example": {
                "jti": "abc123def456",
                "token_type": "access",
                "issued_at": "2024-01-15T10:30:00Z",
                "expires_at": "2024-01-15T11:00:00Z",
                "last_used": "2024-01-15T10:45:00Z",
                "device_info": "Chrome on Windows",
                "ip_address": "192.168.1.100",
                "is_current": True,
                "time_to_expiry": 900
            }
        }


class UserActiveTokensResponse(BaseModel):
    """Schema para tokens activos de un usuario"""
    
    user_id: int = Field(..., description="ID del usuario")
    username: str = Field(..., description="Username del usuario")
    tokens: List[ActiveTokenInfo] = Field(..., description="Lista de tokens activos")
    total_tokens: int = Field(..., description="Total de tokens activos")
    
    # Estadísticas
    access_tokens: int = Field(..., description="Cantidad de access tokens")
    refresh_tokens: int = Field(..., description="Cantidad de refresh tokens")
    other_tokens: int = Field(..., description="Otros tipos de tokens")
    
    # Metadatos
    retrieved_at: datetime = Field(..., description="Cuándo se consultó")
    current_token_jti: Optional[str] = Field(None, description="JTI del token actual")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "username": "juan.perez",
                "tokens": [
                    {
                        "jti": "abc123",
                        "token_type": "access",
                        "expires_at": "2024-01-15T11:00:00Z",
                        "is_current": True
                    }
                ],
                "total_tokens": 2,
                "access_tokens": 1,
                "refresh_tokens": 1,
                "other_tokens": 0,
                "retrieved_at": "2024-01-15T10:45:00Z"
            }
        }


# ==========================================
# SCHEMAS PARA ROTACIÓN DE TOKENS
# ==========================================

class TokenRotationRequest(BaseModel):
    """Schema para rotación de refresh token"""
    
    refresh_token: str = Field(..., description="Refresh token actual")
    invalidate_previous: bool = Field(default=True, description="Si invalidar el refresh token anterior")
    extend_expiry: bool = Field(default=False, description="Si extender la expiración")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "invalidate_previous": True,
                "extend_expiry": False
            }
        }


class TokenRotationResponse(BaseModel):
    """Schema para respuesta de rotación"""
    
    new_access_token: str = Field(..., description="Nuevo access token")
    new_refresh_token: str = Field(..., description="Nuevo refresh token")
    previous_jti: str = Field(..., description="JTI del token anterior")
    new_access_jti: str = Field(..., description="JTI del nuevo access token")
    new_refresh_jti: str = Field(..., description="JTI del nuevo refresh token")
    
    # Tiempos
    rotated_at: datetime = Field(..., description="Cuándo se rotó")
    access_expires_at: datetime = Field(..., description="Expiración del access token")
    refresh_expires_at: datetime = Field(..., description="Expiración del refresh token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "new_access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "new_refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "previous_jti": "old_jti_123",
                "new_access_jti": "new_access_jti_456",
                "new_refresh_jti": "new_refresh_jti_789",
                "rotated_at": "2024-01-15T11:00:00Z",
                "access_expires_at": "2024-01-15T11:30:00Z",
                "refresh_expires_at": "2024-02-14T11:00:00Z"
            }
        }


# ==========================================
# SCHEMAS PARA ESTADÍSTICAS Y MONITOREO
# ==========================================

class TokenStatistics(BaseModel):
    """Schema para estadísticas de tokens"""
    
    total_active_tokens: int = Field(..., description="Total de tokens activos")
    tokens_by_type: Dict[TokenType, int] = Field(..., description="Tokens por tipo")
    tokens_expiring_soon: int = Field(..., description="Tokens que expiran pronto (próxima hora)")
    blacklisted_tokens: int = Field(..., description="Tokens en blacklist")
    
    # Estadísticas por usuario
    top_users_by_tokens: List[Dict[str, Any]] = Field(..., description="Usuarios con más tokens")
    
    # Estadísticas temporales
    tokens_issued_today: int = Field(..., description="Tokens emitidos hoy")
    tokens_expired_today: int = Field(..., description="Tokens expirados hoy")
    
    # Metadatos
    calculated_at: datetime = Field(..., description="Cuándo se calcularon las estadísticas")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_active_tokens": 150,
                "tokens_by_type": {
                    "access": 75,
                    "refresh": 75
                },
                "tokens_expiring_soon": 12,
                "blacklisted_tokens": 5,
                "top_users_by_tokens": [
                    {"user_id": 1, "username": "admin", "token_count": 8}
                ],
                "tokens_issued_today": 45,
                "tokens_expired_today": 23,
                "calculated_at": "2024-01-15T12:00:00Z"
            }
        }


# ==========================================
# SCHEMAS PARA DEBUGGING Y DESARROLLO
# ==========================================

class TokenDebugInfo(BaseModel):
    """Schema para información de debug de tokens (solo desarrollo)"""
    
    raw_token: str = Field(..., description="Token completo")
    header: Dict[str, Any] = Field(..., description="Header JWT decodificado")
    payload: Dict[str, Any] = Field(..., description="Payload JWT decodificado")
    signature_valid: bool = Field(..., description="Si la firma es válida")
    
    # Validaciones individuales
    not_expired: bool = Field(..., description="Si no ha expirado")
    not_before_valid: bool = Field(..., description="Si nbf es válido")
    issuer_valid: bool = Field(..., description="Si el issuer es válido")
    audience_valid: bool = Field(..., description="Si la audience es válida")
    
    # Información de blacklist
    in_blacklist: bool = Field(..., description="Si está en blacklist")
    blacklist_reason: Optional[str] = Field(None, description="Razón de blacklist")
    
    # Metadatos
    decoded_at: datetime = Field(..., description="Cuándo se decodificó")
    
    class Config:
        json_schema_extra = {
            "example": {
                "raw_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "header": {"alg": "HS256", "typ": "JWT"},
                "payload": {"user_id": 1, "exp": 1705312200},
                "signature_valid": True,
                "not_expired": True,
                "not_before_valid": True,
                "issuer_valid": True,
                "audience_valid": True,
                "in_blacklist": False,
                "decoded_at": "2024-01-15T10:45:00Z"
            }
        }