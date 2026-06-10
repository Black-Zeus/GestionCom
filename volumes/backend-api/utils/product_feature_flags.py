"""
Configuracion de visibilidad de checks funcionales del maestro de productos.
"""
from __future__ import annotations

from sqlalchemy import text

PRODUCT_FLAG_FEATURES = {
    "is_active": {
        "feature_code": "PRODUCT_FLAG_ACTIVE_VISIBLE",
        "label": "Activo",
        "description": "Permite activar o desactivar productos desde el maestro.",
        "default_visible": True,
    },
    "has_variants": {
        "feature_code": "PRODUCT_FLAG_VARIANTS_VISIBLE",
        "label": "Usa variantes",
        "description": "Permite administrar productos con SKU o variaciones.",
        "default_visible": True,
    },
    "has_batch_control": {
        "feature_code": "BATCH_CONTROL_GLOBAL",
        "label": "Controla lotes",
        "description": "Permite exigir lote en operaciones de inventario.",
        "default_visible": False,
    },
    "has_expiry_date": {
        "feature_code": "EXPIRY_DATE_GLOBAL",
        "label": "Controla vencimiento",
        "description": "Permite exigir lote y fecha de vencimiento.",
        "default_visible": False,
    },
    "has_serial_numbers": {
        "feature_code": "SERIAL_NUMBERS_GLOBAL",
        "label": "Controla seriales",
        "description": "Permite exigir serial y cantidad unitaria.",
        "default_visible": False,
    },
    "has_location_tracking": {
        "feature_code": "LOCATION_TRACKING_GLOBAL",
        "label": "Controla ubicacion",
        "description": "Permite exigir ubicacion interna de bodega.",
        "default_visible": False,
    },
}


def _bool_text(value, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


async def product_flag_visibility(session) -> dict[str, bool]:
    codes = [config["feature_code"] for config in PRODUCT_FLAG_FEATURES.values()]
    placeholders = ", ".join(f":code_{index}" for index, _ in enumerate(codes))
    result = await session.execute(
        text(f"SELECT feature_code, current_value, default_value, is_active FROM system_features WHERE feature_code IN ({placeholders})"),
        {f"code_{index}": code for index, code in enumerate(codes)},
    )
    rows = {row["feature_code"]: row for row in result.mappings().all()}
    visibility = {}
    for field, config in PRODUCT_FLAG_FEATURES.items():
        row = rows.get(config["feature_code"])
        if not row or not row["is_active"]:
            visibility[field] = bool(config["default_visible"])
            continue
        visibility[field] = _bool_text(row["current_value"], _bool_text(row["default_value"], bool(config["default_visible"])))
    return visibility


async def product_flag_settings(session) -> list[dict]:
    visibility = await product_flag_visibility(session)
    return [
        {
            "field": field,
            "feature_code": config["feature_code"],
            "label": config["label"],
            "description": config["description"],
            "is_visible": visibility[field],
            "default_visible": bool(config["default_visible"]),
        }
        for field, config in PRODUCT_FLAG_FEATURES.items()
    ]


async def apply_product_flag_visibility(session, values: dict, include_unset: bool = True) -> dict:
    visibility = await product_flag_visibility(session)
    next_values = dict(values)
    for field, is_visible in visibility.items():
        if not is_visible and (include_unset or field in next_values):
            next_values[field] = False
    return next_values

