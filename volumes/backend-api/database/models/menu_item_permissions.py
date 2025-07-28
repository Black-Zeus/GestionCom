"""
volumes/backend-api/database/models/menu_item_permissions.py
Modelo SQLAlchemy para la tabla menu_item_permissions
"""
from sqlalchemy import Column, Integer, ForeignKey, Enum, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship
from enum import Enum as PyEnum

from .base import BaseModel


class PermissionType(PyEnum):
    """Tipos de relación entre menú y permiso"""
    REQUIRED = "REQUIRED"
    ALTERNATIVE = "ALTERNATIVE"
    EXCLUDE = "EXCLUDE"


class MenuItemPermission(BaseModel):
    """Modelo para relación entre elementos del menú y permisos"""
    
    __tablename__ = "menu_item_permissions"
    
    # CAMPOS PRINCIPALES
    
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID del elemento del menú"
    )
    
    permission_id = Column(
        Integer,
        ForeignKey("permissions.id", ondelete="CASCADE"),
        nullable=False,
        comment="ID del permiso"
    )
    
    permission_type = Column(
        Enum(PermissionType),
        nullable=False,
        default=PermissionType.ALTERNATIVE,
        comment="Tipo de relación con el permiso"
    )
    
    # ÍNDICES Y CONSTRAINTS
    
    __table_args__ = (
        # Constraint único: un permiso solo puede tener un tipo por menú
        UniqueConstraint(
            'menu_item_id', 
            'permission_id', 
            name='uk_menu_permission'
        ),
        
        # Índices para optimizar consultas
        Index('idx_menu_item_id', 'menu_item_id'),
        Index('idx_permission_id', 'permission_id'),
        Index('idx_permission_type', 'permission_type'),
    )
    
    # VALIDADORES
    
    @validates('menu_item_id')
    def validate_menu_item_id(self, key, menu_item_id):
        """Validar ID del menú"""
        if not menu_item_id:
            raise ValueError("ID del menú es requerido")
        
        if not isinstance(menu_item_id, int) or menu_item_id <= 0:
            raise ValueError("ID del menú debe ser un entero positivo")
        
        return menu_item_id
    
    @validates('permission_id')
    def validate_permission_id(self, key, permission_id):
        """Validar ID del permiso"""
        if not permission_id:
            raise ValueError("ID del permiso es requerido")
        
        if not isinstance(permission_id, int) or permission_id <= 0:
            raise ValueError("ID del permiso debe ser un entero positivo")
        
        return permission_id
    
    @validates('permission_type')
    def validate_permission_type(self, key, permission_type):
        """Validar tipo de permiso"""
        if not permission_type:
            return PermissionType.ALTERNATIVE
        
        if isinstance(permission_type, str):
            try:
                permission_type = PermissionType(permission_type.upper())
            except ValueError:
                valid_types = [t.value for t in PermissionType]
                raise ValueError(f"Tipo de permiso debe ser uno de: {valid_types}")
        
        return permission_type
    
    # RELACIONES
    
    # Relación con MenuItem
    menu_item = relationship(
        "MenuItem",
        foreign_keys=[menu_item_id],
        back_populates="additional_permissions",
        lazy="select"
    )
    
    # Relación con Permission
    permission = relationship(
        "Permission",
        foreign_keys=[permission_id],
        lazy="select"
    )
    
    # PROPIEDADES
    
    @property
    def is_required(self) -> bool:
        """Verificar si es un permiso requerido"""
        return self.permission_type == PermissionType.REQUIRED
    
    @property
    def is_alternative(self) -> bool:
        """Verificar si es un permiso alternativo"""
        return self.permission_type == PermissionType.ALTERNATIVE
    
    @property
    def is_exclude(self) -> bool:
        """Verificar si es un permiso de exclusión"""
        return self.permission_type == PermissionType.EXCLUDE
    
    @property
    def permission_code(self) -> str:
        """Código del permiso asociado"""
        return self.permission.permission_code if self.permission else None
    
    @property
    def permission_name(self) -> str:
        """Nombre del permiso asociado"""
        return self.permission.permission_name if self.permission else None
    
    @property
    def menu_code(self) -> str:
        """Código del menú asociado"""
        return self.menu_item.menu_code if self.menu_item else None
    
    @property
    def menu_name(self) -> str:
        """Nombre del menú asociado"""
        return self.menu_item.menu_name if self.menu_item else None
    
    @property
    def relationship_description(self) -> str:
        """Descripción de la relación"""
        type_descriptions = {
            PermissionType.REQUIRED: "Permiso requerido obligatoriamente",
            PermissionType.ALTERNATIVE: "Permiso alternativo válido",
            PermissionType.EXCLUDE: "Permiso que excluye el acceso"
        }
        return type_descriptions.get(self.permission_type, "Tipo desconocido")
    
    # MÉTODOS DE UTILIDAD
    
    def grants_access(self) -> bool:
        """Verificar si este permiso otorga acceso al menú"""
        return self.permission_type in [PermissionType.REQUIRED, PermissionType.ALTERNATIVE]
    
    def denies_access(self) -> bool:
        """Verificar si este permiso niega acceso al menú"""
        return self.permission_type == PermissionType.EXCLUDE
    
    def to_dict(self) -> dict:
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'menu_item_id': self.menu_item_id,
            'permission_id': self.permission_id,
            'permission_type': self.permission_type.value,
            'permission_code': self.permission_code,
            'permission_name': self.permission_name,
            'menu_code': self.menu_code,
            'menu_name': self.menu_name,
            'grants_access': self.grants_access(),
            'denies_access': self.denies_access(),
            'relationship_description': self.relationship_description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def to_dict_detailed(self) -> dict:
        """Convertir a diccionario con información detallada"""
        base_dict = self.to_dict()
        
        # Agregar información detallada del menú
        if self.menu_item:
            base_dict['menu_item'] = {
                'id': self.menu_item.id,
                'menu_code': self.menu_item.menu_code,
                'menu_name': self.menu_item.menu_name,
                'menu_url': self.menu_item.menu_url,
                'menu_type': self.menu_item.menu_type.value if self.menu_item.menu_type else None,
                'is_active': self.menu_item.is_active,
                'is_visible': self.menu_item.is_visible
            }
        
        # Agregar información detallada del permiso
        if self.permission:
            base_dict['permission'] = {
                'id': self.permission.id,
                'permission_code': self.permission.permission_code,
                'permission_name': self.permission.permission_name,
                'permission_group': getattr(self.permission, 'permission_group', None),
                'permission_description': getattr(self.permission, 'permission_description', None),
                'is_active': getattr(self.permission, 'is_active', True)
            }
        
        return base_dict
    
    @classmethod
    def create_bulk_assignments(cls, menu_item_id: int, permission_assignments: list):
        """Crear asignaciones masivas de permisos a un menú
        
        Args:
            menu_item_id: ID del menú
            permission_assignments: Lista de diccionarios con:
                - permission_id: ID del permiso
                - permission_type: Tipo de relación (opcional)
        
        Returns:
            Lista de instancias MenuItemPermission
        """
        assignments = []
        
        for assignment in permission_assignments:
            permission_id = assignment.get('permission_id')
            permission_type = assignment.get('permission_type', PermissionType.ALTERNATIVE)
            
            if not permission_id:
                continue
            
            # Convertir string a enum si es necesario
            if isinstance(permission_type, str):
                try:
                    permission_type = PermissionType(permission_type.upper())
                except ValueError:
                    permission_type = PermissionType.ALTERNATIVE
            
            new_assignment = cls(
                menu_item_id=menu_item_id,
                permission_id=permission_id,
                permission_type=permission_type
            )
            
            assignments.append(new_assignment)
        
        return assignments
    
    @classmethod
    def get_menu_permissions_summary(cls, menu_item_id: int, session):
        """Obtener resumen de permisos de un menú
        
        Args:
            menu_item_id: ID del menú
            session: Sesión de SQLAlchemy
            
        Returns:
            Diccionario con resumen de permisos
        """
        from sqlalchemy import func, select
        
        # Consultar todas las asignaciones del menú
        stmt = select(cls).where(cls.menu_item_id == menu_item_id)
        result = session.execute(stmt)
        assignments = result.scalars().all()
        
        # Agrupar por tipo
        summary = {
            'total_permissions': len(assignments),
            'required_permissions': [],
            'alternative_permissions': [],
            'exclude_permissions': [],
            'by_type_count': {
                'REQUIRED': 0,
                'ALTERNATIVE': 0,
                'EXCLUDE': 0
            }
        }
        
        for assignment in assignments:
            perm_info = {
                'id': assignment.permission_id,
                'code': assignment.permission_code,
                'name': assignment.permission_name
            }
            
            if assignment.permission_type == PermissionType.REQUIRED:
                summary['required_permissions'].append(perm_info)
                summary['by_type_count']['REQUIRED'] += 1
            elif assignment.permission_type == PermissionType.ALTERNATIVE:
                summary['alternative_permissions'].append(perm_info)
                summary['by_type_count']['ALTERNATIVE'] += 1
            elif assignment.permission_type == PermissionType.EXCLUDE:
                summary['exclude_permissions'].append(perm_info)
                summary['by_type_count']['EXCLUDE'] += 1
        
        return summary
    
    @classmethod
    def check_user_access(cls, menu_item_id: int, user_permissions: list, session):
        """Verificar si un usuario tiene acceso a un menú basado en permisos
        
        Args:
            menu_item_id: ID del menú
            user_permissions: Lista de códigos de permisos del usuario
            session: Sesión de SQLAlchemy
            
        Returns:
            Tupla (has_access: bool, reason: str)
        """
        from sqlalchemy import select
        
        # Obtener todas las asignaciones del menú
        stmt = select(cls).where(cls.menu_item_id == menu_item_id)
        result = session.execute(stmt)
        assignments = result.scalars().all()
        
        if not assignments:
            return True, "Sin restricciones de permisos"
        
        # Verificar permisos de exclusión primero
        exclude_permissions = [
            a for a in assignments 
            if a.permission_type == PermissionType.EXCLUDE
        ]
        
        for exclude_assignment in exclude_permissions:
            if exclude_assignment.permission_code in user_permissions:
                return False, f"Acceso denegado por permiso de exclusión: {exclude_assignment.permission_code}"
        
        # Verificar permisos requeridos
        required_permissions = [
            a for a in assignments 
            if a.permission_type == PermissionType.REQUIRED
        ]
        
        for required_assignment in required_permissions:
            if required_assignment.permission_code not in user_permissions:
                return False, f"Falta permiso requerido: {required_assignment.permission_code}"
        
        # Verificar permisos alternativos
        alternative_permissions = [
            a for a in assignments 
            if a.permission_type == PermissionType.ALTERNATIVE
        ]
        
        if alternative_permissions:
            # Al menos uno de los permisos alternativos debe estar presente
            has_alternative = any(
                a.permission_code in user_permissions 
                for a in alternative_permissions
            )
            
            if not has_alternative:
                alt_codes = [a.permission_code for a in alternative_permissions]
                return False, f"Falta al menos uno de los permisos alternativos: {', '.join(alt_codes)}"
        
        return True, "Acceso autorizado"
    
    def __repr__(self):
        return (
            f"<MenuItemPermission("
            f"menu_item_id={self.menu_item_id}, "
            f"permission_id={self.permission_id}, "
            f"type={self.permission_type.value}"
            f")>"
        )
    
    def __str__(self):
        return (
            f"Menu '{self.menu_code}' - "
            f"Permission '{self.permission_code}' "
            f"({self.permission_type.value})"
        )