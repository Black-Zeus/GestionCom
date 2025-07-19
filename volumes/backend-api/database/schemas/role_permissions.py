"""
volumes/backend-api/database/schemas/role_permissions.py
Pydantic schemas for RolePermission model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class PermissionGroupEnum(str, Enum):
    """Common permission groups"""
    PRODUCTS = "PRODUCTS"
    INVENTORY = "INVENTORY"
    SALES = "SALES"
    USERS = "USERS"
    ROLES = "ROLES"
    PERMISSIONS = "PERMISSIONS"
    WAREHOUSES = "WAREHOUSES"
    REPORTS = "REPORTS"
    ADMIN = "ADMIN"


class RolePermissionBase(BaseModel):
    """Base schema for RolePermission"""
    role_id: int = Field(..., gt=0, description="ID del rol")
    permission_id: int = Field(..., gt=0, description="ID del permiso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que otorgó el permiso")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v


class RolePermissionCreate(RolePermissionBase):
    """Schema for creating a new role permission assignment"""
    
    class Config:
        json_schema_extra = {
            "example": {
                "role_id": 2,
                "permission_id": 5,
                "granted_by_user_id": 1
            }
        }


class RolePermissionUpdate(BaseModel):
    """Schema for updating role permission assignment"""
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que modificó la asignación")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "granted_by_user_id": 2
            }
        }


class RolePermissionResponse(RolePermissionBase):
    """Schema for role permission response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="ID único de la asignación")
    granted_at: datetime = Field(..., description="Fecha y hora cuando se otorgó el permiso")
    created_at: datetime = Field(..., description="Fecha de creación del registro")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "role_id": 2,
                "permission_id": 5,
                "granted_by_user_id": 1,
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


class RolePermissionDetailResponse(RolePermissionResponse):
    """Schema for detailed role permission response with related data"""
    role_name: Optional[str] = Field(None, description="Nombre del rol")
    role_code: Optional[str] = Field(None, description="Código del rol")
    permission_name: Optional[str] = Field(None, description="Nombre del permiso")
    permission_code: Optional[str] = Field(None, description="Código del permiso")
    permission_group: Optional[str] = Field(None, description="Grupo del permiso")
    permission_description: Optional[str] = Field(None, description="Descripción del permiso")
    granted_by_username: Optional[str] = Field(None, description="Username de quien otorgó el permiso")
    role_is_active: Optional[bool] = Field(None, description="Si el rol está activo")
    permission_is_active: Optional[bool] = Field(None, description="Si el permiso está activo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "role_id": 2,
                "permission_id": 5,
                "granted_by_user_id": 1,
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "role_name": "Manager",
                "role_code": "MANAGER",
                "permission_name": "Crear Productos",
                "permission_code": "PRODUCTS_CREATE",
                "permission_group": "PRODUCTS",
                "permission_description": "Permite crear nuevos productos",
                "granted_by_username": "admin",
                "role_is_active": True,
                "permission_is_active": True
            }
        }


class RolePermissionSummary(BaseModel):
    """Schema for role permission summary"""
    id: int = Field(..., description="ID de la asignación")
    role_id: int = Field(..., description="ID del rol")
    role_name: str = Field(..., description="Nombre del rol")
    role_code: str = Field(..., description="Código del rol")
    permission_id: int = Field(..., description="ID del permiso")
    permission_name: str = Field(..., description="Nombre del permiso")
    permission_code: str = Field(..., description="Código del permiso")
    permission_group: str = Field(..., description="Grupo del permiso")
    granted_at: datetime = Field(..., description="Fecha cuando se otorgó")
    
    model_config = ConfigDict(from_attributes=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "role_id": 2,
                "role_name": "Manager",
                "role_code": "MANAGER",
                "permission_id": 5,
                "permission_name": "Crear Productos",
                "permission_code": "PRODUCTS_CREATE",
                "permission_group": "PRODUCTS",
                "granted_at": "2024-01-15T10:30:00Z"
            }
        }


class RolePermissionFilters(BaseModel):
    """Schema for filtering role permissions"""
    role_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de rol")
    permission_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de permiso")
    role_code: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por código de rol")
    permission_code: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por código de permiso")
    permission_group: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por grupo de permiso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="Filtrar por quien otorgó el permiso")
    granted_after: Optional[datetime] = Field(None, description="Filtrar asignaciones después de esta fecha")
    granted_before: Optional[datetime] = Field(None, description="Filtrar asignaciones antes de esta fecha")
    is_active: Optional[bool] = Field(None, description="Filtrar por permisos/roles activos")
    
    @field_validator('granted_after', 'granted_before')
    @classmethod
    def validate_dates(cls, v):
        if v and v > datetime.now():
            raise ValueError('La fecha no puede ser futura')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "role_code": "MANAGER",
                "permission_group": "PRODUCTS",
                "is_active": True,
                "granted_after": "2024-01-01T00:00:00Z"
            }
        }


class RolePermissionListResponse(BaseModel):
    """Schema for paginated role permission list response"""
    items: List[RolePermissionDetailResponse] = Field(..., description="Lista de asignaciones de permisos")
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
                        "role_id": 2,
                        "permission_id": 5,
                        "granted_by_user_id": 1,
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "role_name": "Manager",
                        "role_code": "MANAGER",
                        "permission_name": "Crear Productos",
                        "permission_code": "PRODUCTS_CREATE",
                        "permission_group": "PRODUCTS",
                        "permission_description": "Permite crear nuevos productos",
                        "granted_by_username": "admin",
                        "role_is_active": True,
                        "permission_is_active": True
                    }
                ],
                "total": 1,
                "page": 1,
                "size": 10,
                "pages": 1
            }
        }


