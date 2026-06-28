"""
Schemas Pydantic para el sistema de impresión térmica.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class PrintTemplateCreate(BaseModel):
    template_code: str = Field(..., min_length=2, max_length=50)
    template_name: str = Field(..., min_length=3, max_length=100)
    version: str = Field(..., max_length=20)
    content: Dict[str, Any]
    paper_width_mm: int = Field(80, ge=57, le=112)
    is_active: bool = True


class PrintTemplateUpdate(BaseModel):
    template_name: Optional[str] = Field(None, min_length=3, max_length=100)
    version: Optional[str] = Field(None, max_length=20)
    content: Optional[Dict[str, Any]] = None
    paper_width_mm: Optional[int] = Field(None, ge=57, le=112)
    is_active: Optional[bool] = None


class PrintJobStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(PROCESSING|COMPLETED|FAILED)$")
    error_message: Optional[str] = Field(None, max_length=1000)


class ReprintRequest(BaseModel):
    sales_point_id: int = Field(..., gt=0)
    ticket_type: str = Field("TICKET_VENTA", pattern="^(TICKET_VENTA|TICKET_CAMBIO|TICKET_PRUEBA)$")
