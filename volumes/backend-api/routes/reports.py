"""
routes/reports.py
Generación de reportes PDF usando Gotenberg (HTML → PDF).
Template: templates/reports/daily_sales.html
"""
import asyncio
import base64
import html
import json
import math
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from core.config import settings
from database.database import db_manager
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)
CURRENCY_LABEL = "Peso chileno (CLP)"

router = APIRouter(
    tags=["Reports"],
    responses={
        503: {"description": "Servicio de generación PDF no disponible"},
    },
)

# ─── DB / payment helpers ──────────────────────────────────────────────────

def _json_val(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, date):
        return value.isoformat()
    return value

def _rows(result):
    return [{k: _json_val(v) for k, v in row.items()} for row in result.mappings().all()]

def _row(result):
    row = result.mappings().first()
    return {k: _json_val(v) for k, v in row.items()} if row else {}

def _money(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

def _payment_details(value):
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str) and value.strip():
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None
    return None

def _payment_amount(payment: dict) -> float:
    foreign   = payment.get("foreign_currency") if isinstance(payment.get("foreign_currency"), dict) else {}
    agreement = payment.get("agreement")         if isinstance(payment.get("agreement"), dict)         else {}
    check     = payment.get("check")             if isinstance(payment.get("check"), dict)             else {}
    return _money(
        payment.get("clp_amount")
        or payment.get("amount")
        or foreign.get("clp_amount")
        or agreement.get("amount")
        or check.get("amount")
        or payment.get("received_amount")
    )


def _parse_id_list(value) -> list[int]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        raw_values = value
    else:
        raw_values = str(value).split(",")
    ids: list[int] = []
    for raw in raw_values:
        try:
            parsed = int(str(raw).strip())
        except (TypeError, ValueError):
            continue
        if parsed not in ids:
            ids.append(parsed)
    return ids


def _append_in_filter(filters: list[str], params: dict, column: str, values: list[int], prefix: str) -> None:
    if not values:
        return
    placeholders = []
    for idx, value in enumerate(values):
        key = f"{prefix}_{idx}"
        placeholders.append(f":{key}")
        params[key] = value
    filters.append(f"{column} IN ({', '.join(placeholders)})")


# ─── Template engine (partials + variable replacement) ────────────────────

_TEMPLATES_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "templates", "reports")
)
_PARTIALS_DIR  = os.path.join(_TEMPLATES_DIR, "partials")


def _load_file(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def _resolve_partials(text: str, depth: int = 0) -> str:
    """Replace {{> partial_name}} with the content of partials/_partial_name.html.
    Supports one level of nesting (partials can also contain variable placeholders
    but not further partial includes, to keep it simple)."""
    if depth > 5:
        return text
    import re
    def _include(match: re.Match) -> str:
        name = match.group(1).strip()
        path = os.path.join(_PARTIALS_DIR, f"{name}.html")
        try:
            content = _load_file(path)
            return _resolve_partials(content, depth + 1)
        except FileNotFoundError:
            return f"<!-- PARTIAL NOT FOUND: {name} -->"
    return re.sub(r'\{\{>\s*(\S+)\s*\}\}', _include, text)


def _render(template_name: str, ctx: dict) -> str:
    """Load template, resolve partials, then replace all {{VAR}} placeholders."""
    path   = os.path.join(_TEMPLATES_DIR, template_name)
    source = _load_file(path)
    html   = _resolve_partials(source)
    for key, value in ctx.items():
        html = html.replace(f"{{{{{key}}}}}", str(value))
    return html


# ─── Mock data helpers (mirrors DailySales.jsx logic) ──────────────────────

_BRANCHES = ["Centro", "Mall", "Norte"]
_WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
_MW       = {"Efectivo": 0.25, "Débito": 0.40, "Crédito": 0.20, "Transferencia": 0.15}
_EPOCH    = date(2020, 1, 1)   # anchor for deterministic day-index


def _seeded(base: int, seed: int) -> int:
    r = abs(math.sin(seed * 9301 + 49297) * 233280)
    return round(base + (r % (base * 0.6)) - base * 0.3)


def _generate_rows(date_from: str, date_to: str, branch: str) -> list[dict]:
    start  = date.fromisoformat(date_from)
    end    = date.fromisoformat(date_to)
    active = _BRANCHES if branch in ("all", "", "todas") else [branch]

    rows, cur = [], start
    while cur <= end:
        di    = (cur - _EPOCH).days   # unique per calendar date → different periods ≠ same data
        total = txn = 0
        for b in active:
            bi     = _BRANCHES.index(b)
            t      = _seeded(400000 + bi * 120000, di * 7 + bi * 13)
            n      = _seeded(40 + bi * 10, di * 5 + bi * 3)
            total += t
            txn   += n

        cancelled  = max(0, round(txn * (0.03 + abs(math.sin(di * 2.1)) * 0.03)))
        avg_ticket = round(total / txn) if txn > 0 else 0

        rows.append({
            "iso":           cur.isoformat(),
            "weekday":       _WEEKDAYS[cur.weekday()],
            "total":         total,
            "txn":           txn,
            "cancelled":     cancelled,
            "avg_ticket":    avg_ticket,
            "efectivo":      round(total * _MW["Efectivo"]),
            "debito":        round(total * _MW["Débito"]),
            "credito":       round(total * _MW["Crédito"]),
            "transferencia": round(total * _MW["Transferencia"]),
        })
        cur += timedelta(days=1)

    return rows


def _clp(v: int) -> str:
    return f"$ {v:,}".replace(",", ".")

def _clp_k(v: int) -> str:
    """Compact format: $ 1.234K or $ 12.3M"""
    if abs(v) >= 1_000_000:
        return f"$ {v/1_000_000:.1f}M"
    if abs(v) >= 1_000:
        return f"$ {v/1_000:.0f}K"
    return f"$ {v}"

def _fmt(iso: str) -> str:
    return date.fromisoformat(iso).strftime("%d/%m/%Y")

def _pct_diff(current: int, previous: int) -> str:
    if previous == 0:
        return "+100%"
    diff = (current - previous) / previous * 100
    sign = "+" if diff >= 0 else ""
    return f"{sign}{diff:.1f}%"

def _pct_color(current: int, previous: int) -> str:
    return "#10b981" if current >= previous else "#ef4444"


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0))


def _float(value) -> float:
    return float(_decimal(value))


def _customer_name(snapshot) -> str:
    if isinstance(snapshot, str):
        try:
            snapshot = json.loads(snapshot)
        except json.JSONDecodeError:
            snapshot = {}
    if not isinstance(snapshot, dict):
        snapshot = {}
    return (
        snapshot.get("commercial_name")
        or snapshot.get("legal_name")
        or snapshot.get("customer_name")
        or snapshot.get("name")
        or snapshot.get("customer_code")
        or "Cliente Generico"
    )


def _customer_rut(snapshot) -> str:
    if isinstance(snapshot, str):
        try:
            snapshot = json.loads(snapshot)
        except json.JSONDecodeError:
            snapshot = {}
    if not isinstance(snapshot, dict):
        snapshot = {}
    return snapshot.get("tax_id") or ""


def _source_document(notes: str | None) -> str | None:
    if not notes:
        return None
    match = re.search(r"Documento origen:\s*([^|]+)", notes)
    return match.group(1).strip() if match else None


def _document_label(code: str | None, name: str | None) -> str:
    if code == "RETURN_TICKET":
        return "Devolucion"
    if code == "EXCHANGE_DRAFT":
        return "Cambio"
    return name or code or "Documento"


@router.get("/sales/returns-exchanges", response_class=JSONResponse)
async def list_returns_exchanges_report(
    date_from: date = Query(..., description="Fecha inicial en formato YYYY-MM-DD"),
    date_to: date = Query(..., description="Fecha final en formato YYYY-MM-DD"),
    warehouse_id: int | None = Query(None, description="Bodega/local a filtrar"),
    warehouse_ids: str | None = Query(None, description="Bodegas/locales a filtrar, separadas por coma"),
    document_type: str = Query("all", description="all | RETURN_TICKET | EXCHANGE_DRAFT"),
    status: str = Query("CLOSED", description="all | PENDING_CASHIER | CLOSED | CANCELLED"),
):
    if date_from > date_to:
        return JSONResponse(status_code=400, content={"message": "La fecha inicial no puede ser posterior a la fecha final."})

    allowed_types = {"all", "RETURN_TICKET", "EXCHANGE_DRAFT"}
    allowed_statuses = {"all", "PENDING_CASHIER", "CLOSED", "CANCELLED"}
    document_type = (document_type or "all").upper()
    if document_type == "ALL":
        document_type = "all"
    status = (status or "CLOSED").upper()
    if status == "ALL":
        status = "all"
    if document_type not in allowed_types:
        return JSONResponse(status_code=400, content={"message": "Tipo de documento invalido."})
    if status not in allowed_statuses:
        return JSONResponse(status_code=400, content={"message": "Estado invalido."})

    filters = [
        "sd.deleted_at IS NULL",
        "sd.document_type_code IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')",
        "DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to",
    ]
    params = {"date_from": date_from, "date_to": date_to}
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    if selected_warehouse_ids:
        _append_in_filter(filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
    elif warehouse_id:
        filters.append("sd.warehouse_id = :warehouse_id")
        params["warehouse_id"] = warehouse_id
    if document_type != "all":
        filters.append("sd.document_type_code = :document_type")
        params["document_type"] = document_type
    if status != "all":
        filters.append("sd.status = :status")
        params["status"] = status

    where_sql = " AND ".join(filters)
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                f"""
                SELECT
                    sd.id,
                    sd.sale_code,
                    sd.ticket_number,
                    sd.document_type_code,
                    sd.document_type_name,
                    sd.status,
                    sd.warehouse_id,
                    w.warehouse_code,
                    w.warehouse_name,
                    sd.customer_snapshot,
                    sd.total_amount,
                    sd.exchange_credit_total,
                    sd.exchange_forfeited_credit,
                    sd.notes,
                    sd.created_at,
                    sd.updated_at,
                    COALESCE(sdl_agg.origin_item_count, 0) AS origin_item_count,
                    COALESCE(sdl_agg.new_item_count, 0) AS new_item_count,
                    COALESCE(sdl_agg.origin_credit_amount, 0) AS origin_credit_amount,
                    COALESCE(sdl_agg.new_products_amount, 0) AS new_products_amount
                FROM sale_documents sd
                LEFT JOIN warehouses w ON w.id = sd.warehouse_id
                LEFT JOIN (
                    SELECT
                        sale_document_id,
                        SUM(CASE WHEN paid_total_amount < 0 OR unit_price < 0 OR product_name LIKE 'Credito por cambio:%' OR product_name LIKE 'Devolucion:%'
                            THEN ABS(quantity) ELSE 0 END) AS origin_item_count,
                        SUM(CASE WHEN paid_total_amount >= 0 AND unit_price >= 0 AND product_name NOT LIKE 'Credito por cambio:%' AND product_name NOT LIKE 'Devolucion:%'
                            THEN ABS(quantity) ELSE 0 END) AS new_item_count,
                        SUM(CASE WHEN paid_total_amount < 0 OR unit_price < 0 OR product_name LIKE 'Credito por cambio:%' OR product_name LIKE 'Devolucion:%'
                            THEN ABS(paid_total_amount) ELSE 0 END) AS origin_credit_amount,
                        SUM(CASE WHEN paid_total_amount >= 0 AND unit_price >= 0 AND product_name NOT LIKE 'Credito por cambio:%' AND product_name NOT LIKE 'Devolucion:%'
                            THEN paid_total_amount ELSE 0 END) AS new_products_amount
                    FROM sale_document_lines
                    WHERE deleted_at IS NULL
                    GROUP BY sale_document_id
                ) sdl_agg ON sdl_agg.sale_document_id = sd.id
                WHERE {where_sql}
                ORDER BY COALESCE(sd.updated_at, sd.created_at) ASC, sd.id ASC
                LIMIT 1000
                """
            ),
            params,
        )
        rows = result.mappings().all()

    data = []
    totals = {
        "documents": 0,
        "returns": 0,
        "exchanges": 0,
        "origin_items": 0,
        "new_items": 0,
        "origin_credit_amount": Decimal("0"),
        "new_products_amount": Decimal("0"),
        "forfeited_credit": Decimal("0"),
        "net_total": Decimal("0"),
    }

    for row in rows:
        doc_type = row["document_type_code"]
        origin_credit = _decimal(row["exchange_credit_total"]) if doc_type == "EXCHANGE_DRAFT" and row["exchange_credit_total"] is not None else _decimal(row["origin_credit_amount"])
        forfeited = _decimal(row["exchange_forfeited_credit"])
        net_total = _decimal(row["total_amount"])
        origin_items = int(row["origin_item_count"] or 0)
        new_items = int(row["new_item_count"] or 0)

        totals["documents"] += 1
        totals["returns"] += 1 if doc_type == "RETURN_TICKET" else 0
        totals["exchanges"] += 1 if doc_type == "EXCHANGE_DRAFT" else 0
        totals["origin_items"] += origin_items
        totals["new_items"] += new_items
        totals["origin_credit_amount"] += origin_credit
        totals["new_products_amount"] += _decimal(row["new_products_amount"])
        totals["forfeited_credit"] += forfeited
        totals["net_total"] += net_total

        data.append({
            "id": row["id"],
            "sale_code": row["sale_code"],
            "folio": row["ticket_number"] or f"{_document_label(doc_type, row['document_type_name'])} sin folio",
            "document_type_code": doc_type,
            "document_type_name": row["document_type_name"],
            "document_label": _document_label(doc_type, row["document_type_name"]),
            "status": row["status"],
            "warehouse_id": row["warehouse_id"],
            "warehouse_name": row["warehouse_name"] or row["warehouse_code"] or "Sin locacion",
            "customer_name": _customer_name(row["customer_snapshot"]),
            "source_document": _source_document(row["notes"]),
            "origin_item_count": origin_items,
            "new_item_count": new_items,
            "origin_credit_amount": _float(origin_credit),
            "new_products_amount": _float(row["new_products_amount"]),
            "forfeited_credit": _float(forfeited),
            "total_amount": _float(net_total),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        })

    totals_payload = {
        key: (_float(value) if isinstance(value, Decimal) else value)
        for key, value in totals.items()
    }
    return JSONResponse(content={"data": data, "totals": totals_payload})


# ─── Returns & exchanges PDF ──────────────────────────────────────────────

_RX_ROWS_FIRST = 18   # filas en primera página de detalle (tiene encabezado de sección)
_RX_ROWS_REST  = 22   # filas en páginas de continuación

_STATUS_LABELS = {
    "CLOSED":          "Cerrados",
    "PENDING_CASHIER": "Pendientes",
    "CANCELLED":       "Cancelados",
    "all":             "Todos los estados",
}
_DOC_TYPE_LABELS = {
    "all":            "Cambios y devoluciones",
    "EXCHANGE_DRAFT": "Solo cambios",
    "RETURN_TICKET":  "Solo devoluciones",
}

_RX_COLGROUP = (
    '<colgroup>'
    '<col style="width:8%">'   # Fecha
    '<col style="width:9%">'   # Folio / Tipo
    '<col style="width:7%">'   # Estado
    '<col style="width:9%">'   # Origen
    '<col style="width:13%">'  # Cliente
    '<col style="width:10%">'  # Locación
    '<col style="width:6%">'   # Art. orig.
    '<col style="width:6%">'   # Art. nuevos
    '<col style="width:11%">'  # Crédito
    '<col style="width:11%">'  # Prod. nuevos
    '<col style="width:10%">'  # Perdido
    '</colgroup>'
)

_RX_THEAD = (
    '<thead><tr>'
    '<th>Fecha</th><th>Folio / Tipo</th><th>Estado</th><th>Origen</th>'
    '<th>Cliente</th><th>Locación</th>'
    '<th style="text-align:right">Art.&nbsp;orig.</th>'
    '<th style="text-align:right">Art.&nbsp;nuevos</th>'
    '<th style="text-align:right">Crédito</th>'
    '<th style="text-align:right">Prod.&nbsp;nuevos</th>'
    '<th style="text-align:right">Perdido</th>'
    '</tr></thead>'
)


def _rx_row(r: dict) -> str:
    dim = '<span class="dim">&#8212;</span>'
    fecha = _fmt(r["updated_at"][:10] if r["updated_at"] else r["created_at"][:10] if r["created_at"] else "")

    badge_cls = "badge-blue" if r["document_type_code"] == "EXCHANGE_DRAFT" else "badge-rose"
    folio_cell = (
        f'<strong>{r["folio"]}</strong>'
        f'<br><span class="badge {badge_cls}">{r["document_label"]}</span>'
    )

    status_map = {"CLOSED": "Cerrado", "PENDING_CASHIER": "Pendiente", "CANCELLED": "Cancelado"}
    estado = status_map.get(r["status"], r["status"] or "-")

    origen = r["source_document"] or dim
    cliente = r["customer_name"] or dim
    locacion = r["warehouse_name"] or dim

    art_orig   = str(r["origin_item_count"]) if r["origin_item_count"] else dim
    art_new    = str(r["new_item_count"])    if r["new_item_count"]    else dim
    credito    = _clp(round(r["origin_credit_amount"]))   if r["origin_credit_amount"]   else dim
    prod_new   = _clp(round(r["new_products_amount"]))    if r["new_products_amount"]    else dim
    perdido_v  = r["forfeited_credit"] or 0
    perdido    = f'<span style="color:#d97706">{_clp(round(perdido_v))}</span>' if perdido_v > 0 else dim

    return (
        f'<tr>'
        f'<td style="font-size:8px">{fecha}</td>'
        f'<td>{folio_cell}</td>'
        f'<td style="font-size:8px">{estado}</td>'
        f'<td style="font-size:8px">{origen}</td>'
        f'<td style="font-size:8px">{cliente}</td>'
        f'<td style="font-size:8px">{locacion}</td>'
        f'<td style="text-align:right">{art_orig}</td>'
        f'<td style="text-align:right">{art_new}</td>'
        f'<td style="text-align:right;font-weight:600">{credito}</td>'
        f'<td style="text-align:right">{prod_new}</td>'
        f'<td style="text-align:right">{perdido}</td>'
        f'</tr>'
    )


