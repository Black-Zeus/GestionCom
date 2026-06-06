"""
CRUD generico y controlado para mantenedores fundacionales no transaccionales.
"""
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from services.media_storage import media_storage
from utils.permissions_utils import get_current_user
from utils.phone import normalize_phone_for_storage
from utils.rut import validate_and_normalize_chilean_rut

router = APIRouter(tags=["Admin Maintainers"])


RESOURCES = {
    "customers": {
        "table": "customers", "code_field": "customer_code", "prefix": "CUS", "active_field": "status_id",
        "soft_delete": True,
        "fields": ["customer_type", "tax_id", "legal_name", "commercial_name", "business_activity", "contact_person", "email", "phone", "mobile", "website", "address", "city", "region", "country", "postal_code", "price_list_id", "default_currency_code", "sales_rep_user_id", "status_id", "is_credit_customer", "registration_date", "notes", "internal_notes"],
        "required": ["customer_type", "tax_id", "legal_name"], "bool": ["is_credit_customer"], "int": ["price_list_id", "sales_rep_user_id", "status_id"], "date": ["registration_date"], "rut": ["tax_id"], "phone": ["phone", "mobile"],
    },
    "customer-authorized-users": {
        "table": "customer_authorized_users", "active_field": "is_active", "soft_delete": False,
        "fields": ["customer_id", "authorized_name", "authorized_tax_id", "position", "email", "phone", "mobile", "is_primary_contact", "authorization_level", "max_purchase_amount", "max_purchase_currency_code", "is_active"],
        "required": ["customer_id", "authorized_name"], "bool": ["is_primary_contact", "is_active"], "int": ["customer_id"], "decimal": ["max_purchase_amount"], "rut": ["authorized_tax_id"], "phone": ["phone", "mobile"],
    },
    "customer-credit-config": {
        "table": "customer_credit_config", "soft_delete": False,
        "fields": ["customer_id", "credit_limit", "available_credit", "used_credit", "payment_terms_days", "grace_period_days", "minimum_payment_percentage", "penalty_rate", "max_overdue_amount", "allows_cash", "allows_check", "allows_postdated_check", "allows_transfer", "allows_installments", "risk_level", "requires_guarantor", "auto_block_on_overdue", "is_active"],
        "required": ["customer_id"], "bool": ["allows_cash", "allows_check", "allows_postdated_check", "allows_transfer", "allows_installments", "requires_guarantor", "auto_block_on_overdue", "is_active"], "int": ["customer_id", "payment_terms_days", "grace_period_days"], "decimal": ["credit_limit", "available_credit", "used_credit", "minimum_payment_percentage", "penalty_rate", "max_overdue_amount"],
    },
    "suppliers": {
        "table": "suppliers", "code_field": "supplier_code", "prefix": "SUP", "soft_delete": True,
        "fields": ["supplier_type", "tax_id", "legal_name", "commercial_name", "business_activity", "contact_person", "email", "phone", "mobile", "website", "default_currency_code", "default_payment_terms_days", "default_tax_rate", "credit_limit", "current_balance", "status_id", "notes", "internal_notes"],
        "required": ["legal_name"], "int": ["default_payment_terms_days", "status_id"], "decimal": ["default_tax_rate", "credit_limit", "current_balance"], "rut": ["tax_id"], "phone": ["phone", "mobile"],
    },
    "supplier-contacts": {
        "table": "supplier_contacts", "active_field": "is_active", "soft_delete": True,
        "fields": ["supplier_id", "contact_name", "position", "email", "phone", "mobile", "is_primary", "is_purchase_contact", "is_payment_contact", "notes", "is_active"],
        "required": ["supplier_id", "contact_name"], "bool": ["is_primary", "is_purchase_contact", "is_payment_contact", "is_active"], "int": ["supplier_id"], "phone": ["phone", "mobile"],
    },
    "supplier-addresses": {
        "table": "supplier_addresses", "soft_delete": True,
        "fields": ["supplier_id", "address_type", "address_line", "city", "region", "country", "postal_code", "is_primary"],
        "required": ["supplier_id", "address_line"], "bool": ["is_primary"], "int": ["supplier_id"],
    },
    "supplier-products": {
        "table": "supplier_products", "active_field": "is_active", "soft_delete": True,
        "fields": ["supplier_id", "product_variant_id", "supplier_sku", "supplier_barcode", "supplier_product_name", "measurement_unit_id", "minimum_order_quantity", "package_quantity", "last_purchase_cost", "lead_time_days", "is_preferred", "is_active"],
        "required": ["supplier_id", "product_variant_id"], "bool": ["is_preferred", "is_active"], "int": ["supplier_id", "product_variant_id", "measurement_unit_id", "lead_time_days"], "decimal": ["minimum_order_quantity", "package_quantity", "last_purchase_cost"],
    },
    "warehouse-zones": {
        "table": "warehouse_zones", "code_field": "zone_code", "prefix": "ZON", "active_field": "is_active", "soft_delete": True,
        "fields": ["warehouse_id", "zone_code", "zone_name", "zone_description", "is_location_tracking_enabled", "is_active"],
        "required": ["warehouse_id", "zone_name"], "bool": ["is_location_tracking_enabled", "is_active"], "int": ["warehouse_id"],
    },
    "warehouse-zone-locations": {
        "table": "warehouse_zone_locations", "code_field": "location_code", "prefix": "ZLOC", "active_field": "is_active", "soft_delete": True,
        "fields": ["warehouse_zone_id", "location_code", "location_name", "location_description", "location_type", "sort_order", "is_active"],
        "required": ["warehouse_zone_id", "location_name"], "bool": ["is_active"], "int": ["warehouse_zone_id", "sort_order"],
        "enum": {"location_type": ["GENERAL", "AISLE", "RACK", "SHELF", "BIN", "DISPLAY", "OTHER"]},
        "order_by": "sort_order ASC, id ASC",
    },
    "banks": {
        "table": "banks", "code_field": "bank_code", "prefix": "BNK", "active_field": "is_active", "soft_delete": True,
        "fields": ["bank_name", "country", "swift_code", "routing_code", "is_active"],
        "required": ["bank_name"], "bool": ["is_active"],
    },
    "bank-accounts": {
        "table": "bank_accounts", "code_field": "account_code", "prefix": "BAC", "active_field": "is_active", "soft_delete": True,
        "fields": ["bank_id", "account_number", "account_name", "account_type", "currency_code", "opening_balance", "current_balance", "is_active"],
        "required": ["bank_id", "account_number", "account_name"], "bool": ["is_active"], "int": ["bank_id"], "decimal": ["opening_balance", "current_balance"],
    },
    "currency-rates": {
        "table": "currency_exchange_rates", "soft_delete": False,
        "fields": ["currency_code", "rate_date", "rate_to_clp", "source_name", "source_reference"],
        "required": ["currency_code", "rate_date", "rate_to_clp"], "date": ["rate_date"], "decimal": ["rate_to_clp"],
    },
    "currencies": {
        "table": "currencies", "active_field": "is_active", "soft_delete": True,
        "fields": ["currency_code", "currency_name", "currency_symbol", "decimal_places", "is_base_currency", "is_active"],
        "required": ["currency_code", "currency_name", "currency_symbol"],
        "bool": ["is_base_currency", "is_active"], "int": ["decimal_places"],
    },
    "return-reasons": {
        "table": "return_reasons", "code_field": "reason_code", "prefix": "RET", "active_field": "is_active", "soft_delete": True,
        "fields": ["reason_name", "reason_description", "requires_approval", "affects_stock", "allows_exchange", "allows_refund", "max_days_after_sale", "default_account_code", "is_active"],
        "required": ["reason_name"], "bool": ["requires_approval", "affects_stock", "allows_exchange", "allows_refund", "is_active"], "int": ["max_days_after_sale"],
    },
    "promotions": {
        "table": "promotions", "code_field": "promotion_code", "prefix": "PRM", "active_field": "is_active", "soft_delete": True,
        "fields": ["promotion_name", "promotion_type", "target_type", "min_quantity", "discount_percentage", "discount_amount", "buy_quantity", "get_quantity", "valid_from", "valid_to", "is_combinable", "is_active"],
        "required": ["promotion_name", "promotion_type", "valid_from", "valid_to"], "bool": ["is_combinable", "is_active"], "decimal": ["min_quantity", "discount_percentage", "discount_amount", "buy_quantity", "get_quantity"], "datetime": ["valid_from", "valid_to"],
    },
    "promotion-items": {
        "table": "promotion_items", "soft_delete": False,
        "fields": ["promotion_id", "product_variant_id", "category_id"],
        "required": ["promotion_id"], "int": ["promotion_id", "product_variant_id", "category_id"],
    },
    "stock-critical-config": {
        "table": "stock_critical_config", "active_field": "is_active", "soft_delete": False,
        "fields": ["product_variant_id", "warehouse_id", "minimum_stock", "maximum_stock", "safety_stock", "reorder_quantity", "lead_time_days", "avg_daily_sales", "last_calculated_date", "alert_enabled", "alert_frequency_hours", "is_active"],
        "required": ["product_variant_id", "warehouse_id"], "bool": ["alert_enabled", "is_active"], "int": ["product_variant_id", "warehouse_id", "lead_time_days", "alert_frequency_hours"], "decimal": ["minimum_stock", "maximum_stock", "safety_stock", "reorder_quantity", "avg_daily_sales"], "date": ["last_calculated_date"],
    },
    "product-barcodes": {
        "table": "product_barcodes", "active_field": "is_active", "soft_delete": True,
        "fields": ["product_variant_id", "barcode_type", "barcode_value", "measurement_unit_id", "is_primary", "is_active"],
        "required": ["product_variant_id", "barcode_type", "barcode_value"], "bool": ["is_primary", "is_active"], "int": ["product_variant_id", "measurement_unit_id"],
        "enum": {"barcode_type": ["EAN13", "EAN8", "UPC", "CODE128", "QR"]},
    },
    "product-brands": {
        "table": "product_brands", "code_field": "brand_code", "prefix": "BRD", "active_field": "is_active", "soft_delete": True,
        "fields": ["brand_name", "brand_description", "is_active"],
        "required": ["brand_name"], "bool": ["is_active"],
    },
    "product-models": {
        "table": "product_models", "code_field": "model_code", "prefix": "MOD", "active_field": "is_active", "soft_delete": True,
        "fields": ["brand_id", "model_name", "model_description", "is_active"],
        "required": ["brand_id", "model_name"], "bool": ["is_active"], "int": ["brand_id"],
    },
    "product-units": {
        "table": "product_measurement_units", "active_field": "is_active", "soft_delete": False,
        "fields": ["product_id", "measurement_unit_id", "conversion_factor", "is_purchase_unit", "is_sale_unit", "is_inventory_unit", "is_active"],
        "required": ["product_id", "measurement_unit_id"], "bool": ["is_purchase_unit", "is_sale_unit", "is_inventory_unit", "is_active"], "int": ["product_id", "measurement_unit_id"], "decimal": ["conversion_factor"],
    },
    "document-templates": {
        "table": "document_templates", "code_field": "template_code", "prefix": "DTPL", "active_field": "is_active", "soft_delete": True,
        "fields": ["template_name", "document_type_id", "template_channel", "template_subject", "template_body", "paper_size", "orientation", "is_default", "is_active"],
        "required": ["template_name"], "bool": ["is_default", "is_active"], "int": ["document_type_id"],
    },
    "bank-reconciliation-settings": {
        "table": "bank_reconciliation_settings", "code_field": "setting_code", "prefix": "BRS", "active_field": "is_active", "soft_delete": True,
        "fields": ["bank_account_id", "match_reference_enabled", "match_amount_enabled", "match_date_tolerance_days", "amount_tolerance", "auto_match_enabled", "require_review_over_amount", "is_active"],
        "bool": ["match_reference_enabled", "match_amount_enabled", "auto_match_enabled", "is_active"], "int": ["bank_account_id", "match_date_tolerance_days"], "decimal": ["amount_tolerance", "require_review_over_amount"],
    },
    "notification-types": {
        "table": "notification_types", "active_field": "is_active", "soft_delete": True,
        "fields": ["type_code", "type_name", "type_description", "severity", "icon_name", "default_action_label", "is_user_visible", "is_active"],
        "required": ["type_code", "type_name"], "bool": ["is_user_visible", "is_active"],
    },
    "notification-emission-rules": {
        "table": "notification_emission_rules", "code_field": "rule_code", "prefix": "NRL", "active_field": "is_active", "soft_delete": True,
        "fields": ["rule_name", "source_label", "notification_type_id", "severity_override", "min_priority", "max_per_user_per_day", "emit_in_app", "emit_email", "emit_push", "is_active"],
        "required": ["rule_name", "source_label", "notification_type_id"], "bool": ["emit_in_app", "emit_email", "emit_push", "is_active"], "int": ["notification_type_id", "min_priority", "max_per_user_per_day"],
    },
    "user-notification-preferences": {
        "table": "user_notification_preferences", "active_field": "is_active", "soft_delete": False,
        "fields": ["user_id", "notification_type_id", "receive_in_app", "receive_email", "receive_push", "muted_until", "is_active"],
        "required": ["user_id", "notification_type_id"], "bool": ["receive_in_app", "receive_email", "receive_push", "is_active"], "int": ["user_id", "notification_type_id"], "datetime": ["muted_until"],
    },
    "users-options": {
        "table": "users", "active_field": "is_active", "soft_delete": True,
        "fields": ["username", "first_name", "last_name", "email", "is_active"],
        "bool": ["is_active"], "read_only": True,
    },
    "warehouses-options": {
        "table": "warehouses", "active_field": "is_active", "soft_delete": True,
        "fields": ["warehouse_code", "warehouse_name", "is_active"],
        "bool": ["is_active"], "read_only": True,
    },
    "warehouse-zones-options": {
        "table": "warehouse_zones", "active_field": "is_active", "soft_delete": True,
        "fields": ["warehouse_id", "zone_code", "zone_name", "is_location_tracking_enabled", "is_active"],
        "bool": ["is_location_tracking_enabled", "is_active"], "int": ["warehouse_id"], "read_only": True,
    },
    "document-types-options": {
        "table": "document_types", "active_field": "is_active", "soft_delete": False,
        "fields": ["document_type_code", "document_type_name", "is_active"],
        "bool": ["is_active"], "read_only": True,
    },
    "products-options": {
        "table": "products", "active_field": "is_active", "soft_delete": True,
        "fields": ["product_code", "product_name", "is_active"],
        "bool": ["is_active"], "read_only": True,
    },
    "product-variants-options": {
        "table": "product_variants", "active_field": "is_active", "soft_delete": True,
        "fields": ["product_id", "variant_sku", "variant_name", "is_active"],
        "bool": ["is_active"], "int": ["product_id"], "read_only": True,
    },
    "categories-options": {
        "table": "categories", "active_field": "is_active", "soft_delete": True,
        "fields": ["category_code", "category_name", "category_level", "is_active"],
        "bool": ["is_active"], "int": ["category_level"], "read_only": True,
    },
    "measurement-units-options": {
        "table": "measurement_units", "active_field": "is_active", "soft_delete": True,
        "fields": ["unit_code", "unit_name", "unit_symbol", "is_active"],
        "bool": ["is_active"], "read_only": True,
    },
    "system-statuses": {
        "table": "system_statuses", "active_field": "is_active", "soft_delete": False,
        "fields": ["status_group", "status_code", "status_name", "status_display_es", "status_color", "status_icon", "is_active", "sort_order"],
        "required": ["status_group", "status_code", "status_name", "status_display_es"], "bool": ["is_active"], "int": ["sort_order"],
    },
    "customer-statuses": {
        "table": "system_statuses", "active_field": "is_active", "soft_delete": False,
        "where": "status_group = 'CUSTOMER' AND is_active = TRUE",
        "fields": ["status_group", "status_code", "status_name", "status_display_es", "status_color", "status_icon", "is_active", "sort_order"],
        "bool": ["is_active"], "int": ["sort_order"], "read_only": True,
    },
    "supplier-statuses": {
        "table": "system_statuses", "active_field": "is_active", "soft_delete": False,
        "where": "status_group = 'SUPPLIER' AND is_active = TRUE",
        "fields": ["status_group", "status_code", "status_name", "status_display_es", "status_color", "status_icon", "is_active", "sort_order"],
        "bool": ["is_active"], "int": ["sort_order"], "read_only": True,
    },
}


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


