"""
volumes/backend-api/database/schemas/user.py
Schemas Pydantic para Users - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import re


# ==========================================
# USER SCHEMAS
# ==========================================

class UserBase(BaseModel):
    """Schema base para User"""
    username: str = Field(..., min_length=3, max_length=50, description="Nombre de usuario único")
    email: EmailStr = Field(..., description="Email único del usuario")
    first_name: str = Field(..., min_length=2, max_length=100, description="Nombre(s) del usuario")
    last_name: str = Field(..., min_length=2, max_length=100, description="Apellido(s) del usuario")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    is_active: bool = Field(default=True, description="Si el usuario está activo")
    petty_cash_limit: Optional[Decimal] = Field(None, ge=0, description="Límite máximo para gastos de caja chica")
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validar formato del username"""
        if not v:
            raise ValueError("Username es requerido")
        
        v = v.strip().lower()
        
        # Solo letras, números, puntos y guiones bajos
        if not re.match(r'^[a-z0-9._]+$', v):
            raise ValueError("Username solo puede contener letras, números, puntos y guiones bajos")
        
        # No puede empezar o terminar con punto o guión bajo
        if v.startswith(('.', '_')) or v.endswith(('.', '_')):
            raise ValueError("Username no puede empezar o terminar con punto o guión bajo")
        
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        """Validar formato del teléfono"""
        if not v:
            return None
        
        v = v.strip()
        
        # Formato chileno básico: +56912345678 o 912345678
        if not re.match(r'^(\+56)?[0-9]{8,9}$', v):
            raise ValueError("Formato de teléfono inválido (formato chileno)")
        
        return v
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        """Validar nombres y apellidos"""
        if not v:
            raise ValueError("Campo requerido")
        
        v = v.strip()
        
        # Solo letras, espacios, acentos y apostrofes
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$", v):
            raise ValueError("Solo se permiten letras, espacios y apostrofes")
        
        return v


class UserCreate(UserBase):
    """Schema para crear User"""
    password: str = Field(..., min_length=8, max_length=100, description="Contraseña del usuario")
    confirm_password: str = Field(..., description="Confirmación de contraseña")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validar fortaleza de contraseña"""
        if len(v) < 8:
            raise ValueError("Contraseña debe tener al menos 8 caracteres")
        
        # Al menos una mayúscula
        if not re.search(r'[A-Z]', v):
            raise ValueError("Contraseña debe tener al menos una mayúscula")
        
        # Al menos una minúscula
        if not re.search(r'[a-z]', v):
            raise ValueError("Contraseña debe tener al menos una minúscula")
        
        # Al menos un número
        if not re.search(r'\d', v):
            raise ValueError("Contraseña debe tener al menos un número")
        
        # Al menos un carácter especial
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Contraseña debe tener al menos un carácter especial")
        
        return v
    
    def model_post_init(self, __context):
        """Validación después de inicialización"""
        if self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")


class UserUpdate(BaseModel):
    """Schema para actualizar User"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    petty_cash_limit: Optional[Decimal] = Field(None, ge=0)
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        """Validar formato del teléfono"""
        if not v:
            return None
        
        v = v.strip()
        
        # Formato chileno básico: +56912345678 o 912345678
        if not re.match(r'^(\+56)?[0-9]{8,9}$', v):
            raise ValueError("Formato de teléfono inválido (formato chileno)")
        
        return v
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def validate_names(cls, v):
        """Validar nombres y apellidos"""
        if v is None:
            return None
        
        v = v.strip()
        
        # Solo letras, espacios, acentos y apostrofes
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']+$", v):
            raise ValueError("Solo se permiten letras, espacios y apostrofes")
        
        return v


