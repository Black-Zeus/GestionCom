"""
Schemas Pydantic para unidades de medida.
"""
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class MeasurementUnitBase(BaseModel):
    unit_name: str = Field(..., min_length=2, max_length=100)
    unit_symbol: str = Field(..., min_length=1, max_length=10)
    unit_type: str = Field(default="BASE", pattern="^(BASE|DERIVED)$")
    base_unit_id: Optional[int] = Field(None, gt=0)
    conversion_factor: Decimal = Field(default=Decimal("1.000000"), gt=0, max_digits=15, decimal_places=6)
    allow_decimals: bool = False
    is_active: bool = True


class MeasurementUnitCreate(MeasurementUnitBase):
    pass


class MeasurementUnitUpdate(BaseModel):
    unit_name: Optional[str] = Field(None, min_length=2, max_length=100)
    unit_symbol: Optional[str] = Field(None, min_length=1, max_length=10)
    unit_type: Optional[str] = Field(None, pattern="^(BASE|DERIVED)$")
    base_unit_id: Optional[int] = Field(None, gt=0)
    conversion_factor: Optional[Decimal] = Field(None, gt=0, max_digits=15, decimal_places=6)
    allow_decimals: Optional[bool] = None
    is_active: Optional[bool] = None
