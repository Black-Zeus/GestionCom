"""
Pydantic schemas for Warehouse model
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum


class WarehouseTypeEnum(str, Enum):
    """Warehouse type enum"""
    WAREHOUSE = "WAREHOUSE"
    STORE = "STORE"
    OUTLET = "OUTLET"


class WarehouseStatus(str, Enum):
    """Status enum for warehouse"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DELETED = "deleted"


class WarehouseBase(BaseModel):
    """Base schema for Warehouse"""
    warehouse_code: str = Field(..., min_length=2, max_length=20, description="Código único del almacén")
    warehouse_name: str = Field(..., min_length=3, max_length=150, description="Nombre del almacén")
    warehouse_type: WarehouseTypeEnum = Field(
        WarehouseTypeEnum.WAREHOUSE, 
        description="Tipo de almacén: WAREHOUSE, STORE, OUTLET"
    )
    responsible_user_id: int = Field(..., gt=0, description="ID del usuario responsable")
    address: Optional[str] = Field(None, max_length=500, description="Dirección física")
    city: Optional[str] = Field(None, min_length=2, max_length=100, description="Ciudad")
    country: Optional[str] = Field(None, min_length=2, max_length=100, description="País")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    email: Optional[str] = Field(None, max_length=255, description="Email de contacto")
    is_active: bool = Field(True, description="Si el almacén está activo")
    
    @field_validator('warehouse_code')
    @classmethod
    def validate_warehouse_code(cls, v):
        if not v:
            raise ValueError('warehouse_code es requerido')
        
        # Convert to uppercase and remove extra spaces
        v = v.strip().upper()
        
        # Basic format validation (alphanumeric and some special chars)
        import re
        if not re.match(r'^[A-Z0-9_-]+$', v):
            raise ValueError('warehouse_code debe contener solo letras, números, guiones y guiones bajos')
        
        if len(v) < 2:
            raise ValueError('warehouse_code debe tener al menos 2 caracteres')
        
        return v
    
    @field_validator('warehouse_name')
    @classmethod
    def validate_warehouse_name(cls, v):
        if not v or not v.strip():
            raise ValueError('warehouse_name es requerido')
        
        v = v.strip()
        
        if len(v) < 3:
            raise ValueError('warehouse_name debe tener al menos 3 caracteres')
        
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            v = v.strip()
            if v:
                # Remove common phone formatting characters for validation
                cleaned_phone = ''.join(c for c in v if c.isdigit() or c in '+()-. ')
                if len(cleaned_phone) < 7:
                    raise ValueError('Número de teléfono debe tener al menos 7 dígitos')
                return v
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is not None:
            v = v.strip().lower()
            if v:
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, v):
                    raise ValueError('Formato de email inválido')
                return v
        return v
    
    @field_validator('city', 'country')
    @classmethod
    def validate_location_fields(cls, v):
        if v is not None:
            v = v.strip()
            if v and len(v) < 2:
                raise ValueError('Debe tener al menos 2 caracteres')
            return v if v else None
        return v


class WarehouseCreate(WarehouseBase):
    """Schema for creating a new warehouse"""
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouse_code": "AC001",
                "warehouse_name": "Almacén Central",
                "warehouse_type": "WAREHOUSE",
                "responsible_user_id": 1,
                "address": "Av. Principal 123, Santiago Centro",
                "city": "Santiago",
                "country": "Chile",
                "phone": "+56 2 2345 6789",
                "email": "almacen.central@empresa.com",
                "is_active": True
            }
        }


class WarehouseUpdate(BaseModel):
    """Schema for updating warehouse"""
    warehouse_name: Optional[str] = Field(None, min_length=3, max_length=150, description="Nombre del almacén")
    warehouse_type: Optional[WarehouseTypeEnum] = Field(None, description="Tipo de almacén")
    responsible_user_id: Optional[int] = Field(None, gt=0, description="ID del usuario responsable")
    address: Optional[str] = Field(None, max_length=500, description="Dirección física")
    city: Optional[str] = Field(None, min_length=2, max_length=100, description="Ciudad")
    country: Optional[str] = Field(None, min_length=2, max_length=100, description="País")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    email: Optional[str] = Field(None, max_length=255, description="Email de contacto")
    is_active: Optional[bool] = Field(None, description="Si el almacén está activo")
    
    @field_validator('warehouse_name')
    @classmethod
    def validate_warehouse_name(cls, v):
        if v is not None:
            v = v.strip()
            if v and len(v) < 3:
                raise ValueError('warehouse_name debe tener al menos 3 caracteres')
            return v if v else None
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None:
            v = v.strip()
            if v:
                cleaned_phone = ''.join(c for c in v if c.isdigit() or c in '+()-. ')
                if len(cleaned_phone) < 7:
                    raise ValueError('Número de teléfono debe tener al menos 7 dígitos')
                return v
        return v
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        if v is not None:
            v = v.strip().lower()
            if v:
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, v):
                    raise ValueError('Formato de email inválido')
                return v
        return v
    
    @field_validator('city', 'country')
    @classmethod
    def validate_location_fields(cls, v):
        if v is not None:
            v = v.strip()
            if v and len(v) < 2:
                raise ValueError('Debe tener al menos 2 caracteres')
            return v if v else None
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouse_name": "Almacén Central Actualizado",
                "phone": "+56 2 2345 6790",
                "email": "nuevo.email@empresa.com",
                "is_active": True
            }
        }


