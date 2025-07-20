"""
volumes/backend-api/database/models/role_permissions.py
Modelo SQLAlchemy para la tabla role_permissions
"""
from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, ForeignKey, TIMESTAMP, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship

from .base import BaseModel


class RolePermission(BaseModel):
    """Modelo para relación roles-permisos"""
    
    __tablename__ = "role_permissions"
    
    # CAMPOS DE RELACIÓN
    
    role_id = Column(
        BigInteger,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        comment="Rol al que se otorga el permiso"
    )
    
    permission_id = Column(
        BigInteger,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        comment="Permiso otorgado al rol"
    )
    
    granted_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Usuario que otorgó el permiso"
    )
    
    # CAMPOS DE AUDITORÍA
    
    granted_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora cuando se otorgó el permiso"
    )
    
    # ÍNDICES Y RESTRICCIONES
    
    __table_args__ = (
        UniqueConstraint('role_id', 'permission_id', name='uk_role_permission'),
        Index('idx_role_id', 'role_id'),
        Index('idx_permission_id', 'permission_id'),
        Index('idx_granted_by_user_id', 'granted_by_user_id'),
        Index('idx_granted_at', 'granted_at'),
        Index('idx_role_permissions_composite', 'role_id', 'permission_id'),
    )
    
    # VALIDADORES
    
    @validates('role_id')
    def validate_role_id(self, key, role_id):
        """Validar role_id"""
        if not role_id:
            raise ValueError("Role ID es requerido")
        
        if role_id <= 0:
            raise ValueError("Role ID debe ser mayor a 0")
        
        return role_id
    
    @validates('permission_id')
    def validate_permission_id(self, key, permission_id):
        """Validar permission_id"""
        if not permission_id:
            raise ValueError("Permission ID es requerido")
        
        if permission_id <= 0:
            raise ValueError("Permission ID debe ser mayor a 0")
        
        return permission_id
    
    @validates('granted_by_user_id')
    def validate_granted_by_user_id(self, key, granted_by_user_id):
        """Validar granted_by_user_id"""
        if granted_by_user_id is not None and granted_by_user_id <= 0:
            raise ValueError("User ID debe ser mayor a 0")
        
        return granted_by_user_id
    
    # PROPIEDADES
    
    @property
    def grant_info(self) -> str:
        """Información del otorgamiento"""
        if self.granted_by_user_id:
            return f"Otorgado el {self.granted_at.strftime('%Y-%m-%d %H:%M')}"
        else:
            return f"Otorgado automáticamente el {self.granted_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_system_grant(self) -> bool:
        """Verificar si fue otorgado por el sistema"""
        return self.granted_by_user_id is None
    
    def __repr__(self) -> str:
        """Representación string del objeto"""
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"
    
    # Relaciones

    role = relationship(
        "Role",
        foreign_keys="RolePermission.role_id", 
        viewonly=True
    )

    permission = relationship(
        "Permission",
        foreign_keys="RolePermission.permission_id",
        viewonly=True
    )

    granted_by_user = relationship(
        "User",
        foreign_keys="RolePermission.granted_by_user_id",
        viewonly=True
    )