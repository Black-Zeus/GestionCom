"""
volumes/backend-api/database/models/user_roles.py
Modelo SQLAlchemy para la tabla user_roles
"""
from datetime import datetime, timezone
from sqlalchemy import Column, BigInteger, ForeignKey, TIMESTAMP, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship

from .base import BaseModel


class UserRole(BaseModel):
    """Modelo para relación usuarios-roles"""
    
    __tablename__ = "user_roles"
    
    # CAMPOS DE RELACIÓN
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Usuario al que se le asigna el rol"
    )
    
    role_id = Column(
        BigInteger,
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
        comment="Rol asignado al usuario"
    )
    
    assigned_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Usuario que realizó la asignación"
    )
    
    # CAMPOS DE AUDITORÍA
    
    assigned_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha y hora de asignación del rol"
    )
    
    # ÍNDICES Y RESTRICCIONES
    
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', name='uk_user_role'),
        Index('idx_user_id', 'user_id'),
        Index('idx_role_id', 'role_id'),
        Index('idx_assigned_by_user_id', 'assigned_by_user_id'),
        Index('idx_assigned_at', 'assigned_at'),
        Index('idx_user_roles_composite', 'user_id', 'role_id'),
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
    
    @validates('role_id')
    def validate_role_id(self, key, role_id):
        """Validar role_id"""
        if not role_id:
            raise ValueError("Role ID es requerido")
        
        if role_id <= 0:
            raise ValueError("Role ID debe ser mayor a 0")
        
        return role_id
    
    @validates('assigned_by_user_id')
    def validate_assigned_by_user_id(self, key, assigned_by_user_id):
        """Validar assigned_by_user_id"""
        if assigned_by_user_id is not None and assigned_by_user_id <= 0:
            raise ValueError("Assigned by User ID debe ser mayor a 0")
        
        return assigned_by_user_id
    
    # PROPIEDADES
    
    @property
    def assignment_info(self) -> str:
        """Información de la asignación"""
        if self.assigned_by_user_id:
            return f"Asignado el {self.assigned_at.strftime('%Y-%m-%d %H:%M')}"
        else:
            return f"Asignado automáticamente el {self.assigned_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_system_assignment(self) -> bool:
        """Verificar si fue asignado por el sistema"""
        return self.assigned_by_user_id is None
    
    @property
    def is_self_assignment(self) -> bool:
        """Verificar si el usuario se asignó el rol a sí mismo"""
        return (
            self.assigned_by_user_id is not None and 
            self.assigned_by_user_id == self.user_id
        )
    
    def __repr__(self) -> str:
        """Representación string del objeto"""
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"
    
    # Relaciones
    user = relationship(
        "User",
        foreign_keys="UserRole.user_id",
        viewonly=True
    )

    role = relationship(
        "Role", 
        foreign_keys="UserRole.role_id",
        viewonly=True
    )

    assigned_by_user = relationship(
        "User",
        foreign_keys="UserRole.assigned_by_user_id",
        viewonly=True
    )
