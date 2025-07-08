"""
Schemas Pydantic para el modelo User
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr, validator, ConfigDict


# ==========================================
# SCHEMAS BASE
# ==========================================

class UserBase(BaseModel):
    """Schema base para User con campos comunes"""
    
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Nombre de usuario único",
        example="juan.perez"
    )
    
    email: EmailStr = Field(
        ...,
        description="Correo electrónico único",
        example="juan.perez@empresa.com"
    )
    
    first_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Nombre del usuario",
        example="Juan"
    )
    
    last_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Apellido del usuario",
        example="Pérez"
    )
    
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Número de teléfono",
        example="+56912345678"
    )
    
    is_active: bool = Field(
        True,
        description="Si el usuario está activo"
    )
    
    petty_cash_limit: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Límite máximo para gastos de caja chica",
        example=50000.00
    )
    
    @validator('username')
    def validate_username(cls, v):
        """Validar username"""
        if not v:
            raise ValueError('Username es requerido')
        
        v = v.strip().lower()
        
        # Solo caracteres alfanuméricos y algunos especiales
        import re
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Username solo puede contener letras, números, puntos, guiones y guiones bajos')
        
        return v
    
    @validator('email')
    def validate_email(cls, v):
        """Validar y normalizar email"""
        return v.lower().strip()
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validar teléfono"""
        if not v:
            return None
        
        # Remover espacios y caracteres especiales excepto +
        import re
        v = re.sub(r'[^\d+]', '', v.strip())
        
        if len(v) < 8:
            raise ValueError('Número de teléfono muy corto')
        
        return v
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        """Validar nombres"""
        return v.strip()


# ==========================================
# SCHEMAS PARA REQUESTS
# ==========================================

class UserCreate(UserBase):
    """Schema para crear usuario"""
    
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Contraseña del usuario",
        example="MiPassword123!"
    )
    
    @validator('password')
    def validate_password(cls, v):
        """Validar fortaleza de contraseña"""
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        
        if not any(c.islower() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra minúscula')
        
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una letra mayúscula')
        
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        
        return v


class UserUpdate(BaseModel):
    """Schema para actualizar usuario"""
    
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        description="Nombre de usuario único"
    )
    
    email: Optional[EmailStr] = Field(
        None,
        description="Correo electrónico único"
    )
    
    first_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Nombre del usuario"
    )
    
    last_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Apellido del usuario"
    )
    
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Número de teléfono"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Si el usuario está activo"
    )
    
    petty_cash_limit: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Límite máximo para gastos de caja chica"
    )
    
    # Aplicar mismos validadores que UserBase
    _validate_username = validator('username', allow_reuse=True)(UserBase.validate_username)
    _validate_email = validator('email', allow_reuse=True)(UserBase.validate_email)
    _validate_phone = validator('phone', allow_reuse=True)(UserBase.validate_phone)
    _validate_names = validator('first_name', 'last_name', allow_reuse=True)(UserBase.validate_names)


class UserChangePassword(BaseModel):
    """Schema para cambio de contraseña"""
    
    current_password: str = Field(
        ...,
        description="Contraseña actual",
        example="MiPasswordAntiguo123!"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña",
        example="MiPasswordNuevo123!"
    )
    
    confirm_password: str = Field(
        ...,
        description="Confirmación de nueva contraseña",
        example="MiPasswordNuevo123!"
    )
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validar que las contraseñas coincidan"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v
    
    # Aplicar validador de contraseña
    _validate_password = validator('new_password', allow_reuse=True)(UserCreate.validate_password)


# ==========================================
# SCHEMAS PARA RESPONSES
# ==========================================

class UserResponse(UserBase):
    """Schema para respuesta de usuario (sin datos sensibles)"""
    
    id: int = Field(..., description="ID único del usuario")
    
    full_name: str = Field(..., description="Nombre completo")
    display_name: str = Field(..., description="Nombre para mostrar")
    
    can_login: bool = Field(..., description="Si el usuario puede hacer login")
    
    last_login_at: Optional[datetime] = Field(
        None,
        description="Última vez que el usuario se conectó"
    )
    
    password_changed_at: datetime = Field(
        ...,
        description="Última vez que se cambió la contraseña"
    )
    
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Última actualización")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación")
    
    is_deleted: bool = Field(..., description="Si el usuario está eliminado")
    days_since_password_change: Optional[int] = Field(
        None,
        description="Días desde el último cambio de contraseña"
    )
    
    model_config = ConfigDict(from_attributes=True)


class UserSummary(BaseModel):
    """Schema resumido de usuario para listas"""
    
    id: int = Field(..., description="ID único del usuario")
    username: str = Field(..., description="Nombre de usuario")
    email: str = Field(..., description="Correo electrónico")
    full_name: str = Field(..., description="Nombre completo")
    is_active: bool = Field(..., description="Si el usuario está activo")
    last_login_at: Optional[datetime] = Field(None, description="Último login")
    
    model_config = ConfigDict(from_attributes=True)


