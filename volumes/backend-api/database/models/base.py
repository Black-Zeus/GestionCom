"""
Base declarativa y mixins comunes para todos los modelos
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Column, BigInteger, TIMESTAMP, Boolean, String, event
from sqlalchemy.ext.declarative import declared_attr, declarative_base
from sqlalchemy.orm import validates
from sqlalchemy.ext.hybrid import hybrid_property

# ==========================================
# BASE DECLARATIVA
# ==========================================

Base = declarative_base()

# ==========================================
# MIXINS COMUNES
# ==========================================

class TimestampMixin:
    """
    Mixin para agregar timestamps automáticos a los modelos
    """
    
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
    
    def touch(self):
        """Actualizar timestamp manualmente"""
        self.updated_at = datetime.now(timezone.utc)


class SoftDeleteMixin:
    """
    Mixin para agregar soft delete a los modelos
    """
    
    deleted_at = Column(
        TIMESTAMP,
        nullable=True,
        comment="Fecha de eliminación lógica (soft delete)"
    )
    
    @hybrid_property
    def is_deleted(self) -> bool:
        """Verificar si el registro está eliminado"""
        return self.deleted_at is not None
    
    @is_deleted.expression
    def is_deleted(cls):
        """Expresión SQL para is_deleted"""
        return cls.deleted_at.isnot(None)
    
    @hybrid_property
    def is_active_record(self) -> bool:
        """Verificar si el registro está activo (no eliminado)"""
        return self.deleted_at is None
    
    @is_active_record.expression
    def is_active_record(cls):
        """Expresión SQL para is_active_record"""
        return cls.deleted_at.is_(None)
    
    def soft_delete(self):
        """Realizar soft delete del registro"""
        self.deleted_at = datetime.now(timezone.utc)
    
    def restore(self):
        """Restaurar registro eliminado"""
        self.deleted_at = None


class PrimaryKeyMixin:
    """
    Mixin para agregar primary key estándar
    """
    
    @declared_attr
    def id(cls):
        return Column(
            BigInteger,
            primary_key=True,
            autoincrement=True,
            comment=f"ID único de {cls.__tablename__}"
        )


class ActiveStatusMixin:
    """
    Mixin para agregar estado activo/inactivo
    """
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Indica si el registro está activo"
    )
    
    def activate(self):
        """Activar el registro"""
        self.is_active = True
    
    def deactivate(self):
        """Desactivar el registro"""
        self.is_active = False


class AuditMixin:
    """
    Mixin para auditoría - quién creó/modificó
    """
    
    created_by_user_id = Column(
        BigInteger,
        nullable=True,
        comment="ID del usuario que creó el registro"
    )
    
    updated_by_user_id = Column(
        BigInteger,
        nullable=True,
        comment="ID del usuario que modificó el registro por última vez"
    )
    
    def set_created_by(self, user_id: int):
        """Establecer quién creó el registro"""
        self.created_by_user_id = user_id
    
    def set_updated_by(self, user_id: int):
        """Establecer quién modificó el registro"""
        self.updated_by_user_id = user_id

# ========================================
# AGREGAR QueryHelperMixin A database/models/base.py
# ========================================

# Agregar esta clase después de AuditMixin y antes de BaseModel:

class QueryHelperMixin:
    """
    Mixin para agregar métodos de ayuda para queries comunes
    """
    
    @classmethod
    def get_by_id(cls, session, id_value):
        """Obtener registro por ID"""
        return session.query(cls).filter(cls.id == id_value).first()
    
    @classmethod
    def get_all_active(cls, session):
        """Obtener todos los registros activos"""
        query = session.query(cls)
        
        # Si tiene soft delete, filtrar por no eliminados
        if hasattr(cls, 'deleted_at'):
            query = query.filter(cls.deleted_at.is_(None))
        
        # Si tiene campo is_active, filtrar por activos
        if hasattr(cls, 'is_active'):
            query = query.filter(cls.is_active == True)
        
        return query.all()
    
    @classmethod
    def exists_by_id(cls, session, id_value):
        """Verificar si existe un registro por ID"""
        return session.query(cls.id).filter(cls.id == id_value).first() is not None
    
    @classmethod
    def count_all(cls, session):
        """Contar todos los registros"""
        query = session.query(cls)
        
        # Si tiene soft delete, excluir eliminados
        if hasattr(cls, 'deleted_at'):
            query = query.filter(cls.deleted_at.is_(None))
        
        return query.count()
    
    @classmethod
    def count_active(cls, session):
        """Contar registros activos"""
        query = session.query(cls)
        
        # Si tiene soft delete, excluir eliminados
        if hasattr(cls, 'deleted_at'):
            query = query.filter(cls.deleted_at.is_(None))
        
        # Si tiene campo is_active, filtrar por activos
        if hasattr(cls, 'is_active'):
            query = query.filter(cls.is_active == True)
        
        return query.count()
    
    def save(self, session):
        """Guardar el registro"""
        session.add(self)
        session.commit()
        return self
    
    def delete(self, session):
        """Eliminar el registro (hard delete)"""
        session.delete(self)
        session.commit()
    
    def soft_delete_if_supported(self, session):
        """Realizar soft delete si está soportado, sino hard delete"""
        if hasattr(self, 'soft_delete'):
            self.soft_delete()
            session.commit()
        else:
            self.delete(session)
            
# ==========================================
# BASE MODEL COMPLETA
# ==========================================

class BaseModel(Base, PrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Modelo base que incluye todos los mixins comunes
    """
    __abstract__ = True
    
    def __repr__(self) -> str:
        """Representación string del modelo"""
        class_name = self.__class__.__name__
        if hasattr(self, 'id') and self.id:
            return f"<{class_name}(id={self.id})>"
        return f"<{class_name}(new)>"
    
    def to_dict(self, exclude_none: bool = True, exclude_fields: Optional[list] = None) -> Dict[str, Any]:
        """
        Convertir modelo a diccionario
        
        Args:
            exclude_none: Excluir campos con valor None
            exclude_fields: Lista de campos a excluir
        """
        exclude_fields = exclude_fields or []
        result = {}
        
        for column in self.__table__.columns:
            field_name = column.name
            
            # Skip campos excluidos
            if field_name in exclude_fields:
                continue
            
            value = getattr(self, field_name, None)
            
            # Skip valores None si se solicita
            if exclude_none and value is None:
                continue
            
            # Convertir datetime a ISO string
            if isinstance(value, datetime):
                value = value.isoformat()
            
            result[field_name] = value
        
        return result
    
    def update_from_dict(self, data: Dict[str, Any], exclude_fields: Optional[list] = None):
        """
        Actualizar modelo desde diccionario
        
        Args:
            data: Datos a actualizar
            exclude_fields: Campos a excluir de la actualización
        """
        exclude_fields = exclude_fields or ['id', 'created_at', 'deleted_at']
        
        for key, value in data.items():
            if key in exclude_fields:
                continue
            
            if hasattr(self, key):
                setattr(self, key, value)
        
        # Actualizar timestamp
        self.touch()
    
    @classmethod
    def get_table_name(cls) -> str:
        """Obtener nombre de la tabla"""
        return cls.__tablename__
    
    @classmethod
    def get_column_names(cls) -> list:
        """Obtener nombres de todas las columnas"""
        return [column.name for column in cls.__table__.columns]
    
    def is_new_record(self) -> bool:
        """Verificar si es un registro nuevo (sin ID)"""
        return self.id is None
    
    def validate(self) -> tuple[bool, list]:
        """
        Validación básica del modelo
        
        Returns:
            Tuple (is_valid, errors)
        """
        errors = []
        
        # Validaciones básicas que todos los modelos deberían tener
        # Se puede override en modelos específicos
        
        return len(errors) == 0, errors


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
    
    def to_dict(self, exclude_none: bool = True, exclude_fields: Optional[list] = None) -> Dict[str, Any]:
        """Convertir a diccionario (misma implementación que BaseModel)"""
        exclude_fields = exclude_fields or []
        result = {}
        
        for column in self.__table__.columns:
            field_name = column.name
            
            if field_name in exclude_fields:
                continue
            
            value = getattr(self, field_name, None)
            
            if exclude_none and value is None:
                continue
            
            if isinstance(value, datetime):
                value = value.isoformat()
            
            result[field_name] = value
        
        return result


