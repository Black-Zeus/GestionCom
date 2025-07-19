"""
volumes/backend-api/database/models/warehouses.py
Modelo SQLAlchemy para la tabla warehouses
"""
from sqlalchemy import Column, String, Boolean, Text, BigInteger, ForeignKey, Enum, Index
from sqlalchemy.orm import validates, relationship
import enum

from .base import BaseModel, CommonValidators


class WarehouseType(enum.Enum):
    """Tipos de bodega"""
    WAREHOUSE = "WAREHOUSE"
    STORE = "STORE"
    OUTLET = "OUTLET"


class Warehouse(BaseModel):
    """Modelo para bodegas y puntos de venta"""
    
    __tablename__ = "warehouses"
    
    # CAMPOS PRINCIPALES
    
    warehouse_code = Column(
        String(20),
        nullable=False,
        unique=True,
        comment="Código único de la bodega"
    )
    
    warehouse_name = Column(
        String(150),
        nullable=False,
        comment="Nombre descriptivo de la bodega"
    )
    
    warehouse_type = Column(
        Enum(WarehouseType),
        nullable=False,
        default=WarehouseType.WAREHOUSE,
        comment="Tipo de bodega: WAREHOUSE, STORE, OUTLET"
    )
    
    # RESPONSABILIDAD
    
    responsible_user_id = Column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False,
        comment="Usuario responsable único de la bodega"
    )
    
    # INFORMACIÓN DE UBICACIÓN
    
    address = Column(
        Text,
        nullable=True,
        comment="Dirección física de la bodega"
    )
    
    city = Column(
        String(100),
        nullable=True,
        comment="Ciudad donde se ubica"
    )
    
    country = Column(
        String(100),
        nullable=True,
        comment="País donde se ubica"
    )
    
    # INFORMACIÓN DE CONTACTO
    
    phone = Column(
        String(20),
        nullable=True,
        comment="Teléfono de contacto"
    )
    
    email = Column(
        String(255),
        nullable=True,
        comment="Email de contacto"
    )
    
    # CAMPOS DE CONTROL
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si la bodega está activa"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_warehouse_code', 'warehouse_code'),
        Index('idx_warehouse_type', 'warehouse_type'),
        Index('idx_responsible_user_id', 'responsible_user_id'),
        Index('idx_is_active', 'is_active'),
        Index('idx_warehouse_code_active', 'warehouse_code', 'is_active'),
    )
    
    # VALIDADORES
    
    @validates('warehouse_code')
    def validate_warehouse_code(self, key, warehouse_code):
        """Validar formato del código de bodega"""
        if not warehouse_code:
            raise ValueError("Código de bodega es requerido")
        
        warehouse_code = warehouse_code.strip().upper()
        
        # Solo letras, números y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', warehouse_code):
            raise ValueError("Código solo puede contener letras, números y guiones bajos")
        
        if len(warehouse_code) < 2:
            raise ValueError("Código debe tener al menos 2 caracteres")
        
        if len(warehouse_code) > 20:
            raise ValueError("Código no puede tener más de 20 caracteres")
        
        return warehouse_code
    
    @validates('warehouse_name')
    def validate_warehouse_name(self, key, warehouse_name):
        """Validar nombre de la bodega"""
        return CommonValidators.validate_string_length(
            warehouse_name, 
            min_length=3, 
            max_length=150, 
            field_name="Nombre de bodega"
        )
    
    @validates('city')
    def validate_city(self, key, city):
        """Validar ciudad"""
        if not city:
            return None
        
        city = city.strip()
        
        if len(city) < 2:
            raise ValueError("Ciudad debe tener al menos 2 caracteres")
        
        if len(city) > 100:
            raise ValueError("Ciudad no puede tener más de 100 caracteres")
        
        return city
    
    @validates('country')
    def validate_country(self, key, country):
        """Validar país"""
        if not country:
            return None
        
        country = country.strip()
        
        if len(country) < 2:
            raise ValueError("País debe tener al menos 2 caracteres")
        
        if len(country) > 100:
            raise ValueError("País no puede tener más de 100 caracteres")
        
        return country
    
    @validates('phone')
    def validate_phone(self, key, phone):
        """Validar teléfono"""
        if not phone:
            return None
        
        phone = phone.strip()
        
        # Formato chileno básico: +56912345678 o 912345678
        import re
        if not re.match(r'^(\+56)?[0-9]{8,9}$', phone):
            raise ValueError("Formato de teléfono inválido (formato chileno)")
        
        if len(phone) > 20:
            raise ValueError("Teléfono no puede tener más de 20 caracteres")
        
        return phone
    
    @validates('email')
    def validate_email(self, key, email):
        """Validar email"""
        if not email:
            return None
        
        email = email.strip().lower()
        
        # Validación básica de email
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Formato de email inválido")
        
        if len(email) > 255:
            raise ValueError("Email no puede tener más de 255 caracteres")
        
        return email
    
    @validates('address')
    def validate_address(self, key, address):
        """Validar dirección"""
        if not address:
            return None
        
        address = address.strip()
        
        if len(address) > 1000:
            raise ValueError("Dirección no puede tener más de 1000 caracteres")
        
        return address
    
    # PROPIEDADES
    
    @property
    def display_name(self) -> str:
        """Nombre para mostrar en UI"""
        return f"{self.warehouse_name} ({self.warehouse_code})"
    
    @property
    def type_label(self) -> str:
        """Etiqueta del tipo de bodega"""
        type_labels = {
            WarehouseType.WAREHOUSE: "Bodega",
            WarehouseType.STORE: "Tienda",
            WarehouseType.OUTLET: "Outlet"
        }
        return type_labels.get(self.warehouse_type, "Desconocido")
    
    @property
    def location_summary(self) -> str:
        """Resumen de ubicación"""
        parts = [part for part in [self.city, self.country] if part]
        return ", ".join(parts) if parts else "Sin ubicación"
    
    @property
    def is_store(self) -> bool:
        """Verificar si es una tienda"""
        return self.warehouse_type == WarehouseType.STORE
    
    @property
    def is_warehouse(self) -> bool:
        """Verificar si es una bodega"""
        return self.warehouse_type == WarehouseType.WAREHOUSE
    
    @property
    def is_outlet(self) -> bool:
        """Verificar si es un outlet"""
        return self.warehouse_type == WarehouseType.OUTLET
    
    # RELACIONES    
    responsible_user = relationship("User", back_populates="responsible_warehouses")