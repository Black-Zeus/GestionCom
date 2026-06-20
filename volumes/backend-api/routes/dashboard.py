"""
Resumen operacional para el dashboard principal.
"""
import json
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from core.response import ResponseManager
from database.database import db_manager
from database.models.cash_sessions import CASH_SESSION_OPEN
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Dashboard"])


def _json_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (date,)):
        return value.isoformat()
    return value


def _rows(result):
    return [{key: _json_value(value) for key, value in row.items()} for row in result.mappings().all()]


def _row(result):
    row = result.mappings().first()
    return {key: _json_value(value) for key, value in row.items()} if row else {}


def _period_window(date_from: date, date_to: date) -> tuple[date, date]:
    days = max((date_to - date_from).days + 1, 1)
    previous_to = date_from - timedelta(days=1)
    previous_from = previous_to - timedelta(days=days - 1)
    return previous_from, previous_to


def _warehouse_filter_clause(alias: str = "sd") -> str:
    return f"AND (:warehouse_id IS NULL OR {alias}.warehouse_id = :warehouse_id)"


def _money(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _payment_details(value) -> dict | list | None:
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return None


def _payment_amount(payment: dict) -> float:
    foreign = payment.get("foreign_currency") if isinstance(payment.get("foreign_currency"), dict) else {}
    agreement = payment.get("agreement") if isinstance(payment.get("agreement"), dict) else {}
    check = payment.get("check") if isinstance(payment.get("check"), dict) else {}
    return _money(
        payment.get("clp_amount")
        or payment.get("amount")
        or foreign.get("clp_amount")
        or agreement.get("amount")
        or check.get("amount")
        or payment.get("received_amount")
    )


def _summarize_payment_methods(rows: list[dict]) -> list[dict]:
    summary: dict[str, dict] = {}

    def add_payment(code: str | None, name: str | None, amount: float, sale_id) -> None:
        if amount <= 0:
            return
        method_code = (code or "UNSPECIFIED").upper()
        method_name = name or code or "Sin metodo"
        entry = summary.setdefault(method_code, {
            "method_name": method_name,
            "method_code": method_code,
            "transactions": 0,
            "total": 0.0,
            "_sale_ids": set(),
        })
        entry["method_name"] = method_name
        entry["total"] += amount
        entry["_sale_ids"].add(sale_id)
        entry["transactions"] = len(entry["_sale_ids"])

    for row in rows:
        details = _payment_details(row.get("payment_details"))
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            for payment in details.get("payments") or []:
                if not isinstance(payment, dict):
                    continue
                add_payment(
                    payment.get("payment_method_code"),
                    payment.get("payment_method_name"),
                    _payment_amount(payment),
                    row.get("id"),
                )
            continue

        received = _money(row.get("amount_tendered") or row.get("total_amount")) - _money(row.get("change_amount"))
        add_payment(row.get("payment_method_code"), row.get("payment_method_name"), received, row.get("id"))

    result = []
    for item in summary.values():
        item.pop("_sale_ids", None)
        result.append(item)
    return sorted(result, key=lambda item: (-item["total"], -item["transactions"], item["method_name"]))


@router.get("/summary", response_class=JSONResponse)
async def get_dashboard_summary(
    request: Request,
    date_from: date = Query(...),
    date_to: date = Query(...),
    warehouse_id: int | None = Query(default=None),
    user: dict = Depends(get_current_user),
):
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    previous_from, previous_to = _period_window(date_from, date_to)
    params = {
        "date_from": date_from,
        "date_to": date_to,
        "previous_from": previous_from,
        "previous_to": previous_to,
        "today": date.today(),
        "warehouse_id": warehouse_id,
        "open_status_id": CASH_SESSION_OPEN,
    }

    async with db_manager.get_async_session() as session:
        branches = _rows(await session.execute(text(
            """
            SELECT id AS value, CONCAT('Sucursal ', warehouse_name) AS label, warehouse_name AS name
            FROM warehouses
            WHERE deleted_at IS NULL
              AND is_active = TRUE
              AND warehouse_type IN ('STORE', 'OUTLET', 'WAREHOUSE')
            ORDER BY warehouse_type = 'WAREHOUSE', warehouse_name
            """
        )))

        today_stats = _row(await session.execute(text(
            f"""
            SELECT
              COALESCE(SUM(sd.total_amount), 0) AS sales_total,
              COUNT(*) AS transactions,
              COALESCE(ROUND(AVG(sd.total_amount)), 0) AS avg_ticket
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) = :today
              {_warehouse_filter_clause("sd")}
            """
        ), params))

        stock_summary = _row(await session.execute(text(
            """
            SELECT COUNT(*) AS critical_skus
            FROM (
              SELECT
                s.product_variant_id,
                s.warehouse_id,
                SUM(s.available_quantity) AS current_stock,
                COALESCE(NULLIF(MAX(scc.minimum_stock), 0), NULLIF(MAX(s.minimum_stock), 0), 0) AS minimum_stock
              FROM stock s
              LEFT JOIN stock_critical_config scc
                ON scc.product_variant_id = s.product_variant_id
               AND scc.warehouse_id = s.warehouse_id
               AND scc.is_active = TRUE
              WHERE (:warehouse_id IS NULL OR s.warehouse_id = :warehouse_id)
              GROUP BY s.product_variant_id, s.warehouse_id
              HAVING minimum_stock > 0 AND current_stock <= minimum_stock
            ) critical
            """
        ), params))

        daily_sales = _rows(await session.execute(text(
            f"""
            SELECT
              DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
              sd.warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal') AS warehouse_name,
              COALESCE(SUM(sd.total_amount), 0) AS total,
              COUNT(*) AS transactions
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            GROUP BY sale_date, sd.warehouse_id, w.warehouse_name
            ORDER BY sale_date, warehouse_name
            """
        ), params))

        branch_totals = _rows(await session.execute(text(
            f"""
            SELECT
              sd.warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal') AS warehouse_name,
              COALESCE(SUM(sd.total_amount), 0) AS total,
              COUNT(*) AS transactions
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            GROUP BY sd.warehouse_id, w.warehouse_name
            ORDER BY total DESC
            """
        ), params))

        previous_totals = _rows(await session.execute(text(
            f"""
            SELECT
              sd.warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal') AS warehouse_name,
              COALESCE(SUM(sd.total_amount), 0) AS total
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :previous_from AND :previous_to
              {_warehouse_filter_clause("sd")}
            GROUP BY sd.warehouse_id, w.warehouse_name
            """
        ), params))

        payment_method_rows = _rows(await session.execute(text(
            f"""
            SELECT
              sd.id,
              sd.payment_method_name,
              sd.payment_method_code,
              sd.amount_tendered,
              sd.change_amount,
              sd.payment_details,
              sd.total_amount
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            """
        ), params))
        payment_methods = _summarize_payment_methods(payment_method_rows)

        sessions = _rows(await session.execute(text(
            """
            SELECT
              crs.id,
              w.id AS warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal') AS warehouse_name,
              cr.register_name,
              cr.register_code,
              CONCAT_WS(' ', u.first_name, u.last_name) AS cashier_name,
              u.username AS cashier_username,
              TIME_FORMAT(crs.opening_datetime, '%H:%i') AS since,
              COALESCE(crs.theoretical_amount, crs.opening_amount, 0) AS balance,
              crs.status_id = :open_status_id AS is_open
            FROM cash_register_sessions crs
            JOIN cash_registers cr ON cr.id = crs.cash_register_id
            LEFT JOIN warehouses w ON w.id = cr.warehouse_id
            LEFT JOIN users u ON u.id = crs.cashier_user_id
            WHERE crs.deleted_at IS NULL
              AND crs.status_id = :open_status_id
              AND (:warehouse_id IS NULL OR cr.warehouse_id = :warehouse_id)
            ORDER BY crs.opening_datetime DESC
            """
        ), params))

        recent_sales = _rows(await session.execute(text(
            f"""
            SELECT
              sd.id,
              sd.sale_code,
              COALESCE(sd.ticket_number, sd.sale_code) AS folio,
              TIME_FORMAT(COALESCE(sd.updated_at, sd.created_at), '%H:%i') AS sale_time,
              sd.status,
              sd.warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal') AS warehouse_name,
              COALESCE(cr.register_name, cr.register_code, 'Sin caja') AS cash_register_name,
              COALESCE(NULLIF(CONCAT_WS(' ', u.first_name, u.last_name), ''), u.username, sd.prepared_by_name, 'Sin vendedor') AS vendor_name,
              COALESCE(
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(sd.customer_snapshot, '$.legal_name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(sd.customer_snapshot, '$.name')), ''),
                NULLIF(JSON_UNQUOTE(JSON_EXTRACT(sd.customer_snapshot, '$.customer_name')), ''),
                'Consumidor final'
              ) AS customer_name,
              COALESCE(items.items_count, 0) AS items_count,
              sd.total_amount,
              COALESCE(sd.payment_method_name, sd.payment_method_code, 'Sin metodo') AS payment_method
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            LEFT JOIN cash_registers cr ON cr.id = sd.cash_register_id
            LEFT JOIN users u ON u.id = sd.closed_by_user_id
            LEFT JOIN (
              SELECT sale_document_id, SUM(quantity) AS items_count
              FROM sale_document_lines
              GROUP BY sale_document_id
            ) items ON items.sale_document_id = sd.id
            WHERE sd.deleted_at IS NULL
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            ORDER BY COALESCE(sd.updated_at, sd.created_at) DESC
            LIMIT 10
            """
        ), params))

        top_products = _rows(await session.execute(text(
            f"""
            SELECT
              COALESCE(sdl.product_variant_id, sdl.product_id) AS id,
              COALESCE(pv.variant_sku, sdl.product_code) AS sku,
              COALESCE(pv.variant_name, sdl.product_name) AS name,
              SUM(sdl.quantity) AS units,
              SUM(sdl.paid_total_amount) AS total
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            LEFT JOIN product_variants pv ON pv.id = sdl.product_variant_id
            LEFT JOIN products p ON p.id = sdl.product_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            GROUP BY id, sku, name
            ORDER BY units DESC, total DESC
            LIMIT 5
            """
        ), params))

        low_movers = _rows(await session.execute(text(
            f"""
            SELECT
              COALESCE(sdl.product_variant_id, sdl.product_id) AS id,
              COALESCE(pv.variant_sku, sdl.product_code) AS sku,
              COALESCE(pv.variant_name, sdl.product_name) AS name,
              SUM(sdl.quantity) AS units,
              COALESCE(stock_totals.available_stock, 0) AS stock
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            LEFT JOIN product_variants pv ON pv.id = sdl.product_variant_id
            LEFT JOIN (
              SELECT product_variant_id, SUM(available_quantity) AS available_stock
              FROM stock
              WHERE (:warehouse_id IS NULL OR warehouse_id = :warehouse_id)
              GROUP BY product_variant_id
            ) stock_totals ON stock_totals.product_variant_id = sdl.product_variant_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {_warehouse_filter_clause("sd")}
            GROUP BY id, sku, name, stock
            ORDER BY units ASC, stock DESC
            LIMIT 5
            """
        ), params))

        low_stock = _rows(await session.execute(text(
            """
            SELECT
              pv.id,
              pv.variant_sku AS sku,
              pv.variant_name AS name,
              w.warehouse_name,
              SUM(s.available_quantity) AS stock,
              COALESCE(NULLIF(MAX(scc.minimum_stock), 0), NULLIF(MAX(s.minimum_stock), 0), 0) AS minimum_stock
            FROM stock s
            JOIN product_variants pv ON pv.id = s.product_variant_id
            LEFT JOIN warehouses w ON w.id = s.warehouse_id
            LEFT JOIN stock_critical_config scc
              ON scc.product_variant_id = s.product_variant_id
             AND scc.warehouse_id = s.warehouse_id
             AND scc.is_active = TRUE
            WHERE (:warehouse_id IS NULL OR s.warehouse_id = :warehouse_id)
            GROUP BY pv.id, pv.variant_sku, pv.variant_name, w.warehouse_name
            HAVING minimum_stock > 0 AND stock <= minimum_stock
            ORDER BY stock ASC, minimum_stock DESC
            LIMIT 8
            """
        ), params))

    data = {
        "filters": {
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
            "warehouse_id": warehouse_id,
            "previous_from": previous_from.isoformat(),
            "previous_to": previous_to.isoformat(),
        },
        "branches": branches,
        "kpis": {
            "sales_total": today_stats.get("sales_total", 0),
            "transactions": today_stats.get("transactions", 0),
            "avg_ticket": today_stats.get("avg_ticket", 0),
            "critical_skus": stock_summary.get("critical_skus", 0),
        },
        "daily_sales": daily_sales,
        "branch_totals": branch_totals,
        "previous_totals": previous_totals,
        "payment_methods": payment_methods,
        "sessions": sessions,
        "recent_sales": recent_sales,
        "top_products": top_products,
        "low_movers": low_movers,
        "low_stock": low_stock,
    }
    return ResponseManager.success(data=data, message="Dashboard cargado", request=request)
