"""
Router para ventas pendientes, cierre en caja y devoluciones por unidad.
"""
import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, Path, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, model_validator
from sqlalchemy import and_, delete, select, text
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
from database.models.cash_sessions import CashRegisterSession, CASH_SESSION_OPEN
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
    unit_price: Decimal = Field(...)
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
    payment_details: dict | list[dict] | None = None
    agreement_usage: dict | None = None
    receipt_email: EmailStr | None = None

    @model_validator(mode="after")
    def validate_discount(self):
        if self.discount_type == "PERCENT" and self.discount_value > 100:
            raise ValueError("El descuento porcentual no puede superar 100")
        return self


class RegisterReturnPayload(BaseModel):
    sale_line_unit_id: int | None = Field(None, gt=0)
    sale_line_unit_ids: list[int] | None = None
    action_type: Literal["RETURN", "EXCHANGE"]
    reason: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_units(self):
        unit_ids = self.sale_line_unit_ids or ([self.sale_line_unit_id] if self.sale_line_unit_id else [])
        unit_ids = [int(unit_id) for unit_id in unit_ids if unit_id]
        if not unit_ids:
            raise ValueError("Debes seleccionar al menos una unidad")
        if len(set(unit_ids)) != len(unit_ids):
            raise ValueError("No puedes repetir unidades en la operacion")
        self.sale_line_unit_ids = unit_ids
        return self


def current_user_id(user: dict) -> int | None:
    raw_id = user.get("user_id") or user.get("id")
    try:
        return int(raw_id) if raw_id else None
    except (TypeError, ValueError):
        return None


def display_user(user: dict) -> str:
    return user.get("display_name") or user.get("full_name") or user.get("username") or "Usuario"


def _payment_detail_type(payment_details) -> str | None:
    if isinstance(payment_details, dict):
        return str(payment_details.get("type") or "").upper() or None
    return None


def _reference_for_sale(sale: SaleDocument) -> str:
    return sale.ticket_number or sale.sale_code or f"VENTA-{sale.id}"


def _movement_description(sale: SaleDocument, payment_method_name: str | None) -> str:
    doc_label = "Devolucion POS" if money(sale.total_amount) < 0 else "Venta POS"
    method_label = payment_method_name or sale.payment_method_name or sale.payment_method_code or "Sin metodo"
    return f"{doc_label} {_reference_for_sale(sale)} - {method_label}"


def _agreement_from_payment_details(payment_details) -> dict | None:
    if not isinstance(payment_details, dict):
        return None
    if str(payment_details.get("type") or "").upper() == "AGREEMENT":
        agreement = payment_details.get("agreement")
        return agreement if isinstance(agreement, dict) else None
    if str(payment_details.get("type") or "").upper() == "MIXED":
        for item in payment_details.get("payments") or []:
            if isinstance(item, dict) and isinstance(item.get("agreement"), dict):
                return item["agreement"]
    return None


