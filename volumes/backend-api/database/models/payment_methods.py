"""
Modelo SQLAlchemy para payment_methods.
"""
import enum

from sqlalchemy import Boolean, Column, Enum, Index, Integer, String
from sqlalchemy.orm import validates

from .base import BaseModel, CommonValidators

class PaymentMethodType(enum.Enum):
    """Tipos principales de metodo de pago."""

    CASH = "CASH"
    CARD = "CARD"
    TRANSFER = "TRANSFER"
    OTHER = "OTHER"


class PaymentMethod(BaseModel):
    """Metodo de pago disponible para ventas, caja y documentos."""

    __tablename__ = "payment_methods"

    method_code = Column(String(20), nullable=False, unique=True, comment="Codigo unico del metodo")
    method_name = Column(String(100), nullable=False, comment="Nombre descriptivo")
    method_type = Column(Enum(PaymentMethodType), nullable=False, comment="Tipo principal")
    affects_cash_flow = Column(Boolean, nullable=False, default=True)
    requires_authorization = Column(Boolean, nullable=False, default=False)
    currency_code = Column(String(3), nullable=False, default="CLP")
    is_active = Column(Boolean, nullable=False, default=True)
    allows_postdated = Column(Boolean, nullable=False, default=False)
    requires_bank_info = Column(Boolean, nullable=False, default=False)
    default_terms_days = Column(Integer, nullable=True)
    icon_name = Column(String(80), nullable=True)
    display_order = Column(Integer, nullable=False, default=100)

    __table_args__ = (
        Index("idx_method_code", "method_code"),
        Index("idx_method_type", "method_type"),
        Index("idx_affects_cash_flow", "affects_cash_flow"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("method_code")
    def validate_method_code(self, key, method_code):
        return CommonValidators.validate_code(method_code, min_length=2, max_length=20, field_name="Codigo de metodo")

    @validates("method_name")
    def validate_method_name(self, key, method_name):
        return CommonValidators.validate_string_length(method_name, min_length=3, max_length=100, field_name="Nombre de metodo")

    @validates("currency_code")
    def validate_currency_code(self, key, currency_code):
        if not currency_code:
            return "CLP"
        normalized_code = currency_code.strip().upper()
        if len(normalized_code) != 3 or not normalized_code.isalpha():
            raise ValueError("La moneda debe usar codigo ISO de 3 letras")
        return normalized_code

    @validates("default_terms_days")
    def validate_default_terms_days(self, key, default_terms_days):
        if default_terms_days is None:
            return None
        terms = int(default_terms_days)
        if terms < 0:
            raise ValueError("Los dias de plazo no pueden ser negativos")
        return terms

    @property
    def display_name(self):
        return f"{self.method_code} - {self.method_name}"
