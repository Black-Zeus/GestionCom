"""
Modelos SQLAlchemy para configuracion operativa previa a ventas.
"""
from sqlalchemy import BigInteger, Boolean, Column, Date, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class SalesPoint(BaseModel):
    """Punto de venta desde donde se originan ventas pendientes de caja."""

    __tablename__ = "sales_points"

    sales_point_code = Column(String(20), nullable=False, unique=True, comment="Codigo unico del punto de venta")
    sales_point_name = Column(String(100), nullable=False, comment="Nombre descriptivo del punto de venta")
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id"), nullable=False, comment="Sucursal/bodega asociada")
    default_cash_register_id = Column(BigInteger, ForeignKey("cash_registers.id"), nullable=True, comment="Caja destino por defecto")
    channel_type = Column(String(30), nullable=False, default="STORE", comment="Canal: STORE, WEB, WHATSAPP, PHONE, OTHER")
    location_description = Column(String(255), nullable=True, comment="Ubicacion o referencia operacional")
    is_active = Column(Boolean, nullable=False, default=True)

    warehouse = relationship("Warehouse")
    default_cash_register = relationship("CashRegister")

    __table_args__ = (
        Index("idx_sales_point_code", "sales_point_code"),
        Index("idx_sales_point_warehouse_id", "warehouse_id"),
        Index("idx_sales_point_default_cash_register_id", "default_cash_register_id"),
        Index("idx_sales_point_channel_type", "channel_type"),
        Index("idx_sales_point_is_active", "is_active"),
        Index("idx_sales_point_deleted_at", "deleted_at"),
    )

    @validates("sales_point_code")
    def validate_sales_point_code(self, key, sales_point_code):
        return CommonValidators.validate_code(sales_point_code, min_length=2, max_length=20, field_name="Codigo POS")

    @validates("sales_point_name")
    def validate_sales_point_name(self, key, sales_point_name):
        return CommonValidators.validate_string_length(sales_point_name, min_length=3, max_length=100, field_name="Nombre POS")

    @validates("channel_type")
    def validate_channel_type(self, key, channel_type):
        return CommonValidators.validate_code(channel_type or "STORE", min_length=2, max_length=30, field_name="Canal")

    @validates("location_description")
    def validate_location_description(self, key, location_description):
        return CommonValidators.validate_string_length(location_description, max_length=255, field_name="Ubicacion")

    @property
    def display_name(self):
        return f"{self.sales_point_code} - {self.sales_point_name}"


class CashRegisterUserAssignment(BaseModel):
    """Asignacion de usuario a una caja especifica."""

    __tablename__ = "cash_register_user_assignments"

    cash_register_id = Column(BigInteger, ForeignKey("cash_registers.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    operator_role = Column(String(30), nullable=False, default="CASHIER")
    is_default = Column(Boolean, nullable=False, default=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    cash_register = relationship("CashRegister")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("cash_register_id", "user_id", name="uk_cash_register_user_assignment"),
        Index("idx_crua_cash_register_id", "cash_register_id"),
        Index("idx_crua_user_id", "user_id"),
        Index("idx_crua_operator_role", "operator_role"),
        Index("idx_crua_is_active", "is_active"),
        Index("idx_crua_deleted_at", "deleted_at"),
    )

    @validates("operator_role")
    def validate_operator_role(self, key, operator_role):
        return CommonValidators.validate_code(operator_role or "CASHIER", min_length=2, max_length=30, field_name="Rol operativo")


class SalesPointUserAssignment(BaseModel):
    """Asignacion de usuario a un punto de venta especifico."""

    __tablename__ = "sales_point_user_assignments"

    sales_point_id = Column(BigInteger, ForeignKey("sales_points.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    operator_role = Column(String(30), nullable=False, default="SELLER")
    is_default = Column(Boolean, nullable=False, default=False)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    sales_point = relationship("SalesPoint")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("sales_point_id", "user_id", name="uk_sales_point_user_assignment"),
        Index("idx_spua_sales_point_id", "sales_point_id"),
        Index("idx_spua_user_id", "user_id"),
        Index("idx_spua_operator_role", "operator_role"),
        Index("idx_spua_is_active", "is_active"),
        Index("idx_spua_deleted_at", "deleted_at"),
    )

    @validates("operator_role")
    def validate_operator_role(self, key, operator_role):
        return CommonValidators.validate_code(operator_role or "SELLER", min_length=2, max_length=30, field_name="Rol operativo")