DEFAULT_READ_PERMISSIONS = [
    "FOUNDATION_MAINTAINERS_ACCESS",
    "FOUNDATION_MAINTAINERS_MANAGE",
    "INVENTORY_MAINTAINERS_ACCESS",
    "INVENTORY_MAINTAINERS_MANAGE",
    "PRODUCT_BRAND_MODELS_ACCESS",
    "PRODUCT_BRAND_MODELS_MANAGE",
    "PRODUCT_BARCODES_ACCESS",
    "PRODUCT_BARCODES_MANAGE",
    "PRODUCT_UNITS_ACCESS",
    "PRODUCT_UNITS_MANAGE",
    "SALES_MAINTAINERS_ACCESS",
    "SALES_MAINTAINERS_MANAGE",
    "FINANCE_MAINTAINERS_ACCESS",
    "FINANCE_MAINTAINERS_MANAGE",
    "DOCUMENT_TEMPLATES_ACCESS",
    "DOCUMENT_TEMPLATES_MANAGE",
    "NOTIFICATION_SETTINGS_ACCESS",
    "NOTIFICATION_SETTINGS_MANAGE",
]

DEFAULT_WRITE_PERMISSIONS = [
    "FOUNDATION_MAINTAINERS_MANAGE",
    "INVENTORY_MAINTAINERS_MANAGE",
    "PRODUCT_BRAND_MODELS_MANAGE",
    "PRODUCT_BARCODES_MANAGE",
    "PRODUCT_UNITS_MANAGE",
    "SALES_MAINTAINERS_MANAGE",
    "FINANCE_MAINTAINERS_MANAGE",
    "DOCUMENT_TEMPLATES_MANAGE",
    "NOTIFICATION_SETTINGS_MANAGE",
]