class RolePermissionStatsResponse(BaseModel):
    """Schema for role permission statistics"""
    total_assignments: int = Field(..., ge=0, description="Total de asignaciones de permisos")
    unique_roles_with_permissions: int = Field(..., ge=0, description="Roles únicos con permisos asignados")
    unique_permissions_assigned: int = Field(..., ge=0, description="Permisos únicos asignados")
    permission_distribution: Dict[str, int] = Field(
        ..., 
        description="Distribución de permisos por grupo"
    )
    most_assigned_permissions: List[Dict[str, Any]] = Field(
        ..., 
        description="Permisos más asignados"
    )
    roles_with_most_permissions: List[Dict[str, Any]] = Field(
        ..., 
        description="Roles con más permisos"
    )
    recent_assignments: int = Field(..., ge=0, description="Asignaciones en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_assignments": 45,
                "unique_roles_with_permissions": 8,
                "unique_permissions_assigned": 15,
                "permission_distribution": {
                    "PRODUCTS": 12,
                    "INVENTORY": 8,
                    "SALES": 10,
                    "USERS": 6
                },
                "most_assigned_permissions": [
                    {"permission_name": "Ver Productos", "permission_code": "PRODUCTS_READ", "count": 8},
                    {"permission_name": "Ver Inventario", "permission_code": "INVENTORY_READ", "count": 7}
                ],
                "roles_with_most_permissions": [
                    {"role_name": "Admin", "role_code": "ADMIN", "permissions_count": 15},
                    {"role_name": "Manager", "role_code": "MANAGER", "permissions_count": 10}
                ],
                "recent_assignments": 8
            }
        }


class BulkRolePermissionCreate(BaseModel):
    """Schema for bulk creation of role permission assignments"""
    assignments: List[RolePermissionCreate] = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Lista de asignaciones a crear"
    )
    
    @field_validator('assignments')
    @classmethod
    def validate_unique_assignments(cls, v):
        # Check for duplicate role_id/permission_id combinations
        seen = set()
        for assignment in v:
            key = (assignment.role_id, assignment.permission_id)
            if key in seen:
                raise ValueError(f'Asignación duplicada: rol {assignment.role_id}, permiso {assignment.permission_id}')
            seen.add(key)
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "assignments": [
                    {"role_id": 2, "permission_id": 5, "granted_by_user_id": 1},
                    {"role_id": 2, "permission_id": 6, "granted_by_user_id": 1}
                ]
            }
        }


class BulkRolePermissionResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[RolePermissionResponse] = Field(..., description="Asignaciones creadas exitosamente")
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
                        "role_id": 2,
                        "permission_id": 5,
                        "granted_by_user_id": 1,
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z"
                    }
                ],
                "errors": [],
                "total_processed": 2,
                "total_created": 2,
                "total_errors": 0
            }
        }


class RolePermissionsByGroup(BaseModel):
    """Schema for permissions grouped by permission group for a role"""
    role_id: int = Field(..., description="ID del rol")
    role_name: str = Field(..., description="Nombre del rol")
    role_code: str = Field(..., description="Código del rol")
    permission_groups: Dict[str, List[Dict[str, Any]]] = Field(
        ..., 
        description="Permisos agrupados por categoría"
    )
    total_permissions: int = Field(..., ge=0, description="Total de permisos asignados")
    
    class Config:
        json_schema_extra = {
            "example": {
                "role_id": 2,
                "role_name": "Manager",
                "role_code": "MANAGER",
                "permission_groups": {
                    "PRODUCTS": [
                        {"id": 5, "name": "Crear Productos", "code": "PRODUCTS_CREATE"},
                        {"id": 6, "name": "Editar Productos", "code": "PRODUCTS_UPDATE"}
                    ],
                    "INVENTORY": [
                        {"id": 10, "name": "Ver Inventario", "code": "INVENTORY_READ"}
                    ]
                },
                "total_permissions": 3
            }
        }


class RolePermissionCopyRequest(BaseModel):
    """Schema for copying permissions from one role to another"""
    source_role_id: int = Field(..., gt=0, description="ID del rol origen")
    target_role_id: int = Field(..., gt=0, description="ID del rol destino")
    permission_groups: Optional[List[str]] = Field(
        None, 
        description="Grupos específicos a copiar (opcional, si no se especifica se copian todos)"
    )
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que realiza la copia")
    overwrite_existing: bool = Field(
        False, 
        description="Si True, sobrescribe permisos existentes; si False, solo agrega nuevos"
    )
    
    @field_validator('target_role_id')
    @classmethod
    def validate_different_roles(cls, v, values):
        if 'source_role_id' in values.data and v == values.data['source_role_id']:
            raise ValueError('El rol origen y destino no pueden ser el mismo')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_role_id": 2,
                "target_role_id": 3,
                "permission_groups": ["PRODUCTS", "INVENTORY"],
                "granted_by_user_id": 1,
                "overwrite_existing": False
            }
        }


# Constants for validation
MIN_ROLE_ID = 1
MAX_ROLE_ID = 9223372036854775807  # Max BIGINT
MIN_PERMISSION_ID = 1
MAX_PERMISSION_ID = 9223372036854775807  # Max BIGINT

# Query helpers
ROLE_PERMISSION_DEFAULT_PAGE_SIZE = 20
ROLE_PERMISSION_MAX_PAGE_SIZE = 100

# Permission group constants
PERMISSION_GROUPS = [
    "PRODUCTS",
    "INVENTORY", 
    "SALES",
    "USERS",
    "ROLES",
    "PERMISSIONS",
    "WAREHOUSES",
    "REPORTS",
    "ADMIN"
]