def _build_rx_detail_pages(rows: list[dict], ctx: dict) -> str:
    def _partial(name: str) -> str:
        path = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")
    pages = []
    chunks = [rows[:_RX_ROWS_FIRST]] + [
        rows[_RX_ROWS_FIRST + i * _RX_ROWS_REST: _RX_ROWS_FIRST + (i + 1) * _RX_ROWS_REST]
        for i in range((max(len(rows) - _RX_ROWS_FIRST, 0) + _RX_ROWS_REST - 1) // _RX_ROWS_REST)
    ] if rows else [[]]

    for page_idx, chunk in enumerate(chunks):
        section_html = ""
        if page_idx == 0:
            section_html = (
                '<div class="section-heading">'
                '<div class="section-label">Detalle</div>'
                '<h2 class="section-title">Listado de documentos</h2>'
                '</div>'
            )

        total_docs = len(rows)
        page_label = f"Página {page_idx + 1} de {len(chunks)} &middot; {total_docs} documentos"

        tbody = "".join(_rx_row(r) for r in chunk) if chunk else (
            '<tr><td colspan="11" style="text-align:center;padding:20px;color:#94a3b8">'
            'Sin documentos para los filtros seleccionados'
            '</td></tr>'
        )

        # Footer con totales solo en la última página
        tfoot = ""
        if page_idx == len(chunks) - 1:
            tot_orig   = sum(r["origin_item_count"]   for r in rows)
            tot_new    = sum(r["new_item_count"]       for r in rows)
            tot_cred   = sum(r["origin_credit_amount"] for r in rows)
            tot_prod   = sum(r["new_products_amount"]  for r in rows)
            tot_perd   = sum(r["forfeited_credit"]     for r in rows)
            tfoot = (
                '<tfoot><tr style="background:#0f172a;color:white;font-weight:700">'
                '<td colspan="6" style="padding:6px 8px;font-size:9px">TOTAL PERÍODO</td>'
                f'<td style="text-align:right;padding:6px 8px">{tot_orig}</td>'
                f'<td style="text-align:right;padding:6px 8px">{tot_new}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(tot_cred))}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(tot_prod))}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(tot_perd))}</td>'
                '</tr></tfoot>'
            )

        pages.append(
            f'<section class="report-page">'
            f'{page_hdr}'
            f'{section_html}'
            f'<div style="font-size:8px;color:#94a3b8;margin-bottom:6px">{page_label}</div>'
            f'<table class="detail-table">'
            f'{_RX_COLGROUP}{_RX_THEAD}<tbody>{tbody}</tbody>{tfoot}'
            f'</table>'
            f'{page_ftr}'
            f'</section>'
        )

    return "\n".join(pages)


def _build_rx_grouped_pages(rows: list[dict], ctx: dict, date_from: str, date_to: str) -> str:
    def _partial(name: str) -> str:
        path = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")
    by_day: dict[str, dict] = {}
    cur = date.fromisoformat(date_from)
    end = date.fromisoformat(date_to)
    while cur <= end:
        iso = cur.isoformat()
        by_day[iso] = {
            "_iso": iso,
            "documents": 0,
            "exchanges": 0,
            "returns": 0,
            "origin_item_count": 0,
            "new_item_count": 0,
            "origin_credit_amount": 0.0,
            "new_products_amount": 0.0,
            "forfeited_credit": 0.0,
        }
        cur += timedelta(days=1)

    for r in rows:
        iso = (r.get("updated_at") or r.get("created_at") or "")[:10]
        if not iso:
            continue
        g = by_day.setdefault(iso, {
            "_iso": iso,
            "documents": 0,
            "exchanges": 0,
            "returns": 0,
            "origin_item_count": 0,
            "new_item_count": 0,
            "origin_credit_amount": 0.0,
            "new_products_amount": 0.0,
            "forfeited_credit": 0.0,
        })
        g["documents"] += 1
        if r["document_type_code"] == "EXCHANGE_DRAFT":
            g["exchanges"] += 1
        else:
            g["returns"] += 1
        g["origin_item_count"] += r["origin_item_count"]
        g["new_item_count"] += r["new_item_count"]
        g["origin_credit_amount"] += r["origin_credit_amount"]
        g["new_products_amount"] += r["new_products_amount"]
        g["forfeited_credit"] += r["forfeited_credit"]

    grouped = sorted(by_day.values(), key=lambda x: x["_iso"])
    first = 22
    rest = 28
    chunks = [grouped[:first]]
    remaining = grouped[first:]
    while remaining:
        chunks.append(remaining[:rest])
        remaining = remaining[rest:]
    if not chunks:
        chunks = [[]]

    pages = []
    for page_idx, chunk in enumerate(chunks):
        section_html = (
            '<div class="section-heading">'
            '<div class="section-label">Detalle agrupado</div>'
            '<h2 class="section-title">Resumen por día</h2>'
            '</div>'
        ) if page_idx == 0 else ""

        tbody = "".join(
            '<tr>'
            f'<td>{_fmt(g["_iso"])}</td>'
            f'<td style="text-align:right">{g["documents"]}</td>'
            f'<td style="text-align:right">{g["exchanges"]}</td>'
            f'<td style="text-align:right">{g["returns"]}</td>'
            f'<td style="text-align:right">{g["origin_item_count"]}</td>'
            f'<td style="text-align:right">{g["new_item_count"]}</td>'
            f'<td style="text-align:right;font-weight:600">{_clp(round(g["origin_credit_amount"]))}</td>'
            f'<td style="text-align:right">{_clp(round(g["new_products_amount"]))}</td>'
            f'<td style="text-align:right">{_clp(round(g["forfeited_credit"]))}</td>'
            '</tr>'
            for g in chunk
        ) if chunk else (
            '<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">'
            'Sin documentos para los filtros seleccionados'
            '</td></tr>'
        )

        tfoot = ""
        if page_idx == len(chunks) - 1:
            tfoot = (
                '<tfoot><tr style="background:#0f172a;color:white;font-weight:700">'
                '<td style="padding:6px 8px;font-size:9px">TOTAL PERÍODO</td>'
                f'<td style="text-align:right;padding:6px 8px">{len(rows)}</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(g["exchanges"] for g in grouped)}</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(g["returns"] for g in grouped)}</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(g["origin_item_count"] for g in grouped)}</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(g["new_item_count"] for g in grouped)}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(sum(g["origin_credit_amount"] for g in grouped)))}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(sum(g["new_products_amount"] for g in grouped)))}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(sum(g["forfeited_credit"] for g in grouped)))}</td>'
                '</tr></tfoot>'
            )

        pages.append(
            '<section class="report-page">'
            f'{page_hdr}'
            f'{section_html}'
            '<table class="detail-table">'
            '<colgroup><col style="width:12%"><col style="width:8%"><col style="width:8%"><col style="width:10%">'
            '<col style="width:10%"><col style="width:10%"><col style="width:15%"><col style="width:14%"><col style="width:13%"></colgroup>'
            '<thead><tr><th>Fecha</th><th style="text-align:right">Docs.</th><th style="text-align:right">Cambios</th>'
            '<th style="text-align:right">Devoluciones</th><th style="text-align:right">Art. orig.</th>'
            '<th style="text-align:right">Art. nuevos</th><th style="text-align:right">Crédito</th>'
            '<th style="text-align:right">Prod. nuevos</th><th style="text-align:right">Perdido</th></tr></thead>'
            f'<tbody>{tbody}</tbody>{tfoot}</table>'
            f'{page_ftr}'
            '</section>'
        )

    return "\n".join(pages)


async def _build_rx_context(
    date_from: str, date_to: str,
    warehouse_id_str: str, document_type: str, status: str,
    view_mode: str = "detail",
) -> dict:
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)

    start = date.fromisoformat(date_from)
    end   = date.fromisoformat(date_to)

    doc_type_norm = (document_type or "all").upper()
    if doc_type_norm == "ALL":
        doc_type_norm = "all"
    status_norm = (status or "CLOSED").upper()
    if status_norm == "ALL":
        status_norm = "all"

    filters = [
        "sd.deleted_at IS NULL",
        "sd.document_type_code IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')",
        "DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to",
    ]
    params: dict = {"date_from": start, "date_to": end}
    _append_in_filter(filters, params, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    if doc_type_norm != "all":
        filters.append("sd.document_type_code = :document_type")
        params["document_type"] = doc_type_norm
    if status_norm != "all":
        filters.append("sd.status = :status")
        params["status"] = status_norm

    where_sql = " AND ".join(filters)

    async with db_manager.get_async_session() as session:
        if warehouse_ids:
            label_params: dict = {}
            label_filters: list[str] = []
            _append_in_filter(label_filters, label_params, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(label_filters)} ORDER BY warehouse_name"),
                label_params,
            ))
            branch_label = ", ".join(f"Sucursal {w.get('warehouse_name')}" for w in wh_rows) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"

        result = await session.execute(text(f"""
            SELECT
                sd.id, sd.sale_code, sd.ticket_number,
                sd.document_type_code, sd.document_type_name, sd.status,
                w.warehouse_code, w.warehouse_name,
                sd.customer_snapshot, sd.total_amount,
                sd.exchange_credit_total, sd.exchange_forfeited_credit,
                sd.notes, sd.created_at, sd.updated_at,
                COALESCE(agg.origin_item_count, 0)    AS origin_item_count,
                COALESCE(agg.new_item_count, 0)       AS new_item_count,
                COALESCE(agg.origin_credit_amount, 0) AS origin_credit_amount,
                COALESCE(agg.new_products_amount, 0)  AS new_products_amount
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            LEFT JOIN (
                SELECT sale_document_id,
                    SUM(CASE WHEN paid_total_amount < 0 OR unit_price < 0
                         OR product_name LIKE 'Credito por cambio:%'
                         OR product_name LIKE 'Devolucion:%'
                        THEN ABS(quantity) ELSE 0 END) AS origin_item_count,
                    SUM(CASE WHEN paid_total_amount >= 0 AND unit_price >= 0
                         AND product_name NOT LIKE 'Credito por cambio:%'
                         AND product_name NOT LIKE 'Devolucion:%'
                        THEN ABS(quantity) ELSE 0 END) AS new_item_count,
                    SUM(CASE WHEN paid_total_amount < 0 OR unit_price < 0
                         OR product_name LIKE 'Credito por cambio:%'
                         OR product_name LIKE 'Devolucion:%'
                        THEN ABS(paid_total_amount) ELSE 0 END) AS origin_credit_amount,
                    SUM(CASE WHEN paid_total_amount >= 0 AND unit_price >= 0
                         AND product_name NOT LIKE 'Credito por cambio:%'
                         AND product_name NOT LIKE 'Devolucion:%'
                        THEN paid_total_amount ELSE 0 END) AS new_products_amount
                FROM sale_document_lines
                WHERE deleted_at IS NULL
                GROUP BY sale_document_id
            ) agg ON agg.sale_document_id = sd.id
            WHERE {where_sql}
            ORDER BY COALESCE(sd.updated_at, sd.created_at) ASC, sd.id ASC
            LIMIT 1000
        """), params)
        db_rows = result.mappings().all()

    # Procesar filas
    rows: list[dict] = []
    totals = {
        "documents": 0, "returns": 0, "exchanges": 0,
        "origin_items": 0, "new_items": 0,
        "origin_credit_amount": 0.0, "new_products_amount": 0.0,
        "forfeited_credit": 0.0,
    }

    for row in db_rows:
        doc_type_code = row["document_type_code"]
        oc = _float(_decimal(row["exchange_credit_total"]) if doc_type_code == "EXCHANGE_DRAFT" and row["exchange_credit_total"] is not None else _decimal(row["origin_credit_amount"]))
        forf = _float(_decimal(row["exchange_forfeited_credit"]))
        orig_items = int(row["origin_item_count"] or 0)
        new_items  = int(row["new_item_count"]    or 0)

        totals["documents"] += 1
        totals["returns"]   += 1 if doc_type_code == "RETURN_TICKET"  else 0
        totals["exchanges"] += 1 if doc_type_code == "EXCHANGE_DRAFT" else 0
        totals["origin_items"]          += orig_items
        totals["new_items"]             += new_items
        totals["origin_credit_amount"]  += oc
        totals["new_products_amount"]   += _float(_decimal(row["new_products_amount"]))
        totals["forfeited_credit"]      += forf

        rows.append({
            "folio":               row["ticket_number"] or f"{_document_label(doc_type_code, row['document_type_name'])} sin folio",
            "document_type_code":  doc_type_code,
            "document_label":      _document_label(doc_type_code, row["document_type_name"]),
            "status":              row["status"],
            "warehouse_name":      row["warehouse_name"] or row["warehouse_code"] or "Sin locacion",
            "customer_name":       _customer_name(row["customer_snapshot"]),
            "source_document":     _source_document(row["notes"]),
            "origin_item_count":   orig_items,
            "new_item_count":      new_items,
            "origin_credit_amount": oc,
            "new_products_amount": _float(_decimal(row["new_products_amount"])),
            "forfeited_credit":    forf,
            "total_amount":        _float(_decimal(row["total_amount"])),
            "created_at":          row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at":          row["updated_at"].isoformat() if row["updated_at"] else None,
        })

    today_str    = date.today().strftime("%d/%m/%Y")
    period_label = f"{_fmt(date_from)} — {_fmt(date_to)}"
    duration     = (end - start).days + 1

    doc_type_label = _DOC_TYPE_LABELS.get(doc_type_norm, doc_type_norm)
    status_label   = _STATUS_LABELS.get(status_norm, status_norm)

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{branch_label}</td></tr>'
        f'<tr><td>Tipo de documento</td><td>{doc_type_label}</td></tr>'
        f'<tr><td>Estado</td><td>{status_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{duration} días</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
        f'<tr><td>Generado por</td><td>Sistema de Gestión CeciChic</td></tr>'
    )

    kpi_specs = [
        ("primary", "Total documentos",   str(totals["documents"]),                  f"{totals['exchanges']} cambios · {totals['returns']} devoluciones"),
        ("info",    "Artículos origen",   str(totals["origin_items"]),               "devueltos o cambiados"),
        ("info",    "Artículos nuevos",   str(totals["new_items"]),                  "entregados en cambios"),
        ("primary", "Crédito generado",   _clp(round(totals["origin_credit_amount"])), "valor reconocido"),
        ("warning", "Productos nuevos",   _clp(round(totals["new_products_amount"])),  "valor entregado"),
        ("danger",  "Crédito perdido",    _clp(round(totals["forfeited_credit"])),     "no acumulado / no usado"),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {v}"><div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div><div class="kpi-hint">{hint}</div></div>'
        for v, lbl, val, hint in kpi_specs
    )

    executive_note = (
        f"Durante el período {period_label} se registraron {totals['documents']} documentos "
        f"({totals['exchanges']} cambios y {totals['returns']} devoluciones) "
        f"para {branch_label}. "
        f"El crédito generado total asciende a {_clp(round(totals['origin_credit_amount']))} "
        f"con {_clp(round(totals['forfeited_credit']))} de crédito no utilizado."
    )

    ctx: dict = {
        "COMPANY_NAME":   "CeciChic",
        "LOGO_HTML":      '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS":  "INFORME",
        "REPORT_TITLE":   "Cambios y devoluciones",
        "COVER_TITLE":    "Reporte de<br>Cambios y Devoluciones",
        "COVER_SUBTITLE": (
            "Listado detallado de documentos de cambio y devoluci&oacute;n, "
            "con an&aacute;lisis de cr&eacute;dito generado, art&iacute;culos afectados "
            "y desglose por locaci&oacute;n."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(duration),
        "DOC_TYPE_LABEL": doc_type_label,
        "STATUS_LABEL":   status_label,
        "META_ROWS":      meta_rows,
        "KPI_CARDS":      kpi_cards,
        "EXECUTIVE_NOTE": executive_note,
        "CHART_PAGE":     "",  # se rellena en el endpoint si llega imagen
    }
    ctx["DETAIL_PAGES"] = (
        _build_rx_grouped_pages(rows, ctx, date_from, date_to)
        if view_mode == "grouped"
        else _build_rx_detail_pages(rows, ctx)
    )
    return ctx


@router.post("/sales/returns-exchanges/pdf", response_class=Response)
async def returns_exchanges_pdf(
    date_from:    str                  = Form(...),
    date_to:      str                  = Form(...),
    warehouse_id: str                  = Form("all"),
    document_type: str                 = Form("all"),
    status:       str                  = Form("CLOSED"),
    view_mode:    str                  = Form("detail"),
    chart_bar:    Optional[UploadFile] = File(None),
    user:         dict                 = Depends(get_current_user),
):
    async def _chart_card(file, title) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{title}</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    chart_bar_card = await _chart_card(chart_bar, "Cambios y devoluciones por día")

    try:
        ctx = await _build_rx_context(date_from, date_to, warehouse_id, document_type, status, view_mode)
        if chart_bar_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading">'
                '<div class="section-label">Gráfico</div>'
                '<h2 class="section-title">Evolución del período</h2>'
                '</div>'
                f'{chart_bar_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html = _render("returns_exchanges.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template returns_exchanges: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    filename = f"cambios-devoluciones_{date_from}_{date_to}.pdf"

    try:
        loop      = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html.encode("utf-8"), settings.GOTENBERG_URL
        )
    except Exception as exc:
        logger.error("Gotenberg error returns_exchanges: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Table pagination ─────────────────────────────────────────────────────

_ROWS_FIRST = 22   # first table page (has section heading)
_ROWS_REST  = 26   # continuation pages


def _table_colgroup(methods: list[dict]) -> str:
    """Dynamic colgroup: fixed columns + one col per payment method."""
    n  = max(len(methods), 1)
    pw = round(49 / n, 1)
    method_cols = "".join(f'<col style="width:{pw}%">' for _ in range(n))
    return (
        '<colgroup>'
        '<col style="width:14%"><col style="width:6%"><col style="width:13%">'
        f'<col style="width:10%">{method_cols}'
        '<col style="width:8%">'
        '</colgroup>'
    )


def _table_thead(methods: list[dict]) -> str:
    if methods:
        method_ths = "".join(f"<th>{m['name']}</th>" for m in methods)
    else:
        method_ths = "<th>Monto</th>"
    return (
        '<thead><tr>'
        '<th>Fecha</th><th>Txn</th><th>Total</th><th>Ticket prom.</th>'
        f'{method_ths}<th>Anuladas</th>'
        '</tr></thead>'
    )


def _table_row(r: dict, methods: list[dict], best_row: dict | None) -> str:
    is_best = best_row and r["iso"] == best_row["iso"]
    marker  = "&#9733; " if is_best else ""
    dim     = '<span class="dim">&#8212;</span>'
    can_cell = f'<span class="negative">{r["cancelled"]}</span>' if r["cancelled"] > 0 else dim
    total_v  = round(r["total"])
    avg_v    = r.get("avg_ticket", round(r["total"] / r["txn"]) if r["txn"] > 0 else 0)

    if methods:
        method_tds = "".join(
            f'<td class="num muted">'
            + (lambda a: _clp(round(a)) if a > 0 else dim)(
                next((x["amount"] for x in r.get("by_method", []) if x["code"] == m["code"]), 0)
            )
            + '</td>'
            for m in methods
        )
    else:
        method_tds = f'<td class="num muted">{_clp(total_v) if total_v > 0 else dim}</td>'

    row_class = ' class="best-row"' if is_best else ""
    return (
        f'<tr{row_class}>'
        f'<td class="date-cell">{marker}{_fmt(r["iso"])}<small>{r.get("weekday","")}</small></td>'
        f'<td class="num">{r["txn"] or dim}</td>'
        f'<td class="num amount-cell">{_clp(total_v) if total_v > 0 else dim}</td>'
        f'<td class="num muted">{_clp(avg_v) if avg_v > 0 else dim}</td>'
        f'{method_tds}'
        f'<td class="num">{can_cell}</td>'
        f'</tr>'
    )


def _build_detail_pages(rows: list[dict], methods: list[dict], best_row: dict | None, ctx: dict) -> str:
    """Generate one <section class="report-page"> per page of table data."""

    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")

    chunks: list[list[dict]] = []
    if len(rows) <= _ROWS_FIRST:
        chunks = [rows]
    else:
        chunks.append(rows[:_ROWS_FIRST])
        rest = rows[_ROWS_FIRST:]
        while rest:
            chunks.append(rest[:_ROWS_REST])
            rest = rest[_ROWS_REST:]

    total_txn = sum(r["txn"]       for r in rows)
    total_amt = sum(r["total"]     for r in rows)
    total_can = sum(r["cancelled"] for r in rows)
    avg       = round(total_amt / max(total_txn, 1))

    method_totals = {
        m["code"]: sum(
            next((x["amount"] for x in r.get("by_method", []) if x["code"] == m["code"]), 0)
            for r in rows
        )
        for m in methods
    }

    colgroup = _table_colgroup(methods)
    thead    = _table_thead(methods)

    html = ""
    for pi, chunk in enumerate(chunks):
        is_first = pi == 0
        is_last  = pi == len(chunks) - 1

        heading = (
            '<div class="section-heading">'
            '<div class="section-label">Detalle transaccional</div>'
            '<h2 class="section-title">Resultados diarios</h2>'
            '<p class="section-description">'
            'Distribuci&oacute;n de ventas y transacciones por fecha, incluyendo '
            'ticket promedio, medios de pago y operaciones anuladas.'
            '</p></div>'
        ) if is_first else ""

        tbody = "".join(_table_row(r, methods, best_row) for r in chunk)

        tfoot = ""
        if is_last:
            if methods:
                method_footer = "".join(
                    f'<td class="num">{_clp(round(method_totals[m["code"]]))}</td>'
                    for m in methods
                )
            else:
                method_footer = f'<td class="num">{_clp(round(total_amt))}</td>'
            tfoot = (
                f'<tfoot><tr><td>TOTAL PER&Iacute;ODO</td>'
                f'<td class="num">{total_txn}</td><td class="num">{_clp(round(total_amt))}</td>'
                f'<td class="num">{_clp(avg)}</td>{method_footer}'
                f'<td class="num">{total_can}</td></tr></tfoot>'
            )

        note = (
            '<div class="table-note"><strong>Nota:</strong> el ticket promedio '
            'corresponde al total vendido dividido por la cantidad de transacciones '
            'v&aacute;lidas del d&iacute;a. Las operaciones anuladas se contabilizan '
            'separadamente y no forman parte del total neto.</div>'
        ) if is_last else ""

        html += (
            '\n  <section class="report-page">'
            f'\n    {page_hdr}{heading}'
            '\n    <div class="table-wrapper">'
            f'\n      <table class="report-table">{colgroup}{thead}'
            f'<tbody>{tbody}</tbody>{tfoot}</table>'
            f'\n    </div>{note}'
            f'\n    {page_ftr}'
            '\n  </section>'
        )

    return html


def _sales_detail_row(r: dict) -> str:
    dim = '<span class="dim">&#8212;</span>'
    status = {"CLOSED": "Cerrado", "CANCELLED": "Anulado"}.get(r.get("status"), r.get("status") or "-")
    when = (r.get("updated_at") or r.get("created_at") or "")[:16].replace("T", " ")
    total = _money(r.get("total_amount"))
    return (
        "<tr>"
        f'<td style="font-size:8px">{when or dim}</td>'
        f'<td><strong>{r.get("folio") or dim}</strong><br><span class="dim">{status}</span></td>'
        f'<td style="font-size:8px">{r.get("customer_name") or dim}</td>'
        f'<td style="font-size:8px">{r.get("warehouse_name") or dim}</td>'
        f'<td style="font-size:8px">{r.get("payment_method_name") or dim}</td>'
        f'<td class="num amount-cell">{_clp(round(total)) if total > 0 else dim}</td>'
        "</tr>"
    )


def _build_sales_document_pages(rows: list[dict], ctx: dict) -> str:
    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")
    first = 20
    rest = 26
    chunks = [rows[:first]]
    remaining = rows[first:]
    while remaining:
        chunks.append(remaining[:rest])
        remaining = remaining[rest:]
    if not chunks:
        chunks = [[]]

    html = ""
    total = sum(_money(r.get("total_amount")) for r in rows)
    for pi, chunk in enumerate(chunks):
        heading = (
            '<div class="section-heading">'
            '<div class="section-label">Detalle transaccional</div>'
            '<h2 class="section-title">Documentos de venta</h2>'
            '<p class="section-description">'
            'Listado individual de registros incluidos en los filtros seleccionados.'
            '</p></div>'
        ) if pi == 0 else ""
        tbody = "".join(_sales_detail_row(r) for r in chunk) if chunk else (
            '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">'
            'Sin documentos para los filtros seleccionados'
            '</td></tr>'
        )
        tfoot = ""
        if pi == len(chunks) - 1:
            tfoot = (
                '<tfoot><tr>'
                '<td colspan="5">TOTAL PER&Iacute;ODO</td>'
                f'<td class="num">{_clp(round(total))}</td>'
                '</tr></tfoot>'
            )
        html += (
            '<section class="report-page">'
            f'{page_hdr}{heading}'
            '<table class="detail-table">'
            '<colgroup><col style="width:12%"><col style="width:16%"><col style="width:24%">'
            '<col style="width:16%"><col style="width:18%"><col style="width:14%"></colgroup>'
            '<thead><tr><th>Fecha</th><th>Documento</th><th>Cliente</th><th>Sucursal</th>'
            '<th>Medio de pago</th><th style="text-align:right">Total</th></tr></thead>'
            f'<tbody>{tbody}</tbody>{tfoot}</table>{page_ftr}</section>'
        )
    return html


# ─── SVG comparison chart ──────────────────────────────────────────────────

def _build_comparison_svg(curr_rows: list[dict], prev_rows: list[dict]) -> str:
    """Generate a side-by-side bar chart comparing weekly totals."""

    def _week_totals(rows: list[dict]) -> list[dict]:
        weeks: dict[int, int] = {}
        for i, r in enumerate(rows):
            wk = i // 7
            weeks[wk] = weeks.get(wk, 0) + r["total"]
        return [{"week": k + 1, "total": v} for k, v in sorted(weeks.items())]

    curr_weeks = _week_totals(curr_rows)
    prev_weeks = _week_totals(prev_rows)
    n_weeks    = max(len(curr_weeks), len(prev_weeks))

    # Align by week index
    curr_by_wk = {w["week"]: w["total"] for w in curr_weeks}
    prev_by_wk = {w["week"]: w["total"] for w in prev_weeks}
    all_weeks  = sorted(set(list(curr_by_wk.keys()) + list(prev_by_wk.keys())))

    max_val = max(
        [v for v in list(curr_by_wk.values()) + list(prev_by_wk.values())],
        default=1
    )

    # SVG dimensions (in px — Chromium renders at 96dpi)
    WIDTH  = 680
    HEIGHT = 220
    PAD_L  = 80   # left (y-axis labels)
    PAD_R  = 20
    PAD_T  = 20
    PAD_B  = 45   # bottom (x labels + legend)
    CHART_W = WIDTH  - PAD_L - PAD_R
    CHART_H = HEIGHT - PAD_T - PAD_B

    n      = len(all_weeks)
    grp_w  = CHART_W / max(n, 1)
    bar_w  = min(grp_w * 0.32, 30)
    gap    = grp_w * 0.05

    def bar_h(v: int) -> float:
        return max(CHART_H * v / max_val, 2)

    def x_grp(i: int) -> float:
        return PAD_L + i * grp_w + grp_w * 0.1

    # Y-axis gridlines (4 lines)
    gridlines = ""
    y_labels  = ""
    for step in range(0, 5):
        y = PAD_T + CHART_H * (1 - step / 4)
        val = round(max_val * step / 4)
        gridlines += f'<line x1="{PAD_L}" y1="{y:.1f}" x2="{WIDTH - PAD_R}" y2="{y:.1f}" stroke="#f1f5f9" stroke-width="1"/>'
        y_labels  += f'<text x="{PAD_L - 6}" y="{y + 3:.1f}" text-anchor="end" font-size="8" fill="#94a3b8">{_clp_k(val)}</text>'

    # Bars + x labels
    bars = ""
    xlabels = ""
    for i, wk in enumerate(all_weeks):
        xg   = x_grp(i)
        cv   = curr_by_wk.get(wk, 0)
        pv   = prev_by_wk.get(wk, 0)

        # Previous bar (lighter blue)
        if pv:
            bh   = bar_h(pv)
            bx   = xg
            by   = PAD_T + CHART_H - bh
            bars += (
                f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w:.1f}" height="{bh:.1f}" '
                f'rx="2" fill="#bfdbfe"/>'
                f'<text x="{bx + bar_w/2:.1f}" y="{by - 3:.1f}" text-anchor="middle" '
                f'font-size="7" fill="#94a3b8">{_clp_k(pv)}</text>'
            )

        # Current bar (emerald)
        if cv:
            bh   = bar_h(cv)
            bx   = xg + bar_w + gap
            by   = PAD_T + CHART_H - bh
            clr  = "#10b981" if cv >= pv else "#3b82f6"
            bars += (
                f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bar_w:.1f}" height="{bh:.1f}" '
                f'rx="2" fill="{clr}"/>'
                f'<text x="{bx + bar_w/2:.1f}" y="{by - 3:.1f}" text-anchor="middle" '
                f'font-size="7" fill="#475569">{_clp_k(cv)}</text>'
            )

            # % change badge
            if pv:
                pct  = (cv - pv) / pv * 100
                sign = "+" if pct >= 0 else ""
                col  = "#10b981" if pct >= 0 else "#ef4444"
                mid_x = xg + bar_w + gap / 2 + bar_w / 2
                bars += (
                    f'<text x="{mid_x:.1f}" y="{PAD_T + CHART_H + 22:.1f}" '
                    f'text-anchor="middle" font-size="7.5" fill="{col}" font-weight="bold">'
                    f'{sign}{pct:.1f}%</text>'
                )

        xlabels += (
            f'<text x="{xg + bar_w + gap/2:.1f}" y="{PAD_T + CHART_H + 12:.1f}" '
            f'text-anchor="middle" font-size="8" fill="#475569">Sem. {wk}</text>'
        )

    # Legend
    leg_y = HEIGHT - 8
    legend = (
        f'<rect x="{PAD_L}" y="{leg_y - 7}" width="10" height="7" rx="1" fill="#bfdbfe"/>'
        f'<text x="{PAD_L + 14}" y="{leg_y}" font-size="8" fill="#64748b">Período anterior</text>'
        f'<rect x="{PAD_L + 110}" y="{leg_y - 7}" width="10" height="7" rx="1" fill="#10b981"/>'
        f'<text x="{PAD_L + 124}" y="{leg_y}" font-size="8" fill="#64748b">Período actual</text>'
    )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}">'
        f'{gridlines}{y_labels}{bars}{xlabels}{legend}'
        f'<line x1="{PAD_L}" y1="{PAD_T}" x2="{PAD_L}" y2="{PAD_T + CHART_H}" '
        f'stroke="#e2e8f0" stroke-width="1"/>'
        f'<line x1="{PAD_L}" y1="{PAD_T + CHART_H}" x2="{WIDTH - PAD_R}" y2="{PAD_T + CHART_H}" '
        f'stroke="#e2e8f0" stroke-width="1"/>'
        f'</svg>'
    )