class UserPasswordChange(BaseModel):
    """Schema para cambio de contraseña"""
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, max_length=100, description="Nueva contraseña")
    confirm_password: str = Field(..., description="Confirmación de nueva contraseña")
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """Validar fortaleza de contraseña"""
        if len(v) < 8:
            raise ValueError("Contraseña debe tener al menos 8 caracteres")
        
        # Al menos una mayúscula
        if not re.search(r'[A-Z]', v):
            raise ValueError("Contraseña debe tener al menos una mayúscula")
        
        # Al menos una minúscula
        if not re.search(r'[a-z]', v):
            raise ValueError("Contraseña debe tener al menos una minúscula")
        
        # Al menos un número
        if not re.search(r'\d', v):
            raise ValueError("Contraseña debe tener al menos un número")
        
        # Al menos un carácter especial
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Contraseña debe tener al menos un carácter especial")
        
        return v
    
    def model_post_init(self, __context):
        """Validación después de inicialización"""
        if self.new_password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")


class UserResponse(BaseModel):
    """Schema de respuesta para User"""
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    display_name: str
    initials: str
    phone: Optional[str]
    is_active: bool
    is_authenticated: bool
    petty_cash_limit: Optional[Decimal]
    last_login_at: Optional[datetime]
    last_login_ip: Optional[str]
    password_changed_at: datetime
    password_age_days: int
    needs_password_change: bool
    has_recent_login: bool
    
    # Información de roles y permisos
    role_names: List[str]
    permission_codes: List[str]
    has_admin_role: bool
    has_manager_role: bool
    is_cashier: bool
    is_supervisor: bool
    
    # Información de bodegas
    warehouse_count: int
    responsible_warehouse_count: int
    
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserPublicResponse(BaseModel):
    """Schema de respuesta pública para User (sin información sensible)"""
    id: int
    username: str
    first_name: str
    last_name: str
    full_name: str
    initials: str
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Schema para lista de usuarios"""
    users: List[UserResponse]
    pagination: dict
    filters_applied: dict


# ==========================================
# AUTHENTICATION SCHEMAS
# ==========================================

class UserLogin(BaseModel):
    """Schema para login de usuario"""
    username_or_email: str = Field(..., description="Username o email del usuario")
    password: str = Field(..., description="Contraseña del usuario")
    remember_me: bool = Field(default=False, description="Recordar sesión")


class UserLoginResponse(BaseModel):
    """Schema de respuesta para login"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublicResponse
    permissions: List[str] = Field(default_factory=list)
    warehouses: List[dict] = Field(default_factory=list)


class UserTokenRefresh(BaseModel):
    """Schema para refresh de token"""
    refresh_token: str = Field(..., description="Token de refresh")


# ==========================================
# USER MANAGEMENT SCHEMAS
# ==========================================

class UserActivationToggle(BaseModel):
    """Schema para activar/desactivar usuario"""
    is_active: bool = Field(..., description="Nuevo estado de activación")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del cambio")


class UserPasswordReset(BaseModel):
    """Schema para reset de contraseña"""
    email: EmailStr = Field(..., description="Email del usuario")


class UserPasswordResetConfirm(BaseModel):
    """Schema para confirmar reset de contraseña"""
    token: str = Field(..., description="Token de reset")
    new_password: str = Field(..., min_length=8, max_length=100, description="Nueva contraseña")
    confirm_password: str = Field(..., description="Confirmación de nueva contraseña")
    
    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        """Validar fortaleza de contraseña"""
        if len(v) < 8:
            raise ValueError("Contraseña debe tener al menos 8 caracteres")
        
        # Al menos una mayúscula
        if not re.search(r'[A-Z]', v):
            raise ValueError("Contraseña debe tener al menos una mayúscula")
        
        # Al menos una minúscula
        if not re.search(r'[a-z]', v):
            raise ValueError("Contraseña debe tener al menos una minúscula")
        
        # Al menos un número
        if not re.search(r'\d', v):
            raise ValueError("Contraseña debe tener al menos un número")
        
        # Al menos un carácter especial
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Contraseña debe tener al menos un carácter especial")
        
        return v
    
    def model_post_init(self, __context):
        """Validación después de inicialización"""
        if self.new_password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")


