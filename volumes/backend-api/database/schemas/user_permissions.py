"""
volumes/backend-api/database/schemas/user_permissions.py
Pydantic schemas for UserPermission model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class PermissionTypeEnum(str, Enum):
    """Permission type enum"""
    GRANT = "GRANT"
    DENY = "DENY"


class UserPermissionStatus(str, Enum):
    """Status enum for user permissions"""
    ACTIVE = "active"
    EXPIRED = "expired"
    EXPIRING_SOON = "expiring_soon"


class UserPermissionBase(BaseModel):
    """Base schema for UserPermission"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    permission_id: int = Field(..., gt=0, description="ID del permiso")
    permission_type: PermissionTypeEnum = Field(
        PermissionTypeEnum.GRANT, 
        description="Tipo de permiso: GRANT para otorgar, DENY para denegar"
    )
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que otorgó el permiso")
    expires_at: Optional[datetime] = Field(None, description="Fecha de expiración del permiso")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v
    
    @field_validator('expires_at')
    @classmethod
    def validate_expires_at(cls, v):
        if v is not None and v <= datetime.now():
            raise ValueError('expires_at debe ser una fecha futura')
        return v


class UserPermissionCreate(UserPermissionBase):
    """Schema for creating a new user permission assignment"""
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "permission_id": 5,
                "permission_type": "GRANT",
                "granted_by_user_id": 2,
                "expires_at": "2024-12-31T23:59:59Z"
            }
        }


class UserPermissionUpdate(BaseModel):
    """Schema for updating user permission assignment"""
    permission_type: Optional[PermissionTypeEnum] = Field(None, description="Tipo de permiso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que modificó la asignación")
    expires_at: Optional[datetime] = Field(None, description="Nueva fecha de expiración")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v
    
    @field_validator('expires_at')
    @classmethod
    def validate_expires_at(cls, v):
        if v is not None and v <= datetime.now():
            raise ValueError('expires_at debe ser una fecha futura')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "permission_type": "DENY",
                "expires_at": "2024-12-31T23:59:59Z"
            }
        }


