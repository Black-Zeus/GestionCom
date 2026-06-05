"""
Modelo SQLAlchemy para cash_registers.
"""
from decimal import Decimal
import ipaddress

from sqlalchemy import BigInteger, Boolean, Column, DECIMAL, ForeignKey, Index, String
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class CashRegister(BaseModel):
    """Caja registradora o terminal POS."""

    __tablename__ = "cash_registers"

    register_code = Column(String(20), nullable=False, unique=True, comment="Codigo unico de caja")
    register_name = Column(String(100), nullable=False, comment="Nombre descriptivo de la caja")
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id"), nullable=False, comment="Bodega/punto de venta")
    terminal_identifier = Column(String(100), nullable=True, comment="Identificador del terminal")
    ip_address = Column(String(45), nullable=True, comment="IP del terminal")
    location_description = Column(String(255), nullable=True, comment="Ubicacion fisica")
    is_active = Column(Boolean, nullable=False, default=True)
    requires_supervisor_approval = Column(Boolean, nullable=False, default=True)
    max_difference_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("1000.00"))

    warehouse = relationship("Warehouse")

    __table_args__ = (
        Index("idx_register_code", "register_code"),
        Index("idx_warehouse_id", "warehouse_id"),
        Index("idx_terminal_identifier", "terminal_identifier"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("register_code")
    def validate_register_code(self, key, register_code):
        return CommonValidators.validate_code(register_code, min_length=2, max_length=20, field_name="Codigo de caja")

    @validates("register_name")
    def validate_register_name(self, key, register_name):
        return CommonValidators.validate_string_length(register_name, min_length=3, max_length=100, field_name="Nombre de caja")

    @validates("terminal_identifier")
    def validate_terminal_identifier(self, key, terminal_identifier):
        return CommonValidators.validate_string_length(terminal_identifier, max_length=100, field_name="Terminal")

    @validates("location_description")
    def validate_location_description(self, key, location_description):
        return CommonValidators.validate_string_length(location_description, max_length=255, field_name="Ubicacion")

    @validates("ip_address")
    def validate_ip_address(self, key, ip_address):
        if not ip_address:
            return None

        ip_address = ip_address.strip()
        try:
            ipaddress.ip_address(ip_address)
        except ValueError as exc:
            raise ValueError("Formato de IP invalido") from exc

        return ip_address

    @validates("max_difference_amount")
    def validate_max_difference_amount(self, key, max_difference_amount):
        if max_difference_amount is None:
            return Decimal("0.00")

        amount = Decimal(str(max_difference_amount))
        if amount < 0:
            raise ValueError("La diferencia maxima no puede ser negativa")

        return amount

    @property
    def display_name(self):
        return f"{self.register_code} - {self.register_name}"
