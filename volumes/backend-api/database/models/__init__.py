"""
volumes/backend-api/database/models/__init__.py
"""

# ==========================================
# IMPORTS DE MODELOS (ORDEN IMPORTANTE)
# ==========================================

# Base primero
from .base import BaseModel, CommonValidators

# Modelos principales
from .users import User
from .roles import Role
from .permissions import Permission
from .warehouses import Warehouse
from .warehouse_zones import WarehouseZone

# Modelos de relación (después de los principales)
from .user_roles import UserRole
from .user_permissions import UserPermission, PermissionType
from .role_permissions import RolePermission
from .user_warehouse_access import UserWarehouseAccess, AccessType

# Enums
from .warehouses import WarehouseType

# ==========================================
# EXPORTS ORGANIZADOS POR CATEGORÍA
# ==========================================

# Modelos principales
__all_models__ = [
    "Permission",
    "Role", 
    "User",
    "Warehouse",
    "WarehouseZone",
]

# Modelos de relación
__all_relations__ = [
    "RolePermission",
    "UserRole", 
    "UserPermission",
    "UserWarehouseAccess",
]

# Enums y tipos
__all_enums__ = [
    "WarehouseType",
    "PermissionType", 
    "AccessType",
]

# Base y utilidades
__all_base__ = [
    "BaseModel",
    "CommonValidators",
]

# Export completo
__all__ = (
    __all_models__ + 
    __all_relations__ + 
    __all_enums__ + 
    __all_base__
)

# ==========================================
# METADATA DEL MÓDULO
# ==========================================

__version__ = "1.0.0"
__author__ = "Sistema de Inventario"
__description__ = "Módulo de autenticación, usuarios, roles y control de acceso"