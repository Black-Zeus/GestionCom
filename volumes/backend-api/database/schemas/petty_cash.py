"""
Schemas Pydantic para administracion de caja chica.
"""
from decimal import Decimal
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class PettyCashFundStatusEnum(str, Enum):
    UNDECLARED = "UNDECLARED"
    DECLARED = "DECLARED"
    SUSPENDED = "SUSPENDED"
    CLOSED = "CLOSED"


def parse_localized_decimal(value):
    if value is None or isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value).strip().replace("$", "").replace("CLP", "").replace(" ", "")
    if not text:
        return None
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif "." in text:
        parts = text.split(".")
        if len(parts) > 1 and all(len(part) == 3 for part in parts[1:]):
            text = "".join(parts)
    return Decimal(text)


class PettyCashCategoryCreate(BaseModel):
    category_code: Optional[str] = Field(None, min_length=2, max_length=20)
    category_name: str = Field(..., min_length=3, max_length=100)
    category_description: Optional[str] = Field(None, max_length=2000)
    max_amount_per_expense: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    requires_evidence: bool = False
    is_active: bool = True

    @field_validator("max_amount_per_expense", mode="before")
    @classmethod
    def normalize_amount(cls, value):
        return parse_localized_decimal(value)


class PettyCashCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, min_length=3, max_length=100)
    category_description: Optional[str] = Field(None, max_length=2000)
    max_amount_per_expense: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    requires_evidence: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("max_amount_per_expense", mode="before")
    @classmethod
    def normalize_amount(cls, value):
        return parse_localized_decimal(value)


class PettyCashFundCreate(BaseModel):
    fund_code: Optional[str] = Field(None, min_length=2, max_length=50)
    warehouse_id: int = Field(..., gt=0)
    responsible_user_id: int = Field(..., gt=0)
    initial_amount: Decimal = Field(..., ge=0, max_digits=15, decimal_places=2)
    current_balance: Optional[Decimal] = Field(None, ge=0, max_digits=15, decimal_places=2)
    fund_status: PettyCashFundStatusEnum = PettyCashFundStatusEnum.UNDECLARED

    @field_validator("initial_amount", "current_balance", mode="before")
    @classmethod
    def normalize_amounts(cls, value):
        return parse_localized_decimal(value)

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

    @field_validator("initial_amount", "current_balance", mode="before")
    @classmethod
    def normalize_amounts(cls, value):
        return parse_localized_decimal(value)
