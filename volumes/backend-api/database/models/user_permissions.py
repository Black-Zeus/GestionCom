"""
SQLAlchemy model for user_permissions table
"""
from sqlalchemy import Column, BigInteger, ForeignKey, DateTime, Enum, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from database import Base
from database.models.base import TimestampMixin
from database.models.base import QueryHelperMixin
from typing import TYPE_CHECKING, Optional, List
import enum

if TYPE_CHECKING:
    from database.models.user import User
    from database.models.permissions import Permission


class PermissionType(enum.Enum):
    """Enum for permission types"""
    GRANT = "GRANT"
    DENY = "DENY"


class UserPermission(Base, TimestampMixin, QueryHelperMixin):
    """
    Model for user_permissions table - Direct permissions assigned to users
    
    Attributes:
        id: Primary key
        user_id: Foreign key to users table
        permission_id: Foreign key to permissions table
        permission_type: GRANT or DENY permission
        granted_at: Timestamp when permission was granted
        granted_by_user_id: Foreign key to user who granted the permission
        expires_at: Optional expiration date for the permission
    """
    
    __tablename__ = "user_permissions"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Keys
    user_id = Column(
        BigInteger, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Usuario al que se asigna el permiso"
    )
    
    permission_id = Column(
        BigInteger, 
        ForeignKey("permissions.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Permiso asignado al usuario"
    )
    
    granted_by_user_id = Column(
        BigInteger, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True,
        comment="Usuario que otorgó el permiso"
    )
    
    # Permission Type
    permission_type = Column(
        Enum(PermissionType), 
        nullable=False,
        default=PermissionType.GRANT,
        comment="Tipo de permiso: GRANT para otorgar, DENY para denegar"
    )
    
    # Timestamps
    granted_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=func.now(),
        comment="Fecha y hora cuando se otorgó el permiso"
    )
    
    expires_at = Column(
        DateTime(timezone=True), 
        nullable=True,
        comment="Fecha de expiración del permiso (opcional)"
    )
    
    # Relationships
    user = relationship(
        "User", 
        foreign_keys=[user_id],
        back_populates="user_permissions",
        lazy="select"
    )
    
    permission = relationship(
        "Permission", 
        foreign_keys=[permission_id],
        back_populates="user_permissions",
        lazy="select"
    )
    
    granted_by_user = relationship(
        "User", 
        foreign_keys=[granted_by_user_id],
        lazy="select"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('uk_user_permission', 'user_id', 'permission_id', unique=True),
        Index('idx_user_id', 'user_id'),
        Index('idx_permission_id', 'permission_id'),
        Index('idx_expires_at', 'expires_at'),
    )
    
    # Validators
    @validates('user_id')
    def validate_user_id(self, key, value):
        """Validate user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("user_id debe ser un número positivo")
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
    
    @validates('expires_at')
    def validate_expires_at(self, key, value):
        """Validate expires_at is in the future when provided"""
        from datetime import datetime, timezone
        if value is not None and value <= datetime.now():
            raise ValueError("expires_at debe ser una fecha futura")
        return value
    
    # Properties
    @property
    def is_expired(self) -> bool:
        """Check if the permission has expired"""
        from datetime import datetime, timezone
        return self.expires_at is not None and self.expires_at <= datetime.now()
    
    @property
    def is_active(self) -> bool:
        """Check if the permission is currently active (not expired)"""
        return not self.is_expired
    
    @property
    def is_grant_permission(self) -> bool:
        """Check if this is a GRANT permission"""
        return self.permission_type == PermissionType.GRANT
    
    @property
    def is_deny_permission(self) -> bool:
        """Check if this is a DENY permission"""
        return self.permission_type == PermissionType.DENY
    
    # Class Methods
    @classmethod
    def get_by_user_and_permission(cls, session, user_id: int, permission_id: int) -> Optional["UserPermission"]:
        """Get user permission assignment by user_id and permission_id"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.permission_id == permission_id
        ).first()
    
    @classmethod
    def get_user_permissions(cls, session, user_id: int, include_expired: bool = False) -> List["UserPermission"]:
        """Get all permissions assigned to a user"""
        query = session.query(cls).filter(cls.user_id == user_id)
        if not include_expired:
            from datetime import datetime, timezone
            query = query.filter(
                (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
            )
        return query.all()
    
    @classmethod
    def get_permission_users(cls, session, permission_id: int) -> List["UserPermission"]:
        """Get all users that have a specific permission directly assigned"""
        return session.query(cls).filter(cls.permission_id == permission_id).all()
    
    @classmethod
    def get_permissions_by_granter(cls, session, granted_by_user_id: int) -> List["UserPermission"]:
        """Get all permission assignments made by a specific user"""
        return session.query(cls).filter(cls.granted_by_user_id == granted_by_user_id).all()
    
    @classmethod
    def user_has_permission(cls, session, user_id: int, permission_id: int, check_expired: bool = True) -> Optional["UserPermission"]:
        """Check if a user has a specific permission directly assigned"""
        query = session.query(cls).filter(
            cls.user_id == user_id,
            cls.permission_id == permission_id
        )
        
        if check_expired:
            from datetime import datetime, timezone
            query = query.filter(
                (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
            )
        
        return query.first()
    
    @classmethod
    def user_has_permission_code(cls, session, user_id: int, permission_code: str, check_expired: bool = True) -> Optional["UserPermission"]:
        """Check if a user has a permission by permission code"""
        from database.models.permissions import Permission
        query = session.query(cls).join(Permission).filter(
            cls.user_id == user_id,
            Permission.permission_code == permission_code,
            Permission.is_active == True
        )
        
        if check_expired:
            from datetime import datetime, timezone
            query = query.filter(
                (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
            )
        
        return query.first()
    
    @classmethod
    def get_active_user_permissions(cls, session, user_id: int) -> List["UserPermission"]:
        """Get active permissions for a user (not expired and permission is active)"""
        from database.models.permissions import Permission
        from datetime import datetime, timezone
        return session.query(cls).join(Permission).filter(
            cls.user_id == user_id,
            Permission.is_active == True,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).all()
    
    @classmethod
    def get_grant_permissions(cls, session, user_id: int) -> List["UserPermission"]:
        """Get all GRANT permissions for a user"""
        from datetime import datetime, timezone
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.permission_type == PermissionType.GRANT,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).all()
    
    @classmethod
    def get_deny_permissions(cls, session, user_id: int) -> List["UserPermission"]:
        """Get all DENY permissions for a user"""
        from datetime import datetime, timezone
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.permission_type == PermissionType.DENY,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).all()
    
    @classmethod
    def get_permissions_by_group_for_user(cls, session, user_id: int, permission_group: str) -> List["UserPermission"]:
        """Get permissions of a specific group for a user"""
        from database.models.permissions import Permission
        from datetime import datetime, timezone
        return session.query(cls).join(Permission).filter(
            cls.user_id == user_id,
            Permission.permission_group == permission_group,
            Permission.is_active == True,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).all()
    
    @classmethod
    def get_expiring_permissions(cls, session, days_ahead: int = 7) -> List["UserPermission"]:
        """Get permissions that will expire in the specified number of days"""
        from datetime import datetime, timezone, timedelta
        future_date = datetime.now() + timedelta(days=days_ahead)
        return session.query(cls).filter(
            cls.expires_at.isnot(None),
            cls.expires_at <= future_date,
            cls.expires_at > datetime.now()
        ).all()
    
    @classmethod
    def get_expired_permissions(cls, session) -> List["UserPermission"]:
        """Get all expired permissions"""
        from datetime import datetime, timezone
        return session.query(cls).filter(
            cls.expires_at.isnot(None),
            cls.expires_at <= datetime.now()
        ).all()
    
    @classmethod
    def cleanup_expired_permissions(cls, session) -> int:
        """Remove expired permissions and return count of deleted records"""
        from datetime import datetime, timezone
        count = session.query(cls).filter(
            cls.expires_at.isnot(None),
            cls.expires_at <= datetime.now()
        ).delete(synchronize_session=False)
        return count
    
    @classmethod
    def count_active_assignments(cls, session) -> int:
        """Count total active permission assignments to users"""
        from database.models.permissions import Permission
        from datetime import datetime, timezone
        return session.query(cls).join(Permission).filter(
            Permission.is_active == True,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).count()
    
    @classmethod
    def count_permissions_for_user(cls, session, user_id: int) -> int:
        """Count total active permissions assigned to a user"""
        from database.models.permissions import Permission
        from datetime import datetime, timezone
        return session.query(cls).join(Permission).filter(
            cls.user_id == user_id,
            Permission.is_active == True,
            (cls.expires_at.is_(None)) | (cls.expires_at > datetime.now())
        ).count()
    
    @classmethod
    def get_permission_distribution_by_type(cls, session) -> dict:
        """Get distribution of GRANT vs DENY permissions"""
        from sqlalchemy import func
        
        result = session.query(
            cls.permission_type,
            func.count(cls.id).label('count')
        ).group_by(cls.permission_type).all()
        
        return {row.permission_type.value: row.count for row in result}
    
    @classmethod
    def bulk_assign_permissions(cls, session, user_id: int, permission_data: List[dict]) -> List["UserPermission"]:
        """Bulk assign multiple permissions to a user"""
        assignments = []
        for data in permission_data:
            # Check if assignment already exists
            existing = cls.get_by_user_and_permission(session, user_id, data['permission_id'])
            if not existing:
                assignment = cls(
                    user_id=user_id,
                    permission_id=data['permission_id'],
                    permission_type=data.get('permission_type', PermissionType.GRANT),
                    granted_by_user_id=data.get('granted_by_user_id'),
                    expires_at=data.get('expires_at')
                )
                session.add(assignment)
                assignments.append(assignment)
        
        session.flush()  # To get the IDs
        return assignments
    
    @classmethod
    def bulk_revoke_permissions(cls, session, user_id: int, permission_ids: List[int]) -> int:
        """Bulk revoke multiple permissions from a user"""
        count = session.query(cls).filter(
            cls.user_id == user_id,
            cls.permission_id.in_(permission_ids)
        ).delete(synchronize_session=False)
        return count
    
    def __repr__(self) -> str:
        return f"<UserPermission(id={self.id}, user_id={self.user_id}, permission_id={self.permission_id}, type={self.permission_type.value})>"
    
    def __str__(self) -> str:
        return f"UserPermission {self.id}: User {self.user_id} -> Permission {self.permission_id} ({self.permission_type.value})"