class WarehouseResponse(WarehouseBase):
    """Schema for warehouse response"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="ID único del almacén")
    created_at: datetime = Field(..., description="Fecha de creación")
    updated_at: datetime = Field(..., description="Fecha de última actualización")
    deleted_at: Optional[datetime] = Field(None, description="Fecha de eliminación (soft delete)")
    full_location: str = Field(..., description="Ubicación completa formateada")
    is_store: bool = Field(..., description="Si es una tienda")
    is_outlet: bool = Field(..., description="Si es un outlet")
    is_warehouse: bool = Field(..., description="Si es un almacén regular")
    has_contact_info: bool = Field(..., description="Si tiene información de contacto")
    type_display: str = Field(..., description="Nombre legible del tipo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "warehouse_code": "AC001",
                "warehouse_name": "Almacén Central",
                "warehouse_type": "WAREHOUSE",
                "responsible_user_id": 1,
                "address": "Av. Principal 123, Santiago Centro",
                "city": "Santiago",
                "country": "Chile",
                "phone": "+56 2 2345 6789",
                "email": "almacen.central@empresa.com",
                "is_active": True,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "deleted_at": None,
                "full_location": "Santiago, Chile",
                "is_store": False,
                "is_outlet": False,
                "is_warehouse": True,
                "has_contact_info": True,
                "type_display": "Almacén"
            }
        }


class WarehouseDetailResponse(WarehouseResponse):
    """Schema for detailed warehouse response with related data"""
    responsible_username: Optional[str] = Field(None, description="Username del responsable")
    responsible_full_name: Optional[str] = Field(None, description="Nombre completo del responsable")
    responsible_email: Optional[str] = Field(None, description="Email del responsable")
    user_access_count: Optional[int] = Field(None, ge=0, description="Cantidad de usuarios con acceso")
    last_access_granted: Optional[datetime] = Field(None, description="Último acceso otorgado")
    access_summary: Optional[Dict[str, int]] = Field(None, description="Resumen de accesos por tipo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "warehouse_code": "AC001",
                "warehouse_name": "Almacén Central",
                "warehouse_type": "WAREHOUSE",
                "responsible_user_id": 1,
                "address": "Av. Principal 123, Santiago Centro",
                "city": "Santiago",
                "country": "Chile",
                "phone": "+56 2 2345 6789",
                "email": "almacen.central@empresa.com",
                "is_active": True,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
                "deleted_at": None,
                "full_location": "Santiago, Chile",
                "is_store": False,
                "is_outlet": False,
                "is_warehouse": True,
                "has_contact_info": True,
                "type_display": "Almacén",
                "responsible_username": "admin",
                "responsible_full_name": "Administrator",
                "responsible_email": "admin@empresa.com",
                "user_access_count": 15,
                "last_access_granted": "2024-01-14T16:20:00Z",
                "access_summary": {
                    "FULL": 5,
                    "READ_ONLY": 8,
                    "DENIED": 2
                }
            }
        }


class WarehouseSummary(BaseModel):
    """Schema for warehouse summary"""
    id: int = Field(..., description="ID del almacén")
    warehouse_code: str = Field(..., description="Código del almacén")
    warehouse_name: str = Field(..., description="Nombre del almacén")
    warehouse_type: WarehouseTypeEnum = Field(..., description="Tipo de almacén")
    type_display: str = Field(..., description="Tipo legible")
    city: Optional[str] = Field(None, description="Ciudad")
    country: Optional[str] = Field(None, description="País")
    responsible_username: Optional[str] = Field(None, description="Usuario responsable")
    is_active: bool = Field(..., description="Si está activo")
    status: WarehouseStatus = Field(..., description="Estado del almacén")
    
    model_config = ConfigDict(from_attributes=True)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "warehouse_code": "AC001",
                "warehouse_name": "Almacén Central",
                "warehouse_type": "WAREHOUSE",
                "type_display": "Almacén",
                "city": "Santiago",
                "country": "Chile",
                "responsible_username": "admin",
                "is_active": True,
                "status": "active"
            }
        }


class WarehouseFilters(BaseModel):
    """Schema for filtering warehouses"""
    warehouse_code: Optional[str] = Field(None, min_length=1, max_length=20, description="Filtrar por código")
    warehouse_name: Optional[str] = Field(None, min_length=1, max_length=150, description="Filtrar por nombre")
    warehouse_type: Optional[WarehouseTypeEnum] = Field(None, description="Filtrar por tipo")
    responsible_user_id: Optional[int] = Field(None, gt=0, description="Filtrar por usuario responsable")
    city: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por ciudad")
    country: Optional[str] = Field(None, min_length=1, max_length=100, description="Filtrar por país")
    is_active: Optional[bool] = Field(None, description="Filtrar por estado activo")
    has_contact_info: Optional[bool] = Field(None, description="Filtrar por información de contacto")
    responsible_username: Optional[str] = Field(None, min_length=1, max_length=50, description="Filtrar por username responsable")
    search: Optional[str] = Field(None, min_length=1, max_length=100, description="Búsqueda general")
    created_after: Optional[datetime] = Field(None, description="Creados después de esta fecha")
    created_before: Optional[datetime] = Field(None, description="Creados antes de esta fecha")
    
    @field_validator('created_after', 'created_before')
    @classmethod
    def validate_dates(cls, v):
        if v and v > datetime.now():
            raise ValueError('La fecha no puede ser futura para filtros de búsqueda')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouse_type": "WAREHOUSE",
                "city": "Santiago",
                "is_active": True,
                "has_contact_info": True,
                "search": "central"
            }
        }


class WarehouseListResponse(BaseModel):
    """Schema for paginated warehouse list response"""
    items: List[WarehouseDetailResponse] = Field(..., description="Lista de almacenes")
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
                        "warehouse_code": "AC001",
                        "warehouse_name": "Almacén Central",
                        "warehouse_type": "WAREHOUSE",
                        "responsible_user_id": 1,
                        "address": "Av. Principal 123, Santiago Centro",
                        "city": "Santiago",
                        "country": "Chile",
                        "phone": "+56 2 2345 6789",
                        "email": "almacen.central@empresa.com",
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "deleted_at": None,
                        "full_location": "Santiago, Chile",
                        "is_store": False,
                        "is_outlet": False,
                        "is_warehouse": True,
                        "has_contact_info": True,
                        "type_display": "Almacén",
                        "responsible_username": "admin",
                        "responsible_full_name": "Administrator",
                        "responsible_email": "admin@empresa.com",
                        "user_access_count": 15,
                        "last_access_granted": "2024-01-14T16:20:00Z",
                        "access_summary": {
                            "FULL": 5,
                            "READ_ONLY": 8,
                            "DENIED": 2
                        }
                    }
                ],
                "total": 1,
                "page": 1,
                "size": 10,
                "pages": 1
            }
        }


class WarehouseStatsResponse(BaseModel):
    """Schema for warehouse statistics"""
    total_warehouses: int = Field(..., ge=0, description="Total de almacenes")
    active_warehouses: int = Field(..., ge=0, description="Almacenes activos")
    inactive_warehouses: int = Field(..., ge=0, description="Almacenes inactivos")
    warehouses_by_type: Dict[str, int] = Field(..., description="Distribución por tipo")
    warehouses_by_country: Dict[str, int] = Field(..., description="Distribución por país")
    warehouses_with_contact: int = Field(..., ge=0, description="Almacenes con información de contacto")
    warehouses_without_contact: int = Field(..., ge=0, description="Almacenes sin información de contacto")
    average_users_per_warehouse: float = Field(..., ge=0, description="Promedio de usuarios por almacén")
    warehouses_without_responsible: int = Field(..., ge=0, description="Almacenes sin responsable")
    most_accessed_warehouses: List[Dict[str, Any]] = Field(..., description="Almacenes más accedidos")
    recent_warehouses: int = Field(..., ge=0, description="Almacenes creados en los últimos 30 días")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_warehouses": 25,
                "active_warehouses": 22,
                "inactive_warehouses": 3,
                "warehouses_by_type": {
                    "WAREHOUSE": 15,
                    "STORE": 8,
                    "OUTLET": 2
                },
                "warehouses_by_country": {
                    "Chile": 20,
                    "Perú": 3,
                    "Colombia": 2
                },
                "warehouses_with_contact": 20,
                "warehouses_without_contact": 5,
                "average_users_per_warehouse": 8.5,
                "warehouses_without_responsible": 0,
                "most_accessed_warehouses": [
                    {"warehouse_name": "Almacén Central", "warehouse_code": "AC001", "users_count": 25},
                    {"warehouse_name": "Tienda Norte", "warehouse_code": "TN002", "users_count": 18}
                ],
                "recent_warehouses": 3
            }
        }


class BulkWarehouseCreate(BaseModel):
    """Schema for bulk creation of warehouses"""
    warehouses: List[WarehouseCreate] = Field(
        ..., 
        min_length=1, 
        max_length=50,
        description="Lista de almacenes a crear"
    )
    
    @field_validator('warehouses')
    @classmethod
    def validate_unique_codes(cls, v):
        # Check for duplicate warehouse codes
        codes = [warehouse.warehouse_code.upper() for warehouse in v]
        if len(codes) != len(set(codes)):
            raise ValueError('Los códigos de almacén deben ser únicos')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouses": [
                    {
                        "warehouse_code": "AC001",
                        "warehouse_name": "Almacén Central",
                        "warehouse_type": "WAREHOUSE",
                        "responsible_user_id": 1,
                        "city": "Santiago",
                        "country": "Chile"
                    },
                    {
                        "warehouse_code": "TN002",
                        "warehouse_name": "Tienda Norte",
                        "warehouse_type": "STORE",
                        "responsible_user_id": 2,
                        "city": "Antofagasta", 
                        "country": "Chile"
                    }
                ]
            }
        }


class BulkWarehouseResponse(BaseModel):
    """Schema for bulk operation response"""
    created: List[WarehouseResponse] = Field(..., description="Almacenes creados exitosamente")
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
                        "warehouse_code": "AC001",
                        "warehouse_name": "Almacén Central",
                        "warehouse_type": "WAREHOUSE",
                        "responsible_user_id": 1,
                        "address": None,
                        "city": "Santiago",
                        "country": "Chile",
                        "phone": None,
                        "email": None,
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z",
                        "deleted_at": None,
                        "full_location": "Santiago, Chile",
                        "is_store": False,
                        "is_outlet": False,
                        "is_warehouse": True,
                        "has_contact_info": False,
                        "type_display": "Almacén"
                    }
                ],
                "errors": [],
                "total_processed": 2,
                "total_created": 2,
                "total_errors": 0
            }
        }


class WarehouseStatusUpdate(BaseModel):
    """Schema for bulk status update"""
    warehouse_ids: List[int] = Field(..., min_length=1, description="IDs de almacenes a actualizar")
    is_active: bool = Field(..., description="Nuevo estado activo")
    
    class Config:
        json_schema_extra = {
            "example": {
                "warehouse_ids": [1, 2, 3],
                "is_active": False
            }
        }


class WarehouseValidationResponse(BaseModel):
    """Schema for warehouse validation response"""
    is_valid: bool = Field(..., description="Si el almacén es válido")
    can_be_deleted: bool = Field(..., description="Si puede ser eliminado")
    validation_message: str = Field(..., description="Mensaje de validación")
    warnings: List[str] = Field(..., description="Advertencias")
    blocking_issues: List[str] = Field(..., description="Problemas que impiden la operación")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": True,
                "can_be_deleted": False,
                "validation_message": "El almacén es válido pero no puede ser eliminado",
                "warnings": ["No tiene información de contacto"],
                "blocking_issues": ["15 usuarios tienen acceso a este almacén"]
            }
        }


class WarehouseLocationSummary(BaseModel):
    """Schema for warehouse location summary"""
    country: str = Field(..., description="País")
    cities: List[Dict[str, Any]] = Field(..., description="Ciudades en el país")
    total_warehouses: int = Field(..., ge=0, description="Total de almacenes en el país")
    active_warehouses: int = Field(..., ge=0, description="Almacenes activos en el país")
    
    class Config:
        json_schema_extra = {
            "example": {
                "country": "Chile",
                "cities": [
                    {"city": "Santiago", "warehouses_count": 15, "active_count": 14},
                    {"city": "Valparaíso", "warehouses_count": 3, "active_count": 3},
                    {"city": "Antofagasta", "warehouses_count": 2, "active_count": 2}
                ],
                "total_warehouses": 20,
                "active_warehouses": 19
            }
        }


# Constants for validation
MIN_WAREHOUSE_CODE_LENGTH = 2
MAX_WAREHOUSE_CODE_LENGTH = 20
MIN_WAREHOUSE_NAME_LENGTH = 3
MAX_WAREHOUSE_NAME_LENGTH = 150

# Query helpers
WAREHOUSE_DEFAULT_PAGE_SIZE = 20
WAREHOUSE_MAX_PAGE_SIZE = 100

# Warehouse type display names
WAREHOUSE_TYPE_DISPLAY = {
    "WAREHOUSE": "Almacén",
    "STORE": "Tienda", 
    "OUTLET": "Outlet"
}

# Status mapping
WAREHOUSE_STATUS_MAP = {
    True: "active",
    False: "inactive"
}