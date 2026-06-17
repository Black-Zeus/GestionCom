"""
Rutas para consulta y sincronización de tipos de cambio desde ExchangeRate-API.
La divisa base se obtiene dinámicamente de currencies.is_base_currency.
"""
import asyncio
import datetime
import json
import urllib.request
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel as PydanticBaseModel, Field
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Currency Rates"])

RATES_URL = "https://open.er-api.com/v6/latest/USD"
SOURCE_NAME = "ExchangeRate-API"
# Divisa base de la API (siempre USD — el endpoint /v6/latest/USD devuelve rates["USD"]=1.0)
API_BASE = "USD"

# Divisas a persistir; la divisa base de la empresa se excluye dinámicamente en el sync
QUOTES = {
    "USD", "EUR", "ARS", "BRL", "PEN", "COP", "MXN",
    "UYU", "BOB", "PYG", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY",
}


class ManualRatePayload(PydanticBaseModel):
    currency_code: str = Field(min_length=3, max_length=3)
    rate_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    rate_value: Decimal = Field(gt=0, description="Tasa de mercado: cuántas unidades base por 1 unidad de esta divisa")
    source_name: Optional[str] = Field(default="Manual", max_length=100)


def _six(v) -> Decimal:
    return Decimal(str(v or 0)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


@router.get("", response_class=JSONResponse)
async def list_rates(request: Request, user: dict = Depends(get_current_user)):
    """Retorna el tipo de cambio más reciente por divisa."""
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text("""
                SELECT
                    r.id,
                    r.currency_code,
                    r.base_currency_code,
                    c.currency_name,
                    c.currency_symbol,
                    c.conversion_fee_pct,
                    r.rate_date,
                    r.rate_value,
                    r.fee_pct,
                    r.effective_rate,
                    r.source_name,
                    r.source_reference,
                    r.created_at
                FROM currency_exchange_rates r
                JOIN currencies c ON c.currency_code = r.currency_code
                WHERE r.id = (
                    SELECT r2.id
                    FROM currency_exchange_rates r2
                    WHERE r2.currency_code = r.currency_code
                      AND r2.base_currency_code = r.base_currency_code
                    ORDER BY r2.rate_date DESC, r2.created_at DESC
                    LIMIT 1
                )
                ORDER BY c.currency_name
            """)
        )
        rows = [dict(row._mapping) for row in result]
        data = []
        for r in rows:
            current_fee_pct = Decimal(str(r["conversion_fee_pct"] or 0))
            rate_value = Decimal(str(r["rate_value"] or 0))
            effective_rate = _six(rate_value * (1 - current_fee_pct / 100)) if rate_value else Decimal("0")
            data.append({
                "id": r["id"],
                "currency_code": r["currency_code"],
                "base_currency_code": r["base_currency_code"],
                "currency_name": r["currency_name"],
                "currency_symbol": r["currency_symbol"],
                "rate_date": str(r["rate_date"]),
                "rate_value": str(rate_value),
                "fee_pct": str(current_fee_pct),
                "effective_rate": str(effective_rate),
                "source_name": r["source_name"],
                "fetched_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        return ResponseManager.success(data=data, request=request)


@router.post("/sync", response_class=JSONResponse)
async def sync_rates(request: Request, user: dict = Depends(get_current_user)):
    """Obtiene los tipos de cambio desde ExchangeRate-API y los persiste en la BD."""

    def _fetch():
        req = urllib.request.Request(
            RATES_URL,
            headers={"Accept": "application/json", "User-Agent": "GestionCom/1.0"},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())

    loop = asyncio.get_event_loop()
    try:
        raw = await loop.run_in_executor(None, _fetch)
    except Exception as exc:
        return ResponseManager.error(
            message=f"No fue posible obtener los tipos de cambio: {exc}",
            status_code=HTTPStatus.BAD_GATEWAY,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            error_type=ErrorType.RESOURCE_ERROR,
            request=request,
        )

    if raw.get("result") != "success" or "rates" not in raw:
        return ResponseManager.error(
            message=f"Respuesta inesperada del servicio de tipos de cambio: {raw.get('error-type', 'unknown')}",
            status_code=HTTPStatus.BAD_GATEWAY,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            error_type=ErrorType.RESOURCE_ERROR,
            request=request,
        )

    all_rates = raw["rates"]

    async with db_manager.get_async_session() as session:
        # Leer divisa base + fees de conversión desde currencies
        base_row = await session.execute(
            text("SELECT currency_code FROM currencies WHERE is_base_currency = 1 LIMIT 1")
        )
        base_row = base_row.fetchone()
        if not base_row:
            return ResponseManager.error(
                message="No hay una divisa base configurada en el catálogo de monedas.",
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        target_base = base_row[0]  # ej: "CLP"

        if target_base not in all_rates and target_base != API_BASE:
            return ResponseManager.error(
                message=f"La divisa base '{target_base}' no está disponible en el API de tasas.",
                status_code=HTTPStatus.BAD_GATEWAY,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )

        # Tasa de la divisa base respecto a la API base (USD)
        # Si target_base = CLP: base_rate = rates["CLP"] (cuántos CLP por 1 USD)
        # Si target_base = USD: base_rate = 1.0 (trivial)
        base_rate = Decimal(str(all_rates[target_base])) if target_base != API_BASE else Decimal("1")

        unix_ts = raw.get("time_last_update_unix")
        if unix_ts:
            rate_date_str = datetime.datetime.fromtimestamp(
                int(unix_ts), tz=datetime.timezone.utc
            ).strftime("%Y-%m-%d")
        else:
            rate_date_str = str(datetime.date.today())

        user_id = int(user.get("user_id") or user.get("id") or 0) or None

        # Leer fees de conversión por divisa
        fee_rows = await session.execute(
            text("SELECT currency_code, conversion_fee_pct FROM currencies WHERE conversion_fee_pct > 0")
        )
        fee_map = {r[0]: Decimal(str(r[1])) for r in fee_rows.fetchall()}

        # Persistir todas las divisas de QUOTES excepto la divisa base de la empresa
        quote_map = {
            k: Decimal(str(v))
            for k, v in all_rates.items()
            if k in QUOTES and k != target_base
        }

        saved = []

        # Insertar la divisa base con tasa 1:1 (sin fee) para completar la tabla
        await session.execute(
            text("""
                INSERT INTO currency_exchange_rates
                    (currency_code, base_currency_code, rate_date, rate_value,
                     fee_pct, effective_rate,
                     source_name, source_reference, created_by_user_id)
                VALUES
                    (:code, :base, :rate_date, 1.000000, 0.00, 1.000000, :source, :ref, :user_id)
            """),
            {
                "code": target_base,
                "base": target_base,
                "rate_date": rate_date_str,
                "source": SOURCE_NAME,
                "ref": RATES_URL,
                "user_id": user_id,
            },
        )
        saved.append({"currency_code": target_base, "rate_value": "1.000000", "fee_pct": "0.00", "effective_rate": "1.000000"})

        for quote, fx_rate in quote_map.items():
            if fx_rate == 0:
                continue
            # rate_value = cuántas unidades de target_base por 1 unidad de quote
            # effective_rate = rate_value * (1 - fee_pct/100)
            rate_value = _six(base_rate / fx_rate)
            fee_pct = fee_map.get(quote, Decimal("0"))
            effective_rate = _six(rate_value * (1 - fee_pct / 100))
            await session.execute(
                text("""
                    INSERT INTO currency_exchange_rates
                        (currency_code, base_currency_code, rate_date, rate_value,
                         fee_pct, effective_rate,
                         source_name, source_reference, created_by_user_id)
                    VALUES
                        (:code, :base, :rate_date, :rate_value,
                         :fee_pct, :effective_rate,
                         :source, :ref, :user_id)
                """),
                {
                    "code": quote,
                    "base": target_base,
                    "rate_date": rate_date_str,
                    "rate_value": str(rate_value),
                    "fee_pct": str(fee_pct),
                    "effective_rate": str(effective_rate),
                    "source": SOURCE_NAME,
                    "ref": RATES_URL,
                    "user_id": user_id,
                },
            )
            saved.append({"currency_code": quote, "rate_value": str(rate_value), "fee_pct": str(fee_pct), "effective_rate": str(effective_rate)})

        await session.flush()

    return ResponseManager.success(
        data={
            "synced": len(saved),
            "base_currency": target_base,
            "rate_date": rate_date_str,
            "rates": saved,
        },
        message=f"Tipos de cambio actualizados al {rate_date_str} (base: {target_base}).",
        request=request,
    )


@router.post("/manual", response_class=JSONResponse)
async def save_manual_rate(data: ManualRatePayload, request: Request, user: dict = Depends(get_current_user)):
    """Registra un tipo de cambio de forma manual para una divisa específica."""
    async with db_manager.get_async_session() as session:
        # Divisa base de la empresa
        base_row = await session.execute(
            text("SELECT currency_code FROM currencies WHERE is_base_currency = 1 LIMIT 1")
        )
        base_row = base_row.fetchone()
        if not base_row:
            return ResponseManager.error(
                message="No hay una divisa base configurada.",
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        target_base = base_row[0]

        if data.currency_code == target_base:
            return ResponseManager.error(
                message=f"No es necesario registrar la divisa base ({target_base}) manualmente — su tasa es siempre 1:1.",
                status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
                error_code=ErrorCode.VALIDATION_ERROR,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        # Fee de conversión de la divisa
        fee_row = await session.execute(
            text("SELECT conversion_fee_pct FROM currencies WHERE currency_code = :code AND is_active = 1 LIMIT 1"),
            {"code": data.currency_code},
        )
        fee_row = fee_row.fetchone()
        if fee_row is None:
            return ResponseManager.error(
                message=f"La divisa '{data.currency_code}' no existe o no está activa.",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        fee_pct = Decimal(str(fee_row[0] or 0))
        effective_rate = _six(data.rate_value * (1 - fee_pct / 100))

        user_id = int(user.get("user_id") or user.get("id") or 0) or None
        source = (data.source_name or "Manual").strip() or "Manual"

        await session.execute(
            text("""
                INSERT INTO currency_exchange_rates
                    (currency_code, base_currency_code, rate_date, rate_value,
                     fee_pct, effective_rate, source_name, created_by_user_id)
                VALUES
                    (:code, :base, :rate_date, :rate_value,
                     :fee_pct, :effective_rate, :source, :user_id)
            """),
            {
                "code": data.currency_code,
                "base": target_base,
                "rate_date": data.rate_date,
                "rate_value": str(_six(data.rate_value)),
                "fee_pct": str(fee_pct),
                "effective_rate": str(effective_rate),
                "source": source,
                "user_id": user_id,
            },
        )
        await session.flush()

    return ResponseManager.success(
        data={
            "currency_code": data.currency_code,
            "base_currency_code": target_base,
            "rate_date": data.rate_date,
            "rate_value": str(_six(data.rate_value)),
            "fee_pct": str(fee_pct),
            "effective_rate": str(effective_rate),
        },
        message=f"Tasa de {data.currency_code} registrada manualmente para el {data.rate_date}.",
        request=request,
    )
