"""
Schemas Pydantic para administracion de caja chica.
"""
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class PettyCashFundStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    CLOSED = "CLOSED"


class PettyCashCategoryCreate(BaseModel):
    category_code: str = Field(..., min_length=2, max_length=20)
    category_name: str = Field(..., min_length=3, max_length=100)
    category_description: Optional[str] = Field(None, max_length=2000)
    max_amount_per_expense: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    requires_evidence: bool = False
    is_active: bool = True


class PettyCashCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=3, max_length=100)
    category_description: Optional[str] = Field(None, max_length=2000)
    max_amount_per_expense: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    requires_evidence: Optional[bool] = None
    is_active: Optional[bool] = None


class PettyCashFundCreate(BaseModel):
    fund_code: str = Field(..., min_length=2, max_length=50)
    warehouse_id: int = Field(..., gt=0)
    responsible_user_id: int = Field(..., gt=0)
    initial_amount: Decimal = Field(..., ge=0, max_digits=15, decimal_places=2)
    current_balance: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    fund_status: PettyCashFundStatusEnum = PettyCashFundStatusEnum.ACTIVE

    @model_validator(mode="after")
    def default_current_balance(self):
        if self.current_balance is None:
            self.current_balance = self.initial_amount
        return self


class PettyCashFundUpdate(BaseModel):
    warehouse_id: Optional[int] = Field(None, gt=0)
    responsible_user_id: Optional[int] = Field(None, gt=0)
    initial_amount: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    current_balance: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    fund_status: Optional[PettyCashFundStatusEnum] = None
