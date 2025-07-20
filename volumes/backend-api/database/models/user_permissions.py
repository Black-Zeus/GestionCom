"""
volumes/backend-api/database/models/user_permissions.py
Modelo SQLAlchemy para la tabla user_permissions
"""
from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, ForeignKey, TIMESTAMP, Enum, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship
from sqlalchemy.ext.hybrid import hybrid_property
import enum

from .base import BaseModel


class PermissionType(enum.Enum):
    """Tipos de permiso directo"""
    GRANT = "GRANT"
    DENY = "DENY"


class UserPermission(BaseModel):
    """Modelo para permisos directos de usuarios"""
    
    __tablename__ = "user_permissions"
    
    # CAMPOS DE RELACIÓN
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Usuario al que se otorga el permiso"
    )
    
    permission_id = Column(
        BigInteger,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        comment="Permiso otorgado al usuario"
    )
    
    granted_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Usuario que otorgó el permiso"
    )
    
    # CAMPOS DE CONTROL
    
    permission_type = Column(
        Enum(PermissionType),
        nullable=False,
        default=PermissionType.GRANT,
        comment="Tipo de permiso: GRANT (otorgar) o DENY (denegar)"
    )
    
    # CAMPOS DE AUDITORÍA
    
    granted_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora cuando se otorgó el permiso"
    )
    
    expires_at = Column(
        TIMESTAMP,
        nullable=True,
        comment="Fecha de expiración del permiso (NULL = permanente)"
    )
    
    # ÍNDICES Y RESTRICCIONES
    
    __table_args__ = (
        UniqueConstraint('user_id', 'permission_id', name='uk_user_permission'),
        Index('idx_user_id', 'user_id'),
        Index('idx_permission_id', 'permission_id'),
        Index('idx_granted_by_user_id', 'granted_by_user_id'),
        Index('idx_permission_type', 'permission_type'),
        Index('idx_granted_at', 'granted_at'),
        Index('idx_expires_at', 'expires_at'),
        Index('idx_user_permissions_composite', 'user_id', 'permission_id', 'permission_type'),
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
            raise ValueError("Granted by User ID debe ser mayor a 0")
        
        return granted_by_user_id
    
    @validates('expires_at')
    def validate_expires_at(self, key, expires_at):
        """Validar fecha de expiración"""
        if expires_at is not None:
            # Verificar que la fecha de expiración sea futura
            if expires_at <= datetime.now(timezone.utc):
                raise ValueError("Fecha de expiración debe ser futura")
        
        return expires_at
    
    # PROPIEDADES
    
    @hybrid_property
    def is_active(self) -> bool:
        """Verificar si el permiso está activo (no expirado)"""
        if self.expires_at is None:
            return True
        return self.expires_at > datetime.now(timezone.utc)
    
    @is_active.expression
    def is_active(cls):
        """Expresión SQL para is_active"""
        return (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now(timezone.utc))
    
    @hybrid_property
    def is_expired(self) -> bool:
        """Verificar si el permiso está expirado"""
        if self.expires_at is None:
            return False
        return self.expires_at <= datetime.now(timezone.utc)
    
    @is_expired.expression
    def is_expired(cls):
        """Expresión SQL para is_expired"""
        return (cls.expires_at.isnot(None)) & (cls.expires_at <= datetime.now(timezone.utc))
    
    @property
    def is_grant(self) -> bool:
        """Verificar si es un permiso de tipo GRANT"""
        return self.permission_type == PermissionType.GRANT
    
    @property
    def is_deny(self) -> bool:
        """Verificar si es un permiso de tipo DENY"""
        return self.permission_type == PermissionType.DENY
    
    @property
    def is_permanent(self) -> bool:
        """Verificar si es un permiso permanente"""
        return self.expires_at is None
    
    @property
    def grant_info(self) -> str:
        """Información del otorgamiento"""
        type_label = "Otorgado" if self.is_grant else "Denegado"
        if self.granted_by_user_id:
            info = f"{type_label} el {self.granted_at.strftime('%Y-%m-%d %H:%M')}"
        else:
            info = f"{type_label} automáticamente el {self.granted_at.strftime('%Y-%m-%d %H:%M')}"
        
        if self.expires_at:
            info += f" (expira: {self.expires_at.strftime('%Y-%m-%d %H:%M')})"
        else:
            info += " (permanente)"
        
        return info
    
    @property
    def is_system_grant(self) -> bool:
        """Verificar si fue otorgado por el sistema"""
        return self.granted_by_user_id is None
    
    def __repr__(self) -> str:
        """Representación string del objeto"""
        return f"<UserPermission(user_id={self.user_id}, permission_id={self.permission_id}, type={self.permission_type.value})>"
    
    # Relaciones
    user = relationship(
        "User",
        foreign_keys="UserPermission.user_id",
        viewonly=True
    )

    permission = relationship(
        "Permission",
        foreign_keys="UserPermission.permission_id",
        viewonly=True
    )

    granted_by_user = relationship(
        "User", 
        foreign_keys="UserPermission.granted_by_user_id",
        viewonly=True
    )