class UserAuth(BaseModel):
    """Schema específico para autenticación JWT"""
    
    id: int = Field(..., description="ID único del usuario")
    username: str = Field(..., description="Nombre de usuario")
    email: str = Field(..., description="Correo electrónico")
    first_name: str = Field(..., description="Nombre")
    last_name: str = Field(..., description="Apellido")
    full_name: str = Field(..., description="Nombre completo")
    is_active: bool = Field(..., description="Si el usuario está activo")
    can_login: bool = Field(..., description="Si puede hacer login")
    last_login_at: Optional[datetime] = Field(None, description="Último login")
    
    model_config = ConfigDict(from_attributes=True)


class UserProfile(UserResponse):
    """Schema extendido para perfil de usuario"""
    
    is_password_expired: bool = Field(
        ...,
        description="Si la contraseña ha expirado"
    )
    
    roles: List[str] = Field(
        default_factory=list,
        description="Roles asignados al usuario"
    )
    
    permissions: List[str] = Field(
        default_factory=list,
        description="Permisos específicos del usuario"
    )


# ==========================================
# SCHEMAS PARA OPERACIONES ADMINISTRATIVAS
# ==========================================

class UserBulkUpdate(BaseModel):
    """Schema para actualización masiva de usuarios"""
    
    user_ids: List[int] = Field(
        ...,
        min_items=1,
        description="Lista de IDs de usuarios a actualizar"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Activar/desactivar usuarios"
    )
    
    petty_cash_limit: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Nuevo límite de caja chica"
    )


class UserSecurityInfo(BaseModel):
    """Schema para información de seguridad (logs)"""
    
    user_id: int = Field(..., description="ID del usuario")
    username: str = Field(..., description="Username")
    email_masked: str = Field(..., description="Email enmascarado")
    is_active: bool = Field(..., description="Estado activo")
    last_login: Optional[str] = Field(None, description="Último login ISO")
    password_age_days: Optional[int] = Field(None, description="Edad de contraseña en días")
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS PARA FILTROS Y BÚSQUEDAS
# ==========================================

class UserSearchFilters(BaseModel):
    """Schema para filtros de búsqueda de usuarios"""
    
    search: Optional[str] = Field(
        None,
        description="Buscar en username, email, nombre o apellido"
    )
    
    is_active: Optional[bool] = Field(
        None,
        description="Filtrar por estado activo"
    )
    
    created_after: Optional[datetime] = Field(
        None,
        description="Usuarios creados después de esta fecha"
    )
    
    created_before: Optional[datetime] = Field(
        None,
        description="Usuarios creados antes de esta fecha"
    )
    
    last_login_after: Optional[datetime] = Field(
        None,
        description="Usuarios con último login después de esta fecha"
    )
    
    has_phone: Optional[bool] = Field(
        None,
        description="Usuarios con/sin teléfono"
    )
    
    min_petty_cash_limit: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Límite mínimo de caja chica"
    )


class UserListResponse(BaseModel):
    """Schema para respuesta de lista de usuarios con paginación"""
    
    users: List[UserSummary] = Field(..., description="Lista de usuarios")
    total: int = Field(..., description="Total de usuarios")
    page: int = Field(..., description="Página actual")
    size: int = Field(..., description="Tamaño de página")
    pages: int = Field(..., description="Total de páginas")


# ==========================================
# SCHEMAS PARA VALIDACIONES ESPECÍFICAS
# ==========================================

class UsernameAvailability(BaseModel):
    """Schema para verificar disponibilidad de username"""
    
    username: str = Field(..., description="Username a verificar")
    available: bool = Field(..., description="Si está disponible")
    suggestions: List[str] = Field(
        default_factory=list,
        description="Sugerencias si no está disponible"
    )


class EmailAvailability(BaseModel):
    """Schema para verificar disponibilidad de email"""
    
    email: EmailStr = Field(..., description="Email a verificar")
    available: bool = Field(..., description="Si está disponible")


# ==========================================
# SCHEMAS PARA OPERACIONES DE RECUPERACIÓN
# ==========================================

class PasswordResetRequest(BaseModel):
    """Schema para solicitar reset de contraseña"""
    
    email: EmailStr = Field(
        ...,
        description="Email del usuario"
    )


class PasswordReset(BaseModel):
    """Schema para resetear contraseña con token"""
    
    token: str = Field(
        ...,
        description="Token de recuperación"
    )
    
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña"
    )
    
    confirm_password: str = Field(
        ...,
        description="Confirmación de contraseña"
    )
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        """Validar que las contraseñas coincidan"""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Las contraseñas no coinciden')
        return v
    
    # Aplicar validador de contraseña
    _validate_password = validator('new_password', allow_reuse=True)(UserCreate.validate_password)