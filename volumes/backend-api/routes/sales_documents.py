"""
Router para ventas pendientes, cierre en caja y devoluciones por unidad.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Path, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import and_, delete, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.sales_operations import (
    SaleDocument,
    SaleDocumentLine,
    SaleLineUnit,
    SaleReturn,
    SaleStatus,
    SaleUnitStatus,
)
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Sales Documents"])

CENT = Decimal("0.01")
TAX_RATE = Decimal("0.19")


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def percent(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


class SaleItemPayload(BaseModel):
    product_id: int | None = None
    product_variant_id: int | None = None
    code: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    unit_name: str | None = None
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=0, ge=0, le=100)


class PendingSaleCreate(BaseModel):
    warehouse_id: int | None = None
    sales_point_id: int | None = None
    target_cash_register_id: int | None = None
    customer: dict | None = None
    authorized_buyer: dict | None = None
    prepared_by: str | None = None
    items: list[SaleItemPayload] = Field(..., min_length=1)
    notes: str | None = Field(None, max_length=2000)


class CloseSalePayload(BaseModel):
    ticket_number: str = Field(..., min_length=1, max_length=60)
    document_type_code: str = Field(default="TICKET", min_length=1, max_length=30)
    document_type_name: str = Field(default="Ticket de venta", min_length=1, max_length=100)
    cash_register_id: int | None = None
    discount_type: Literal["NONE", "PERCENT", "AMOUNT"] = "NONE"
    discount_value: Decimal = Field(default=0, ge=0)
    payment_method_code: str | None = Field(default=None, max_length=20)
    payment_method_name: str | None = Field(default=None, max_length=100)
    amount_tendered: Decimal | None = Field(default=None, ge=0)
    change_amount: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_discount(self):
        if self.discount_type == "PERCENT" and self.discount_value > 100:
            raise ValueError("El descuento porcentual no puede superar 100")
        return self


class RegisterReturnPayload(BaseModel):
    sale_line_unit_id: int = Field(..., gt=0)
    action_type: Literal["RETURN", "EXCHANGE"]
    reason: str | None = Field(None, max_length=255)


def current_user_id(user: dict) -> int | None:
    raw_id = user.get("user_id") or user.get("id")
    try:
        return int(raw_id) if raw_id else None
    except (TypeError, ValueError):
        return None


def display_user(user: dict) -> str:
    return user.get("display_name") or user.get("full_name") or user.get("username") or "Usuario"


def sale_to_dict(sale: SaleDocument, include_units: bool = False) -> dict:
    lines = sorted(sale.lines or [], key=lambda item: item.line_number)
    return {
        "id": sale.id,
        "sale_code": sale.sale_code,
        "status": sale.status.value if hasattr(sale.status, "value") else sale.status,
        "document_type_code": sale.document_type_code,
        "document_type_name": sale.document_type_name,
        "ticket_number": sale.ticket_number,
        "warehouse_id": sale.warehouse_id,
        "sales_point_id": sale.sales_point_id,
        "cash_register_id": sale.cash_register_id,
        "customer": sale.customer_snapshot,
        "authorized_buyer": sale.authorized_buyer_snapshot,
        "prepared_by": sale.prepared_by_name,
        "subtotal_amount": float(sale.subtotal_amount or 0),
        "line_discount_amount": float(sale.line_discount_amount or 0),
        "document_discount_type": sale.document_discount_type,
        "document_discount_value": float(sale.document_discount_value or 0),
        "document_discount_amount": float(sale.document_discount_amount or 0),
        "tax_amount": float(sale.tax_amount or 0),
        "total_amount": float(sale.total_amount or 0),
        "notes": sale.notes,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "updated_at": sale.updated_at.isoformat() if sale.updated_at else None,
        "items": [line_to_dict(line, include_units=include_units) for line in lines],
    }


def line_to_dict(line: SaleDocumentLine, include_units: bool = False) -> dict:
    data = {
        "id": line.id,
        "line_number": line.line_number,
        "product_id": line.product_id,
        "product_variant_id": line.product_variant_id,
        "code": line.product_code,
        "name": line.product_name,
        "unit_name": line.unit_name,
        "quantity": line.quantity,
        "unit_price": float(line.unit_price or 0),
        "discount_percent": float(line.discount_percent or 0),
        "line_subtotal": float(line.line_subtotal or 0),
        "line_discount_amount": float(line.line_discount_amount or 0),
        "document_discount_amount": float(line.document_discount_amount or 0),
        "tax_amount": float(line.tax_amount or 0),
        "paid_total_amount": float(line.paid_total_amount or 0),
    }
    if include_units:
        data["units"] = [
            {
                "id": unit.id,
                "unit_sequence": unit.unit_sequence,
                "paid_amount": float(unit.paid_amount or 0),
                "status": unit.status.value if hasattr(unit.status, "value") else unit.status,
                "return_reference": unit.return_reference,
            }
            for unit in sorted(line.units or [], key=lambda item: item.unit_sequence)
        ]
    return data


def apply_close_amounts(sale: SaleDocument, payload: CloseSalePayload):
    lines = sorted(sale.lines or [], key=lambda item: item.line_number)
    line_bases = []
    subtotal = Decimal("0.00")
    line_discount = Decimal("0.00")
    gross_before_document_discount = Decimal("0.00")

    for line in lines:
        quantity = Decimal(int(line.quantity or 0))
        base = money(quantity * money(line.unit_price))
        discount = money(base * percent(line.discount_percent) / Decimal("100"))
        gross_after_line_discount = money(base - discount)
        subtotal += base
        line_discount += discount
        gross_before_document_discount += gross_after_line_discount
        line_bases.append((line, base, discount, gross_after_line_discount))

    if payload.discount_type == "PERCENT":
        document_discount = money(gross_before_document_discount * money(payload.discount_value) / Decimal("100"))
    elif payload.discount_type == "AMOUNT":
        document_discount = min(money(payload.discount_value), gross_before_document_discount)
    else:
        document_discount = Decimal("0.00")

    remaining_discount = document_discount
    total_paid = Decimal("0.00")
    total_tax = Decimal("0.00")

    for index, (line, base, discount, gross_after_line_discount) in enumerate(line_bases):
        if gross_before_document_discount <= 0:
            prorated_discount = Decimal("0.00")
        elif index == len(line_bases) - 1:
            prorated_discount = remaining_discount
        else:
            prorated_discount = money(document_discount * gross_after_line_discount / gross_before_document_discount)
            remaining_discount -= prorated_discount

        paid_gross = money(gross_after_line_discount - prorated_discount)
        net_after_document_discount = money(paid_gross / (Decimal("1.00") + TAX_RATE)) if paid_gross else Decimal("0.00")
        tax = money(paid_gross - net_after_document_discount)

        line.line_subtotal = base
        line.line_discount_amount = discount
        line.document_discount_amount = prorated_discount
        line.tax_amount = tax
        line.paid_total_amount = paid_gross
        total_paid += paid_gross
        total_tax += tax

        line.units.clear()
        cents = int((paid_gross * 100).to_integral_value(rounding=ROUND_HALF_UP))
        quantity = max(int(line.quantity or 0), 1)
        base_cents = cents // quantity
        remainder = cents % quantity
        for unit_index in range(quantity):
            unit_cents = base_cents + (1 if unit_index < remainder else 0)
            line.units.append(
                SaleLineUnit(
                    sale_document_id=sale.id,
                    unit_sequence=unit_index + 1,
                    paid_amount=Decimal(unit_cents) / Decimal("100"),
                    status=SaleUnitStatus.SOLD,
                )
            )

    sale.subtotal_amount = money(subtotal)
    sale.line_discount_amount = money(line_discount)
    sale.document_discount_type = payload.discount_type
    sale.document_discount_value = money(payload.discount_value)
    sale.document_discount_amount = document_discount
    sale.tax_amount = money(total_tax)
    sale.total_amount = money(total_paid)
    sale.status = SaleStatus.CLOSED
    sale.document_type_code = payload.document_type_code
    sale.document_type_name = payload.document_type_name
    sale.ticket_number = payload.ticket_number.strip()
    if payload.cash_register_id:
        sale.cash_register_id = payload.cash_register_id


def replace_pending_sale_payload(sale: SaleDocument, payload: PendingSaleCreate, user: dict):
    sale.warehouse_id = payload.warehouse_id
    sale.sales_point_id = payload.sales_point_id
    sale.cash_register_id = payload.target_cash_register_id
    sale.customer_id = payload.customer.get("id") if payload.customer else None
    sale.customer_snapshot = payload.customer
    sale.authorized_buyer_snapshot = payload.authorized_buyer
    sale.prepared_by_user_id = current_user_id(user)
    sale.prepared_by_name = payload.prepared_by or display_user(user)
    sale.notes = payload.notes
    sale.lines.clear()

    for index, item in enumerate(payload.items, start=1):
        quantity = int(item.quantity)
        unit_price = money(item.unit_price)
        subtotal = money(quantity * unit_price)
        line_discount = money(subtotal * percent(item.discount_percent) / Decimal("100"))
        sale.lines.append(
            SaleDocumentLine(
                line_number=index,
                product_id=item.product_id,
                product_variant_id=item.product_variant_id,
                product_code=item.code,
                product_name=item.name,
                unit_name=item.unit_name,
                quantity=quantity,
                unit_price=unit_price,
                discount_percent=percent(item.discount_percent),
                line_subtotal=subtotal,
                line_discount_amount=line_discount,
                paid_total_amount=money(subtotal - line_discount),
            )
        )

    sale.subtotal_amount = money(sum((line.line_subtotal for line in sale.lines), Decimal("0.00")))
    sale.line_discount_amount = money(sum((line.line_discount_amount for line in sale.lines), Decimal("0.00")))
    sale.document_discount_type = "NONE"
    sale.document_discount_value = Decimal("0.00")
    sale.document_discount_amount = Decimal("0.00")
    sale.total_amount = money(sum((line.paid_total_amount for line in sale.lines), Decimal("0.00")))
    sale.tax_amount = money(sale.total_amount - sale.total_amount / (Decimal("1.00") + TAX_RATE))


@router.post("/pending", response_class=JSONResponse)
async def create_pending_sale(payload: PendingSaleCreate, request: Request, user: dict = Depends(get_current_user)):
    sale_code = str(uuid4())
    async with db_manager.get_async_session() as session:
        sale = SaleDocument(
            sale_code=sale_code,
            status=SaleStatus.PENDING_CASHIER,
            document_type_code="TICKET",
            document_type_name="Ticket de venta",
            warehouse_id=payload.warehouse_id,
            sales_point_id=payload.sales_point_id,
            cash_register_id=payload.target_cash_register_id,
            customer_id=payload.customer.get("id") if payload.customer else None,
            customer_snapshot=payload.customer,
            authorized_buyer_snapshot=payload.authorized_buyer,
            prepared_by_user_id=current_user_id(user),
            prepared_by_name=payload.prepared_by or display_user(user),
            notes=payload.notes,
        )
        replace_pending_sale_payload(sale, payload, user)
        session.add(sale)
        await session.flush()
        await session.refresh(sale, attribute_names=["lines"])
        return ResponseManager.success(data=sale_to_dict(sale), message="Venta pendiente creada", status_code=HTTPStatus.CREATED, request=request)


@router.put("/{sale_id}/pending", response_class=JSONResponse)
async def update_pending_sale(payload: PendingSaleCreate, request: Request, sale_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines))
            .where(and_(SaleDocument.id == sale_id, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if sale.status != SaleStatus.PENDING_CASHIER:
            return ResponseManager.error(message="Solo se pueden editar ventas pendientes de caja", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        await session.execute(delete(SaleDocumentLine).where(SaleDocumentLine.sale_document_id == sale_id))
        await session.flush()
        sale.lines = []
        replace_pending_sale_payload(sale, payload, user)
        await session.flush()
        await session.refresh(sale, attribute_names=["lines"])
        return ResponseManager.success(data=sale_to_dict(sale), message="Venta pendiente actualizada", request=request)


@router.get("/pending", response_class=JSONResponse)
async def list_pending_sales(request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines))
            .where(and_(SaleDocument.status == SaleStatus.PENDING_CASHIER, SaleDocument.deleted_at.is_(None)))
            .order_by(SaleDocument.created_at.desc())
        )
        return ResponseManager.success(data=[sale_to_dict(item) for item in result.scalars().all()], request=request)


@router.get("/by-code/{sale_code}", response_class=JSONResponse)
async def get_sale_by_code(sale_code: str, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines))
            .where(and_(SaleDocument.sale_code == sale_code, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        return ResponseManager.success(data=sale_to_dict(sale), request=request)


@router.get("/by-ticket/{ticket_number}", response_class=JSONResponse)
async def get_sale_by_ticket(ticket_number: str, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines).selectinload(SaleDocumentLine.units))
            .where(and_(SaleDocument.ticket_number == ticket_number, SaleDocument.status == SaleStatus.CLOSED, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Ticket no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        return ResponseManager.success(data=sale_to_dict(sale, include_units=True), request=request)


@router.delete("/{sale_id}/pending", response_class=JSONResponse)
async def delete_pending_sale(request: Request, sale_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument).where(and_(SaleDocument.id == sale_id, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if sale.status != SaleStatus.PENDING_CASHIER:
            return ResponseManager.error(message="Solo se pueden eliminar ventas pendientes", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
        sale.deleted_at = datetime.now(timezone.utc)
        await session.flush()
        return ResponseManager.success(data={"id": sale_id}, message="Venta eliminada", request=request)


@router.get("/{sale_id}", response_class=JSONResponse)
async def get_sale_document(request: Request, sale_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines).selectinload(SaleDocumentLine.units))
            .where(and_(SaleDocument.id == sale_id, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        return ResponseManager.success(data=sale_to_dict(sale, include_units=True), request=request)


@router.post("/{sale_id}/close", response_class=JSONResponse)
async def close_sale_document(payload: CloseSalePayload, request: Request, sale_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        existing_ticket = await session.execute(
            select(SaleDocument).where(and_(SaleDocument.ticket_number == payload.ticket_number, SaleDocument.id != sale_id, SaleDocument.deleted_at.is_(None)))
        )
        if existing_ticket.scalar_one_or_none():
            return ResponseManager.error(message="El numero de ticket ya existe", status_code=HTTPStatus.CONFLICT, error_code=ErrorCode.RESOURCE_CONFLICT, error_type=ErrorType.RESOURCE_ERROR, request=request)

        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines).selectinload(SaleDocumentLine.units))
            .where(and_(SaleDocument.id == sale_id, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if sale.status != SaleStatus.PENDING_CASHIER:
            return ResponseManager.error(message="La venta no esta pendiente de caja", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        sale.closed_by_user_id = current_user_id(user)
        sale.payment_method_code = payload.payment_method_code
        sale.payment_method_name = payload.payment_method_name
        sale.amount_tendered = payload.amount_tendered
        sale.change_amount = payload.change_amount
        apply_close_amounts(sale, payload)
        await session.flush()
        return ResponseManager.success(data=sale_to_dict(sale, include_units=True), message="Venta cerrada", request=request)


@router.post("/returns", response_class=JSONResponse)
async def register_sale_return(payload: RegisterReturnPayload, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleLineUnit)
            .options(selectinload(SaleLineUnit.line).selectinload(SaleDocumentLine.sale))
            .where(SaleLineUnit.id == payload.sale_line_unit_id)
        )
        unit = result.scalar_one_or_none()
        if not unit or not unit.line or not unit.line.sale:
            return ResponseManager.error(message="Unidad de venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if unit.status != SaleUnitStatus.SOLD:
            return ResponseManager.error(message="La unidad ya fue devuelta o cambiada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        reference = f"{payload.action_type}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{unit.id}"
        unit.status = SaleUnitStatus.RETURNED if payload.action_type == "RETURN" else SaleUnitStatus.EXCHANGED
        unit.return_reference = reference
        sale_return = SaleReturn(
            sale_document_id=unit.sale_document_id,
            sale_line_unit_id=unit.id,
            action_type=payload.action_type,
            amount=unit.paid_amount,
            reason=payload.reason,
            created_by_user_id=current_user_id(user),
        )
        session.add(sale_return)
        await session.flush()
        return ResponseManager.success(
            data={
                "reference": reference,
                "amount": float(unit.paid_amount or 0),
                "unit": {
                    "id": unit.id,
                    "status": unit.status.value,
                    "return_reference": unit.return_reference,
                },
            },
            message="Operacion registrada",
            request=request,
        )
