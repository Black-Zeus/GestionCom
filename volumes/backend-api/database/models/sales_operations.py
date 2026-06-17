"""
Modelos SQLAlchemy para configuracion operativa previa a ventas.
"""
import enum
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Column, Date, DECIMAL, Enum, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class SaleStatus(enum.Enum):
    PENDING_CASHIER = "PENDING_CASHIER"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class SaleUnitStatus(enum.Enum):
    SOLD = "SOLD"
    RETURNED = "RETURNED"
    EXCHANGED = "EXCHANGED"


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
        UniqueConstraint("cash_register_id", "user_id", "operator_role", name="uk_cash_register_user_assignment"),
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
        UniqueConstraint("sales_point_id", "user_id", "operator_role", name="uk_sales_point_user_assignment"),
        Index("idx_spua_sales_point_id", "sales_point_id"),
        Index("idx_spua_user_id", "user_id"),
        Index("idx_spua_operator_role", "operator_role"),
        Index("idx_spua_is_active", "is_active"),
        Index("idx_spua_deleted_at", "deleted_at"),
    )

    @validates("operator_role")
    def validate_operator_role(self, key, operator_role):
        return CommonValidators.validate_code(operator_role or "SELLER", min_length=2, max_length=30, field_name="Rol operativo")


class SaleDocument(BaseModel):
    """Documento de venta preparado en ventas y cerrado en caja."""

    __tablename__ = "sale_documents"

    sale_code = Column(String(36), nullable=False, unique=True)
    status = Column(Enum(SaleStatus), nullable=False, default=SaleStatus.PENDING_CASHIER)
    document_type_code = Column(String(30), nullable=False, default="TICKET")
    document_type_name = Column(String(100), nullable=False, default="Ticket de venta")
    ticket_number = Column(String(60), nullable=True, unique=True)
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id"), nullable=True)
    sales_point_id = Column(BigInteger, ForeignKey("sales_points.id"), nullable=True)
    cash_register_id = Column(BigInteger, ForeignKey("cash_registers.id"), nullable=True)
    cash_register_session_id = Column(BigInteger, ForeignKey("cash_register_sessions.id"), nullable=True)
    payment_method_code = Column(String(20), nullable=True)
    payment_method_name = Column(String(100), nullable=True)
    amount_tendered = Column(DECIMAL(14, 2), nullable=True)
    change_amount = Column(DECIMAL(14, 2), nullable=True)
    payment_details = Column(JSON, nullable=True)
    receipt_email = Column(String(255), nullable=True)
    customer_id = Column(BigInteger, nullable=True)
    customer_snapshot = Column(JSON, nullable=True)
    authorized_buyer_snapshot = Column(JSON, nullable=True)
    prepared_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    closed_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    prepared_by_name = Column(String(150), nullable=True)
    subtotal_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    line_discount_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    document_discount_type = Column(String(20), nullable=False, default="NONE")
    document_discount_value = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    document_discount_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    tax_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    total_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    notes = Column(Text, nullable=True)
    exchange_credit_total = Column(DECIMAL(15, 2), nullable=True)
    exchange_forfeited_credit = Column(DECIMAL(15, 2), nullable=True)

    warehouse = relationship("Warehouse")
    sales_point = relationship("SalesPoint")
    cash_register = relationship("CashRegister")
    lines = relationship("SaleDocumentLine", back_populates="sale", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_sale_documents_sale_code", "sale_code"),
        Index("idx_sale_documents_status", "status"),
        Index("idx_sale_documents_ticket_number", "ticket_number"),
        Index("idx_sale_documents_sales_point_id", "sales_point_id"),
        Index("idx_sale_documents_cash_register_id", "cash_register_id"),
        Index("idx_sale_documents_session_id", "cash_register_session_id"),
        Index("idx_sale_documents_deleted_at", "deleted_at"),
    )


class SaleDocumentLine(BaseModel):
    """Linea consolidada de un documento de venta."""

    __tablename__ = "sale_document_lines"

    sale_document_id = Column(BigInteger, ForeignKey("sale_documents.id", ondelete="CASCADE"), nullable=False)
    line_number = Column(Integer, nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id"), nullable=True)
    product_variant_id = Column(BigInteger, ForeignKey("product_variants.id"), nullable=True)
    product_code = Column(String(100), nullable=True)
    product_name = Column(String(255), nullable=False)
    unit_name = Column(String(80), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    discount_percent = Column(DECIMAL(7, 4), nullable=False, default=Decimal("0.0000"))
    line_subtotal = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    line_discount_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    document_discount_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    tax_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    paid_total_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))

    sale = relationship("SaleDocument", back_populates="lines")
    units = relationship("SaleLineUnit", back_populates="line", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("sale_document_id", "line_number", name="uk_sale_line_number"),
        Index("idx_sale_document_lines_sale_document_id", "sale_document_id"),
        Index("idx_sale_document_lines_product_id", "product_id"),
        Index("idx_sale_document_lines_product_variant_id", "product_variant_id"),
    )


class SaleLineUnit(BaseModel):
    """Unidad vendida individual para devolver/cambiar con valor exacto."""

    __tablename__ = "sale_line_units"

    sale_document_id = Column(BigInteger, ForeignKey("sale_documents.id", ondelete="CASCADE"), nullable=False)
    sale_document_line_id = Column(BigInteger, ForeignKey("sale_document_lines.id", ondelete="CASCADE"), nullable=False)
    unit_sequence = Column(Integer, nullable=False)
    paid_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    status = Column(Enum(SaleUnitStatus), nullable=False, default=SaleUnitStatus.SOLD)
    return_reference = Column(String(60), nullable=True)

    line = relationship("SaleDocumentLine", back_populates="units")

    __table_args__ = (
        UniqueConstraint("sale_document_line_id", "unit_sequence", name="uk_sale_line_unit_sequence"),
        Index("idx_sale_line_units_sale_document_id", "sale_document_id"),
        Index("idx_sale_line_units_sale_document_line_id", "sale_document_line_id"),
        Index("idx_sale_line_units_status", "status"),
        Index("idx_sale_line_units_deleted_at", "deleted_at"),
    )


class SaleReturn(BaseModel):
    """Registro simple de devolucion o cambio de una unidad vendida."""

    __tablename__ = "sale_returns"

    sale_document_id = Column(BigInteger, ForeignKey("sale_documents.id", ondelete="CASCADE"), nullable=False)
    sale_line_unit_id = Column(BigInteger, ForeignKey("sale_line_units.id"), nullable=False)
    action_type = Column(String(20), nullable=False)
    amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    reason = Column(String(255), nullable=True)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        Index("idx_sale_returns_sale_document_id", "sale_document_id"),
        Index("idx_sale_returns_sale_line_unit_id", "sale_line_unit_id"),
        Index("idx_sale_returns_created_by_user_id", "created_by_user_id"),
        Index("idx_sale_returns_deleted_at", "deleted_at"),
    )
