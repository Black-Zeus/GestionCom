"""
Modelo SQLAlchemy para la tabla users
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Boolean, TIMESTAMP, DECIMAL, Index, event
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property

from .base import BaseModel, CommonValidators


class User(BaseModel):
    """
    Modelo SQLAlchemy para la tabla users
    
    Hereda de BaseModel que incluye:
    - id (BigInteger, PK, autoincrement)
    - created_at, updated_at (timestamps automáticos)
    - deleted_at (soft delete)
    - is_deleted, is_active_record (hybrid properties)
    """
    
    __tablename__ = "users"
    
    # ==========================================
    # CAMPOS DE IDENTIFICACIÓN
    # ==========================================
    
    username = Column(
        String(50),
        nullable=False,
        unique=True,
        comment="Nombre de usuario único"
    )
    
    email = Column(
        String(255),
        nullable=False,
        unique=True,
        comment="Correo electrónico único"
    )
    
    # ==========================================
    # CAMPOS DE AUTENTICACIÓN
    # ==========================================
    
    password_hash = Column(
        String(255),  # bcrypt puede ser más largo que SHA-256
        nullable=False,
        comment="Hash de contraseña usando bcrypt"
    )
    
    secret = Column(
        String(64),
        nullable=True,  # Nullable para usuarios existentes
        comment="Secret individual del usuario para JWT doble secreto"
    )
    
    # ==========================================
    # INFORMACIÓN PERSONAL
    # ==========================================
    
    first_name = Column(
        String(100),
        nullable=False,
        comment="Nombre del usuario"
    )
    
    last_name = Column(
        String(100),
        nullable=False,
        comment="Apellido del usuario"
    )
    
    phone = Column(
        String(20),
        nullable=True,
        comment="Número de teléfono"
    )
    
    # ==========================================
    # ESTADO Y CONTROL
    # ==========================================
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el usuario está activo"
    )
    
    # ==========================================
    # CAMPOS DE TRACKING DE AUTENTICACIÓN
    # ==========================================
    
    last_login_at = Column(
        TIMESTAMP,
        nullable=True,
        comment="Última vez que el usuario se conectó"
    )
    
    password_changed_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Última vez que se cambió la contraseña"
    )
    
    # ==========================================
    # CAMPOS ESPECÍFICOS DEL NEGOCIO
    # ==========================================
    
    petty_cash_limit = Column(
        DECIMAL(15, 2),
        nullable=True,
        comment="Límite máximo para gastos de caja chica individual"
    )
    
    # ==========================================
    # ÍNDICES PERSONALIZADOS
    # ==========================================
    
    __table_args__ = (
        Index('idx_username', 'username'),
        Index('idx_email', 'email'),
        Index('idx_secret', 'secret'),
        Index('idx_is_active', 'is_active'),
        Index('idx_email_active', 'email', 'is_active'),
        Index('idx_username_active', 'username', 'is_active'),
        Index('idx_last_login', 'last_login_at'),
        Index('idx_password_changed', 'password_changed_at'),
    )
    
    # ==========================================
    # RELACIONES (comentadas hasta implementar otros modelos)
    # ==========================================
    
    # user_roles: Mapped[List["UserRole"]] = relationship(
    #     "UserRole",
    #     back_populates="user",
    #     cascade="all, delete-orphan",
    #     lazy="select"  # Lazy loading por defecto
    # )
    
    # user_permissions: Mapped[List["UserPermission"]] = relationship(
    #     "UserPermission",
    #     back_populates="user",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # user_warehouse_access: Mapped[List["UserWarehouseAccess"]] = relationship(
    #     "UserWarehouseAccess",
    #     back_populates="user",
    #     cascade="all, delete-orphan",
    #     lazy="select"
    # )
    
    # ==========================================
    # VALIDADORES
    # ==========================================
    
    @validates('email')
    def validate_email(self, key, email):
        """Validar y normalizar email"""
        return CommonValidators.validate_email(email)
    
    @validates('username')
    def validate_username(self, key, username):
        """Validar y normalizar username"""
        return CommonValidators.validate_username(username)
    
    @validates('phone')
    def validate_phone(self, key, phone):
        """Validar y normalizar teléfono"""
        return CommonValidators.validate_phone(phone)
    
    @validates('first_name')
    def validate_first_name(self, key, first_name):
        """Validar nombre"""
        return CommonValidators.validate_string_length(
            first_name, min_length=1, max_length=100, field_name="Nombre"
        )
    
    @validates('last_name')
    def validate_last_name(self, key, last_name):
        """Validar apellido"""
        return CommonValidators.validate_string_length(
            last_name, min_length=1, max_length=100, field_name="Apellido"
        )
    
    @validates('petty_cash_limit')
    def validate_petty_cash_limit(self, key, limit):
        """Validar límite de caja chica"""
        if limit is not None and limit < 0:
            raise ValueError("El límite de caja chica no puede ser negativo")
        return limit
    
    # ==========================================
    # PROPIEDADES HÍBRIDAS
    # ==========================================
    
    @hybrid_property
    def full_name(self) -> str:
        """Nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip()
    
    @full_name.expression
    def full_name(cls):
        """Expresión SQL para full_name"""
        from sqlalchemy import func
        return func.concat(cls.first_name, ' ', cls.last_name)
    
    @hybrid_property
    def display_name(self) -> str:
        """Nombre para mostrar en la UI"""
        return f"{self.full_name} ({self.username})"
    
    @hybrid_property
    def can_login(self) -> bool:
        """Verificar si el usuario puede hacer login"""
        return self.is_active and not self.is_deleted
    
    @can_login.expression
    def can_login(cls):
        """Expresión SQL para can_login"""
        return (cls.is_active == True) & (cls.deleted_at.is_(None))
    
    @hybrid_property
    def days_since_password_change(self) -> Optional[int]:
        """Días desde el último cambio de contraseña"""
        if not self.password_changed_at:
            return None
        
        delta = datetime.now(timezone.utc) - self.password_changed_at
        return delta.days
    
    # ==========================================
    # MÉTODOS DE INSTANCIA
    # ==========================================
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}', is_active={self.is_active})>"
    
    def __str__(self) -> str:
        return self.display_name
    
    def set_password_changed(self):
        """Marcar que la contraseña fue cambiada ahora"""
        self.password_changed_at = datetime.now(timezone.utc)
    
    def update_last_login(self):
        """Actualizar timestamp de último login"""
        self.last_login_at = datetime.now(timezone.utc)
    
    def is_password_expired(self, days_limit: int = 90) -> bool:
        """
        Verificar si la contraseña ha expirado
        
        Args:
            days_limit: Días límite para expiración (0 = nunca expira)
        """
        if days_limit <= 0 or not self.password_changed_at:
            return False
        
        expiry_date = self.password_changed_at + timedelta(days=days_limit)
        return datetime.now(timezone.utc) > expiry_date
    
    def can_access_login(self) -> tuple[bool, str]:
        """
        Verificar si el usuario puede acceder al sistema
        
        Returns:
            Tuple (can_access, reason)
        """
        if self.is_deleted:
            return False, "Usuario eliminado"
        
        if not self.is_active:
            return False, "Usuario inactivo"
        
        return True, "OK"
    
    def get_security_info(self) -> Dict[str, Any]:
        """
        Obtener información de seguridad del usuario (para logs)
        """
        return {
            "user_id": self.id,
            "username": self.username,
            "email_masked": self._mask_email(),
            "is_active": self.is_active,
            "last_login": self.last_login_at.isoformat() if self.last_login_at else None,
            "password_age_days": self.days_since_password_change
        }
    
    def _mask_email(self) -> str:
        """Enmascarar email para logs de seguridad"""
        try:
            username, domain = self.email.split('@')
            masked_username = username[0] + '*' * (len(username) - 1)
            
            domain_parts = domain.split('.')
            if len(domain_parts) >= 2:
                masked_domain = domain_parts[0][0] + '*' * (len(domain_parts[0]) - 1)
                masked_domain += '.' + domain_parts[-1]
            else:
                masked_domain = domain
            
            return f"{masked_username}@{masked_domain}"
        except Exception:
            return "***@***.***"
    
    # ==========================================
    # MÉTODOS DE CLASE
    # ==========================================
    
    @classmethod
    def create_new_user(
        cls,
        username: str,
        email: str,
        password_hash: str,
        first_name: str,
        last_name: str,
        secret: str,
        phone: Optional[str] = None,
        is_active: bool = True,
        petty_cash_limit: Optional[float] = None
    ) -> "User":
        """
        Factory method para crear un nuevo usuario
        """
        return cls(
            username=username,
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            secret=secret,
            phone=phone,
            is_active=is_active,
            petty_cash_limit=petty_cash_limit,
            password_changed_at=datetime.now(timezone.utc)
        )
    
    # ==========================================
    # MÉTODOS PARA CONVERSIÓN
    # ==========================================
    
    def to_dict(self, include_sensitive: bool = False, exclude_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Convertir usuario a diccionario con opciones de seguridad
        
        Args:
            include_sensitive: Si incluir campos sensibles (password_hash, secret)
            exclude_fields: Campos adicionales a excluir
        """
        exclude_fields = exclude_fields or []
        
        # Campos sensibles que se excluyen por defecto
        if not include_sensitive:
            exclude_fields.extend(['password_hash', 'secret'])
        
        # Usar método base y agregar campos calculados
        base_dict = super().to_dict(exclude_none=True, exclude_fields=exclude_fields)
        
        # Agregar propiedades calculadas
        base_dict.update({
            'full_name': self.full_name,
            'display_name': self.display_name,
            'can_login': self.can_login,
            'days_since_password_change': self.days_since_password_change,
            'is_password_expired': self.is_password_expired(),
            'petty_cash_limit': float(self.petty_cash_limit) if self.petty_cash_limit else None
        })
        
        return base_dict
    
    def to_auth_dict(self) -> Dict[str, Any]:
        """
        Diccionario específico para uso en autenticación JWT
        """
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'can_login': self.can_login,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
        }
    
    def validate(self) -> tuple[bool, List[str]]:
        """
        Validación completa del modelo Usuario
        
        Returns:
            Tuple (is_valid, errors)
        """
        errors = []
        
        # Validaciones básicas del modelo base
        base_valid, base_errors = super().validate()
        errors.extend(base_errors)
        
        # Validaciones específicas del usuario
        if not self.username:
            errors.append("Username es requerido")
        elif len(self.username) < 3:
            errors.append("Username debe tener al menos 3 caracteres")
        
        if not self.email:
            errors.append("Email es requerido")
        elif '@' not in self.email:
            errors.append("Email debe tener formato válido")
        
        if not self.first_name:
            errors.append("Nombre es requerido")
        
        if not self.last_name:
            errors.append("Apellido es requerido")
        
        if not self.password_hash:
            errors.append("Hash de contraseña es requerido")
        
        # Validación de límite de caja chica
        if self.petty_cash_limit is not None and self.petty_cash_limit < 0:
            errors.append("Límite de caja chica no puede ser negativo")
        
        return len(errors) == 0, errors


# ==========================================
# EVENT LISTENERS ESPECÍFICOS PARA USER
# ==========================================

@event.listens_for(User, 'before_insert')
def generate_user_secret_if_missing(mapper, connection, target):
    """
    Generar secret automáticamente si no se proporciona al crear usuario
    """
    if not target.secret:
        from core.security import UserSecretManager
        target.secret = UserSecretManager.generate_user_secret()


@event.listens_for(User, 'before_update')
def update_password_timestamp(mapper, connection, target):
    """
    Actualizar timestamp si se cambió la contraseña
    """
    # Obtener estado anterior del objeto
    state = target._sa_instance_state
    history = state.get_history('password_hash', True)
    
    # Si el password_hash cambió, actualizar timestamp
    if history.has_changes():
        target.password_changed_at = datetime.now(timezone.utc)


# ==========================================
# QUERY HELPERS ESPECÍFICOS PARA USER
# ==========================================

class UserQueryHelpers:
    """
    Helpers para queries comunes de usuarios
    """
    
    @staticmethod
    def active_users(query):
        """Filtrar solo usuarios activos y no eliminados"""
        return query.filter(User.is_active == True, User.deleted_at.is_(None))
    
    @staticmethod
    def by_username_or_email(query, identifier: str):
        """Buscar por username o email"""
        from sqlalchemy import or_
        return query.filter(
            or_(
                User.username == identifier.lower(),
                User.email == identifier.lower()
            )
        )
    
    @staticmethod
    def login_eligible(query):
        """Usuarios que pueden hacer login"""
        return query.filter(User.can_login == True)
    
    @staticmethod
    def password_expired(query, days_limit: int = 90):
        """Usuarios con contraseña expirada"""
        if days_limit <= 0:
            return query.filter(False)  # Nunca expira
        
        from sqlalchemy import func
        expiry_date = func.date_add(User.password_changed_at, text(f'INTERVAL {days_limit} DAY'))
        return query.filter(func.now() > expiry_date)
    
    @staticmethod
    def recent_logins(query, days: int = 30):
        """Usuarios con login reciente"""
        from sqlalchemy import func
        cutoff_date = func.date_sub(func.now(), text(f'INTERVAL {days} DAY'))
        return query.filter(User.last_login_at >= cutoff_date)


# ==========================================
# SCOPES PREDEFINIDOS
# ==========================================

class UserScopes:
    """
    Scopes predefinidos para queries comunes
    """
    
    @staticmethod
    def active():
        """Scope para usuarios activos"""
        from sqlalchemy.orm import Query
        return lambda query: UserQueryHelpers.active_users(query)
    
    @staticmethod
    def can_login():
        """Scope para usuarios que pueden hacer login"""
        return lambda query: UserQueryHelpers.login_eligible(query)
    
    @staticmethod
    def with_recent_activity(days: int = 30):
        """Scope para usuarios con actividad reciente"""
        return lambda query: UserQueryHelpers.recent_logins(query, days)