"""
Schemas Pydantic para metodos de pago.
"""
from typing import Optional

from pydantic import BaseModel, Field

ALLOWED_CURRENCY_CODES = "^(CLP|USD|EUR|ARS|BRL|PEN|COP|MXN|UYU|BOB|PYG|GBP|CAD|AUD|CHF|JPY|CNY)$"


class PaymentMethodBase(BaseModel):
    method_name: str = Field(..., min_length=3, max_length=100)
    method_type: str = Field(..., pattern="^(CASH|CARD|TRANSFER|OTHER)$")
    affects_cash_flow: bool = True
    requires_authorization: bool = False
    currency_code: str = Field(default="CLP", pattern=ALLOWED_CURRENCY_CODES)
    is_active: bool = True
    allows_postdated: bool = False
    requires_bank_info: bool = False
    default_terms_days: Optional[int] = Field(None, ge=0)


class PaymentMethodCreate(PaymentMethodBase):
    pass


class PaymentMethodUpdate(BaseModel):
    method_name: Optional[str] = Field(None, min_length=3, max_length=100)
    method_type: Optional[str] = Field(None, pattern="^(CASH|CARD|TRANSFER|OTHER)$")
    affects_cash_flow: Optional[bool] = None
    requires_authorization: Optional[bool] = None
    currency_code: Optional[str] = Field(None, pattern=ALLOWED_CURRENCY_CODES)
    is_active: Optional[bool] = None
    allows_postdated: Optional[bool] = None
    requires_bank_info: Optional[bool] = None
    default_terms_days: Optional[int] = Field(None, ge=0)
