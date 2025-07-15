"""
SQLAlchemy model for user_warehouse_access table
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
    from database.models.warehouse import Warehouse


class AccessType(enum.Enum):
    """Enum for warehouse access types"""
    FULL = "FULL"
    READ_ONLY = "read_ONLY"
    DENIED = "DENIED"


class UserWarehouseAccess(Base, TimestampMixin, QueryHelperMixin):
    """
    Model for user_warehouse_access table - Access control for users to warehouses
    
    Attributes:
        id: Primary key
        user_id: Foreign key to users table
        warehouse_id: Foreign key to warehouses table
        access_type: Type of access (FULL, READ_ONLY, DENIED)
        granted_at: Timestamp when access was granted
        granted_by_user_id: Foreign key to user who granted the access
    """
    
    __tablename__ = "user_warehouse_access"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Keys
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
        comment="Almacén al que se otorga acceso"
    )
    
    granted_by_user_id = Column(
        BigInteger, 
        ForeignKey("users.id"), 
        nullable=False,
        comment="Usuario que otorgó el acceso"
    )
    
    # Access Type
    access_type = Column(
        Enum(AccessType), 
        nullable=False,
        default=AccessType.READ_ONLY,
        comment="Tipo de acceso: FULL, READ_ONLY, DENIED"
    )
    
    # Timestamps
    granted_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        default=func.now(),
        comment="Fecha y hora cuando se otorgó el acceso"
    )
    
    # Relationships
    user = relationship(
        "User", 
        foreign_keys=[user_id],
        back_populates="warehouse_accesses",
        lazy="select"
    )
    
    warehouse = relationship(
        "Warehouse", 
        foreign_keys=[warehouse_id],
        back_populates="user_accesses",
        lazy="select"
    )
    
    granted_by_user = relationship(
        "User", 
        foreign_keys=[granted_by_user_id],
        lazy="select"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('uk_user_warehouse', 'user_id', 'warehouse_id', unique=True),
        Index('idx_user_id', 'user_id'),
        Index('idx_warehouse_id', 'warehouse_id'),
        Index('idx_access_type', 'access_type'),
    )
    
    # Validators
    @validates('user_id')
    def validate_user_id(self, key, value):
        """Validate user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("user_id debe ser un número positivo")
        return value
    
    @validates('warehouse_id')
    def validate_warehouse_id(self, key, value):
        """Validate warehouse_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("warehouse_id debe ser un número positivo")
        return value
    
    @validates('granted_by_user_id')
    def validate_granted_by_user_id(self, key, value):
        """Validate granted_by_user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("granted_by_user_id debe ser un número positivo")
        return value
    
    # Properties
    @property
    def has_full_access(self) -> bool:
        """Check if user has full access to warehouse"""
        return self.access_type == AccessType.FULL
    
    @property
    def has_read_access(self) -> bool:
        """Check if user has at least read access to warehouse"""
        return self.access_type in [AccessType.FULL, AccessType.READ_ONLY]
    
    @property
    def is_denied(self) -> bool:
        """Check if user access is denied"""
        return self.access_type == AccessType.DENIED
    
    @property
    def can_write(self) -> bool:
        """Check if user can write/modify warehouse data"""
        return self.access_type == AccessType.FULL
    
    @property
    def can_read(self) -> bool:
        """Check if user can read warehouse data"""
        return self.access_type in [AccessType.FULL, AccessType.READ_ONLY]
    
    # Class Methods
    @classmethod
    def get_by_user_and_warehouse(cls, session, user_id: int, warehouse_id: int) -> Optional["UserWarehouseAccess"]:
        """Get user warehouse access by user_id and warehouse_id"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.warehouse_id == warehouse_id
        ).first()
    
    @classmethod
    def get_user_warehouses(cls, session, user_id: int, access_types: Optional[List[AccessType]] = None) -> List["UserWarehouseAccess"]:
        """Get all warehouses accessible to a user"""
        query = session.query(cls).filter(cls.user_id == user_id)
        if access_types:
            query = query.filter(cls.access_type.in_(access_types))
        return query.all()
    
    @classmethod
    def get_warehouse_users(cls, session, warehouse_id: int, access_types: Optional[List[AccessType]] = None) -> List["UserWarehouseAccess"]:
        """Get all users with access to a warehouse"""
        query = session.query(cls).filter(cls.warehouse_id == warehouse_id)
        if access_types:
            query = query.filter(cls.access_type.in_(access_types))
        return query.all()
    
    @classmethod
    def get_accesses_by_granter(cls, session, granted_by_user_id: int) -> List["UserWarehouseAccess"]:
        """Get all access grants made by a specific user"""
        return session.query(cls).filter(cls.granted_by_user_id == granted_by_user_id).all()
    
    @classmethod
    def user_has_warehouse_access(cls, session, user_id: int, warehouse_id: int, min_access_type: AccessType = AccessType.READ_ONLY) -> bool:
        """Check if a user has at least the specified access level to a warehouse"""
        access = cls.get_by_user_and_warehouse(session, user_id, warehouse_id)
        if not access:
            return False
        
        # Define access hierarchy
        access_hierarchy = {
            AccessType.DENIED: 0,
            AccessType.READ_ONLY: 1,
            AccessType.FULL: 2
        }
        
        return access_hierarchy.get(access.access_type, 0) >= access_hierarchy.get(min_access_type, 0)
    
    @classmethod
    def get_user_accessible_warehouses(cls, session, user_id: int, include_denied: bool = False) -> List["UserWarehouseAccess"]:
        """Get warehouses that user can access (excluding denied unless specified)"""
        query = session.query(cls).filter(cls.user_id == user_id)
        if not include_denied:
            query = query.filter(cls.access_type != AccessType.DENIED)
        return query.all()
    
    @classmethod
    def get_full_access_warehouses(cls, session, user_id: int) -> List["UserWarehouseAccess"]:
        """Get warehouses where user has full access"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.access_type == AccessType.FULL
        ).all()
    
    @classmethod
    def get_read_only_warehouses(cls, session, user_id: int) -> List["UserWarehouseAccess"]:
        """Get warehouses where user has read-only access"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.access_type == AccessType.READ_ONLY
        ).all()
    
    @classmethod
    def get_denied_warehouses(cls, session, user_id: int) -> List["UserWarehouseAccess"]:
        """Get warehouses where user access is denied"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.access_type == AccessType.DENIED
        ).all()
    
    @classmethod
    def get_warehouse_admins(cls, session, warehouse_id: int) -> List["UserWarehouseAccess"]:
        """Get users with full access to a warehouse"""
        return session.query(cls).filter(
            cls.warehouse_id == warehouse_id,
            cls.access_type == AccessType.FULL
        ).all()
    
    @classmethod
    def count_access_by_type(cls, session) -> dict:
        """Count total accesses by access type"""
        from sqlalchemy import func
        
        result = session.query(
            cls.access_type,
            func.count(cls.id).label('count')
        ).group_by(cls.access_type).all()
        
        return {row.access_type.value: row.count for row in result}
    
    @classmethod
    def count_user_warehouses(cls, session, user_id: int) -> int:
        """Count total warehouses accessible to a user (excluding denied)"""
        return session.query(cls).filter(
            cls.user_id == user_id,
            cls.access_type != AccessType.DENIED
        ).count()
    
    @classmethod
    def count_warehouse_users(cls, session, warehouse_id: int) -> int:
        """Count total users with access to a warehouse (excluding denied)"""
        return session.query(cls).filter(
            cls.warehouse_id == warehouse_id,
            cls.access_type != AccessType.DENIED
        ).count()
    
    @classmethod
    def get_warehouse_access_distribution(cls, session, warehouse_id: int) -> dict:
        """Get access type distribution for a warehouse"""
        from sqlalchemy import func
        
        result = session.query(
            cls.access_type,
            func.count(cls.id).label('count')
        ).filter(
            cls.warehouse_id == warehouse_id
        ).group_by(cls.access_type).all()
        
        return {row.access_type.value: row.count for row in result}
    
    @classmethod
    def bulk_grant_warehouse_access(cls, session, user_ids: List[int], warehouse_id: int, access_type: AccessType, granted_by_user_id: int) -> List["UserWarehouseAccess"]:
        """Bulk grant warehouse access to multiple users"""
        accesses = []
        for user_id in user_ids:
            # Check if access already exists
            existing = cls.get_by_user_and_warehouse(session, user_id, warehouse_id)
            if existing:
                # Update existing access
                existing.access_type = access_type
                existing.granted_by_user_id = granted_by_user_id
                existing.granted_at = func.now()
                accesses.append(existing)
            else:
                # Create new access
                access = cls(
                    user_id=user_id,
                    warehouse_id=warehouse_id,
                    access_type=access_type,
                    granted_by_user_id=granted_by_user_id
                )
                session.add(access)
                accesses.append(access)
        
        session.flush()  # To get the IDs
        return accesses
    
    @classmethod
    def bulk_revoke_warehouse_access(cls, session, user_ids: List[int], warehouse_id: int) -> int:
        """Bulk revoke warehouse access for multiple users"""
        count = session.query(cls).filter(
            cls.user_id.in_(user_ids),
            cls.warehouse_id == warehouse_id
        ).delete(synchronize_session=False)
        return count
    
    @classmethod
    def copy_warehouse_access(cls, session, source_user_id: int, target_user_id: int, granted_by_user_id: int, warehouse_ids: Optional[List[int]] = None) -> List["UserWarehouseAccess"]:
        """Copy warehouse access from one user to another"""
        query = session.query(cls).filter(cls.user_id == source_user_id)
        if warehouse_ids:
            query = query.filter(cls.warehouse_id.in_(warehouse_ids))
        
        source_accesses = query.all()
        new_accesses = []
        
        for source_access in source_accesses:
            # Check if target user already has access to this warehouse
            existing = cls.get_by_user_and_warehouse(session, target_user_id, source_access.warehouse_id)
            if not existing:
                new_access = cls(
                    user_id=target_user_id,
                    warehouse_id=source_access.warehouse_id,
                    access_type=source_access.access_type,
                    granted_by_user_id=granted_by_user_id
                )
                session.add(new_access)
                new_accesses.append(new_access)
        
        session.flush()
        return new_accesses
    
    def __repr__(self) -> str:
        return f"<UserWarehouseAccess(id={self.id}, user_id={self.user_id}, warehouse_id={self.warehouse_id}, access_type={self.access_type.value})>"
    
    def __str__(self) -> str:
        return f"UserWarehouseAccess {self.id}: User {self.user_id} -> Warehouse {self.warehouse_id} ({self.access_type.value})"