# ─── KPI summary table with comparison ────────────────────────────────────

def _build_comparison_summary(curr_rows: list[dict], prev_rows: list[dict]) -> str:
    """Build the summary table rows comparing current vs previous."""
    c_total  = sum(r["total"] for r in curr_rows)
    p_total  = sum(r["total"] for r in prev_rows)
    c_txn    = sum(r["txn"]   for r in curr_rows)
    p_txn    = sum(r["txn"]   for r in prev_rows)
    c_cancel = sum(r["cancelled"] for r in curr_rows)
    p_cancel = sum(r["cancelled"] for r in prev_rows)

    def row(label, cv, pv, fmt_fn=_clp, is_cancel=False):
        pct  = _pct_diff(cv, pv)
        col  = _pct_color(cv, pv) if not is_cancel else _pct_color(pv, cv)
        return (
            f'<tr>'
            f'<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px;color:#64748b;font-weight:500">{label}</td>'
            f'<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px;text-align:right;font-weight:600">{fmt_fn(cv)}</td>'
            f'<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px;text-align:right;color:#94a3b8">{fmt_fn(pv)}</td>'
            f'<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-size:10px;text-align:right;font-weight:700;color:{col}">{pct}</td>'
            f'</tr>'
        )

    header = (
        '<table style="width:100%;border-collapse:collapse;margin-bottom:0.2in">'
        '<thead><tr style="background:#0f172a;color:white">'
        '<th style="padding:6px 8px;text-align:left;font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Métrica</th>'
        '<th style="padding:6px 8px;text-align:right;font-size:8px;font-weight:600;text-transform:uppercase">Actual</th>'
        '<th style="padding:6px 8px;text-align:right;font-size:8px;font-weight:600;text-transform:uppercase">Anterior</th>'
        '<th style="padding:6px 8px;text-align:right;font-size:8px;font-weight:600;text-transform:uppercase">Variación</th>'
        '</tr></thead><tbody>'
    )

    body = (
        row("Total ventas", c_total, p_total)
        + row("Transacciones", c_txn, p_txn, fmt_fn=str)
        + row("Ticket promedio",
              round(c_total / max(c_txn, 1)), round(p_total / max(p_txn, 1)))
        + row("Anulaciones", c_cancel, p_cancel, fmt_fn=str, is_cancel=True)
    )

    return header + body + "</tbody></table>"


# ─── Full context builder (real DB data) ──────────────────────────────────