class UserPermissionResponse(UserPermissionBase):
    """Schema for user permission response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="ID único de la asignación")
    granted_at: datetime = Field(..., description="Fecha y hora cuando se otorgó el permiso")
    created_at: datetime = Field(..., description="Fecha de creación del registro")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    is_expired: bool = Field(..., description="Si el permiso ha expirado")
    is_active: bool = Field(..., description="Si el permiso está activo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "permission_id": 5,
                "permission_type": "GRANT",
                "granted_by_user_id": 2,
                "expires_at": "2024-12-31T23:59:59Z",
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "is_expired": False,
                "is_active": True
            }
        }


class UserPermissionDetailResponse(UserPermissionResponse):
    """Schema for detailed user permission response with related data"""
    user_username: Optional[str] = Field(None, description="Username del usuario")
    user_full_name: Optional[str] = Field(None, description="Nombre completo del usuario")
    permission_name: Optional[str] = Field(None, description="Nombre del permiso")
    permission_code: Optional[str] = Field(None, description="Código del permiso")
    permission_group: Optional[str] = Field(None, description="Grupo del permiso")
    permission_description: Optional[str] = Field(None, description="Descripción del permiso")
    granted_by_username: Optional[str] = Field(None, description="Username de quien otorgó el permiso")
    user_is_active: Optional[bool] = Field(None, description="Si el usuario está activo")
    permission_is_active: Optional[bool] = Field(None, description="Si el permiso está activo")
    days_until_expiry: Optional[int] = Field(None, description="Días hasta la expiración")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "permission_id": 5,
                "permission_type": "GRANT",
                "granted_by_user_id": 2,
                "expires_at": "2024-12-31T23:59:59Z",
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "is_expired": False,
                "is_active": True,
                "user_username": "john.doe",
                "user_full_name": "John Doe",
                "permission_name": "Crear Productos",
                "permission_code": "PRODUCTS_CREATE",
                "permission_group": "PRODUCTS",
                "permission_description": "Permite crear nuevos productos",
                "granted_by_username": "admin",
                "user_is_active": True,
                "permission_is_active": True,
                "days_until_expiry": 120
            }
        }


class UserPermissionSummary(BaseModel):
    """Schema for user permission summary"""
    id: int = Field(..., description="ID de la asignación")
    user_id: int = Field(..., description="ID del usuario")
    user_username: str = Field(..., description="Username del usuario")
    permission_id: int = Field(..., description="ID del permiso")
    permission_name: str = Field(..., description="Nombre del permiso")
    permission_code: str = Field(..., description="Código del permiso")
    permission_group: str = Field(..., description="Grupo del permiso")
    permission_type: PermissionTypeEnum = Field(..., description="Tipo de permiso")
    granted_at: datetime = Field(..., description="Fecha cuando se otorgó")
    expires_at: Optional[datetime] = Field(None, description="Fecha de expiración")
    status: UserPermissionStatus = Field(..., description="Estado del permiso")
    
    model_config = ConfigDict(from_attributes=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "user_username": "john.doe",
                "permission_id": 5,
                "permission_name": "Crear Productos",
                "permission_code": "PRODUCTS_CREATE",
                "permission_group": "PRODUCTS",
                "permission_type": "GRANT",
                "granted_at": "2024-01-15T10:30:00Z",
                "expires_at": "2024-12-31T23:59:59Z",
                "status": "active"
            }
        }


class UserPermissionFilters(BaseModel):
    """Schema for filtering user permissions"""
    user_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de usuario")
    permission_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de permiso")
    username: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por username")
    permission_code: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por código de permiso")
    permission_group: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por grupo de permiso")
    permission_type: Optional[PermissionTypeEnum] = Field(None, description="Filtrar por tipo de permiso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="Filtrar por quien otorgó el permiso")
    granted_after: Optional[datetime] = Field(None, description="Filtrar asignaciones después de esta fecha")
    granted_before: Optional[datetime] = Field(None, description="Filtrar asignaciones antes de esta fecha")
    expires_after: Optional[datetime] = Field(None, description="Filtrar por expiración después de esta fecha")
    expires_before: Optional[datetime] = Field(None, description="Filtrar por expiración antes de esta fecha")
    status: Optional[UserPermissionStatus] = Field(None, description="Filtrar por estado del permiso")
    include_expired: bool = Field(False, description="Incluir permisos expirados")
    expiring_in_days: Optional[int] = Field(None, ge=1, le=365, description="Permisos que expiran en X días")
    
    @field_validator('granted_after', 'granted_before', 'expires_after', 'expires_before')
    @classmethod
    def validate_dates(cls, v):
        if v and v > datetime.now():
            raise ValueError('La fecha no puede ser futura para filtros de búsqueda')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "permission_group": "PRODUCTS",
                "permission_type": "GRANT",
                "status": "active",
                "include_expired": False,
                "expiring_in_days": 30
            }
        }


class UserPermissionListResponse(BaseModel):
    """Schema for paginated user permission list response"""
    items: List[UserPermissionDetailResponse] = Field(..., description="Lista de asignaciones de permisos")
    total: int = Field(..., ge=0, description="Total de registros")
    page: int = Field(..., ge=1, description="Página actual")
    size: int = Field(..., ge=1, le=100, description="Tamaño de página")
    pages: int = Field(..., ge=0, description="Total de páginas")
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "id": 1,
                        "user_id": 1,
                        "permission_id": 5,
                        "permission_type": "GRANT",
                        "granted_by_user_id": 2,
                        "expires_at": "2024-12-31T23:59:59Z",
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "is_expired": False,
                        "is_active": True,
                        "user_username": "john.doe",
                        "user_full_name": "John Doe",
                        "permission_name": "Crear Productos",
                        "permission_code": "PRODUCTS_CREATE",
                        "permission_group": "PRODUCTS",
                        "permission_description": "Permite crear nuevos productos",
                        "granted_by_username": "admin",
                        "user_is_active": True,
                        "permission_is_active": True,
                        "days_until_expiry": 120
                    }
                ],
                "total": 1,
                "page": 1,
                "size": 10,
                "pages": 1
            }
        }


class UserPermissionStatsResponse(BaseModel):
    """Schema for user permission statistics"""
    total_assignments: int = Field(..., ge=0, description="Total de asignaciones de permisos")
    active_assignments: int = Field(..., ge=0, description="Asignaciones activas")
    expired_assignments: int = Field(..., ge=0, description="Asignaciones expiradas")
    grant_permissions: int = Field(..., ge=0, description="Permisos de tipo GRANT")
    deny_permissions: int = Field(..., ge=0, description="Permisos de tipo DENY")
    unique_users_with_permissions: int = Field(..., ge=0, description="Usuarios únicos con permisos directos")
    unique_permissions_assigned: int = Field(..., ge=0, description="Permisos únicos asignados")
    expiring_soon: int = Field(..., ge=0, description="Permisos que expiran en los próximos 30 días")
    permission_distribution: Dict[str, int] = Field(
        ..., 
        description="Distribución de permisos por grupo"
    )
    most_assigned_permissions: List[Dict[str, Any]] = Field(
        ..., 
        description="Permisos más asignados directamente"
    )
    users_with_most_permissions: List[Dict[str, Any]] = Field(
        ..., 
        description="Usuarios con más permisos directos"
    )
    recent_assignments: int = Field(..., ge=0, description="Asignaciones en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_assignments": 25,
                "active_assignments": 20,
                "expired_assignments": 5,
                "grant_permissions": 18,
                "deny_permissions": 2,
                "unique_users_with_permissions": 8,
                "unique_permissions_assigned": 12,
                "expiring_soon": 3,
                "permission_distribution": {
                    "PRODUCTS": 8,
                    "INVENTORY": 5,
                    "SALES": 4,
                    "USERS": 3
                },
                "most_assigned_permissions": [
                    {"permission_name": "Crear Productos", "permission_code": "PRODUCTS_CREATE", "count": 5},
                    {"permission_name": "Ver Inventario", "permission_code": "INVENTORY_READ", "count": 4}
                ],
                "users_with_most_permissions": [
                    {"username": "john.doe", "full_name": "John Doe", "permissions_count": 8},
                    {"username": "jane.smith", "full_name": "Jane Smith", "permissions_count": 6}
                ],
                "recent_assignments": 5
            }
        }


class BulkUserPermissionCreate(BaseModel):
    """Schema for bulk creation of user permission assignments"""
    assignments: List[UserPermissionCreate] = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Lista de asignaciones a crear"
    )
    
    @field_validator('assignments')
    @classmethod
    def validate_unique_assignments(cls, v):
        # Check for duplicate user_id/permission_id combinations
        seen = set()
        for assignment in v:
            key = (assignment.user_id, assignment.permission_id)
            if key in seen:
                raise ValueError(f'Asignación duplicada: usuario {assignment.user_id}, permiso {assignment.permission_id}')
            seen.add(key)
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "assignments": [
                    {
                        "user_id": 1,
                        "permission_id": 5,
                        "permission_type": "GRANT",
                        "granted_by_user_id": 2,
                        "expires_at": "2024-12-31T23:59:59Z"
                    },
                    {
                        "user_id": 2,
                        "permission_id": 6,
                        "permission_type": "DENY",
                        "granted_by_user_id": 2
                    }
                ]
            }
        }


class BulkUserPermissionResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[UserPermissionResponse] = Field(..., description="Asignaciones creadas exitosamente")
    errors: List[Dict[str, Any]] = Field(..., description="Errores durante la creación")
    total_processed: int = Field(..., ge=0, description="Total de registros procesados")
    total_created: int = Field(..., ge=0, description="Total de registros creados")
    total_errors: int = Field(..., ge=0, description="Total de errores")
    
    class Config:
        json_schema_extra = {
            "example": {
                "created": [
                    {
                        "id": 1,
                        "user_id": 1,
                        "permission_id": 5,
                        "permission_type": "GRANT",
                        "granted_by_user_id": 2,
                        "expires_at": "2024-12-31T23:59:59Z",
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "is_expired": False,
                        "is_active": True
                    }
                ],
                "errors": [
                    {
                        "user_id": 2,
                        "permission_id": 999,
                        "error": "Permission not found"
                    }
                ],
                "total_processed": 2,
                "total_created": 1,
                "total_errors": 1
            }
        }


class UserPermissionsByGroup(BaseModel):
    """Schema for user permissions grouped by permission group"""
    user_id: int = Field(..., description="ID del usuario")
    user_username: str = Field(..., description="Username del usuario")
    user_full_name: str = Field(..., description="Nombre completo del usuario")
    permission_groups: Dict[str, List[Dict[str, Any]]] = Field(
        ..., 
        description="Permisos agrupados por categoría"
    )
    total_permissions: int = Field(..., ge=0, description="Total de permisos asignados")
    grant_permissions: int = Field(..., ge=0, description="Permisos GRANT")
    deny_permissions: int = Field(..., ge=0, description="Permisos DENY")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "user_username": "john.doe",
                "user_full_name": "John Doe",
                "permission_groups": {
                    "PRODUCTS": [
                        {
                            "id": 5,
                            "name": "Crear Productos",
                            "code": "PRODUCTS_CREATE",
                            "type": "GRANT",
                            "expires_at": "2024-12-31T23:59:59Z"
                        }
                    ],
                    "INVENTORY": [
                        {
                            "id": 10,
                            "name": "Eliminar Inventario",
                            "code": "INVENTORY_DELETE",
                            "type": "DENY",
                            "expires_at": None
                        }
                    ]
                },
                "total_permissions": 2,
                "grant_permissions": 1,
                "deny_permissions": 1
            }
        }


class UserPermissionExtendRequest(BaseModel):
    """Schema for extending user permission expiration"""
    permission_ids: List[int] = Field(
        ..., 
        min_length=1,
        description="Lista de IDs de permisos a extender"
    )
    extend_by_days: int = Field(
        ..., 
        ge=1, 
        le=3650,  # Max 10 years
        description="Días a agregar a la fecha de expiración"
    )
    new_expiry_date: Optional[datetime] = Field(
        None, 
        description="Nueva fecha de expiración específica (alternativa a extend_by_days)"
    )
    extended_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que realiza la extensión")
    
    @field_validator('new_expiry_date')
    @classmethod
    def validate_new_expiry_date(cls, v):
        if v is not None and v <= datetime.now():
            raise ValueError('new_expiry_date debe ser una fecha futura')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "permission_ids": [1, 2, 3],
                "extend_by_days": 90,
                "extended_by_user_id": 2
            }
        }


class UserPermissionCopyRequest(BaseModel):
    """Schema for copying permissions from one user to another"""
    source_user_id: int = Field(..., gt=0, description="ID del usuario origen")
    target_user_id: int = Field(..., gt=0, description="ID del usuario destino")
    permission_groups: Optional[List[str]] = Field(
        None, 
        description="Grupos específicos a copiar (opcional, si no se especifica se copian todos)"
    )
    permission_types: Optional[List[PermissionTypeEnum]] = Field(
        None,
        description="Tipos de permisos a copiar (GRANT, DENY)"
    )
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que realiza la copia")
    copy_expiration: bool = Field(
        False, 
        description="Si True, copia las fechas de expiración; si False, los nuevos permisos no expiran"
    )
    extend_expiration_days: Optional[int] = Field(
        None,
        ge=1,
        le=3650,
        description="Días adicionales a agregar a las fechas de expiración copiadas"
    )
    overwrite_existing: bool = Field(
        False, 
        description="Si True, sobrescribe permisos existentes; si False, solo agrega nuevos"
    )
    
    @field_validator('target_user_id')
    @classmethod
    def validate_different_users(cls, v, values):
        if 'source_user_id' in values.data and v == values.data['source_user_id']:
            raise ValueError('El usuario origen y destino no pueden ser el mismo')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_user_id": 1,
                "target_user_id": 2,
                "permission_groups": ["PRODUCTS", "INVENTORY"],
                "permission_types": ["GRANT"],
                "granted_by_user_id": 3,
                "copy_expiration": False,
                "extend_expiration_days": 30,
                "overwrite_existing": False
            }
        }


class ExpiringPermissionsReport(BaseModel):
    """Schema for expiring permissions report"""
    report_date: datetime = Field(..., description="Fecha del reporte")
    expiring_in_7_days: List[UserPermissionDetailResponse] = Field(
        ..., 
        description="Permisos que expiran en 7 días"
    )
    expiring_in_30_days: List[UserPermissionDetailResponse] = Field(
        ..., 
        description="Permisos que expiran en 30 días"
    )
    already_expired: List[UserPermissionDetailResponse] = Field(
        ..., 
        description="Permisos ya expirados"
    )
    total_expiring_7_days: int = Field(..., ge=0, description="Total expirando en 7 días")
    total_expiring_30_days: int = Field(..., ge=0, description="Total expirando en 30 días")
    total_expired: int = Field(..., ge=0, description="Total expirados")
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_date": "2024-01-15T10:30:00Z",
                "expiring_in_7_days": [],
                "expiring_in_30_days": [],
                "already_expired": [],
                "total_expiring_7_days": 2,
                "total_expiring_30_days": 5,
                "total_expired": 3
            }
        }


# Constants for validation
MIN_USER_ID = 1
MAX_USER_ID = 9223372036854775807  # Max BIGINT
MIN_PERMISSION_ID = 1
MAX_PERMISSION_ID = 9223372036854775807  # Max BIGINT

# Query helpers
USER_PERMISSION_DEFAULT_PAGE_SIZE = 20
USER_PERMISSION_MAX_PAGE_SIZE = 100

# Expiration constants
DEFAULT_EXPIRATION_WARNING_DAYS = 30
MAX_EXPIRATION_EXTENSION_DAYS = 3650  # 10 years

# Permission type constants
PERMISSION_TYPES = ["GRANT", "DENY"]