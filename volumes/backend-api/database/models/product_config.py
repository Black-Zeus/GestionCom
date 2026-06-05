"""
Modelos SQLAlchemy para configuracion base de productos.
"""
import enum

from sqlalchemy import BigInteger, Boolean, Column, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class AttributeType(enum.Enum):
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"
    MULTISELECT = "MULTISELECT"


class Category(BaseModel):
    __tablename__ = "categories"

    parent_id = Column(BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    category_code = Column(String(50), nullable=False, unique=True)
    category_name = Column(String(150), nullable=False)
    category_description = Column(Text, nullable=True)
    category_level = Column(Integer, nullable=False, default=1)
    category_path = Column(String(1000), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    parent = relationship("Category", remote_side="Category.id")

    __table_args__ = (
        Index("idx_parent_id", "parent_id"),
        Index("idx_category_code", "category_code"),
        Index("idx_category_level", "category_level"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("category_code")
    def validate_category_code(self, key, category_code):
        return CommonValidators.validate_code(category_code, min_length=2, max_length=50, field_name="Codigo de categoria")

    @validates("category_name")
    def validate_category_name(self, key, category_name):
        return CommonValidators.validate_string_length(category_name, min_length=2, max_length=150, field_name="Nombre de categoria")


class AttributeGroup(BaseModel):
    __tablename__ = "attribute_groups"

    group_code = Column(String(50), nullable=False, unique=True)
    group_name = Column(String(100), nullable=False)
    group_description = Column(Text, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    attributes = relationship("ProductAttribute", back_populates="group")

    @validates("group_code")
    def validate_group_code(self, key, group_code):
        return CommonValidators.validate_code(group_code, min_length=2, max_length=50, field_name="Codigo de grupo")


class ProductAttribute(BaseModel):
    __tablename__ = "attributes"

    attribute_group_id = Column(BigInteger, ForeignKey("attribute_groups.id", ondelete="CASCADE"), nullable=False)
    attribute_code = Column(String(50), nullable=False, unique=True)
    attribute_name = Column(String(100), nullable=False)
    attribute_type = Column(Enum(AttributeType), nullable=False, default=AttributeType.TEXT)
    is_required = Column(Boolean, nullable=False, default=False)
    affects_sku = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    group = relationship("AttributeGroup", back_populates="attributes")
    values = relationship("AttributeValue", back_populates="attribute")

    @validates("attribute_code")
    def validate_attribute_code(self, key, attribute_code):
        return CommonValidators.validate_code(attribute_code, min_length=2, max_length=50, field_name="Codigo de atributo")


class AttributeValue(BaseModel):
    __tablename__ = "attribute_values"

    attribute_id = Column(BigInteger, ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False)
    value_code = Column(String(50), nullable=False)
    value_name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    attribute = relationship("ProductAttribute", back_populates="values")

    @validates("value_code")
    def validate_value_code(self, key, value_code):
        return CommonValidators.validate_code(value_code, min_length=2, max_length=50, field_name="Codigo de valor")
