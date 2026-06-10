"""
Schemas Pydantic para configuracion base de ventas e inventario.
"""
from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from utils.rut import validate_and_normalize_chilean_rut


class TaxRateCreate(BaseModel):
    tax_name: str = Field(..., min_length=2, max_length=100)
    tax_type: str = Field(default="VAT", pattern="^(VAT|EXEMPT|ADDITIONAL|WITHHOLDING|OTHER)$")
    rate_percentage: float = Field(default=0, ge=0, le=100)
    is_default: bool = False
    valid_from: date
    valid_to: Optional[date] = None
    is_active: bool = True


class TaxRateUpdate(BaseModel):
    tax_name: Optional[str] = Field(None, min_length=2, max_length=100)
    tax_type: Optional[str] = Field(None, pattern="^(VAT|EXEMPT|ADDITIONAL|WITHHOLDING|OTHER)$")
    rate_percentage: Optional[float] = Field(None, ge=0, le=100)
    is_default: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    is_active: Optional[bool] = None


class PriceListGroupCreate(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=100)
    group_description: Optional[str] = None
    is_active: bool = True


class PriceListGroupUpdate(BaseModel):
    group_name: Optional[str] = Field(None, min_length=2, max_length=100)
    group_description: Optional[str] = None
    is_active: Optional[bool] = None


class PriceListCreate(BaseModel):
    price_list_group_id: Optional[int] = Field(None, gt=0)
    price_list_name: str = Field(..., min_length=2, max_length=150)
    base_price_list_id: Optional[int] = Field(None, gt=0)
    base_adjustment_type: Optional[str] = Field(None, pattern="^(PERCENTAGE|FIXED)$")
    base_adjustment_value: Optional[float] = None
    currency_code: str = Field(default="CLP", min_length=3, max_length=3)
    valid_from: date
    valid_to: Optional[date] = None
    priority: int = Field(default=1, ge=1, le=255)
    applies_to: str = Field(default="ALL_PRODUCTS", pattern="^(ALL_PRODUCTS|CATEGORY|SPECIFIC)$")
    is_active: bool = True


class PriceListUpdate(BaseModel):
    price_list_group_id: Optional[int] = Field(None, gt=0)
    price_list_name: Optional[str] = Field(None, min_length=2, max_length=150)
    base_price_list_id: Optional[int] = Field(None, gt=0)
    base_adjustment_type: Optional[str] = Field(None, pattern="^(PERCENTAGE|FIXED)$")
    base_adjustment_value: Optional[float] = None
    currency_code: Optional[str] = Field(None, min_length=3, max_length=3)
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None
    priority: Optional[int] = Field(None, ge=1, le=255)
    applies_to: Optional[str] = Field(None, pattern="^(ALL_PRODUCTS|CATEGORY|SPECIFIC)$")
    is_active: Optional[bool] = None


class PriceListItemCreate(BaseModel):
    price_list_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    product_variant_id: Optional[int] = Field(None, gt=0)
    measurement_unit_id: int = Field(..., gt=0)
    base_price: float = Field(..., ge=0)
    sale_price: float = Field(..., ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    margin_percentage: Optional[float] = None
    is_active: bool = True


class PriceListItemUpdate(BaseModel):
    price_list_id: Optional[int] = Field(None, gt=0)
    product_id: Optional[int] = Field(None, gt=0)
    product_variant_id: Optional[int] = Field(None, gt=0)
    measurement_unit_id: Optional[int] = Field(None, gt=0)
    base_price: Optional[float] = Field(None, ge=0)
    sale_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    margin_percentage: Optional[float] = None
    is_active: Optional[bool] = None


class ProductCreate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0)
    product_name: str = Field(..., min_length=2, max_length=200)
    product_description: Optional[str] = None
    brand_id: Optional[int] = Field(None, gt=0)
    brand: Optional[str] = Field(None, max_length=100)
    product_model_id: Optional[int] = Field(None, gt=0)
    model: Optional[str] = Field(None, max_length=100)
    base_measurement_unit_id: int = Field(..., gt=0)
    base_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    has_variants: bool = False
    is_active: bool = True
    has_batch_control: bool = False
    has_expiry_date: bool = False
    has_serial_numbers: bool = False
    has_location_tracking: bool = False


