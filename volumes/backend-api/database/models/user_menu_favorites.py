"""
volumes/backend-api/database/models/user_menu_favorites.py
Modelo SQLAlchemy para la tabla user_menu_favorites
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.orm import validates, relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

from .base import BaseModel


class UserMenuFavorite(BaseModel):
    """Modelo para favoritos de menú por usuario"""
    
    __tablename__ = "user_menu_favorites"
    
    # CAMPOS PRINCIPALES
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Usuario propietario del favorito"
    )
    
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        comment="Elemento del menú marcado como favorito"
    )
    
    favorite_order = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Orden de aparición en la lista de favoritos"
    )
    
    created_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        comment="Fecha cuando se agregó a favoritos"
    )
    
    # ÍNDICES Y CONSTRAINTS
    
    __table_args__ = (
        # Constraint único: un usuario no puede tener el mismo menú como favorito dos veces
        UniqueConstraint(
            'user_id', 
            'menu_item_id', 
            name='uk_user_favorite'
        ),
        
        # Índices para optimizar consultas
        Index('idx_user_id', 'user_id'),
        Index('idx_menu_item_id', 'menu_item_id'),
        Index('idx_favorite_order', 'favorite_order'),
        Index('idx_user_order', 'user_id', 'favorite_order'),
        Index('idx_created_at', 'created_at'),
    )
    
    # VALIDADORES
    
    @validates('user_id')
    def validate_user_id(self, key, user_id):
        """Validar ID del usuario"""
        if not user_id:
            raise ValueError("ID del usuario es requerido")
        
        if not isinstance(user_id, int) or user_id <= 0:
            raise ValueError("ID del usuario debe ser un entero positivo")
        
        return user_id
    
    @validates('menu_item_id')
    def validate_menu_item_id(self, key, menu_item_id):
        """Validar ID del menú"""
        if not menu_item_id:
            raise ValueError("ID del menú es requerido")
        
        if not isinstance(menu_item_id, int) or menu_item_id <= 0:
            raise ValueError("ID del menú debe ser un entero positivo")
        
        return menu_item_id
    
    @validates('favorite_order')
    def validate_favorite_order(self, key, favorite_order):
        """Validar orden del favorito"""
        if favorite_order is None:
            return 0
        
        if not isinstance(favorite_order, int):
            raise ValueError("Orden del favorito debe ser un número entero")
        
        if favorite_order < 0:
            raise ValueError("Orden del favorito no puede ser negativo")
        
        if favorite_order > 9999:
            raise ValueError("Orden del favorito no puede ser mayor a 9999")
        
        return favorite_order
    
    @validates('created_at')
    def validate_created_at(self, key, created_at):
        """Validar fecha de creación"""
        if not created_at:
            return datetime.now(timezone.utc)
        
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError("Formato de fecha inválido")
        
        # No permitir fechas futuras
        if created_at > datetime.now(timezone.utc) + timedelta(minutes=1):
            raise ValueError("La fecha de creación no puede ser futura")
        
        return created_at
    
    # RELACIONES
    
    # Relación con User
    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="menu_favorites",
        lazy="select"
    )
    
    # Relación con MenuItem
    menu_item = relationship(
        "MenuItem",
        foreign_keys=[menu_item_id],
        back_populates="user_favorites",
        lazy="select"
    )
    
    # PROPIEDADES
    
    @property
    def username(self) -> Optional[str]:
        """Nombre del usuario propietario"""
        return self.user.username if self.user else None
    
    @property
    def user_full_name(self) -> Optional[str]:
        """Nombre completo del usuario"""
        return self.user.full_name if self.user else None
    
    @property
    def menu_code(self) -> Optional[str]:
        """Código del menú favorito"""
        return self.menu_item.menu_code if self.menu_item else None
    
    @property
    def menu_name(self) -> Optional[str]:
        """Nombre del menú favorito"""
        return self.menu_item.menu_name if self.menu_item else None
    
    @property
    def menu_url(self) -> Optional[str]:
        """URL del menú favorito"""
        return self.menu_item.menu_url if self.menu_item else None
    
    @property
    def menu_icon(self) -> Optional[str]:
        """Icono del menú favorito"""
        return self.menu_item.icon_name if self.menu_item else None
    
    @property
    def menu_icon_color(self) -> Optional[str]:
        """Color del icono del menú"""
        return self.menu_item.icon_color if self.menu_item else None
    
    @property
    def is_menu_active(self) -> bool:
        """Verificar si el menú favorito está activo"""
        return self.menu_item.is_active if self.menu_item else False
    
    @property
    def is_menu_visible(self) -> bool:
        """Verificar si el menú favorito es visible"""
        return self.menu_item.is_visible if self.menu_item else False
    
    @property
    def is_accessible(self) -> bool:
        """Verificar si el menú favorito es accesible (activo y visible)"""
        return self.is_menu_active and self.is_menu_visible
    
    @property
    def added_time_ago(self) -> str:
        """Tiempo transcurrido desde que se agregó a favoritos"""
        if not self.created_at:
            return "Desconocido"
        
        now = datetime.now(timezone.utc)
        if self.created_at.tzinfo is None:
            created_time = self.created_at.replace(tzinfo=timezone.utc)
        else:
            created_time = self.created_at
        
        delta = now - created_time
        
        if delta.days > 365:
            years = delta.days // 365
            return f"Hace {years} año{'s' if years != 1 else ''}"
        elif delta.days > 30:
            months = delta.days // 30
            return f"Hace {months} mes{'es' if months != 1 else ''}"
        elif delta.days > 0:
            return f"Hace {delta.days} día{'s' if delta.days != 1 else ''}"
        elif delta.seconds > 3600:
            hours = delta.seconds // 3600
            return f"Hace {hours} hora{'s' if hours != 1 else ''}"
        elif delta.seconds > 60:
            minutes = delta.seconds // 60
            return f"Hace {minutes} minuto{'s' if minutes != 1 else ''}"
        else:
            return "Hace unos segundos"
    
    @property
    def is_recent_favorite(self) -> bool:
        """Verificar si es un favorito reciente (últimos 7 días)"""
        if not self.created_at:
            return False
        
        now = datetime.now(timezone.utc)
        if self.created_at.tzinfo is None:
            created_time = self.created_at.replace(tzinfo=timezone.utc)
        else:
            created_time = self.created_at
        
        return (now - created_time) <= timedelta(days=7)
    
    @property
    def menu_level(self) -> Optional[int]:
        """Nivel jerárquico del menú favorito"""
        return self.menu_item.menu_level if self.menu_item else None
    
    @property
    def menu_parent_name(self) -> Optional[str]:
        """Nombre del menú padre"""
        if self.menu_item and self.menu_item.parent:
            return self.menu_item.parent.menu_name
        return None
    
    @property
    def menu_breadcrumb(self) -> List[Dict[str, Any]]:
        """Breadcrumb del menú favorito"""
        if not self.menu_item:
            return []
        
        return self.menu_item.breadcrumb
    
    # MÉTODOS DE UTILIDAD
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'menu_item_id': self.menu_item_id,
            'favorite_order': self.favorite_order,
            'username': self.username,
            'user_full_name': self.user_full_name,
            'menu_code': self.menu_code,
            'menu_name': self.menu_name,
            'menu_url': self.menu_url,
            'menu_icon': self.menu_icon,
            'menu_icon_color': self.menu_icon_color,
            'is_menu_active': self.is_menu_active,
            'is_menu_visible': self.is_menu_visible,
            'is_accessible': self.is_accessible,
            'added_time_ago': self.added_time_ago,
            'is_recent_favorite': self.is_recent_favorite,
            'menu_level': self.menu_level,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def to_dict_detailed(self) -> Dict[str, Any]:
        """Convertir a diccionario con información detallada"""
        base_dict = self.to_dict()
        
        # Agregar información detallada del usuario
        if self.user:
            base_dict['user'] = {
                'id': self.user.id,
                'username': self.user.username,
                'email': self.user.email,
                'full_name': self.user.full_name,
                'is_active': self.user.is_active
            }
        
        # Agregar información detallada del menú
        if self.menu_item:
            base_dict['menu_item'] = {
                'id': self.menu_item.id,
                'menu_code': self.menu_item.menu_code,
                'menu_name': self.menu_item.menu_name,
                'menu_description': self.menu_item.menu_description,
                'menu_url': self.menu_item.menu_url,
                'menu_type': self.menu_item.menu_type.value if self.menu_item.menu_type else None,
                'icon_name': self.menu_item.icon_name,
                'icon_color': self.menu_item.icon_color,
                'parent_id': self.menu_item.parent_id,
                'menu_level': self.menu_item.menu_level,
                'is_active': self.menu_item.is_active,
                'is_visible': self.menu_item.is_visible,
                'target_window': self.menu_item.target_window.value if self.menu_item.target_window else None
            }
        
        # Agregar breadcrumb
        base_dict['menu_breadcrumb'] = self.menu_breadcrumb
        base_dict['menu_parent_name'] = self.menu_parent_name
        
        return base_dict
    
    def to_dict_for_menu(self) -> Dict[str, Any]:
        """Convertir a diccionario optimizado para construcción de menús"""
        if not self.menu_item:
            return {}
        
        return {
            'id': self.menu_item.id,
            'menu_code': self.menu_item.menu_code,
            'menu_name': self.menu_item.menu_name,
            'menu_url': self.menu_item.menu_url,
            'icon_name': self.menu_item.icon_name,
            'icon_color': self.menu_item.icon_color,
            'target_window': self.menu_item.target_window.value if self.menu_item.target_window else 'SELF',
            'css_classes': self.menu_item.css_classes,
            'is_favorite': True,
            'favorite_order': self.favorite_order,
            'favorite_since': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def add_favorite(cls, user_id: int, menu_item_id: int, favorite_order: int = None):
        """Agregar menú a favoritos
        
        Args:
            user_id: ID del usuario
            menu_item_id: ID del menú
            favorite_order: Orden en la lista (opcional)
        
        Returns:
            Nueva instancia de UserMenuFavorite
        """
        if favorite_order is None:
            favorite_order = 0
        
        return cls(
            user_id=user_id,
            menu_item_id=menu_item_id,
            favorite_order=favorite_order,
            created_at=datetime.now(timezone.utc)
        )
    
    @classmethod
    def get_user_favorites(cls, user_id: int, active_only: bool = True, session=None):
        """Obtener favoritos de un usuario
        
        Args:
            user_id: ID del usuario
            active_only: Solo menús activos y visibles
            session: Sesión de SQLAlchemy
        
        Returns:
            Lista de favoritos ordenada
        """
        from sqlalchemy import select
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        stmt = (
            select(cls)
            .where(cls.user_id == user_id)
            .order_by(cls.favorite_order, cls.created_at)
        )
        
        if active_only:
            # Incluir join con menu_items para filtrar activos/visibles
            from .menu_items import MenuItem
            stmt = (
                stmt.join(MenuItem)
                .where(
                    MenuItem.is_active == True,
                    MenuItem.is_visible == True,
                    MenuItem.deleted_at.is_(None)
                )
            )
        
        result = session.execute(stmt)
        return result.scalars().all()
    
    @classmethod
    def get_favorite_by_user_menu(cls, user_id: int, menu_item_id: int, session=None):
        """Obtener favorito específico por usuario y menú
        
        Args:
            user_id: ID del usuario
            menu_item_id: ID del menú
            session: Sesión de SQLAlchemy
        
        Returns:
            Instancia de UserMenuFavorite o None
        """
        from sqlalchemy import select
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        stmt = select(cls).where(
            cls.user_id == user_id,
            cls.menu_item_id == menu_item_id
        )
        
        result = session.execute(stmt)
        return result.scalar_one_or_none()
    
    @classmethod
    def reorder_favorites(cls, user_id: int, ordered_menu_ids: List[int], session=None):
        """Reordenar favoritos de un usuario
        
        Args:
            user_id: ID del usuario
            ordered_menu_ids: Lista ordenada de IDs de menús
            session: Sesión de SQLAlchemy
        
        Returns:
            Número de favoritos reordenados
        """
        from sqlalchemy import select, update
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        # Obtener favoritos existentes
        existing_stmt = select(cls).where(cls.user_id == user_id)
        existing_result = session.execute(existing_stmt)
        existing_favorites = {fav.menu_item_id: fav for fav in existing_result.scalars().all()}
        
        updated_count = 0
        
        # Actualizar orden según la lista proporcionada
        for index, menu_item_id in enumerate(ordered_menu_ids):
            if menu_item_id in existing_favorites:
                new_order = (index + 1) * 10  # Espaciado de 10 para permitir inserciones
                
                if existing_favorites[menu_item_id].favorite_order != new_order:
                    update_stmt = (
                        update(cls)
                        .where(
                            cls.user_id == user_id,
                            cls.menu_item_id == menu_item_id
                        )
                        .values(favorite_order=new_order)
                    )
                    session.execute(update_stmt)
                    updated_count += 1
        
        return updated_count
    
    @classmethod
    def get_menu_popularity(cls, limit: int = 20, session=None):
        """Obtener menús más populares como favoritos
        
        Args:
            limit: Número de menús a retornar
            session: Sesión de SQLAlchemy
        
        Returns:
            Lista de menús con conteo de favoritos
        """
        from sqlalchemy import select, func
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        stmt = (
            select(
                cls.menu_item_id,
                func.count(cls.id).label('favorite_count'),
                func.count(func.distinct(cls.user_id)).label('unique_users')
            )
            .group_by(cls.menu_item_id)
            .order_by(func.count(cls.id).desc())
            .limit(limit)
        )
        
        result = session.execute(stmt)
        return result.all()
    
    @classmethod
    def get_user_favorite_stats(cls, user_id: int, session=None):
        """Obtener estadísticas de favoritos de un usuario
        
        Args:
            user_id: ID del usuario
            session: Sesión de SQLAlchemy
        
        Returns:
            Diccionario con estadísticas
        """
        from sqlalchemy import select, func
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        # Total de favoritos
        total_stmt = select(func.count(cls.id)).where(cls.user_id == user_id)
        total_result = session.execute(total_stmt)
        total_favorites = total_result.scalar()
        
        # Favoritos recientes (últimos 7 días)
        recent_date = datetime.now(timezone.utc) - timedelta(days=7)
        recent_stmt = (
            select(func.count(cls.id))
            .where(
                cls.user_id == user_id,
                cls.created_at >= recent_date
            )
        )
        recent_result = session.execute(recent_stmt)
        recent_favorites = recent_result.scalar()
        
        # Favorito más antiguo
        oldest_stmt = (
            select(cls.created_at)
            .where(cls.user_id == user_id)
            .order_by(cls.created_at.asc())
            .limit(1)
        )
        oldest_result = session.execute(oldest_stmt)
        oldest_favorite = oldest_result.scalar()
        
        return {
            'user_id': user_id,
            'total_favorites': total_favorites,
            'recent_favorites': recent_favorites,
            'oldest_favorite_date': oldest_favorite.isoformat() if oldest_favorite else None,
            'avg_favorites_per_month': 0,  # Se calcularía con más lógica
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    @classmethod
    def cleanup_invalid_favorites(cls, session=None):
        """Limpiar favoritos que apuntan a menús eliminados o inactivos
        
        Args:
            session: Sesión de SQLAlchemy
        
        Returns:
            Número de favoritos eliminados
        """
        from sqlalchemy import delete
        from .menu_items import MenuItem
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        # Eliminar favoritos de menús que ya no existen o están eliminados
        stmt = (
            delete(cls)
            .where(
                ~cls.menu_item_id.in_(
                    select(MenuItem.id).where(
                        MenuItem.deleted_at.is_(None)
                    )
                )
            )
        )
        
        result = session.execute(stmt)
        return result.rowcount
    
    @classmethod
    def bulk_add_favorites(cls, user_id: int, menu_item_ids: List[int], session=None):
        """Agregar múltiples menús a favoritos
        
        Args:
            user_id: ID del usuario
            menu_item_ids: Lista de IDs de menús
            session: Sesión de SQLAlchemy
        
        Returns:
            Lista de favoritos creados
        """
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        # Obtener favoritos existentes para evitar duplicados
        existing_stmt = select(cls.menu_item_id).where(cls.user_id == user_id)
        existing_result = session.execute(existing_stmt)
        existing_menu_ids = {row[0] for row in existing_result.all()}
        
        # Filtrar menús que no están ya en favoritos
        new_menu_ids = [mid for mid in menu_item_ids if mid not in existing_menu_ids]
        
        if not new_menu_ids:
            return []
        
        # Obtener el siguiente orden disponible
        max_order_stmt = (
            select(func.coalesce(func.max(cls.favorite_order), 0))
            .where(cls.user_id == user_id)
        )
        max_order_result = session.execute(max_order_stmt)
        max_order = max_order_result.scalar()
        
        # Crear nuevos favoritos
        new_favorites = []
        for i, menu_item_id in enumerate(new_menu_ids):
            favorite = cls.add_favorite(
                user_id=user_id,
                menu_item_id=menu_item_id,
                favorite_order=max_order + ((i + 1) * 10)
            )
            new_favorites.append(favorite)
        
        # Agregar a la sesión
        session.add_all(new_favorites)
        
        return new_favorites
    
    def move_to_position(self, new_order: int, session=None):
        """Mover favorito a nueva posición
        
        Args:
            new_order: Nueva posición en el orden
            session: Sesión de SQLAlchemy
        """
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        old_order = self.favorite_order
        self.favorite_order = new_order
        
        # Ajustar otros favoritos si es necesario
        if new_order != old_order:
            # Lógica para reajustar posiciones de otros elementos
            # se implementaría aquí si se requiere un orden estricto
            pass
    
    def __repr__(self):
        return (
            f"<UserMenuFavorite("
            f"user_id={self.user_id}, "
            f"menu_item_id={self.menu_item_id}, "
            f"order={self.favorite_order}"
            f")>"
        )
    
    def __str__(self):
        return (
            f"User '{self.username}' - Menu '{self.menu_code}' "
            f"(favorite #{self.favorite_order})"
        )