RESOURCE_PERMISSION_OVERRIDES = {
    "warehouse-zones": {
        "read": [
            "INVENTORY_MAINTAINERS_ACCESS",
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_READ",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_SUPERVISOR",
            "WAREHOUSE_ADMIN",
            "WAREHOUSES_ACCESS",
        ],
        "write": [
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_ADMIN",
        ],
    },
    "warehouses-options": {
        "read": [
            "INVENTORY_MAINTAINERS_ACCESS",
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_READ",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_SUPERVISOR",
            "WAREHOUSE_ADMIN",
            "WAREHOUSES_ACCESS",
        ],
    },
    "warehouse-zone-locations": {
        "read": [
            "INVENTORY_MAINTAINERS_ACCESS",
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_READ",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_SUPERVISOR",
            "WAREHOUSE_ADMIN",
            "WAREHOUSES_ACCESS",
        ],
        "write": [
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_ADMIN",
        ],
    },
    "warehouse-zones-options": {
        "read": [
            "INVENTORY_MAINTAINERS_ACCESS",
            "INVENTORY_MAINTAINERS_MANAGE",
            "WAREHOUSE_READ",
            "WAREHOUSE_MANAGER",
            "WAREHOUSE_SUPERVISOR",
            "WAREHOUSE_ADMIN",
            "WAREHOUSES_ACCESS",
        ],
    },
}