async def _build_context(date_from: str, date_to: str, branch: str, view_mode: str = "grouped") -> dict:
    """Build PDF context from real DB data."""
    warehouse_ids = [] if branch in ("all", "", "todas", None) else _parse_id_list(branch)

    start    = date.fromisoformat(date_from)
    end      = date.fromisoformat(date_to)
    duration = (end - start).days + 1
    prev_end   = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=duration - 1)

    params_c = {"date_from": start,      "date_to": end}
    params_p = {"date_from": prev_start, "date_to": prev_end}
    filters_c: list[str] = []
    filters_p: list[str] = []
    _append_in_filter(filters_c, params_c, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    _append_in_filter(filters_p, params_p, "sd.warehouse_id", warehouse_ids, "prev_warehouse_id")
    warehouse_clause_c = f"AND {' AND '.join(filters_c)}" if filters_c else ""
    warehouse_clause_p = f"AND {' AND '.join(filters_p)}" if filters_p else ""

    async with db_manager.get_async_session() as session:
        if warehouse_ids:
            label_params: dict = {}
            label_filters: list[str] = []
            _append_in_filter(label_filters, label_params, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(label_filters)} ORDER BY warehouse_name"),
                label_params,
            ))
            branch_label = ", ".join(f"Sucursal {w.get('warehouse_name')}" for w in wh_rows) or "Sucursales seleccionadas"
        else:
            branch_label = "Todas las sucursales"

        daily_totals = _rows(await session.execute(text(f"""
            SELECT DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
                   COALESCE(SUM(sd.total_amount), 0) AS total, COUNT(*) AS txn
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_c}
            GROUP BY sale_date ORDER BY sale_date
        """), params_c))

        daily_cancelled = _rows(await session.execute(text(f"""
            SELECT DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date, COUNT(*) AS cancelled
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CANCELLED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_c}
            GROUP BY sale_date
        """), params_c))

        payment_rows = _rows(await session.execute(text(f"""
            SELECT DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
                   sd.id, sd.payment_method_name, sd.payment_method_code,
                   sd.amount_tendered, sd.change_amount, sd.payment_details, sd.total_amount
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_c}
        """), params_c))

        prev_agg = _row(await session.execute(text(f"""
            SELECT COALESCE(SUM(sd.total_amount), 0) AS total, COUNT(*) AS txn
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_p}
        """), params_p))

        prev_cancel_row = _row(await session.execute(text(f"""
            SELECT COUNT(*) AS cancelled FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CANCELLED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_p}
        """), params_p))

        prev_daily = _rows(await session.execute(text(f"""
            SELECT DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
                   COALESCE(SUM(sd.total_amount), 0) AS total, COUNT(*) AS txn
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_p}
            GROUP BY sale_date ORDER BY sale_date
        """), params_p))

        detail_db_rows = _rows(await session.execute(text(f"""
            SELECT
              sd.id,
              sd.sale_code,
              COALESCE(sd.ticket_number, sd.sale_code) AS folio,
              sd.document_type_code,
              sd.document_type_name,
              sd.status,
              sd.customer_snapshot,
              sd.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              sd.payment_method_name,
              sd.payment_method_code,
              sd.payment_details,
              sd.amount_tendered,
              sd.change_amount,
              sd.total_amount,
              sd.created_at,
              sd.updated_at
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status IN ('CLOSED', 'CANCELLED')
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause_c}
            ORDER BY COALESCE(sd.updated_at, sd.created_at) ASC, sd.id ASC
            LIMIT 2000
        """), params_c))

    # ── Build date index ───────────────────────────────────────────────
    date_idx: dict[str, dict] = {}
    cur = start
    while cur <= end:
        date_idx[cur.isoformat()] = {"total": 0.0, "txn": 0, "cancelled": 0, "by_method": {}}
        cur += timedelta(days=1)

    for r in daily_totals:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso in date_idx:
            date_idx[iso]["total"] = _money(r["total"])
            date_idx[iso]["txn"]   = int(r["txn"])

    for r in daily_cancelled:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso in date_idx:
            date_idx[iso]["cancelled"] = int(r["cancelled"])

    for r in payment_rows:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso not in date_idx:
            continue
        bm = date_idx[iso]["by_method"]

        def _add(code, name, amount, _bm=bm):
            if amount <= 0:
                return
            code  = (code or "OTHER").upper()
            entry = _bm.setdefault(code, {"code": code, "name": name or code, "amount": 0.0})
            entry["name"]   = name or entry["name"]
            entry["amount"] += amount

        details = _payment_details(r.get("payment_details"))
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            for p in (details.get("payments") or []):
                if isinstance(p, dict):
                    _add(p.get("payment_method_code"), p.get("payment_method_name"), _payment_amount(p))
        else:
            received = _money(r.get("amount_tendered") or r.get("total_amount")) - _money(r.get("change_amount"))
            _add(r.get("payment_method_code"), r.get("payment_method_name"), received)

    detail_rows = []
    for r in detail_db_rows:
        details = _payment_details(r.get("payment_details"))
        payment_name = r.get("payment_method_name") or r.get("payment_method_code") or "Sin metodo"
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            payments = [
                p for p in (details.get("payments") or [])
                if isinstance(p, dict) and _payment_amount(p) > 0
            ]
            if payments:
                payment_name = "Mixto: " + " + ".join(
                    p.get("payment_method_name") or p.get("payment_method_code") or "Medio"
                    for p in payments
                )
        detail_rows.append({
            "id": r["id"],
            "sale_code": r["sale_code"],
            "folio": r["folio"],
            "status": r["status"],
            "customer_name": _customer_name(r["customer_snapshot"]),
            "warehouse_name": r["warehouse_name"],
            "payment_method_name": payment_name,
            "total_amount": _money(r["total_amount"]),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        })

    # ── Build curr_rows ────────────────────────────────────────────────
    curr_rows = []
    for iso, day in sorted(date_idx.items()):
        d        = date.fromisoformat(iso)
        by_meth  = sorted(day["by_method"].values(), key=lambda x: -x["amount"])
        curr_rows.append({
            "iso":        iso,
            "weekday":    _WEEKDAYS[d.weekday()],
            "total":      day["total"],
            "txn":        day["txn"],
            "cancelled":  day["cancelled"],
            "avg_ticket": round(day["total"] / day["txn"]) if day["txn"] > 0 else 0,
            "by_method":  by_meth,
        })

    # Payment methods ordered by total descending
    method_map: dict[str, dict] = {}
    for r in curr_rows:
        for m in r["by_method"]:
            e = method_map.setdefault(m["code"], {"code": m["code"], "name": m["name"], "_t": 0.0})
            e["_t"] += m["amount"]
    all_methods = sorted(method_map.values(), key=lambda x: -x["_t"])

    # ── Previous period (for comparison) ──────────────────────────────
    prev_date_idx: dict[str, dict] = {}
    cur = prev_start
    while cur <= prev_end:
        prev_date_idx[cur.isoformat()] = {"total": 0.0, "txn": 0, "cancelled": 0}
        cur += timedelta(days=1)
    for r in prev_daily:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso in prev_date_idx:
            prev_date_idx[iso]["total"] = _money(r["total"])
            prev_date_idx[iso]["txn"]   = int(r["txn"])
    prev_rows = [
        {"iso": iso, "total": d["total"], "txn": d["txn"], "cancelled": 0}
        for iso, d in sorted(prev_date_idx.items())
    ]
    # Inject real cancelled total for summary table
    p_cancel_total = int(prev_cancel_row.get("cancelled", 0) or 0)
    if prev_rows:
        prev_rows[0]["cancelled"] = p_cancel_total  # summary uses sum, only needs total once

    # ── Aggregates ────────────────────────────────────────────────────
    total      = sum(r["total"]     for r in curr_rows)
    txn        = sum(r["txn"]       for r in curr_rows)
    cancelled  = sum(r["cancelled"] for r in curr_rows)
    avg_ticket = round(total / txn) if txn > 0 else 0

    non_empty = [r for r in curr_rows if r["total"] > 0]
    best_row  = max(non_empty, key=lambda r: r["total"], default=None)
    worst_row = min(non_empty, key=lambda r: r["total"], default=None)

    p_total = _money(prev_agg.get("total", 0))
    p_txn   = int(prev_agg.get("txn", 0) or 0)

    # ── Context dict ──────────────────────────────────────────────────
    today_str    = date.today().strftime("%d/%m/%Y")
    period_label = f"{_fmt(date_from)} — {_fmt(date_to)}"
    prev_label   = f"{_fmt(prev_start.isoformat())} — {_fmt(prev_end.isoformat())}"

    meta_rows = (
        f'<tr><td>Período actual</td><td>{period_label}</td></tr>'
        f'<tr><td>Período anterior</td><td>{prev_label}</td></tr>'
        f'<tr><td>Sucursal</td><td>{branch_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{len(curr_rows)} días</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
        f'<tr><td>Generado por</td><td>Sistema de Gestión CeciChic</td></tr>'
    )

    pct_total = _pct_diff(round(total), round(p_total))
    pct_txn   = _pct_diff(txn, p_txn)
    cls_total = "positive" if total >= p_total else "negative"
    cls_txn   = "positive" if txn   >= p_txn   else "negative"

    kpi_specs = [
        ("primary", "Total período",   _clp(round(total)),           f"en {len(curr_rows)} días", pct_total, cls_total),
        ("info",    "Transacciones",   str(txn),                      "documentos emitidos",        pct_txn,   cls_txn),
        ("info",    "Ticket promedio", _clp(avg_ticket),              "por transacción",             None, None),
        ("primary", "Mejor día",       _clp(round(best_row["total"]))  if best_row  else "&#8212;", _fmt(best_row["iso"])  if best_row  else "", None, None),
        ("warning", "Peor día",        _clp(round(worst_row["total"])) if worst_row else "&#8212;", _fmt(worst_row["iso"]) if worst_row else "", None, None),
        ("danger",  "Anulaciones",     str(cancelled),                f"{cancelled / max(txn, 1) * 100:.1f}% del total", None, None),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {v}"><div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div><div class="kpi-hint">{hint}</div>'
        + (f'<span class="kpi-delta {dc}">{d}</span>' if d else "")
        + "</div>"
        for v, lbl, val, hint, d, dc in kpi_specs
    )

    best_detail = (
        f"{_fmt(best_row['iso'])} &#8212; {_clp(round(best_row['total']))} ({best_row['txn']} transacciones)"
        if best_row else "&#8212;"
    )

    comparison_chart = (
        _build_comparison_summary(curr_rows, prev_rows)
        + _build_comparison_svg(curr_rows, prev_rows)
    )

    ctx: dict = {
        "COMPANY_NAME":   "CeciChic",
        "LOGO_HTML":      '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS":  "INFORME",
        "REPORT_TITLE":   "Reporte de Ventas Diarias",
        "COVER_TITLE":    "Reporte de<br>Ventas Diarias",
        "COVER_SUBTITLE": (
            "Resumen ejecutivo y an&aacute;lisis consolidado de las ventas, "
            "transacciones y medios de pago registrados durante el per&iacute;odo."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(len(curr_rows)),
        "PREV_PERIOD":    prev_label,
        "META_ROWS":      meta_rows,
        "KPI_CARDS":      kpi_cards,
        "COMPARISON_CHART": comparison_chart,
        "BEST_DETAIL":    best_detail,
        "EXECUTIVE_NOTE": (
            f"Durante el per&iacute;odo analizado se registraron {txn} transacciones "
            f"por un total de {_clp(round(total))}, con un ticket promedio de {_clp(avg_ticket)}. "
            f"Comparado con el per&iacute;odo anterior ({prev_label}), las ventas "
            + ("aumentaron" if total >= p_total else "disminuyeron")
            + f" un {abs((total - p_total) / max(p_total, 1) * 100):.1f}%."
        ),
    }
    ctx["DETAIL_PAGES"] = (
        _build_sales_document_pages(detail_rows, ctx)
        if view_mode == "detail"
        else _build_detail_pages(curr_rows, all_methods, best_row, ctx)
    )
    return ctx


# Legacy mock context builder (kept for reference, no longer used)
def _build_context_mock(date_from: str, date_to: str, branch: str) -> dict:
    curr_rows = _generate_rows(date_from, date_to, branch)

    # Previous period (same duration)
    start       = date.fromisoformat(date_from)
    end         = date.fromisoformat(date_to)
    duration    = (end - start).days + 1
    prev_end    = start - timedelta(days=1)
    prev_start  = prev_end - timedelta(days=duration - 1)
    prev_rows   = _generate_rows(prev_start.isoformat(), prev_end.isoformat(), branch)

    today_str     = date.today().strftime("%d/%m/%Y")
    branch_label  = "Todas las sucursales" if branch in ("all", "", "todas") else f"Sucursal {branch}"
    period_label  = f"{_fmt(date_from)} — {_fmt(date_to)}"
    prev_label    = f"{_fmt(prev_start.isoformat())} — {_fmt(prev_end.isoformat())}"

    total         = sum(r["total"]         for r in curr_rows)
    txn           = sum(r["txn"]           for r in curr_rows)
    cancelled     = sum(r["cancelled"]     for r in curr_rows)
    efectivo      = sum(r["efectivo"]      for r in curr_rows)
    debito        = sum(r["debito"]        for r in curr_rows)
    credito       = sum(r["credito"]       for r in curr_rows)
    transferencia = sum(r["transferencia"] for r in curr_rows)
    avg_ticket    = round(total / txn) if txn > 0 else 0

    best_row  = max(curr_rows, key=lambda r: r["total"], default=None)
    worst_row = min(curr_rows, key=lambda r: r["total"], default=None)

    # ── Sections ──────────────────────────────────────────

    meta_rows = (
        f'<tr><td>Período actual</td><td>{period_label}</td></tr>'
        f'<tr><td>Período anterior</td><td>{prev_label}</td></tr>'
        f'<tr><td>Sucursal</td><td>{branch_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{len(curr_rows)} días</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
        f'<tr><td>Generado por</td><td>Sistema de Gestión CeciChic</td></tr>'
    )

    p_total = sum(r["total"] for r in prev_rows)
    p_txn   = sum(r["txn"]   for r in prev_rows)

    p_cancel = sum(r["cancelled"] for r in prev_rows)
    pct_total  = _pct_diff(total, p_total)
    pct_txn    = _pct_diff(txn, p_txn)
    cls_total  = "positive" if total >= p_total else "negative"
    cls_txn    = "positive" if txn   >= p_txn   else "negative"

    kpi_specs = [
        ("primary", "Total período",   _clp(total),       f"en {len(curr_rows)} días",          pct_total, cls_total),
        ("info",    "Transacciones",   str(txn),           "documentos emitidos",                 pct_txn,  cls_txn),
        ("info",    "Ticket promedio", _clp(avg_ticket),   "por transacción",                     None, None),
        ("primary", "Mejor día",       _clp(best_row["total"])  if best_row  else "&#8212;",      _fmt(best_row["iso"])  if best_row  else "", None, None),
        ("warning", "Peor día",        _clp(worst_row["total"]) if worst_row else "&#8212;",      _fmt(worst_row["iso"]) if worst_row else "", None, None),
        ("danger",  "Anulaciones",     str(cancelled),     f"{cancelled / max(txn, 1) * 100:.1f}% del total", None, None),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {variant}">'
        f'<div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div>'
        f'<div class="kpi-hint">{hint}</div>'
        + (f'<span class="kpi-delta {delta_cls}">{delta}</span>' if delta else "")
        + f'</div>'
        for variant, lbl, val, hint, delta, delta_cls in kpi_specs
    )

    best_detail = (
        f"{_fmt(best_row['iso'])} &#8212; {_clp(best_row['total'])} ({best_row['txn']} transacciones)"
        if best_row else "&#8212;"
    )

    comparison_chart = (
        _build_comparison_summary(curr_rows, prev_rows)
        + _build_comparison_svg(curr_rows, prev_rows)
    )

    # Build base context first (DETAIL_PAGES needs it to render partials)
    ctx: dict = {
        # ── Identidad ──────────────────────────────────
        "COMPANY_NAME":  "CeciChic",
        "LOGO_HTML":     '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS": "INFORME MOCKUP",
        "REPORT_TITLE":  "Reporte de Ventas Diarias",
        "COVER_TITLE":   "Reporte de<br>Ventas Diarias",
        "COVER_SUBTITLE": (
            "Resumen ejecutivo y an&aacute;lisis consolidado de las ventas, "
            "transacciones y medios de pago registrados durante el per&iacute;odo."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        # ── Período ────────────────────────────────────
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(len(curr_rows)),
        "PREV_PERIOD":    prev_label,
        # ── Contenido ──────────────────────────────────
        "META_ROWS":        meta_rows,
        "KPI_CARDS":        kpi_cards,
        "COMPARISON_CHART": comparison_chart,
        "BEST_DETAIL":      best_detail,
        "EXECUTIVE_NOTE": (
            f"Durante el per&iacute;odo analizado se registraron {txn} transacciones por un total de "
            f"{_clp(total)}, con un ticket promedio de {_clp(avg_ticket)}. "
            f"Comparado con el per&iacute;odo anterior ({prev_label}), las ventas "
            + ("aumentaron" if total >= p_total else "disminuyeron")
            + f" un {abs((total - p_total) / max(p_total, 1) * 100):.1f}%."
        ),
    }
    # Paginated detail section — needs base ctx to render partials with variables
    ctx["DETAIL_PAGES"] = _build_detail_pages(curr_rows, best_row, ctx)
    return ctx


# ─── Gotenberg call ────────────────────────────────────────────────────────

def _call_gotenberg_sync(html_bytes: bytes, gotenberg_url: str) -> bytes:
    boundary = uuid.uuid4().hex.encode()
    nl       = b"\r\n"
    body = (
        b"--" + boundary + nl
        + b'Content-Disposition: form-data; name="files"; filename="index.html"' + nl
        + b"Content-Type: text/html; charset=utf-8" + nl
        + nl
        + html_bytes + nl
        + b"--" + boundary + b"--" + nl
    )
    req = urllib.request.Request(
        f"{gotenberg_url}/forms/chromium/convert/html",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary.decode()}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/daily-sales/data", response_class=JSONResponse)
async def daily_sales_data(
    date_from:    date       = Query(...),
    date_to:      date       = Query(...),
    warehouse_id: int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    request:      Request    = None,
    user:         dict       = Depends(get_current_user),
):
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    params = {"date_from": date_from, "date_to": date_to}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    async with db_manager.get_async_session() as session:
        warehouses = _rows(await session.execute(text("""
            SELECT id AS warehouse_id, warehouse_name
            FROM warehouses
            WHERE deleted_at IS NULL
              AND is_active = TRUE
              AND warehouse_type IN ('STORE', 'OUTLET')
            ORDER BY warehouse_name
        """)))

        daily_by_wh = _rows(await session.execute(text(f"""
            SELECT
              DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
              sd.warehouse_id,
              COALESCE(w.warehouse_name, 'Sin sucursal')   AS warehouse_name,
              COALESCE(SUM(sd.total_amount), 0)            AS total,
              COUNT(*)                                      AS txn
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sale_date, sd.warehouse_id, w.warehouse_name
            ORDER BY sale_date, warehouse_name
        """), params))

        daily_cancelled = _rows(await session.execute(text(f"""
            SELECT
              DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
              COUNT(*) AS cancelled
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CANCELLED'
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sale_date
        """), params))

        payment_rows = _rows(await session.execute(text(f"""
            SELECT
              DATE(COALESCE(sd.updated_at, sd.created_at)) AS sale_date,
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
              {warehouse_clause}
        """), params))

        detail_db_rows = _rows(await session.execute(text(f"""
            SELECT
              sd.id,
              sd.sale_code,
              COALESCE(sd.ticket_number, sd.sale_code) AS folio,
              sd.document_type_code,
              sd.document_type_name,
              sd.status,
              sd.customer_snapshot,
              sd.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              sd.payment_method_name,
              sd.payment_method_code,
              sd.payment_details,
              sd.amount_tendered,
              sd.change_amount,
              sd.total_amount,
              sd.created_at,
              sd.updated_at
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status IN ('CLOSED', 'CANCELLED')
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            ORDER BY COALESCE(sd.updated_at, sd.created_at) ASC, sd.id ASC
            LIMIT 2000
        """), params))

    # Build date index — every day in range, even if no sales
    date_idx: dict[str, dict] = {}
    cur = date_from
    while cur <= date_to:
        date_idx[cur.isoformat()] = {"by_wh": {}, "cancelled": 0, "by_method": {}}
        cur += timedelta(days=1)

    for r in daily_by_wh:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso in date_idx:
            date_idx[iso]["by_wh"][r["warehouse_id"]] = {
                "warehouse_id":   r["warehouse_id"],
                "warehouse_name": r["warehouse_name"],
                "total":          _money(r["total"]),
                "txn":            int(r["txn"]),
            }

    for r in daily_cancelled:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso in date_idx:
            date_idx[iso]["cancelled"] = int(r["cancelled"])

    for r in payment_rows:
        iso = r["sale_date"] if isinstance(r["sale_date"], str) else r["sale_date"].isoformat()
        if iso not in date_idx:
            continue
        by_method = date_idx[iso]["by_method"]

        def _add(code, name, amount, _bm=by_method):
            if amount <= 0:
                return
            code  = (code or "OTHER").upper()
            entry = _bm.setdefault(code, {"code": code, "name": name or code, "amount": 0.0})
            entry["name"]   = name or entry["name"]
            entry["amount"] += amount

        details = _payment_details(r.get("payment_details"))
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            for p in (details.get("payments") or []):
                if isinstance(p, dict):
                    _add(p.get("payment_method_code"), p.get("payment_method_name"), _payment_amount(p))
        else:
            received = _money(r.get("amount_tendered") or r.get("total_amount")) - _money(r.get("change_amount"))
            _add(r.get("payment_method_code"), r.get("payment_method_name"), received)

    detail_rows = []
    for r in detail_db_rows:
        details = _payment_details(r.get("payment_details"))
        payment_name = r.get("payment_method_name") or r.get("payment_method_code") or "Sin metodo"
        payment_amount = _money(r.get("amount_tendered") or r.get("total_amount")) - _money(r.get("change_amount"))
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            payments = [
                p for p in (details.get("payments") or [])
                if isinstance(p, dict) and _payment_amount(p) > 0
            ]
            if payments:
                payment_name = "Mixto: " + " + ".join(
                    p.get("payment_method_name") or p.get("payment_method_code") or "Medio"
                    for p in payments
                )
                payment_amount = sum(_payment_amount(p) for p in payments)

        detail_rows.append({
            "id": r["id"],
            "sale_code": r["sale_code"],
            "folio": r["folio"],
            "document_type_code": r["document_type_code"],
            "document_type_name": r["document_type_name"],
            "status": r["status"],
            "customer_name": _customer_name(r["customer_snapshot"]),
            "warehouse_id": r["warehouse_id"],
            "warehouse_name": r["warehouse_name"],
            "payment_method_code": r["payment_method_code"],
            "payment_method_name": payment_name,
            "payment_amount": payment_amount,
            "total_amount": _money(r["total_amount"]),
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        })

    rows_out = []
    for iso, day in sorted(date_idx.items()):
        branches = sorted(day["by_wh"].values(), key=lambda x: x["warehouse_name"])
        total    = sum(b["total"] for b in branches)
        txn      = sum(b["txn"]   for b in branches)
        methods  = sorted(day["by_method"].values(), key=lambda x: -x["amount"])

        rows_out.append({
            "iso":        iso,
            "total":      total,
            "txn":        txn,
            "cancelled":  day["cancelled"],
            "avg_ticket": round(total / txn) if txn > 0 else 0,
            "by_branch":  branches,
            "by_method":  methods,
        })

    return {
        "rows": rows_out,
        "detail_rows": detail_rows,
        "warehouses": [
            {"value": str(w["warehouse_id"]), "label": f"Sucursal {w['warehouse_name']}"}
            for w in warehouses
        ],
    }

@router.post("/daily-sales/pdf", response_class=Response)
async def daily_sales_pdf(
    date_from:  str                    = Form(...),
    date_to:    str                    = Form(...),
    branch:     str                    = Form("all"),
    view_mode:  str                    = Form("grouped"),
    chart_area: Optional[UploadFile]   = File(None),
    chart_bar:  Optional[UploadFile]   = File(None),
):
    async def _chart_card(file: Optional[UploadFile], title: str) -> str:
        if not file:
            return ""
        data = await file.read()
        b64  = base64.b64encode(data).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{title}</div></div>'
            f'<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    chart_area_card = await _chart_card(chart_area, "Evolución de ventas diarias")
    chart_bar_card  = await _chart_card(chart_bar,  "Desglose por método de pago")

    try:
        ctx = await _build_context(date_from, date_to, branch, view_mode)
        ctx["CHART_AREA_CARD"] = chart_area_card
        ctx["CHART_BAR_CARD"]  = chart_bar_card
        html = _render("daily_sales.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    filename = f"ventas-diarias_{date_from}_{date_to}.pdf"

    try:
        loop      = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html.encode("utf-8"), settings.GOTENBERG_URL
        )
    except urllib.error.URLError as exc:
        logger.error("Gotenberg no disponible en %s: %s", settings.GOTENBERG_URL, exc)
        return JSONResponse(
            {"error": "Servicio PDF no disponible", "detail": "Gotenberg no responde"},
            status_code=503,
        )
    except Exception as exc:
        logger.error("Error generando PDF: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=503)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Category sales data ──────────────────────────────────────────────────────

_CAT_ROWS_FIRST = 24
_CAT_ROWS_REST  = 28


# ─── Petty cash detail ────────────────────────────────────────────────────────

_PETTY_CASH_DETAIL_ROWS_FIRST = 20
_PETTY_CASH_DETAIL_ROWS_REST = 28
_PETTY_CASH_DAILY_ROWS_FIRST = 24
_PETTY_CASH_DAILY_ROWS_REST = 32
_PETTY_CASH_STATUS_LABELS = {
    "PENDING": "Pendiente",
    "APPROVED": "Aprobado",
    "REJECTED": "Rechazado",
}


def _person_name(row: dict, prefix: str) -> str:
    first = str(row.get(f"{prefix}_first_name") or "").strip()
    last = str(row.get(f"{prefix}_last_name") or "").strip()
    username = str(row.get(f"{prefix}_username") or "").strip()
    full = " ".join(part for part in [first, last] if part).strip()
    return full or username or "Sin responsable"


def _escape(value) -> str:
    return html.escape(str(value or ""), quote=True)


def _status_label(status: str | None) -> str:
    status = str(status or "PENDING").upper()
    return _PETTY_CASH_STATUS_LABELS.get(status, status)


async def _petty_cash_detail_payload(
    date_from_value: date,
    date_to_value: date,
    warehouse_ids: list[int],
    category_id: int | None,
    status: str,
) -> dict:
    if date_from_value > date_to_value:
        date_from_value, date_to_value = date_to_value, date_from_value

    status = str(status or "all").upper()
    if status not in ("ALL", "PENDING", "APPROVED", "REJECTED"):
        status = "ALL"

    params: dict = {"date_from": date_from_value, "date_to": date_to_value}
    filters: list[str] = []
    _append_in_filter(filters, params, "f.warehouse_id", warehouse_ids, "warehouse_id")
    if category_id:
        filters.append("e.category_id = :category_id")
        params["category_id"] = category_id
    if status != "ALL":
        filters.append("COALESCE(e.expense_status, 'PENDING') = :status")
        params["status"] = status

    filter_clause = f"AND {' AND '.join(filters)}" if filters else ""

    async with db_manager.get_async_session() as session:
        detail_db = _rows(await session.execute(text(f"""
            SELECT
              e.id,
              e.expense_code,
              e.expense_amount,
              e.expense_description,
              e.vendor_name,
              e.expense_date,
              COALESCE(e.expense_status, 'PENDING') AS expense_status,
              e.has_receipt,
              e.created_at,
              e.approved_datetime,
              f.fund_code,
              f.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              c.id AS category_id,
              COALESCE(c.category_name, 'Sin categoría') AS category_name,
              responsible.username AS responsible_username,
              responsible.first_name AS responsible_first_name,
              responsible.last_name AS responsible_last_name,
              creator.username AS creator_username,
              creator.first_name AS creator_first_name,
              creator.last_name AS creator_last_name,
              approver.username AS approver_username,
              approver.first_name AS approver_first_name,
              approver.last_name AS approver_last_name
            FROM petty_cash_expenses e
            JOIN petty_cash_funds f ON f.id = e.petty_cash_fund_id
            JOIN warehouses w ON w.id = f.warehouse_id
            JOIN petty_cash_categories c ON c.id = e.category_id
            LEFT JOIN users responsible ON responsible.id = f.responsible_user_id
            LEFT JOIN users creator ON creator.id = e.created_by_user_id
            LEFT JOIN users approver ON approver.id = e.approved_by_user_id
            WHERE f.deleted_at IS NULL
              AND e.expense_date BETWEEN :date_from AND :date_to
              {filter_clause}
            ORDER BY e.expense_date ASC, e.id ASC
            LIMIT 3000
        """), params))

        category_options = _rows(await session.execute(text("""
            SELECT id, category_name AS name
            FROM petty_cash_categories
            WHERE deleted_at IS NULL
            ORDER BY category_name
        """)))

        if warehouse_ids:
            label_params: dict = {}
            label_filters: list[str] = []
            _append_in_filter(label_filters, label_params, "id", warehouse_ids, "wid")
            warehouse_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(label_filters)} ORDER BY warehouse_name"),
                label_params,
            ))
            branch_label = ", ".join(row.get("warehouse_name") or "" for row in warehouse_rows if row.get("warehouse_name")) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"

    detail_rows = []
    date_index: dict[str, dict] = {}
    cur = date_from_value
    while cur <= date_to_value:
        date_index[cur.isoformat()] = {
            "iso": cur.isoformat(),
            "total": 0.0,
            "count": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "with_receipt": 0,
        }
        cur += timedelta(days=1)

    category_set = set()
    totals = {
        "total": 0.0,
        "count": 0,
        "pending": 0,
        "approved": 0,
        "rejected": 0,
        "with_receipt": 0,
        "categories": 0,
    }

    for row in detail_db:
        iso = row["expense_date"] if isinstance(row.get("expense_date"), str) else row["expense_date"].isoformat()
        amount = _money(row.get("expense_amount"))
        state = str(row.get("expense_status") or "PENDING").upper()
        has_receipt = bool(row.get("has_receipt"))
        day = date_index.get(iso)
        if day:
            day["total"] += amount
            day["count"] += 1
            if state == "APPROVED":
                day["approved"] += 1
            elif state == "REJECTED":
                day["rejected"] += 1
            else:
                day["pending"] += 1
            if has_receipt:
                day["with_receipt"] += 1

        totals["total"] += amount
        totals["count"] += 1
        if state == "APPROVED":
            totals["approved"] += 1
        elif state == "REJECTED":
            totals["rejected"] += 1
        else:
            totals["pending"] += 1
        if has_receipt:
            totals["with_receipt"] += 1
        if row.get("category_id"):
            category_set.add(row.get("category_id"))

        detail_rows.append({
            "id": row.get("id"),
            "expense_code": row.get("expense_code"),
            "expense_date": iso,
            "warehouse_id": row.get("warehouse_id"),
            "warehouse_name": row.get("warehouse_name") or "",
            "fund_code": row.get("fund_code") or "",
            "category_id": row.get("category_id"),
            "category_name": row.get("category_name") or "Sin categoría",
            "vendor_name": row.get("vendor_name") or "",
            "responsible_name": _person_name(row, "responsible"),
            "created_by_name": _person_name(row, "creator"),
            "approved_by_name": _person_name(row, "approver") if row.get("approved_datetime") else "",
            "expense_status": state,
            "expense_status_label": _status_label(state),
            "has_receipt": has_receipt,
            "expense_amount": amount,
            "expense_description": row.get("expense_description") or "",
        })

    totals["categories"] = len(category_set)

    return {
        "rows": list(date_index.values()),
        "detail_rows": detail_rows,
        "totals": totals,
        "category_options": category_options,
        "branch_label": branch_label,
        "category_label": next((row["name"] for row in category_options if category_id and int(row["id"]) == int(category_id)), "Todas las categorías"),
        "status_label": "Todos los estados" if status == "ALL" else _status_label(status),
    }


@router.get("/petty-cash/detail/data", response_class=JSONResponse)
async def petty_cash_detail_data(
    date_from:     date       = Query(...),
    date_to:       date       = Query(...),
    warehouse_id:  int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    category_id:   int | None = Query(None),
    status:        str        = Query("all"),
    user:          dict       = Depends(get_current_user),
):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    payload = await _petty_cash_detail_payload(date_from, date_to, selected_warehouse_ids, category_id, status)
    return JSONResponse(payload)


def _build_petty_cash_table_pages(rows: list[dict], view_mode: str, ctx: dict) -> str:
    def _partial(name: str) -> str:
        content = _load_file(os.path.join(_PARTIALS_DIR, f"{name}.html"))
        for key, value in ctx.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")
    first = _PETTY_CASH_DAILY_ROWS_FIRST if view_mode == "grouped" else _PETTY_CASH_DETAIL_ROWS_FIRST
    rest = _PETTY_CASH_DAILY_ROWS_REST if view_mode == "grouped" else _PETTY_CASH_DETAIL_ROWS_REST

    chunks = [rows[:first]]
    remaining = rows[first:]
    while remaining:
        chunks.append(remaining[:rest])
        remaining = remaining[rest:]
    if not chunks:
        chunks = [[]]

    pages = []
    for page_idx, chunk in enumerate(chunks):
        section_heading = ""
        if page_idx == 0:
            section_heading = (
                '<div class="section-heading">'
                '<div class="section-label">Detalle</div>'
                f'<h2 class="section-title">{"Gastos por día" if view_mode == "grouped" else "Detalle de gastos"}</h2>'
                '</div>'
            )

        if view_mode == "grouped":
            tbody = "".join(
                '<tr>'
                f'<td>{_fmt(row["iso"])}</td>'
                f'<td style="text-align:right">{int(row["count"]):,}</td>'
                f'<td style="text-align:right;font-weight:600">{_clp(round(_money(row["total"])))}</td>'
                f'<td style="text-align:right">{int(row["pending"]):,}</td>'
                f'<td style="text-align:right">{int(row["approved"]):,}</td>'
                f'<td style="text-align:right">{int(row["rejected"]):,}</td>'
                f'<td style="text-align:right">{int(row["with_receipt"]):,}</td>'
                '</tr>'
                for row in chunk
            ) if chunk else '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">Sin gastos para los filtros seleccionados</td></tr>'
            table = (
                '<table class="detail-table">'
                '<thead><tr><th>Fecha</th><th style="text-align:right">Gastos</th>'
                '<th style="text-align:right">Total</th><th style="text-align:right">Pendientes</th>'
                '<th style="text-align:right">Aprobados</th><th style="text-align:right">Rechazados</th>'
                '<th style="text-align:right">Con comprobante</th></tr></thead>'
                f'<tbody>{tbody}</tbody></table>'
            )
        else:
            tbody = "".join(
                '<tr>'
                f'<td>{_fmt(row["expense_date"])}</td>'
                f'<td>{_escape(row["expense_code"])}</td>'
                f'<td>{_escape(row["warehouse_name"])}</td>'
                f'<td>{_escape(row["category_name"])}</td>'
                f'<td>{_escape(row["vendor_name"] or "-")}</td>'
                f'<td>{_escape(row["expense_status_label"])}</td>'
                f'<td style="text-align:right;font-weight:600">{_clp(round(_money(row["expense_amount"])))}</td>'
                '</tr>'
                for row in chunk
            ) if chunk else '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8">Sin gastos para los filtros seleccionados</td></tr>'
            table = (
                '<table class="detail-table">'
                '<thead><tr><th>Fecha</th><th>Código</th><th>Sucursal</th><th>Categoría</th>'
                '<th>Comercio</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead>'
                f'<tbody>{tbody}</tbody></table>'
            )

        pages.append(f'<section class="report-page">{page_hdr}{section_heading}{table}{page_ftr}</section>')

    return "\n".join(pages)


