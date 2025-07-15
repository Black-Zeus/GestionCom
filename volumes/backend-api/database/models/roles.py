"""
Modelo SQLAlchemy para la tabla roles
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Boolean, Text, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

from .base import BaseModel, CommonValidators


class Role(BaseModel):
    """
    Modelo SQLAlchemy para la tabla roles
    
    Hereda de BaseModel que incluye:
    - id (BigInteger, PK, autoincrement)
    - created_at, updated_at (timestamps automáticos)
    - deleted_at (soft delete)
    - is_deleted, is_active_record (hybrid properties)
    """
    
    __tablename__ = "roles"
    
    # ==========================================
    # CAMPOS PRINCIPALES
    # ==========================================
    
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
    
    # ==========================================
    # CAMPOS DE CONTROL
    # ==========================================
    
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
    
    # ==========================================
    # ÍNDICES PERSONALIZADOS
    # ==========================================
    
    __table_args__ = (
        Index('idx_role_code', 'role_code'),
        Index('idx_is_active', 'is_active'),
        Index('idx_is_system_role', 'is_system_role'),
        Index('idx_role_code_active', 'role_code', 'is_active'),
    )
    
    # ==========================================
    # RELACIONES (comentadas hasta implementar otros modelos)
    # ==========================================
    
    # user_roles: Mapped[List["UserRole"]] = relationship(
    #     "UserRole",
    #     back_populates="role",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # role_permissions: Mapped[List["RolePermission"]] = relationship(
    #     "RolePermission",
    #     back_populates="role",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # # Relación many-to-many con usuarios a través de user_roles
    # users: Mapped[List["User"]] = relationship(
    #     "User",
    #     secondary="user_roles",
    #     back_populates="roles",
    #     lazy="select"
    # )
    
    # # Relación many-to-many con permisos a través de role_permissions
    # permissions: Mapped[List["Permission"]] = relationship(
    #     "Permission",
    #     secondary="role_permissions",
    #     back_populates="roles",
    #     lazy="select"
    # )
    
    # ==========================================
    # VALIDADORES
    # ==========================================
    
    @validates('role_code')
    def validate_role_code(self, key, role_code):
        """Validar y normalizar código de rol"""
        if not role_code:
            raise ValueError("Código de rol es requerido")
        
        role_code = role_code.strip().upper()
        
        # Solo caracteres alfanuméricos y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', role_code):
            raise ValueError("Código de rol solo puede contener letras mayúsculas, números y guiones bajos")
        
        if len(role_code) < 2:
            raise ValueError("Código de rol debe tener al menos 2 caracteres")
        
        if len(role_code) > 50:
            raise ValueError("Código de rol no puede tener más de 50 caracteres")
        
        return role_code
    
    @validates('role_name')
    def validate_role_name(self, key, role_name):
        """Validar nombre del rol"""
        return CommonValidators.validate_string_length(
            role_name, min_length=2, max_length=100, field_name="Nombre del rol"
        )
    
    @validates('role_description')
    def validate_role_description(self, key, role_description):
        """Validar descripción del rol"""
        if role_description:
            role_description = role_description.strip()
            if len(role_description) > 1000:
                raise ValueError("Descripción del rol no puede tener más de 1000 caracteres")
        
        return role_description
    
    # ==========================================
    # PROPIEDADES HÍBRIDAS
    # ==========================================
    
    @hybrid_property
    def display_name(self) -> str:
        """Nombre para mostrar en la UI"""
        return f"{self.role_name} ({self.role_code})"
    
    @hybrid_property
    def can_be_assigned(self) -> bool:
        """Verificar si el rol puede ser asignado"""
        return self.is_active and not self.is_deleted
    
    @can_be_assigned.expression
    def can_be_assigned(cls):
        """Expresión SQL para can_be_assigned"""
        return (cls.is_active == True) & (cls.deleted_at.is_(None))
    
    @hybrid_property
    def is_editable(self) -> bool:
        """Verificar si el rol puede ser editado"""
        return not self.is_system_role and not self.is_deleted
    
    @is_editable.expression
    def is_editable(cls):
        """Expresión SQL para is_editable"""
        return (cls.is_system_role == False) & (cls.deleted_at.is_(None))
    
    # ==========================================
    # MÉTODOS DE INSTANCIA
    # ==========================================
    
    def __repr__(self) -> str:
        return f"<Role(id={self.id}, code='{self.role_code}', name='{self.role_name}', active={self.is_active})>"
    
    def __str__(self) -> str:
        return self.display_name
    
    def can_be_deleted(self) -> tuple[bool, str]:
        """
        Verificar si el rol puede ser eliminado
        
        Returns:
            Tuple (can_delete, reason)
        """
        if self.is_system_role:
            return False, "Los roles del sistema no pueden ser eliminados"
        
        if self.is_deleted:
            return False, "El rol ya está eliminado"
        
        # TODO: Verificar si tiene usuarios asignados
        # if self.users:
        #     return False, f"El rol tiene {len(self.users)} usuarios asignados"
        
        return True, "OK"
    
    def can_be_edited(self) -> tuple[bool, str]:
        """
        Verificar si el rol puede ser editado
        
        Returns:
            Tuple (can_edit, reason)
        """
        if self.is_deleted:
            return False, "El rol está eliminado"
        
        if self.is_system_role:
            return False, "Los roles del sistema tienen edición limitada"
        
        return True, "OK"
    
    def get_summary_info(self) -> Dict[str, Any]:
        """
        Obtener información resumida del rol
        """
        return {
            "id": self.id,
            "role_code": self.role_code,
            "role_name": self.role_name,
            "display_name": self.display_name,
            "is_active": self.is_active,
            "is_system_role": self.is_system_role,
            "can_be_assigned": self.can_be_assigned,
            "is_editable": self.is_editable
        }
    
    # ==========================================
    # MÉTODOS DE CLASE
    # ==========================================
    
    @classmethod
    def create_new_role(
        cls,
        role_code: str,
        role_name: str,
        role_description: Optional[str] = None,
        is_system_role: bool = False,
        is_active: bool = True
    ) -> "Role":
        """
        Factory method para crear un nuevo rol
        """
        return cls(
            role_code=role_code,
            role_name=role_name,
            role_description=role_description,
            is_system_role=is_system_role,
            is_active=is_active
        )
    
    @classmethod
    def get_system_roles(cls) -> List[str]:
        """
        Obtener lista de códigos de roles del sistema
        """
        return [
            "SUPER_ADMIN",
            "ADMIN", 
            "SUPERVISOR",
            "CASHIER",
            "INVENTORY_MANAGER",
            "SALES_MANAGER",
            "VIEWER"
        ]
    
    # ==========================================
    # MÉTODOS PARA CONVERSIÓN
    # ==========================================
    
    def to_dict(self, include_relationships: bool = False, exclude_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Convertir rol a diccionario
        
        Args:
            include_relationships: Si incluir datos de relaciones
            exclude_fields: Campos adicionales a excluir
        """
        exclude_fields = exclude_fields or []
        
        # Usar método base
        base_dict = super().to_dict(exclude_none=True, exclude_fields=exclude_fields)
        
        # Agregar propiedades calculadas
        base_dict.update({
            'display_name': self.display_name,
            'can_be_assigned': self.can_be_assigned,
            'is_editable': self.is_editable
        })
        
        # Incluir relaciones si se solicita
        if include_relationships:
            # TODO: Implementar cuando tengamos las relaciones
            # base_dict.update({
            #     'users_count': len(self.users) if self.users else 0,
            #     'permissions_count': len(self.permissions) if self.permissions else 0,
            #     'permissions': [p.permission_code for p in self.permissions] if self.permissions else []
            # })
            pass
        
        return base_dict
    
    def validate(self) -> tuple[bool, List[str]]:
        """
        Validación completa del modelo Role
        
        Returns:
            Tuple (is_valid, errors)
        """
        errors = []
        
        # Validaciones básicas del modelo base
        base_valid, base_errors = super().validate()
        errors.extend(base_errors)
        
        # Validaciones específicas del rol
        if not self.role_code:
            errors.append("Código de rol es requerido")
        elif len(self.role_code) < 2:
            errors.append("Código de rol debe tener al menos 2 caracteres")
        
        if not self.role_name:
            errors.append("Nombre de rol es requerido")
        elif len(self.role_name) < 2:
            errors.append("Nombre de rol debe tener al menos 2 caracteres")
        
        # Validar que roles del sistema no puedan ser desactivados
        if self.is_system_role and not self.is_active:
            errors.append("Los roles del sistema no pueden ser desactivados")
        
        return len(errors) == 0, errors


