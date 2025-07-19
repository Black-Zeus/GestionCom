"""
volumes/backend-api/database/schemas/warehouse_zones.py
Schemas Pydantic para WarehouseZones - Compatible con Pydantic v2
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime


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
    
    @field_validator('zone_code')
    @classmethod
    def validate_zone_code(cls, v):
        if not v:
            raise ValueError("Código de zona es requerido")
        
        # Solo letras, números, guiones y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_-]+$', v.upper()):
            raise ValueError("Código solo puede contener letras, números, guiones y guiones bajos")
        
        return v.upper()
    
    @field_validator('zone_name')
    @classmethod
    def validate_zone_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Nombre de zona debe tener al menos 2 caracteres")
        return v.strip()


class WarehouseZoneCreate(WarehouseZoneBase):
    """Schema para crear WarehouseZone"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zone_code": "A1",
                "zone_name": "Zona A - Nivel 1",
                "zone_description": "Zona de almacenamiento principal en el primer nivel",
                "is_location_tracking_enabled": True,
                "is_active": True
            }
        }
    )


class WarehouseZoneUpdate(BaseModel):
    """Schema para actualizar WarehouseZone"""
    zone_name: Optional[str] = Field(None, min_length=2, max_length=100)
    zone_description: Optional[str] = Field(None, max_length=2000)
    is_location_tracking_enabled: Optional[bool] = None
    is_active: Optional[bool] = None
    
    @field_validator('zone_name')
    @classmethod
    def validate_zone_name(cls, v):
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Nombre de zona debe tener al menos 2 caracteres")
        return v.strip() if v else v
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zone_name": "Zona A - Nivel 1 Actualizada",
                "zone_description": "Descripción actualizada de la zona",
                "is_location_tracking_enabled": False,
                "is_active": True
            }
        }
    )


class WarehouseZoneResponse(WarehouseZoneBase):
    """Schema de respuesta para WarehouseZone"""
    id: int
    warehouse_id: int
    display_name: str
    zone_status: str
    zone_info: str
    has_location_tracking: bool
    short_description: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "warehouse_id": 2,
                "zone_code": "A1",
                "zone_name": "Zona A - Nivel 1",
                "zone_description": "Zona de almacenamiento principal",
                "is_location_tracking_enabled": True,
                "is_active": True,
                "display_name": "Zona A - Nivel 1 (A1)",
                "zone_status": "Activa con seguimiento",
                "zone_info": "🟢 Zona A - Nivel 1 (A1) 📍",
                "has_location_tracking": True,
                "short_description": "Zona de almacenamiento principal",
                "created_at": "2024-01-15T10:30:00",
                "updated_at": "2024-01-15T10:30:00"
            }
        }
    )


class WarehouseZoneDetailResponse(WarehouseZoneResponse):
    """Schema de respuesta detallada con información de la bodega"""
    warehouse_name: Optional[str] = Field(None, description="Nombre de la bodega")
    warehouse_code: Optional[str] = Field(None, description="Código de la bodega")
    warehouse_is_active: Optional[bool] = Field(None, description="Si la bodega está activa")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 1,
                "warehouse_id": 2,
                "zone_code": "A1",
                "zone_name": "Zona A - Nivel 1",
                "zone_description": "Zona de almacenamiento principal",
                "is_location_tracking_enabled": True,
                "is_active": True,
                "display_name": "Zona A - Nivel 1 (A1)",
                "zone_status": "Activa con seguimiento",
                "zone_info": "🟢 Zona A - Nivel 1 (A1) 📍",
                "has_location_tracking": True,
                "short_description": "Zona de almacenamiento principal",
                "warehouse_name": "Almacén Central",
                "warehouse_code": "AC001",
                "warehouse_is_active": True,
                "created_at": "2024-01-15T10:30:00",
                "updated_at": "2024-01-15T10:30:00"
            }
        }
    )


# ==========================================
# SCHEMAS DE LISTA Y FILTROS
# ==========================================

class WarehouseZoneListResponse(BaseModel):
    """Schema para lista de zonas con información de bodega"""
    warehouse_id: int
    warehouse_name: str
    warehouse_code: str
    zones: List[WarehouseZoneResponse]
    total_zones: int
    active_zones: int
    zones_with_tracking: int
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "warehouse_id": 2,
                "warehouse_name": "Almacén Central",
                "warehouse_code": "AC001",
                "zones": [
                    {
                        "id": 1,
                        "warehouse_id": 2,
                        "zone_code": "A1",
                        "zone_name": "Zona A - Nivel 1",
                        "zone_description": "Zona principal",
                        "is_location_tracking_enabled": True,
                        "is_active": True,
                        "display_name": "Zona A - Nivel 1 (A1)",
                        "zone_status": "Activa con seguimiento",
                        "zone_info": "🟢 Zona A - Nivel 1 (A1) 📍",
                        "has_location_tracking": True,
                        "short_description": "Zona principal",
                        "created_at": "2024-01-15T10:30:00",
                        "updated_at": "2024-01-15T10:30:00"
                    }
                ],
                "total_zones": 1,
                "active_zones": 1,
                "zones_with_tracking": 1
            }
        }
    )


class WarehouseZoneFilters(BaseModel):
    """Schema para filtros de zonas"""
    is_active: Optional[bool] = Field(None, description="Filtrar por zonas activas")
    has_location_tracking: Optional[bool] = Field(None, description="Filtrar por seguimiento habilitado")
    zone_name_contains: Optional[str] = Field(None, min_length=1, max_length=50, description="Buscar en nombre de zona")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_active": True,
                "has_location_tracking": True,
                "zone_name_contains": "Nivel 1"
            }
        }
    )


# ==========================================
# SCHEMAS PARA OPERACIONES BULK
# ==========================================

class BulkZoneStatusUpdate(BaseModel):
    """Schema para actualización masiva de estado de zonas"""
    zone_ids: List[int] = Field(..., min_length=1, max_length=50, description="IDs de zonas a actualizar")
    is_active: bool = Field(..., description="Nuevo estado activo")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zone_ids": [1, 2, 3],
                "is_active": False
            }
        }
    )


class BulkZoneTrackingUpdate(BaseModel):
    """Schema para actualización masiva de seguimiento de zonas"""
    zone_ids: List[int] = Field(..., min_length=1, max_length=50, description="IDs de zonas a actualizar")
    is_location_tracking_enabled: bool = Field(..., description="Habilitar/deshabilitar seguimiento")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "zone_ids": [1, 2, 3],
                "is_location_tracking_enabled": True
            }
        }
    )


# ==========================================
# CONSTANTES Y VALIDACIONES
# ==========================================

# Patrones de validación
ZONE_CODE_PATTERN = r'^[A-Z0-9_-]+$'
ZONE_NAME_MIN_LENGTH = 2
ZONE_NAME_MAX_LENGTH = 100
ZONE_DESCRIPTION_MAX_LENGTH = 2000

# Límites
MAX_ZONES_PER_WAREHOUSE = 100
MAX_BULK_OPERATIONS = 50