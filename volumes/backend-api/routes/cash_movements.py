"""
Consulta de movimientos financieros de caja.
"""
from datetime import date
from decimal import Decimal
import json

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import bindparam, text

from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Cash Movements"])


MOVEMENT_LABELS = {
    "OPENING": "Apertura",
    "SALE": "Venta",
    "RETURN": "Devolucion",
    "PETTY_CASH": "Caja chica",
    "ADJUSTMENT": "Ajuste",
    "CLOSING": "Cierre",
}


def _num(value) -> float:
    return float(Decimal(str(value or 0)))


def _json_value(value):
    if value is None or isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return None


def _row_to_dict(row) -> dict:
    data = dict(row)
    movement_type = data.get("movement_type")
    user_name = " ".join(
        part for part in [data.pop("user_first_name", None), data.pop("user_last_name", None)] if part
    ).strip()
    data["movement_label"] = MOVEMENT_LABELS.get(movement_type, movement_type)
    data["created_by_name"] = user_name or data.pop("username", None) or "-"
    for key in ["amount", "change_amount", "received_amount"]:
        data[key] = _num(data.get(key))
    if data.get("created_at"):
        data["created_at"] = data["created_at"].isoformat()
    if data.get("opening_datetime"):
        data["opening_datetime"] = data["opening_datetime"].isoformat()
    if data.get("closing_datetime"):
        data["closing_datetime"] = data["closing_datetime"].isoformat()
    return data


def _sale_row_to_dict(row) -> dict:
    data = dict(row)
    for key in [
        "subtotal_amount",
        "line_discount_amount",
        "document_discount_value",
        "document_discount_amount",
        "tax_amount",
        "total_amount",
        "amount_tendered",
        "change_amount",
    ]:
        data[key] = _num(data.get(key))
    data["customer"] = _json_value(data.pop("customer_snapshot", None))
    data["authorized_buyer"] = _json_value(data.pop("authorized_buyer_snapshot", None))
    data["payment_details"] = _json_value(data.get("payment_details"))
    if data.get("created_at"):
        data["created_at"] = data["created_at"].isoformat()
    if data.get("updated_at"):
        data["updated_at"] = data["updated_at"].isoformat()
    data["items"] = []
    return data


def _sale_line_to_dict(row) -> dict:
    data = dict(row)
    for key in [
        "unit_price",
        "discount_percent",
        "line_subtotal",
        "line_discount_amount",
        "document_discount_amount",
        "tax_amount",
        "paid_total_amount",
    ]:
        data[key] = _num(data.get(key))
    return data


async def _attach_sale_documents(session, movements: list[dict]) -> None:
    references = sorted({item.get("reference_number") for item in movements if item.get("reference_number")})
    if not references:
        return

    sale_query = text(
        """
        SELECT
            id,
            sale_code,
            status,
            document_type_code,
            document_type_name,
            ticket_number,
            payment_method_code,
            payment_method_name,
            amount_tendered,
            change_amount,
            payment_details,
            customer_snapshot,
            authorized_buyer_snapshot,
            prepared_by_name,
            subtotal_amount,
            line_discount_amount,
            document_discount_type,
            document_discount_value,
            document_discount_amount,
            tax_amount,
            total_amount,
            notes,
            created_at,
            updated_at
        FROM sale_documents
        WHERE deleted_at IS NULL
          AND (ticket_number IN :references OR sale_code IN :references)
        """
    ).bindparams(bindparam("references", expanding=True))
    sale_result = await session.execute(sale_query, {"references": references})
    sales = [_sale_row_to_dict(row) for row in sale_result.mappings().all()]
    if not sales:
        return

    sale_ids = [sale["id"] for sale in sales]
    line_query = text(
        """
        SELECT
            id,
            sale_document_id,
            line_number,
            product_code,
            product_name,
            unit_name,
            quantity,
            unit_price,
            discount_percent,
            line_subtotal,
            line_discount_amount,
            document_discount_amount,
            tax_amount,
            paid_total_amount
        FROM sale_document_lines
        WHERE deleted_at IS NULL AND sale_document_id IN :sale_ids
        ORDER BY sale_document_id, line_number
        """
    ).bindparams(bindparam("sale_ids", expanding=True))
    line_result = await session.execute(line_query, {"sale_ids": sale_ids})

    sales_by_id = {sale["id"]: sale for sale in sales}
    for line in line_result.mappings().all():
        item = _sale_line_to_dict(line)
        sale = sales_by_id.get(item["sale_document_id"])
        if sale:
            sale["items"].append(item)

    sales_by_reference = {}
    for sale in sales:
        if sale.get("ticket_number"):
            sales_by_reference[sale["ticket_number"]] = sale
        if sale.get("sale_code"):
            sales_by_reference[sale["sale_code"]] = sale

    for movement in movements:
        sale = sales_by_reference.get(movement.get("reference_number"))
        if sale:
            movement["sale_document"] = sale


