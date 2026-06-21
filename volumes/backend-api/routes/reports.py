"""
routes/reports.py
Generación de reportes PDF usando Gotenberg (HTML → PDF).
Template: templates/reports/daily_sales.html
"""
import asyncio
import base64
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
