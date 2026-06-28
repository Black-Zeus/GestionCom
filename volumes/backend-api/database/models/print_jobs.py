"""
Modelos para el sistema de impresión térmica centralizada.
"""
import enum

from sqlalchemy import BigInteger, Boolean, Column, Enum, ForeignKey, Index, Integer, JSON, String, TIMESTAMP, Text
from sqlalchemy.orm import relationship

from .base import BaseModel


class PrintTicketType(str, enum.Enum):
    TICKET_VENTA = "TICKET_VENTA"
    TICKET_CAMBIO = "TICKET_CAMBIO"
    TICKET_PRUEBA = "TICKET_PRUEBA"


class PrintJobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PrintTemplate(BaseModel):
    """Template de boleta térmica con versionado centralizado."""

    __tablename__ = "print_templates"

    template_code = Column(String(50), nullable=False, unique=True, comment="Código único del template")
    template_name = Column(String(100), nullable=False, comment="Nombre descriptivo")
    version = Column(String(20), nullable=False, default="1.0.0", comment="Versión semántica")
    content = Column(JSON, nullable=False, comment="Definición JSON del layout")
    paper_width_mm = Column(Integer, nullable=False, default=80, comment="Ancho del papel en mm")
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_print_templates_code", "template_code"),
        Index("idx_print_templates_active", "is_active"),
        Index("idx_print_templates_deleted_at", "deleted_at"),
    )

    @property
    def display_name(self):
        return f"{self.template_code} v{self.version}"


class PrintJob(BaseModel):
    """Trabajo de impresión en cola para un agente de caja."""

    __tablename__ = "print_jobs"

    job_code = Column(String(36), nullable=False, unique=True, comment="UUID del trabajo")
    sales_point_id = Column(BigInteger, ForeignKey("sales_points.id"), nullable=True, comment="Punto de venta destino")
    cash_register_id = Column(BigInteger, ForeignKey("cash_registers.id"), nullable=True, comment="Caja registradora destino")
    sale_document_id = Column(BigInteger, ForeignKey("sale_documents.id"), nullable=True, comment="Documento de venta asociado")
    ticket_type = Column(Enum(PrintTicketType), nullable=False, comment="Tipo de ticket a imprimir")
    template_version = Column(String(20), nullable=True, comment="Versión del template al crear el job")
    status = Column(Enum(PrintJobStatus), nullable=False, default=PrintJobStatus.PENDING)
    payload = Column(JSON, nullable=False, comment="Datos a renderizar en el ticket")
    error_message = Column(Text, nullable=True)
    attempts = Column(Integer, nullable=False, default=0)
    requested_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)

    sales_point = relationship("SalesPoint", foreign_keys=[sales_point_id])
    cash_register = relationship("CashRegister", foreign_keys=[cash_register_id])

    __table_args__ = (
        Index("idx_print_jobs_code", "job_code"),
        Index("idx_print_jobs_sales_point", "sales_point_id"),
        Index("idx_print_jobs_register", "cash_register_id"),
        Index("idx_print_jobs_sale", "sale_document_id"),
        Index("idx_print_jobs_status", "status"),
        Index("idx_print_jobs_deleted_at", "deleted_at"),
    )
