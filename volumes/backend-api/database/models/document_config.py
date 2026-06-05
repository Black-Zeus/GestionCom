"""
Modelos SQLAlchemy para tipos y series de documentos.
"""
import enum

from sqlalchemy import BigInteger, Boolean, Column, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship, validates

from .base import BaseModel, CommonValidators


class DocumentCategory(enum.Enum):
    PURCHASE = "PURCHASE"
    SALE = "SALE"
    INVENTORY = "INVENTORY"
    TRANSFER = "TRANSFER"


class MovementType(enum.Enum):
    IN = "IN"
    OUT = "OUT"
    TRANSFER = "TRANSFER"
    ADJUSTMENT = "ADJUSTMENT"


class DocumentType(BaseModel):
    __tablename__ = "document_types"

    document_type_code = Column(String(50), nullable=False, unique=True)
    document_type_name = Column(String(100), nullable=False)
    document_category = Column(Enum(DocumentCategory), nullable=False)
    requires_approval = Column(Boolean, nullable=False, default=False)
    generates_movement = Column(Boolean, nullable=False, default=True)
    movement_type = Column(Enum(MovementType), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_document_type_code", "document_type_code"),
        Index("idx_document_category", "document_category"),
        Index("idx_movement_type", "movement_type"),
        Index("idx_is_active", "is_active"),
        Index("idx_deleted_at", "deleted_at"),
    )

    @validates("document_type_code")
    def validate_document_type_code(self, key, document_type_code):
        return CommonValidators.validate_code(document_type_code, min_length=2, max_length=50, field_name="Codigo de tipo")


class DocumentSeries(BaseModel):
    __tablename__ = "document_series"

    document_type_id = Column(BigInteger, ForeignKey("document_types.id", ondelete="CASCADE"), nullable=False)
    warehouse_id = Column(BigInteger, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=True)
    series_code = Column(String(20), nullable=False)
    series_prefix = Column(String(10), nullable=True)
    current_number = Column(BigInteger, nullable=False, default=0)
    min_number = Column(BigInteger, nullable=False, default=1)
    max_number = Column(BigInteger, nullable=False, default=999999999)
    number_length = Column(Integer, nullable=False, default=8)
    is_active = Column(Boolean, nullable=False, default=True)

    document_type = relationship("DocumentType")
    warehouse = relationship("Warehouse")

    __table_args__ = (
        Index("idx_document_type_id", "document_type_id"),
        Index("idx_warehouse_id", "warehouse_id"),
        Index("idx_series_code", "series_code"),
        Index("idx_is_active", "is_active"),
    )