@router.get("", response_class=JSONResponse)
@router.get("/", response_class=JSONResponse)
async def list_cash_movements(
    request: Request,
    user: dict = Depends(get_current_user),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    cash_register_id: int | None = Query(None, gt=0),
    session_id: int | None = Query(None, gt=0),
    movement_type: str | None = Query(None),
    payment_method_code: str | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
):
    clauses = ["crs.deleted_at IS NULL"]
    params = {"limit": limit}

    if date_from:
        clauses.append("DATE(cm.created_at) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        clauses.append("DATE(cm.created_at) <= :date_to")
        params["date_to"] = date_to
    if cash_register_id:
        clauses.append("crs.cash_register_id = :cash_register_id")
        params["cash_register_id"] = cash_register_id
    if session_id:
        clauses.append("cm.cash_register_session_id = :session_id")
        params["session_id"] = session_id
    if movement_type and movement_type.lower() != "all":
        clauses.append("cm.movement_type = :movement_type")
        params["movement_type"] = movement_type.upper()
    if payment_method_code and payment_method_code.lower() != "all":
        clauses.append("pm.method_code = :payment_method_code")
        params["payment_method_code"] = payment_method_code.upper()

    where_sql = " AND ".join(clauses)
    query = text(
        f"""
        SELECT
            cm.id,
            cm.cash_register_session_id,
            cm.movement_type,
            cm.amount,
            cm.change_amount,
            cm.received_amount,
            cm.reference_number,
            cm.description,
            cm.created_at,
            pm.id AS payment_method_id,
            pm.method_code AS payment_method_code,
            pm.method_name AS payment_method_name,
            pm.icon_name AS payment_method_icon,
            crs.session_code,
            crs.opening_datetime,
            crs.closing_datetime,
            cr.id AS cash_register_id,
            cr.register_code,
            cr.register_name,
            w.id AS warehouse_id,
            w.warehouse_code,
            w.warehouse_name,
            u.username,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name
        FROM cash_movements cm
        JOIN cash_register_sessions crs ON crs.id = cm.cash_register_session_id
        JOIN cash_registers cr ON cr.id = crs.cash_register_id
        LEFT JOIN warehouses w ON w.id = cr.warehouse_id
        JOIN payment_methods pm ON pm.id = cm.payment_method_id
        JOIN users u ON u.id = cm.created_by_user_id
        WHERE {where_sql}
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT :limit
        """
    )

    async with db_manager.get_async_session() as session:
        result = await session.execute(query, params)
        movements = [_row_to_dict(row) for row in result.mappings().all()]
        await _attach_sale_documents(session, movements)

    by_type = {}
    by_method = {}
    for item in movements:
        movement_key = item["movement_type"]
        method_key = item["payment_method_code"]
        by_type.setdefault(movement_key, {"movement_type": movement_key, "label": item["movement_label"], "amount": 0.0, "count": 0})
        by_type[movement_key]["amount"] += item["amount"]
        by_type[movement_key]["count"] += 1
        by_method.setdefault(method_key, {"payment_method_code": method_key, "payment_method_name": item["payment_method_name"], "amount": 0.0, "count": 0})
        by_method[method_key]["amount"] += item["amount"]
        by_method[method_key]["count"] += 1

    summary = {
        "movement_count": len(movements),
        "sales_total": sum(item["amount"] for item in movements if item["movement_type"] == "SALE"),
        "returns_total": sum(item["amount"] for item in movements if item["movement_type"] == "RETURN"),
        "petty_cash_total": sum(item["amount"] for item in movements if item["movement_type"] == "PETTY_CASH"),
        "adjustment_total": sum(item["amount"] for item in movements if item["movement_type"] == "ADJUSTMENT"),
        "net_total": sum(item["amount"] for item in movements),
        "received_total": sum(item["received_amount"] for item in movements),
        "change_total": sum(item["change_amount"] for item in movements),
        "by_type": list(by_type.values()),
        "by_payment_method": list(by_method.values()),
    }

    return ResponseManager.success(
        data={"movements": movements, "summary": summary},
        message=f"Se encontraron {len(movements)} movimientos de caja",
        request=request,
    )