# ==========================================
# QUERY HELPERS ESPECÍFICOS PARA ROLE
# ==========================================

class RoleQueryHelpers:
    """
    Helpers para queries comunes de roles
    """
    
    @staticmethod
    def active_roles(query):
        """Filtrar solo roles activos y no eliminados"""
        return query.filter(Role.is_active == True, Role.deleted_at.is_(None))
    
    @staticmethod
    def assignable_roles(query):
        """Roles que pueden ser asignados a usuarios"""
        return query.filter(Role.can_be_assigned == True)
    
    @staticmethod
    def editable_roles(query):
        """Roles que pueden ser editados"""
        return query.filter(Role.is_editable == True)
    
    @staticmethod
    def system_roles(query):
        """Solo roles del sistema"""
        return query.filter(Role.is_system_role == True)
    
    @staticmethod
    def custom_roles(query):
        """Solo roles creados por usuarios (no del sistema)"""
        return query.filter(Role.is_system_role == False)
    
    @staticmethod
    def by_code(query, role_code: str):
        """Buscar por código de rol"""
        return query.filter(Role.role_code == role_code.upper())
    
    @staticmethod
    def search_by_name(query, search_term: str):
        """Buscar por nombre o código"""
        from sqlalchemy import or_, func
        search_pattern = f"%{search_term}%"
        return query.filter(
            or_(
                func.upper(Role.role_name).like(func.upper(search_pattern)),
                func.upper(Role.role_code).like(func.upper(search_pattern))
            )
        )


