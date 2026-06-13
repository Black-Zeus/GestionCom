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
from .cash_registers import CashRegister
from .cash_sessions import CashRegisterSession, CashSessionDenominationCount, CashSessionObservation, CurrencyDenomination
from .sales_operations import CashRegisterUserAssignment, SaleDocument, SaleDocumentLine, SaleLineUnit, SaleReturn, SaleStatus, SaleUnitStatus, SalesPoint, SalesPointUserAssignment
from .petty_cash import PettyCashCategory, PettyCashFund, PettyCashFundStatus
from .payment_methods import PaymentMethod, PaymentMethodType
from .measurement_units import MeasurementUnit, MeasurementUnitType
from .product_config import AttributeGroup, AttributeType, AttributeValue, Category, ProductAttribute
from .document_config import DocumentCategory, DocumentSeries, DocumentType, MovementType
from .business_foundation import DteCompanyConfig, PriceList, PriceListGroup, PriceListItem, Product, ProductVariant, TaxRate

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
    "CashRegister",
    "CashRegisterSession",
    "CashSessionDenominationCount",
    "CashSessionObservation",
    "CurrencyDenomination",
    "SalesPoint",
    "CashRegisterUserAssignment",
    "SalesPointUserAssignment",
    "SaleDocument",
    "SaleDocumentLine",
    "SaleLineUnit",
    "SaleReturn",
    "PettyCashCategory",
    "PettyCashFund",
    "PaymentMethod",
    "MeasurementUnit",
    "Category",
    "AttributeGroup",
    "ProductAttribute",
    "AttributeValue",
    "DocumentType",
    "DocumentSeries",
    "DteCompanyConfig",
    "PriceList",
    "PriceListGroup",
    "PriceListItem",
    "Product",
    "ProductVariant",
    "TaxRate",
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
    "PettyCashFundStatus",
    "PaymentMethodType",
    "MeasurementUnitType",
    "SaleStatus",
    "SaleUnitStatus",
    "AttributeType",
    "DocumentCategory",
    "MovementType",
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
