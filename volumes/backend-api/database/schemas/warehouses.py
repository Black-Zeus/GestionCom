"""
volumes/backend-api/database/schemas/warehouses.py
Schemas Pydantic para Warehouses - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ==========================================
# ENUMS
# ==========================================

class WarehouseTypeEnum(str, Enum):
    """Tipos de bodega"""
    WAREHOUSE = "WAREHOUSE"
    STORE = "STORE"
    OUTLET = "OUTLET"


class AccessTypeEnum(str, Enum):
    """Tipos de acceso a bodega"""
    FULL = "FULL"
    READ_ONLY = "READ_ONLY"
    DENIED = "DENIED"


# ==========================================
# WAREHOUSE SCHEMAS
# ==========================================

class WarehouseBase(BaseModel):
    """Schema base para Warehouse"""
    warehouse_code: str = Field(..., min_length=2, max_length=20, description="Código único de la bodega")
    warehouse_name: str = Field(..., min_length=3, max_length=150, description="Nombre descriptivo de la bodega")
    warehouse_type: WarehouseTypeEnum = Field(default=WarehouseTypeEnum.WAREHOUSE, description="Tipo de bodega")
    responsible_user_id: int = Field(..., gt=0, description="Usuario responsable de la bodega")
    address: Optional[str] = Field(None, max_length=1000, description="Dirección física")
    city: Optional[str] = Field(None, max_length=100, description="Ciudad")
    country: Optional[str] = Field(None, max_length=100, description="País")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono de contacto")
    email: Optional[str] = Field(None, max_length=255, description="Email de contacto")
    is_active: bool = Field(default=True, description="Si la bodega está activa")


class WarehouseCreate(WarehouseBase):
    """Schema para crear Warehouse"""
    pass


class WarehouseUpdate(BaseModel):
    """Schema para actualizar Warehouse"""
    warehouse_name: Optional[str] = Field(None, min_length=3, max_length=150)
    warehouse_type: Optional[WarehouseTypeEnum] = None
    responsible_user_id: Optional[int] = Field(None, gt=0)
    address: Optional[str] = Field(None, max_length=1000)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    """Schema de respuesta para Warehouse"""
    id: int
    display_name: str
    type_label: str
    location_summary: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class WarehouseListResponse(BaseModel):
    """Schema para lista de warehouses"""
    warehouses: List[WarehouseResponse]
    pagination: dict
    filters_applied: dict


# ==========================================
# WAREHOUSE ZONE SCHEMAS
# ==========================================

class WarehouseZoneBase(BaseModel):
    """Schema base para WarehouseZone"""
    zone_code: str = Field(..., min_length=1, max_length=20, description="Código único de la zona")
    zone_name: str = Field(..., min_length=2, max_length=100, description="Nombre de la zona")
    zone_description: Optional[str] = Field(None, max_length=2000, description="Descripción de la zona")
    is_location_tracking_enabled: bool = Field(default=False, description="Seguimiento de ubicación habilitado")
    is_active: bool = Field(default=True, description="Si la zona está activa")


class WarehouseZoneCreate(WarehouseZoneBase):
    """Schema para crear WarehouseZone"""
    pass


class WarehouseZoneUpdate(BaseModel):
    """Schema para actualizar WarehouseZone"""
    zone_name: Optional[str] = Field(None, min_length=2, max_length=100)
    zone_description: Optional[str] = Field(None, max_length=2000)
    is_location_tracking_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class WarehouseZoneResponse(WarehouseZoneBase):
    """Schema de respuesta para WarehouseZone"""
    id: int
    warehouse_id: int
    display_name: str
    zone_status: str
    zone_info: str
    has_location_tracking: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# USER WAREHOUSE ACCESS SCHEMAS
# ==========================================

class UserWarehouseAccessBase(BaseModel):
    """Schema base para UserWarehouseAccess"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    warehouse_id: int = Field(..., gt=0, description="ID de la bodega")
    access_type: AccessTypeEnum = Field(default=AccessTypeEnum.READ_ONLY, description="Tipo de acceso")


class UserWarehouseAccessCreate(UserWarehouseAccessBase):
    """Schema para crear UserWarehouseAccess"""
    pass


class UserWarehouseAccessUpdate(BaseModel):
    """Schema para actualizar UserWarehouseAccess"""
    access_type: AccessTypeEnum = Field(..., description="Nuevo tipo de acceso")


class UserWarehouseAccessResponse(UserWarehouseAccessBase):
    """Schema de respuesta para UserWarehouseAccess"""
    id: int
    granted_by_user_id: int
    granted_at: datetime
    access_level_label: str
    can_read: bool
    can_write: bool
    has_full_access: bool
    is_denied: bool
    
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# SCHEMAS ADICIONALES
# ==========================================

class WarehouseWithZones(WarehouseResponse):
    """Schema de Warehouse con sus zonas incluidas"""
    zones: List[WarehouseZoneResponse] = Field(default_factory=list)


class UserAccessSummary(BaseModel):
    """Schema para resumen de accesos de usuario"""
    user: dict
    warehouse_accesses: List[UserWarehouseAccessResponse]
    total_accesses: int


class WarehouseAccessGrant(BaseModel):
    """Schema para otorgar acceso a bodega"""
    user_id: int = Field(..., gt=0, description="ID del usuario")
    warehouse_id: int = Field(..., gt=0, description="ID de la bodega")
    access_type: AccessTypeEnum = Field(..., description="Tipo de acceso a otorgar")
    reason: Optional[str] = Field(None, max_length=500, description="Razón del otorgamiento")


# ==========================================
# SCHEMAS DE RESPUESTA PAGINADA
# ==========================================

class PaginationInfo(BaseModel):
    """Información de paginación"""
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1, le=100)
    total: int = Field(..., ge=0)
    pages: int = Field(..., ge=0)


class WarehouseListWithPagination(BaseModel):
    """Lista de warehouses con paginación"""
    warehouses: List[WarehouseResponse]
    pagination: PaginationInfo
    filters_applied: dict
    
    model_config = ConfigDict(from_attributes=True)


class WarehouseZoneListWithPagination(BaseModel):
    """Lista de zones con paginación"""
    warehouse: dict
    zones: List[WarehouseZoneResponse] 
    total_zones: int
    
    model_config = ConfigDict(from_attributes=True)