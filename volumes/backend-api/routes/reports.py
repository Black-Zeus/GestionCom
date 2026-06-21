"""
routes/reports.py
Generación de reportes PDF usando Gotenberg (HTML → PDF).
Template: templates/reports/daily_sales.html
"""
import asyncio
import json
import math
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from core.config import settings
from database.database import db_manager
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Reports"],
    responses={
        503: {"description": "Servicio de generación PDF no disponible"},
    },
)

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
    if warehouse_id:
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
                ORDER BY COALESCE(sd.updated_at, sd.created_at) DESC, sd.id DESC
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


# ─── Table pagination ─────────────────────────────────────────────────────

_ROWS_FIRST = 22   # first table page (has section heading)
_ROWS_REST  = 26   # continuation pages

_TABLE_COLGROUP = (
    '<colgroup>'
    '<col class="date-column"><col class="txn-column"><col class="amount-column">'
    '<col class="ticket-column"><col class="payment-column"><col class="payment-column">'
    '<col class="payment-column"><col class="payment-column"><col class="cancel-column">'
    '</colgroup>'
)
_TABLE_THEAD = (
    '<thead><tr>'
    '<th>Fecha</th><th>Txn</th><th>Total</th><th>Ticket prom.</th>'
    '<th>Efectivo</th><th>D&eacute;bito</th><th>Cr&eacute;dito</th>'
    '<th>Transfer.</th><th>Anuladas</th>'
    '</tr></thead>'
)


def _table_row(r: dict, best_row: dict | None) -> str:
    is_best  = best_row and r["iso"] == best_row["iso"]
    marker   = "&#9733; " if is_best else ""
    row_cls  = ' class="best-row"' if is_best else ""
    can_cell = (
        f'<span class="negative">{r["cancelled"]}</span>'
        if r["cancelled"] > 0 else '<span class="dim">&#8212;</span>'
    )
    return (
        f'<tr{row_cls}>'
        f'<td class="date-cell">{marker}{_fmt(r["iso"])}<small>{r["weekday"]}</small></td>'
        f'<td class="num">{r["txn"]}</td>'
        f'<td class="num amount-cell">{_clp(r["total"])}</td>'
        f'<td class="num muted">{_clp(r["avg_ticket"])}</td>'
        f'<td class="num muted">{_clp(r["efectivo"])}</td>'
        f'<td class="num muted">{_clp(r["debito"])}</td>'
        f'<td class="num muted">{_clp(r["credito"])}</td>'
        f'<td class="num muted">{_clp(r["transferencia"])}</td>'
        f'<td class="num">{can_cell}</td>'
        f'</tr>'
    )


def _build_detail_pages(rows: list[dict], best_row: dict | None, ctx: dict) -> str:
    """Generate one <section class="report-page"> per page of table data."""

    def _partial(name: str) -> str:
        path    = os.path.join(_PARTIALS_DIR, f"{name}.html")
        content = _load_file(path)
        for k, v in ctx.items():
            content = content.replace(f"{{{{{k}}}}}", str(v))
        return content

    page_hdr = _partial("_page_header")
    page_ftr = _partial("_page_footer")

    # Split rows into chunks
    chunks: list[list[dict]] = []
    if len(rows) <= _ROWS_FIRST:
        chunks = [rows]
    else:
        chunks.append(rows[:_ROWS_FIRST])
        rest = rows[_ROWS_FIRST:]
        while rest:
            chunks.append(rest[:_ROWS_REST])
            rest = rest[_ROWS_REST:]

    total_txn  = sum(r["txn"]           for r in rows)
    total_amt  = sum(r["total"]         for r in rows)
    total_ef   = sum(r["efectivo"]      for r in rows)
    total_db   = sum(r["debito"]        for r in rows)
    total_cr   = sum(r["credito"]       for r in rows)
    total_tr   = sum(r["transferencia"] for r in rows)
    total_can  = sum(r["cancelled"]     for r in rows)
    avg        = round(total_amt / max(total_txn, 1))

    html = ""
    for pi, chunk in enumerate(chunks):
        is_first = pi == 0
        is_last  = pi == len(chunks) - 1

        heading = ""
        if is_first:
            heading = (
                '<div class="section-heading">'
                '<div class="section-label">Detalle transaccional</div>'
                '<h2 class="section-title">Resultados diarios</h2>'
                '<p class="section-description">'
                'Distribuci&oacute;n de ventas y transacciones por fecha, incluyendo '
                'ticket promedio, medios de pago y operaciones anuladas.'
                '</p></div>'
            )

        tbody = "".join(_table_row(r, best_row) for r in chunk)

        tfoot = ""
        if is_last:
            tfoot = (
                f'<tfoot><tr>'
                f'<td>TOTAL PER&Iacute;ODO</td>'
                f'<td class="num">{total_txn}</td>'
                f'<td class="num">{_clp(total_amt)}</td>'
                f'<td class="num">{_clp(avg)}</td>'
                f'<td class="num">{_clp(total_ef)}</td>'
                f'<td class="num">{_clp(total_db)}</td>'
                f'<td class="num">{_clp(total_cr)}</td>'
                f'<td class="num">{_clp(total_tr)}</td>'
                f'<td class="num">{total_can}</td>'
                f'</tr></tfoot>'
            )

        note = ""
        if is_last:
            note = (
                '<div class="table-note"><strong>Nota:</strong> el ticket promedio '
                'corresponde al total vendido dividido por la cantidad de transacciones '
                'v&aacute;lidas del d&iacute;a. Las operaciones anuladas se contabilizan '
                'separadamente y no forman parte del total neto.</div>'
            )

        html += (
            '\n  <section class="report-page">'
            f'\n    {page_hdr}'
            f'\n    {heading}'
            '\n    <div class="table-wrapper">'
            f'\n      <table class="report-table">{_TABLE_COLGROUP}{_TABLE_THEAD}'
            f'<tbody>{tbody}</tbody>{tfoot}</table>'
            '\n    </div>'
            f'\n    {note}'
            f'\n    {page_ftr}'
            '\n  </section>'
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


# ─── Full context builder ──────────────────────────────────────────────────

def _build_context(date_from: str, date_to: str, branch: str) -> dict:
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

    report_id = uuid.uuid4().hex[:8].upper()

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
        "CURRENCY_LABEL": "CLP",
        "REPORT_ID":      report_id,
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


# ─── Endpoint ──────────────────────────────────────────────────────────────

@router.get("/daily-sales/pdf", response_class=Response)
async def daily_sales_pdf(
    date_from: str = Query(..., description="Fecha inicio YYYY-MM-DD", alias="date_from"),
    date_to:   str = Query(..., description="Fecha fin YYYY-MM-DD",    alias="date_to"),
    branch:    str = Query("all", description="Sucursal (all | Centro | Mall | Norte)"),
):
    try:
        ctx  = _build_context(date_from, date_to, branch)
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
