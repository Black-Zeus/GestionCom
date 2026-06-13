"""
Rutas para apertura, cierre y arqueo de sesiones de caja registradora.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from fastapi import APIRouter, Depends, Path, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel as PydanticBaseModel, Field
from sqlalchemy import and_, select, text
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.cash_registers import CashRegister
from database.models.cash_sessions import (
    CashRegisterSession,
    CashSessionDenominationCount,
    CashSessionObservation,
    CurrencyDenomination,
    CASH_SESSION_OPEN,
    CASH_SESSION_PENDING_CLOSE,
    CASH_SESSION_CLOSED,
)
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Cash Sessions"])

CENT = Decimal("0.01")
OBSERVATION_LABELS = {
    "OPENING": "Apertura",
    "CLOSING": "Cierre",
    "CASH_COUNT": "Arqueo",
    "APPROVAL": "Aprobacion",
    "REJECTION": "Rechazo",
}


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def _parse_closing_notes(raw: str | None) -> tuple[str | None, str | None]:
    """Separa las notas del cajero de las del supervisor almacenadas en closing_notes."""
    if not raw:
        return None, None
    for prefix in ["\n[Supervisor]:", "\n[Rechazado por supervisor]:"]:
        if prefix in raw:
            idx = raw.index(prefix)
            cashier = raw[:idx].strip() or None
            supervisor = raw[idx + len(prefix):].strip() or None
            return cashier, supervisor
    if raw.startswith("[Rechazado por supervisor]:"):
        return None, raw[len("[Rechazado por supervisor]:"):].strip() or None
    return raw.strip() or None, None


def _user_display_name(user_row) -> str | None:
    if not user_row:
        return None
    first = (user_row.get("first_name") or "").strip()
    last = (user_row.get("last_name") or "").strip()
    username = (user_row.get("username") or "").strip()
    full = f"{first} {last}".strip()
    return full or username or None


def _observation_to_dict(observation: CashSessionObservation, user_map: dict | None = None) -> dict:
    um = user_map or {}
    user_row = um.get(observation.created_by_user_id)
    return {
        "id": observation.id,
        "cash_register_session_id": observation.cash_register_session_id,
        "observation_type": observation.observation_type,
        "observation_label": OBSERVATION_LABELS.get(observation.observation_type, observation.observation_type),
        "observation_text": observation.observation_text,
        "observed_at": observation.observed_at.isoformat() if observation.observed_at else None,
        "created_by_user_id": observation.created_by_user_id,
        "created_by_name": _user_display_name(user_row),
        "created_at": observation.created_at.isoformat() if observation.created_at else None,
    }


def _session_observations(session: CashRegisterSession) -> list[CashSessionObservation]:
    fallback = datetime.min.replace(tzinfo=timezone.utc)
    return sorted(session.observations or [], key=lambda item: item.observed_at or item.created_at or fallback)


def _latest_observation_text(session: CashRegisterSession, *types: str) -> str | None:
    candidates = [
        obs for obs in _session_observations(session)
        if obs.observation_type in types and obs.observation_text
    ]
    return candidates[-1].observation_text if candidates else None


def _cashier_notes(session: CashRegisterSession) -> str | None:
    return _latest_observation_text(session, "CASH_COUNT", "CLOSING")


def _supervisor_notes(session: CashRegisterSession) -> str | None:
    return _latest_observation_text(session, "APPROVAL", "REJECTION")


def _add_cash_session_observation(
    db_session,
    cash_register_session_id: int,
    observation_type: str,
    observation_text: str | None,
    observed_at: datetime,
    created_by_user_id: int | None,
) -> CashSessionObservation | None:
    text_value = (observation_text or "").strip()
    if not text_value:
        return None
    observation = CashSessionObservation(
        cash_register_session_id=cash_register_session_id,
        observation_type=observation_type,
        observation_text=text_value,
        observed_at=observed_at,
        created_by_user_id=created_by_user_id or None,
    )
    db_session.add(observation)
    return observation


async def _load_session_for_response(db_session, session_id: int) -> CashRegisterSession | None:
    result = await db_session.execute(
        select(CashRegisterSession)
        .options(
            selectinload(CashRegisterSession.cash_register),
            selectinload(CashRegisterSession.observations),
            selectinload(CashRegisterSession.denomination_counts).selectinload(
                CashSessionDenominationCount.denomination
            ),
        )
        .where(CashRegisterSession.id == session_id)
    )
    return result.scalar_one_or_none()


def session_to_dict(
    session: CashRegisterSession,
    include_counts: bool = False,
    user_map: dict | None = None,
) -> dict:
    parsed_cashier_notes, parsed_supervisor_notes = _parse_closing_notes(session.closing_notes)
    cashier_notes = _cashier_notes(session) or parsed_cashier_notes
    supervisor_notes = _supervisor_notes(session) or parsed_supervisor_notes
    um = user_map or {}
    cashier_row = um.get(session.cashier_user_id)
    supervisor_row = um.get(session.supervisor_user_id)
    d = {
        "id": session.id,
        "session_code": session.session_code,
        "cash_register_id": session.cash_register_id,
        "cashier_user_id": session.cashier_user_id,
        "cashier_name": _user_display_name(cashier_row),
        "supervisor_user_id": session.supervisor_user_id,
        "supervisor_name": _user_display_name(supervisor_row),
        "opening_amount": str(session.opening_amount or "0.00"),
        "opening_datetime": session.opening_datetime.isoformat() if session.opening_datetime else None,
        "opening_notes": session.opening_notes,
        "closing_datetime": session.closing_datetime.isoformat() if session.closing_datetime else None,
        "theoretical_amount": str(session.theoretical_amount) if session.theoretical_amount is not None else None,
        "physical_amount": str(session.physical_amount) if session.physical_amount is not None else None,
        "difference_amount": str(session.difference_amount) if session.difference_amount is not None else None,
        "closing_notes": session.closing_notes,
        "cashier_notes": cashier_notes,
        "supervisor_notes": supervisor_notes,
        "status_id": session.status_id,
        "requires_supervisor_approval": session.requires_supervisor_approval,
        "is_approved": session.is_approved,
        "approved_datetime": session.approved_datetime.isoformat() if session.approved_datetime else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "cash_register": None,
        "observations": [
            _observation_to_dict(obs, user_map=um)
            for obs in _session_observations(session)
        ],
    }
    if session.cash_register:
        reg = session.cash_register
        d["cash_register"] = {
            "id": reg.id,
            "register_code": reg.register_code,
            "register_name": reg.register_name,
        }
    if include_counts and session.denomination_counts:
        d["denomination_counts"] = [
            {
                "id": c.id,
                "currency_denomination_id": c.currency_denomination_id,
                "count_type": c.count_type,
                "quantity": c.quantity,
                "subtotal": str(c.subtotal),
                "denomination": {
                    "id": c.denomination.id,
                    "denomination_value": c.denomination.denomination_value,
                    "denomination_type": c.denomination.denomination_type,
                    "denomination_label": c.denomination.denomination_label,
                } if c.denomination else None,
            }
            for c in session.denomination_counts
        ]
    return d


class DenominationCountPayload(PydanticBaseModel):
    denomination_id: int
    quantity: int = Field(ge=0)


class OpenSessionPayload(PydanticBaseModel):
    cash_register_id: int
    opening_amount: Decimal = Field(ge=0)
    opening_notes: str | None = Field(None, max_length=500)
    denomination_counts: list[DenominationCountPayload] = []


class CloseSessionPayload(PydanticBaseModel):
    physical_amount: Decimal = Field(ge=0)
    closing_notes: str | None = Field(None, max_length=500)
    cash_count_notes: str | None = Field(None, max_length=500)
    denomination_counts: list[DenominationCountPayload] = []


class ApproveSessionPayload(PydanticBaseModel):
    supervisor_notes: str | None = Field(None, max_length=500)


class RejectSessionPayload(PydanticBaseModel):
    rejection_reason: str = Field(min_length=3, max_length=500)


@router.get("/denominations", response_class=JSONResponse)
async def list_denominations(request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(CurrencyDenomination)
            .where(CurrencyDenomination.is_active.is_(True))
            .order_by(CurrencyDenomination.sort_order)
        )
        denominations = result.scalars().all()
        data = [
            {
                "id": d.id,
                "denomination_value": d.denomination_value,
                "denomination_type": d.denomination_type,
                "denomination_label": d.denomination_label,
                "sort_order": d.sort_order,
            }
            for d in denominations
        ]
        return ResponseManager.success(data=data, request=request)


@router.get("/active", response_class=JSONResponse)
async def list_active_sessions(request: Request, user: dict = Depends(get_current_user)):

    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
            )
            .where(
                and_(
                    CashRegisterSession.status_id == CASH_SESSION_OPEN,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
            .order_by(CashRegisterSession.opening_datetime.desc())
        )
        sessions = result.scalars().all()
        return ResponseManager.success(data=[session_to_dict(s) for s in sessions], request=request)


@router.get("", response_class=JSONResponse)
async def list_sessions(
    request: Request,
    cash_register_id: int | None = None,
    status_id: int | None = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):

    async with db_manager.get_async_session() as session:
        filters = [CashRegisterSession.deleted_at.is_(None)]
        if cash_register_id:
            filters.append(CashRegisterSession.cash_register_id == cash_register_id)
        if status_id:
            filters.append(CashRegisterSession.status_id == status_id)
        result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
            )
            .where(and_(*filters))
            .order_by(CashRegisterSession.opening_datetime.desc())
            .limit(limit)
        )
        sessions = result.scalars().all()
        return ResponseManager.success(data=[session_to_dict(s) for s in sessions], request=request)


@router.get("/{session_id}", response_class=JSONResponse)
async def get_session(
    session_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):

    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
                selectinload(CashRegisterSession.denomination_counts).selectinload(
                    CashSessionDenominationCount.denomination
                ),
            )
            .where(
                and_(
                    CashRegisterSession.id == session_id,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
        )
        sess = result.scalar_one_or_none()
        if not sess:
            return ResponseManager.error(
                message="Sesion no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )

        user_ids = list(filter(None, {
            sess.cashier_user_id,
            sess.supervisor_user_id,
            *[obs.created_by_user_id for obs in _session_observations(sess)],
        }))
        user_map = {}
        if user_ids:
            users_result = await session.execute(
                text("SELECT id, first_name, last_name, username FROM users WHERE id IN :ids"),
                {"ids": tuple(user_ids)},
            )
            user_map = {row["id"]: dict(row) for row in users_result.mappings().all()}

        return ResponseManager.success(data=session_to_dict(sess, include_counts=True, user_map=user_map), request=request)


@router.get("/{session_id}/summary", response_class=JSONResponse)
async def get_session_summary(
    session_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):
    async with db_manager.get_async_session() as session:
        sess_result = await session.execute(
            select(CashRegisterSession).where(
                and_(
                    CashRegisterSession.id == session_id,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
        )
        sess = sess_result.scalar_one_or_none()
        if not sess:
            return ResponseManager.error(
                message="Sesion no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )

        by_method_result = await session.execute(
            text("""
                SELECT
                    sd.payment_method_code,
                    sd.payment_method_name,
                    COALESCE(pm.method_type, 'OTHER') AS method_type,
                    COUNT(*) AS transaction_count,
                    SUM(sd.total_amount) AS total_amount
                FROM sale_documents sd
                LEFT JOIN payment_methods pm
                    ON pm.method_code = sd.payment_method_code
                    AND pm.deleted_at IS NULL
                WHERE sd.cash_register_session_id = :session_id
                    AND sd.status = 'CLOSED'
                    AND sd.deleted_at IS NULL
                GROUP BY sd.payment_method_code, sd.payment_method_name, pm.method_type
                ORDER BY total_amount DESC
            """),
            {"session_id": session_id},
        )
        by_method = [dict(row._mapping) for row in by_method_result]

        cash_total = sum(
            Decimal(str(row["total_amount"] or 0))
            for row in by_method
            if row["method_type"] == "CASH"
        )

        petty_cash_result = await session.execute(
            text("""
                SELECT COALESCE(SUM(expense_amount), 0) AS total
                FROM petty_cash_expenses
                WHERE cash_register_session_id = :session_id
                  AND status_id != 35
            """),
            {"session_id": session_id},
        )
        petty_cash_total = money(petty_cash_result.scalar_one() or 0)
        theoretical_cash = money(money(sess.opening_amount) + cash_total - petty_cash_total)

        return ResponseManager.success(
            data={
                "session_id": session_id,
                "opening_amount": str(money(sess.opening_amount)),
                "by_payment_method": [
                    {
                        "payment_method_code": row["payment_method_code"],
                        "payment_method_name": row["payment_method_name"],
                        "method_type": row["method_type"],
                        "transaction_count": int(row["transaction_count"]),
                        "total_amount": str(money(row["total_amount"])),
                    }
                    for row in by_method
                ],
                "petty_cash_expenses_total": str(petty_cash_total),
                "theoretical_cash": str(theoretical_cash),
            },
            request=request,
        )


@router.post("/open", response_class=JSONResponse)
async def open_session(
    payload: OpenSessionPayload,
    request: Request,
    user: dict = Depends(get_current_user),
):

    async with db_manager.get_async_session() as session:
        existing = await session.execute(
            select(CashRegisterSession).where(
                and_(
                    CashRegisterSession.cash_register_id == payload.cash_register_id,
                    CashRegisterSession.status_id == CASH_SESSION_OPEN,
                    CashRegisterSession.deleted_at.is_(None),
                )
            ).limit(1)
        )
        if existing.scalar_one_or_none():
            return ResponseManager.error(
                message="Esta caja ya tiene una sesion abierta",
                status_code=HTTPStatus.CONFLICT,
                error_code=ErrorCode.RESOURCE_CONFLICT,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )

        register_result = await session.execute(
            select(CashRegister).where(
                and_(CashRegister.id == payload.cash_register_id, CashRegister.deleted_at.is_(None))
            )
        )
        register = register_result.scalar_one_or_none()
        if not register:
            return ResponseManager.error(
                message="Caja no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )

        now = datetime.now(timezone.utc)
        cashier_id = int(user.get("user_id") or user.get("id") or 0)

        new_session = CashRegisterSession(
            session_code=str(uuid4()),
            cash_register_id=payload.cash_register_id,
            cashier_user_id=cashier_id,
            opening_amount=money(payload.opening_amount),
            opening_datetime=now,
            opening_notes=payload.opening_notes,
            status_id=CASH_SESSION_OPEN,
            requires_supervisor_approval=register.requires_supervisor_approval,
            is_approved=False,
        )
        session.add(new_session)
        await session.flush()

        if payload.denomination_counts:
            denom_ids = [dc.denomination_id for dc in payload.denomination_counts]
            denom_result = await session.execute(
                select(CurrencyDenomination).where(CurrencyDenomination.id.in_(denom_ids))
            )
            denom_map = {d.id: d for d in denom_result.scalars().all()}

            for dc in payload.denomination_counts:
                if dc.quantity <= 0:
                    continue
                denom = denom_map.get(dc.denomination_id)
                if not denom:
                    continue
                count = CashSessionDenominationCount(
                    cash_register_session_id=new_session.id,
                    currency_denomination_id=dc.denomination_id,
                    count_type="OPENING",
                    quantity=dc.quantity,
                    subtotal=money(Decimal(str(denom.denomination_value)) * dc.quantity),
                )
                session.add(count)

        _add_cash_session_observation(
            session,
            new_session.id,
            "OPENING",
            payload.opening_notes,
            now,
            cashier_id,
        )

        await session.flush()
        created = await _load_session_for_response(session, new_session.id)
        return ResponseManager.success(
            data=session_to_dict(created), message="Sesion de caja abierta", request=request
        )


@router.post("/{session_id}/close", response_class=JSONResponse)
async def close_session(
    payload: CloseSessionPayload,
    session_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):

    async with db_manager.get_async_session() as session:
        sess_result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
            )
            .where(
                and_(
                    CashRegisterSession.id == session_id,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
        )
        sess = sess_result.scalar_one_or_none()
        if not sess:
            return ResponseManager.error(
                message="Sesion no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )
        if sess.status_id != CASH_SESSION_OPEN:
            return ResponseManager.error(
                message="La sesion no esta abierta",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        by_method_result = await session.execute(
            text("""
                SELECT
                    COALESCE(pm.method_type, 'OTHER') AS method_type,
                    SUM(sd.total_amount) AS total_amount
                FROM sale_documents sd
                LEFT JOIN payment_methods pm
                    ON pm.method_code = sd.payment_method_code
                    AND pm.deleted_at IS NULL
                WHERE sd.cash_register_session_id = :session_id
                    AND sd.status = 'CLOSED'
                    AND sd.deleted_at IS NULL
                GROUP BY pm.method_type
            """),
            {"session_id": session_id},
        )
        cash_sales = Decimal("0.00")
        for row in by_method_result:
            if row.method_type == "CASH":
                cash_sales += Decimal(str(row.total_amount or 0))

        petty_cash_result = await session.execute(
            text("""
                SELECT COALESCE(SUM(expense_amount), 0) AS total
                FROM petty_cash_expenses
                WHERE cash_register_session_id = :session_id
                  AND status_id != 35
            """),
            {"session_id": session_id},
        )
        petty_cash_total = money(petty_cash_result.scalar_one() or 0)
        theoretical = money(money(sess.opening_amount) + cash_sales - petty_cash_total)
        physical = money(payload.physical_amount)
        difference = money(physical - theoretical)
        now = datetime.now(timezone.utc)

        register = sess.cash_register
        max_diff = money(register.max_difference_amount) if register else Decimal("0.00")
        needs_approval = (
            register.requires_supervisor_approval
            and abs(difference) > max_diff
        ) if register else False

        new_status = CASH_SESSION_PENDING_CLOSE if needs_approval else CASH_SESSION_CLOSED

        sess.physical_amount = physical
        sess.theoretical_amount = theoretical
        sess.difference_amount = difference
        sess.closing_datetime = now
        sess.closing_notes = payload.closing_notes or payload.cash_count_notes
        sess.status_id = new_status

        if payload.denomination_counts:
            denom_ids = [dc.denomination_id for dc in payload.denomination_counts]
            denom_result = await session.execute(
                select(CurrencyDenomination).where(CurrencyDenomination.id.in_(denom_ids))
            )
            denom_map = {d.id: d for d in denom_result.scalars().all()}

            for dc in payload.denomination_counts:
                if dc.quantity <= 0:
                    continue
                denom = denom_map.get(dc.denomination_id)
                if not denom:
                    continue
                count = CashSessionDenominationCount(
                    cash_register_session_id=session_id,
                    currency_denomination_id=dc.denomination_id,
                    count_type="CLOSING",
                    quantity=dc.quantity,
                    subtotal=money(Decimal(str(denom.denomination_value)) * dc.quantity),
                )
                session.add(count)

        cashier_id = int(user.get("user_id") or user.get("id") or 0)
        _add_cash_session_observation(
            session,
            session_id,
            "CLOSING",
            payload.closing_notes,
            now,
            cashier_id,
        )
        _add_cash_session_observation(
            session,
            session_id,
            "CASH_COUNT",
            payload.cash_count_notes,
            now,
            cashier_id,
        )

        await session.flush()
        updated = await _load_session_for_response(session, session_id)
        return ResponseManager.success(
            data=session_to_dict(updated),
            message="Sesion cerrada" if new_status == CASH_SESSION_CLOSED else "Sesion pendiente de aprobacion",
            request=request,
        )


@router.put("/{session_id}/approve", response_class=JSONResponse)
async def approve_session(
    payload: ApproveSessionPayload,
    session_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):
    async with db_manager.get_async_session() as session:
        sess_result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
            )
            .where(
                and_(
                    CashRegisterSession.id == session_id,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
        )
        sess = sess_result.scalar_one_or_none()
        if not sess:
            return ResponseManager.error(
                message="Sesion no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )
        if sess.status_id != CASH_SESSION_PENDING_CLOSE:
            return ResponseManager.error(
                message="La sesion no esta pendiente de aprobacion",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        supervisor_id = int(user.get("user_id") or user.get("id") or 0)
        sess.status_id = CASH_SESSION_CLOSED
        sess.is_approved = True
        now = datetime.now(timezone.utc)
        sess.approved_datetime = now
        sess.supervisor_user_id = supervisor_id
        _add_cash_session_observation(
            session,
            session_id,
            "APPROVAL",
            payload.supervisor_notes,
            now,
            supervisor_id,
        )

        await session.flush()
        updated = await _load_session_for_response(session, session_id)
        return ResponseManager.success(data=session_to_dict(updated), message="Sesion aprobada", request=request)


@router.post("/{session_id}/reject", response_class=JSONResponse)
async def reject_session(
    payload: RejectSessionPayload,
    session_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):
    async with db_manager.get_async_session() as session:
        sess_result = await session.execute(
            select(CashRegisterSession)
            .options(
                selectinload(CashRegisterSession.cash_register),
                selectinload(CashRegisterSession.observations),
            )
            .where(
                and_(
                    CashRegisterSession.id == session_id,
                    CashRegisterSession.deleted_at.is_(None),
                )
            )
        )
        sess = sess_result.scalar_one_or_none()
        if not sess:
            return ResponseManager.error(
                message="Sesion no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )
        if sess.status_id != CASH_SESSION_PENDING_CLOSE:
            return ResponseManager.error(
                message="La sesion no esta pendiente de aprobacion",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        supervisor_id = int(user.get("user_id") or user.get("id") or 0)
        now = datetime.now(timezone.utc)
        sess.status_id = CASH_SESSION_OPEN
        sess.closing_datetime = None
        sess.physical_amount = None
        sess.theoretical_amount = None
        sess.difference_amount = None
        sess.supervisor_user_id = supervisor_id
        sess.approved_datetime = now
        _add_cash_session_observation(
            session,
            session_id,
            "REJECTION",
            payload.rejection_reason,
            now,
            supervisor_id,
        )

        await session.execute(
            text(
                "DELETE FROM cash_session_denomination_counts "
                "WHERE cash_register_session_id = :id AND count_type = 'CLOSING'"
            ),
            {"id": session_id},
        )

        await session.flush()
        updated = await _load_session_for_response(session, session_id)
        return ResponseManager.success(
            data=session_to_dict(updated),
            message="Cierre rechazado. La sesion fue revertida a abierta.",
            request=request,
        )
