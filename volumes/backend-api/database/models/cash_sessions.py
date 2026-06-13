"""
Modelos SQLAlchemy para sesiones de caja, denominaciones y conteo de efectivo.
"""
from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Column, DECIMAL, Enum, ForeignKey, Index, Integer, String, Text, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship

from .base import BaseModel, SimpleBaseModel

CASH_SESSION_OPEN = 14
CASH_SESSION_PENDING_CLOSE = 15
CASH_SESSION_CLOSED = 16
CASH_SESSION_CANCELLED = 17


class CashRegisterSession(BaseModel):
    """Sesion de apertura y cierre de caja registradora."""

    __tablename__ = "cash_register_sessions"

    session_code = Column(String(36), nullable=False, unique=True)
    cash_register_id = Column(BigInteger, ForeignKey("cash_registers.id"), nullable=False)
    cashier_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    supervisor_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    opening_amount = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))
    opening_datetime = Column(TIMESTAMP, nullable=False)
    opening_notes = Column(Text, nullable=True)
    closing_datetime = Column(TIMESTAMP, nullable=True)
    theoretical_amount = Column(DECIMAL(15, 2), nullable=True)
    physical_amount = Column(DECIMAL(15, 2), nullable=True)
    difference_amount = Column(DECIMAL(15, 2), nullable=True)
    closing_notes = Column(Text, nullable=True)
    status_id = Column(BigInteger, nullable=False, default=CASH_SESSION_OPEN)
    requires_supervisor_approval = Column(Boolean, nullable=False, default=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    approved_datetime = Column(TIMESTAMP, nullable=True)

    cash_register = relationship("CashRegister")
    denomination_counts = relationship(
        "CashSessionDenominationCount",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    observations = relationship(
        "CashSessionObservation",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="CashSessionObservation.observed_at",
    )

    __table_args__ = (
        Index("idx_cash_sessions_cash_register_id", "cash_register_id"),
        Index("idx_cash_sessions_cashier_user_id", "cashier_user_id"),
        Index("idx_cash_sessions_status_id", "status_id"),
        Index("idx_cash_sessions_deleted_at", "deleted_at"),
    )


class CurrencyDenomination(SimpleBaseModel):
    """Denominacion de efectivo (moneda o billete) para arqueo de caja."""

    __tablename__ = "currency_denominations"

    denomination_value = Column(Integer, nullable=False, unique=True)
    denomination_type = Column(Enum("COIN", "BILL", name="denomination_type_enum"), nullable=False)
    denomination_label = Column(String(50), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("idx_denomination_type", "denomination_type"),
        Index("idx_denomination_sort_order", "sort_order"),
        Index("idx_denomination_is_active", "is_active"),
    )


class CashSessionObservation(SimpleBaseModel):
    """Observacion historica asociada a una etapa de la sesion de caja."""

    __tablename__ = "cash_session_observations"

    cash_register_session_id = Column(
        BigInteger, ForeignKey("cash_register_sessions.id"), nullable=False
    )
    observation_type = Column(
        Enum("OPENING", "CLOSING", "CASH_COUNT", "APPROVAL", "REJECTION", name="cash_session_observation_type_enum"),
        nullable=False,
    )
    observation_text = Column(Text, nullable=False)
    observed_at = Column(TIMESTAMP, nullable=False)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)

    session = relationship("CashRegisterSession", back_populates="observations")

    __table_args__ = (
        Index("idx_cso_session_id", "cash_register_session_id"),
        Index("idx_cso_observation_type", "observation_type"),
        Index("idx_cso_observed_at", "observed_at"),
        Index("idx_cso_created_by_user_id", "created_by_user_id"),
    )


class CashSessionDenominationCount(SimpleBaseModel):
    """Conteo de billetes y monedas en apertura o cierre de sesion de caja."""

    __tablename__ = "cash_session_denomination_counts"

    cash_register_session_id = Column(
        BigInteger, ForeignKey("cash_register_sessions.id"), nullable=False
    )
    currency_denomination_id = Column(
        BigInteger, ForeignKey("currency_denominations.id"), nullable=False
    )
    count_type = Column(Enum("OPENING", "CLOSING", name="count_type_enum"), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    subtotal = Column(DECIMAL(15, 2), nullable=False, default=Decimal("0.00"))

    session = relationship("CashRegisterSession", back_populates="denomination_counts")
    denomination = relationship("CurrencyDenomination")

    __table_args__ = (
        UniqueConstraint(
            "cash_register_session_id", "currency_denomination_id", "count_type",
            name="uk_csdc_session_denom_type",
        ),
        Index("idx_csdc_session_id", "cash_register_session_id"),
        Index("idx_csdc_denomination_id", "currency_denomination_id"),
    )