async def register_agreement_usage_for_sale(session, sale: SaleDocument, payload: CloseSalePayload, user_id: int) -> None:
    agreement = payload.agreement_usage if isinstance(payload.agreement_usage, dict) else None
    if not agreement:
        agreement = _agreement_from_payment_details(payload.payment_details)
    if not agreement:
        return

    organization_name = str(agreement.get("organization_name") or "").strip()
    associate_identifier = str(agreement.get("associate_identifier") or "").strip()
    if not organization_name or not associate_identifier:
        return

    agreement_type = str(agreement.get("agreement_type") or "DISCOUNT").upper()
    if agreement_type not in {"DISCOUNT", "CREDIT"}:
        agreement_type = "DISCOUNT"

    agreement_result = await session.execute(
        text(
            "SELECT id FROM agreements "
            "WHERE is_active = 1 "
            "AND company_name = :organization_name "
            "AND agreement_type = :agreement_type "
            "ORDER BY id DESC LIMIT 1"
        ),
        {"organization_name": organization_name, "agreement_type": agreement_type},
    )
    agreement_row = agreement_result.mappings().first()
    agreement_id = agreement_row["id"] if agreement_row else agreement.get("agreement_id")

    beneficiary_id = agreement.get("agreement_beneficiary_id")
    if agreement_id:
        beneficiary_result = await session.execute(
            text(
                "SELECT ab.id, ab.interactions_count, ab.consumed_amount, ab.benefit_amount, "
                "a.single_purchase, a.benefit_amount AS agreement_benefit_amount "
                "FROM agreement_beneficiaries ab "
                "JOIN agreements a ON a.id = ab.agreement_id "
                "WHERE ab.agreement_id = :agreement_id "
                "AND ab.beneficiary_identifier = :associate_identifier "
                "ORDER BY ab.id DESC LIMIT 1"
            ),
            {"agreement_id": agreement_id, "associate_identifier": associate_identifier},
        )
        beneficiary_row = beneficiary_result.mappings().first()
        beneficiary_id = beneficiary_row["id"] if beneficiary_row else beneficiary_id

        if beneficiary_row:
            if beneficiary_row["single_purchase"] and beneficiary_row["interactions_count"] > 0:
                raise ValueError("Este beneficiario ya utilizó este convenio de compra única y no puede volver a usarlo.")

            if agreement_type == "CREDIT":
                effective_credit = beneficiary_row["benefit_amount"] if beneficiary_row["benefit_amount"] is not None else beneficiary_row["agreement_benefit_amount"]
                if effective_credit is not None and effective_credit > 0:
                    remaining = money(effective_credit) - money(beneficiary_row["consumed_amount"] or 0)
                    sale_total = money(sale.total_amount or 0)
                    if remaining < sale_total:
                        raise ValueError(
                            f"El crédito disponible del beneficiario no es suficiente. "
                            f"Disponible: ${int(remaining):,} — Total venta: ${int(sale_total):,}."
                        )

    await session.execute(
        text(
            "INSERT INTO agreement_usage_records (agreement_id, agreement_beneficiary_id, sale_document_id, sale_code, ticket_number, agreement_type, "
            "organization_name, associate_identifier, associate_name, reference_number, discount_percent, "
            "discount_amount, original_amount, final_amount, payment_method_code, raw_payload, created_by_user_id) "
            "VALUES (:agreement_id, :agreement_beneficiary_id, :sale_document_id, :sale_code, :ticket_number, :agreement_type, :organization_name, "
            ":associate_identifier, :associate_name, :reference_number, :discount_percent, :discount_amount, "
            ":original_amount, :final_amount, :payment_method_code, :raw_payload, :created_by_user_id)"
        ),
        {
            "agreement_id": agreement_id,
            "agreement_beneficiary_id": beneficiary_id,
            "sale_document_id": sale.id,
            "sale_code": sale.sale_code,
            "ticket_number": sale.ticket_number,
            "agreement_type": agreement_type,
            "organization_name": organization_name,
            "associate_identifier": associate_identifier,
            "associate_name": str(agreement.get("associate_name") or "").strip() or None,
            "reference_number": str(agreement.get("reference_number") or "").strip() or None,
            "discount_percent": money(agreement.get("discount_percent") or 0) if agreement_type == "DISCOUNT" else None,
            "discount_amount": money(sale.agreement_discount_amount or 0) if agreement_type == "DISCOUNT" else Decimal("0.00"),
            "original_amount": money(sale.subtotal_amount or 0) - money(sale.line_discount_amount or 0),
            "final_amount": money(sale.total_amount or 0),
            "payment_method_code": sale.payment_method_code,
            "raw_payload": json.dumps(agreement, ensure_ascii=False),
            "created_by_user_id": user_id,
        },
    )

    if beneficiary_id:
        await session.execute(
            text(
                "UPDATE agreement_beneficiaries "
                "SET consumed_amount = consumed_amount + :amount, interactions_count = interactions_count + 1, "
                "last_consumed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP "
                "WHERE id = :beneficiary_id"
            ),
            {
                "beneficiary_id": beneficiary_id,
                "amount": money(sale.agreement_discount_amount or 0) if agreement_type == "DISCOUNT" else money(sale.total_amount or 0),
            },
        )