# ==========================================
# MODELO BASE CON AUDITORÍA COMPLETA
# ==========================================

class AuditableBaseModel(BaseModel, AuditMixin):
    """
    Modelo base con auditoría completa
    Para tablas que requieren tracking de quién hizo qué
    """
    __abstract__ = True


# ==========================================
# VALIDADORES COMUNES
# ==========================================

class CommonValidators:
    """
    Validadores comunes que se pueden usar en cualquier modelo
    """
    
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
        
        # Solo caracteres alfanuméricos y algunos especiales
        import re
        if not re.match(r'^[a-zA-Z0-9._-]+$', username):
            raise ValueError("Username contiene caracteres inválidos")
        
        return username
    
    @staticmethod
    def validate_phone(phone: str) -> Optional[str]:
        """Validar y normalizar teléfono"""
        if not phone:
            return None
        
        # Remover espacios y caracteres especiales
        import re
        phone = re.sub(r'[^\d+]', '', phone.strip())
        
        if len(phone) < 8:
            raise ValueError("Número de teléfono muy corto")
        
        if len(phone) > 20:
            raise ValueError("Número de teléfono muy largo")
        
        return phone
    
    @staticmethod
    def validate_string_length(value: str, min_length: int = 0, max_length: int = None, field_name: str = "Campo") -> str:
        """Validar longitud de string"""
        if not value:
            if min_length > 0:
                raise ValueError(f"{field_name} es requerido")
            return value
        
        value = value.strip()
        
        if len(value) < min_length:
            raise ValueError(f"{field_name} debe tener al menos {min_length} caracteres")
        
        if max_length and len(value) > max_length:
            raise ValueError(f"{field_name} no puede tener más de {max_length} caracteres")
        
        return value


