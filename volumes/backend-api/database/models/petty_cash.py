"""
Modelos SQLAlchemy para administracion de caja chica.
"""
from decimal import Decimal
import enum

from sqlalchemy import BigInteger, Boolean, Column, DECIMAL, Enum, ForeignKey, Index, String, Text, TIMESTAMP
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class PettyCashFundStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    CLOSED = "CLOSED"


class PettyCashCategory(BaseModel):
    __tablename__ = "petty_cash_categories"

    category_code = Column(String(20), nullable=False, unique=True)
    category_name = Column(String(100), nullable=False)
    category_description = Column(Text, nullable=True)
    max_amount_per_expense = Column(DECIMAL(15, 2), nullable=True)
    requires_evidence = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_category_code", "category_code"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("category_code")
    def validate_category_code(self, key, category_code):
        return CommonValidators.validate_code(category_code, min_length=2, max_length=20, field_name="Codigo de categoria")

    @validates("category_name")
    def validate_category_name(self, key, category_name):
        return CommonValidators.validate_string_length(category_name, min_length=3, max_length=100, field_name="Nombre de categoria")

    @validates("category_description")
    def validate_category_description(self, key, category_description):
        return CommonValidators.validate_string_length(category_description, max_length=2000, field_name="Descripcion")

    @validates("max_amount_per_expense")
    def validate_max_amount_per_expense(self, key, max_amount_per_expense):
        if max_amount_per_expense is None:
            return None

        amount = Decimal(str(max_amount_per_expense))
        if amount < 0:
            raise ValueError("El monto maximo no puede ser negativo")
        return amount


class PettyCashFund(BaseModel):
    __tablename__ = "petty_cash_funds"

    fund_code = Column(String(50), nullable=False, unique=True)
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id"), nullable=False)
    responsible_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    initial_amount = Column(DECIMAL(15, 2), nullable=False)
    current_balance = Column(DECIMAL(15, 2), nullable=False)
    total_expenses = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    total_replenishments = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    fund_status = Column(Enum(PettyCashFundStatus), nullable=False, default=PettyCashFundStatus.ACTIVE)
    last_replenishment_date = Column(TIMESTAMP, nullable=True)

    warehouse = relationship("Warehouse")
    responsible_user = relationship("User")

    __table_args__ = (
        Index("idx_fund_code", "fund_code"),
        Index("idx_warehouse_id", "warehouse_id"),
        Index("idx_responsible_user_id", "responsible_user_id"),
        Index("idx_fund_status", "fund_status"),
        Index("idx_petty_cash_funds_deleted_at", "deleted_at"),
    )

    @validates("fund_code")
    def validate_fund_code(self, key, fund_code):
        return CommonValidators.validate_code(fund_code, min_length=2, max_length=50, field_name="Codigo de fondo")

    @validates("initial_amount", "current_balance", "total_expenses", "total_replenishments")
    def validate_amount(self, key, amount):
        if amount is None:
            return Decimal("0.00")

        value = Decimal(str(amount))
        if value < 0:
            raise ValueError("Los montos de caja chica no pueden ser negativos")
        return value