def _permission_error(request: Request):
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def _allowed_permissions(resource: str, mode: str) -> list[str]:
    override = RESOURCE_PERMISSION_OVERRIDES.get(resource, {})
    if override.get(mode):
        return override[mode]
    return DEFAULT_WRITE_PERMISSIONS if mode == "write" else DEFAULT_READ_PERMISSIONS


def _ensure_resource_permission(user: dict, resource: str, mode: str, request: Request) -> None:
    if not _has_any_permission(user, _allowed_permissions(resource, mode)):
        _permission_error(request)


async def require_read(request: Request) -> dict:
    user = await get_current_user(request)
    allowed_permissions = DEFAULT_READ_PERMISSIONS + RESOURCE_PERMISSION_OVERRIDES["warehouse-zones"]["read"]
    if _has_any_permission(user, allowed_permissions):
        return user
    _permission_error(request)


async def require_write(request: Request) -> dict:
    user = await get_current_user(request)
    allowed_permissions = DEFAULT_WRITE_PERMISSIONS + RESOURCE_PERMISSION_OVERRIDES["warehouse-zones"]["write"]
    if _has_any_permission(user, allowed_permissions):
        return user
    _permission_error(request)


def _config(resource: str) -> dict:
    config = RESOURCES.get(resource)
    if not config:
        raise KeyError(resource)
    return config


