"""
volumes/backend-api/database/models/menu_access_log.py
Modelo SQLAlchemy para la tabla menu_access_log
"""
from sqlalchemy import Column, Integer, ForeignKey, String, Text, DateTime, Index
from sqlalchemy.orm import validates, relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import re

from .base import BaseModel, CommonValidators


class MenuAccessLog(BaseModel):
    """Modelo para log de accesos a elementos del menú"""
    
    __tablename__ = "menu_access_log"
    
    # CAMPOS PRINCIPALES
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Usuario que accedió al menú"
    )
    
    menu_item_id = Column(
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE"),
        nullable=False,
        comment="Elemento del menú accedido"
    )
    
    access_timestamp = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        comment="Fecha y hora del acceso"
    )
    
    # CAMPOS DE CONTEXTO
    
    ip_address = Column(
        String(45),
        nullable=True,
        comment="Dirección IP del acceso"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User Agent del navegador"
    )
    
    session_id = Column(
        String(255),
        nullable=True,
        comment="ID de sesión del usuario"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_user_id', 'user_id'),
        Index('idx_menu_item_id', 'menu_item_id'),
        Index('idx_access_timestamp', 'access_timestamp'),
        Index('idx_session_id', 'session_id'),
        Index('idx_ip_address', 'ip_address'),
        Index('idx_user_menu_timestamp', 'user_id', 'menu_item_id', 'access_timestamp'),
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
    
    @validates('access_timestamp')
    def validate_access_timestamp(self, key, access_timestamp):
        """Validar timestamp de acceso"""
        if not access_timestamp:
            return datetime.now(timezone.utc)
        
        if isinstance(access_timestamp, str):
            try:
                access_timestamp = datetime.fromisoformat(access_timestamp.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError("Formato de fecha inválido")
        
        # No permitir fechas futuras (más de 1 minuto en el futuro para compensar diferencias de reloj)
        future_limit = datetime.now(timezone.utc) + timedelta(minutes=1)
        if access_timestamp > future_limit:
            raise ValueError("La fecha de acceso no puede ser futura")
        
        # No permitir fechas muy antiguas (más de 5 años)
        past_limit = datetime.now(timezone.utc) - timedelta(days=365*5)
        if access_timestamp < past_limit:
            raise ValueError("La fecha de acceso es demasiado antigua")
        
        return access_timestamp
    
    @validates('ip_address')
    def validate_ip_address(self, key, ip_address):
        """Validar dirección IP"""
        if not ip_address:
            return None
        
        ip_address = ip_address.strip()
        
        # Validación básica de IPv4 o IPv6
        ipv4_pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
        ipv6_pattern = r'^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$'
        
        if not (re.match(ipv4_pattern, ip_address) or re.match(ipv6_pattern, ip_address)):
            # Permitir IPs especiales como localhost, private ranges, etc.
            special_ips = ['localhost', '127.0.0.1', '::1']
            if ip_address not in special_ips and not ip_address.startswith(('10.', '172.', '192.168.')):
                raise ValueError("Formato de dirección IP inválido")
        
        if len(ip_address) > 45:
            raise ValueError("Dirección IP no puede tener más de 45 caracteres")
        
        return ip_address
    
    @validates('user_agent')
    def validate_user_agent(self, key, user_agent):
        """Validar User Agent"""
        if not user_agent:
            return None
        
        user_agent = user_agent.strip()
        
        # Limpiar caracteres de control
        user_agent = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', user_agent)
        
        if len(user_agent) > 1000:  # Limitar tamaño para evitar ataques
            user_agent = user_agent[:1000]
        
        return user_agent
    
    @validates('session_id')
    def validate_session_id(self, key, session_id):
        """Validar ID de sesión"""
        if not session_id:
            return None
        
        session_id = session_id.strip()
        
        # Solo caracteres alfanuméricos y algunos especiales seguros
        if not re.match(r'^[a-zA-Z0-9\-_\.]+$', session_id):
            raise ValueError("ID de sesión contiene caracteres inválidos")
        
        if len(session_id) > 255:
            raise ValueError("ID de sesión no puede tener más de 255 caracteres")
        
        return session_id
    
    # RELACIONES
    
    # Relación con User
    user = relationship(
        "User",
        foreign_keys=[user_id],
        lazy="select"
    )
    
    # Relación con MenuItem
    menu_item = relationship(
        "MenuItem",
        foreign_keys=[menu_item_id],
        back_populates="access_logs",
        lazy="select"
    )
    
    # PROPIEDADES
    
    @property
    def username(self) -> Optional[str]:
        """Nombre de usuario que accedió"""
        return self.user.username if self.user else None
    
    @property
    def user_full_name(self) -> Optional[str]:
        """Nombre completo del usuario"""
        return self.user.full_name if self.user else None
    
    @property
    def menu_code(self) -> Optional[str]:
        """Código del menú accedido"""
        return self.menu_item.menu_code if self.menu_item else None
    
    @property
    def menu_name(self) -> Optional[str]:
        """Nombre del menú accedido"""
        return self.menu_item.menu_name if self.menu_item else None
    
    @property
    def menu_url(self) -> Optional[str]:
        """URL del menú accedido"""
        return self.menu_item.menu_url if self.menu_item else None
    
    @property
    def access_date(self) -> str:
        """Fecha de acceso en formato ISO"""
        return self.access_timestamp.isoformat() if self.access_timestamp else None
    
    @property
    def access_time_ago(self) -> str:
        """Tiempo transcurrido desde el acceso"""
        if not self.access_timestamp:
            return "Desconocido"
        
        now = datetime.now(timezone.utc)
        if self.access_timestamp.tzinfo is None:
            access_time = self.access_timestamp.replace(tzinfo=timezone.utc)
        else:
            access_time = self.access_timestamp
        
        delta = now - access_time
        
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
    def is_recent(self) -> bool:
        """Verificar si el acceso es reciente (últimas 24 horas)"""
        if not self.access_timestamp:
            return False
        
        now = datetime.now(timezone.utc)
        if self.access_timestamp.tzinfo is None:
            access_time = self.access_timestamp.replace(tzinfo=timezone.utc)
        else:
            access_time = self.access_timestamp
        
        return (now - access_time) <= timedelta(days=1)
    
    @property
    def is_today(self) -> bool:
        """Verificar si el acceso fue hoy"""
        if not self.access_timestamp:
            return False
        
        now = datetime.now(timezone.utc)
        if self.access_timestamp.tzinfo is None:
            access_time = self.access_timestamp.replace(tzinfo=timezone.utc)
        else:
            access_time = self.access_timestamp
        
        return access_time.date() == now.date()
    
    @property
    def browser_info(self) -> Dict[str, Optional[str]]:
        """Información del navegador extraída del User Agent"""
        if not self.user_agent:
            return {
                'browser': None,
                'version': None,
                'os': None,
                'device': None
            }
        
        ua = self.user_agent.lower()
        browser = None
        version = None
        os = None
        device = None
        
        # Detectar navegador
        if 'chrome' in ua and 'edg' not in ua:
            browser = 'Chrome'
            version_match = re.search(r'chrome/(\d+)', ua)
            if version_match:
                version = version_match.group(1)
        elif 'firefox' in ua:
            browser = 'Firefox'
            version_match = re.search(r'firefox/(\d+)', ua)
            if version_match:
                version = version_match.group(1)
        elif 'safari' in ua and 'chrome' not in ua:
            browser = 'Safari'
            version_match = re.search(r'version/(\d+)', ua)
            if version_match:
                version = version_match.group(1)
        elif 'edg' in ua:
            browser = 'Edge'
            version_match = re.search(r'edg/(\d+)', ua)
            if version_match:
                version = version_match.group(1)
        
        # Detectar sistema operativo
        if 'windows' in ua:
            os = 'Windows'
        elif 'mac' in ua:
            os = 'macOS'
        elif 'linux' in ua:
            os = 'Linux'
        elif 'android' in ua:
            os = 'Android'
        elif 'ios' in ua or 'iphone' in ua or 'ipad' in ua:
            os = 'iOS'
        
        # Detectar dispositivo
        if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
            device = 'Mobile'
        elif 'tablet' in ua or 'ipad' in ua:
            device = 'Tablet'
        else:
            device = 'Desktop'
        
        return {
            'browser': browser,
            'version': version,
            'os': os,
            'device': device
        }
    
    @property
    def location_info(self) -> Dict[str, Optional[str]]:
        """Información de ubicación basada en IP (placeholder para futura implementación)"""
        return {
            'country': None,
            'region': None,
            'city': None,
            'timezone': None,
            'is_internal': self.is_internal_ip
        }
    
    @property
    def is_internal_ip(self) -> bool:
        """Verificar si es una IP interna"""
        if not self.ip_address:
            return False
        
        internal_ranges = [
            '127.',      # Localhost
            '10.',       # Private Class A
            '172.16.',   # Private Class B
            '172.17.',   # Private Class B
            '172.18.',   # Private Class B
            '172.19.',   # Private Class B  
            '172.20.',   # Private Class B
            '172.21.',   # Private Class B
            '172.22.',   # Private Class B
            '172.23.',   # Private Class B
            '172.24.',   # Private Class B
            '172.25.',   # Private Class B
            '172.26.',   # Private Class B
            '172.27.',   # Private Class B
            '172.28.',   # Private Class B
            '172.29.',   # Private Class B
            '172.30.',   # Private Class B
            '172.31.',   # Private Class B
            '192.168.'   # Private Class C
        ]
        
        return any(self.ip_address.startswith(prefix) for prefix in internal_ranges)
    
    # MÉTODOS DE UTILIDAD
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'menu_item_id': self.menu_item_id,
            'access_timestamp': self.access_date,
            'ip_address': self.ip_address,
            'session_id': self.session_id,
            'username': self.username,
            'user_full_name': self.user_full_name,
            'menu_code': self.menu_code,
            'menu_name': self.menu_name,
            'menu_url': self.menu_url,
            'access_time_ago': self.access_time_ago,
            'is_recent': self.is_recent,
            'is_today': self.is_today,
            'is_internal_ip': self.is_internal_ip,
            'browser_info': self.browser_info,
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
                'menu_url': self.menu_item.menu_url,
                'menu_type': self.menu_item.menu_type.value if self.menu_item.menu_type else None,
                'parent_id': self.menu_item.parent_id,
                'menu_level': self.menu_item.menu_level
            }
        
        # Agregar información completa del User Agent
        base_dict['user_agent'] = self.user_agent
        base_dict['location_info'] = self.location_info
        
        return base_dict
    
    @classmethod
    def log_access(cls, user_id: int, menu_item_id: int, ip_address: str = None, 
                   user_agent: str = None, session_id: str = None):
        """Crear registro de acceso al menú
        
        Args:
            user_id: ID del usuario
            menu_item_id: ID del menú
            ip_address: IP del usuario (opcional)
            user_agent: User Agent (opcional)
            session_id: ID de sesión (opcional)
        
        Returns:
            Nueva instancia de MenuAccessLog
        """
        return cls(
            user_id=user_id,
            menu_item_id=menu_item_id,
            access_timestamp=datetime.now(timezone.utc),
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
    
    @classmethod
    def get_user_access_history(cls, user_id: int, limit: int = 50, session=None):
        """Obtener historial de accesos de un usuario
        
        Args:
            user_id: ID del usuario
            limit: Límite de registros
            session: Sesión de SQLAlchemy
        
        Returns:
            Lista de registros de acceso
        """
        from sqlalchemy import select
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        stmt = (
            select(cls)
            .where(cls.user_id == user_id)
            .order_by(cls.access_timestamp.desc())
            .limit(limit)
        )
        
        result = session.execute(stmt)
        return result.scalars().all()
    
    @classmethod
    def get_menu_access_stats(cls, menu_item_id: int, days: int = 30, session=None):
        """Obtener estadísticas de acceso a un menú
        
        Args:
            menu_item_id: ID del menú
            days: Días hacia atrás para analizar
            session: Sesión de SQLAlchemy
        
        Returns:
            Diccionario con estadísticas
        """
        from sqlalchemy import select, func, distinct
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        # Fecha límite
        date_limit = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Total de accesos
        total_stmt = (
            select(func.count(cls.id))
            .where(
                cls.menu_item_id == menu_item_id,
                cls.access_timestamp >= date_limit
            )
        )
        total_result = session.execute(total_stmt)
        total_accesses = total_result.scalar()
        
        # Usuarios únicos
        unique_users_stmt = (
            select(func.count(distinct(cls.user_id)))
            .where(
                cls.menu_item_id == menu_item_id,
                cls.access_timestamp >= date_limit
            )
        )
        unique_users_result = session.execute(unique_users_stmt)
        unique_users = unique_users_result.scalar()
        
        # Accesos de hoy
        today = datetime.now(timezone.utc).date()
        today_stmt = (
            select(func.count(cls.id))
            .where(
                cls.menu_item_id == menu_item_id,
                func.date(cls.access_timestamp) == today
            )
        )
        today_result = session.execute(today_stmt)
        today_accesses = today_result.scalar()
        
        return {
            'menu_item_id': menu_item_id,
            'period_days': days,
            'total_accesses': total_accesses,
            'unique_users': unique_users,
            'today_accesses': today_accesses,
            'avg_accesses_per_day': round(total_accesses / days, 2) if days > 0 else 0,
            'avg_accesses_per_user': round(total_accesses / unique_users, 2) if unique_users > 0 else 0,
            'generated_at': datetime.now(timezone.utc).isoformat()
        }
    
    @classmethod
    def get_popular_menus(cls, limit: int = 10, days: int = 30, session=None):
        """Obtener menús más populares
        
        Args:
            limit: Número de menús a retornar
            days: Días hacia atrás para analizar
            session: Sesión de SQLAlchemy
        
        Returns:
            Lista de menús con estadísticas de acceso
        """
        from sqlalchemy import select, func
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        date_limit = datetime.now(timezone.utc) - timedelta(days=days)
        
        stmt = (
            select(
                cls.menu_item_id,
                func.count(cls.id).label('access_count'),
                func.count(func.distinct(cls.user_id)).label('unique_users')
            )
            .where(cls.access_timestamp >= date_limit)
            .group_by(cls.menu_item_id)
            .order_by(func.count(cls.id).desc())
            .limit(limit)
        )
        
        result = session.execute(stmt)
        return result.all()
    
    @classmethod
    def cleanup_old_logs(cls, days_to_keep: int = 365, session=None):
        """Limpiar logs antiguos
        
        Args:
            days_to_keep: Días de logs a mantener
            session: Sesión de SQLAlchemy
        
        Returns:
            Número de registros eliminados
        """
        from sqlalchemy import delete
        
        if not session:
            raise ValueError("Se requiere sesión de base de datos")
        
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        
        stmt = delete(cls).where(cls.access_timestamp < cutoff_date)
        result = session.execute(stmt)
        
        return result.rowcount
    
    def __repr__(self):
        return (
            f"<MenuAccessLog("
            f"user_id={self.user_id}, "
            f"menu_item_id={self.menu_item_id}, "
            f"timestamp={self.access_timestamp}"
            f")>"
        )
    
    def __str__(self):
        return (
            f"User '{self.username}' accessed menu '{self.menu_code}' "
            f"at {self.access_time_ago}"
        )