"""
volumes/backend-api/database/models/base.py
Base declarativa y mixins simples para todos los modelos
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Column, BigInteger, TIMESTAMP, Boolean, event
from sqlalchemy.ext.declarative import declared_attr, declarative_base
from sqlalchemy.ext.hybrid import hybrid_property

# ==========================================
# BASE DECLARATIVA
# ==========================================

Base = declarative_base()

# ==========================================
# MIXINS BÁSICOS
# ==========================================

class TimestampMixin:
    """Mixin para timestamps automáticos"""
    
    created_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Fecha de creación del registro"
    )
    
    updated_at = Column(
        TIMESTAMP,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        comment="Fecha de última actualización del registro"
    )


class SoftDeleteMixin:
    """Mixin para soft delete"""
    
    deleted_at = Column(
        TIMESTAMP,
        nullable=True,
        comment="Fecha de eliminación lógica"
    )
    
    @hybrid_property
    def is_deleted(self) -> bool:
        """Verificar si está eliminado"""
        return self.deleted_at is not None
    
    @is_deleted.expression
    def is_deleted(cls):
        return cls.deleted_at.isnot(None)
    
    def soft_delete(self):
        """Eliminar registro lógicamente"""
        self.deleted_at = datetime.now(timezone.utc)


class PrimaryKeyMixin:
    """Mixin para primary key estándar"""
    
    @declared_attr
    def id(cls):
        return Column(
            BigInteger,
            primary_key=True,
            autoincrement=True,
            comment=f"ID único de {cls.__tablename__}"
        )


class ActiveStatusMixin:
    """Mixin para estado activo/inactivo"""
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Si el registro está activo"
    )


# ==========================================
# MODELO BASE PRINCIPAL
# ==========================================

class BaseModel(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Modelo base que incluye:
    - id (BigInteger, PK, autoincrement)
    - created_at, updated_at (timestamps automáticos)  
    - deleted_at (soft delete)
    - is_deleted (hybrid property)
    """
    __abstract__ = True
    
    def __repr__(self) -> str:
        """Representación string del modelo"""
        class_name = self.__class__.__name__
        if hasattr(self, 'id') and self.id:
            return f"<{class_name}(id={self.id})>"
        return f"<{class_name}(new)>"
    
    def to_dict(self, exclude_fields: Optional[list] = None) -> Dict[str, Any]:
        """Convertir modelo a diccionario básico"""
        exclude_fields = exclude_fields or []
        result = {}
        
        for column in self.__table__.columns:
            field_name = column.name
            if field_name in exclude_fields:
                continue
                
            value = getattr(self, field_name, None)
            
            # Convertir datetime a ISO string
            if isinstance(value, datetime):
                value = value.isoformat()
            
            result[field_name] = value
        
        return result


# ==========================================
# MODELO BASE SIMPLE (sin soft delete)
# ==========================================

class SimpleBaseModel(Base, PrimaryKeyMixin, TimestampMixin):
    """
    Modelo base simple sin soft delete
    Para tablas que no necesitan eliminación lógica
    """
    __abstract__ = True
    
    def __repr__(self) -> str:
        class_name = self.__class__.__name__
        if hasattr(self, 'id') and self.id:
            return f"<{class_name}(id={self.id})>"
        return f"<{class_name}(new)>"


# ==========================================
# EVENT LISTENERS GLOBALES
# ==========================================

@event.listens_for(BaseModel, 'before_update', propagate=True)
def update_timestamp(mapper, connection, target):
    """Actualizar timestamp automáticamente"""
    if hasattr(target, 'updated_at'):
        target.updated_at = datetime.now(timezone.utc)


@event.listens_for(BaseModel, 'before_insert', propagate=True)
def set_creation_timestamp(mapper, connection, target):
    """Establecer timestamp de creación"""
    now = datetime.now(timezone.utc)
    
    if hasattr(target, 'created_at') and target.created_at is None:
        target.created_at = now
    
    if hasattr(target, 'updated_at') and target.updated_at is None:
        target.updated_at = now


# ==========================================
# VALIDADORES COMUNES
# ==========================================

class CommonValidators:
    """Validadores comunes reutilizables"""
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validar y normalizar email"""
        if not email:
            raise ValueError("Email es requerido")
        
        email = email.strip().lower()
        
        if '@' not in email:
            raise ValueError("Formato de email inválido")
        
        if len(email) > 255:
            raise ValueError("Email demasiado largo")
        
        return email
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validar y normalizar username"""
        if not username:
            raise ValueError("Username es requerido")
        
        username = username.strip().lower()
        
        if len(username) < 3:
            raise ValueError("Username debe tener al menos 3 caracteres")
        
        if len(username) > 50:
            raise ValueError("Username demasiado largo")
        
        return username
    
    @staticmethod
    def validate_code(code: str, min_length: int = 2, max_length: int = 50, field_name: str = "Código") -> str:
        """Validar códigos alfanuméricos"""
        if not code:
            raise ValueError(f"{field_name} es requerido")
        
        code = code.strip().upper()
        
        if len(code) < min_length:
            raise ValueError(f"{field_name} debe tener al menos {min_length} caracteres")
        
        if len(code) > max_length:
            raise ValueError(f"{field_name} no puede tener más de {max_length} caracteres")
        
        import re
        if not re.match(r'^[A-Z0-9_-]+$', code):
            raise ValueError(f"{field_name} solo puede contener letras, números, guiones y guiones bajos")
        
        return code
    
    @staticmethod
    def validate_string_length(value: str, min_length: int = 0, max_length: int = None, field_name: str = "Campo") -> str:
        """Validar longitud de string"""
        if not value and min_length > 0:
            raise ValueError(f"{field_name} es requerido")
        
        if not value:
            return value
        
        value = value.strip()
        
        if len(value) < min_length:
            raise ValueError(f"{field_name} debe tener al menos {min_length} caracteres")
        
        if max_length and len(value) > max_length:
            raise ValueError(f"{field_name} no puede tener más de {max_length} caracteres")
        
        return value