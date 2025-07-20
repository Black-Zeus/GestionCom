"""
volumes/backend-api/database/models/warehouse_zones.py
Modelo SQLAlchemy para la tabla warehouse_zones
"""
from sqlalchemy import Column, String, Boolean, Text, BigInteger, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property

from .base import BaseModel, CommonValidators


class WarehouseZone(BaseModel):
    """Modelo para zonas dentro de las bodegas"""
    
    __tablename__ = "warehouse_zones"
    
    # CAMPOS DE RELACIÓN
    
    warehouse_id = Column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        comment="Bodega a la que pertenece la zona"
    )
    
    # CAMPOS PRINCIPALES
    
    zone_code = Column(
        String(20),
        nullable=False,
        comment="Código único de la zona dentro de la bodega"
    )
    
    zone_name = Column(
        String(100),
        nullable=False,
        comment="Nombre descriptivo de la zona"
    )
    
    zone_description = Column(
        Text,
        nullable=True,
        comment="Descripción detallada de la zona"
    )
    
    # CAMPOS DE CONTROL
    
    is_location_tracking_enabled = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Si está habilitado el seguimiento de ubicación en esta zona"
    )
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si la zona está activa"
    )
    
    # ÍNDICES Y RESTRICCIONES
    
    __table_args__ = (
        UniqueConstraint('warehouse_id', 'zone_code', name='uk_warehouse_zone'),
        Index('idx_warehouse_id', 'warehouse_id'),
        Index('idx_zone_code', 'zone_code'),
        Index('idx_is_active', 'is_active'),
        Index('idx_deleted_at', 'deleted_at'),
        Index('idx_warehouse_zone_active', 'warehouse_id', 'zone_code', 'is_active'),
        Index('idx_location_tracking', 'is_location_tracking_enabled'),
    )
    
    # VALIDADORES
    
    @validates('warehouse_id')
    def validate_warehouse_id(self, key, warehouse_id):
        """Validar warehouse_id"""
        if not warehouse_id:
            raise ValueError("Warehouse ID es requerido")
        
        if warehouse_id <= 0:
            raise ValueError("Warehouse ID debe ser mayor a 0")
        
        return warehouse_id
    
    @validates('zone_code')
    def validate_zone_code(self, key, zone_code):
        """Validar formato del código de zona"""
        if not zone_code:
            raise ValueError("Código de zona es requerido")
        
        zone_code = zone_code.strip().upper()
        
        # Solo letras, números, guiones y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_-]+$', zone_code):
            raise ValueError("Código solo puede contener letras, números, guiones y guiones bajos")
        
        if len(zone_code) < 1:
            raise ValueError("Código debe tener al menos 1 caracter")
        
        if len(zone_code) > 20:
            raise ValueError("Código no puede tener más de 20 caracteres")
        
        return zone_code
    
    @validates('zone_name')
    def validate_zone_name(self, key, zone_name):
        """Validar nombre de la zona"""
        return CommonValidators.validate_string_length(
            zone_name, 
            min_length=2, 
            max_length=100, 
            field_name="Nombre de zona"
        )
    
    @validates('zone_description')
    def validate_zone_description(self, key, zone_description):
        """Validar descripción de la zona"""
        if not zone_description:
            return None
        
        zone_description = zone_description.strip()
        
        if len(zone_description) > 2000:
            raise ValueError("Descripción no puede tener más de 2000 caracteres")
        
        return zone_description
    
    # PROPIEDADES
    
    @property
    def display_name(self) -> str:
        """Nombre para mostrar en UI"""
        return f"{self.zone_name} ({self.zone_code})"
    
    @property
    def full_location(self) -> str:
        """Ubicación completa incluyendo bodega"""
        # Esto requiere que tengas la relación con warehouse cargada
        # return f"{self.warehouse.warehouse_name} - {self.zone_name}"
        return f"Zona {self.zone_code}: {self.zone_name}"
    
    @hybrid_property
    def has_location_tracking(self) -> bool:
        """Verificar si tiene seguimiento de ubicación habilitado"""
        return self.is_location_tracking_enabled
    
    @has_location_tracking.expression
    def has_location_tracking(cls):
        """Expresión SQL para has_location_tracking"""
        return cls.is_location_tracking_enabled == True
    
    @property
    def zone_status(self) -> str:
        """Estado de la zona"""
        if not self.is_active:
            return "Inactiva"
        elif self.is_location_tracking_enabled:
            return "Activa con seguimiento"
        else:
            return "Activa"
    
    @property
    def zone_info(self) -> str:
        """Información resumida de la zona"""
        status = "🟢" if self.is_active else "🔴"
        tracking = "📍" if self.is_location_tracking_enabled else ""
        return f"{status} {self.display_name} {tracking}".strip()
    
    @property
    def short_description(self) -> str:
        """Descripción corta para mostrar en listas"""
        if not self.zone_description:
            return "Sin descripción"
        
        if len(self.zone_description) <= 50:
            return self.zone_description
        
        return f"{self.zone_description[:47]}..."
    
    def __repr__(self) -> str:
        """Representación string del objeto"""
        return f"<WarehouseZone(warehouse_id={self.warehouse_id}, zone_code='{self.zone_code}', name='{self.zone_name}')>"