# ==========================================
# SCHEMAS DE RESPUESTA PAGINADA
# ==========================================

class PaginationInfo(BaseModel):
    """Información de paginación"""
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1, le=100)
    total: int = Field(..., ge=0)
    pages: int = Field(..., ge=0)


class UserListWithPagination(BaseModel):
    """Lista de usuarios con paginación"""
    users: List[UserResponse]
    pagination: PaginationInfo
    filters_applied: dict
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# USER WITH RELATIONS SCHEMAS
# ==========================================

class UserWithRoles(UserResponse):
    """Usuario con información detallada de roles"""
    roles: List[dict] = Field(default_factory=list, description="Roles asignados al usuario")


class UserWithPermissions(UserResponse):
    """Usuario con información detallada de permisos"""
    direct_permissions: List[dict] = Field(default_factory=list, description="Permisos directos del usuario")
    role_permissions: List[dict] = Field(default_factory=list, description="Permisos heredados de roles")


class UserWithWarehouses(UserResponse):
    """Usuario con información de acceso a bodegas"""
    warehouse_accesses: List[dict] = Field(default_factory=list, description="Accesos a bodegas")
    responsible_warehouses: List[dict] = Field(default_factory=list, description="Bodegas de las que es responsable")


class UserDetailedResponse(UserResponse):
    """Usuario con toda la información relacionada"""
    roles: List[dict] = Field(default_factory=list)
    direct_permissions: List[dict] = Field(default_factory=list)
    warehouse_accesses: List[dict] = Field(default_factory=list)
    responsible_warehouses: List[dict] = Field(default_factory=list)


# ==========================================
# ROLE ASSIGNMENT SCHEMAS
# ==========================================

class UserRoleAssignment(BaseModel):
    """Schema para asignar rol a usuario"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    role_id: int = Field(..., gt=0, description="ID del rol a asignar")
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la asignación")


class UserRoleRemoval(BaseModel):
    """Schema para remover rol de usuario"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    role_id: int = Field(..., gt=0, description="ID del rol a remover")
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la remoción")


# ==========================================
# PERMISSION ASSIGNMENT SCHEMAS
# ==========================================

class UserPermissionAssignment(BaseModel):
    """Schema para asignar permiso directo a usuario"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    permission_id: int = Field(..., gt=0, description="ID del permiso")
    permission_type: str = Field(default="GRANT", description="Tipo de permiso (GRANT/DENY)")
    expires_at: Optional[datetime] = Field(None, description="Fecha de expiración")
    reason: Optional[str] = Field(None, max_length=500, description="Razón de la asignación")


# ==========================================
# WAREHOUSE ACCESS SCHEMAS
# ==========================================

class UserWarehouseAccessGrant(BaseModel):
    """Schema para otorgar acceso a bodega"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    warehouse_id: int = Field(..., gt=0, description="ID de la bodega")
    access_type: str = Field(..., description="Tipo de acceso (FULL/READ_ONLY/DENIED)")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del otorgamiento")


class UserWarehouseAccessSummary(BaseModel):
    """Resumen de accesos de usuario a bodegas"""
    user: UserPublicResponse
    total_warehouses: int
    full_access_count: int
    read_only_count: int
    denied_count: int
    responsible_warehouses: List[dict]


# ==========================================
# SCHEMAS ADICIONALES
# ==========================================

class UserStats(BaseModel):
    """Estadísticas de usuario"""
    total_users: int
    active_users: int
    inactive_users: int
    users_with_recent_login: int
    users_need_password_change: int


class UserSession(BaseModel):
    """Información de sesión de usuario"""
    user_id: int
    username: str
    session_id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    last_activity: datetime
    is_active: bool


class UserActivitySummary(BaseModel):
    """Resumen de actividad de usuario"""
    user: UserPublicResponse
    last_login: Optional[datetime]
    total_sessions: int
    active_sessions: int
    last_activity: Optional[datetime]