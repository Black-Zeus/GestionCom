"""
Modelo SQLAlchemy para la tabla permissions
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Boolean, Text, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

from .base import BaseModel, CommonValidators


class Permission(BaseModel):
    """
    Modelo SQLAlchemy para la tabla permissions
    
    Hereda de BaseModel que incluye:
    - id (BigInteger, PK, autoincrement)
    - created_at, updated_at (timestamps automáticos)
    - deleted_at (soft delete)
    - is_deleted, is_active_record (hybrid properties)
    """
    
    __tablename__ = "permissions"
    
    # ==========================================
    # CAMPOS PRINCIPALES
    # ==========================================
    
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
        comment="Descripción detallada del permiso y lo que permite hacer"
    )
    
    # ==========================================
    # CAMPOS DE CONTROL
    # ==========================================
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el permiso está activo y puede ser asignado"
    )
    
    # ==========================================
    # ÍNDICES PERSONALIZADOS
    # ==========================================
    
    __table_args__ = (
        Index('idx_permission_code', 'permission_code'),
        Index('idx_permission_group', 'permission_group'),
        Index('idx_is_active', 'is_active'),
        Index('idx_permission_group_active', 'permission_group', 'is_active'),
        Index('idx_permission_code_active', 'permission_code', 'is_active'),
    )
    
    # ==========================================
    # RELACIONES (comentadas hasta implementar otros modelos)
    # ==========================================
    
    # user_permissions: Mapped[List["UserPermission"]] = relationship(
    #     "UserPermission",
    #     back_populates="permission",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # role_permissions: Mapped[List["RolePermission"]] = relationship(
    #     "RolePermission",
    #     back_populates="permission",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # # Relación many-to-many con usuarios a través de user_permissions
    # users: Mapped[List["User"]] = relationship(
    #     "User",
    #     secondary="user_permissions",
    #     back_populates="permissions",
    #     lazy="select"
    # )
    
    # # Relación many-to-many con roles a través de role_permissions
    # roles: Mapped[List["Role"]] = relationship(
    #     "Role",
    #     secondary="role_permissions",
    #     back_populates="permissions",
    #     lazy="select"
    # )
    
    # ==========================================
    # VALIDADORES
    # ==========================================
    
    @validates('permission_code')
    def validate_permission_code(self, key, permission_code):
        """Validar y normalizar código de permiso"""
        if not permission_code:
            raise ValueError("Código de permiso es requerido")
        
        permission_code = permission_code.strip().upper()
        
        # Formato: GRUPO.ACCION (ej: PRODUCTS.CREATE, INVENTORY.VIEW)
        import re
        if not re.match(r'^[A-Z0-9_]+\.[A-Z0-9_]+$', permission_code):
            raise ValueError("Código de permiso debe tener formato GRUPO.ACCION (ej: PRODUCTS.CREATE)")
        
        if len(permission_code) < 5:
            raise ValueError("Código de permiso debe tener al menos 5 caracteres")
        
        if len(permission_code) > 100:
            raise ValueError("Código de permiso no puede tener más de 100 caracteres")
        
        return permission_code
    
    @validates('permission_name')
    def validate_permission_name(self, key, permission_name):
        """Validar nombre del permiso"""
        return CommonValidators.validate_string_length(
            permission_name, min_length=3, max_length=150, field_name="Nombre del permiso"
        )
    
    @validates('permission_group')
    def validate_permission_group(self, key, permission_group):
        """Validar grupo del permiso"""
        if not permission_group:
            raise ValueError("Grupo de permiso es requerido")
        
        permission_group = permission_group.strip().upper()
        
        # Solo caracteres alfanuméricos y guiones bajos
        import re
        if not re.match(r'^[A-Z0-9_]+$', permission_group):
            raise ValueError("Grupo de permiso solo puede contener letras mayúsculas, números y guiones bajos")
        
        if len(permission_group) < 2:
            raise ValueError("Grupo de permiso debe tener al menos 2 caracteres")
        
        if len(permission_group) > 50:
            raise ValueError("Grupo de permiso no puede tener más de 50 caracteres")
        
        return permission_group
    
    @validates('permission_description')
    def validate_permission_description(self, key, permission_description):
        """Validar descripción del permiso"""
        if permission_description:
            permission_description = permission_description.strip()
            if len(permission_description) > 2000:
                raise ValueError("Descripción del permiso no puede tener más de 2000 caracteres")
        
        return permission_description
    
    # ==========================================
    # PROPIEDADES HÍBRIDAS
    # ==========================================
    
    @hybrid_property
    def display_name(self) -> str:
        """Nombre para mostrar en la UI"""
        return f"{self.permission_name} ({self.permission_code})"
    
    @hybrid_property
    def group_and_action(self) -> tuple[str, str]:
        """Separar grupo y acción del código"""
        if '.' in self.permission_code:
            parts = self.permission_code.split('.', 1)
            return parts[0], parts[1]
        return self.permission_code, ""
    
    @hybrid_property
    def can_be_assigned(self) -> bool:
        """Verificar si el permiso puede ser asignado"""
        return self.is_active and not self.is_deleted
    
    @can_be_assigned.expression
    def can_be_assigned(cls):
        """Expresión SQL para can_be_assigned"""
        return (cls.is_active == True) & (cls.deleted_at.is_(None))
    
    @hybrid_property
    def group_display(self) -> str:
        """Nombre legible del grupo"""
        group_names = {
            'PRODUCTS': 'Productos',
            'INVENTORY': 'Inventario',
            'SALES': 'Ventas',
            'PURCHASES': 'Compras',
            'REPORTS': 'Reportes',
            'USERS': 'Usuarios',
            'ROLES': 'Roles',
            'PERMISSIONS': 'Permisos',
            'SETTINGS': 'Configuraciones',
            'AUDIT': 'Auditoría',
            'DASHBOARD': 'Dashboard',
            'WAREHOUSE': 'Almacén',
            'SUPPLIERS': 'Proveedores',
            'CUSTOMERS': 'Clientes',
            'FINANCE': 'Finanzas'
        }
        
        group, _ = self.group_and_action
        return group_names.get(group, group.replace('_', ' ').title())
    
    # ==========================================
    # MÉTODOS DE INSTANCIA
    # ==========================================
    
    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, code='{self.permission_code}', group='{self.permission_group}', active={self.is_active})>"
    
    def __str__(self) -> str:
        return self.display_name
    
    def get_action(self) -> str:
        """Obtener la acción del código de permiso"""
        _, action = self.group_and_action
        return action
    
    def get_group(self) -> str:
        """Obtener el grupo del código de permiso"""
        group, _ = self.group_and_action
        return group
    
    def is_in_group(self, group: str) -> bool:
        """Verificar si el permiso pertenece a un grupo específico"""
        return self.get_group() == group.upper()
    
    def is_action_type(self, action: str) -> bool:
        """Verificar si el permiso es de un tipo de acción específica"""
        return self.get_action() == action.upper()
    
    def get_summary_info(self) -> Dict[str, Any]:
        """
        Obtener información resumida del permiso
        """
        return {
            "id": self.id,
            "permission_code": self.permission_code,
            "permission_name": self.permission_name,
            "permission_group": self.permission_group,
            "group_display": self.group_display,
            "display_name": self.display_name,
            "is_active": self.is_active,
            "can_be_assigned": self.can_be_assigned,
            "action": self.get_action(),
            "group": self.get_group()
        }
    
    # ==========================================
    # MÉTODOS DE CLASE
    # ==========================================
    
    @classmethod
    def create_new_permission(
        cls,
        permission_code: str,
        permission_name: str,
        permission_group: str,
        permission_description: Optional[str] = None,
        is_active: bool = True
    ) -> "Permission":
        """
        Factory method para crear un nuevo permiso
        """
        return cls(
            permission_code=permission_code,
            permission_name=permission_name,
            permission_group=permission_group,
            permission_description=permission_description,
            is_active=is_active
        )
    
    @classmethod
    def get_permission_groups(cls) -> List[str]:
        """
        Obtener lista de grupos de permisos predefinidos
        """
        return [
            "PRODUCTS",
            "INVENTORY", 
            "SALES",
            "PURCHASES",
            "REPORTS",
            "USERS",
            "ROLES",
            "PERMISSIONS",
            "SETTINGS",
            "AUDIT",
            "DASHBOARD",
            "WAREHOUSE",
            "SUPPLIERS",
            "CUSTOMERS",
            "FINANCE"
        ]
    
    @classmethod
    def get_action_types(cls) -> List[str]:
        """
        Obtener lista de tipos de acciones predefinidas
        """
        return [
            "VIEW",
            "CREATE", 
            "EDIT",
            "DELETE",
            "MANAGE",
            "EXPORT",
            "IMPORT",
            "APPROVE",
            "REJECT",
            "PROCESS",
            "EXECUTE",
            "CONFIGURE"
        ]
    
    # ==========================================
    # MÉTODOS PARA CONVERSIÓN
    # ==========================================
    
    def to_dict(self, include_relationships: bool = False, exclude_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Convertir permiso a diccionario
        
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
            'group_display': self.group_display,
            'action': self.get_action(),
            'group': self.get_group()
        })
        
        # Incluir relaciones si se solicita
        if include_relationships:
            # TODO: Implementar cuando tengamos las relaciones
            # base_dict.update({
            #     'users_count': len(self.users) if self.users else 0,
            #     'roles_count': len(self.roles) if self.roles else 0,
            #     'assigned_roles': [r.role_code for r in self.roles] if self.roles else []
            # })
            pass
        
        return base_dict
    
    def validate(self) -> tuple[bool, List[str]]:
        """
        Validación completa del modelo Permission
        
        Returns:
            Tuple (is_valid, errors)
        """
        errors = []
        
        # Validaciones básicas del modelo base
        base_valid, base_errors = super().validate()
        errors.extend(base_errors)
        
        # Validaciones específicas del permiso
        if not self.permission_code:
            errors.append("Código de permiso es requerido")
        elif '.' not in self.permission_code:
            errors.append("Código de permiso debe tener formato GRUPO.ACCION")
        
        if not self.permission_name:
            errors.append("Nombre de permiso es requerido")
        elif len(self.permission_name) < 3:
            errors.append("Nombre de permiso debe tener al menos 3 caracteres")
        
        if not self.permission_group:
            errors.append("Grupo de permiso es requerido")
        elif len(self.permission_group) < 2:
            errors.append("Grupo de permiso debe tener al menos 2 caracteres")
        
        # Validar consistencia entre código y grupo
        if self.permission_code and self.permission_group:
            code_group = self.get_group()
            if code_group != self.permission_group:
                errors.append(f"El grupo en el código ({code_group}) no coincide con el campo grupo ({self.permission_group})")
        
        return len(errors) == 0, errors


# ==========================================
# QUERY HELPERS ESPECÍFICOS PARA PERMISSION
# ==========================================

class PermissionQueryHelpers:
    """
    Helpers para queries comunes de permisos
    """
    
    @staticmethod
    def active_permissions(query):
        """Filtrar solo permisos activos y no eliminados"""
        return query.filter(Permission.is_active == True, Permission.deleted_at.is_(None))
    
    @staticmethod
    def assignable_permissions(query):
        """Permisos que pueden ser asignados"""
        return query.filter(Permission.can_be_assigned == True)
    
    @staticmethod
    def by_group(query, group: str):
        """Filtrar por grupo de permisos"""
        return query.filter(Permission.permission_group == group.upper())
    
    @staticmethod
    def by_action(query, action: str):
        """Filtrar por tipo de acción"""
        from sqlalchemy import func
        return query.filter(func.substring_index(Permission.permission_code, '.', -1) == action.upper())
    
    @staticmethod
    def by_code(query, permission_code: str):
        """Buscar por código de permiso"""
        return query.filter(Permission.permission_code == permission_code.upper())
    
    @staticmethod
    def search_by_name_or_code(query, search_term: str):
        """Buscar por nombre, código o descripción"""
        from sqlalchemy import or_, func
        search_pattern = f"%{search_term}%"
        return query.filter(
            or_(
                func.upper(Permission.permission_name).like(func.upper(search_pattern)),
                func.upper(Permission.permission_code).like(func.upper(search_pattern)),
                func.upper(Permission.permission_description).like(func.upper(search_pattern))
            )
        )
    
    @staticmethod
    def by_multiple_groups(query, groups: List[str]):
        """Filtrar por múltiples grupos"""
        upper_groups = [g.upper() for g in groups]
        return query.filter(Permission.permission_group.in_(upper_groups))
    
    @staticmethod
    def by_multiple_actions(query, actions: List[str]):
        """Filtrar por múltiples acciones"""
        from sqlalchemy import or_, func
        filters = []
        for action in actions:
            filters.append(func.substring_index(Permission.permission_code, '.', -1) == action.upper())
        return query.filter(or_(*filters))


# ==========================================
# SCOPES PREDEFINIDOS
# ==========================================

class PermissionScopes:
    """
    Scopes predefinidos para queries comunes
    """
    
    @staticmethod
    def active():
        """Scope para permisos activos"""
        return lambda query: PermissionQueryHelpers.active_permissions(query)
    
    @staticmethod
    def assignable():
        """Scope para permisos asignables"""
        return lambda query: PermissionQueryHelpers.assignable_permissions(query)
    
    @staticmethod
    def for_group(group: str):
        """Scope para permisos de un grupo específico"""
        return lambda query: PermissionQueryHelpers.by_group(query, group)
    
    @staticmethod
    def for_action(action: str):
        """Scope para permisos de una acción específica"""
        return lambda query: PermissionQueryHelpers.by_action(query, action)


# ==========================================
# CONSTANTES DE PERMISOS PREDEFINIDOS
# ==========================================

class SystemPermissions:
    """
    Constantes para permisos del sistema
    """
    
    # Productos
    PRODUCTS_VIEW = "PRODUCTS.VIEW"
    PRODUCTS_CREATE = "PRODUCTS.CREATE"
    PRODUCTS_EDIT = "PRODUCTS.EDIT"
    PRODUCTS_DELETE = "PRODUCTS.DELETE"
    PRODUCTS_MANAGE = "PRODUCTS.MANAGE"
    
    # Inventario
    INVENTORY_VIEW = "INVENTORY.VIEW"
    INVENTORY_CREATE = "INVENTORY.CREATE"
    INVENTORY_EDIT = "INVENTORY.EDIT"
    INVENTORY_DELETE = "INVENTORY.DELETE"
    INVENTORY_MANAGE = "INVENTORY.MANAGE"
    INVENTORY_EXPORT = "INVENTORY.EXPORT"
    
    # Ventas
    SALES_VIEW = "SALES.VIEW"
    SALES_CREATE = "SALES.CREATE"
    SALES_EDIT = "SALES.EDIT"
    SALES_DELETE = "SALES.DELETE"
    SALES_PROCESS = "SALES.PROCESS"
    SALES_APPROVE = "SALES.APPROVE"
    
    # Usuarios
    USERS_VIEW = "USERS.VIEW"
    USERS_CREATE = "USERS.CREATE"
    USERS_EDIT = "USERS.EDIT"
    USERS_DELETE = "USERS.DELETE"
    USERS_MANAGE = "USERS.MANAGE"
    
    # Roles y Permisos
    ROLES_VIEW = "ROLES.VIEW"
    ROLES_CREATE = "ROLES.CREATE"
    ROLES_EDIT = "ROLES.EDIT"
    ROLES_DELETE = "ROLES.DELETE"
    ROLES_MANAGE = "ROLES.MANAGE"
    
    PERMISSIONS_VIEW = "PERMISSIONS.VIEW"
    PERMISSIONS_MANAGE = "PERMISSIONS.MANAGE"
    
    # Reportes
    REPORTS_VIEW = "REPORTS.VIEW"
    REPORTS_EXPORT = "REPORTS.EXPORT"
    REPORTS_MANAGE = "REPORTS.MANAGE"
    
    # Configuraciones
    SETTINGS_VIEW = "SETTINGS.VIEW"
    SETTINGS_EDIT = "SETTINGS.EDIT"
    SETTINGS_MANAGE = "SETTINGS.MANAGE"
    
    # Dashboard
    DASHBOARD_VIEW = "DASHBOARD.VIEW"
    DASHBOARD_MANAGE = "DASHBOARD.MANAGE"
    
    @classmethod
    def get_all(cls) -> List[str]:
        """Obtener todos los códigos de permisos del sistema"""
        import inspect
        return [
            value for name, value in inspect.getmembers(cls)
            if not name.startswith('_') and isinstance(value, str) and '.' in value
        ]
    
    @classmethod
    def get_by_group(cls, group: str) -> List[str]:
        """Obtener permisos por grupo"""
        all_permissions = cls.get_all()
        return [p for p in all_permissions if p.startswith(f"{group.upper()}.")]
    
    @classmethod
    def get_admin_permissions(cls) -> List[str]:
        """Permisos administrativos críticos"""
        return [
            cls.USERS_MANAGE,
            cls.ROLES_MANAGE,
            cls.PERMISSIONS_MANAGE,
            cls.SETTINGS_MANAGE
        ]
    
    @classmethod
    def get_view_permissions(cls) -> List[str]:
        """Todos los permisos de solo lectura"""
        all_permissions = cls.get_all()
        return [p for p in all_permissions if p.endswith('.VIEW')]