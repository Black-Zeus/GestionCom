"""
Configuracion operativa de facturacion electronica / DTE.
"""
from http import HTTPStatus as StdHTTPStatus

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Electronic Billing"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_dte_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["DTE_ACCESS", "DTE_VIEW", "DTE_CONFIG_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(
        message="Acceso denegado",
        status_code=HTTPStatus.FORBIDDEN,
        error_code=ErrorCode.PERMISSION_DENIED,
        error_type=ErrorType.PERMISSION_ERROR,
        details="Se requiere permiso para ver configuracion DTE",
        request=request,
    )
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_dte_manage(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["DTE_CONFIG_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(
        message="Acceso denegado",
        status_code=HTTPStatus.FORBIDDEN,
        error_code=ErrorCode.PERMISSION_DENIED,
        error_type=ErrorType.PERMISSION_ERROR,
        details="Se requiere permiso para administrar configuracion DTE",
        request=request,
    )
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


class ElectronicBillingConfigUpdate(BaseModel):
    dte_enabled: bool = False
    default_provider: str = Field(default="NONE")
    default_emission_mode: str = Field(default="MANUAL")
    allow_internal_ticket_when_disabled: bool = True
    require_dte_for_dte_document_types: bool = False
    retry_enabled: bool = True
    max_retry_attempts: int = Field(default=3, ge=0, le=10)

    company_config_id: int | None = None
    company_dte_enabled: bool = False
    company_provider: str = Field(default="NONE")
    company_emission_mode: str = Field(default="MANUAL")
    send_dte_email_by_default: bool = False
    dte_activation_notes: str | None = None

    provider_config_id: int | None = None
    provider_code: str = Field(default="LIBREDTE")
    provider_name: str = Field(default="LibreDTE")
    environment: str = Field(default="CERTIFICACION")
    base_url: str = Field(default="https://libredte.cl/api")
    api_token_secret_name: str | None = None
    api_token_or_hash: str | None = None
    clear_api_token: bool = False
    webhook_secret: str | None = None
    clear_webhook_secret: bool = False
    timeout_seconds: int = Field(default=30, ge=5, le=180)
    provider_is_active: bool = False


def _bool(value) -> bool:
    return bool(int(value or 0))


def _row(mapping):
    return dict(mapping) if mapping else None


def _valid_choice(value: str, choices: set[str], fallback: str) -> str:
    normalized = str(value or fallback).upper()
    return normalized if normalized in choices else fallback


async def _sync_dte_document_types(session, enabled: bool):
    active_value = int(enabled)
    await session.execute(text(
        """
        UPDATE dte_document_type_settings
        SET is_enabled = :active_value
        WHERE deleted_at IS NULL
        """
    ), {"active_value": active_value})
    await session.execute(text(
        """
        UPDATE document_types
        SET is_active = :active_value
        WHERE deleted_at IS NULL
          AND document_type_code LIKE 'DTE\\_%'
        """
    ), {"active_value": active_value})


async def _get_config(session):
    settings = _row((await session.execute(text("SELECT * FROM dte_system_settings WHERE id = 1"))).mappings().first())
    if not settings:
        await session.execute(text("INSERT INTO dte_system_settings (id) VALUES (1)"))
        settings = _row((await session.execute(text("SELECT * FROM dte_system_settings WHERE id = 1"))).mappings().first())

    company = _row((await session.execute(text(
        """
        SELECT *
        FROM dte_company_config
        WHERE deleted_at IS NULL
        ORDER BY is_active DESC, id ASC
        LIMIT 1
        """
    ))).mappings().first())

    provider = None
    if company:
        provider = _row((await session.execute(text(
            """
            SELECT *
            FROM dte_provider_configs
            WHERE company_config_id = :company_id
              AND deleted_at IS NULL
            ORDER BY is_active DESC, provider_code = 'LIBREDTE' DESC, id ASC
            LIMIT 1
            """
        ), {"company_id": company["id"]})).mappings().first())

    document_types = (await session.execute(text(
        """
        SELECT
          dts.id,
          dt.id AS document_type_id,
          dt.document_type_code,
          dt.document_type_name,
          dts.sii_dte_type,
          dts.sii_dte_name,
          dts.amount_mode,
          dts.is_enabled,
          dt.is_active AS catalog_is_active,
          dts.emission_policy,
          dts.provider_code
        FROM document_types dt
        LEFT JOIN dte_document_type_settings dts
          ON dts.document_type_id = dt.id
         AND dts.deleted_at IS NULL
        WHERE dt.deleted_at IS NULL
          AND dt.document_type_code LIKE 'DTE\\_%'
        ORDER BY COALESCE(dts.sii_dte_type, CAST(SUBSTRING(dt.document_type_code, 5) AS UNSIGNED)), dt.document_type_code
        """
    ))).mappings().all()

    return {
        "settings": {
            "id": settings["id"],
            "dte_enabled": _bool(settings["dte_enabled"]),
            "default_provider": settings["default_provider"],
            "default_emission_mode": settings["default_emission_mode"],
            "allow_internal_ticket_when_disabled": _bool(settings["allow_internal_ticket_when_disabled"]),
            "require_dte_for_dte_document_types": _bool(settings["require_dte_for_dte_document_types"]),
            "retry_enabled": _bool(settings["retry_enabled"]),
            "max_retry_attempts": int(settings["max_retry_attempts"] or 0),
        },
        "company": None if not company else {
            "id": company["id"],
            "company_rut": company["company_rut"],
            "company_name": company["company_name"],
            "company_business_name": company["company_business_name"],
            "dte_environment": company["dte_environment"],
            "dte_enabled": _bool(company.get("dte_enabled")),
            "dte_provider": company.get("dte_provider") or "NONE",
            "dte_emission_mode": company.get("dte_emission_mode") or "MANUAL",
            "allow_internal_ticket_when_dte_disabled": _bool(company.get("allow_internal_ticket_when_dte_disabled")),
            "send_dte_email_by_default": _bool(company.get("send_dte_email_by_default")),
            "dte_activation_notes": company.get("dte_activation_notes"),
            "is_active": _bool(company["is_active"]),
        },
        "provider": None if not provider else {
            "id": provider["id"],
            "company_config_id": provider["company_config_id"],
            "provider_code": provider["provider_code"],
            "provider_name": provider["provider_name"],
            "environment": provider["environment"],
            "base_url": provider["base_url"],
            "api_token_secret_name": provider["api_token_secret_name"],
            "has_api_token": bool(provider["api_token_ciphertext"]),
            "has_webhook_secret": bool(provider["webhook_secret_ciphertext"]),
            "timeout_seconds": int(provider["timeout_seconds"] or 30),
            "is_active": _bool(provider["is_active"]),
        },
        "document_types": [dict(row) | {"is_enabled": _bool(row["is_enabled"]), "catalog_is_active": _bool(row["catalog_is_active"])} for row in document_types],
    }


@router.get("/config", response_class=JSONResponse)
async def get_electronic_billing_config(request: Request, user: dict = Depends(require_dte_read)):
    async with db_manager.get_async_session() as session:
        return ResponseManager.success(data=await _get_config(session), request=request)


@router.put("/config", response_class=JSONResponse)
async def update_electronic_billing_config(data: ElectronicBillingConfigUpdate, request: Request, user: dict = Depends(require_dte_manage)):
    provider = _valid_choice(data.default_provider, {"NONE", "LIBREDTE", "SII_DIRECT", "OTHER"}, "NONE")
    company_provider = _valid_choice(data.company_provider, {"NONE", "LIBREDTE", "SII_DIRECT", "OTHER"}, provider)
    emission_mode = _valid_choice(data.default_emission_mode, {"MANUAL", "AUTO_ON_CLOSE"}, "MANUAL")
    company_emission_mode = _valid_choice(data.company_emission_mode, {"MANUAL", "AUTO_ON_CLOSE"}, emission_mode)
    provider_code = _valid_choice(data.provider_code, {"LIBREDTE", "SII_DIRECT", "OTHER"}, "LIBREDTE")
    environment = _valid_choice(data.environment, {"CERTIFICACION", "PRODUCCION"}, "CERTIFICACION")

    async with db_manager.get_async_session() as session:
        try:
            await session.execute(text(
                """
                UPDATE dte_system_settings
                SET dte_enabled = :dte_enabled,
                    default_provider = :default_provider,
                    default_emission_mode = :default_emission_mode,
                    allow_internal_ticket_when_disabled = :allow_internal_ticket_when_disabled,
                    require_dte_for_dte_document_types = :require_dte_for_dte_document_types,
                    retry_enabled = :retry_enabled,
                    max_retry_attempts = :max_retry_attempts
                WHERE id = 1
                """
            ), {
                "dte_enabled": int(data.dte_enabled),
                "default_provider": provider,
                "default_emission_mode": emission_mode,
                "allow_internal_ticket_when_disabled": int(data.allow_internal_ticket_when_disabled),
                "require_dte_for_dte_document_types": int(data.require_dte_for_dte_document_types),
                "retry_enabled": int(data.retry_enabled),
                "max_retry_attempts": data.max_retry_attempts,
            })
            await _sync_dte_document_types(session, data.dte_enabled)

            company_id = data.company_config_id
            if not company_id:
                company_id = (await session.execute(text(
                    """
                    SELECT id
                    FROM dte_company_config
                    WHERE deleted_at IS NULL
                    ORDER BY is_active DESC, id ASC
                    LIMIT 1
                    """
                ))).scalar()

            if company_id:
                await session.execute(text(
                    """
                    UPDATE dte_company_config
                    SET dte_enabled = :dte_enabled,
                        dte_provider = :dte_provider,
                        dte_emission_mode = :dte_emission_mode,
                        allow_internal_ticket_when_dte_disabled = :allow_ticket,
                        send_dte_email_by_default = :send_email,
                        dte_activation_notes = :notes
                    WHERE id = :company_id
                      AND deleted_at IS NULL
                    """
                ), {
                    "company_id": company_id,
                    "dte_enabled": int(data.company_dte_enabled),
                    "dte_provider": company_provider,
                    "dte_emission_mode": company_emission_mode,
                    "allow_ticket": int(data.allow_internal_ticket_when_disabled),
                    "send_email": int(data.send_dte_email_by_default),
                    "notes": data.dte_activation_notes,
                })

                provider_id = data.provider_config_id
                if not provider_id:
                    provider_id = (await session.execute(text(
                        """
                        SELECT id
                        FROM dte_provider_configs
                        WHERE company_config_id = :company_id
                          AND provider_code = :provider_code
                          AND environment = :environment
                          AND deleted_at IS NULL
                        LIMIT 1
                        """
                    ), {"company_id": company_id, "provider_code": provider_code, "environment": environment})).scalar()

                provider_values = {
                    "company_id": company_id,
                    "provider_code": provider_code,
                    "provider_name": data.provider_name or "LibreDTE",
                    "environment": environment,
                    "base_url": data.base_url or "https://libredte.cl/api",
                    "api_token_secret_name": data.api_token_secret_name,
                    "timeout_seconds": data.timeout_seconds,
                    "is_active": int(data.provider_is_active),
                }

                if provider_id:
                    await session.execute(text(
                        """
                        UPDATE dte_provider_configs
                        SET provider_code = :provider_code,
                            provider_name = :provider_name,
                            environment = :environment,
                            base_url = :base_url,
                            api_token_secret_name = :api_token_secret_name,
                            timeout_seconds = :timeout_seconds,
                            is_active = :is_active
                        WHERE id = :provider_id
                          AND company_config_id = :company_id
                          AND deleted_at IS NULL
                        """
                    ), provider_values | {"provider_id": provider_id})
                else:
                    result = await session.execute(text(
                        """
                        INSERT INTO dte_provider_configs (
                          company_config_id, provider_code, provider_name, environment, base_url,
                          api_token_secret_name, timeout_seconds, is_active
                        ) VALUES (
                          :company_id, :provider_code, :provider_name, :environment, :base_url,
                          :api_token_secret_name, :timeout_seconds, :is_active
                        )
                        """
                    ), provider_values)
                    provider_id = result.lastrowid

                if data.clear_api_token:
                    await session.execute(text("UPDATE dte_provider_configs SET api_token_ciphertext = NULL WHERE id = :provider_id"), {"provider_id": provider_id})
                elif data.api_token_or_hash:
                    await session.execute(text("UPDATE dte_provider_configs SET api_token_ciphertext = :secret WHERE id = :provider_id"), {"provider_id": provider_id, "secret": data.api_token_or_hash})

                if data.clear_webhook_secret:
                    await session.execute(text("UPDATE dte_provider_configs SET webhook_secret_ciphertext = NULL WHERE id = :provider_id"), {"provider_id": provider_id})
                elif data.webhook_secret:
                    await session.execute(text("UPDATE dte_provider_configs SET webhook_secret_ciphertext = :secret WHERE id = :provider_id"), {"provider_id": provider_id, "secret": data.webhook_secret})

            await session.commit()
            return ResponseManager.success(data=await _get_config(session), message="Configuracion DTE actualizada correctamente", request=request)
        except Exception as exc:
            await session.rollback()
            return ResponseManager.error(
                message="No fue posible guardar configuracion DTE",
                status_code=StdHTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                details=str(exc),
                request=request,
            )
