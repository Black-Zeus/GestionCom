"""
Schemas Pydantic para puntos de venta y asignaciones operativas.
"""
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SalesPointBase(BaseModel):
    sales_point_name: str = Field(..., min_length=3, max_length=100)
    warehouse_id: int = Field(..., gt=0)
    default_cash_register_id: Optional[int] = Field(None, gt=0)
    channel_type: str = Field(default="STORE", min_length=2, max_length=30)
    location_description: Optional[str] = Field(None, max_length=255)
    is_active: bool = True
    has_printer: bool = False
    printer_paper_width_mm: int = Field(default=80)


class SalesPointCreate(SalesPointBase):
    pass


class SalesPointUpdate(BaseModel):
    sales_point_name: Optional[str] = Field(None, min_length=3, max_length=100)
    warehouse_id: Optional[int] = Field(None, gt=0)
    default_cash_register_id: Optional[int] = Field(None, gt=0)
    channel_type: Optional[str] = Field(None, min_length=2, max_length=30)
    location_description: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    has_printer: Optional[bool] = None
    printer_paper_width_mm: Optional[int] = None


class OperatorAssignmentBase(BaseModel):
    user_id: int = Field(..., gt=0)
    operator_role: str = Field(..., min_length=2, max_length=30)
    is_default: bool = False
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.valid_until and self.valid_until < self.valid_from:
            raise ValueError("La fecha hasta no puede ser anterior a la fecha desde")
        return self


class CashRegisterAssignmentCreate(OperatorAssignmentBase):
    cash_register_id: int = Field(..., gt=0)


class SalesPointAssignmentCreate(OperatorAssignmentBase):
    sales_point_id: int = Field(..., gt=0)


class OperatorAssignmentUpdate(BaseModel):
    operator_role: Optional[str] = Field(None, min_length=2, max_length=30)
    is_default: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from and self.valid_until and self.valid_until < self.valid_from:
            raise ValueError("La fecha hasta no puede ser anterior a la fecha desde")
        return self