async def register_cash_movements_for_sale(session, sale: SaleDocument, payload: CloseSalePayload, user_id: int) -> None:
    if not sale.cash_register_session_id:
        return

    total = money(sale.total_amount)
    if total == 0 and not payload.payment_details:
        return

    method_result = await session.execute(
        text(
            "SELECT id, method_code, method_name FROM payment_methods "
            "WHERE deleted_at IS NULL AND is_active = 1"
        )
    )
    method_map = {str(row["method_code"]).upper(): dict(row) for row in method_result.mappings().all()}
    if not method_map:
        return

    reference = _reference_for_sale(sale)
    movement_type = "RETURN" if total < 0 else "SALE"
    expected_total = abs(total)
    detail_type = _payment_detail_type(payload.payment_details)
    rows: list[dict] = []

    if detail_type == "MIXED" and isinstance(payload.payment_details, dict):
        remaining = expected_total
        change_remaining = money(payload.change_amount or 0)
        for item in payload.payment_details.get("payments") or []:
            method_code = str(item.get("payment_method_code") or "").upper()
            method = method_map.get(method_code)
            received = money(item.get("amount") or 0)
            if not method or received <= 0:
                continue
            applied = min(received, remaining) if remaining > 0 else Decimal("0.00")
            extra = money(received - applied)
            change = min(change_remaining, extra) if change_remaining > 0 and extra > 0 else Decimal("0.00")
            change_remaining -= change
            remaining -= applied
            rows.append(
                {
                    "payment_method_id": method["id"],
                    "payment_method_name": method["method_name"],
                    "amount": -applied if total < 0 else applied,
                    "received_amount": received,
                    "change_amount": change,
                }
            )
        if change_remaining > 0 and rows:
            rows[-1]["change_amount"] = money(rows[-1]["change_amount"] + change_remaining)
    else:
        method_code = str(payload.payment_method_code or "").upper()
        method = method_map.get(method_code)
        if not method and detail_type == "FOREIGN_CURRENCY":
            method = method_map.get("FOREIGN_CURRENCY")
        if not method and total < 0:
            method = method_map.get("CASH")
        if not method and method_map:
            method = method_map.get("CASH") or next(iter(method_map.values()))

        if method and expected_total > 0:
            received = money(payload.amount_tendered or expected_total)
            rows.append(
                {
                    "payment_method_id": method["id"],
                    "payment_method_name": method["method_name"],
                    "amount": -expected_total if total < 0 else expected_total,
                    "received_amount": Decimal("0.00") if total < 0 else received,
                    "change_amount": money(payload.change_amount or 0),
                }
            )

    for row in rows:
        await session.execute(
            text(
                "INSERT INTO cash_movements (cash_register_session_id, movement_type, document_id, payment_method_id, "
                "amount, change_amount, received_amount, reference_number, description, created_by_user_id) "
                "VALUES (:cash_register_session_id, :movement_type, NULL, :payment_method_id, :amount, :change_amount, "
                ":received_amount, :reference_number, :description, :created_by_user_id)"
            ),
            {
                "cash_register_session_id": sale.cash_register_session_id,
                "movement_type": movement_type,
                "payment_method_id": row["payment_method_id"],
                "amount": row["amount"],
                "change_amount": row["change_amount"],
                "received_amount": row["received_amount"],
                "reference_number": reference,
                "description": _movement_description(sale, row["payment_method_name"]),
                "created_by_user_id": user_id,
            },
        )


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
        "payment_method_code": sale.payment_method_code,
        "payment_method_name": sale.payment_method_name,
        "amount_tendered": float(sale.amount_tendered) if sale.amount_tendered is not None else None,
        "change_amount": float(sale.change_amount) if sale.change_amount is not None else None,
        "payment_details": sale.payment_details,
        "receipt_email": sale.receipt_email,
        "customer": sale.customer_snapshot,
        "authorized_buyer": sale.authorized_buyer_snapshot,
        "prepared_by": sale.prepared_by_name,
        "subtotal_amount": float(sale.subtotal_amount or 0),
        "line_discount_amount": float(sale.line_discount_amount or 0),
        "document_discount_type": sale.document_discount_type,
        "document_discount_value": float(sale.document_discount_value or 0),
        "document_discount_amount": float(sale.document_discount_amount or 0),
        "agreement_discount_amount": float(sale.agreement_discount_amount or 0),
        "tax_amount": float(sale.tax_amount or 0),
        "total_amount": float(sale.total_amount or 0),
        "notes": sale.notes,
        "is_return_document": sale.document_type_code == "RETURN_TICKET",
        "is_exchange_document": sale.document_type_code == "EXCHANGE_DRAFT",
        "exchange_credit_total": float(sale.exchange_credit_total) if sale.exchange_credit_total is not None else None,
        "exchange_forfeited_credit": float(sale.exchange_forfeited_credit) if sale.exchange_forfeited_credit is not None else None,
        "source_return_reference": sale.notes,
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

    if gross_before_document_discount <= 0:
        document_discount = Decimal("0.00")
    elif payload.discount_type == "PERCENT":
        document_discount = money(gross_before_document_discount * money(payload.discount_value) / Decimal("100"))
    elif payload.discount_type == "AMOUNT":
        document_discount = min(money(payload.discount_value), gross_before_document_discount)
    else:
        document_discount = Decimal("0.00")

    _agreement = payload.agreement_usage if isinstance(payload.agreement_usage, dict) else None
    _agreement_pct = percent(_agreement.get("discount_percent") or 0) if _agreement else Decimal("0.0000")
    if _agreement_pct > 0 and gross_before_document_discount > 0:
        agreement_discount = money(gross_before_document_discount * _agreement_pct / Decimal("100"))
        agreement_discount = min(agreement_discount, gross_before_document_discount - document_discount)
    else:
        agreement_discount = Decimal("0.00")

    total_discount = document_discount + agreement_discount
    remaining_discount = total_discount
    total_paid = Decimal("0.00")
    total_tax = Decimal("0.00")

    for index, (line, base, discount, gross_after_line_discount) in enumerate(line_bases):
        if gross_before_document_discount <= 0:
            prorated_discount = Decimal("0.00")
        elif index == len(line_bases) - 1:
            prorated_discount = remaining_discount
        else:
            prorated_discount = money(total_discount * gross_after_line_discount / gross_before_document_discount)
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
        sign = -1 if cents < 0 else 1
        abs_cents = abs(cents)
        base_cents = abs_cents // quantity
        remainder = abs_cents % quantity
        for unit_index in range(quantity):
            unit_cents = sign * (base_cents + (1 if unit_index < remainder else 0))
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
    sale.agreement_discount_amount = agreement_discount
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