# ==========================================
# SCOPES PREDEFINIDOS
# ==========================================

class RoleScopes:
    """
    Scopes predefinidos para queries comunes
    """
    
    @staticmethod
    def active():
        """Scope para roles activos"""
        return lambda query: RoleQueryHelpers.active_roles(query)
    
    @staticmethod
    def assignable():
        """Scope para roles asignables"""
        return lambda query: RoleQueryHelpers.assignable_roles(query)
    
    @staticmethod
    def editable():
        """Scope para roles editables"""
        return lambda query: RoleQueryHelpers.editable_roles(query)
    
    @staticmethod
    def system():
        """Scope para roles del sistema"""
        return lambda query: RoleQueryHelpers.system_roles(query)
    
    @staticmethod
    def custom():
        """Scope para roles personalizados"""
        return lambda query: RoleQueryHelpers.custom_roles(query)


# ==========================================
# CONSTANTES DE ROLES PREDEFINIDOS
# ==========================================

class SystemRoles:
    """
    Constantes para roles del sistema
    """
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SUPERVISOR = "SUPERVISOR"
    CASHIER = "CASHIER"
    INVENTORY_MANAGER = "INVENTORY_MANAGER"
    SALES_MANAGER = "SALES_MANAGER"
    VIEWER = "VIEWER"
    
    @classmethod
    def get_all(cls) -> List[str]:
        """Obtener todos los códigos de roles del sistema"""
        return [
            cls.SUPER_ADMIN,
            cls.ADMIN,
            cls.SUPERVISOR,
            cls.CASHIER,
            cls.INVENTORY_MANAGER,
            cls.SALES_MANAGER,
            cls.VIEWER
        ]
    
    @classmethod
    def get_admin_roles(cls) -> List[str]:
        """Roles con privilegios administrativos"""
        return [cls.SUPER_ADMIN, cls.ADMIN]
    
    @classmethod
    def get_management_roles(cls) -> List[str]:
        """Roles de gestión/supervisión"""
        return [cls.SUPER_ADMIN, cls.ADMIN, cls.SUPERVISOR, cls.INVENTORY_MANAGER, cls.SALES_MANAGER]