def _json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row(row):
    return {key: _json_value(value) for key, value in row.items()} if row else None


async def _media_map(session, asset_ids: list[int | None]) -> dict:
    ids = sorted({int(item) for item in asset_ids if item})
    if not ids:
        return {}
    placeholders = ", ".join(f":id_{index}" for index, _ in enumerate(ids))
    params = {f"id_{index}": item for index, item in enumerate(ids)}
    result = await session.execute(text(f"SELECT * FROM media_assets WHERE id IN ({placeholders}) AND deleted_at IS NULL"), params)
    return {
        row["id"]: media_storage.safe_asset(_row(row))
        for row in result.mappings().all()
    }


def _normalize(config: dict, payload: dict, partial: bool = False) -> dict:
    allowed = set(config["fields"])
    data = {key: value for key, value in payload.items() if key in allowed}
    missing = [field for field in config.get("required", []) if not partial and (data.get(field) in (None, ""))]
    if missing:
        raise ValueError(f"Campos requeridos: {', '.join(missing)}")
    if not partial and config.get("table") == "promotion_items":
        has_variant = data.get("product_variant_id") not in (None, "")
        has_category = data.get("category_id") not in (None, "")
        if has_variant == has_category:
            raise ValueError("Selecciona un SKU o una categoria, pero no ambos")
    for key, value in list(data.items()):
        if value == "":
            data[key] = None
            continue
        if key in config.get("rut", []):
            data[key] = validate_and_normalize_chilean_rut(value)
            continue
        if key in config.get("phone", []):
            data[key] = normalize_phone_for_storage(value)
            continue
        if key in config.get("bool", []):
            data[key] = bool(value)
        elif key in config.get("int", []):
            data[key] = int(value) if value is not None else None
        elif key in config.get("decimal", []):
            data[key] = float(value) if value is not None else None
        elif key in config.get("date", []):
            data[key] = value
        elif key in config.get("datetime", []):
            data[key] = str(value).replace("T", " ") if value is not None else None
    for key, values in config.get("enum", {}).items():
        if key in data and data[key] not in (None, "") and data[key] not in values:
            raise ValueError(f"{key} no es valido")
    if config.get("table") == "product_barcodes":
        barcode_type = data.get("barcode_type")
        barcode_value = data.get("barcode_value")
        if barcode_type and barcode_value:
            normalized_value = str(barcode_value).strip()
            if barcode_type in {"EAN13", "EAN8", "UPC"}:
                normalized_value = "".join(character for character in normalized_value if character.isdigit())
            if barcode_type == "EAN13" and (not normalized_value.isdigit() or len(normalized_value) != 13):
                raise ValueError("EAN-13 debe tener exactamente 13 digitos")
            if barcode_type == "EAN8" and (not normalized_value.isdigit() or len(normalized_value) != 8):
                raise ValueError("EAN-8 debe tener exactamente 8 digitos")
            if barcode_type == "UPC" and (not normalized_value.isdigit() or len(normalized_value) != 12):
                raise ValueError("UPC-A debe tener exactamente 12 digitos")
            if barcode_type == "CODE128" and (len(normalized_value) > 80 or any(ord(character) < 32 or ord(character) > 126 for character in normalized_value)):
                raise ValueError("Code 128 acepta texto imprimible de hasta 80 caracteres")
            if barcode_type == "QR" and len(normalized_value) > 255:
                raise ValueError("QR acepta hasta 255 caracteres")
            data["barcode_value"] = normalized_value
    if config.get("table") == "product_measurement_units":
        factor = data.get("conversion_factor")
        if factor is not None and factor <= 0:
            raise ValueError("El factor de conversion debe ser mayor a cero")
        role_flags = ["is_purchase_unit", "is_sale_unit", "is_inventory_unit"]
        if any(flag in data for flag in role_flags) and not any(data.get(flag) for flag in role_flags):
            raise ValueError("Selecciona al menos un uso para la unidad")
    return data


