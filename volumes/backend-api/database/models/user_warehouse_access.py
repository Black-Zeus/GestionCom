"""
volumes/backend-api/database/models/user_warehouse_access.py
Modelo SQLAlchemy para la tabla user_warehouse_access
"""
from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, ForeignKey, TIMESTAMP, Enum, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship
import enum

from .base import BaseModel


class AccessType(enum.Enum):
    """Tipos de acceso a bodega"""
    FULL = "FULL"
    READ_ONLY = "READ_ONLY"
    DENIED = "DENIED"


class UserWarehouseAccess(BaseModel):
    """Modelo para control de acceso de usuarios a bodegas"""
    
    __tablename__ = "user_warehouse_access"
    
    # CAMPOS DE RELACIÓN
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Usuario al que se otorga el acceso"
    )
    
    warehouse_id = Column(
        BigInteger,
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        comment="Bodega a la que se otorga acceso"
    )
    
    granted_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        comment="Usuario que otorgó el acceso"
    )
    
    # CAMPOS DE CONTROL
    
    access_type = Column(
        Enum(AccessType),
        nullable=False,
        default=AccessType.READ_ONLY,
        comment="Tipo de acceso: FULL, READ_ONLY, DENIED"
    )
    
    # CAMPOS DE AUDITORÍA
    
    granted_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora cuando se otorgó el acceso"
    )
    
    # ÍNDICES Y RESTRICCIONES
    
    __table_args__ = (
        UniqueConstraint('user_id', 'warehouse_id', name='uk_user_warehouse'),
        Index('idx_user_id', 'user_id'),
        Index('idx_warehouse_id', 'warehouse_id'),
        Index('idx_granted_by_user_id', 'granted_by_user_id'),
        Index('idx_access_type', 'access_type'),
        Index('idx_granted_at', 'granted_at'),
        Index('idx_user_warehouse_composite', 'user_id', 'warehouse_id', 'access_type'),
    )
    
    # VALIDADORES
    
    @validates('user_id')
    def validate_user_id(self, key, user_id):
        """Validar user_id"""
        if not user_id:
            raise ValueError("User ID es requerido")
        
        if user_id <= 0:
            raise ValueError("User ID debe ser mayor a 0")
        
        return user_id
    
    @validates('warehouse_id')
    def validate_warehouse_id(self, key, warehouse_id):
        """Validar warehouse_id"""
        if not warehouse_id:
            raise ValueError("Warehouse ID es requerido")
        
        if warehouse_id <= 0:
            raise ValueError("Warehouse ID debe ser mayor a 0")
        
        return warehouse_id
    
    @validates('granted_by_user_id')
    def validate_granted_by_user_id(self, key, granted_by_user_id):
        """Validar granted_by_user_id"""
        if not granted_by_user_id:
            raise ValueError("Granted by User ID es requerido")
        
        if granted_by_user_id <= 0:
            raise ValueError("Granted by User ID debe ser mayor a 0")
        
        return granted_by_user_id
    
    # PROPIEDADES
    
    @property
    def has_full_access(self) -> bool:
        """Verificar si tiene acceso completo"""
        return self.access_type == AccessType.FULL
    
    @property
    def has_read_only_access(self) -> bool:
        """Verificar si tiene acceso de solo lectura"""
        return self.access_type == AccessType.READ_ONLY
    
    @property
    def is_denied(self) -> bool:
        """Verificar si el acceso está denegado"""
        return self.access_type == AccessType.DENIED
    
    @property
    def can_write(self) -> bool:
        """Verificar si puede escribir (modificar)"""
        return self.access_type == AccessType.FULL
    
    @property
    def can_read(self) -> bool:
        """Verificar si puede leer"""
        return self.access_type in [AccessType.FULL, AccessType.READ_ONLY]
    
    @property
    def access_level_label(self) -> str:
        """Etiqueta del nivel de acceso"""
        access_labels = {
            AccessType.FULL: "Acceso Completo",
            AccessType.READ_ONLY: "Solo Lectura",
            AccessType.DENIED: "Acceso Denegado"
        }
        return access_labels.get(self.access_type, "Desconocido")
    
    @property
    def access_info(self) -> str:
        """Información del acceso"""
        return f"{self.access_level_label} otorgado el {self.granted_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_self_granted(self) -> bool:
        """Verificar si el usuario se otorgó acceso a sí mismo"""
        return self.granted_by_user_id == self.user_id
    
    def __repr__(self) -> str:
        """Representación string del objeto"""
        return f"<UserWarehouseAccess(user_id={self.user_id}, warehouse_id={self.warehouse_id}, access={self.access_type.value})>"
    
    # RELACIONES
    user = relationship(
        "User", 
        foreign_keys="UserWarehouseAccess.user_id",
        back_populates="warehouse_accesses"
    )

    # Esta se puede hacer viewonly si no necesitas modificarla:
    granted_by_user = relationship(
        "User",
        foreign_keys="UserWarehouseAccess.granted_by_user_id",
        viewonly=True  # ← Solo lectura para auditoría
    )

    # También agrega relación a warehouse si no la tienes:
    warehouse = relationship(
        "Warehouse",
        foreign_keys="UserWarehouseAccess.warehouse_id",
        viewonly=True  # ← Solo lectura
    )