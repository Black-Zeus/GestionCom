"""
volumes/backend-api/database/models/permissions.py
Modelo SQLAlchemy para la tabla permissions
"""
from sqlalchemy import Column, String, Boolean, Text, Index
from sqlalchemy.orm import validates, relationship

from .base import BaseModel, CommonValidators


class Permission(BaseModel):
    """Modelo para permisos del sistema"""
    
    __tablename__ = "permissions"
    
    # CAMPOS
    
    permission_code = Column(
        String(100),
        nullable=False,
        unique=True,
        comment="Código único del permiso (ej: PRODUCTS.CREATE, INVENTORY.VIEW)"
    )
    
    permission_name = Column(
        String(150),
        nullable=False,
        comment="Nombre descriptivo del permiso"
    )
    
    permission_group = Column(
        String(50),
        nullable=False,
        comment="Grupo de permisos (PRODUCTS, INVENTORY, SALES, etc.)"
    )
    
    permission_description = Column(
        Text,
        nullable=True,
        comment="Descripción detallada del permiso"
    )
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el permiso está activo"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_permission_code', 'permission_code'),
        Index('idx_permission_group', 'permission_group'),
        Index('idx_is_active', 'is_active'),
        Index('idx_permission_group_active', 'permission_group', 'is_active'),
    )
    
    # VALIDADORES
    
    @validates('permission_code')
    def validate_permission_code(self, key, permission_code):
        """Validar formato del código de permiso"""
        if not permission_code:
            raise ValueError("Código de permiso es requerido")
        
        permission_code = permission_code.strip().upper()
        
        # Formato: GRUPO.ACCION (ej: PRODUCTS.CREATE, INVENTORY.VIEW)
        import re
        if not re.match(r'^[A-Z0-9_]+\.[A-Z0-9_]+$', permission_code):
            raise ValueError("Código debe tener formato GRUPO.ACCION")
        
        if len(permission_code) < 5:
            raise ValueError("Código debe tener al menos 5 caracteres")
        
        if len(permission_code) > 100:
            raise ValueError("Código no puede tener más de 100 caracteres")
        
        return permission_code
    
    @validates('permission_name')
    def validate_permission_name(self, key, permission_name):
        """Validar nombre del permiso"""
        return CommonValidators.validate_string_length(
            permission_name, 
            min_length=3, 
            max_length=150, 
            field_name="Nombre del permiso"
        )
    
    @validates('permission_group')
    def validate_permission_group(self, key, permission_group):
        """Validar grupo del permiso"""
        if not permission_group:
            raise ValueError("Grupo de permiso es requerido")
        
        permission_group = permission_group.strip().upper()
        
        import re
        if not re.match(r'^[A-Z0-9_]+$', permission_group):
            raise ValueError("Grupo solo puede contener letras, números y guiones bajos")
        
        if len(permission_group) < 2:
            raise ValueError("Grupo debe tener al menos 2 caracteres")
        
        if len(permission_group) > 50:
            raise ValueError("Grupo no puede tener más de 50 caracteres")
        
        return permission_group
    
    @validates('permission_description')
    def validate_permission_description(self, key, permission_description):
        """Validar descripción del permiso"""
        if permission_description and len(permission_description.strip()) > 2000:
            raise ValueError("Descripción no puede tener más de 2000 caracteres")
        
        return permission_description.strip() if permission_description else None
    
    # PROPIEDADES
    
    @property
    def display_name(self) -> str:
        """Nombre para mostrar en UI"""
        return f"{self.permission_name} ({self.permission_code})"
    
    @property
    def group_and_action(self) -> tuple[str, str]:
        """Separar grupo y acción del código"""
        if '.' in self.permission_code:
            parts = self.permission_code.split('.', 1)
            return parts[0], parts[1]
        return self.permission_code, ""
    
    @property
    def action(self) -> str:
        """Obtener solo la acción"""
        _, action = self.group_and_action
        return action
    
    @property
    def group(self) -> str:
        """Obtener solo el grupo"""
        group, _ = self.group_and_action
        return group
    
    # RELACIONES
    users_with_direct_permission = relationship(
        "User",
        secondary="user_permissions",
        primaryjoin="Permission.id == user_permissions.c.permission_id", 
        secondaryjoin="User.id == user_permissions.c.user_id",
        back_populates="direct_permissions"
    )