def build_return_line(unit: SaleLineUnit, index: int, action_type: str) -> SaleDocumentLine:
    source_line = unit.line
    amount = money(unit.paid_amount)
    prefix = "Devolucion" if action_type == "RETURN" else "Credito por cambio"
    return SaleDocumentLine(
        line_number=index,
        product_id=source_line.product_id,
        product_variant_id=source_line.product_variant_id,
        product_code=source_line.product_code,
        product_name=f"{prefix}: {source_line.product_name}",
        unit_name=source_line.unit_name,
        quantity=1,
        unit_price=money(-amount),
        discount_percent=Decimal("0.0000"),
        line_subtotal=money(-amount),
        line_discount_amount=Decimal("0.00"),
        document_discount_amount=Decimal("0.00"),
        tax_amount=money(-amount - (-amount / (Decimal("1.00") + TAX_RATE))),
        paid_total_amount=money(-amount),
    )


async def get_variant_inventory_meta(session, product_variant_id: int) -> dict:
    result = await session.execute(
        text(
            "SELECT pv.id AS product_variant_id, pv.product_id, p.base_measurement_unit_id, p.cost_price "
            "FROM product_variants pv "
            "JOIN products p ON p.id = pv.product_id "
            "WHERE pv.id = :product_variant_id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
        ),
        {"product_variant_id": product_variant_id},
    )
    row = result.mappings().first()
    if not row:
        raise ValueError("Producto/variante no encontrado para mover inventario")
    return {
        "product_variant_id": int(row["product_variant_id"]),
        "measurement_unit_id": int(row["base_measurement_unit_id"]) if row["base_measurement_unit_id"] else None,
        "unit_cost": money(row["cost_price"] or 0),
    }


async def insert_stock_movement(
    session,
    *,
    line: SaleDocumentLine,
    warehouse_id: int,
    measurement_unit_id: int | None,
    stock_row: dict | None,
    movement_type: str,
    reference_type: str,
    quantity: Decimal,
    quantity_before: Decimal,
    quantity_after: Decimal,
    unit_cost: Decimal,
    user_id: int,
) -> None:
    await session.execute(
        text(
            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
            "movement_type, reference_type, reference_document_id, measurement_unit_id, movement_unit_quantity, "
            "quantity, quantity_before, quantity_after, unit_cost, total_cost, batch_lot_number, expiry_date, serial_number, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :movement_type, :reference_type, :sale_document_id, "
            ":measurement_unit_id, :movement_unit_quantity, :quantity, :quantity_before, :quantity_after, :unit_cost, :total_cost, "
            ":batch_lot_number, :expiry_date, :serial_number, :notes, :user_id)"
        ),
        {
            "product_variant_id": line.product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": stock_row.get("warehouse_zone_id") if stock_row else None,
            "location_id": stock_row.get("warehouse_zone_location_id") if stock_row else None,
            "movement_type": movement_type,
            "reference_type": reference_type,
            "sale_document_id": line.sale_document_id,
            "measurement_unit_id": measurement_unit_id,
            "movement_unit_quantity": abs(quantity),
            "quantity": quantity,
            "quantity_before": quantity_before,
            "quantity_after": quantity_after,
            "unit_cost": unit_cost,
            "total_cost": abs(quantity) * unit_cost,
            "batch_lot_number": stock_row.get("batch_lot_number") if stock_row else None,
            "expiry_date": stock_row.get("expiry_date") if stock_row else None,
            "serial_number": stock_row.get("serial_number") if stock_row else None,
            "notes": f"{reference_type} caja documento {line.sale_document_id}: {line.product_name}",
            "user_id": user_id,
        },
    )