class ProductUpdate(BaseModel):
    category_id: Optional[int] = Field(None, gt=0)
    product_name: Optional[str] = Field(None, min_length=2, max_length=200)
    product_description: Optional[str] = None
    brand_id: Optional[int] = Field(None, gt=0)
    brand: Optional[str] = Field(None, max_length=100)
    product_model_id: Optional[int] = Field(None, gt=0)
    model: Optional[str] = Field(None, max_length=100)
    base_measurement_unit_id: Optional[int] = Field(None, gt=0)
    base_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    has_variants: Optional[bool] = None
    is_active: Optional[bool] = None
    has_batch_control: Optional[bool] = None
    has_expiry_date: Optional[bool] = None
    has_serial_numbers: Optional[bool] = None
    has_location_tracking: Optional[bool] = None


class ProductVariantCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    variant_name: str = Field(..., min_length=2, max_length=200)
    variant_description: Optional[str] = None
    is_default_variant: bool = False
    is_active: bool = True


class ProductVariantUpdate(BaseModel):
    product_id: Optional[int] = Field(None, gt=0)
    variant_name: Optional[str] = Field(None, min_length=2, max_length=200)
    variant_description: Optional[str] = None
    is_default_variant: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductVariantAttributeSelection(BaseModel):
    attribute_id: int = Field(..., gt=0)
    value_ids: List[int] = Field(..., min_length=1)


class ProductVariantGenerate(BaseModel):
    product_id: int = Field(..., gt=0)
    attributes: List[ProductVariantAttributeSelection] = Field(..., min_length=1)
    is_active: bool = True


class CompanyConfigCreate(BaseModel):
    company_rut: str = Field(..., min_length=8, max_length=12)
    company_name: str = Field(..., min_length=2, max_length=255)
    company_business_name: str = Field(..., min_length=2, max_length=255)
    company_address: str = Field(..., min_length=2)
    company_comuna: str = Field(..., min_length=2, max_length=100)
    company_city: str = Field(..., min_length=2, max_length=100)
    company_region: str = Field(..., min_length=2, max_length=100)
    economic_activity_code: str = Field(..., min_length=1, max_length=10)
    economic_activity_name: str = Field(..., min_length=2, max_length=255)
    dte_environment: str = Field(default="CERTIFICACION", pattern="^(CERTIFICACION|PRODUCCION)$")
    default_customer_currency_code: str = Field(default="CLP", pattern="^[A-Z]{3}$")
    default_supplier_currency_code: str = Field(default="CLP", pattern="^[A-Z]{3}$")
    default_sales_currency_code: str = Field(default="CLP", pattern="^[A-Z]{3}$")
    sii_user: Optional[str] = Field(None, max_length=100)
    is_active: bool = True

    @field_validator("company_rut")
    @classmethod
    def validate_company_rut(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return value
        return validate_and_normalize_chilean_rut(value)


class CompanyConfigUpdate(CompanyConfigCreate):
    company_rut: Optional[str] = Field(None, min_length=8, max_length=12)
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    company_business_name: Optional[str] = Field(None, min_length=2, max_length=255)
    company_address: Optional[str] = Field(None, min_length=2)
    company_comuna: Optional[str] = Field(None, min_length=2, max_length=100)
    company_city: Optional[str] = Field(None, min_length=2, max_length=100)
    company_region: Optional[str] = Field(None, min_length=2, max_length=100)
    economic_activity_code: Optional[str] = Field(None, min_length=1, max_length=10)
    economic_activity_name: Optional[str] = Field(None, min_length=2, max_length=255)
    dte_environment: Optional[str] = Field(None, pattern="^(CERTIFICACION|PRODUCCION)$")
    default_customer_currency_code: Optional[str] = Field(None, pattern="^[A-Z]{3}$")
    default_supplier_currency_code: Optional[str] = Field(None, pattern="^[A-Z]{3}$")
    default_sales_currency_code: Optional[str] = Field(None, pattern="^[A-Z]{3}$")
    is_active: Optional[bool] = None

    @field_validator("company_rut")
    @classmethod
    def validate_optional_company_rut(cls, value: str | None) -> str | None:
        if value in (None, ""):
            return value
        return validate_and_normalize_chilean_rut(value)
