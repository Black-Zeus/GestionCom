"""
SQLAlchemy model for user_roles table
"""
from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from database.core.base import Base
from database.mixins.timestamp_mixin import TimestampMixin
from database.mixins.query_helper_mixin import QueryHelperMixin
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from database.models.user import User
    from database.models.role import Role


class UserRole(Base, TimestampMixin, QueryHelperMixin):
    """
    Model for user_roles table - Many-to-many relationship between users and roles
    
    Attributes:
        id: Primary key
        user_id: Foreign key to users table
        role_id: Foreign key to roles table
        assigned_at: Timestamp when role was assigned
        assigned_by_user_id: Foreign key to user who assigned the role
    """
    
    __tablename__ = "user_roles"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Keys
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
    
    # Timestamps
    assigned_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=func.now(),
        comment="Fecha y hora de asignación del rol"
    )
    
    # Relationships
    user = relationship(
        "User", 
        foreign_keys=[user_id],
        back_populates="user_roles",
        lazy="select"
    )
    
    role = relationship(
        "Role", 
        foreign_keys=[role_id],
        back_populates="user_roles",
        lazy="select"
    )
    
    assigned_by_user = relationship(
        "User", 
        foreign_keys=[assigned_by_user_id],
        lazy="select"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('uk_user_role', 'user_id', 'role_id', unique=True),
        Index('idx_user_id', 'user_id'),
        Index('idx_role_id', 'role_id'),
    )
    
    # Validators
    @validates('user_id')
    def validate_user_id(self, key, value):
        """Validate user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("user_id debe ser un número positivo")
        return value
    
    @validates('role_id')
    def validate_role_id(self, key, value):
        """Validate role_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("role_id debe ser un número positivo")
        return value
    
    @validates('assigned_by_user_id')
    def validate_assigned_by_user_id(self, key, value):
        """Validate assigned_by_user_id is positive when provided"""
        if value is not None and value <= 0:
            raise ValueError("assigned_by_user_id debe ser un número positivo")
        return value
    
    # Class Methods
    @classmethod
    def get_by_user_and_role(cls, session, user_id: int, role_id: int) -> Optional["UserRole"]:
        """Get user role assignment by user_id and role_id"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.role_id == role_id
        ).first()
    
    @classmethod
    def get_user_roles(cls, session, user_id: int) -> list["UserRole"]:
        """Get all roles assigned to a user"""
        return session.query(cls).filter(cls.user_id == user_id).all()
    
    @classmethod
    def get_role_users(cls, session, role_id: int) -> list["UserRole"]:
        """Get all users assigned to a role"""
        return session.query(cls).filter(cls.role_id == role_id).all()
    
    @classmethod
    def get_assignments_by_assigner(cls, session, assigned_by_user_id: int) -> list["UserRole"]:
        """Get all role assignments made by a specific user"""
        return session.query(cls).filter(cls.assigned_by_user_id == assigned_by_user_id).all()
    
    @classmethod
    def user_has_role(cls, session, user_id: int, role_id: int) -> bool:
        """Check if a user has a specific role"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.role_id == role_id
        ).first() is not None
    
    @classmethod
    def user_has_role_code(cls, session, user_id: int, role_code: str) -> bool:
        """Check if a user has a role by role code"""
        from database.models.role import Role
        return session.query(cls).join(Role).filter(
            cls.user_id == user_id,
            Role.role_code == role_code,
            Role.is_active == True
        ).first() is not None
    
    @classmethod
    def count_active_assignments(cls, session) -> int:
        """Count total active role assignments"""
        from database.models.role import Role
        from database.models.user import User
        return session.query(cls).join(Role).join(User).filter(
            Role.is_active == True,
            User.is_active == True
        ).count()
    
    def __repr__(self) -> str:
        return f"<UserRole(id={self.id}, user_id={self.user_id}, role_id={self.role_id})>"
    
    def __str__(self) -> str:
        return f"UserRole {self.id}: User {self.user_id} -> Role {self.role_id}"