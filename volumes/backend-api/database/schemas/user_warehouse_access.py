"""
volumes/backend-api/database/schemas/user_warehouse_access.py
Pydantic schemas for UserWarehouseAccess model - FIXED VERSION
Solo usa model_config, compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class AccessTypeEnum(str, Enum):
    """Access type enum for warehouse access"""
    FULL = "FULL"
    READ_ONLY = "READ_ONLY"  # ✅ Corregido: era "read_ONLY"
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
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "warehouse_id": 2,
                "access_type": "FULL",
                "granted_by_user_id": 3
            }
        }
    )


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
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_type": "READ_ONLY",
                "granted_by_user_id": 3
            }
        }
    )


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
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
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
    )


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
    
    model_config = ConfigDict(
        json_schema_extra={
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
    )


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
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
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
    )


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
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": 1,
                "access_type": "FULL",
                "user_is_active": True,
                "warehouse_is_active": True,
                "include_denied": False,
                "location": "Santiago"
            }
        }
    )


class UserWarehouseAccessListResponse(BaseModel):
    """Schema for paginated user warehouse access list response"""
    items: List[UserWarehouseAccessDetailResponse] = Field(..., description="Lista de accesos a almacenes")
    total: int = Field(..., ge=0, description="Total de registros")
    page: int = Field(..., ge=1, description="Página actual")
    size: int = Field(..., ge=1, le=100, description="Tamaño de página")
    pages: int = Field(..., ge=0, description="Total de páginas")
    
    model_config = ConfigDict(
        json_schema_extra={
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
    )


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
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "accesses": [
                    {"user_id": 1, "warehouse_id": 2, "access_type": "FULL", "granted_by_user_id": 3},
                    {"user_id": 2, "warehouse_id": 3, "access_type": "READ_ONLY", "granted_by_user_id": 3}
                ]
            }
        }
    )


class BulkWarehouseAccessResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[UserWarehouseAccessResponse] = Field(..., description="Accesos creados exitosamente")
    updated: List[UserWarehouseAccessResponse] = Field(..., description="Accesos actualizados")
    errors: List[Dict[str, Any]] = Field(..., description="Errores durante la operación")
    total_processed: int = Field(..., ge=0, description="Total de registros procesados")
    total_created: int = Field(..., ge=0, description="Total de registros creados")
    total_updated: int = Field(..., ge=0, description="Total de registros actualizados")
    total_errors: int = Field(..., ge=0, description="Total de errores")
    
    model_config = ConfigDict(
        json_schema_extra={
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
    )


# ==========================================
# CONSTANTES Y VALIDACIONES
# ==========================================

# Valores válidos para access_type
ACCESS_TYPES = ["FULL", "READ_ONLY", "DENIED"]

# Límites de paginación
USER_WAREHOUSE_ACCESS_DEFAULT_PAGE_SIZE = 20
USER_WAREHOUSE_ACCESS_MAX_PAGE_SIZE = 100

# Jerarquía de accesos (mayor número = más acceso)
ACCESS_HIERARCHY = {
    "DENIED": 0,
    "READ_ONLY": 1,
    "FULL": 2
}