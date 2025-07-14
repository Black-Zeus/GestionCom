"""
Pydantic schemas for UserWarehouseAccess model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum


class AccessTypeEnum(str, Enum):
    """Access type enum for warehouse access"""
    FULL = "FULL"
    READ_ONLY = "read_ONLY"
    DENIED = "DENIED"


class WarehouseAccessStatus(str, Enum):
    """Status enum for warehouse access"""
    ACTIVE = "active"
    DENIED = "denied"
    GRANTED = "granted"


class UserWarehouseAccessBase(BaseModel):
    """Base schema for UserWarehouseAccess"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    warehouse_id: int = Field(..., gt=0, description="ID del almacén")
    access_type: AccessTypeEnum = Field(
        AccessTypeEnum.READ_ONLY, 
        description="Tipo de acceso: FULL, READ_ONLY, DENIED"
    )
    granted_by_user_id: int = Field(..., gt=0, description="ID del usuario que otorgó el acceso")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v


class UserWarehouseAccessCreate(UserWarehouseAccessBase):
    """Schema for creating a new user warehouse access"""
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "warehouse_id": 2,
                "access_type": "FULL",
                "granted_by_user_id": 3
            }
        }


class UserWarehouseAccessUpdate(BaseModel):
    """Schema for updating user warehouse access"""
    access_type: Optional[AccessTypeEnum] = Field(None, description="Nuevo tipo de acceso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario que modificó el acceso")
    
    @field_validator('granted_by_user_id')
    @classmethod
    def validate_granted_by_user_id(cls, v):
        if v is not None and v <= 0:
            raise ValueError('granted_by_user_id debe ser un número positivo')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_type": "READ_ONLY",
                "granted_by_user_id": 3
            }
        }


