"""
volumes/backend-api/database/models/menu_items.py
Modelo SQLAlchemy para la tabla menu_items y relacionadas
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, Enum, Index, JSON, ForeignKey
from sqlalchemy.orm import validates, relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import json
import re

from .base import BaseModel, CommonValidators


class MenuType(PyEnum):
    """Tipos de elementos del menú"""
    PARENT = "PARENT"
    LINK = "LINK"
    DIVIDER = "DIVIDER"
    HEADER = "HEADER"


class TargetWindow(PyEnum):
    """Tipos de ventana objetivo"""
    SELF = "SELF"
    BLANK = "BLANK"
    MODAL = "MODAL"


class PermissionType(PyEnum):
    """Tipos de relación con permisos"""
    REQUIRED = "REQUIRED"
    ALTERNATIVE = "ALTERNATIVE"
    EXCLUDE = "EXCLUDE"


class MenuItem(BaseModel):
    """Modelo para elementos del menú"""
    
    __tablename__ = "menu_items"
    
    # CAMPOS JERÁRQUICOS
    
    parent_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=True,
        comment="ID del menú padre (NULL = menú raíz)"
    )
    
    menu_level = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Nivel jerárquico (1=raíz, 2=submenú, etc.)"
    )
    
    menu_path = Column(
        String(500),
        nullable=True,
        comment="Ruta completa del menú (/inventario/productos)"
    )
    
    # CAMPOS DE IDENTIFICACIÓN
    
    menu_code = Column(
        String(50),
        nullable=False,
        unique=True,
        comment="Código único del menú"
    )
    
    menu_name = Column(
        String(100),
        nullable=False,
        comment="Nombre mostrado en el menú"
    )
    
    menu_description = Column(
        Text,
        nullable=True,
        comment="Descripción del elemento del menú"
    )
    
    # CAMPOS DE PRESENTACIÓN
    
    icon_name = Column(
        String(50),
        nullable=True,
        comment="Nombre del icono (ej: product-line, shopping-cart)"
    )
    
    icon_color = Column(
        String(20),
        nullable=True,
        comment="Color del icono en formato hex"
    )
    
    menu_url = Column(
        String(255),
        nullable=True,
        comment="URL/ruta del frontend"
    )
    
    menu_type = Column(
        Enum(MenuType),
        nullable=False,
        default=MenuType.LINK,
        comment="Tipo de elemento del menú"
    )
    
    # CAMPOS DE PERMISOS
    
    required_permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="SET NULL"),
        nullable=True,
        comment="Permiso requerido para ver este menú"
    )
    
    alternative_permissions = Column(
        JSON,
        nullable=True,
        comment="Array de permisos alternativos que permiten acceso"
    )
    
    # CAMPOS DE CONTROL
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el menú está activo globalmente"
    )
    
    is_visible = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si es visible en el menú"
    )
    
    requires_feature = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Si requiere que una característica esté habilitada"
    )
    
    feature_code = Column(
        String(100),
        nullable=True,
        comment="Código de característica requerida"
    )
    
    sort_order = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Orden de aparición en el menú"
    )
    
    # CAMPOS DE UI
    
    target_window = Column(
        Enum(TargetWindow),
        nullable=False,
        default=TargetWindow.SELF,
        comment="Donde abrir el enlace"
    )
    
    css_classes = Column(
        String(255),
        nullable=True,
        comment="Clases CSS adicionales"
    )
    
    data_attributes = Column(
        JSON,
        nullable=True,
        comment="Atributos data- adicionales"
    )
    
    # CAMPO DE AUDITORÍA
    
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Usuario que creó el menú"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_parent_id', 'parent_id'),
        Index('idx_menu_code', 'menu_code'),
        Index('idx_required_permission_id', 'required_permission_id'),
        Index('idx_is_active', 'is_active'),
        Index('idx_is_visible', 'is_visible'),
        Index('idx_sort_order', 'sort_order'),
        Index('idx_menu_level', 'menu_level'),
        Index('idx_menu_path', 'menu_path'),
        Index('idx_feature_code', 'feature_code'),
        Index('idx_deleted_at', 'deleted_at'),
    )
    
    # VALIDADORES
    
    @validates('menu_code')
    def validate_menu_code(self, key, menu_code):
        """Validar código del menú"""
        if not menu_code:
            raise ValueError("Código del menú es requerido")
        
        menu_code = menu_code.strip().upper()
        
        # Solo letras, números y guiones bajos
        if not re.match(r'^[A-Z0-9_]+$', menu_code):
            raise ValueError("Código del menú solo puede contener letras mayúsculas, números y guiones bajos")
        
        if len(menu_code) < 2:
            raise ValueError("Código del menú debe tener al menos 2 caracteres")
        
        if len(menu_code) > 50:
            raise ValueError("Código del menú no puede tener más de 50 caracteres")
        
        return menu_code
    
    @validates('menu_name')
    def validate_menu_name(self, key, menu_name):
        """Validar nombre del menú"""
        return CommonValidators.validate_string_length(
            menu_name, 
            min_length=1, 
            max_length=100, 
            field_name="Nombre del menú"
        )
    
    @validates('menu_url')
    def validate_menu_url(self, key, menu_url):
        """Validar URL del menú"""
        if not menu_url:
            return None
        
        menu_url = menu_url.strip()
        
        # Debe empezar con / para rutas internas o http/https para externas
        if not (menu_url.startswith('/') or menu_url.startswith('http')):
            raise ValueError("URL debe empezar con '/' para rutas internas o 'http' para externas")
        
        if len(menu_url) > 255:
            raise ValueError("URL no puede tener más de 255 caracteres")
        
        return menu_url
    
    @validates('icon_name')
    def validate_icon_name(self, key, icon_name):
        """Validar nombre del icono"""
        if not icon_name:
            return None
        
        icon_name = icon_name.strip().lower()
        
        # Solo letras, números y guiones
        if not re.match(r'^[a-z0-9-]+$', icon_name):
            raise ValueError("Nombre del icono solo puede contener letras, números y guiones")
        
        if len(icon_name) > 50:
            raise ValueError("Nombre del icono no puede tener más de 50 caracteres")
        
        return icon_name
    
    @validates('icon_color')
    def validate_icon_color(self, key, icon_color):
        """Validar color del icono"""
        if not icon_color:
            return None
        
        icon_color = icon_color.strip()
        
        # Formato hex (#ffffff o #fff)
        if not re.match(r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', icon_color):
            raise ValueError("Color debe estar en formato hex (#ffffff o #fff)")
        
        return icon_color.lower()
    
    @validates('menu_level')
    def validate_menu_level(self, key, menu_level):
        """Validar nivel del menú"""
        if menu_level is None:
            return 1
        
        if not isinstance(menu_level, int):
            raise ValueError("Nivel del menú debe ser un número entero")
        
        if menu_level < 1:
            raise ValueError("Nivel del menú debe ser mayor a 0")
        
        if menu_level > 10:
            raise ValueError("Nivel del menú no puede ser mayor a 10")
        
        return menu_level
    
    @validates('sort_order')
    def validate_sort_order(self, key, sort_order):
        """Validar orden de clasificación"""
        if sort_order is None:
            return 0
        
        if not isinstance(sort_order, int):
            raise ValueError("Orden debe ser un número entero")
        
        if sort_order < 0:
            raise ValueError("Orden no puede ser negativo")
        
        return sort_order
    
    @validates('alternative_permissions')
    def validate_alternative_permissions(self, key, alternative_permissions):
        """Validar permisos alternativos"""
        if not alternative_permissions:
            return None
        
        if isinstance(alternative_permissions, str):
            try:
                alternative_permissions = json.loads(alternative_permissions)
            except json.JSONDecodeError:
                raise ValueError("Permisos alternativos debe ser JSON válido")
        
        if not isinstance(alternative_permissions, list):
            raise ValueError("Permisos alternativos debe ser una lista")
        
        # Validar que todos los elementos sean strings
        for perm in alternative_permissions:
            if not isinstance(perm, str):
                raise ValueError("Todos los permisos alternativos deben ser strings")
        
        return alternative_permissions
    
    @validates('data_attributes')
    def validate_data_attributes(self, key, data_attributes):
        """Validar atributos data"""
        if not data_attributes:
            return None
        
        if isinstance(data_attributes, str):
            try:
                data_attributes = json.loads(data_attributes)
            except json.JSONDecodeError:
                raise ValueError("Atributos data debe ser JSON válido")
        
        if not isinstance(data_attributes, dict):
            raise ValueError("Atributos data debe ser un diccionario")
        
        return data_attributes
    
    @validates('feature_code')
    def validate_feature_code(self, key, feature_code):
        """Validar código de característica"""
        if not feature_code:
            return None
        
        feature_code = feature_code.strip().upper()
        
        # Solo letras, números y guiones bajos
        if not re.match(r'^[A-Z0-9_]+$', feature_code):
            raise ValueError("Código de característica solo puede contener letras mayúsculas, números y guiones bajos")
        
        if len(feature_code) > 100:
            raise ValueError("Código de característica no puede tener más de 100 caracteres")
        
        return feature_code
    
    # RELACIONES
    
    # Relación jerárquica (self-referencing)
    parent = relationship(
        "MenuItem",
        remote_side="MenuItem.id",
        back_populates="children",
        lazy="select"
    )
    
    children = relationship(
        "MenuItem",
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="MenuItem.sort_order",
        lazy="select"
    )
    
    # Relación con permiso requerido
    required_permission = relationship(
        "Permission",
        foreign_keys=[required_permission_id],
        lazy="select"
    )
    
    # Relación con permisos adicionales
    additional_permissions = relationship(
        "MenuItemPermission",
        back_populates="menu_item",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    # Relación con usuario creador
    created_by_user = relationship(
        "User",
        foreign_keys=[created_by_user_id],
        lazy="select"
    )
    
    # # Relación con favoritos de usuarios
    # user_favorites = relationship(
    #     "UserMenuFavorite",
    #     back_populates="menu_item",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # Relación con logs de acceso
    access_logs = relationship(
        "MenuAccessLog",
        back_populates="menu_item",
        cascade="all, delete-orphan",
        lazy="select"
    )

    # Relación con favoritos de usuarios
    user_favorites = relationship(
        "UserMenuFavorite", 
        foreign_keys="UserMenuFavorite.menu_item_id",
        back_populates="menu_item",
        lazy="select"
    )
    
    # PROPIEDADES
    
    @property
    def full_path(self) -> str:
        """Ruta completa del menú"""
        if self.menu_path:
            return self.menu_path
        
        # Construir ruta desde jerarquía
        if self.parent:
            parent_path = self.parent.full_path
            return f"{parent_path}/{self.menu_code.lower()}"
        else:
            return f"/{self.menu_code.lower()}"
    
    @property
    def breadcrumb(self) -> list:
        """Lista de breadcrumbs desde raíz hasta este menú"""
        breadcrumbs = []
        current = self
        
        while current:
            breadcrumbs.insert(0, {
                'id': current.id,
                'code': current.menu_code,
                'name': current.menu_name,
                'url': current.menu_url
            })
            current = current.parent
        
        return breadcrumbs
    
    @property
    def has_children(self) -> bool:
        """Verificar si tiene elementos hijos"""
        return len(self.children) > 0
    
    @property
    def children_count(self) -> int:
        """Cantidad de elementos hijos"""
        return len(self.children)
    
    @property
    def active_children_count(self) -> int:
        """Cantidad de elementos hijos activos"""
        return len([child for child in self.children if child.is_active and child.is_visible])
    
    @property
    def is_root(self) -> bool:
        """Verificar si es elemento raíz"""
        return self.parent_id is None
    
    @property
    def is_leaf(self) -> bool:
        """Verificar si es elemento hoja (sin hijos)"""
        return not self.has_children
    
    @property
    def requires_permission(self) -> bool:
        """Verificar si requiere permisos"""
        return self.required_permission_id is not None or bool(self.alternative_permissions)
    
    @property
    def all_permission_codes(self) -> list:
        """Todos los códigos de permisos asociados"""
        permissions = []
        
        if self.required_permission:
            permissions.append(self.required_permission.permission_code)
        
        if self.alternative_permissions:
            permissions.extend(self.alternative_permissions)
        
        # Permisos adicionales de la tabla de relación
        for perm_rel in self.additional_permissions:
            permissions.append(perm_rel.permission.permission_code)
        
        return list(set(permissions))  # Eliminar duplicados
    
    @property
    def icon_html(self) -> str:
        """HTML del icono con color"""
        if not self.icon_name:
            return ""
        
        style = f"color: {self.icon_color};" if self.icon_color else ""
        return f'<i class="{self.icon_name}" style="{style}"></i>'
    
    @property
    def css_class_list(self) -> list:
        """Lista de clases CSS"""
        if not self.css_classes:
            return []
        
        return [cls.strip() for cls in self.css_classes.split() if cls.strip()]
    
    # MÉTODOS DE UTILIDAD
    
    def update_menu_path(self):
        """Actualizar ruta del menú basada en jerarquía"""
        self.menu_path = self.full_path
    
    def get_descendants(self, include_self=False):
        """Obtener todos los descendientes del menú"""
        descendants = []
        
        if include_self:
            descendants.append(self)
        
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_descendants())
        
        return descendants
    
    def get_ancestors(self, include_self=False):
        """Obtener todos los ancestros del menú"""
        ancestors = []
        
        if include_self:
            ancestors.append(self)
        
        current = self.parent
        while current:
            ancestors.insert(0, current)
            current = current.parent
        
        return ancestors
    
    def is_ancestor_of(self, other_menu):
        """Verificar si es ancestro de otro menú"""
        return other_menu in self.get_descendants()
    
    def is_descendant_of(self, other_menu):
        """Verificar si es descendiente de otro menú"""
        return self in other_menu.get_descendants()
    
    def can_be_parent_of(self, potential_child):
        """Verificar si puede ser padre de otro menú (evita ciclos)"""
        if potential_child == self:
            return False
        
        if self.is_descendant_of(potential_child):
            return False
        
        return True
    
    def move_to_parent(self, new_parent_id=None):
        """Mover menú a nuevo padre"""
        if new_parent_id == self.id:
            raise ValueError("Un menú no puede ser padre de sí mismo")
        
        self.parent_id = new_parent_id
        
        # Actualizar nivel
        if new_parent_id:
            if self.parent:
                self.menu_level = self.parent.menu_level + 1
        else:
            self.menu_level = 1
        
        # Actualizar ruta
        self.update_menu_path()
        
        # Actualizar niveles de descendientes
        self._update_descendants_level()
    
    def _update_descendants_level(self):
        """Actualizar niveles de todos los descendientes"""
        for child in self.children:
            child.menu_level = self.menu_level + 1
            child.update_menu_path()
            child._update_descendants_level()
    
    def reorder_children(self, ordered_child_ids):
        """Reordenar elementos hijos"""
        for index, child_id in enumerate(ordered_child_ids):
            child = next((c for c in self.children if c.id == child_id), None)
            if child:
                child.sort_order = index * 10  # Espaciado de 10 para permitir inserciones
    
    def to_dict_hierarchical(self, include_children=True, max_depth=None, current_depth=0):
        """Convertir a diccionario con estructura jerárquica"""
        data = {
            'id': self.id,
            'menu_code': self.menu_code,
            'menu_name': self.menu_name,
            'menu_description': self.menu_description,
            'menu_url': self.menu_url,
            'menu_type': self.menu_type.value if self.menu_type else None,
            'icon_name': self.icon_name,
            'icon_color': self.icon_color,
            'menu_level': self.menu_level,
            'menu_path': self.menu_path,
            'sort_order': self.sort_order,
            'is_active': self.is_active,
            'is_visible': self.is_visible,
            'target_window': self.target_window.value if self.target_window else None,
            'css_classes': self.css_classes,
            'data_attributes': self.data_attributes,
            'requires_feature': self.requires_feature,
            'feature_code': self.feature_code,
            'has_children': self.has_children,
            'children_count': self.children_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_children and self.has_children:
            if max_depth is None or current_depth < max_depth:
                data['children'] = [
                    child.to_dict_hierarchical(
                        include_children=True,
                        max_depth=max_depth,
                        current_depth=current_depth + 1
                    )
                    for child in sorted(self.children, key=lambda x: x.sort_order)
                    if child.is_active and child.is_visible
                ]
            else:
                data['children'] = []
        
        return data