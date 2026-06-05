"""
Schemas Pydantic para tipos y series de documentos.
"""
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class DocumentTypeUpdate(BaseModel):
    document_type_name: Optional[str] = Field(None, min_length=2, max_length=100)
    document_category: Optional[str] = Field(None, pattern="^(PURCHASE|SALE|INVENTORY|TRANSFER)$")
    requires_approval: Optional[bool] = None
    generates_movement: Optional[bool] = None
    movement_type: Optional[str] = Field(None, pattern="^(IN|OUT|TRANSFER|ADJUSTMENT)$")
    is_active: Optional[bool] = None


class DocumentSeriesCreate(BaseModel):
    document_type_id: int = Field(..., gt=0)
    warehouse_id: Optional[int] = Field(None, gt=0)
    series_prefix: Optional[str] = Field(None, max_length=10)
    current_number: int = Field(default=0, ge=0)
    min_number: int = Field(default=1, ge=1)
    max_number: int = Field(default=999999999, ge=1)
    number_length: int = Field(default=8, ge=1, le=18)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_range(self):
        if self.max_number < self.min_number:
            raise ValueError("El numero maximo no puede ser menor que el minimo")
        return self


class DocumentSeriesUpdate(BaseModel):
    document_type_id: Optional[int] = Field(None, gt=0)
    warehouse_id: Optional[int] = Field(None, gt=0)
    series_prefix: Optional[str] = Field(None, max_length=10)
    current_number: Optional[int] = Field(None, ge=0)
    min_number: Optional[int] = Field(None, ge=1)
    max_number: Optional[int] = Field(None, ge=1)
    number_length: Optional[int] = Field(None, ge=1, le=18)
    is_active: Optional[bool] = None
