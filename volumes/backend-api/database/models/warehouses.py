"""
SQLAlchemy model for warehouses table
"""
from sqlalchemy import Column, BigInteger, ForeignKey, String, Text, Boolean, Enum, Index
from sqlalchemy.orm import relationship, validates
from database.core.base import Base
from database.mixins.timestamp_mixin import TimestampMixin
from database.mixins.soft_delete_mixin import SoftDeleteMixin
from database.mixins.query_helper_mixin import QueryHelperMixin
from typing import TYPE_CHECKING, Optional, List
import enum

if TYPE_CHECKING:
    from database.models.user import User
    from database.models.user_warehouse_access import UserWarehouseAccess


class WarehouseType(enum.Enum):
    """Enum for warehouse types"""
    WAREHOUSE = "WAREHOUSE"
    STORE = "STORE"
    OUTLET = "OUTLET"


class Warehouse(Base, TimestampMixin, SoftDeleteMixin, QueryHelperMixin):
    """
    Model for warehouses table - Physical storage locations
    
    Attributes:
        id: Primary key
        warehouse_code: Unique code for the warehouse
        warehouse_name: Name of the warehouse
        warehouse_type: Type of warehouse (WAREHOUSE, STORE, OUTLET)
        responsible_user_id: User responsible for the warehouse
        address: Physical address
        city: City location
        country: Country location
        phone: Contact phone number
        email: Contact email address
        is_active: Whether the warehouse is active
    """
    
    __tablename__ = "warehouses"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Basic Information
    warehouse_code = Column(
        String(20), 
        nullable=False, 
        unique=True,
        comment="Código único del almacén"
    )
    
    warehouse_name = Column(
        String(150), 
        nullable=False,
        comment="Nombre del almacén"
    )
    
    warehouse_type = Column(
        Enum(WarehouseType), 
        nullable=False,
        default=WarehouseType.WAREHOUSE,
        comment="Tipo de almacén: WAREHOUSE, STORE, OUTLET"
    )
    
    # Responsible User
    responsible_user_id = Column(
        BigInteger, 
        ForeignKey("users.id"), 
        nullable=False,
        comment="Usuario responsable único"
    )
    
    # Location Information
    address = Column(
        Text, 
        nullable=True,
        comment="Dirección física del almacén"
    )
    
    city = Column(
        String(100), 
        nullable=True,
        comment="Ciudad donde se ubica el almacén"
    )
    
    country = Column(
        String(100), 
        nullable=True,
        comment="País donde se ubica el almacén"
    )
    
    # Contact Information
    phone = Column(
        String(20), 
        nullable=True,
        comment="Teléfono de contacto del almacén"
    )
    
    email = Column(
        String(255), 
        nullable=True,
        comment="Email de contacto del almacén"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        nullable=False,
        default=True,
        comment="Si el almacén está activo"
    )
    
    # Relationships
    responsible_user = relationship(
        "User", 
        foreign_keys=[responsible_user_id],
        back_populates="responsible_warehouses",
        lazy="select"
    )
    
    user_accesses = relationship(
        "UserWarehouseAccess", 
        foreign_keys="UserWarehouseAccess.warehouse_id",
        back_populates="warehouse",
        lazy="select",
        cascade="all, delete-orphan"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('idx_warehouse_code', 'warehouse_code'),
        Index('idx_warehouse_type', 'warehouse_type'),
        Index('idx_responsible_user_id', 'responsible_user_id'),
        Index('idx_is_active', 'is_active'),
        Index('idx_deleted_at', 'deleted_at'),
    )
    
    # Validators
    @validates('warehouse_code')
    def validate_warehouse_code(self, key, value):
        """Validate warehouse code format"""
        if not value:
            raise ValueError("warehouse_code es requerido")
        
        # Convert to uppercase and remove extra spaces
        value = value.strip().upper()
        
        # Basic format validation (alphanumeric and some special chars)
        import re
        if not re.match(r'^[A-Z0-9_-]+$', value):
            raise ValueError("warehouse_code debe contener solo letras, números, guiones y guiones bajos")
        
        if len(value) < 2:
            raise ValueError("warehouse_code debe tener al menos 2 caracteres")
        
        return value
    
    @validates('warehouse_name')
    def validate_warehouse_name(self, key, value):
        """Validate warehouse name"""
        if not value or not value.strip():
            raise ValueError("warehouse_name es requerido")
        
        value = value.strip()
        
        if len(value) < 3:
            raise ValueError("warehouse_name debe tener al menos 3 caracteres")
        
        return value
    
    @validates('responsible_user_id')
    def validate_responsible_user_id(self, key, value):
        """Validate responsible_user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("responsible_user_id debe ser un número positivo")
        return value
    
    @validates('phone')
    def validate_phone(self, key, value):
        """Basic phone number validation"""
        if value is not None:
            value = value.strip()
            if value:
                # Remove common phone formatting characters
                cleaned_phone = ''.join(c for c in value if c.isdigit() or c in '+()-. ')
                if len(cleaned_phone) < 7:
                    raise ValueError("Número de teléfono debe tener al menos 7 dígitos")
                return cleaned_phone
        return value
    
    @validates('email')
    def validate_email(self, key, value):
        """Basic email validation"""
        if value is not None:
            value = value.strip().lower()
            if value:
                import re
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, value):
                    raise ValueError("Formato de email inválido")
                return value
        return value
    
    @validates('city', 'country')
    def validate_location_fields(self, key, value):
        """Validate location fields"""
        if value is not None:
            value = value.strip()
            if value and len(value) < 2:
                raise ValueError(f"{key} debe tener al menos 2 caracteres")
            return value if value else None
        return value
    
    # Properties
    @property
    def full_location(self) -> str:
        """Get full location string"""
        parts = []
        if self.city:
            parts.append(self.city)
        if self.country:
            parts.append(self.country)
        return ", ".join(parts) if parts else "Ubicación no especificada"
    
    @property
    def is_store(self) -> bool:
        """Check if warehouse is a store"""
        return self.warehouse_type == WarehouseType.STORE
    
    @property
    def is_outlet(self) -> bool:
        """Check if warehouse is an outlet"""
        return self.warehouse_type == WarehouseType.OUTLET
    
    @property
    def is_warehouse(self) -> bool:
        """Check if warehouse is a regular warehouse"""
        return self.warehouse_type == WarehouseType.WAREHOUSE
    
    @property
    def has_contact_info(self) -> bool:
        """Check if warehouse has contact information"""
        return bool(self.phone or self.email)
    
    @property
    def type_display(self) -> str:
        """Get display name for warehouse type"""
        type_names = {
            WarehouseType.WAREHOUSE: "Almacén",
            WarehouseType.STORE: "Tienda",
            WarehouseType.OUTLET: "Outlet"
        }
        return type_names.get(self.warehouse_type, "Desconocido")
    
    # Class Methods
    @classmethod
    def get_by_code(cls, session, warehouse_code: str) -> Optional["Warehouse"]:
        """Get warehouse by code"""
        return session.query(cls).filter(
            cls.warehouse_code == warehouse_code.upper(),
            cls.deleted_at.is_(None)
        ).first()
    
    @classmethod
    def get_active_warehouses(cls, session) -> List["Warehouse"]:
        """Get all active warehouses"""
        return session.query(cls).filter(
            cls.is_active == True,
            cls.deleted_at.is_(None)
        ).order_by(cls.warehouse_name).all()
    
    @classmethod
    def get_by_type(cls, session, warehouse_type: WarehouseType) -> List["Warehouse"]:
        """Get warehouses by type"""
        return session.query(cls).filter(
            cls.warehouse_type == warehouse_type,
            cls.deleted_at.is_(None)
        ).order_by(cls.warehouse_name).all()
    
    @classmethod
    def get_by_responsible_user(cls, session, user_id: int) -> List["Warehouse"]:
        """Get warehouses managed by a specific user"""
        return session.query(cls).filter(
            cls.responsible_user_id == user_id,
            cls.deleted_at.is_(None)
        ).order_by(cls.warehouse_name).all()
    
    @classmethod
    def get_by_location(cls, session, city: Optional[str] = None, country: Optional[str] = None) -> List["Warehouse"]:
        """Get warehouses by location"""
        query = session.query(cls).filter(cls.deleted_at.is_(None))
        
        if city:
            query = query.filter(cls.city.ilike(f"%{city}%"))
        if country:
            query = query.filter(cls.country.ilike(f"%{country}%"))
        
        return query.order_by(cls.warehouse_name).all()
    
    @classmethod
    def search_warehouses(cls, session, search_term: str) -> List["Warehouse"]:
        """Search warehouses by code, name, or location"""
        search_pattern = f"%{search_term}%"
        return session.query(cls).filter(
            (cls.warehouse_code.ilike(search_pattern) |
             cls.warehouse_name.ilike(search_pattern) |
             cls.city.ilike(search_pattern) |
             cls.country.ilike(search_pattern)),
            cls.deleted_at.is_(None)
        ).order_by(cls.warehouse_name).all()
    
    @classmethod
    def get_warehouses_with_access_count(cls, session) -> List[tuple]:
        """Get warehouses with their user access count"""
        from database.models.user_warehouse_access import UserWarehouseAccess
        from sqlalchemy import func
        
        return session.query(
            cls,
            func.count(UserWarehouseAccess.id).label('access_count')
        ).outerjoin(UserWarehouseAccess).filter(
            cls.deleted_at.is_(None)
        ).group_by(cls.id).order_by(cls.warehouse_name).all()
    
    @classmethod
    def count_by_type(cls, session) -> dict:
        """Count warehouses by type"""
        from sqlalchemy import func
        
        result = session.query(
            cls.warehouse_type,
            func.count(cls.id).label('count')
        ).filter(
            cls.deleted_at.is_(None)
        ).group_by(cls.warehouse_type).all()
        
        return {row.warehouse_type.value: row.count for row in result}
    
    @classmethod
    def count_active_vs_inactive(cls, session) -> dict:
        """Count active vs inactive warehouses"""
        from sqlalchemy import func
        
        result = session.query(
            cls.is_active,
            func.count(cls.id).label('count')
        ).filter(
            cls.deleted_at.is_(None)
        ).group_by(cls.is_active).all()
        
        return {
            'active' if row.is_active else 'inactive': row.count 
            for row in result
        }
    
    @classmethod
    def get_warehouses_without_responsible(cls, session) -> List["Warehouse"]:
        """Get warehouses without a responsible user (orphaned)"""
        from database.models.user import User
        return session.query(cls).outerjoin(
            User, cls.responsible_user_id == User.id
        ).filter(
            User.id.is_(None),
            cls.deleted_at.is_(None)
        ).all()
    
    @classmethod
    def get_warehouses_by_country_stats(cls, session) -> List[tuple]:
        """Get warehouse distribution by country"""
        from sqlalchemy import func
        
        return session.query(
            cls.country,
            func.count(cls.id).label('count')
        ).filter(
            cls.deleted_at.is_(None),
            cls.country.isnot(None)
        ).group_by(cls.country).order_by(func.count(cls.id).desc()).all()
    
    @classmethod
    def validate_unique_code(cls, session, warehouse_code: str, exclude_id: Optional[int] = None) -> bool:
        """Validate that warehouse code is unique"""
        query = session.query(cls).filter(
            cls.warehouse_code == warehouse_code.upper(),
            cls.deleted_at.is_(None)
        )
        
        if exclude_id:
            query = query.filter(cls.id != exclude_id)
        
        return query.first() is None
    
    @classmethod
    def bulk_update_status(cls, session, warehouse_ids: List[int], is_active: bool) -> int:
        """Bulk update warehouse active status"""
        count = session.query(cls).filter(
            cls.id.in_(warehouse_ids),
            cls.deleted_at.is_(None)
        ).update(
            {cls.is_active: is_active},
            synchronize_session=False
        )
        return count
    
    def get_user_access_count(self, session) -> int:
        """Get number of users with access to this warehouse"""
        from database.models.user_warehouse_access import UserWarehouseAccess
        return session.query(UserWarehouseAccess).filter(
            UserWarehouseAccess.warehouse_id == self.id
        ).count()
    
    def get_users_with_access(self, session, access_type: Optional[str] = None) -> List["UserWarehouseAccess"]:
        """Get users with access to this warehouse"""
        from database.models.user_warehouse_access import UserWarehouseAccess
        query = session.query(UserWarehouseAccess).filter(
            UserWarehouseAccess.warehouse_id == self.id
        )
        
        if access_type:
            query = query.filter(UserWarehouseAccess.access_type == access_type)
        
        return query.all()
    
    def can_be_deleted(self, session) -> tuple[bool, str]:
        """Check if warehouse can be safely deleted"""
        # Check if there are user accesses
        access_count = self.get_user_access_count(session)
        if access_count > 0:
            return False, f"No se puede eliminar: {access_count} usuarios tienen acceso a este almacén"
        
        # Add other business logic checks here
        # e.g., check for inventory, orders, etc.
        
        return True, "El almacén puede ser eliminado"
    
    def __repr__(self) -> str:
        return f"<Warehouse(id={self.id}, code='{self.warehouse_code}', name='{self.warehouse_name}', type={self.warehouse_type.value})>"
    
    def __str__(self) -> str:
        return f"{self.warehouse_code} - {self.warehouse_name} ({self.type_display})"