async def _build_petty_cash_detail_context(
    date_from_str: str,
    date_to_str: str,
    warehouse_id_str: str,
    category_id_str: str,
    status: str,
    view_mode: str,
) -> dict:
    start = date.fromisoformat(date_from_str)
    end = date.fromisoformat(date_to_str)
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    category_id = None if category_id_str in ("all", "", None) else int(category_id_str)
    view_mode = view_mode if view_mode in ("detail", "grouped") else "detail"
    payload = await _petty_cash_detail_payload(start, end, warehouse_ids, category_id, status)
    duration = (end - start).days + 1
    today_str = date.today().strftime("%d/%m/%Y")
    period_label = f"{_fmt(date_from_str)} — {_fmt(date_to_str)}"
    totals = payload["totals"]
    avg_expense = round(_money(totals.get("total")) / max(int(totals.get("count") or 0), 1))
    table_rows = payload["rows"] if view_mode == "grouped" else payload["detail_rows"]

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{_escape(payload["branch_label"])}</td></tr>'
        f'<tr><td>Categoría</td><td>{_escape(payload["category_label"])}</td></tr>'
        f'<tr><td>Estado</td><td>{_escape(payload["status_label"])}</td></tr>'
        f'<tr><td>Vista</td><td>{"Por día" if view_mode == "grouped" else "Detalle"}</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )
    kpi_specs = [
        ("primary", "Total período", _clp(round(_money(totals.get("total")))), f"en {duration} días"),
        ("info", "Gastos registrados", str(int(totals.get("count") or 0)), "movimientos de caja chica"),
        ("primary", "Gasto promedio", _clp(avg_expense), "por registro"),
        ("info", "Aprobados", str(int(totals.get("approved") or 0)), f"{int(totals.get('pending') or 0)} pendientes"),
        ("warning", "Rechazados", str(int(totals.get("rejected") or 0)), "gastos observados"),
        ("info", "Con comprobante", str(int(totals.get("with_receipt") or 0)), "gastos con evidencia"),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {variant}"><div class="kpi-label">{label}</div>'
        f'<div class="kpi-value">{value}</div><div class="kpi-hint">{hint}</div></div>'
        for variant, label, value, hint in kpi_specs
    )
    executive_note = (
        f"Durante el período {period_label} se registraron {int(totals.get('count') or 0)} gastos "
        f"de caja chica para {_escape(payload['branch_label'])}, por un total de "
        f"{_clp(round(_money(totals.get('total'))))}."
    )

    partial_ctx = {
        "COMPANY_NAME": "CeciChic",
        "REPORT_TITLE": "Caja chica - detalle",
        "PERIOD_LABEL": period_label,
        "BRANCH_LABEL": payload["branch_label"],
        "TODAY": today_str,
        "FOOTER_NOTE": "Uso interno",
        "CURRENCY_LABEL": CURRENCY_LABEL,
    }

    return {
        **partial_ctx,
        "LOGO_HTML": '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS": "INFORME",
        "COVER_TITLE": "Caja chica<br>detalle",
        "COVER_SUBTITLE": "Detalle operativo de gastos de caja chica por fecha, locación, categoría y estado de aprobación.",
        "META_ROWS": meta_rows,
        "KPI_CARDS": kpi_cards,
        "EXECUTIVE_NOTE": executive_note,
        "CHART_PAGE": "",
        "DETAIL_PAGES": _build_petty_cash_table_pages(table_rows, view_mode, partial_ctx),
    }


@router.post("/petty-cash/detail/pdf", response_class=Response)
async def petty_cash_detail_pdf(
    date_from:    str                  = Form(...),
    date_to:      str                  = Form(...),
    warehouse_id: str                  = Form("all"),
    category_id:  str                  = Form("all"),
    status:       str                  = Form("all"),
    view_mode:    str                  = Form("detail"),
    chart_bar:    Optional[UploadFile] = File(None),
    user:         dict                 = Depends(get_current_user),
):
    async def _chart_card(file) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            '<div class="chart-header"><div class="chart-header-title">Gastos por día</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    try:
        ctx = await _build_petty_cash_detail_context(date_from, date_to, warehouse_id, category_id, status, view_mode)
        chart_card = await _chart_card(chart_bar)
        if chart_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading"><div class="section-label">Gráfico</div>'
                '<h2 class="section-title">Serie diaria de gastos</h2></div>'
                f'{chart_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html_out = _render("petty_cash_detail.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template petty_cash_detail: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    try:
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html_out.encode("utf-8"), settings.GOTENBERG_URL
        )
    except Exception as exc:
        logger.error("Gotenberg error petty_cash_detail: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)

    filename = f"caja-chica-detalle_{date_from}_{date_to}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


def _week_key(value: str) -> str:
    parsed = date.fromisoformat(value)
    monday = parsed - timedelta(days=parsed.weekday())
    sunday = monday + timedelta(days=6)
    return f"{monday.isoformat()}|{sunday.isoformat()}"


def _week_label(key: str) -> str:
    monday, sunday = key.split("|", 1)
    return f"{_fmt(monday)} - {_fmt(sunday)}"


async def _petty_cash_weekly_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int], category_id: int | None, status: str) -> dict:
    base = await _petty_cash_detail_payload(date_from_value, date_to_value, warehouse_ids, category_id, status)
    grouped: dict[str, dict] = {}
    for row in base["detail_rows"]:
        key = _week_key(row["expense_date"])
        entry = grouped.setdefault(key, {
            "week": key,
            "week_label": _week_label(key),
            "total": 0.0,
            "count": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "with_receipt": 0,
        })
        entry["total"] += _money(row.get("expense_amount"))
        entry["count"] += 1
        if row.get("expense_status") == "APPROVED":
            entry["approved"] += 1
        elif row.get("expense_status") == "REJECTED":
            entry["rejected"] += 1
        else:
            entry["pending"] += 1
        if row.get("has_receipt"):
            entry["with_receipt"] += 1
    weekly_rows = [grouped[key] for key in sorted(grouped)]
    return {**base, "rows": weekly_rows}


async def _petty_cash_by_category_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int], status: str) -> dict:
    base = await _petty_cash_detail_payload(date_from_value, date_to_value, warehouse_ids, None, status)
    grouped: dict[str, dict] = {}
    for row in base["detail_rows"]:
        key = str(row.get("category_id") or "none")
        entry = grouped.setdefault(key, {
            "category_id": row.get("category_id"),
            "category_name": row.get("category_name") or "Sin categoría",
            "total": 0.0,
            "count": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "with_receipt": 0,
            "pct": 0.0,
        })
        entry["total"] += _money(row.get("expense_amount"))
        entry["count"] += 1
        if row.get("expense_status") == "APPROVED":
            entry["approved"] += 1
        elif row.get("expense_status") == "REJECTED":
            entry["rejected"] += 1
        else:
            entry["pending"] += 1
        if row.get("has_receipt"):
            entry["with_receipt"] += 1
    total = _money(base["totals"].get("total"))
    rows = sorted(grouped.values(), key=lambda item: -_money(item.get("total")))
    for row in rows:
        row["pct"] = round(_money(row.get("total")) / total * 100, 1) if total > 0 else 0.0
    return {**base, "rows": rows}


async def _petty_cash_fund_status_payload(warehouse_ids: list[int], status: str) -> dict:
    status = str(status or "all").upper()
    if status not in ("ALL", "UNDECLARED", "DECLARED", "SUSPENDED", "CLOSED"):
        status = "ALL"
    params: dict = {}
    filters: list[str] = []
    _append_in_filter(filters, params, "f.warehouse_id", warehouse_ids, "warehouse_id")
    if status != "ALL":
        filters.append("f.fund_status = :status")
        params["status"] = status
    filter_clause = f"WHERE f.deleted_at IS NULL AND {' AND '.join(filters)}" if filters else "WHERE f.deleted_at IS NULL"
    async with db_manager.get_async_session() as session:
        rows = _rows(await session.execute(text(f"""
            SELECT
              f.id,
              f.fund_code,
              f.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              f.initial_amount,
              f.current_balance,
              f.total_expenses,
              f.total_replenishments,
              f.fund_status,
              f.last_replenishment_date,
              responsible.username AS responsible_username,
              responsible.first_name AS responsible_first_name,
              responsible.last_name AS responsible_last_name
            FROM petty_cash_funds f
            JOIN warehouses w ON w.id = f.warehouse_id
            LEFT JOIN users responsible ON responsible.id = f.responsible_user_id
            {filter_clause}
            ORDER BY w.warehouse_name, f.fund_code
        """), params))
        if warehouse_ids:
            lp: dict = {}
            lf: list[str] = []
            _append_in_filter(lf, lp, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(lf)} ORDER BY warehouse_name"), lp))
            branch_label = ", ".join(row.get("warehouse_name") or "" for row in wh_rows if row.get("warehouse_name")) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"
    out = []
    for row in rows:
        initial = _money(row.get("initial_amount"))
        balance = _money(row.get("current_balance"))
        spent = max(initial - balance, 0)
        used_pct = round(spent / initial * 100, 1) if initial > 0 else 0.0
        out.append({
            **row,
            "responsible_name": _person_name(row, "responsible"),
            "initial_amount": initial,
            "current_balance": balance,
            "total_expenses": _money(row.get("total_expenses")),
            "total_replenishments": _money(row.get("total_replenishments")),
            "used_pct": used_pct,
            "last_replenishment_date": row.get("last_replenishment_date") or "",
        })
    totals = {
        "funds": len(out),
        "initial_amount": sum(row["initial_amount"] for row in out),
        "current_balance": sum(row["current_balance"] for row in out),
        "total_expenses": sum(row["total_expenses"] for row in out),
        "total_replenishments": sum(row["total_replenishments"] for row in out),
    }
    return {"rows": out, "detail_rows": out, "totals": totals, "branch_label": branch_label}


async def _petty_cash_replenishments_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int]) -> dict:
    if date_from_value > date_to_value:
        date_from_value, date_to_value = date_to_value, date_from_value
    params: dict = {"date_from": date_from_value, "date_to": date_to_value}
    filters: list[str] = []
    _append_in_filter(filters, params, "f.warehouse_id", warehouse_ids, "warehouse_id")
    filter_clause = f"AND {' AND '.join(filters)}" if filters else ""
    async with db_manager.get_async_session() as session:
        rows = _rows(await session.execute(text(f"""
            SELECT
              r.id,
              r.replenishment_code,
              DATE(r.created_at) AS replenishment_date,
              r.replenishment_amount,
              r.previous_balance,
              r.new_balance,
              r.replenishment_reason,
              f.fund_code,
              f.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              authorizer.username AS authorizer_username,
              authorizer.first_name AS authorizer_first_name,
              authorizer.last_name AS authorizer_last_name,
              creator.username AS creator_username,
              creator.first_name AS creator_first_name,
              creator.last_name AS creator_last_name
            FROM petty_cash_replenishments r
            JOIN petty_cash_funds f ON f.id = r.petty_cash_fund_id
            JOIN warehouses w ON w.id = f.warehouse_id
            LEFT JOIN users authorizer ON authorizer.id = r.authorized_by_user_id
            LEFT JOIN users creator ON creator.id = r.created_by_user_id
            WHERE DATE(r.created_at) BETWEEN :date_from AND :date_to
              {filter_clause}
            ORDER BY r.created_at ASC, r.id ASC
        """), params))
        if warehouse_ids:
            lp: dict = {}
            lf: list[str] = []
            _append_in_filter(lf, lp, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(lf)} ORDER BY warehouse_name"), lp))
            branch_label = ", ".join(row.get("warehouse_name") or "" for row in wh_rows if row.get("warehouse_name")) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"
    detail_rows = []
    date_index = {}
    cur = date_from_value
    while cur <= date_to_value:
        date_index[cur.isoformat()] = {"iso": cur.isoformat(), "count": 0, "total": 0.0}
        cur += timedelta(days=1)
    for row in rows:
        iso = row["replenishment_date"] if isinstance(row.get("replenishment_date"), str) else row["replenishment_date"].isoformat()
        amount = _money(row.get("replenishment_amount"))
        if iso in date_index:
            date_index[iso]["count"] += 1
            date_index[iso]["total"] += amount
        detail_rows.append({
            **row,
            "replenishment_date": iso,
            "replenishment_amount": amount,
            "previous_balance": _money(row.get("previous_balance")),
            "new_balance": _money(row.get("new_balance")),
            "authorizer_name": _person_name(row, "authorizer"),
            "created_by_name": _person_name(row, "creator"),
        })
    totals = {"count": len(detail_rows), "total": sum(row["replenishment_amount"] for row in detail_rows)}
    return {"rows": list(date_index.values()), "detail_rows": detail_rows, "totals": totals, "branch_label": branch_label}


@router.get("/petty-cash/weekly/data", response_class=JSONResponse)
async def petty_cash_weekly_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), category_id: int | None = Query(None), status: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _petty_cash_weekly_payload(date_from, date_to, selected_warehouse_ids, category_id, status))


@router.get("/petty-cash/by-category/data", response_class=JSONResponse)
async def petty_cash_by_category_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), status: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _petty_cash_by_category_payload(date_from, date_to, selected_warehouse_ids, status))


@router.get("/petty-cash/fund-status/data", response_class=JSONResponse)
async def petty_cash_fund_status_data(warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), status: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _petty_cash_fund_status_payload(selected_warehouse_ids, status))


@router.get("/petty-cash/replenishments/data", response_class=JSONResponse)
async def petty_cash_replenishments_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _petty_cash_replenishments_payload(date_from, date_to, selected_warehouse_ids))


def _simple_petty_cash_pages(rows: list[dict], columns: list[tuple[str, str, str]], title: str, ctx: dict) -> str:
    def _partial(name: str) -> str:
        content = _load_file(os.path.join(_PARTIALS_DIR, f"{name}.html"))
        for key, value in ctx.items():
            content = content.replace(f"{{{{{key}}}}}", str(value))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")
    chunks = [rows[:24]]
    rest = rows[24:]
    while rest:
        chunks.append(rest[:30])
        rest = rest[30:]
    if not chunks:
        chunks = [[]]

    pages = []
    header = "".join(f'<th style="text-align:{align}">{_escape(label)}</th>' for _, label, align in columns)
    for page_idx, chunk in enumerate(chunks):
        heading = (
            '<div class="section-heading"><div class="section-label">Detalle</div>'
            f'<h2 class="section-title">{_escape(title)}</h2></div>'
        ) if page_idx == 0 else ""
        if chunk:
            body = "".join(
                "<tr>" + "".join(
                    f'<td style="text-align:{align}">{_escape(row.get(key, ""))}</td>'
                    for key, _, align in columns
                ) + "</tr>"
                for row in chunk
            )
        else:
            body = f'<tr><td colspan="{len(columns)}" style="text-align:center;padding:20px;color:#94a3b8">Sin datos para los filtros seleccionados</td></tr>'
        pages.append(
            '<section class="report-page">'
            f'{page_hdr}{heading}<table class="detail-table"><thead><tr>{header}</tr></thead>'
            f'<tbody>{body}</tbody></table>{page_ftr}</section>'
        )
    return "\n".join(pages)


async def _build_simple_petty_cash_context(report_kind: str, date_from_str: str, date_to_str: str, warehouse_id_str: str, category_id_str: str, status: str, view_mode: str) -> dict:
    start = date.fromisoformat(date_from_str)
    end = date.fromisoformat(date_to_str)
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    category_id = None if category_id_str in ("all", "", None) else int(category_id_str)
    view_mode = view_mode if view_mode in ("detail", "grouped") else "detail"

    if report_kind == "weekly":
        title = "Caja chica - resumen semanal"
        payload = await _petty_cash_weekly_payload(start, end, warehouse_ids, category_id, status)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("expense_date", "Fecha", "left"), ("expense_code", "Código", "left"), ("warehouse_name", "Sucursal", "left"),
            ("category_name", "Categoría", "left"), ("expense_status_label", "Estado", "left"), ("expense_amount", "Monto", "right"),
        ] if view_mode == "detail" else [
            ("week_label", "Semana", "left"), ("count", "Gastos", "right"), ("total", "Total", "right"),
            ("pending", "Pendientes", "right"), ("approved", "Aprobados", "right"), ("rejected", "Rechazados", "right"),
        ]
    elif report_kind == "by_category":
        title = "Caja chica - gastos por categoría"
        payload = await _petty_cash_by_category_payload(start, end, warehouse_ids, status)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("expense_date", "Fecha", "left"), ("expense_code", "Código", "left"), ("warehouse_name", "Sucursal", "left"),
            ("category_name", "Categoría", "left"), ("expense_status_label", "Estado", "left"), ("expense_amount", "Monto", "right"),
        ] if view_mode == "detail" else [
            ("category_name", "Categoría", "left"), ("count", "Gastos", "right"), ("total", "Total", "right"),
            ("pct", "% total", "right"), ("pending", "Pendientes", "right"), ("approved", "Aprobados", "right"),
        ]
    elif report_kind == "fund_status":
        title = "Caja chica - estado de fondos"
        payload = await _petty_cash_fund_status_payload(warehouse_ids, status)
        rows = payload["rows"]
        columns = [
            ("warehouse_name", "Sucursal", "left"), ("fund_code", "Fondo", "left"), ("responsible_name", "Responsable", "left"),
            ("fund_status", "Estado", "left"), ("initial_amount", "Asignado", "right"), ("current_balance", "Saldo", "right"),
            ("used_pct", "% usado", "right"),
        ]
    else:
        title = "Caja chica - historial de reposiciones"
        payload = await _petty_cash_replenishments_payload(start, end, warehouse_ids)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("replenishment_date", "Fecha", "left"), ("replenishment_code", "Código", "left"), ("warehouse_name", "Sucursal", "left"),
            ("fund_code", "Fondo", "left"), ("authorizer_name", "Autoriza", "left"), ("replenishment_amount", "Monto", "right"),
        ] if view_mode == "detail" else [
            ("iso", "Fecha", "left"), ("count", "Reposiciones", "right"), ("total", "Total", "right"),
        ]

    for row in rows:
        for key in ("total", "expense_amount", "initial_amount", "current_balance", "replenishment_amount"):
            if key in row:
                row[key] = _clp(round(_money(row.get(key))))
        if "pct" in row:
            row["pct"] = f'{_money(row.get("pct")):.1f}%'
        if "used_pct" in row:
            row["used_pct"] = f'{_money(row.get("used_pct")):.1f}%'

    today_str = date.today().strftime("%d/%m/%Y")
    period_label = f"{_fmt(date_from_str)} — {_fmt(date_to_str)}"
    totals = payload.get("totals", {})
    total_amount = _money(totals.get("total") or totals.get("current_balance") or totals.get("total_expenses"))
    count = int(totals.get("count") or totals.get("funds") or len(rows))

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{_escape(payload.get("branch_label") or "Todas las locaciones")}</td></tr>'
        f'<tr><td>Vista</td><td>{"Detalle" if view_mode == "detail" else "Agrupada"}</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )
    kpi_cards = (
        f'<div class="kpi-card primary"><div class="kpi-label">Total</div><div class="kpi-value">{_clp(round(total_amount))}</div><div class="kpi-hint">{period_label}</div></div>'
        f'<div class="kpi-card info"><div class="kpi-label">Registros</div><div class="kpi-value">{count}</div><div class="kpi-hint">según filtros</div></div>'
    )
    partial_ctx = {
        "COMPANY_NAME": "CeciChic", "REPORT_TITLE": title, "PERIOD_LABEL": period_label,
        "BRANCH_LABEL": payload.get("branch_label") or "Todas las locaciones",
        "TODAY": today_str, "FOOTER_NOTE": "Uso interno", "CURRENCY_LABEL": CURRENCY_LABEL,
    }
    return {
        **partial_ctx,
        "LOGO_HTML": '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS": "INFORME",
        "COVER_TITLE": title.replace(" - ", "<br>"),
        "COVER_SUBTITLE": "Reporte operativo de caja chica generado con datos reales del sistema.",
        "META_ROWS": meta_rows,
        "KPI_CARDS": kpi_cards,
        "EXECUTIVE_NOTE": f"Reporte {title} para {partial_ctx['BRANCH_LABEL']} durante {period_label}.",
        "CHART_PAGE": "",
        "DETAIL_PAGES": _simple_petty_cash_pages(rows, columns, title, partial_ctx),
    }


async def _simple_petty_cash_pdf(
    report_kind: str,
    date_from: str,
    date_to: str,
    warehouse_id: str,
    category_id: str,
    status: str,
    view_mode: str,
    chart_bar: Optional[UploadFile] = None,
) -> Response:
    async def _chart_card(file: Optional[UploadFile], title: str) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{_escape(title)}</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    try:
        ctx = await _build_simple_petty_cash_context(report_kind, date_from, date_to, warehouse_id, category_id, status, view_mode)
        chart_card = await _chart_card(chart_bar, ctx.get("REPORT_TITLE", "Gráfico"))
        if chart_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading"><div class="section-label">Gráfico</div>'
                f'<h2 class="section-title">{_escape(ctx.get("REPORT_TITLE", "Caja chica"))}</h2></div>'
                f'{chart_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html_out = _render("petty_cash_detail.html", ctx)
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(None, _call_gotenberg_sync, html_out.encode("utf-8"), settings.GOTENBERG_URL)
    except Exception as exc:
        logger.error("Error generando PDF %s: %s", report_kind, exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)
    filename = f"caja-chica-{report_kind}_{date_from}_{date_to}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.post("/petty-cash/weekly/pdf", response_class=Response)
