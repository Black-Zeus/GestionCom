"""
Schemas Pydantic para configuracion de productos.
"""
from typing import Optional

from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    parent_id: Optional[int] = Field(None, gt=0)
    category_name: str = Field(..., min_length=2, max_length=150)
    category_description: Optional[str] = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class CategoryUpdate(BaseModel):
    parent_id: Optional[int] = Field(None, gt=0)
    category_name: Optional[str] = Field(None, min_length=2, max_length=150)
    category_description: Optional[str] = None
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class AttributeGroupCreate(BaseModel):
    group_name: str = Field(..., min_length=2, max_length=100)
    group_description: Optional[str] = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AttributeGroupUpdate(BaseModel):
    group_name: Optional[str] = Field(None, min_length=2, max_length=100)
    group_description: Optional[str] = None
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class AttributeCreate(BaseModel):
    attribute_group_id: int = Field(..., gt=0)
    attribute_name: str = Field(..., min_length=2, max_length=100)
    attribute_type: str = Field(default="TEXT", pattern="^(TEXT|NUMBER|BOOLEAN|SELECT|MULTISELECT)$")
    is_required: bool = False
    affects_sku: bool = False
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AttributeUpdate(BaseModel):
    attribute_group_id: Optional[int] = Field(None, gt=0)
    attribute_name: Optional[str] = Field(None, min_length=2, max_length=100)
    attribute_type: Optional[str] = Field(None, pattern="^(TEXT|NUMBER|BOOLEAN|SELECT|MULTISELECT)$")
    is_required: Optional[bool] = None
    affects_sku: Optional[bool] = None
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class AttributeValueCreate(BaseModel):
    attribute_id: int = Field(..., gt=0)
    value_name: str = Field(..., min_length=1, max_length=100)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AttributeValueUpdate(BaseModel):
    value_name: Optional[str] = Field(None, min_length=1, max_length=100)
    sort_order: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
