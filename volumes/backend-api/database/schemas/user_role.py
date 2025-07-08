"""
Pydantic schemas for UserRole model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class UserRoleStatus(str, Enum):
    """Status enum for user role assignments"""
    ACTIVE = "active"
    INACTIVE = "inactive"


class UserRoleBase(BaseModel):
    """Base schema for UserRole"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    role_id: int = Field(..., gt=0, description="ID del rol")
    assigned_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que asignó el rol")
    
    @field_validator('assigned_by_user_id')
    @classmethod
    def validate_assigned_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('assigned_by_user_id debe ser un número positivo')
        return v


class UserRoleCreate(UserRoleBase):
    """Schema for creating a new user role assignment"""
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "role_id": 2,
                "assigned_by_user_id": 1
            }
        }


class UserRoleUpdate(BaseModel):
    """Schema for updating user role assignment"""
    assigned_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que modificó la asignación")
    
    @field_validator('assigned_by_user_id')
    @classmethod
    def validate_assigned_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('assigned_by_user_id debe ser un número positivo')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "assigned_by_user_id": 2
            }
        }


class UserRoleResponse(UserRoleBase):
    """Schema for user role response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="ID único de la asignación")
    assigned_at: datetime = Field(..., description="Fecha y hora de asignación")
    created_at: datetime = Field(..., description="Fecha de creación del registro")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "role_id": 2,
                "assigned_by_user_id": 1,
                "assigned_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


class UserRoleDetailResponse(UserRoleResponse):
    """Schema for detailed user role response with related data"""
    user_username: Optional[str] = Field(None, description="Username del usuario")
    user_full_name: Optional[str] = Field(None, description="Nombre completo del usuario")
    role_name: Optional[str] = Field(None, description="Nombre del rol")
    role_code: Optional[str] = Field(None, description="Código del rol")
    assigned_by_username: Optional[str] = Field(None, description="Username de quien asignó el rol")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "role_id": 2,
                "assigned_by_user_id": 1,
                "assigned_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "user_username": "john.doe",
                "user_full_name": "John Doe",
                "role_name": "Manager",
                "role_code": "MANAGER",
                "assigned_by_username": "admin"
            }
        }


class UserRoleSummary(BaseModel):
    """Schema for user role summary"""
    id: int = Field(..., description="ID de la asignación")
    user_id: int = Field(..., description="ID del usuario")
    user_username: str = Field(..., description="Username del usuario")
    role_id: int = Field(..., description="ID del rol")
    role_name: str = Field(..., description="Nombre del rol")
    role_code: str = Field(..., description="Código del rol")
    assigned_at: datetime = Field(..., description="Fecha de asignación")
    
    model_config = ConfigDict(from_attributes=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "user_username": "john.doe",
                "role_id": 2,
                "role_name": "Manager",
                "role_code": "MANAGER",
                "assigned_at": "2024-01-15T10:30:00Z"
            }
        }


class UserRoleFilters(BaseModel):
    """Schema for filtering user roles"""
    user_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de usuario")
    role_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de rol")
    role_code: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por código de rol")
    assigned_by_user_id: Optional[int] = Field(None, gt=0, description="Filtrar por quien asignó el rol")
    username: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por username")
    assigned_after: Optional[datetime] = Field(None, description="Filtrar asignaciones después de esta fecha")
    assigned_before: Optional[datetime] = Field(None, description="Filtrar asignaciones antes de esta fecha")
    
    @field_validator('assigned_after', 'assigned_before')
    @classmethod
    def validate_dates(cls, v):
        if v and v > datetime.now():
            raise ValueError('La fecha no puede ser futura')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "role_code": "MANAGER",
                "assigned_after": "2024-01-01T00:00:00Z",
                "assigned_before": "2024-12-31T23:59:59Z"
            }
        }


class UserRoleListResponse(BaseModel):
    """Schema for paginated user role list response"""
    items: List[UserRoleDetailResponse] = Field(..., description="Lista de asignaciones de roles")
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
                        "role_id": 2,
                        "assigned_by_user_id": 1,
                        "assigned_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "user_username": "john.doe",
                        "user_full_name": "John Doe",
                        "role_name": "Manager",
                        "role_code": "MANAGER",
                        "assigned_by_username": "admin"
                    }
                ],
                "total": 1,
                "page": 1,
                "size": 10,
                "pages": 1
            }
        }


class UserRoleStatsResponse(BaseModel):
    """Schema for user role statistics"""
    total_assignments: int = Field(..., ge=0, description="Total de asignaciones de roles")
    unique_users_with_roles: int = Field(..., ge=0, description="Usuarios únicos con roles asignados")
    unique_roles_assigned: int = Field(..., ge=0, description="Roles únicos asignados")
    most_assigned_roles: List[Dict[str, Any]] = Field(
        ..., 
        description="Roles más asignados"
    )
    users_with_multiple_roles: int = Field(..., ge=0, description="Usuarios con múltiples roles")
    recent_assignments: int = Field(..., ge=0, description="Asignaciones en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_assignments": 25,
                "unique_users_with_roles": 15,
                "unique_roles_assigned": 5,
                "most_assigned_roles": [
                    {"role_name": "User", "role_code": "USER", "count": 10},
                    {"role_name": "Manager", "role_code": "MANAGER", "count": 8}
                ],
                "users_with_multiple_roles": 3,
                "recent_assignments": 5
            }
        }


class BulkUserRoleCreate(BaseModel):
    """Schema for bulk creation of user role assignments"""
    assignments: List[UserRoleCreate] = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Lista de asignaciones a crear"
    )
    
    @field_validator('assignments')
    @classmethod
    def validate_unique_assignments(cls, v):
        # Check for duplicate user_id/role_id combinations
        seen = set()
        for assignment in v:
            key = (assignment.user_id, assignment.role_id)
            if key in seen:
                raise ValueError(f'Asignación duplicada: usuario {assignment.user_id}, rol {assignment.role_id}')
            seen.add(key)
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "assignments": [
                    {"user_id": 1, "role_id": 2, "assigned_by_user_id": 1},
                    {"user_id": 2, "role_id": 3, "assigned_by_user_id": 1}
                ]
            }
        }


class BulkUserRoleResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[UserRoleResponse] = Field(..., description="Asignaciones creadas exitosamente")
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
                        "role_id": 2,
                        "assigned_by_user_id": 1,
                        "assigned_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z"
                    }
                ],
                "errors": [],
                "total_processed": 2,
                "total_created": 1,
                "total_errors": 1
            }
        }


# Constants for validation
MIN_USER_ID = 1
MAX_USER_ID = 9223372036854775807  # Max BIGINT
MIN_ROLE_ID = 1
MAX_ROLE_ID = 9223372036854775807  # Max BIGINT

# Query helpers
USER_ROLE_DEFAULT_PAGE_SIZE = 20
USER_ROLE_MAX_PAGE_SIZE = 100