async def apply_unit_balance_delta(
    session,
    *,
    product_variant_id: int,
    warehouse_id: int,
    stock_row: dict | None,
    measurement_unit_id: int | None,
    delta_quantity: Decimal,
) -> None:
    if not measurement_unit_id:
        return
    zone_id = stock_row.get("warehouse_zone_id") if stock_row else None
    location_id = stock_row.get("warehouse_zone_location_id") if stock_row else None
    batch_lot_number = stock_row.get("batch_lot_number") if stock_row else None
    expiry_date = stock_row.get("expiry_date") if stock_row else None
    serial_number = stock_row.get("serial_number") if stock_row else None
    result = await session.execute(
        text(
            "SELECT * FROM stock_unit_balances "
            "WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND ((warehouse_zone_id = :zone_id) OR (warehouse_zone_id IS NULL AND :zone_id IS NULL)) "
            "AND ((warehouse_zone_location_id = :location_id) OR (warehouse_zone_location_id IS NULL AND :location_id IS NULL)) "
            "AND measurement_unit_id = :measurement_unit_id "
            "AND ((batch_lot_number = :batch_lot_number) OR (batch_lot_number IS NULL AND :batch_lot_number IS NULL)) "
            "AND ((expiry_date = :expiry_date) OR (expiry_date IS NULL AND :expiry_date IS NULL)) "
            "AND ((serial_number = :serial_number) OR (serial_number IS NULL AND :serial_number IS NULL)) "
            "LIMIT 1"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "measurement_unit_id": measurement_unit_id,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "serial_number": serial_number,
        },
    )
    balance = result.mappings().first()
    quantity_before = Decimal(str(balance["current_quantity"])) if balance else Decimal("0")
    quantity_after = quantity_before + delta_quantity
    if balance:
        await session.execute(
            text("UPDATE stock_unit_balances SET current_quantity = :quantity_after WHERE id = :id"),
            {"quantity_after": quantity_after, "id": balance["id"]},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO stock_unit_balances (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
                "measurement_unit_id, batch_lot_number, expiry_date, serial_number, current_quantity) "
                "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :measurement_unit_id, "
                ":batch_lot_number, :expiry_date, :serial_number, :quantity_after)"
            ),
            {
                "product_variant_id": product_variant_id,
                "warehouse_id": warehouse_id,
                "zone_id": zone_id,
                "location_id": location_id,
                "measurement_unit_id": measurement_unit_id,
                "batch_lot_number": batch_lot_number,
                "expiry_date": expiry_date,
                "serial_number": serial_number,
                "quantity_after": quantity_after,
            },
        )


async def apply_inventory_in(session, line: SaleDocumentLine, warehouse_id: int, quantity: Decimal, user_id: int) -> None:
    meta = await get_variant_inventory_meta(session, line.product_variant_id)
    result = await session.execute(
        text(
            "SELECT * FROM stock WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id IS NULL AND warehouse_zone_location_id IS NULL "
            "AND batch_lot_number IS NULL AND expiry_date IS NULL LIMIT 1"
        ),
        {"product_variant_id": line.product_variant_id, "warehouse_id": warehouse_id},
    )
    stock_row = result.mappings().first()
    quantity_before = Decimal(str(stock_row["current_quantity"])) if stock_row else Decimal("0")
    quantity_after = quantity_before + quantity
    if stock_row:
        await session.execute(
            text(
                "UPDATE stock SET current_quantity = :quantity_after, last_movement_date = CURRENT_TIMESTAMP, "
                "last_movement_type = 'IN' WHERE id = :stock_id"
            ),
            {"quantity_after": quantity_after, "stock_id": stock_row["id"]},
        )
        movement_stock_row = dict(stock_row)
    else:
        await session.execute(
            text(
                "INSERT INTO stock (product_variant_id, warehouse_id, current_quantity, reserved_quantity, last_movement_date, last_movement_type) "
                "VALUES (:product_variant_id, :warehouse_id, :quantity_after, 0, CURRENT_TIMESTAMP, 'IN')"
            ),
            {"product_variant_id": line.product_variant_id, "warehouse_id": warehouse_id, "quantity_after": quantity_after},
        )
        movement_stock_row = None
    await apply_unit_balance_delta(
        session,
        product_variant_id=line.product_variant_id,
        warehouse_id=warehouse_id,
        stock_row=movement_stock_row,
        measurement_unit_id=meta["measurement_unit_id"],
        delta_quantity=quantity,
    )
    await insert_stock_movement(
        session,
        line=line,
        warehouse_id=warehouse_id,
        measurement_unit_id=meta["measurement_unit_id"],
        stock_row=movement_stock_row,
        movement_type="IN",
        reference_type="RETURN",
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        unit_cost=meta["unit_cost"],
        user_id=user_id,
    )


