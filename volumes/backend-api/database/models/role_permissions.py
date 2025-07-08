"""
SQLAlchemy model for role_permissions table
"""
from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from database.core.base import Base
from database.mixins.timestamp_mixin import TimestampMixin
from database.mixins.query_helper_mixin import QueryHelperMixin
from typing import TYPE_CHECKING, Optional, List

if TYPE_CHECKING:
    from database.models.role import Role
    from database.models.permission import Permission
    from database.models.user import User


class RolePermission(Base, TimestampMixin, QueryHelperMixin):
    """
    Model for role_permissions table - Many-to-many relationship between roles and permissions
    
    Attributes:
        id: Primary key
        role_id: Foreign key to roles table
        permission_id: Foreign key to permissions table
        granted_at: Timestamp when permission was granted to role
        granted_by_user_id: Foreign key to user who granted the permission
    """
    
    __tablename__ = "role_permissions"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Keys
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
    
    # Timestamps
    granted_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=func.now(),
        comment="Fecha y hora cuando se otorgó el permiso"
    )
    
    # Relationships
    role = relationship(
        "Role", 
        foreign_keys=[role_id],
        back_populates="role_permissions",
        lazy="select"
    )
    
    permission = relationship(
        "Permission", 
        foreign_keys=[permission_id],
        back_populates="role_permissions",
        lazy="select"
    )
    
    granted_by_user = relationship(
        "User", 
        foreign_keys=[granted_by_user_id],
        lazy="select"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('uk_role_permission', 'role_id', 'permission_id', unique=True),
        Index('idx_role_id', 'role_id'),
        Index('idx_permission_id', 'permission_id'),
    )
    
    # Validators
    @validates('role_id')
    def validate_role_id(self, key, value):
        """Validate role_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("role_id debe ser un número positivo")
        return value
    
    @validates('permission_id')
    def validate_permission_id(self, key, value):
        """Validate permission_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("permission_id debe ser un número positivo")
        return value
    
    @validates('granted_by_user_id')
    def validate_granted_by_user_id(self, key, value):
        """Validate granted_by_user_id is positive when provided"""
        if value is not None and value <= 0:
            raise ValueError("granted_by_user_id debe ser un número positivo")
        return value
    
    # Class Methods
    @classmethod
    def get_by_role_and_permission(cls, session, role_id: int, permission_id: int) -> Optional["RolePermission"]:
        """Get role permission assignment by role_id and permission_id"""
        return session.query(cls).filter(
            cls.role_id == role_id,
            cls.permission_id == permission_id
        ).first()
    
    @classmethod
    def get_role_permissions(cls, session, role_id: int) -> List["RolePermission"]:
        """Get all permissions assigned to a role"""
        return session.query(cls).filter(cls.role_id == role_id).all()
    
    @classmethod
    def get_permission_roles(cls, session, permission_id: int) -> List["RolePermission"]:
        """Get all roles that have a specific permission"""
        return session.query(cls).filter(cls.permission_id == permission_id).all()
    
    @classmethod
    def get_permissions_by_granter(cls, session, granted_by_user_id: int) -> List["RolePermission"]:
        """Get all permission assignments made by a specific user"""
        return session.query(cls).filter(cls.granted_by_user_id == granted_by_user_id).all()
    
    @classmethod
    def role_has_permission(cls, session, role_id: int, permission_id: int) -> bool:
        """Check if a role has a specific permission"""
        return session.query(cls).filter(
            cls.role_id == role_id,
            cls.permission_id == permission_id
        ).first() is not None
    
    @classmethod
    def role_has_permission_code(cls, session, role_id: int, permission_code: str) -> bool:
        """Check if a role has a permission by permission code"""
        from database.models.permission import Permission
        return session.query(cls).join(Permission).filter(
            cls.role_id == role_id,
            Permission.permission_code == permission_code,
            Permission.is_active == True
        ).first() is not None
    
    @classmethod
    def get_active_role_permissions(cls, session, role_id: int) -> List["RolePermission"]:
        """Get active permissions for a role (both role and permission must be active)"""
        from database.models.role import Role
        from database.models.permission import Permission
        return session.query(cls).join(Role).join(Permission).filter(
            cls.role_id == role_id,
            Role.is_active == True,
            Permission.is_active == True
        ).all()
    
    @classmethod
    def get_permissions_by_group_for_role(cls, session, role_id: int, permission_group: str) -> List["RolePermission"]:
        """Get permissions of a specific group for a role"""
        from database.models.permission import Permission
        return session.query(cls).join(Permission).filter(
            cls.role_id == role_id,
            Permission.permission_group == permission_group,
            Permission.is_active == True
        ).all()
    
    @classmethod
    def get_roles_with_permission_group(cls, session, permission_group: str) -> List["RolePermission"]:
        """Get all roles that have permissions from a specific group"""
        from database.models.permission import Permission
        return session.query(cls).join(Permission).filter(
            Permission.permission_group == permission_group,
            Permission.is_active == True
        ).distinct(cls.role_id).all()
    
    @classmethod
    def count_active_assignments(cls, session) -> int:
        """Count total active permission assignments to roles"""
        from database.models.role import Role
        from database.models.permission import Permission
        return session.query(cls).join(Role).join(Permission).filter(
            Role.is_active == True,
            Permission.is_active == True
        ).count()
    
    @classmethod
    def count_permissions_for_role(cls, session, role_id: int) -> int:
        """Count total permissions assigned to a role"""
        from database.models.permission import Permission
        return session.query(cls).join(Permission).filter(
            cls.role_id == role_id,
            Permission.is_active == True
        ).count()
    
    @classmethod
    def get_permission_distribution(cls, session) -> dict:
        """Get distribution of permissions across roles"""
        from database.models.permission import Permission
        from sqlalchemy import func
        
        result = session.query(
            Permission.permission_group,
            func.count(cls.id).label('assignment_count')
        ).join(Permission).filter(
            Permission.is_active == True
        ).group_by(Permission.permission_group).all()
        
        return {row.permission_group: row.assignment_count for row in result}
    
    @classmethod
    def bulk_assign_permissions(cls, session, role_id: int, permission_ids: List[int], granted_by_user_id: Optional[int] = None) -> List["RolePermission"]:
        """Bulk assign multiple permissions to a role"""
        assignments = []
        for permission_id in permission_ids:
            # Check if assignment already exists
            existing = cls.get_by_role_and_permission(session, role_id, permission_id)
            if not existing:
                assignment = cls(
                    role_id=role_id,
                    permission_id=permission_id,
                    granted_by_user_id=granted_by_user_id
                )
                session.add(assignment)
                assignments.append(assignment)
        
        session.flush()  # To get the IDs
        return assignments
    
    @classmethod
    def bulk_revoke_permissions(cls, session, role_id: int, permission_ids: List[int]) -> int:
        """Bulk revoke multiple permissions from a role"""
        count = session.query(cls).filter(
            cls.role_id == role_id,
            cls.permission_id.in_(permission_ids)
        ).delete(synchronize_session=False)
        return count
    
    def __repr__(self) -> str:
        return f"<RolePermission(id={self.id}, role_id={self.role_id}, permission_id={self.permission_id})>"
    
    def __str__(self) -> str:
        return f"RolePermission {self.id}: Role {self.role_id} -> Permission {self.permission_id}"