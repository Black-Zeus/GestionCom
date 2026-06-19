"""
Modelos SQLAlchemy para configuracion base de ventas e inventario.
"""
import enum

from sqlalchemy import BigInteger, Boolean, Column, Date, Enum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators, SimpleBaseModel


class TaxType(enum.Enum):
    VAT = "VAT"
    EXEMPT = "EXEMPT"
    ADDITIONAL = "ADDITIONAL"
    WITHHOLDING = "WITHHOLDING"
    OTHER = "OTHER"


class BaseAdjustmentType(enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED = "FIXED"


class PriceListScope(enum.Enum):
    ALL_PRODUCTS = "ALL_PRODUCTS"
    CATEGORY = "CATEGORY"
    SPECIFIC = "SPECIFIC"


class DteEnvironment(enum.Enum):
    CERTIFICACION = "CERTIFICACION"
    PRODUCCION = "PRODUCCION"


class TaxRate(BaseModel):
    __tablename__ = "tax_rates"

    tax_code = Column(String(20), nullable=False, unique=True)
    tax_name = Column(String(100), nullable=False)
    tax_type = Column(Enum(TaxType), nullable=False, default=TaxType.VAT)
    rate_percentage = Column(Numeric(7, 4), nullable=False, default=0)
    is_default = Column(Boolean, nullable=False, default=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_tax_code", "tax_code"),
        Index("idx_tax_type", "tax_type"),
        Index("idx_tax_valid_from", "valid_from"),
        Index("idx_tax_is_active", "is_active"),
        Index("idx_tax_deleted_at", "deleted_at"),
    )

    @validates("tax_code")
    def validate_tax_code(self, key, tax_code):
        return CommonValidators.validate_code(tax_code, min_length=2, max_length=20, field_name="Codigo de impuesto")


class PriceListGroup(BaseModel):
    __tablename__ = "price_list_groups"

    group_code = Column(String(50), nullable=False, unique=True)
    group_name = Column(String(100), nullable=False)
    group_description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    price_lists = relationship("PriceList", back_populates="group")

    @validates("group_code")
    def validate_group_code(self, key, group_code):
        return CommonValidators.validate_code(group_code, min_length=2, max_length=50, field_name="Codigo de grupo")


class PriceList(BaseModel):
    __tablename__ = "price_lists"

    price_list_group_id = Column(BigInteger, ForeignKey("price_list_groups.id", ondelete="SET NULL"), nullable=True)
    price_list_code = Column(String(50), nullable=False, unique=True)
    price_list_name = Column(String(150), nullable=False)
    base_price_list_id = Column(BigInteger, ForeignKey("price_lists.id", ondelete="SET NULL"), nullable=True)
    base_adjustment_type = Column(Enum(BaseAdjustmentType), nullable=True)
    base_adjustment_value = Column(Numeric(10, 4), nullable=True)
    currency_code = Column(String(3), nullable=False, default="CLP")
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    priority = Column(Integer, nullable=False, default=1)
    applies_to = Column(Enum(PriceListScope), nullable=False, default=PriceListScope.ALL_PRODUCTS)
    is_active = Column(Boolean, nullable=False, default=True)

    group = relationship("PriceListGroup", back_populates="price_lists")
    base_price_list = relationship("PriceList", remote_side="PriceList.id")

    @validates("price_list_code")
    def validate_price_list_code(self, key, price_list_code):
        return CommonValidators.validate_code(price_list_code, min_length=2, max_length=50, field_name="Codigo de lista")


class PriceListItem(BaseModel):
    __tablename__ = "price_list_items"

    price_list_id = Column(BigInteger, ForeignKey("price_lists.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=True)
    product_variant_id = Column(BigInteger, ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True)
    measurement_unit_id = Column(BigInteger, ForeignKey("measurement_units.id", ondelete="CASCADE"), nullable=False)
    base_price = Column(Numeric(15, 4), nullable=False)
    sale_price = Column(Numeric(15, 4), nullable=False)
    cost_price = Column(Numeric(15, 4), nullable=True)
    margin_percentage = Column(Numeric(5, 2), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    price_list = relationship("PriceList")
    product = relationship("Product")
    product_variant = relationship("ProductVariant")
    measurement_unit = relationship("MeasurementUnit")


class Product(BaseModel):
    __tablename__ = "products"

    category_id = Column(BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    product_code = Column(String(50), nullable=False, unique=True)
    product_name = Column(String(200), nullable=False)
    product_description = Column(Text, nullable=True)
    primary_image_media_asset_id = Column(BigInteger, nullable=True)
    brand_id = Column(BigInteger, ForeignKey("product_brands.id", ondelete="SET NULL"), nullable=True)
    brand = Column(String(100), nullable=True)
    product_model_id = Column(BigInteger, ForeignKey("product_models.id", ondelete="SET NULL"), nullable=True)
    model = Column(String(100), nullable=True)
    base_measurement_unit_id = Column(BigInteger, ForeignKey("measurement_units.id", ondelete="RESTRICT"), nullable=False)
    base_price = Column(Numeric(15, 4), nullable=True)
    cost_price = Column(Numeric(15, 4), nullable=True)
    has_variants = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    has_batch_control = Column(Boolean, nullable=False, default=False)
    has_expiry_date = Column(Boolean, nullable=False, default=False)
    has_serial_numbers = Column(Boolean, nullable=False, default=False)
    has_location_tracking = Column(Boolean, nullable=False, default=True)
    variant_image_mode = Column(Enum('inherit', 'own', 'default'), nullable=False, server_default='inherit')

    category = relationship("Category")
    base_unit = relationship("MeasurementUnit")
    variants = relationship("ProductVariant", back_populates="product")
    brand_ref = relationship("ProductBrand")
    model_ref = relationship("ProductModel")

    @validates("product_code")
    def validate_product_code(self, key, product_code):
        return CommonValidators.validate_code(product_code, min_length=2, max_length=50, field_name="Codigo de producto")


class ProductVariant(BaseModel):
    __tablename__ = "product_variants"

    product_id = Column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    variant_sku = Column(String(100), nullable=False, unique=True)
    variant_name = Column(String(200), nullable=False)
    variant_description = Column(Text, nullable=True)
    is_default_variant = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    image_mode = Column(Enum('inherit', 'own', 'default'), nullable=False, server_default='inherit')
    primary_image_media_asset_id = Column(BigInteger, nullable=True)

    product = relationship("Product", back_populates="variants")

    @validates("variant_sku")
    def validate_variant_sku(self, key, variant_sku):
        return CommonValidators.validate_code(variant_sku, min_length=2, max_length=100, field_name="SKU")


class ProductBrand(BaseModel):
    __tablename__ = "product_brands"

    brand_code = Column(String(50), nullable=False, unique=True)
    brand_name = Column(String(150), nullable=False)
    brand_description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class ProductModel(BaseModel):
    __tablename__ = "product_models"

    brand_id = Column(BigInteger, ForeignKey("product_brands.id", ondelete="SET NULL"), nullable=True)
    model_code = Column(String(50), nullable=False, unique=True)
    model_name = Column(String(150), nullable=False)
    model_description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    brand = relationship("ProductBrand")


class DteCompanyConfig(BaseModel):
    __tablename__ = "dte_company_config"

    company_rut = Column(String(12), nullable=False, unique=True)
    company_name = Column(String(255), nullable=False)
    company_business_name = Column(String(255), nullable=False)
    company_address = Column(Text, nullable=False)
    company_comuna = Column(String(100), nullable=False)
    company_city = Column(String(100), nullable=False)
    company_region = Column(String(100), nullable=False)
    economic_activity_code = Column(String(10), nullable=False)
    economic_activity_name = Column(String(255), nullable=False)
    dte_environment = Column(Enum(DteEnvironment), nullable=False, default=DteEnvironment.CERTIFICACION)
    default_customer_currency_code = Column(String(3), nullable=False, default="CLP")
    default_supplier_currency_code = Column(String(3), nullable=False, default="CLP")
    default_sales_currency_code = Column(String(3), nullable=False, default="CLP")
    certificate_path = Column(String(500), nullable=True)
    certificate_password = Column(String(255), nullable=True)
    sii_user = Column(String(100), nullable=True)
    logo_media_asset_id = Column(BigInteger, nullable=True)
    banner_media_asset_id = Column(BigInteger, nullable=True)
    sii_password = Column(String(255), nullable=True)
    current_folio_33 = Column(BigInteger, nullable=False, default=1)
    current_folio_39 = Column(BigInteger, nullable=False, default=1)
    current_folio_52 = Column(BigInteger, nullable=False, default=1)
    current_folio_61 = Column(BigInteger, nullable=False, default=1)
    folio_range_33_from = Column(BigInteger, nullable=True)
    folio_range_33_to = Column(BigInteger, nullable=True)
    folio_range_39_from = Column(BigInteger, nullable=True)
    folio_range_39_to = Column(BigInteger, nullable=True)
    folio_range_52_from = Column(BigInteger, nullable=True)
    folio_range_52_to = Column(BigInteger, nullable=True)
    folio_range_61_from = Column(BigInteger, nullable=True)
    folio_range_61_to = Column(BigInteger, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