async def apply_inventory_out(session, line: SaleDocumentLine, warehouse_id: int, quantity: Decimal, user_id: int) -> None:
    meta = await get_variant_inventory_meta(session, line.product_variant_id)
    remaining = quantity
    result = await session.execute(
        text(
            "SELECT * FROM stock WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND current_quantity > 0 "
            "ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date, id"
        ),
        {"product_variant_id": line.product_variant_id, "warehouse_id": warehouse_id},
    )
    rows = [dict(row) for row in result.mappings().all()]
    available = sum((Decimal(str(row["current_quantity"])) for row in rows), Decimal("0"))
    if available < remaining:
        raise ValueError(f"Stock insuficiente para {line.product_name}. Disponible: {available}, requerido: {remaining}")

    for stock_row in rows:
        if remaining <= 0:
            break
        quantity_before = Decimal(str(stock_row["current_quantity"]))
        consumed = min(quantity_before, remaining)
        quantity_after = quantity_before - consumed
        await session.execute(
            text(
                "UPDATE stock SET current_quantity = :quantity_after, last_movement_date = CURRENT_TIMESTAMP, "
                "last_movement_type = 'OUT' WHERE id = :stock_id"
            ),
            {"quantity_after": quantity_after, "stock_id": stock_row["id"]},
        )
        await apply_unit_balance_delta(
            session,
            product_variant_id=line.product_variant_id,
            warehouse_id=warehouse_id,
            stock_row=stock_row,
            measurement_unit_id=meta["measurement_unit_id"],
            delta_quantity=-consumed,
        )
        await insert_stock_movement(
            session,
            line=line,
            warehouse_id=warehouse_id,
            measurement_unit_id=meta["measurement_unit_id"],
            stock_row=stock_row,
            movement_type="OUT",
            reference_type="SALE",
            quantity=-consumed,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            unit_cost=meta["unit_cost"],
            user_id=user_id,
        )
        remaining -= consumed


async def apply_inventory_for_closed_sale(session, sale: SaleDocument, user_id: int) -> None:
    if not sale.warehouse_id:
        raise ValueError("El documento no tiene bodega para mover inventario")

    for line in sorted(sale.lines or [], key=lambda item: item.line_number):
        if not line.product_variant_id:
            continue
        quantity = Decimal(str(line.quantity or 0))
        if quantity <= 0:
            continue
        if money(line.paid_total_amount) < 0 or money(line.unit_price) < 0:
            await apply_inventory_in(session, line, int(sale.warehouse_id), quantity, user_id)
        else:
            await apply_inventory_out(session, line, int(sale.warehouse_id), quantity, user_id)


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


@router.get("/closed", response_class=JSONResponse)
async def list_closed_sales(request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines))
            .where(and_(SaleDocument.status == SaleStatus.CLOSED, SaleDocument.deleted_at.is_(None)))
            .order_by(SaleDocument.updated_at.desc())
            .limit(200)
        )
        rows = result.scalars().all()
        return ResponseManager.success(data=[sale_to_dict(s) for s in rows], request=request)


