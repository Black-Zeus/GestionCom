"""
Schemas Pydantic para configuracion de cajas POS.
"""
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CashRegisterBase(BaseModel):
    register_code: Optional[str] = Field(None, min_length=2, max_length=20)
    register_name: str = Field(..., min_length=3, max_length=100)
    warehouse_id: int = Field(..., gt=0)
    terminal_identifier: Optional[str] = Field(None, max_length=100)
    ip_address: Optional[str] = Field(None, max_length=45)
    location_description: Optional[str] = Field(None, max_length=255)
    is_active: bool = True
    requires_supervisor_approval: bool = True
    max_difference_amount: Decimal = Field(default=Decimal("1000.00"), ge=0, max_digits=15, decimal_places=2)


class CashRegisterCreate(CashRegisterBase):
    pass


class CashRegisterUpdate(BaseModel):
    register_name: Optional[str] = Field(None, min_length=3, max_length=100)
    warehouse_id: Optional[int] = Field(None, gt=0)
    terminal_identifier: Optional[str] = Field(None, max_length=100)
    ip_address: Optional[str] = Field(None, max_length=45)
    location_description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    requires_supervisor_approval: Optional[bool] = None
    max_difference_amount: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
