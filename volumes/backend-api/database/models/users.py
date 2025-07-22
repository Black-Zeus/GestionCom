"""
volumes/backend-api/database/models/users.py
Modelo SQLAlchemy para la tabla users
"""
from sqlalchemy import Column, String, Boolean, CHAR, Index, DateTime
from sqlalchemy.orm import validates
from sqlalchemy.sql import func
from datetime import datetime
import hashlib
import secrets
import re

from .base import BaseModel, CommonValidators
from sqlalchemy.orm import relationship


class User(BaseModel):
    """Modelo para usuarios del sistema"""
    
    __tablename__ = "users"
    
    # CAMPOS PRINCIPALES
    
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
        comment="Email único del usuario"
    )
    
    password_hash = Column(
        CHAR(64),
        nullable=False,
        comment="Hash SHA-256 de la contraseña"
    )
    
    secret = Column(
        String(64),
        nullable=True,
        comment="Secret individual del usuario para JWT doble secreto"
    )
    
    # INFORMACIÓN PERSONAL
    
    first_name = Column(
        String(100),
        nullable=False,
        comment="Nombre(s) del usuario"
    )
    
    last_name = Column(
        String(100),
        nullable=False,
        comment="Apellido(s) del usuario"
    )
    
    phone = Column(
        String(20),
        nullable=True,
        comment="Teléfono de contacto"
    )
    
    # CAMPOS DE CONTROL
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el usuario está activo"
    )
    
    # CAMPOS DE SEGURIDAD Y AUDITORÍA
    
    last_login_at = Column(
        DateTime,
        nullable=True,
        comment="Fecha y hora del último login"
    )
    
    last_login_ip = Column(
        String(45),
        nullable=True,
        comment="IP del último login"
    )
    
    password_changed_at = Column(
        DateTime,
        nullable=False,
        default=func.current_timestamp(),
        comment="Fecha del último cambio de contraseña"
    )
    
    # LÍMITES Y CONFIGURACIONES
    
    petty_cash_limit = Column(
        String(15),  # Decimal(15,2) - usando String temporalmente para evitar dependencias
        nullable=True,
        comment="Límite máximo para gastos de caja chica individual"
    )
    
    # ÍNDICES
    
    __table_args__ = (
        Index('idx_username', 'username'),
        Index('idx_email', 'email'),
        Index('idx_is_active', 'is_active'),
        Index('idx_deleted_at', 'deleted_at'),
        Index('idx_secret', 'secret'),
        Index('idx_users_secret', 'secret'),
        Index('idx_users_login_lookup', 'username', 'email', 'is_active', 'deleted_at'),
        Index('idx_users_active_status', 'is_active', 'deleted_at'),
    )
    
    # VALIDADORES
    
    @validates('username')
    def validate_username(self, key, username):
        """Validar nombre de usuario"""
        if not username:
            raise ValueError("Nombre de usuario es requerido")
        
        username = username.strip().lower()
        
        # Solo letras, números, puntos y guiones bajos
        if not re.match(r'^[a-z0-9._]+$', username):
            raise ValueError("Username solo puede contener letras, números, puntos y guiones bajos")
        
        if len(username) < 3:
            raise ValueError("Username debe tener al menos 3 caracteres")
        
        if len(username) > 50:
            raise ValueError("Username no puede tener más de 50 caracteres")
        
        # No puede empezar o terminar con punto o guión bajo
        if username.startswith(('.', '_')) or username.endswith(('.', '_')):
            raise ValueError("Username no puede empezar o terminar con punto o guión bajo")
        
        return username
    
    @validates('email')
    def validate_email(self, key, email):
        """Validar email"""
        if not email:
            raise ValueError("Email es requerido")
        
        email = email.strip().lower()
        
        # Validación básica de email
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValueError("Formato de email inválido")
        
        if len(email) > 255:
            raise ValueError("Email no puede tener más de 255 caracteres")
        
        return email
    
    @validates('first_name')
    def validate_first_name(self, key, first_name):
        """Validar nombre"""
        return CommonValidators.validate_string_length(
            first_name, 
            min_length=2, 
            max_length=100, 
            field_name="Nombre"
        )
    
    @validates('last_name')
    def validate_last_name(self, key, last_name):
        """Validar apellido"""
        return CommonValidators.validate_string_length(
            last_name, 
            min_length=2, 
            max_length=100, 
            field_name="Apellido"
        )
    
    @validates('phone')
    def validate_phone(self, key, phone):
        """Validar teléfono"""
        if not phone:
            return None
        
        phone = phone.strip()
        
        # Formato chileno básico: +56912345678 o 912345678
        if not re.match(r'^(\+56)?[0-9]{8,9}$', phone):
            raise ValueError("Formato de teléfono inválido (formato chileno)")
        
        if len(phone) > 20:
            raise ValueError("Teléfono no puede tener más de 20 caracteres")
        
        return phone
    
    @validates('password_hash')
    def validate_password_hash(self, key, password_hash):
        """Validar hash de contraseña"""
        if not password_hash:
            raise ValueError("Hash de contraseña es requerido")
        
        # Debe ser exactamente 64 caracteres (SHA-256)
        if len(password_hash) != 64:
            raise ValueError("Hash de contraseña debe tener exactamente 64 caracteres")
        
        # Solo caracteres hexadecimales
        if not re.match(r'^[a-f0-9]{64}$', password_hash.lower()):
            raise ValueError("Hash de contraseña debe ser hexadecimal válido")
        
        return password_hash.lower()
    
    @validates('secret')
    def validate_secret(self, key, secret):
        """Validar secret JWT"""
        if not secret:
            return None
        
        secret = secret.strip()
        
        if len(secret) > 64:
            raise ValueError("Secret no puede tener más de 64 caracteres")
        
        return secret
    
    @validates('last_login_ip')
    def validate_last_login_ip(self, key, ip):
        """Validar IP de último login"""
        if not ip:
            return None
        
        ip = ip.strip()
        
        # Validación básica de IPv4 o IPv6
        if len(ip) > 45:
            raise ValueError("IP no puede tener más de 45 caracteres")
        
        return ip
    
    # RELACIONES
    
    # Relación con roles (muchos a muchos a través de user_roles)
    roles = relationship(
        "Role",
        secondary="user_roles",
        primaryjoin="User.id == user_roles.c.user_id",
        secondaryjoin="Role.id == user_roles.c.role_id",
        back_populates="users",
        lazy="select"
    )
    
    # Relación con permisos directos (muchos a muchos a través de user_permissions)
    direct_permissions = relationship(
        "Permission",
        secondary="user_permissions", 
        primaryjoin="User.id == user_permissions.c.user_id",
        secondaryjoin="Permission.id == user_permissions.c.permission_id",
        back_populates="users_with_direct_permission",
        lazy="select"
    )
    
    # Relación con accesos a bodegas (uno a muchos)
    warehouse_accesses = relationship(
        "UserWarehouseAccess",
        foreign_keys="UserWarehouseAccess.user_id",
        back_populates="user", 
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    # Relación con bodegas donde es responsable (uno a muchos)
    responsible_warehouses = relationship(
        "Warehouse",
        foreign_keys="Warehouse.responsible_user_id",
        back_populates="responsible_user",
        lazy="select"
    )

    # Relación con favoritos de menú
    menu_favorites = relationship(
        "UserMenuFavorite",
        foreign_keys="UserMenuFavorite.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select"
    )
    
    # ==========================================
    # RELACIONES COMENTADAS - MODELOS PRÓXIMOS
    # ==========================================
    
    # TODO: Descomentar cuando se agreguen estos modelos
    
    # # Registros de auditoría de permisos realizados por este usuario
    # permission_audit_actions = relationship(
    #     "PermissionAuditLog",
    #     foreign_keys="PermissionAuditLog.performed_by_user_id",
    #     back_populates="performed_by_user",
    #     lazy="select"
    # )
    
    # # Registros de auditoría de permisos donde este usuario fue el objetivo
    # permission_audit_targets = relationship(
    #     "PermissionAuditLog",
    #     foreign_keys="PermissionAuditLog.target_user_id", 
    #     back_populates="target_user",
    #     lazy="select"
    # )
    
    # # Clientes creados por este usuario
    # created_customers = relationship(
    #     "Customer",
    #     foreign_keys="Customer.created_by_user_id",
    #     back_populates="created_by_user",
    #     lazy="select"
    # )
    
    # # Clientes donde es vendedor asignado
    # assigned_customers = relationship(
    #     "Customer",
    #     foreign_keys="Customer.sales_rep_user_id",
    #     back_populates="sales_rep_user", 
    #     lazy="select"
    # )
    
    # # Documentos creados por este usuario
    # created_documents = relationship(
    #     "Document",
    #     foreign_keys="Document.created_by_user_id",
    #     back_populates="created_by_user",
    #     lazy="select"
    # )
    
    # # Documentos aprobados por este usuario
    # approved_documents = relationship(
    #     "Document", 
    #     foreign_keys="Document.approved_by_user_id",
    #     back_populates="approved_by_user",
    #     lazy="select"
    # )
    
    # # Sesiones de caja como cajero
    # cashier_sessions = relationship(
    #     "CashRegisterSession",
    #     foreign_keys="CashRegisterSession.cashier_user_id",
    #     back_populates="cashier_user",
    #     lazy="select"
    # )
    
    # # Sesiones de caja como supervisor
    # supervisor_sessions = relationship(
    #     "CashRegisterSession",
    #     foreign_keys="CashRegisterSession.supervisor_user_id", 
    #     back_populates="supervisor_user",
    #     lazy="select"
    # )
    
    # MÉTODOS DE RELACIONES
    
    def set_password(self, password: str) -> None:
        """Establecer contraseña hasheada"""
        if not password:
            raise ValueError("Contraseña no puede estar vacía")
        
        if len(password) < 8:
            raise ValueError("Contraseña debe tener al menos 8 caracteres")
        
        # Generar hash SHA-256
        password_bytes = password.encode('utf-8')
        hash_object = hashlib.sha256(password_bytes)
        self.password_hash = hash_object.hexdigest()
        self.password_changed_at = datetime.utcnow()
    
    def verify_password(self, password: str) -> bool:
        """Verificar contraseña"""
        if not password or not self.password_hash:
            return False
        
        password_bytes = password.encode('utf-8')
        hash_object = hashlib.sha256(password_bytes)
        password_hash = hash_object.hexdigest()
        
        return password_hash == self.password_hash
    
    def generate_secret(self) -> str:
        """Generar nuevo secret JWT"""
        self.secret = secrets.token_hex(32)  # 64 caracteres hex
        return self.secret
    
    def update_last_login(self, ip_address: str = None) -> None:
        """Actualizar información de último login"""
        self.last_login_at = datetime.utcnow()
        if ip_address:
            self.last_login_ip = ip_address
    
    def has_role(self, role_code: str) -> bool:
        """Verificar si el usuario tiene un rol específico"""
        if not self.roles:
            return False
        
        role_code = role_code.upper().strip()
        return any(role.role_code == role_code for role in self.roles)

    def get_all_permissions(self) -> set:
        """Obtener todos los permisos del usuario (por roles + permisos directos)"""
        permissions = set()
        
        # Permisos por roles
        for role in self.roles:
            # Necesitarás agregar esta relación en Role cuando la implementes
            if hasattr(role, 'permissions'):
                for permission in role.permissions:
                    permissions.add(permission.permission_code)
        
        # Permisos directos (solo los GRANT activos)
        for user_permission in self.direct_permissions:
            # Si implementaste UserPermission con tipo GRANT/DENY
            if hasattr(user_permission, 'permission_type'):
                from .user_permissions import PermissionType
                if (user_permission.permission_type == PermissionType.GRANT and 
                    getattr(user_permission, 'is_active', True)):
                    permissions.add(user_permission.permission.permission_code)
            else:
                # Si no tienes tipos, solo agrega el permiso
                permissions.add(user_permission.permission_code)
        
        return permissions

    # PROPIEDADES
    
    @property
    def full_name(self) -> str:
        """Nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def display_name(self) -> str:
        """Nombre para mostrar en UI"""
        return f"{self.full_name} ({self.username})"
    
    @property
    def is_authenticated(self) -> bool:
        """Verificar si el usuario está autenticado (activo)"""
        return self.is_active and not self.deleted_at
    
    @property
    def initials(self) -> str:
        """Iniciales del usuario"""
        first_initial = self.first_name[0].upper() if self.first_name else ""
        last_initial = self.last_name[0].upper() if self.last_name else ""
        return f"{first_initial}{last_initial}"
    
    @property
    def has_recent_login(self) -> bool:
        """Verificar si ha tenido login reciente (últimos 30 días)"""
        if not self.last_login_at:
            return False
        
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        return self.last_login_at >= thirty_days_ago
    
    @property
    def password_age_days(self) -> int:
        """Días desde el último cambio de contraseña"""
        if not self.password_changed_at:
            return 0
        
        delta = datetime.utcnow() - self.password_changed_at
        return delta.days
    
    @property
    def role_names(self) -> list:
        """Lista de nombres de roles del usuario"""
        return [role.role_name for role in self.roles]
    
    @property
    def permission_codes(self) -> list:
        """Lista de códigos de permisos del usuario"""
        return list(self.get_all_permissions())
    
    @property
    def warehouse_count(self) -> int:
        """Cantidad de bodegas a las que tiene acceso"""
        return len(self.warehouse_accesses)
    
    @property
    def responsible_warehouse_count(self) -> int:
        """Cantidad de bodegas de las que es responsable"""
        return len(self.responsible_warehouses)
    
    @property
    def has_admin_role(self) -> bool:
        """Verificar si tiene rol de administrador"""
        return self.has_role('ADMIN') or self.has_role('SUPER_ADMIN')
    
    @property
    def has_manager_role(self) -> bool:
        """Verificar si tiene rol de gerente/manager"""
        return self.has_role('MANAGER') or self.has_admin_role
    
    @property
    def is_cashier(self) -> bool:
        """Verificar si es cajero"""
        return self.has_role('CASHIER')
    
    @property
    def is_supervisor(self) -> bool:
        """Verificar si es supervisor"""
        return self.has_role('SUPERVISOR') or self.has_manager_role
    
    # MÉTODOS DE UTILIDAD
    
    def to_dict_safe(self) -> dict:
        """Convertir a diccionario sin información sensible"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.full_name,
            'phone': self.phone,
            'is_active': self.is_active,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }