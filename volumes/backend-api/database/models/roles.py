"""
volumes/backend-api/database/models/roles.py
Modelo SQLAlchemy para la tabla roles
"""
from sqlalchemy import Column, String, Boolean, Text, Index
from sqlalchemy.orm import validates, relationship
from .base import BaseModel, CommonValidators


class Role(BaseModel):
    """Modelo para roles del sistema"""
    
    __tablename__ = "roles"
    
    # CAMPOS
    
    role_code = Column(
        String(50),
        nullable=False,
        unique=True,
        comment="Código único del rol (ej: ADMIN, CASHIER, SUPERVISOR)"
    )
    
    role_name = Column(
        String(100),
        nullable=False,
        comment="Nombre descriptivo del rol"
    )
    
    role_description = Column(
        Text,
        nullable=True,
        comment="Descripción detallada del rol y sus responsabilidades"
    )
    
    is_system_role = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Si es un rol del sistema (no editable por usuarios)"
    )
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el rol está activo y puede ser asignado"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_role_code', 'role_code'),
        Index('idx_is_active', 'is_active'),
        Index('idx_is_system_role', 'is_system_role'),
        Index('idx_role_code_active', 'role_code', 'is_active'),
    )
    
    # VALIDADORES
    
    @validates('role_code')
    def validate_role_code(self, key, role_code):
        """Validar formato del código de rol"""
        if not role_code:
            raise ValueError("Código de rol es requerido")
        
        role_code = role_code.strip().upper()
        
        # Solo letras, números y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', role_code):
            raise ValueError("Código solo puede contener letras, números y guiones bajos")
        
        if len(role_code) < 2:
            raise ValueError("Código debe tener al menos 2 caracteres")
        
        if len(role_code) > 50:
            raise ValueError("Código no puede tener más de 50 caracteres")
        
        return role_code
    
    @validates('role_name')
    def validate_role_name(self, key, role_name):
        """Validar nombre del rol"""
        return CommonValidators.validate_string_length(
            role_name, 
            min_length=2, 
            max_length=100, 
            field_name="Nombre del rol"
        )
    
    @validates('role_description')
    def validate_role_description(self, key, role_description):
        """Validar descripción del rol"""
        if role_description and len(role_description.strip()) > 2000:
            raise ValueError("Descripción no puede tener más de 2000 caracteres")
        
        return role_description.strip() if role_description else None
    
    # PROPIEDADES
    
    @property
    def display_name(self) -> str:
        """Nombre para mostrar en UI"""
        return f"{self.role_name} ({self.role_code})"
    
    @property
    def can_edit(self) -> bool:
        """Verificar si el rol puede ser editado"""
        return not self.is_system_role
    
    @property
    def status_label(self) -> str:
        """Etiqueta de estado del rol"""
        if not self.is_active:
            return "Inactivo"
        elif self.is_system_role:
            return "Sistema"
        else:
            return "Activo"
        
    # RELACIONES
    users = relationship(
        "User", 
        secondary="user_roles",
        primaryjoin="Role.id == user_roles.c.role_id",
        secondaryjoin="User.id == user_roles.c.user_id", 
        back_populates="roles"
    )