# ==========================================
# EVENT LISTENERS GLOBALES
# ==========================================

@event.listens_for(BaseModel, 'before_update', propagate=True)
def update_timestamp(mapper, connection, target):
    """
    Event listener para actualizar timestamp automáticamente
    """
    if hasattr(target, 'updated_at'):
        target.updated_at = datetime.now(timezone.utc)


@event.listens_for(BaseModel, 'before_insert', propagate=True)
def set_creation_timestamp(mapper, connection, target):
    """
    Event listener para establecer timestamp de creación
    """
    now = datetime.now(timezone.utc)
    
    if hasattr(target, 'created_at') and target.created_at is None:
        target.created_at = now
    
    if hasattr(target, 'updated_at') and target.updated_at is None:
        target.updated_at = now


# ==========================================
# UTILIDADES PARA QUERIES
# ==========================================

class QueryFilters:
    """
    Filtros comunes para queries
    """
    
    @staticmethod
    def active_only(query, model_class):
        """Filtrar solo registros activos (no soft deleted)"""
        if hasattr(model_class, 'is_active_record'):
            return query.filter(model_class.is_active_record == True)
        return query
    
    @staticmethod
    def not_deleted(query, model_class):
        """Filtrar registros no eliminados"""
        if hasattr(model_class, 'deleted_at'):
            return query.filter(model_class.deleted_at.is_(None))
        return query
    
    @staticmethod
    def created_between(query, model_class, start_date: datetime, end_date: datetime):
        """Filtrar por rango de fechas de creación"""
        if hasattr(model_class, 'created_at'):
            return query.filter(
                model_class.created_at >= start_date,
                model_class.created_at <= end_date
            )
        return query


# ==========================================
# CONFIGURACIÓN DE NAMING CONVENTION
# ==========================================

# Naming convention para índices automáticos
NAMING_CONVENTION = {
    "ix": "idx_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# Aplicar naming convention a la metadata
Base.metadata.naming_convention = NAMING_CONVENTION