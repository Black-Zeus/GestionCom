"""
volumes/backend-api/database/schemas/permission_audit_log.py
SQLAlchemy model for permission_audit_log table
"""
from sqlalchemy import Column, BigInteger, ForeignKey, Enum, Text, String, Index
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from database import Base
from database.models.base import TimestampMixin
from database.models.base import QueryHelperMixin
from typing import TYPE_CHECKING, Optional, List, Dict, Any
import enum

if TYPE_CHECKING:
    pass


class ActionType(enum.Enum):
    """Enum for audit log action types"""
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    ROLE_REMOVED = "ROLE_REMOVED"
    PERMISSION_GRANTED = "PERMISSION_GRANTED"
    PERMISSION_REVOKED = "PERMISSION_REVOKED"
    WAREHOUSE_ACCESS_CHANGED = "WAREHOUSE_ACCESS_CHANGED"


class PermissionAuditLog(Base, TimestampMixin, QueryHelperMixin):
    """
    Model for permission_audit_log table - Audit trail for permission changes
    
    Attributes:
        id: Primary key
        target_user_id: User whose permissions were modified
        action_type: Type of action performed
        role_id: Role involved in the action (optional)
        permission_id: Permission involved in the action (optional)
        warehouse_id: Warehouse involved in the action (optional)
        old_value: Previous value before change
        new_value: New value after change
        performed_by_user_id: User who performed the action
        ip_address: IP address of the user performing the action
        user_agent: User agent string of the client
    """
    
    __tablename__ = "permission_audit_log"
    
    # Primary Key
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Target User (required)
    target_user_id = Column(
        BigInteger, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Usuario al que se le modificaron permisos"
    )
    
    # Action Type (required)
    action_type = Column(
        Enum(ActionType), 
        nullable=False,
        comment="Tipo de acción realizada"
    )
    
    # Optional Foreign Keys (depending on action type)
    role_id = Column(
        BigInteger, 
        ForeignKey("roles.id", ondelete="SET NULL"), 
        nullable=True,
        comment="Rol involucrado en la acción"
    )
    
    permission_id = Column(
        BigInteger, 
        ForeignKey("permissions.id", ondelete="SET NULL"), 
        nullable=True,
        comment="Permiso involucrado en la acción"
    )
    
    warehouse_id = Column(
        BigInteger, 
        ForeignKey("warehouses.id", ondelete="SET NULL"), 
        nullable=True,
        comment="Almacén involucrado en la acción"
    )
    
    # Change Values
    old_value = Column(
        Text, 
        nullable=True,
        comment="Valor anterior"
    )
    
    new_value = Column(
        Text, 
        nullable=True,
        comment="Nuevo valor"
    )
    
    # Performer (required)
    performed_by_user_id = Column(
        BigInteger, 
        ForeignKey("users.id"), 
        nullable=False,
        comment="Usuario que realizó la acción"
    )
    
    # Request Information
    ip_address = Column(
        String(45), 
        nullable=True,
        comment="Dirección IP del cliente"
    )
    
    user_agent = Column(
        Text, 
        nullable=True,
        comment="User agent del navegador"
    )
    
    # Relationships
    target_user = relationship(
        "User", 
        foreign_keys=[target_user_id],
        back_populates="audit_logs_as_target",
        lazy="select"
    )
    
    role = relationship(
        "Role", 
        foreign_keys=[role_id],
        lazy="select"
    )
    
    permission = relationship(
        "Permission", 
        foreign_keys=[permission_id],
        lazy="select"
    )
    
    warehouse = relationship(
        "Warehouse", 
        foreign_keys=[warehouse_id],
        lazy="select"
    )
    
    performed_by_user = relationship(
        "User", 
        foreign_keys=[performed_by_user_id],
        back_populates="audit_logs_as_performer",
        lazy="select"
    )
    
    # Indexes (matching database schema)
    __table_args__ = (
        Index('idx_target_user_id', 'target_user_id'),
        Index('idx_action_type', 'action_type'),
        Index('idx_performed_by_user_id', 'performed_by_user_id'),
        Index('idx_created_at', 'created_at'),
    )
    
    # Validators
    @validates('target_user_id')
    def validate_target_user_id(self, key, value):
        """Validate target_user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("target_user_id debe ser un número positivo")
        return value
    
    @validates('role_id')
    def validate_role_id(self, key, value):
        """Validate role_id is positive when provided"""
        if value is not None and value <= 0:
            raise ValueError("role_id debe ser un número positivo")
        return value
    
    @validates('permission_id')
    def validate_permission_id(self, key, value):
        """Validate permission_id is positive when provided"""
        if value is not None and value <= 0:
            raise ValueError("permission_id debe ser un número positivo")
        return value
    
    @validates('warehouse_id')
    def validate_warehouse_id(self, key, value):
        """Validate warehouse_id is positive when provided"""
        if value is not None and value <= 0:
            raise ValueError("warehouse_id debe ser un número positivo")
        return value
    
    @validates('performed_by_user_id')
    def validate_performed_by_user_id(self, key, value):
        """Validate performed_by_user_id is positive"""
        if value is not None and value <= 0:
            raise ValueError("performed_by_user_id debe ser un número positivo")
        return value
    
    @validates('ip_address')
    def validate_ip_address(self, key, value):
        """Basic IP address format validation"""
        import re
        if value is not None:
            # Basic IPv4 and IPv6 validation
            ipv4_pattern = r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
            ipv6_pattern = r'^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$'
            
            if not (re.match(ipv4_pattern, value) or re.match(ipv6_pattern, value)):
                # Allow localhost and local IPs for development
                if value not in ['localhost', '127.0.0.1', '::1']:
                    raise ValueError("Formato de IP inválido")
        return value
    
    # Properties
    @property
    def action_description(self) -> str:
        """Get human-readable description of the action"""
        descriptions = {
            ActionType.ROLE_ASSIGNED: "Rol asignado",
            ActionType.ROLE_REMOVED: "Rol removido",
            ActionType.PERMISSION_GRANTED: "Permiso otorgado",
            ActionType.PERMISSION_REVOKED: "Permiso revocado",
            ActionType.WAREHOUSE_ACCESS_CHANGED: "Acceso a almacén modificado"
        }
        return descriptions.get(self.action_type, "Acción desconocida")
    
    @property
    def has_change_values(self) -> bool:
        """Check if the audit log has old/new values"""
        return self.old_value is not None or self.new_value is not None
    
    @property
    def involves_role(self) -> bool:
        """Check if the action involves a role"""
        return self.action_type in [ActionType.ROLE_ASSIGNED, ActionType.ROLE_REMOVED]
    
    @property
    def involves_permission(self) -> bool:
        """Check if the action involves a permission"""
        return self.action_type in [ActionType.PERMISSION_GRANTED, ActionType.PERMISSION_REVOKED]
    
    @property
    def involves_warehouse(self) -> bool:
        """Check if the action involves a warehouse"""
        return self.action_type == ActionType.WAREHOUSE_ACCESS_CHANGED
    
    # Class Methods
    @classmethod
    def log_role_assignment(cls, session, target_user_id: int, role_id: int, performed_by_user_id: int, 
                          ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "PermissionAuditLog":
        """Log role assignment action"""
        log_entry = cls(
            target_user_id=target_user_id,
            action_type=ActionType.ROLE_ASSIGNED,
            role_id=role_id,
            performed_by_user_id=performed_by_user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(log_entry)
        session.flush()
        return log_entry
    
    @classmethod
    def log_role_removal(cls, session, target_user_id: int, role_id: int, performed_by_user_id: int,
                        ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "PermissionAuditLog":
        """Log role removal action"""
        log_entry = cls(
            target_user_id=target_user_id,
            action_type=ActionType.ROLE_REMOVED,
            role_id=role_id,
            performed_by_user_id=performed_by_user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(log_entry)
        session.flush()
        return log_entry
    
    @classmethod
    def log_permission_grant(cls, session, target_user_id: int, permission_id: int, performed_by_user_id: int,
                           old_value: Optional[str] = None, new_value: Optional[str] = None,
                           ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "PermissionAuditLog":
        """Log permission grant action"""
        log_entry = cls(
            target_user_id=target_user_id,
            action_type=ActionType.PERMISSION_GRANTED,
            permission_id=permission_id,
            old_value=old_value,
            new_value=new_value,
            performed_by_user_id=performed_by_user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(log_entry)
        session.flush()
        return log_entry
    
    @classmethod
    def log_permission_revocation(cls, session, target_user_id: int, permission_id: int, performed_by_user_id: int,
                                old_value: Optional[str] = None, new_value: Optional[str] = None,
                                ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "PermissionAuditLog":
        """Log permission revocation action"""
        log_entry = cls(
            target_user_id=target_user_id,
            action_type=ActionType.PERMISSION_REVOKED,
            permission_id=permission_id,
            old_value=old_value,
            new_value=new_value,
            performed_by_user_id=performed_by_user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(log_entry)
        session.flush()
        return log_entry
    
    @classmethod
    def log_warehouse_access_change(cls, session, target_user_id: int, warehouse_id: int, performed_by_user_id: int,
                                  old_value: Optional[str] = None, new_value: Optional[str] = None,
                                  ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> "PermissionAuditLog":
        """Log warehouse access change action"""
        log_entry = cls(
            target_user_id=target_user_id,
            action_type=ActionType.WAREHOUSE_ACCESS_CHANGED,
            warehouse_id=warehouse_id,
            old_value=old_value,
            new_value=new_value,
            performed_by_user_id=performed_by_user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        session.add(log_entry)
        session.flush()
        return log_entry
    
    @classmethod
    def get_user_audit_trail(cls, session, user_id: int, limit: Optional[int] = None) -> List["PermissionAuditLog"]:
        """Get audit trail for a specific user"""
        query = session.query(cls).filter(cls.target_user_id == user_id).order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_actions_by_performer(cls, session, performer_id: int, limit: Optional[int] = None) -> List["PermissionAuditLog"]:
        """Get actions performed by a specific user"""
        query = session.query(cls).filter(cls.performed_by_user_id == performer_id).order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_recent_actions(cls, session, days: int = 30, limit: Optional[int] = None) -> List["PermissionAuditLog"]:
        """Get recent audit actions within specified days"""
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days)
        query = session.query(cls).filter(cls.created_at >= cutoff_date).order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_actions_by_type(cls, session, action_type: ActionType, limit: Optional[int] = None) -> List["PermissionAuditLog"]:
        """Get actions by specific type"""
        query = session.query(cls).filter(cls.action_type == action_type).order_by(cls.created_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_role_audit_trail(cls, session, role_id: int) -> List["PermissionAuditLog"]:
        """Get audit trail for a specific role"""
        return session.query(cls).filter(
            cls.role_id == role_id,
            cls.action_type.in_([ActionType.ROLE_ASSIGNED, ActionType.ROLE_REMOVED])
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_permission_audit_trail(cls, session, permission_id: int) -> List["PermissionAuditLog"]:
        """Get audit trail for a specific permission"""
        return session.query(cls).filter(
            cls.permission_id == permission_id,
            cls.action_type.in_([ActionType.PERMISSION_GRANTED, ActionType.PERMISSION_REVOKED])
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_warehouse_audit_trail(cls, session, warehouse_id: int) -> List["PermissionAuditLog"]:
        """Get audit trail for a specific warehouse"""
        return session.query(cls).filter(
            cls.warehouse_id == warehouse_id,
            cls.action_type == ActionType.WAREHOUSE_ACCESS_CHANGED
        ).order_by(cls.created_at.desc()).all()
    
    @classmethod
    def get_audit_statistics(cls, session, days: int = 30) -> Dict[str, Any]:
        """Get audit statistics for the specified period"""
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Total actions
        total_actions = session.query(cls).filter(cls.created_at >= cutoff_date).count()
        
        # Actions by type
        actions_by_type = session.query(
            cls.action_type,
            func.count(cls.id).label('count')
        ).filter(cls.created_at >= cutoff_date).group_by(cls.action_type).all()
        
        # Top performers
        top_performers = session.query(
            cls.performed_by_user_id,
            func.count(cls.id).label('count')
        ).filter(cls.created_at >= cutoff_date).group_by(cls.performed_by_user_id).order_by(func.count(cls.id).desc()).limit(10).all()
        
        # Most affected users
        most_affected = session.query(
            cls.target_user_id,
            func.count(cls.id).label('count')
        ).filter(cls.created_at >= cutoff_date).group_by(cls.target_user_id).order_by(func.count(cls.id).desc()).limit(10).all()
        
        return {
            'total_actions': total_actions,
            'actions_by_type': {action.action_type.value: action.count for action in actions_by_type},
            'top_performers': [{'user_id': user.performed_by_user_id, 'count': user.count} for user in top_performers],
            'most_affected': [{'user_id': user.target_user_id, 'count': user.count} for user in most_affected]
        }
    
    @classmethod
    def cleanup_old_logs(cls, session, days_to_keep: int = 365) -> int:
        """Remove audit logs older than specified days"""
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        count = session.query(cls).filter(cls.created_at < cutoff_date).delete()
        return count
    
    def __repr__(self) -> str:
        return f"<PermissionAuditLog(id={self.id}, action={self.action_type.value}, target_user_id={self.target_user_id})>"
    
    def __str__(self) -> str:
        return f"AuditLog {self.id}: {self.action_description} for User {self.target_user_id} by User {self.performed_by_user_id}"