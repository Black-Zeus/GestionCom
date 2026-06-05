"""
Modelo SQLAlchemy para measurement_units.
"""
import enum
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Column, DECIMAL, Enum, ForeignKey, Index, String
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class MeasurementUnitType(enum.Enum):
    """Tipo de unidad de medida."""

    BASE = "BASE"
    DERIVED = "DERIVED"


class MeasurementUnit(BaseModel):
    """Unidad de medida usada por productos, compras e inventario."""

    __tablename__ = "measurement_units"

    unit_code = Column(String(20), nullable=False, unique=True, comment="Codigo unico de unidad")
    unit_name = Column(String(100), nullable=False, comment="Nombre de unidad")
    unit_symbol = Column(String(10), nullable=False, comment="Simbolo visible")
    unit_type = Column(Enum(MeasurementUnitType), nullable=False, default=MeasurementUnitType.BASE)
    base_unit_id = Column(BigInteger, ForeignKey("measurement_units.id", ondelete="SET NULL"), nullable=True)
    conversion_factor = Column(DECIMAL(15, 6), nullable=False, default=Decimal("1.000000"))
    allow_decimals = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)

    base_unit = relationship("MeasurementUnit", remote_side="MeasurementUnit.id")

    __table_args__ = (
        Index("idx_unit_code", "unit_code"),
        Index("idx_unit_type", "unit_type"),
        Index("idx_base_unit_id", "base_unit_id"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("unit_code")
    def validate_unit_code(self, key, unit_code):
        return CommonValidators.validate_code(unit_code, min_length=2, max_length=20, field_name="Codigo de unidad")

    @validates("unit_name")
    def validate_unit_name(self, key, unit_name):
        return CommonValidators.validate_string_length(unit_name, min_length=2, max_length=100, field_name="Nombre de unidad")

    @validates("unit_symbol")
    def validate_unit_symbol(self, key, unit_symbol):
        return CommonValidators.validate_string_length(unit_symbol, min_length=1, max_length=10, field_name="Simbolo")

    @validates("conversion_factor")
    def validate_conversion_factor(self, key, conversion_factor):
        factor = Decimal(str(conversion_factor or "1"))
        if factor <= 0:
            raise ValueError("El factor de conversion debe ser mayor que cero")
        return factor

    @property
    def display_name(self):
        return f"{self.unit_code} - {self.unit_name}"