async def petty_cash_weekly_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), category_id: str = Form("all"), status: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _simple_petty_cash_pdf("weekly", date_from, date_to, warehouse_id, category_id, status, view_mode, chart_bar)


@router.post("/petty-cash/by-category/pdf", response_class=Response)
async def petty_cash_by_category_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), status: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _simple_petty_cash_pdf("by_category", date_from, date_to, warehouse_id, "all", status, view_mode, chart_bar)


@router.post("/petty-cash/fund-status/pdf", response_class=Response)
async def petty_cash_fund_status_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), status: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _simple_petty_cash_pdf("fund_status", date_from, date_to, warehouse_id, "all", status, view_mode, chart_bar)


@router.post("/petty-cash/replenishments/pdf", response_class=Response)
async def petty_cash_replenishments_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _simple_petty_cash_pdf("replenishments", date_from, date_to, warehouse_id, "all", "all", view_mode, chart_bar)


_CASH_SESSION_STATUS_LABELS = {14: "Abierta", 15: "Pendiente cierre", 16: "Cerrada", 17: "Cancelada"}
_CASH_MOVEMENT_LABELS = {
    "OPENING": "Apertura",
    "SALE": "Venta",
    "RETURN": "Devolución",
    "PETTY_CASH": "Caja chica",
    "ADJUSTMENT": "Ajuste",
    "CLOSING": "Cierre",
}


def _cash_session_status_label(status_id) -> str:
    try:
        key = int(status_id)
    except (TypeError, ValueError):
        key = 0
    return _CASH_SESSION_STATUS_LABELS.get(key, "Sin estado")


def _cash_movement_label(value) -> str:
    value = str(value or "").upper()
    return _CASH_MOVEMENT_LABELS.get(value, value or "Sin tipo")


def _cash_pos_branch_filter(warehouse_ids: list[int]) -> tuple[str, dict]:
    params: dict = {}
    filters: list[str] = []
    _append_in_filter(filters, params, "cr.warehouse_id", warehouse_ids, "warehouse_id")
    return (f"AND {' AND '.join(filters)}" if filters else ""), params


async def _cash_pos_branch_label(session, warehouse_ids: list[int]) -> str:
    if not warehouse_ids:
        return "Todas las locaciones"
    params: dict = {}
    filters: list[str] = []
    _append_in_filter(filters, params, "id", warehouse_ids, "wid")
    rows = _rows(await session.execute(text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(filters)} ORDER BY warehouse_name"), params))
    return ", ".join(row.get("warehouse_name") or "" for row in rows if row.get("warehouse_name")) or "Locaciones seleccionadas"


def _cash_pos_date_index(date_from_value: date, date_to_value: date) -> dict:
    index = {}
    cur = date_from_value
    while cur <= date_to_value:
        index[cur.isoformat()] = {"iso": cur.isoformat(), "count": 0, "total": 0.0, "difference": 0.0}
        cur += timedelta(days=1)
    return index


async def _cash_pos_sessions_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int], status: str) -> dict:
    if date_from_value > date_to_value:
        date_from_value, date_to_value = date_to_value, date_from_value
    branch_filter, branch_params = _cash_pos_branch_filter(warehouse_ids)
    status = str(status or "all").lower()
    status_filter = ""
    status_params = {}
    if status in ("14", "15", "16", "17"):
        status_filter = "AND crs.status_id = :status_id"
        status_params["status_id"] = int(status)
    params = {"date_from": date_from_value, "date_to": date_to_value, **branch_params, **status_params}
    async with db_manager.get_async_session() as session:
        rows = _rows(await session.execute(text(f"""
            SELECT
              crs.id,
              crs.session_code,
              DATE(crs.opening_datetime) AS opening_date,
              crs.opening_datetime,
              crs.closing_datetime,
              crs.opening_amount,
              crs.theoretical_amount,
              crs.physical_amount,
              crs.difference_amount,
              crs.status_id,
              cr.register_code,
              cr.register_name,
              cr.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              cashier.username AS cashier_username,
              cashier.first_name AS cashier_first_name,
              cashier.last_name AS cashier_last_name,
              COALESCE(sd.sales_count, 0) AS sales_count,
              COALESCE(sd.sales_total, 0) AS sales_total
            FROM cash_register_sessions crs
            JOIN cash_registers cr ON cr.id = crs.cash_register_id
            LEFT JOIN warehouses w ON w.id = cr.warehouse_id
            LEFT JOIN users cashier ON cashier.id = crs.cashier_user_id
            LEFT JOIN (
              SELECT cash_register_session_id, COUNT(*) AS sales_count, SUM(total_amount) AS sales_total
              FROM sale_documents
              WHERE status = 'CLOSED' AND deleted_at IS NULL
              GROUP BY cash_register_session_id
            ) sd ON sd.cash_register_session_id = crs.id
            WHERE crs.deleted_at IS NULL
              AND DATE(crs.opening_datetime) BETWEEN :date_from AND :date_to
              {branch_filter}
              {status_filter}
            ORDER BY crs.opening_datetime ASC, crs.id ASC
        """), params))
        branch_label = await _cash_pos_branch_label(session, warehouse_ids)
    detail_rows = []
    grouped = _cash_pos_date_index(date_from_value, date_to_value)
    for row in rows:
        opening_iso = row["opening_date"] if isinstance(row.get("opening_date"), str) else row["opening_date"].isoformat()
        duration = ""
        if row.get("opening_datetime") and row.get("closing_datetime"):
            try:
                minutes = max(int((row["closing_datetime"] - row["opening_datetime"]).total_seconds() // 60), 0)
                duration = f"{minutes // 60}h {minutes % 60}m"
            except Exception:
                duration = ""
        sales_total = _money(row.get("sales_total"))
        difference = _money(row.get("difference_amount"))
        grouped[opening_iso]["count"] += 1
        grouped[opening_iso]["total"] += sales_total
        grouped[opening_iso]["difference"] += abs(difference)
        detail_rows.append({
            **row,
            "opening_date": opening_iso,
            "opening_datetime": str(row.get("opening_datetime") or ""),
            "closing_datetime": str(row.get("closing_datetime") or ""),
            "opening_amount": _money(row.get("opening_amount")),
            "theoretical_amount": _money(row.get("theoretical_amount")),
            "physical_amount": _money(row.get("physical_amount")),
            "difference_amount": difference,
            "sales_total": sales_total,
            "cashier_name": _person_name(row, "cashier"),
            "status_label": _cash_session_status_label(row.get("status_id")),
            "duration_label": duration or "—",
        })
    totals = {
        "count": len(detail_rows),
        "sales_total": sum(row["sales_total"] for row in detail_rows),
        "difference_abs": sum(abs(row["difference_amount"]) for row in detail_rows),
        "open": sum(1 for row in detail_rows if int(row.get("status_id") or 0) == 14),
        "closed": sum(1 for row in detail_rows if int(row.get("status_id") or 0) == 16),
    }
    return {"rows": list(grouped.values()), "detail_rows": detail_rows, "totals": totals, "branch_label": branch_label}


async def _cash_pos_discrepancies_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int]) -> dict:
    payload = await _cash_pos_sessions_payload(date_from_value, date_to_value, warehouse_ids, "all")
    detail_rows = [row for row in payload["detail_rows"] if abs(_money(row.get("difference_amount"))) > 0]
    detail_rows.sort(key=lambda row: abs(_money(row.get("difference_amount"))), reverse=True)
    grouped: dict[str, dict] = {}
    for row in detail_rows:
        key = str(row.get("warehouse_id") or "none")
        entry = grouped.setdefault(key, {"warehouse_name": row.get("warehouse_name") or "Sin sucursal", "count": 0, "difference_abs": 0.0, "positive": 0.0, "negative": 0.0})
        diff = _money(row.get("difference_amount"))
        entry["count"] += 1
        entry["difference_abs"] += abs(diff)
        if diff >= 0:
            entry["positive"] += diff
        else:
            entry["negative"] += diff
    payload["detail_rows"] = detail_rows
    payload["rows"] = sorted(grouped.values(), key=lambda item: -_money(item.get("difference_abs")))
    payload["totals"] = {
        "count": len(detail_rows),
        "difference_abs": sum(abs(_money(row.get("difference_amount"))) for row in detail_rows),
        "positive": sum(max(_money(row.get("difference_amount")), 0) for row in detail_rows),
        "negative": sum(min(_money(row.get("difference_amount")), 0) for row in detail_rows),
    }
    return payload


async def _cash_pos_extra_movements_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int], movement_type: str) -> dict:
    if date_from_value > date_to_value:
        date_from_value, date_to_value = date_to_value, date_from_value
    branch_filter, branch_params = _cash_pos_branch_filter(warehouse_ids)
    movement_type = str(movement_type or "all").upper()
    type_filter = ""
    type_params = {}
    if movement_type in ("OPENING", "PETTY_CASH", "ADJUSTMENT", "CLOSING"):
        type_filter = "AND cm.movement_type = :movement_type"
        type_params["movement_type"] = movement_type
    params = {"date_from": date_from_value, "date_to": date_to_value, **branch_params, **type_params}
    async with db_manager.get_async_session() as session:
        rows = _rows(await session.execute(text(f"""
            SELECT
              cm.id,
              DATE(cm.created_at) AS movement_date,
              cm.created_at,
              cm.movement_type,
              cm.amount,
              cm.reference_number,
              cm.description,
              pm.method_name AS payment_method_name,
              crs.session_code,
              cr.register_code,
              cr.register_name,
              cr.warehouse_id,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              creator.username AS creator_username,
              creator.first_name AS creator_first_name,
              creator.last_name AS creator_last_name
            FROM cash_movements cm
            JOIN cash_register_sessions crs ON crs.id = cm.cash_register_session_id
            JOIN cash_registers cr ON cr.id = crs.cash_register_id
            LEFT JOIN warehouses w ON w.id = cr.warehouse_id
            LEFT JOIN payment_methods pm ON pm.id = cm.payment_method_id
            LEFT JOIN users creator ON creator.id = cm.created_by_user_id
            WHERE crs.deleted_at IS NULL
              AND cm.movement_type NOT IN ('SALE', 'RETURN')
              AND DATE(cm.created_at) BETWEEN :date_from AND :date_to
              {branch_filter}
              {type_filter}
            ORDER BY cm.created_at ASC, cm.id ASC
        """), params))
        branch_label = await _cash_pos_branch_label(session, warehouse_ids)
    detail_rows = []
    grouped: dict[str, dict] = {}
    for row in rows:
        amount = _money(row.get("amount"))
        key = str(row.get("movement_type") or "OTHER")
        entry = grouped.setdefault(key, {"movement_type": key, "movement_label": _cash_movement_label(key), "count": 0, "total": 0.0})
        entry["count"] += 1
        entry["total"] += amount
        detail_rows.append({
            **row,
            "movement_date": row["movement_date"] if isinstance(row.get("movement_date"), str) else row["movement_date"].isoformat(),
            "created_at": str(row.get("created_at") or ""),
            "amount": amount,
            "movement_label": _cash_movement_label(row.get("movement_type")),
            "created_by_name": _person_name(row, "creator"),
        })
    totals = {"count": len(detail_rows), "total": sum(row["amount"] for row in detail_rows)}
    return {"rows": sorted(grouped.values(), key=lambda item: -abs(_money(item.get("total")))), "detail_rows": detail_rows, "totals": totals, "branch_label": branch_label}


async def _cash_pos_collection_payload(date_from_value: date, date_to_value: date, warehouse_ids: list[int], method_code: str) -> dict:
    if date_from_value > date_to_value:
        date_from_value, date_to_value = date_to_value, date_from_value
    params: dict = {"date_from": date_from_value, "date_to": date_to_value}
    filters: list[str] = []
    _append_in_filter(filters, params, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    method_code = str(method_code or "all").upper()
    filter_clause = f"AND {' AND '.join(filters)}" if filters else ""
    async with db_manager.get_async_session() as session:
        sale_rows = _rows(await session.execute(text(f"""
            SELECT
              sd.id,
              sd.sale_code,
              COALESCE(sd.ticket_number, sd.sale_code) AS ticket_number,
              DATE(sd.updated_at) AS sale_date,
              sd.updated_at AS closed_at,
              sd.payment_method_code,
              sd.payment_method_name,
              sd.payment_details,
              sd.total_amount,
              sd.amount_tendered,
              sd.change_amount,
              cr.register_code,
              cr.register_name,
              COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
              cashier.username AS cashier_username,
              cashier.first_name AS cashier_first_name,
              cashier.last_name AS cashier_last_name
            FROM sale_documents sd
            LEFT JOIN cash_registers cr ON cr.id = sd.cash_register_id
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            LEFT JOIN users cashier ON cashier.id = sd.closed_by_user_id
            WHERE sd.status = 'CLOSED'
              AND sd.deleted_at IS NULL
              AND DATE(sd.updated_at) BETWEEN :date_from AND :date_to
              {filter_clause}
            ORDER BY sd.updated_at ASC, sd.id ASC
        """), params))
        branch_label = await _cash_pos_branch_label(session, warehouse_ids)
    out_detail = []
    grouped: dict[str, dict] = {}
    for row in sale_rows:
        details = _payment_details(row.get("payment_details"))
        if isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED":
            payments = details.get("payments") or []
        else:
            payments = [{
                "payment_method_code": row.get("payment_method_code"),
                "payment_method_name": row.get("payment_method_name"),
                "amount": row.get("total_amount"),
            }]
        for idx, payment in enumerate(payments):
            amount = _money(
                payment.get("clp_amount")
                or payment.get("amount")
                or payment.get("received_amount")
                or row.get("total_amount")
            )
            code = str(payment.get("payment_method_code") or row.get("payment_method_code") or "").upper()
            name = payment.get("payment_method_name") or row.get("payment_method_name")
            if not code:
                code = "NO_CHARGE"
                name = "Sin cobro"
            elif code in ("SIN_METODO", "NO_METHOD"):
                code = "NO_CHARGE"
                name = "Sin cobro"
            else:
                name = name or code
            if method_code != "ALL" and code != method_code:
                continue
            grouped.setdefault(code, {"payment_method_code": code, "payment_method_name": name, "count": 0, "total": 0.0})
            grouped[code]["count"] += 1
            grouped[code]["total"] += amount
            out_detail.append({
                **row,
                "id": f'{row.get("id")}-{idx}',
                "sale_id": row.get("id"),
                "sale_date": row["sale_date"] if isinstance(row.get("sale_date"), str) else row["sale_date"].isoformat(),
                "closed_at": str(row.get("closed_at") or ""),
                "payment_method_code": code,
                "payment_method_name": name,
                "total_amount": amount,
                "sale_total_amount": _money(row.get("total_amount")),
                "amount_tendered": _money(row.get("amount_tendered")),
                "change_amount": _money(row.get("change_amount")),
                "cashier_name": _person_name(row, "cashier"),
                "is_mixed_component": isinstance(details, dict) and str(details.get("type") or "").upper() == "MIXED",
            })
    rows = sorted(grouped.values(), key=lambda item: -_money(item.get("total")))
    totals = {"count": len(out_detail), "total": sum(row["total_amount"] for row in out_detail), "methods": len(rows)}
    return {"rows": rows, "detail_rows": out_detail, "totals": totals, "branch_label": branch_label}


@router.get("/cash-pos/sessions/data", response_class=JSONResponse)
async def cash_pos_sessions_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), status: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _cash_pos_sessions_payload(date_from, date_to, selected_warehouse_ids, status))


@router.get("/cash-pos/discrepancies/data", response_class=JSONResponse)
async def cash_pos_discrepancies_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _cash_pos_discrepancies_payload(date_from, date_to, selected_warehouse_ids))


@router.get("/cash-pos/extra-movements/data", response_class=JSONResponse)
async def cash_pos_extra_movements_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), movement_type: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _cash_pos_extra_movements_payload(date_from, date_to, selected_warehouse_ids, movement_type))


@router.get("/cash-pos/collection-by-method/data", response_class=JSONResponse)
async def cash_pos_collection_by_method_data(date_from: date = Query(...), date_to: date = Query(...), warehouse_id: int | None = Query(None), warehouse_ids: str | None = Query(None), method_code: str = Query("all"), user: dict = Depends(get_current_user)):
    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    return JSONResponse(await _cash_pos_collection_payload(date_from, date_to, selected_warehouse_ids, method_code))


async def _build_cash_pos_context(report_kind: str, date_from_str: str, date_to_str: str, warehouse_id_str: str, filter_value: str, view_mode: str) -> dict:
    start = date.fromisoformat(date_from_str)
    end = date.fromisoformat(date_to_str)
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    view_mode = view_mode if view_mode in ("detail", "grouped") else "detail"
    if report_kind == "sessions":
        title = "Caja POS - historial de sesiones"
        payload = await _cash_pos_sessions_payload(start, end, warehouse_ids, filter_value)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("opening_date", "Fecha", "left"), ("session_code", "Sesión", "left"), ("warehouse_name", "Sucursal", "left"),
            ("register_name", "Caja", "left"), ("cashier_name", "Cajero", "left"), ("status_label", "Estado", "left"), ("sales_total", "Ventas", "right"),
        ] if view_mode == "detail" else [("iso", "Fecha", "left"), ("count", "Sesiones", "right"), ("total", "Ventas", "right"), ("difference", "Diferencias", "right")]
    elif report_kind == "discrepancies":
        title = "Caja POS - diferencias de arqueo"
        payload = await _cash_pos_discrepancies_payload(start, end, warehouse_ids)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("opening_date", "Fecha", "left"), ("session_code", "Sesión", "left"), ("warehouse_name", "Sucursal", "left"),
            ("register_name", "Caja", "left"), ("cashier_name", "Cajero", "left"), ("difference_amount", "Diferencia", "right"),
        ] if view_mode == "detail" else [("warehouse_name", "Sucursal", "left"), ("count", "Sesiones", "right"), ("difference_abs", "Diferencia abs.", "right"), ("positive", "Sobrante", "right"), ("negative", "Faltante", "right")]
    elif report_kind == "extra_movements":
        title = "Caja POS - movimientos extraordinarios"
        payload = await _cash_pos_extra_movements_payload(start, end, warehouse_ids, filter_value)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("movement_date", "Fecha", "left"), ("movement_label", "Tipo", "left"), ("warehouse_name", "Sucursal", "left"),
            ("register_name", "Caja", "left"), ("created_by_name", "Usuario", "left"), ("amount", "Monto", "right"),
        ] if view_mode == "detail" else [("movement_label", "Tipo", "left"), ("count", "Movimientos", "right"), ("total", "Total", "right")]
    else:
        title = "Caja POS - recaudación por método"
        payload = await _cash_pos_collection_payload(start, end, warehouse_ids, filter_value)
        rows = payload["detail_rows"] if view_mode == "detail" else payload["rows"]
        columns = [
            ("sale_date", "Fecha", "left"), ("ticket_number", "Documento", "left"), ("warehouse_name", "Sucursal", "left"),
            ("register_name", "Caja", "left"), ("payment_method_name", "Método", "left"), ("total_amount", "Total", "right"),
        ] if view_mode == "detail" else [("payment_method_name", "Método", "left"), ("count", "Pagos", "right"), ("total", "Total", "right")]

    for row in rows:
        for key in ("total", "sales_total", "difference", "difference_amount", "difference_abs", "positive", "negative", "amount", "total_amount"):
            if key in row:
                row[key] = _clp(round(_money(row.get(key))))

    today_str = date.today().strftime("%d/%m/%Y")
    period_label = f"{_fmt(date_from_str)} — {_fmt(date_to_str)}"
    totals = payload.get("totals", {})
    total_amount = _money(totals.get("total") or totals.get("sales_total") or totals.get("difference_abs"))
    count = int(totals.get("count") or len(rows))
    partial_ctx = {
        "COMPANY_NAME": "CeciChic", "REPORT_TITLE": title, "PERIOD_LABEL": period_label,
        "BRANCH_LABEL": payload.get("branch_label") or "Todas las locaciones",
        "TODAY": today_str, "FOOTER_NOTE": "Uso interno", "CURRENCY_LABEL": CURRENCY_LABEL,
    }
    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{_escape(partial_ctx["BRANCH_LABEL"])}</td></tr>'
        f'<tr><td>Vista</td><td>{"Detalle" if view_mode == "detail" else "Agrupada"}</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )
    return {
        **partial_ctx,
        "LOGO_HTML": '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS": "INFORME",
        "COVER_TITLE": title.replace(" - ", "<br>"),
        "COVER_SUBTITLE": "Reporte operativo de caja POS generado con datos reales del sistema.",
        "META_ROWS": meta_rows,
        "KPI_CARDS": (
            f'<div class="kpi-card primary"><div class="kpi-label">Total</div><div class="kpi-value">{_clp(round(total_amount))}</div><div class="kpi-hint">{period_label}</div></div>'
            f'<div class="kpi-card info"><div class="kpi-label">Registros</div><div class="kpi-value">{count}</div><div class="kpi-hint">según filtros</div></div>'
        ),
        "EXECUTIVE_NOTE": f"Reporte {title} para {partial_ctx['BRANCH_LABEL']} durante {period_label}.",
        "CHART_PAGE": "",
        "DETAIL_PAGES": _simple_petty_cash_pages(rows, columns, title, partial_ctx),
    }