class UserWarehouseAccessResponse(UserWarehouseAccessBase):
    """Schema for user warehouse access response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="ID único del acceso")
    granted_at: datetime = Field(..., description="Fecha y hora cuando se otorgó el acceso")
    created_at: datetime = Field(..., description="Fecha de creación del registro")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    has_full_access: bool = Field(..., description="Si tiene acceso completo")
    has_read_access: bool = Field(..., description="Si tiene acceso de lectura")
    is_denied: bool = Field(..., description="Si el acceso está denegado")
    can_write: bool = Field(..., description="Si puede escribir/modificar")
    can_read: bool = Field(..., description="Si puede leer")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "warehouse_id": 2,
                "access_type": "FULL",
                "granted_by_user_id": 3,
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "has_full_access": True,
                "has_read_access": True,
                "is_denied": False,
                "can_write": True,
                "can_read": True
            }
        }


class UserWarehouseAccessDetailResponse(UserWarehouseAccessResponse):
    """Schema for detailed user warehouse access response with related data"""
    user_username: Optional[str] = Field(None, description="Username del usuario")
    user_full_name: Optional[str] = Field(None, description="Nombre completo del usuario")
    user_email: Optional[str] = Field(None, description="Email del usuario")
    warehouse_name: Optional[str] = Field(None, description="Nombre del almacén")
    warehouse_code: Optional[str] = Field(None, description="Código del almacén")
    warehouse_location: Optional[str] = Field(None, description="Ubicación del almacén")
    warehouse_description: Optional[str] = Field(None, description="Descripción del almacén")
    granted_by_username: Optional[str] = Field(None, description="Username de quien otorgó el acceso")
    user_is_active: Optional[bool] = Field(None, description="Si el usuario está activo")
    warehouse_is_active: Optional[bool] = Field(None, description="Si el almacén está activo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "warehouse_id": 2,
                "access_type": "FULL",
                "granted_by_user_id": 3,
                "granted_at": "2024-01-15T10:30:00Z",
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "has_full_access": True,
                "has_read_access": True,
                "is_denied": False,
                "can_write": True,
                "can_read": True,
                "user_username": "john.doe",
                "user_full_name": "John Doe",
                "user_email": "john.doe@company.com",
                "warehouse_name": "Almacén Central",
                "warehouse_code": "AC001",
                "warehouse_location": "Santiago Centro",
                "warehouse_description": "Almacén principal de distribución",
                "granted_by_username": "admin",
                "user_is_active": True,
                "warehouse_is_active": True
            }
        }


class UserWarehouseAccessSummary(BaseModel):
    """Schema for user warehouse access summary"""
    id: int = Field(..., description="ID del acceso")
    user_id: int = Field(..., description="ID del usuario")
    user_username: str = Field(..., description="Username del usuario")
    warehouse_id: int = Field(..., description="ID del almacén")
    warehouse_name: str = Field(..., description="Nombre del almacén")
    warehouse_code: str = Field(..., description="Código del almacén")
    access_type: AccessTypeEnum = Field(..., description="Tipo de acceso")
    granted_at: datetime = Field(..., description="Fecha cuando se otorgó")
    status: WarehouseAccessStatus = Field(..., description="Estado del acceso")
    
    model_config = ConfigDict(from_attributes=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "user_id": 1,
                "user_username": "john.doe",
                "warehouse_id": 2,
                "warehouse_name": "Almacén Central",
                "warehouse_code": "AC001",
                "access_type": "FULL",
                "granted_at": "2024-01-15T10:30:00Z",
                "status": "active"
            }
        }


class UserWarehouseAccessFilters(BaseModel):
    """Schema for filtering user warehouse access"""
    user_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de usuario")
    warehouse_id: Optional[int] = Field(None, gt=0, description="Filtrar por ID de almacén")
    username: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por username")
    warehouse_code: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por código de almacén")
    warehouse_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por nombre de almacén")
    access_type: Optional[AccessTypeEnum] = Field(None, description="Filtrar por tipo de acceso")
    granted_by_user_id: Optional[int] = Field(None, gt=0, description="Filtrar por quien otorgó el acceso")
    granted_after: Optional[datetime] = Field(None, description="Filtrar accesos otorgados después de esta fecha")
    granted_before: Optional[datetime] = Field(None, description="Filtrar accesos otorgados antes de esta fecha")
    user_is_active: Optional[bool] = Field(None, description="Filtrar por usuarios activos")
    warehouse_is_active: Optional[bool] = Field(None, description="Filtrar por almacenes activos")
    include_denied: bool = Field(False, description="Incluir accesos denegados")
    location: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por ubicación del almacén")
    
    @field_validator('granted_after', 'granted_before')
    @classmethod
    def validate_dates(cls, v):
        if v and v > datetime.now():
            raise ValueError('La fecha no puede ser futura para filtros de búsqueda')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "access_type": "FULL",
                "user_is_active": True,
                "warehouse_is_active": True,
                "include_denied": False,
                "location": "Santiago"
            }
        }


class UserWarehouseAccessListResponse(BaseModel):
    """Schema for paginated user warehouse access list response"""
    items: List[UserWarehouseAccessDetailResponse] = Field(..., description="Lista de accesos a almacenes")
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
                        "warehouse_id": 2,
                        "access_type": "FULL",
                        "granted_by_user_id": 3,
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "has_full_access": True,
                        "has_read_access": True,
                        "is_denied": False,
                        "can_write": True,
                        "can_read": True,
                        "user_username": "john.doe",
                        "user_full_name": "John Doe",
                        "user_email": "john.doe@company.com",
                        "warehouse_name": "Almacén Central",
                        "warehouse_code": "AC001",
                        "warehouse_location": "Santiago Centro",
                        "warehouse_description": "Almacén principal de distribución",
                        "granted_by_username": "admin",
                        "user_is_active": True,
                        "warehouse_is_active": True
                    }
                ],
                "total": 1,
                "page": 1,
                "size": 10,
                "pages": 1
            }
        }


class UserWarehouseAccessStatsResponse(BaseModel):
    """Schema for user warehouse access statistics"""
    total_accesses: int = Field(..., ge=0, description="Total de accesos configurados")
    full_access_count: int = Field(..., ge=0, description="Accesos completos")
    read_only_count: int = Field(..., ge=0, description="Accesos de solo lectura")
    denied_count: int = Field(..., ge=0, description="Accesos denegados")
    unique_users_with_access: int = Field(..., ge=0, description="Usuarios únicos con acceso")
    unique_warehouses_accessible: int = Field(..., ge=0, description="Almacenes únicos accesibles")
    access_distribution: Dict[str, int] = Field(
        ..., 
        description="Distribución de accesos por tipo"
    )
    warehouses_with_most_users: List[Dict[str, Any]] = Field(
        ..., 
        description="Almacenes con más usuarios"
    )
    users_with_most_warehouses: List[Dict[str, Any]] = Field(
        ..., 
        description="Usuarios con acceso a más almacenes"
    )
    recent_access_grants: int = Field(..., ge=0, description="Accesos otorgados en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_accesses": 45,
                "full_access_count": 20,
                "read_only_count": 18,
                "denied_count": 7,
                "unique_users_with_access": 15,
                "unique_warehouses_accessible": 8,
                "access_distribution": {
                    "FULL": 20,
                    "READ_ONLY": 18,
                    "DENIED": 7
                },
                "warehouses_with_most_users": [
                    {"warehouse_name": "Almacén Central", "warehouse_code": "AC001", "users_count": 12},
                    {"warehouse_name": "Almacén Norte", "warehouse_code": "AN002", "users_count": 8}
                ],
                "users_with_most_warehouses": [
                    {"username": "john.doe", "full_name": "John Doe", "warehouses_count": 6},
                    {"username": "jane.smith", "full_name": "Jane Smith", "warehouses_count": 4}
                ],
                "recent_access_grants": 8
            }
        }


class BulkWarehouseAccessCreate(BaseModel):
    """Schema for bulk creation of warehouse access"""
    accesses: List[UserWarehouseAccessCreate] = Field(
        ..., 
        min_length=1, 
        max_length=100,
        description="Lista de accesos a crear"
    )
    
    @field_validator('accesses')
    @classmethod
    def validate_unique_accesses(cls, v):
        # Check for duplicate user_id/warehouse_id combinations
        seen = set()
        for access in v:
            key = (access.user_id, access.warehouse_id)
            if key in seen:
                raise ValueError(f'Acceso duplicado: usuario {access.user_id}, almacén {access.warehouse_id}')
            seen.add(key)
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "accesses": [
                    {"user_id": 1, "warehouse_id": 2, "access_type": "FULL", "granted_by_user_id": 3},
                    {"user_id": 2, "warehouse_id": 3, "access_type": "READ_ONLY", "granted_by_user_id": 3}
                ]
            }
        }


class BulkWarehouseAccessResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[UserWarehouseAccessResponse] = Field(..., description="Accesos creados exitosamente")
    updated: List[UserWarehouseAccessResponse] = Field(..., description="Accesos actualizados")
    errors: List[Dict[str, Any]] = Field(..., description="Errores durante la operación")
    total_processed: int = Field(..., ge=0, description="Total de registros procesados")
    total_created: int = Field(..., ge=0, description="Total de registros creados")
    total_updated: int = Field(..., ge=0, description="Total de registros actualizados")
    total_errors: int = Field(..., ge=0, description="Total de errores")
    
    class Config:
        json_schema_extra = {
            "example": {
                "created": [
                    {
                        "id": 1,
                        "user_id": 1,
                        "warehouse_id": 2,
                        "access_type": "FULL",
                        "granted_by_user_id": 3,
                        "granted_at": "2024-01-15T10:30:00Z",
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "has_full_access": True,
                        "has_read_access": True,
                        "is_denied": False,
                        "can_write": True,
                        "can_read": True
                    }
                ],
                "updated": [],
                "errors": [],
                "total_processed": 2,
                "total_created": 1,
                "total_updated": 1,
                "total_errors": 0
            }
        }


class UserWarehouseMatrix(BaseModel):
    """Schema for user-warehouse access matrix"""
    user_id: int = Field(..., description="ID del usuario")
    user_username: str = Field(..., description="Username del usuario")
    user_full_name: str = Field(..., description="Nombre completo del usuario")
    warehouse_accesses: Dict[str, Dict[str, Any]] = Field(
        ..., 
        description="Accesos por almacén (key: warehouse_code)"
    )
    total_warehouses: int = Field(..., ge=0, description="Total de almacenes con acceso")
    full_access_count: int = Field(..., ge=0, description="Almacenes con acceso completo")
    read_only_count: int = Field(..., ge=0, description="Almacenes con acceso de lectura")
    denied_count: int = Field(..., ge=0, description="Almacenes con acceso denegado")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "user_username": "john.doe",
                "user_full_name": "John Doe",
                "warehouse_accesses": {
                    "AC001": {
                        "warehouse_id": 2,
                        "warehouse_name": "Almacén Central",
                        "access_type": "FULL",
                        "granted_at": "2024-01-15T10:30:00Z"
                    },
                    "AN002": {
                        "warehouse_id": 3,
                        "warehouse_name": "Almacén Norte",
                        "access_type": "READ_ONLY",
                        "granted_at": "2024-01-16T14:20:00Z"
                    }
                },
                "total_warehouses": 2,
                "full_access_count": 1,
                "read_only_count": 1,
                "denied_count": 0
            }
        }


class WarehouseUserMatrix(BaseModel):
    """Schema for warehouse-user access matrix"""
    warehouse_id: int = Field(..., description="ID del almacén")
    warehouse_code: str = Field(..., description="Código del almacén")
    warehouse_name: str = Field(..., description="Nombre del almacén")
    user_accesses: Dict[str, Dict[str, Any]] = Field(
        ..., 
        description="Accesos por usuario (key: username)"
    )
    total_users: int = Field(..., ge=0, description="Total de usuarios con acceso")
    full_access_users: int = Field(..., ge=0, description="Usuarios con acceso completo")
    read_only_users: int = Field(..., ge=0, description="Usuarios con acceso de lectura")
    denied_users: int = Field(..., ge=0, description="Usuarios con acceso denegado")
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouse_id": 2,
                "warehouse_code": "AC001",
                "warehouse_name": "Almacén Central",
                "user_accesses": {
                    "john.doe": {
                        "user_id": 1,
                        "user_full_name": "John Doe",
                        "access_type": "FULL",
                        "granted_at": "2024-01-15T10:30:00Z"
                    },
                    "jane.smith": {
                        "user_id": 2,
                        "user_full_name": "Jane Smith",
                        "access_type": "READ_ONLY",
                        "granted_at": "2024-01-16T14:20:00Z"
                    }
                },
                "total_users": 2,
                "full_access_users": 1,
                "read_only_users": 1,
                "denied_users": 0
            }
        }


class WarehouseAccessCopyRequest(BaseModel):
    """Schema for copying warehouse access from one user to another"""
    source_user_id: int = Field(..., gt=0, description="ID del usuario origen")
    target_user_id: int = Field(..., gt=0, description="ID del usuario destino")
    warehouse_ids: Optional[List[int]] = Field(
        None, 
        description="IDs específicos de almacenes a copiar (opcional, si no se especifica se copian todos)"
    )
    access_types: Optional[List[AccessTypeEnum]] = Field(
        None,
        description="Tipos de acceso a copiar (FULL, READ_ONLY, DENIED)"
    )
    granted_by_user_id: int = Field(..., gt=0, description="ID del usuario que realiza la copia")
    overwrite_existing: bool = Field(
        False, 
        description="Si True, sobrescribe accesos existentes; si False, solo agrega nuevos"
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
                "warehouse_ids": [2, 3, 4],
                "access_types": ["FULL", "READ_ONLY"],
                "granted_by_user_id": 3,
                "overwrite_existing": False
            }
        }


class WarehouseAccessReport(BaseModel):
    """Schema for warehouse access report"""
    report_date: datetime = Field(..., description="Fecha del reporte")
    total_users: int = Field(..., ge=0, description="Total de usuarios en el sistema")
    users_with_warehouse_access: int = Field(..., ge=0, description="Usuarios con acceso a almacenes")
    users_without_access: int = Field(..., ge=0, description="Usuarios sin acceso a almacenes")
    total_warehouses: int = Field(..., ge=0, description="Total de almacenes")
    warehouses_with_users: int = Field(..., ge=0, description="Almacenes con usuarios asignados")
    access_summary: Dict[str, int] = Field(..., description="Resumen de accesos por tipo")
    top_accessed_warehouses: List[Dict[str, Any]] = Field(
        ..., 
        description="Almacenes más accedidos"
    )
    users_with_most_access: List[Dict[str, Any]] = Field(
        ..., 
        description="Usuarios con más accesos"
    )
    recent_changes: int = Field(..., ge=0, description="Cambios en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_date": "2024-01-15T10:30:00Z",
                "total_users": 50,
                "users_with_warehouse_access": 35,
                "users_without_access": 15,
                "total_warehouses": 8,
                "warehouses_with_users": 6,
                "access_summary": {
                    "FULL": 25,
                    "READ_ONLY": 40,
                    "DENIED": 10
                },
                "top_accessed_warehouses": [
                    {"warehouse_name": "Almacén Central", "warehouse_code": "AC001", "users_count": 20},
                    {"warehouse_name": "Almacén Norte", "warehouse_code": "AN002", "users_count": 15}
                ],
                "users_with_most_access": [
                    {"username": "admin", "full_name": "Administrator", "warehouses_count": 8},
                    {"username": "manager", "full_name": "Manager User", "warehouses_count": 6}
                ],
                "recent_changes": 12
            }
        }


# Constants for validation
MIN_USER_ID = 1
MAX_USER_ID = 9223372036854775807  # Max BIGINT
MIN_WAREHOUSE_ID = 1
MAX_WAREHOUSE_ID = 9223372036854775807  # Max BIGINT

# Query helpers
USER_WAREHOUSE_ACCESS_DEFAULT_PAGE_SIZE = 20
USER_WAREHOUSE_ACCESS_MAX_PAGE_SIZE = 100

# Access type constants
ACCESS_TYPES = ["FULL", "READ_ONLY", "DENIED"]

# Access hierarchy for comparison (higher number = more access)
ACCESS_HIERARCHY = {
    "DENIED": 0,
    "READ_ONLY": 1,
    "FULL": 2
}