@router.get("/by-code/{sale_code}", response_class=JSONResponse)
async def get_sale_by_code(sale_code: str, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .options(selectinload(SaleDocument.lines).selectinload(SaleDocumentLine.units))
            .where(and_(SaleDocument.sale_code == sale_code, SaleDocument.deleted_at.is_(None)))
        )
        sale = result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(message="Venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        return ResponseManager.success(data=sale_to_dict(sale, include_units=True), request=request)


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


@router.get("/by-customer/{customer_id}", response_class=JSONResponse)
async def list_sales_by_customer(
    customer_id: int,
    request: Request,
    user: dict = Depends(get_current_user),
):
    from datetime import date, timedelta
    from sqlalchemy import func

    params = request.query_params
    try:
        from_date = date.fromisoformat(params.get("from_date")) if params.get("from_date") else date.today() - timedelta(days=30)
        to_date   = date.fromisoformat(params.get("to_date"))   if params.get("to_date")   else date.today()
    except ValueError:
        return ResponseManager.error(message="Formato de fecha invalido. Use YYYY-MM-DD.", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_ERROR, error_type=ErrorType.VALIDATION_ERROR, request=request)

    doc_type = params.get("doc_type")  # TICKET | RETURN_TICKET | EXCHANGE_DRAFT | None

    conditions = [
        SaleDocument.customer_id == customer_id,
        SaleDocument.status == SaleStatus.CLOSED,
        SaleDocument.deleted_at.is_(None),
        func.date(SaleDocument.created_at) >= from_date,
        func.date(SaleDocument.created_at) <= to_date,
    ]
    if doc_type:
        conditions.append(SaleDocument.document_type_code == doc_type)

    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(SaleDocument)
            .where(and_(*conditions))
            .order_by(SaleDocument.created_at.desc())
            .limit(500)
        )
        rows = result.scalars().all()
        return ResponseManager.success(data=[
            {
                "id": s.id,
                "sale_code": s.sale_code,
                "ticket_number": s.ticket_number,
                "document_type_code": s.document_type_code,
                "document_type_name": s.document_type_name,
                "total_amount": float(s.total_amount or 0),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in rows
        ], request=request)


@router.get("/agreements/usage", response_class=JSONResponse)
async def list_agreement_usage(
    request: Request,
    organization_name: str | None = None,
    associate_identifier: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    clauses = ["deleted_at IS NULL"]
    params: dict = {"limit": min(max(int(limit or 200), 1), 1000)}
    if organization_name:
        clauses.append("organization_name LIKE :organization_name")
        params["organization_name"] = f"%{organization_name.strip()}%"
    if associate_identifier:
        clauses.append("associate_identifier = :associate_identifier")
        params["associate_identifier"] = associate_identifier.strip()
    if date_from:
        clauses.append("DATE(created_at) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        clauses.append("DATE(created_at) <= :date_to")
        params["date_to"] = date_to

    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                "SELECT id, sale_document_id, sale_code, ticket_number, agreement_type, organization_name, "
                "associate_identifier, associate_name, reference_number, discount_percent, discount_amount, "
                "original_amount, final_amount, payment_method_code, created_at "
                "FROM agreement_usage_records "
                f"WHERE {' AND '.join(clauses)} "
                "ORDER BY created_at DESC, id DESC LIMIT :limit"
            ),
            params,
        )
        rows = []
        for row in result.mappings().all():
            item = dict(row)
            item["discount_percent"] = float(item["discount_percent"] or 0) if item["discount_percent"] is not None else None
            item["discount_amount"] = float(item["discount_amount"] or 0)
            item["original_amount"] = float(item["original_amount"] or 0)
            item["final_amount"] = float(item["final_amount"] or 0)
            item["created_at"] = item["created_at"].isoformat() if item["created_at"] else None
            rows.append(item)
        return ResponseManager.success(data=rows, request=request)


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
        if sale.document_type_code in {"RETURN_TICKET", "EXCHANGE_DRAFT"}:
            unit_result = await session.execute(
                select(SaleLineUnit).where(SaleLineUnit.return_reference == sale.sale_code)
            )
            blocked_units = unit_result.scalars().all()
            for unit in blocked_units:
                unit.status = SaleUnitStatus.SOLD
                unit.return_reference = None
            if blocked_units:
                await session.execute(
                    delete(SaleReturn).where(SaleReturn.sale_line_unit_id.in_([unit.id for unit in blocked_units]))
                )
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

        user_id = current_user_id(user)
        if not user_id:
            return ResponseManager.error(message="Usuario no identificado para contabilizar inventario", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        sale.closed_by_user_id = user_id
        sale.payment_method_code = payload.payment_method_code
        sale.payment_method_name = payload.payment_method_name
        sale.amount_tendered = payload.amount_tendered
        sale.change_amount = payload.change_amount
        sale.payment_details = payload.payment_details
        sale.receipt_email = str(payload.receipt_email).lower() if payload.receipt_email else None
        apply_close_amounts(sale, payload)
        try:
            await apply_inventory_for_closed_sale(session, sale, user_id)
        except ValueError as exc:
            await session.rollback()
            return ResponseManager.error(
                message=str(exc),
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        # Registrar crédito no utilizado en cambios: diferencia entre crédito original,
        # lo que el cliente eligió y lo que se devolvió como vuelto.
        if sale.document_type_code == "EXCHANGE_DRAFT" and sale.exchange_credit_total:
            credit = money(sale.exchange_credit_total)
            new_products_total = money(sale.total_amount) + credit  # total_amount = new - credit
            refunded = money(sale.change_amount or 0)
            sale.exchange_forfeited_credit = max(Decimal("0.00"), credit - new_products_total - refunded)

        if sale.cash_register_id:
            active_sess_result = await session.execute(
                select(CashRegisterSession).where(
                    and_(
                        CashRegisterSession.cash_register_id == sale.cash_register_id,
                        CashRegisterSession.status_id == CASH_SESSION_OPEN,
                        CashRegisterSession.deleted_at.is_(None),
                    )
                ).limit(1)
            )
            active_sess = active_sess_result.scalar_one_or_none()
            if active_sess:
                sale.cash_register_session_id = active_sess.id

        await register_cash_movements_for_sale(session, sale, payload, user_id)
        try:
            await register_agreement_usage_for_sale(session, sale, payload, user_id)
        except ValueError as exc:
            await session.rollback()
            return ResponseManager.error(
                message=str(exc),
                status_code=HTTPStatus.CONFLICT,
                error_code=ErrorCode.RESOURCE_CONFLICT,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        await session.flush()
        return ResponseManager.success(data=sale_to_dict(sale, include_units=True), message="Venta cerrada", request=request)


@router.post("/returns", response_class=JSONResponse)
async def register_sale_return(payload: RegisterReturnPayload, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        unit_ids = payload.sale_line_unit_ids or []
        result = await session.execute(
            select(SaleLineUnit)
            .options(selectinload(SaleLineUnit.line).selectinload(SaleDocumentLine.sale))
            .where(SaleLineUnit.id.in_(unit_ids))
        )
        units = result.scalars().all()
        if len(units) != len(unit_ids) or any(not unit.line or not unit.line.sale for unit in units):
            return ResponseManager.error(message="Unidad de venta no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if any(unit.status != SaleUnitStatus.SOLD for unit in units):
            return ResponseManager.error(message="Una o mas unidades ya fueron devueltas o cambiadas", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        source_sale_ids = {unit.sale_document_id for unit in units}
        if len(source_sale_ids) != 1:
            return ResponseManager.error(message="Todas las unidades deben pertenecer al mismo documento", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        source_sale = units[0].line.sale
        draft_code = str(uuid4())
        document_type_code = "RETURN_TICKET" if payload.action_type == "RETURN" else "EXCHANGE_DRAFT"
        document_type_name = "Ticket de devolucion" if payload.action_type == "RETURN" else "Cambio de productos"
        total_credit = money(sum((money(unit.paid_amount) for unit in units), Decimal("0.00")))
        reason_text = payload.reason.strip() if payload.reason else ""
        notes = " | ".join([
            f"Documento origen: {source_sale.ticket_number or source_sale.sale_code}",
            f"Credito generado: {total_credit}",
            reason_text,
        ]).strip(" |")

        draft = SaleDocument(
            sale_code=draft_code,
            status=SaleStatus.PENDING_CASHIER,
            document_type_code=document_type_code,
            document_type_name=document_type_name,
            warehouse_id=source_sale.warehouse_id,
            sales_point_id=source_sale.sales_point_id,
            cash_register_id=source_sale.cash_register_id,
            customer_id=source_sale.customer_id,
            customer_snapshot=source_sale.customer_snapshot,
            authorized_buyer_snapshot=source_sale.authorized_buyer_snapshot,
            prepared_by_user_id=current_user_id(user),
            prepared_by_name=display_user(user),
            notes=notes,
        )
        for index, unit in enumerate(sorted(units, key=lambda item: unit_ids.index(item.id)), start=1):
            draft.lines.append(build_return_line(unit, index, payload.action_type))
            reference = draft_code
            unit.status = SaleUnitStatus.RETURNED if payload.action_type == "RETURN" else SaleUnitStatus.EXCHANGED
            unit.return_reference = reference
            session.add(SaleReturn(
                sale_document_id=unit.sale_document_id,
                sale_line_unit_id=unit.id,
                action_type=payload.action_type,
                amount=unit.paid_amount,
                reason=payload.reason,
                created_by_user_id=current_user_id(user),
            ))

        draft.subtotal_amount = money(sum((line.line_subtotal for line in draft.lines), Decimal("0.00")))
        draft.line_discount_amount = Decimal("0.00")
        draft.document_discount_type = "NONE"
        draft.document_discount_value = Decimal("0.00")
        draft.document_discount_amount = Decimal("0.00")
        draft.total_amount = money(sum((line.paid_total_amount for line in draft.lines), Decimal("0.00")))
        draft.tax_amount = money(sum((line.tax_amount for line in draft.lines), Decimal("0.00")))
        if payload.action_type == "EXCHANGE":
            draft.exchange_credit_total = total_credit

        session.add(draft)
        await session.flush()
        await session.refresh(draft, attribute_names=["lines"])
        action_url = f"/cash/pos?saleId={draft.sale_code}" if payload.action_type == "RETURN" else f"/sales/new?edit={draft.sale_code}"
        return ResponseManager.success(
            data={
                "reference": draft.sale_code,
                "amount": float(total_credit),
                "action_url": action_url,
                "draft": sale_to_dict(draft),
                "units": [
                    {
                        "id": unit.id,
                        "status": unit.status.value,
                        "return_reference": unit.return_reference,
                    }
                    for unit in units
                ],
            },
            message="Documento pendiente generado",
            request=request,
        )