async def _cash_pos_pdf(report_kind: str, date_from: str, date_to: str, warehouse_id: str, filter_value: str, view_mode: str, chart_bar: Optional[UploadFile]) -> Response:
    try:
        ctx = await _build_cash_pos_context(report_kind, date_from, date_to, warehouse_id, filter_value, view_mode)
        if chart_bar:
            raw = await chart_bar.read()
            if raw:
                b64 = base64.b64encode(raw).decode()
                chart_page = (
                    '<section class="report-page">{{> _page_header}}'
                    '<div class="section-heading"><div class="section-label">Gráfico</div>'
                    f'<h2 class="section-title">{_escape(ctx.get("REPORT_TITLE", "Caja POS"))}</h2></div>'
                    '<div class="chart-card no-break"><div class="chart-section" style="min-height:0">'
                    f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
                    '</div></div>{{> _page_footer}}</section>'
                )
                chart_page = _resolve_partials(chart_page)
                for key, value in ctx.items():
                    chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
                ctx["CHART_PAGE"] = chart_page
        html_out = _render("petty_cash_detail.html", ctx)
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(None, _call_gotenberg_sync, html_out.encode("utf-8"), settings.GOTENBERG_URL)
    except Exception as exc:
        logger.error("Error generando PDF caja POS %s: %s", report_kind, exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)
    filename = f"caja-pos-{report_kind}_{date_from}_{date_to}.pdf"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{filename}"'})


@router.post("/cash-pos/sessions/pdf", response_class=Response)
async def cash_pos_sessions_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), status: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _cash_pos_pdf("sessions", date_from, date_to, warehouse_id, status, view_mode, chart_bar)


@router.post("/cash-pos/discrepancies/pdf", response_class=Response)
async def cash_pos_discrepancies_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _cash_pos_pdf("discrepancies", date_from, date_to, warehouse_id, "all", view_mode, chart_bar)


@router.post("/cash-pos/extra-movements/pdf", response_class=Response)
async def cash_pos_extra_movements_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), movement_type: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _cash_pos_pdf("extra_movements", date_from, date_to, warehouse_id, movement_type, view_mode, chart_bar)


@router.post("/cash-pos/collection-by-method/pdf", response_class=Response)
async def cash_pos_collection_by_method_pdf(date_from: str = Form(...), date_to: str = Form(...), warehouse_id: str = Form("all"), method_code: str = Form("all"), view_mode: str = Form("detail"), chart_bar: Optional[UploadFile] = File(None), user: dict = Depends(get_current_user)):
    return await _cash_pos_pdf("collection_by_method", date_from, date_to, warehouse_id, method_code, view_mode, chart_bar)