async def _next_code(session, table: str, field: str, prefix: str) -> str:
    pattern = f"{prefix}_%"
    result = await session.execute(
        text(f"SELECT {field} FROM {table} WHERE {field} LIKE :pattern ORDER BY {field} DESC LIMIT 1"),
        {"pattern": pattern},
    )
    current = result.scalar_one_or_none()
    next_number = 1
    if current:
        try:
            next_number = int(str(current).split("_")[-1]) + 1
        except ValueError:
            next_number = 1
    return f"{prefix}_{next_number:04d}"


@router.get("/", response_class=JSONResponse)
async def list_resources(request: Request, user: dict = Depends(require_read)):
    visible_resources = [
        resource
        for resource in RESOURCES.keys()
        if _has_any_permission(user, _allowed_permissions(resource, "read"))
    ]
    return ResponseManager.success(data=sorted(visible_resources), request=request)


@router.get("/{resource}", response_class=JSONResponse)
async def list_items(request: Request, resource: str = Path(...), user: dict = Depends(require_read)):
    try:
        _ensure_resource_permission(user, resource, "read", request)
        config = _config(resource)
        conditions = []
        if config.get("soft_delete"):
            conditions.append("deleted_at IS NULL")
        if config.get("where"):
            conditions.append(config["where"])
        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
        async with db_manager.get_async_session() as session:
            order_by = config.get("order_by") or ("sort_order ASC, id ASC" if config["table"] == "system_statuses" else "id DESC")
            result = await session.execute(text(f"SELECT * FROM {config['table']}{where} ORDER BY {order_by} LIMIT 1000"))
            rows = [_row(row) for row in result.mappings().all()]
            if config["table"] in {"customers", "suppliers"}:
                assets = await _media_map(session, [item.get("logo_media_asset_id") for item in rows] + [item.get("banner_media_asset_id") for item in rows])
                for row in rows:
                    row["logo"] = assets.get(row.get("logo_media_asset_id"))
                    row["banner"] = assets.get(row.get("banner_media_asset_id"))
            if config["table"] == "warehouse_zones" and rows:
                zone_ids = [int(item["id"]) for item in rows if item.get("id")]
                placeholders = ", ".join(f":zone_id_{index}" for index, _ in enumerate(zone_ids))
                params = {f"zone_id_{index}": zone_id for index, zone_id in enumerate(zone_ids)}
                count_result = await session.execute(
                    text(
                        "SELECT warehouse_zone_id, COUNT(*) AS location_count "
                        f"FROM warehouse_zone_locations WHERE deleted_at IS NULL AND warehouse_zone_id IN ({placeholders}) "
                        "GROUP BY warehouse_zone_id"
                    ),
                    params,
                )
                location_counts = {
                    int(row["warehouse_zone_id"]): int(row["location_count"])
                    for row in count_result.mappings().all()
                }
                for row in rows:
                    row["location_count"] = location_counts.get(int(row["id"]), 0)
            return ResponseManager.success(data=rows, request=request)
    except KeyError:
        return ResponseManager.error(message="Mantenedor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)


@router.post("/{resource}", response_class=JSONResponse)
async def create_item(payload: dict, request: Request, resource: str = Path(...), user: dict = Depends(require_write)):
    try:
        _ensure_resource_permission(user, resource, "write", request)
        config = _config(resource)
        if config.get("read_only"):
            return ResponseManager.error(message="Recurso solo disponible para seleccion", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
        data = _normalize(config, payload)
        async with db_manager.get_async_session() as session:
            if config["table"] == "customers" and data.get("status_id") in (None, ""):
                status_result = await session.execute(text("SELECT id FROM system_statuses WHERE status_group = 'CUSTOMER' AND status_code = 'ACTIVE' LIMIT 1"))
                data["status_id"] = status_result.scalar_one_or_none()
            if config["table"] == "suppliers" and data.get("status_id") in (None, ""):
                status_result = await session.execute(text("SELECT id FROM system_statuses WHERE status_group = 'SUPPLIER' AND status_code = 'ACTIVE' LIMIT 1"))
                data["status_id"] = status_result.scalar_one_or_none()
            if config["table"] == "warehouse_zone_locations":
                zone_result = await session.execute(
                    text("SELECT is_location_tracking_enabled FROM warehouse_zones WHERE id = :zone_id AND deleted_at IS NULL"),
                    {"zone_id": data.get("warehouse_zone_id")},
                )
                zone_tracks_locations = zone_result.scalar_one_or_none()
                if zone_tracks_locations is None:
                    raise ValueError("Zona no encontrada")
                if not zone_tracks_locations:
                    raise ValueError("La zona no tiene habilitado el control de ubicaciones internas")
            if config.get("code_field"):
                data[config["code_field"]] = await _next_code(session, config["table"], config["code_field"], config["prefix"])
            if "created_by_user_id" in config["fields"] or config["table"] in {"customers", "suppliers"}:
                data["created_by_user_id"] = user.get("user_id") or user.get("id")
            columns = ", ".join(data.keys())
            values = ", ".join(f":{key}" for key in data.keys())
            await session.execute(text(f"INSERT INTO {config['table']} ({columns}) VALUES ({values})"), data)
            await session.commit()
            result = await session.execute(text(f"SELECT * FROM {config['table']} WHERE id = LAST_INSERT_ID()"))
            row = result.mappings().first()
            row_data = {key: _json_value(value) for key, value in row.items()}
            return ResponseManager.success(data=row_data, message="Registro creado correctamente", request=request)
    except KeyError:
        return ResponseManager.error(message="Mantenedor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except HTTPException:
        raise
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al crear registro", details=str(exc), request=request)


@router.put("/{resource}/{item_id}", response_class=JSONResponse)
async def update_item(payload: dict, request: Request, resource: str = Path(...), item_id: int = Path(..., gt=0), user: dict = Depends(require_write)):
    try:
        _ensure_resource_permission(user, resource, "write", request)
        config = _config(resource)
        if config.get("read_only"):
            return ResponseManager.error(message="Recurso solo disponible para seleccion", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
        data = _normalize(config, payload, partial=True)
        if not data:
            return ResponseManager.error(message="Sin campos para actualizar", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        set_clause = ", ".join(f"{key} = :{key}" for key in data.keys())
        data["id"] = item_id
        async with db_manager.get_async_session() as session:
            if config["table"] == "warehouse_zone_locations" and data.get("warehouse_zone_id"):
                zone_result = await session.execute(
                    text("SELECT is_location_tracking_enabled FROM warehouse_zones WHERE id = :zone_id AND deleted_at IS NULL"),
                    {"zone_id": data.get("warehouse_zone_id")},
                )
                zone_tracks_locations = zone_result.scalar_one_or_none()
                if zone_tracks_locations is None:
                    raise ValueError("Zona no encontrada")
                if not zone_tracks_locations:
                    raise ValueError("La zona no tiene habilitado el control de ubicaciones internas")
            await session.execute(text(f"UPDATE {config['table']} SET {set_clause} WHERE id = :id"), data)
            await session.commit()
            result = await session.execute(text(f"SELECT * FROM {config['table']} WHERE id = :id"), {"id": item_id})
            row = result.mappings().first()
            row_data = {key: _json_value(value) for key, value in row.items()}
            return ResponseManager.success(data=row_data, message="Registro actualizado correctamente", request=request)
    except KeyError:
        return ResponseManager.error(message="Mantenedor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except HTTPException:
        raise
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al actualizar registro", details=str(exc), request=request)


@router.delete("/{resource}/{item_id}", response_class=JSONResponse)
async def delete_item(request: Request, resource: str = Path(...), item_id: int = Path(..., gt=0), user: dict = Depends(require_write)):
    try:
        _ensure_resource_permission(user, resource, "write", request)
        config = _config(resource)
        if config.get("read_only"):
            return ResponseManager.error(message="Recurso solo disponible para seleccion", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
        async with db_manager.get_async_session() as session:
            if config.get("soft_delete"):
                updates = ["deleted_at = CURRENT_TIMESTAMP"]
                if config.get("active_field") == "is_active":
                    updates.append("is_active = FALSE")
                elif config.get("active_field"):
                    updates.append(f"{config['active_field']} = :inactive_value")
                await session.execute(text(f"UPDATE {config['table']} SET {', '.join(updates)} WHERE id = :id"), {"id": item_id, "inactive_value": config.get("inactive_value")})
            else:
                await session.execute(text(f"DELETE FROM {config['table']} WHERE id = :id"), {"id": item_id})
            await session.commit()
            return ResponseManager.success(data={"id": item_id}, message="Registro eliminado correctamente", request=request)
    except KeyError:
        return ResponseManager.error(message="Mantenedor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
    except HTTPException:
        raise
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al eliminar registro", details=str(exc), request=request)