@router.get("/sales/category-sales/data", response_class=JSONResponse)
async def category_sales_data(
    date_from:     date       = Query(...),
    date_to:       date       = Query(...),
    warehouse_id:  int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    group_by:      str        = Query("category"),
    user:          dict       = Depends(get_current_user),
):
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    group_by = group_by if group_by in ("category", "brand") else "category"

    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    params: dict = {"date_from": date_from, "date_to": date_to}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    if group_by == "brand":
        group_col_id   = "pb.id"
        group_col_name = "COALESCE(pb.brand_name, 'Sin marca')"
        group_by_sql   = "pb.id, COALESCE(pb.brand_name, 'Sin marca')"
        join_extra     = "LEFT JOIN product_brands pb ON pb.id = p.brand_id"
        null_label     = "Sin marca"
    else:
        group_col_id   = "c.id"
        group_col_name = "COALESCE(c.category_name, 'Sin categoría')"
        group_by_sql   = "c.id, COALESCE(c.category_name, 'Sin categoría')"
        join_extra     = "LEFT JOIN categories c ON c.id = p.category_id"
        null_label     = "Sin categoría"

    async with db_manager.get_async_session() as session:
        group_rows = _rows(await session.execute(text(f"""
            SELECT
                {group_col_id}   AS group_id,
                {group_col_name} AS group_name,
                ROUND(SUM(sdl.paid_total_amount), 0) AS total,
                COALESCE(SUM(sdl.quantity), 0)                AS units,
                COUNT(DISTINCT sd.id)                         AS txn_count
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            LEFT JOIN products p ON p.id = sdl.product_id
            {join_extra}
            WHERE sd.deleted_at  IS NULL
              AND sdl.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sdl.paid_total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY {group_by_sql}
            ORDER BY total DESC
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)          AS txn_count,
                ROUND(SUM(sdl.paid_total_amount), 0) AS total,
                COALESCE(SUM(sdl.quantity), 0) AS units
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            WHERE sd.deleted_at  IS NULL
              AND sdl.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sdl.paid_total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

        detail_db = _rows(await session.execute(text(f"""
            SELECT
                {group_col_name}                                      AS group_name,
                COALESCE(pv.variant_name, sdl.product_name)          AS product_name,
                COALESCE(pv.variant_sku, sdl.product_code)           AS product_sku,
                sd.sale_code,
                COALESCE(sd.ticket_number, sd.sale_code)             AS folio,
                COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
                DATE(COALESCE(sd.updated_at, sd.created_at))         AS sale_date,
                sdl.quantity,
                sdl.paid_total_amount                                 AS total
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            LEFT JOIN product_variants pv ON pv.id = sdl.product_variant_id
            LEFT JOIN products p ON p.id = sdl.product_id
            {join_extra}
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at  IS NULL
              AND sdl.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sdl.paid_total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            ORDER BY sale_date ASC, sd.id ASC, sdl.id ASC
            LIMIT 3000
        """), params))

    grand_total = _money(total_row.get("total", 0))
    rows_out: list[dict] = []
    for r in group_rows:
        total_v = _money(r["total"])
        units_v = int(r.get("units") or 0)
        txn_v   = int(r.get("txn_count") or 0)
        rows_out.append({
            "group_id":   r.get("group_id"),
            "group_name": r.get("group_name") or null_label,
            "total":      total_v,
            "units":      units_v,
            "txn_count":  txn_v,
            "avg_unit":   round(total_v / units_v) if units_v > 0 else 0,
            "pct":        round(total_v / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    detail_rows_out = [
        {
            "group_name":   r.get("group_name") or null_label,
            "product_name": r.get("product_name") or "-",
            "product_sku":  r.get("product_sku") or "",
            "sale_code":    r.get("sale_code"),
            "folio":        r.get("folio") or "",
            "warehouse_name": r.get("warehouse_name") or "",
            "sale_date":    r["sale_date"].isoformat() if r.get("sale_date") and not isinstance(r["sale_date"], str) else (r.get("sale_date") or ""),
            "quantity":     int(r.get("quantity") or 0),
            "total":        _money(r.get("total")),
        }
        for r in detail_db
    ]

    return JSONResponse({
        "rows":        rows_out,
        "detail_rows": detail_rows_out,
        "totals": {
            "total":     grand_total,
            "units":     int(total_row.get("units") or 0),
            "txn_count": int(total_row.get("txn_count") or 0),
        },
        "group_by": group_by,
    })


# ─── Category sales PDF ───────────────────────────────────────────────────────

async def _build_category_context(
    date_from: str, date_to: str,
    warehouse_id_str: str, group_by: str,
) -> dict:
    group_by       = group_by if group_by in ("category", "brand") else "category"
    warehouse_ids  = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    start          = date.fromisoformat(date_from)
    end            = date.fromisoformat(date_to)
    duration       = (end - start).days + 1
    today_str      = date.today().strftime("%d/%m/%Y")
    period_label   = f"{_fmt(date_from)} — {_fmt(date_to)}"
    group_label    = "Marca" if group_by == "brand" else "Categoría"
    group_label_pl = "Marcas" if group_by == "brand" else "Categorías"

    params: dict = {"date_from": start, "date_to": end}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    if group_by == "brand":
        group_col_id   = "pb.id"
        group_col_name = "COALESCE(pb.brand_name, 'Sin marca')"
        group_by_sql   = "pb.id, COALESCE(pb.brand_name, 'Sin marca')"
        join_extra     = "LEFT JOIN product_brands pb ON pb.id = p.brand_id"
        null_label     = "Sin marca"
    else:
        group_col_id   = "c.id"
        group_col_name = "COALESCE(c.category_name, 'Sin categoría')"
        group_by_sql   = "c.id, COALESCE(c.category_name, 'Sin categoría')"
        join_extra     = "LEFT JOIN categories c ON c.id = p.category_id"
        null_label     = "Sin categoría"

    async with db_manager.get_async_session() as session:
        if warehouse_ids:
            lp: dict = {}
            lf: list[str] = []
            _append_in_filter(lf, lp, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(lf)} ORDER BY warehouse_name"),
                lp,
            ))
            branch_label = ", ".join(f"Sucursal {w['warehouse_name']}" for w in wh_rows) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"

        group_rows = _rows(await session.execute(text(f"""
            SELECT
                {group_col_id}   AS group_id,
                {group_col_name} AS group_name,
                ROUND(SUM(sdl.paid_total_amount), 0) AS total,
                COALESCE(SUM(sdl.quantity), 0)                AS units,
                COUNT(DISTINCT sd.id)                         AS txn_count
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            LEFT JOIN products p ON p.id = sdl.product_id
            {join_extra}
            WHERE sd.deleted_at  IS NULL
              AND sdl.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sdl.paid_total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY {group_by_sql}
            ORDER BY total DESC
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)                         AS txn_count,
                ROUND(SUM(sdl.paid_total_amount), 0) AS total,
                COALESCE(SUM(sdl.quantity), 0)                AS units
            FROM sale_document_lines sdl
            JOIN sale_documents sd ON sd.id = sdl.sale_document_id
            WHERE sd.deleted_at  IS NULL
              AND sdl.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sdl.paid_total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

    grand_total = _money(total_row.get("total", 0))
    total_units = int(total_row.get("units") or 0)
    total_txn   = int(total_row.get("txn_count") or 0)
    avg_ticket  = round(grand_total / total_txn) if total_txn > 0 else 0
    top_name    = (group_rows[0].get("group_name") or null_label) if group_rows else "—"

    rows: list[dict] = []
    for r in group_rows:
        tv = _money(r["total"])
        uv = int(r.get("units") or 0)
        rows.append({
            "group_name": r.get("group_name") or null_label,
            "total":      tv,
            "units":      uv,
            "txn_count":  int(r.get("txn_count") or 0),
            "avg_unit":   round(tv / uv) if uv > 0 else 0,
            "pct":        round(tv / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{branch_label}</td></tr>'
        f'<tr><td>Agrupado por</td><td>{group_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{duration} días</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )

    kpi_specs = [
        ("primary", "Total período",           _clp(round(grand_total)), f"en {duration} días"),
        ("info",    f"{group_label_pl} activas", str(len(rows)),          "con ventas en el período"),
        ("info",    "Unidades vendidas",        str(total_units),         "artículos en ventas cerradas"),
        ("info",    "Transacciones",            str(total_txn),           "documentos de venta"),
        ("primary", "Ticket promedio",          _clp(avg_ticket),         "por transacción"),
        ("warning", f"{group_label} líder",     top_name,                 _clp(round(_money(group_rows[0]["total"]))) if group_rows else "—"),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {v}"><div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div><div class="kpi-hint">{hint}</div></div>'
        for v, lbl, val, hint in kpi_specs
    )

    executive_note = (
        f"Durante el período {period_label} se registraron {total_txn} transacciones "
        f"de ventas para {branch_label}, con un total de {_clp(round(grand_total))} "
        f"y {total_units:,} unidades vendidas. "
        f"La {group_label.lower()} con mayor facturación fue <strong>{top_name}</strong>."
    )

    ctx: dict = {
        "COMPANY_NAME":   "CeciChic",
        "LOGO_HTML":      '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS":  "INFORME",
        "REPORT_TITLE":   f"Ventas por {group_label.lower()}",
        "COVER_TITLE":    f"Ventas por<br>{group_label}",
        "COVER_SUBTITLE": (
            f"Desglose de ventas agrupado por {group_label.lower()} de producto. "
            f"Identifica las {group_label_pl.lower()} m&aacute;s rentables "
            f"por monto total, unidades y participaci&oacute;n porcentual."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(duration),
        "GROUP_LABEL":    group_label,
        "META_ROWS":      meta_rows,
        "KPI_CARDS":      kpi_cards,
        "EXECUTIVE_NOTE": executive_note,
        "CHART_PAGE":     "",
        "DETAIL_PAGES":   _build_category_table_pages(rows, group_label, grand_total, {
            "COMPANY_NAME":   "CeciChic",
            "REPORT_TITLE":   f"Ventas por {group_label.lower()}",
            "PERIOD_LABEL":   period_label,
            "BRANCH_LABEL":   branch_label,
            "TODAY":          today_str,
            "FOOTER_NOTE":    "Uso interno",
            "CURRENCY_LABEL": CURRENCY_LABEL,
        }),
    }
    return ctx


def _build_category_table_pages(
    rows: list[dict], group_label: str, grand_total: float, ctx: dict,
) -> str:
    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")

    chunks: list[list[dict]] = []
    if not rows:
        chunks = [[]]
    elif len(rows) <= _CAT_ROWS_FIRST:
        chunks = [rows]
    else:
        chunks.append(rows[:_CAT_ROWS_FIRST])
        rest = rows[_CAT_ROWS_FIRST:]
        while rest:
            chunks.append(rest[:_CAT_ROWS_REST])
            rest = rest[_CAT_ROWS_REST:]

    pages = []
    for page_idx, chunk in enumerate(chunks):
        section_html = ""
        if page_idx == 0:
            section_html = (
                '<div class="section-heading">'
                '<div class="section-label">Desglose</div>'
                f'<h2 class="section-title">Ventas por {group_label.lower()}</h2>'
                '</div>'
            )

        if chunk:
            tbody = "".join(
                '<tr>'
                f'<td style="font-weight:{"600" if i == 0 else "normal"}">{r["group_name"]}</td>'
                f'<td style="text-align:right">{r["units"]:,}</td>'
                f'<td style="text-align:right">{r["txn_count"]:,}</td>'
                f'<td style="text-align:right;font-weight:600">{_clp(round(r["total"]))}</td>'
                f'<td style="text-align:right">{r["pct"]:.1f}%</td>'
                f'<td style="text-align:right">{_clp(round(r["avg_unit"]))}</td>'
                '</tr>'
                for i, r in enumerate(chunk)
            )
        else:
            tbody = (
                '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">'
                'Sin ventas para los filtros seleccionados'
                '</td></tr>'
            )

        tfoot = ""
        if page_idx == len(chunks) - 1 and rows:
            tfoot = (
                '<tfoot><tr style="background:#0f172a;color:white;font-weight:700">'
                '<td style="padding:6px 8px;font-size:9px">TOTAL PERÍODO</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(r["units"] for r in rows):,}</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(r["txn_count"] for r in rows):,}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(grand_total))}</td>'
                '<td style="text-align:right;padding:6px 8px">100%</td>'
                '<td style="padding:6px 8px"></td>'
                '</tr></tfoot>'
            )

        pages.append(
            '<section class="report-page">'
            f'{page_hdr}'
            f'{section_html}'
            '<table class="detail-table">'
            '<colgroup>'
            '<col style="width:32%"><col style="width:10%"><col style="width:12%">'
            '<col style="width:18%"><col style="width:13%"><col style="width:15%">'
            '</colgroup>'
            '<thead><tr>'
            f'<th>{group_label}</th>'
            '<th style="text-align:right">Unidades</th>'
            '<th style="text-align:right">Transacciones</th>'
            '<th style="text-align:right">Total</th>'
            '<th style="text-align:right">% total</th>'
            '<th style="text-align:right">Precio prom.</th>'
            '</tr></thead>'
            f'<tbody>{tbody}</tbody>{tfoot}'
            '</table>'
            f'{page_ftr}'
            '</section>'
        )

    return "\n".join(pages)


@router.post("/sales/category-sales/pdf", response_class=Response)
async def category_sales_pdf(
    date_from:    str                  = Form(...),
    date_to:      str                  = Form(...),
    warehouse_id: str                  = Form("all"),
    group_by:     str                  = Form("category"),
    chart_bar:    Optional[UploadFile] = File(None),
    user:         dict                 = Depends(get_current_user),
):
    async def _chart_card(file, title) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{title}</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    group_label  = "Marca" if group_by == "brand" else "Categoría"
    chart_bar_card = await _chart_card(chart_bar, f"Top categorías por {group_label.lower()}")

    try:
        ctx = await _build_category_context(date_from, date_to, warehouse_id, group_by)
        if chart_bar_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading">'
                f'<div class="section-label">Gráfico</div>'
                f'<h2 class="section-title">Top por {group_label.lower()}</h2>'
                '</div>'
                f'{chart_bar_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html = _render("category_sales.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template category_sales: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    filename = f"ventas-{group_by}_{date_from}_{date_to}.pdf"

    try:
        loop      = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html.encode("utf-8"), settings.GOTENBERG_URL
        )
    except Exception as exc:
        logger.error("Gotenberg error category_sales: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Customer sales data ──────────────────────────────────────────────────────

_CLI_ROWS_FIRST = 22
_CLI_ROWS_REST  = 26


@router.get("/sales/customer-sales/data", response_class=JSONResponse)
async def customer_sales_data(
    date_from:     date       = Query(...),
    date_to:       date       = Query(...),
    warehouse_id:  int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    user:          dict       = Depends(get_current_user),
):
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    params: dict = {"date_from": date_from, "date_to": date_to}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    async with db_manager.get_async_session() as session:
        group_rows = _rows(await session.execute(text(f"""
            SELECT
                sd.customer_id,
                sd.customer_snapshot,
                COUNT(DISTINCT sd.id)                 AS txn_count,
                ROUND(SUM(sd.total_amount), 0)        AS total
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sd.customer_id
            ORDER BY total DESC
            LIMIT 500
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)          AS txn_count,
                ROUND(SUM(sd.total_amount), 0) AS total,
                COUNT(DISTINCT sd.customer_id) AS client_count
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

        detail_db = _rows(await session.execute(text(f"""
            SELECT
                sd.sale_code,
                COALESCE(sd.ticket_number, sd.sale_code)             AS folio,
                sd.customer_id,
                sd.customer_snapshot,
                DATE(COALESCE(sd.updated_at, sd.created_at))         AS sale_date,
                COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
                sd.payment_method_name,
                ROUND(sd.total_amount, 0)                            AS total
            FROM sale_documents sd
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            ORDER BY sale_date ASC, sd.id ASC
            LIMIT 2000
        """), params))

    grand_total = _money(total_row.get("total", 0))
    rows_out: list[dict] = []
    for r in group_rows:
        total_v = _money(r["total"])
        txn_v   = int(r.get("txn_count") or 0)
        rows_out.append({
            "customer_id":   r.get("customer_id"),
            "customer_name": _customer_name(r.get("customer_snapshot")),
            "customer_rut":  _customer_rut(r.get("customer_snapshot")),
            "txn_count":     txn_v,
            "total":         total_v,
            "avg_ticket":    round(total_v / txn_v) if txn_v > 0 else 0,
            "pct":           round(total_v / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    detail_rows_out = [
        {
            "sale_code":           r.get("sale_code"),
            "folio":               r.get("folio") or "",
            "customer_id":         r.get("customer_id"),
            "customer_name":       _customer_name(r.get("customer_snapshot")),
            "customer_rut":        _customer_rut(r.get("customer_snapshot")),
            "sale_date":           r["sale_date"].isoformat() if r.get("sale_date") and not isinstance(r["sale_date"], str) else (r.get("sale_date") or ""),
            "warehouse_name":      r.get("warehouse_name") or "",
            "payment_method_name": r.get("payment_method_name") or "",
            "total":               _money(r.get("total")),
        }
        for r in detail_db
    ]

    return JSONResponse({
        "rows":        rows_out,
        "detail_rows": detail_rows_out,
        "totals": {
            "total":        grand_total,
            "txn_count":    int(total_row.get("txn_count") or 0),
            "client_count": int(total_row.get("client_count") or 0),
        },
    })


# ─── Customer sales PDF ───────────────────────────────────────────────────────

async def _build_customer_context(
    date_from: str, date_to: str,
    warehouse_id_str: str,
) -> dict:
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    start         = date.fromisoformat(date_from)
    end           = date.fromisoformat(date_to)
    duration      = (end - start).days + 1
    today_str     = date.today().strftime("%d/%m/%Y")
    period_label  = f"{_fmt(date_from)} — {_fmt(date_to)}"

    params: dict = {"date_from": start, "date_to": end}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    async with db_manager.get_async_session() as session:
        if warehouse_ids:
            lp: dict = {}
            lf: list[str] = []
            _append_in_filter(lf, lp, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(lf)} ORDER BY warehouse_name"),
                lp,
            ))
            branch_label = ", ".join(f"Sucursal {w['warehouse_name']}" for w in wh_rows) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"

        group_rows = _rows(await session.execute(text(f"""
            SELECT
                sd.customer_id,
                sd.customer_snapshot,
                COUNT(DISTINCT sd.id)           AS txn_count,
                ROUND(SUM(sd.total_amount), 0)  AS total
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sd.customer_id
            ORDER BY total DESC
            LIMIT 500
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)          AS txn_count,
                ROUND(SUM(sd.total_amount), 0) AS total
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

    grand_total = _money(total_row.get("total", 0))
    total_txn   = int(total_row.get("txn_count") or 0)
    avg_ticket  = round(grand_total / total_txn) if total_txn > 0 else 0

    rows: list[dict] = []
    for r in group_rows:
        tv  = _money(r["total"])
        txn = int(r.get("txn_count") or 0)
        rows.append({
            "customer_name": _customer_name(r.get("customer_snapshot")),
            "customer_rut":  _customer_rut(r.get("customer_snapshot")),
            "txn_count":     txn,
            "total":         tv,
            "avg_ticket":    round(tv / txn) if txn > 0 else 0,
            "pct":           round(tv / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    top_name = rows[0]["customer_name"] if rows else "—"

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{branch_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{duration} días</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )

    kpi_specs = [
        ("primary", "Total período",        _clp(round(grand_total)), f"en {duration} días"),
        ("info",    "Clientes activos",     str(len(rows)),           "con compras en el período"),
        ("info",    "Transacciones",        str(total_txn),           "documentos de venta"),
        ("primary", "Ticket promedio",      _clp(avg_ticket),         "por transacción"),
        ("warning", "Cliente líder",        top_name,                 _clp(round(_money(group_rows[0]["total"]))) if group_rows else "—"),
        ("info",    "Compra prom./cliente", _clp(round(grand_total / len(rows))) if rows else "—", "promedio por cliente activo"),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {v}"><div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div><div class="kpi-hint">{hint}</div></div>'
        for v, lbl, val, hint in kpi_specs
    )

    executive_note = (
        f"Durante el período {period_label} se registraron {total_txn} transacciones "
        f"de ventas para {branch_label}, con un total de {_clp(round(grand_total))}. "
        f"Se identificaron {len(rows)} clientes con compras en el período. "
        f"El cliente con mayor facturación fue <strong>{top_name}</strong>."
    )

    ctx: dict = {
        "COMPANY_NAME":   "CeciChic",
        "LOGO_HTML":      '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS":  "INFORME",
        "REPORT_TITLE":   "Ventas por cliente",
        "COVER_TITLE":    "Ventas por<br>Cliente",
        "COVER_SUBTITLE": (
            "Desglose de ventas agrupado por cliente. "
            "Identifica los clientes m&aacute;s rentables por monto total, "
            "transacciones y ticket promedio."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(duration),
        "META_ROWS":      meta_rows,
        "KPI_CARDS":      kpi_cards,
        "EXECUTIVE_NOTE": executive_note,
        "CHART_PAGE":     "",
        "DETAIL_PAGES":   _build_client_table_pages(rows, grand_total, {
            "COMPANY_NAME":   "CeciChic",
            "REPORT_TITLE":   "Ventas por cliente",
            "PERIOD_LABEL":   period_label,
            "BRANCH_LABEL":   branch_label,
            "TODAY":          today_str,
            "FOOTER_NOTE":    "Uso interno",
            "CURRENCY_LABEL": CURRENCY_LABEL,
        }),
    }
    return ctx


def _build_client_table_pages(rows: list[dict], grand_total: float, ctx: dict) -> str:
    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")

    chunks: list[list[dict]] = []
    if not rows:
        chunks = [[]]
    elif len(rows) <= _CLI_ROWS_FIRST:
        chunks = [rows]
    else:
        chunks.append(rows[:_CLI_ROWS_FIRST])
        rest = rows[_CLI_ROWS_FIRST:]
        while rest:
            chunks.append(rest[:_CLI_ROWS_REST])
            rest = rest[_CLI_ROWS_REST:]

    pages = []
    for page_idx, chunk in enumerate(chunks):
        section_html = ""
        if page_idx == 0:
            section_html = (
                '<div class="section-heading">'
                '<div class="section-label">Desglose</div>'
                '<h2 class="section-title">Ventas por cliente</h2>'
                '</div>'
            )

        if chunk:
            tbody = "".join(
                '<tr>'
                f'<td style="font-weight:{"600" if i == 0 else "normal"}">{r["customer_name"]}</td>'
                f'<td style="font-size:8px;font-family:monospace">{r["customer_rut"]}</td>'
                f'<td style="text-align:right">{r["txn_count"]:,}</td>'
                f'<td style="text-align:right;font-weight:600">{_clp(round(r["total"]))}</td>'
                f'<td style="text-align:right">{r["pct"]:.1f}%</td>'
                f'<td style="text-align:right">{_clp(round(r["avg_ticket"]))}</td>'
                '</tr>'
                for i, r in enumerate(chunk)
            )
        else:
            tbody = (
                '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">'
                'Sin ventas para los filtros seleccionados'
                '</td></tr>'
            )

        tfoot = ""
        if page_idx == len(chunks) - 1 and rows:
            tfoot = (
                '<tfoot><tr style="background:#0f172a;color:white;font-weight:700">'
                '<td style="padding:6px 8px;font-size:9px" colspan="2">TOTAL PERÍODO</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(r["txn_count"] for r in rows):,}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(grand_total))}</td>'
                '<td style="text-align:right;padding:6px 8px">100%</td>'
                '<td style="padding:6px 8px"></td>'
                '</tr></tfoot>'
            )

        pages.append(
            '<section class="report-page">'
            f'{page_hdr}'
            f'{section_html}'
            '<table class="detail-table">'
            '<colgroup>'
            '<col style="width:28%"><col style="width:12%"><col style="width:10%">'
            '<col style="width:18%"><col style="width:12%"><col style="width:20%">'
            '</colgroup>'
            '<thead><tr>'
            '<th>Cliente</th>'
            '<th>RUT</th>'
            '<th style="text-align:right">Transacciones</th>'
            '<th style="text-align:right">Total</th>'
            '<th style="text-align:right">% total</th>'
            '<th style="text-align:right">Ticket prom.</th>'
            '</tr></thead>'
            f'<tbody>{tbody}</tbody>{tfoot}'
            '</table>'
            f'{page_ftr}'
            '</section>'
        )

    return "\n".join(pages)


@router.post("/sales/customer-sales/pdf", response_class=Response)
async def customer_sales_pdf(
    date_from:    str                  = Form(...),
    date_to:      str                  = Form(...),
    warehouse_id: str                  = Form("all"),
    chart_bar:    Optional[UploadFile] = File(None),
    user:         dict                 = Depends(get_current_user),
):
    async def _chart_card(file, title) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{title}</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    chart_bar_card = await _chart_card(chart_bar, "Top clientes por monto de ventas")

    try:
        ctx = await _build_customer_context(date_from, date_to, warehouse_id)
        if chart_bar_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading">'
                '<div class="section-label">Gráfico</div>'
                '<h2 class="section-title">Top 10 clientes</h2>'
                '</div>'
                f'{chart_bar_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html = _render("client_sales.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template client_sales: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    filename = f"ventas-cliente_{date_from}_{date_to}.pdf"

    try:
        loop      = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html.encode("utf-8"), settings.GOTENBERG_URL
        )
    except Exception as exc:
        logger.error("Gotenberg error client_sales: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ─── Seller ranking data ──────────────────────────────────────────────────────

_SLR_ROWS_FIRST = 24
_SLR_ROWS_REST  = 28


@router.get("/sales/seller-ranking/data", response_class=JSONResponse)
async def seller_ranking_data(
    date_from:     date       = Query(...),
    date_to:       date       = Query(...),
    warehouse_id:  int | None = Query(None),
    warehouse_ids: str | None = Query(None),
    user:          dict       = Depends(get_current_user),
):
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    selected_warehouse_ids = _parse_id_list(warehouse_ids) or ([warehouse_id] if warehouse_id else [])
    params: dict = {"date_from": date_from, "date_to": date_to}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", selected_warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    async with db_manager.get_async_session() as session:
        group_rows = _rows(await session.execute(text(f"""
            SELECT
                sd.closed_by_user_id                                        AS seller_id,
                COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Sin vendedor') AS seller_name,
                COUNT(DISTINCT sd.id)                                       AS txn_count,
                ROUND(SUM(sd.total_amount), 0)                              AS total
            FROM sale_documents sd
            LEFT JOIN users u ON u.id = sd.closed_by_user_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sd.closed_by_user_id, u.first_name, u.last_name
            ORDER BY total DESC
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)                  AS txn_count,
                ROUND(SUM(sd.total_amount), 0)         AS total,
                COUNT(DISTINCT sd.closed_by_user_id)   AS seller_count
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

        detail_db = _rows(await session.execute(text(f"""
            SELECT
                sd.sale_code,
                COALESCE(sd.ticket_number, sd.sale_code)                    AS folio,
                sd.closed_by_user_id                                        AS seller_id,
                COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Sin vendedor') AS seller_name,
                DATE(COALESCE(sd.updated_at, sd.created_at))                AS sale_date,
                COALESCE(w.warehouse_name, w.warehouse_code, 'Sin sucursal') AS warehouse_name,
                sd.payment_method_name,
                ROUND(sd.total_amount, 0)                                   AS total
            FROM sale_documents sd
            LEFT JOIN users u ON u.id = sd.closed_by_user_id
            LEFT JOIN warehouses w ON w.id = sd.warehouse_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            ORDER BY sale_date ASC, sd.id ASC
            LIMIT 2000
        """), params))

    grand_total = _money(total_row.get("total", 0))
    rows_out: list[dict] = []
    for r in group_rows:
        total_v = _money(r["total"])
        txn_v   = int(r.get("txn_count") or 0)
        rows_out.append({
            "seller_id":   r.get("seller_id"),
            "seller_name": r.get("seller_name") or "Sin vendedor",
            "txn_count":   txn_v,
            "total":       total_v,
            "avg_ticket":  round(total_v / txn_v) if txn_v > 0 else 0,
            "pct":         round(total_v / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    detail_rows_out = [
        {
            "sale_code":           r.get("sale_code"),
            "folio":               r.get("folio") or "",
            "seller_id":           r.get("seller_id"),
            "seller_name":         r.get("seller_name") or "Sin vendedor",
            "sale_date":           r["sale_date"].isoformat() if r.get("sale_date") and not isinstance(r["sale_date"], str) else (r.get("sale_date") or ""),
            "warehouse_name":      r.get("warehouse_name") or "",
            "payment_method_name": r.get("payment_method_name") or "",
            "total":               _money(r.get("total")),
        }
        for r in detail_db
    ]

    return JSONResponse({
        "rows":        rows_out,
        "detail_rows": detail_rows_out,
        "totals": {
            "total":        grand_total,
            "txn_count":    int(total_row.get("txn_count") or 0),
            "seller_count": int(total_row.get("seller_count") or 0),
        },
    })


# ─── Seller ranking PDF ───────────────────────────────────────────────────────

async def _build_seller_context(
    date_from: str, date_to: str,
    warehouse_id_str: str,
) -> dict:
    warehouse_ids = [] if warehouse_id_str in ("all", "", "todas", None) else _parse_id_list(warehouse_id_str)
    start         = date.fromisoformat(date_from)
    end           = date.fromisoformat(date_to)
    duration      = (end - start).days + 1
    today_str     = date.today().strftime("%d/%m/%Y")
    period_label  = f"{_fmt(date_from)} — {_fmt(date_to)}"

    params: dict = {"date_from": start, "date_to": end}
    warehouse_filters: list[str] = []
    _append_in_filter(warehouse_filters, params, "sd.warehouse_id", warehouse_ids, "warehouse_id")
    warehouse_clause = f"AND {' AND '.join(warehouse_filters)}" if warehouse_filters else ""

    async with db_manager.get_async_session() as session:
        if warehouse_ids:
            lp: dict = {}
            lf: list[str] = []
            _append_in_filter(lf, lp, "id", warehouse_ids, "wid")
            wh_rows = _rows(await session.execute(
                text(f"SELECT warehouse_name FROM warehouses WHERE {' AND '.join(lf)} ORDER BY warehouse_name"),
                lp,
            ))
            branch_label = ", ".join(f"Sucursal {w['warehouse_name']}" for w in wh_rows) or "Locaciones seleccionadas"
        else:
            branch_label = "Todas las locaciones"

        group_rows = _rows(await session.execute(text(f"""
            SELECT
                sd.closed_by_user_id                                        AS seller_id,
                COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Sin vendedor') AS seller_name,
                COUNT(DISTINCT sd.id)                                       AS txn_count,
                ROUND(SUM(sd.total_amount), 0)                              AS total
            FROM sale_documents sd
            LEFT JOIN users u ON u.id = sd.closed_by_user_id
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
            GROUP BY sd.closed_by_user_id, u.first_name, u.last_name
            ORDER BY total DESC
        """), params))

        total_row = _row(await session.execute(text(f"""
            SELECT
                COUNT(DISTINCT sd.id)          AS txn_count,
                ROUND(SUM(sd.total_amount), 0) AS total
            FROM sale_documents sd
            WHERE sd.deleted_at IS NULL
              AND sd.status = 'CLOSED'
              AND sd.document_type_code NOT IN ('RETURN_TICKET', 'EXCHANGE_DRAFT')
              AND sd.total_amount > 0
              AND DATE(COALESCE(sd.updated_at, sd.created_at)) BETWEEN :date_from AND :date_to
              {warehouse_clause}
        """), params))

    grand_total = _money(total_row.get("total", 0))
    total_txn   = int(total_row.get("txn_count") or 0)
    avg_ticket  = round(grand_total / total_txn) if total_txn > 0 else 0

    rows: list[dict] = []
    for r in group_rows:
        tv  = _money(r["total"])
        txn = int(r.get("txn_count") or 0)
        rows.append({
            "seller_name": r.get("seller_name") or "Sin vendedor",
            "txn_count":   txn,
            "total":       tv,
            "avg_ticket":  round(tv / txn) if txn > 0 else 0,
            "pct":         round(tv / grand_total * 100, 1) if grand_total > 0 else 0.0,
        })

    top_name = rows[0]["seller_name"] if rows else "—"

    meta_rows = (
        f'<tr><td>Período</td><td>{period_label}</td></tr>'
        f'<tr><td>Locación</td><td>{branch_label}</td></tr>'
        f'<tr><td>Total de días</td><td>{duration} días</td></tr>'
        f'<tr><td>Moneda</td><td>{CURRENCY_LABEL}</td></tr>'
        f'<tr><td>Generado el</td><td>{today_str}</td></tr>'
    )

    kpi_specs = [
        ("primary", "Total período",      _clp(round(grand_total)), f"en {duration} días"),
        ("info",    "Vendedores activos", str(len(rows)),           "con ventas en el período"),
        ("info",    "Transacciones",      str(total_txn),           "documentos de venta"),
        ("primary", "Ticket promedio",    _clp(avg_ticket),         "por transacción"),
        ("warning", "Vendedor líder",     top_name,                 _clp(round(_money(group_rows[0]["total"]))) if group_rows else "—"),
        ("info",    "Ticket prom. líder", _clp(round(_money(group_rows[0]["total"]) / max(int(group_rows[0]["txn_count"]), 1))) if group_rows else "—",
                    f"{int(group_rows[0]['txn_count']) if group_rows else 0} transacciones"),
    ]
    kpi_cards = "".join(
        f'<div class="kpi-card {v}"><div class="kpi-label">{lbl}</div>'
        f'<div class="kpi-value">{val}</div><div class="kpi-hint">{hint}</div></div>'
        for v, lbl, val, hint in kpi_specs
    )

    executive_note = (
        f"Durante el período {period_label} se registraron {total_txn} transacciones "
        f"de ventas para {branch_label}, con un total de {_clp(round(grand_total))}. "
        f"Participaron {len(rows)} vendedor{'es' if len(rows) != 1 else ''} en el período. "
        f"El vendedor con mayor facturación fue <strong>{top_name}</strong>."
    )

    ctx: dict = {
        "COMPANY_NAME":   "CeciChic",
        "LOGO_HTML":      '<span class="cover-logo-fallback">CECICHIC</span>',
        "REPORT_STATUS":  "INFORME",
        "REPORT_TITLE":   "Ranking de vendedores",
        "COVER_TITLE":    "Ranking de<br>Vendedores",
        "COVER_SUBTITLE": (
            "Clasificaci&oacute;n de vendedores por monto total de ventas. "
            "Identifica los vendedores m&aacute;s productivos por facturaci&oacute;n, "
            "transacciones y ticket promedio."
        ),
        "CURRENCY_LABEL": CURRENCY_LABEL,
        "FOOTER_NOTE":    "Uso interno",
        "PERIOD_LABEL":   period_label,
        "BRANCH_LABEL":   branch_label,
        "TODAY":          today_str,
        "TOTAL_DAYS":     str(duration),
        "META_ROWS":      meta_rows,
        "KPI_CARDS":      kpi_cards,
        "EXECUTIVE_NOTE": executive_note,
        "CHART_PAGE":     "",
        "DETAIL_PAGES":   _build_seller_table_pages(rows, grand_total, {
            "COMPANY_NAME":   "CeciChic",
            "REPORT_TITLE":   "Ranking de vendedores",
            "PERIOD_LABEL":   period_label,
            "BRANCH_LABEL":   branch_label,
            "TODAY":          today_str,
            "FOOTER_NOTE":    "Uso interno",
            "CURRENCY_LABEL": CURRENCY_LABEL,
        }),
    }
    return ctx


def _build_seller_table_pages(rows: list[dict], grand_total: float, ctx: dict) -> str:
    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")

    chunks: list[list[dict]] = []
    if not rows:
        chunks = [[]]
    elif len(rows) <= _SLR_ROWS_FIRST:
        chunks = [rows]
    else:
        chunks.append(rows[:_SLR_ROWS_FIRST])
        rest = rows[_SLR_ROWS_FIRST:]
        while rest:
            chunks.append(rest[:_SLR_ROWS_REST])
            rest = rest[_SLR_ROWS_REST:]

    pages = []
    for page_idx, chunk in enumerate(chunks):
        section_html = ""
        if page_idx == 0:
            section_html = (
                '<div class="section-heading">'
                '<div class="section-label">Clasificación</div>'
                '<h2 class="section-title">Ranking de vendedores</h2>'
                '</div>'
            )

        base_idx = sum(len(chunks[j]) for j in range(page_idx))

        if chunk:
            tbody = "".join(
                '<tr>'
                f'<td style="text-align:center;font-size:{"14" if (base_idx + i) < 3 else "10"}px">'
                f'{"🥇🥈🥉"[base_idx + i] if (base_idx + i) < 3 else str(base_idx + i + 1)}</td>'
                f'<td style="font-weight:{"700" if (base_idx + i) == 0 else "normal"}">{r["seller_name"]}</td>'
                f'<td style="text-align:right">{r["txn_count"]:,}</td>'
                f'<td style="text-align:right;font-weight:600">{_clp(round(r["total"]))}</td>'
                f'<td style="text-align:right">{r["pct"]:.1f}%</td>'
                f'<td style="text-align:right">{_clp(round(r["avg_ticket"]))}</td>'
                '</tr>'
                for i, r in enumerate(chunk)
            )
        else:
            tbody = (
                '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8">'
                'Sin ventas para los filtros seleccionados'
                '</td></tr>'
            )

        tfoot = ""
        if page_idx == len(chunks) - 1 and rows:
            tfoot = (
                '<tfoot><tr style="background:#0f172a;color:white;font-weight:700">'
                '<td style="padding:6px 8px"></td>'
                '<td style="padding:6px 8px;font-size:9px">TOTAL PERÍODO</td>'
                f'<td style="text-align:right;padding:6px 8px">{sum(r["txn_count"] for r in rows):,}</td>'
                f'<td style="text-align:right;padding:6px 8px">{_clp(round(grand_total))}</td>'
                '<td style="text-align:right;padding:6px 8px">100%</td>'
                '<td style="padding:6px 8px"></td>'
                '</tr></tfoot>'
            )

        pages.append(
            '<section class="report-page">'
            f'{page_hdr}'
            f'{section_html}'
            '<table class="detail-table">'
            '<colgroup>'
            '<col style="width:6%"><col style="width:34%"><col style="width:12%">'
            '<col style="width:20%"><col style="width:12%"><col style="width:16%">'
            '</colgroup>'
            '<thead><tr>'
            '<th>#</th>'
            '<th>Vendedor</th>'
            '<th style="text-align:right">Transacciones</th>'
            '<th style="text-align:right">Total</th>'
            '<th style="text-align:right">% total</th>'
            '<th style="text-align:right">Ticket prom.</th>'
            '</tr></thead>'
            f'<tbody>{tbody}</tbody>{tfoot}'
            '</table>'
            f'{page_ftr}'
            '</section>'
        )

    return "\n".join(pages)


@router.post("/sales/seller-ranking/pdf", response_class=Response)
async def seller_ranking_pdf(
    date_from:    str                  = Form(...),
    date_to:      str                  = Form(...),
    warehouse_id: str                  = Form("all"),
    chart_bar:    Optional[UploadFile] = File(None),
    user:         dict                 = Depends(get_current_user),
):
    async def _chart_card(file, title) -> str:
        if not file:
            return ""
        raw = await file.read()
        if not raw:
            return ""
        b64 = base64.b64encode(raw).decode()
        return (
            '<div class="chart-card no-break">'
            f'<div class="chart-header"><div class="chart-header-title">{title}</div></div>'
            '<div class="chart-section" style="min-height:0">'
            f'<img src="data:image/png;base64,{b64}" style="width:100%;height:auto;display:block;" />'
            '</div></div>'
        )

    chart_bar_card = await _chart_card(chart_bar, "Ranking por monto total de ventas")

    try:
        ctx = await _build_seller_context(date_from, date_to, warehouse_id)
        if chart_bar_card:
            chart_page = (
                '<section class="report-page">'
                '{{> _page_header}}'
                '<div class="section-heading">'
                '<div class="section-label">Gráfico</div>'
                '<h2 class="section-title">Ranking de vendedores</h2>'
                '</div>'
                f'{chart_bar_card}'
                '{{> _page_footer}}'
                '</section>'
            )
            chart_page = _resolve_partials(chart_page)
            for key, value in ctx.items():
                chart_page = chart_page.replace(f"{{{{{key}}}}}", str(value))
            ctx["CHART_PAGE"] = chart_page
        html = _render("seller_ranking.html", ctx)
    except Exception as exc:
        logger.error("Error preparando template seller_ranking: %s", exc)
        return JSONResponse({"error": "Error preparando reporte", "detail": str(exc)}, status_code=500)

    filename = f"ranking-vendedores_{date_from}_{date_to}.pdf"

    try:
        loop      = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            None, _call_gotenberg_sync, html.encode("utf-8"), settings.GOTENBERG_URL
        )
    except Exception as exc:
        logger.error("Gotenberg error seller_ranking: %s", exc)
        return JSONResponse({"error": "Error generando PDF", "detail": str(exc)}, status_code=500)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
