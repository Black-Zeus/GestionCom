"""
Routers para mantenedores base de ventas e inventario.
"""
from datetime import date, datetime, timezone
from itertools import product as cartesian_product

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select, text, update
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.business_foundation import (
    BaseAdjustmentType,
    DteCompanyConfig,
    DteEnvironment,
    PriceList,
    PriceListGroup,
    PriceListItem,
    PriceListScope,
    Product,
    ProductVariant,
    TaxRate,
    TaxType,
)
from database.models.measurement_units import MeasurementUnit
from database.models.product_config import Category
from database.schemas.business_foundation import (
    CompanyConfigCreate,
    CompanyConfigUpdate,
    PriceListCreate,
    PriceListGroupCreate,
    PriceListGroupUpdate,
    PriceListItemCreate,
    PriceListItemUpdate,
    PriceListUpdate,
    ProductCreate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantGenerate,
    ProductVariantUpdate,
    TaxRateCreate,
    TaxRateUpdate,
)
from utils.code_generator import generate_sequential_code
from utils.permissions_utils import get_current_user
from services.media_storage import media_storage

router = APIRouter(tags=["Business Foundation"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def _require(request: Request, permissions: list[str], detail: str) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, permissions):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(
        message="Acceso denegado",
        status_code=HTTPStatus.FORBIDDEN,
        error_code=ErrorCode.PERMISSION_DENIED,
        error_type=ErrorType.PERMISSION_ERROR,
        details=detail,
        request=request,
    )
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_products_read(request: Request) -> dict:
    return await _require(request, ["PRODUCTS_ACCESS", "PRODUCTS_MANAGE"], "Se requiere permiso para ver productos")


async def require_products_write(request: Request) -> dict:
    return await _require(request, ["PRODUCTS_MANAGE"], "Se requiere permiso para gestionar productos")


async def require_prices_read(request: Request) -> dict:
    return await _require(request, ["PRICE_LISTS_ACCESS", "PRICE_LISTS_MANAGE"], "Se requiere permiso para ver listas de precios")


async def require_prices_write(request: Request) -> dict:
    return await _require(request, ["PRICE_LISTS_MANAGE"], "Se requiere permiso para gestionar listas de precios")


async def require_taxes_read(request: Request) -> dict:
    return await _require(request, ["TAX_CONFIG_ACCESS", "TAX_CONFIG_MANAGE"], "Se requiere permiso para ver impuestos")


async def require_taxes_write(request: Request) -> dict:
    return await _require(request, ["TAX_CONFIG_MANAGE"], "Se requiere permiso para gestionar impuestos")


async def require_company_read(request: Request) -> dict:
    return await _require(request, ["COMPANY_CONFIG_ACCESS", "COMPANY_CONFIG_MANAGE"], "Se requiere permiso para ver empresa")


async def require_company_write(request: Request) -> dict:
    return await _require(request, ["COMPANY_CONFIG_MANAGE"], "Se requiere permiso para gestionar empresa")


def _decimal(value):
    return float(value) if value is not None else None


def _date(value):
    return value.isoformat() if value else None


def _rel(instance, name: str):
    return instance.__dict__.get(name)


def tax_to_dict(tax: TaxRate) -> dict:
    return {
        "id": tax.id,
        "tax_code": tax.tax_code,
        "tax_name": tax.tax_name,
        "tax_type": tax.tax_type.value if tax.tax_type else None,
        "rate_percentage": _decimal(tax.rate_percentage),
        "is_default": tax.is_default,
        "valid_from": _date(tax.valid_from),
        "valid_to": _date(tax.valid_to),
        "is_active": tax.is_active,
        "created_at": tax.created_at.isoformat() if tax.created_at else None,
        "updated_at": tax.updated_at.isoformat() if tax.updated_at else None,
    }


def group_to_dict(group: PriceListGroup) -> dict:
    return {
        "id": group.id,
        "group_code": group.group_code,
        "group_name": group.group_name,
        "group_description": group.group_description,
        "category_code": group.group_code,
        "category_name": group.group_name,
        "category_description": group.group_description,
        "is_active": group.is_active,
        "created_at": group.created_at.isoformat() if group.created_at else None,
        "updated_at": group.updated_at.isoformat() if group.updated_at else None,
    }


def price_list_to_dict(price_list: PriceList) -> dict:
    group = _rel(price_list, "group")
    base_price_list = _rel(price_list, "base_price_list")
    return {
        "id": price_list.id,
        "price_list_group_id": price_list.price_list_group_id,
        "group_code": group.group_code if group else None,
        "group_name": group.group_name if group else None,
        "price_list_category_id": price_list.price_list_group_id,
        "category_code": group.group_code if group else None,
        "category_name": group.group_name if group else None,
        "price_list_code": price_list.price_list_code,
        "price_list_name": price_list.price_list_name,
        "base_price_list_id": price_list.base_price_list_id,
        "base_price_list_code": base_price_list.price_list_code if base_price_list else None,
        "base_adjustment_type": price_list.base_adjustment_type.value if price_list.base_adjustment_type else None,
        "base_adjustment_value": _decimal(price_list.base_adjustment_value),
        "currency_code": price_list.currency_code,
        "valid_from": _date(price_list.valid_from),
        "valid_to": _date(price_list.valid_to),
        "priority": price_list.priority,
        "applies_to": price_list.applies_to.value if price_list.applies_to else None,
        "is_active": price_list.is_active,
        "created_at": price_list.created_at.isoformat() if price_list.created_at else None,
        "updated_at": price_list.updated_at.isoformat() if price_list.updated_at else None,
    }


def product_to_dict(product: Product) -> dict:
    category = _rel(product, "category")
    base_unit = _rel(product, "base_unit")
    brand_ref = _rel(product, "brand_ref")
    model_ref = _rel(product, "model_ref")
    return {
        "id": product.id,
        "category_id": product.category_id,
        "category_code": category.category_code if category else None,
        "category_name": category.category_name if category else None,
        "product_code": product.product_code,
        "product_name": product.product_name,
        "product_description": product.product_description,
        "primary_image_media_asset_id": product.primary_image_media_asset_id,
        "brand_id": product.brand_id,
        "brand_code": brand_ref.brand_code if brand_ref else None,
        "brand_name": brand_ref.brand_name if brand_ref else None,
        "brand": product.brand,
        "product_model_id": product.product_model_id,
        "model_code": model_ref.model_code if model_ref else None,
        "model_name": model_ref.model_name if model_ref else None,
        "model": product.model,
        "base_measurement_unit_id": product.base_measurement_unit_id,
        "base_unit_code": base_unit.unit_code if base_unit else None,
        "base_unit_name": base_unit.unit_name if base_unit else None,
        "base_price": _decimal(product.base_price),
        "cost_price": _decimal(product.cost_price),
        "has_variants": product.has_variants,
        "is_active": product.is_active,
        "has_batch_control": product.has_batch_control,
        "has_expiry_date": product.has_expiry_date,
        "has_serial_numbers": product.has_serial_numbers,
        "has_location_tracking": product.has_location_tracking,
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "updated_at": product.updated_at.isoformat() if product.updated_at else None,
    }


def variant_to_dict(variant: ProductVariant) -> dict:
    product = _rel(variant, "product")
    attributes = getattr(variant, "_attributes", [])
    return {
        "id": variant.id,
        "product_id": variant.product_id,
        "product_code": product.product_code if product else None,
        "product_name": product.product_name if product else None,
        "variant_sku": variant.variant_sku,
        "variant_name": variant.variant_name,
        "variant_description": variant.variant_description,
        "is_default_variant": variant.is_default_variant,
        "is_active": variant.is_active,
        "attributes": attributes,
        "attribute_summary": " / ".join(
            f"{item.get('attribute_name')}: {item.get('value_name')}" for item in attributes if item.get("value_name")
        ),
        "created_at": variant.created_at.isoformat() if variant.created_at else None,
        "updated_at": variant.updated_at.isoformat() if variant.updated_at else None,
    }


async def _variant_attribute_map(session, variant_ids: list[int]) -> dict[int, list[dict]]:
    if not variant_ids:
        return {}
    placeholders = ", ".join(f":id_{index}" for index, _ in enumerate(variant_ids))
    params = {f"id_{index}": item_id for index, item_id in enumerate(variant_ids)}
    result = await session.execute(
        text(
            f"""
            SELECT
              pva.product_variant_id,
              a.id AS attribute_id,
              a.attribute_code,
              a.attribute_name,
              av.id AS value_id,
              av.value_code,
              COALESCE(av.value_name, pva.text_value) AS value_name,
              pva.text_value
            FROM product_variant_attributes pva
            JOIN attributes a ON a.id = pva.attribute_id
            LEFT JOIN attribute_values av ON av.id = pva.attribute_value_id
            WHERE pva.product_variant_id IN ({placeholders})
            ORDER BY a.sort_order, a.attribute_name, av.sort_order, av.value_name
            """
        ),
        params,
    )
    mapped: dict[int, list[dict]] = {}
    for row in result.mappings():
        mapped.setdefault(row["product_variant_id"], []).append({
            "attribute_id": row["attribute_id"],
            "attribute_code": row["attribute_code"],
            "attribute_name": row["attribute_name"],
            "value_id": row["value_id"],
            "value_code": row["value_code"],
            "value_name": row["value_name"],
            "text_value": row["text_value"],
        })
    return mapped


def price_item_to_dict(item: PriceListItem) -> dict:
    price_list = _rel(item, "price_list")
    item_product = _rel(item, "product")
    variant = _rel(item, "product_variant")
    measurement_unit = _rel(item, "measurement_unit")
    product = item_product or (_rel(variant, "product") if variant else None)
    return {
        "id": item.id,
        "price_list_id": item.price_list_id,
        "price_list_code": price_list.price_list_code if price_list else None,
        "price_list_name": price_list.price_list_name if price_list else None,
        "price_scope": "VARIANT" if item.product_variant_id else "PRODUCT",
        "product_id": item.product_id,
        "product_code": product.product_code if product else None,
        "product_name": product.product_name if product else None,
        "product_variant_id": item.product_variant_id,
        "variant_sku": variant.variant_sku if variant else None,
        "variant_name": variant.variant_name if variant else None,
        "measurement_unit_id": item.measurement_unit_id,
        "unit_code": measurement_unit.unit_code if measurement_unit else None,
        "unit_name": measurement_unit.unit_name if measurement_unit else None,
        "base_price": _decimal(item.base_price),
        "sale_price": _decimal(item.sale_price),
        "cost_price": _decimal(item.cost_price),
        "margin_percentage": _decimal(item.margin_percentage),
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


async def _variant_unit_rows(session, product_variant_id: int) -> list[dict]:
    result = await session.execute(
        text(
            """
            SELECT
              pmu.measurement_unit_id AS id,
              mu.unit_code,
              mu.unit_name,
              mu.unit_symbol,
              pmu.conversion_factor,
              pmu.is_sale_unit,
              pmu.is_inventory_unit,
              CASE WHEN p.base_measurement_unit_id = mu.id THEN TRUE ELSE FALSE END AS is_base_unit
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            JOIN product_measurement_units pmu ON pmu.product_id = p.id
            JOIN measurement_units mu ON mu.id = pmu.measurement_unit_id
            WHERE pv.id = :product_variant_id
              AND pv.deleted_at IS NULL
              AND p.deleted_at IS NULL
              AND pmu.is_active = TRUE
              AND mu.deleted_at IS NULL
              AND mu.is_active = TRUE
            ORDER BY CASE WHEN p.base_measurement_unit_id = mu.id THEN 0 ELSE 1 END, mu.unit_name
            """
        ),
        {"product_variant_id": product_variant_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def _product_unit_rows(session, product_id: int) -> list[dict]:
    result = await session.execute(
        text(
            """
            SELECT
              pmu.measurement_unit_id AS id,
              mu.unit_code,
              mu.unit_name,
              mu.unit_symbol,
              pmu.conversion_factor,
              pmu.is_sale_unit,
              pmu.is_inventory_unit,
              CASE WHEN p.base_measurement_unit_id = mu.id THEN TRUE ELSE FALSE END AS is_base_unit
            FROM products p
            JOIN product_measurement_units pmu ON pmu.product_id = p.id
            JOIN measurement_units mu ON mu.id = pmu.measurement_unit_id
            WHERE p.id = :product_id
              AND p.deleted_at IS NULL
              AND pmu.is_active = TRUE
              AND mu.deleted_at IS NULL
              AND mu.is_active = TRUE
            ORDER BY CASE WHEN p.base_measurement_unit_id = mu.id THEN 0 ELSE 1 END, mu.unit_name
            """
        ),
        {"product_id": product_id},
    )
    return [dict(row) for row in result.mappings().all()]


async def _resolve_price_row(
    session,
    *,
    product_variant_id: int,
    measurement_unit_id: int | None = None,
    customer_id: int | None = None,
    price_list_id: int | None = None,
    currency_code: str | None = None,
    price_date: date | None = None,
) -> dict | None:
    price_date = price_date or date.today()
    selected_currency = currency_code.upper() if currency_code else None

    customer = None
    if customer_id:
        customer_result = await session.execute(
            text(
                """
                SELECT id, legal_name, price_list_id, default_currency_code
                FROM customers
                WHERE id = :customer_id AND deleted_at IS NULL
                """
            ),
            {"customer_id": customer_id},
        )
        customer = customer_result.mappings().first()
        if customer and not selected_currency:
            selected_currency = customer["default_currency_code"]

    units = await _variant_unit_rows(session, product_variant_id)
    if not units:
        return None
    variant_result = await session.execute(
        text(
            """
            SELECT pv.product_id
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = :product_variant_id
              AND pv.deleted_at IS NULL
              AND p.deleted_at IS NULL
            """
        ),
        {"product_variant_id": product_variant_id},
    )
    variant_row = variant_result.mappings().first()
    if not variant_row:
        return None
    product_id = int(variant_row["product_id"])
    valid_unit_ids = {int(unit["id"]) for unit in units}
    selected_unit_id = int(measurement_unit_id or units[0]["id"])
    if selected_unit_id not in valid_unit_ids:
        return None

    params = {
        "product_variant_id": product_variant_id,
        "product_id": product_id,
        "measurement_unit_id": selected_unit_id,
        "price_date": price_date,
        "currency_code": selected_currency,
        "price_list_id": price_list_id,
        "customer_price_list_id": customer["price_list_id"] if customer else None,
    }

    list_filters = [
        "pl.deleted_at IS NULL",
        "pl.is_active = TRUE",
        "pl.valid_from <= :price_date",
        "(pl.valid_to IS NULL OR pl.valid_to >= :price_date)",
    ]
    if selected_currency:
        list_filters.append("pl.currency_code = :currency_code")
    if price_list_id:
        list_filters.append("pl.id = :price_list_id")
    elif customer and customer["price_list_id"]:
        list_filters.append("pl.id = :customer_price_list_id")

    base_query = f"""
        SELECT
          pli.id AS price_list_item_id,
          pl.id AS price_list_id,
          pl.price_list_code,
          pl.price_list_name,
          pl.currency_code,
          pl.priority,
          pl.base_price_list_id,
          pl.base_adjustment_type,
          pl.base_adjustment_value,
          pli.product_id AS price_product_id,
          pli.product_variant_id AS price_product_variant_id,
          :product_variant_id AS product_variant_id,
          pli.measurement_unit_id,
          pli.base_price,
          pli.sale_price,
          pli.cost_price,
          pli.margin_percentage,
          pv.variant_sku,
          pv.variant_name,
          p.product_name,
          mu.unit_code,
          mu.unit_name,
          CASE WHEN pli.product_variant_id IS NULL THEN 'PRODUCT' ELSE 'VARIANT' END AS price_scope,
          CASE WHEN pli.product_variant_id IS NULL THEN 'PRODUCT_DIRECT' ELSE 'VARIANT_DIRECT' END AS resolution_source
        FROM price_lists pl
        JOIN price_list_items pli
          ON pli.price_list_id = pl.id
         AND pli.deleted_at IS NULL
         AND pli.is_active = TRUE
         AND pli.product_id = :product_id
         AND (pli.product_variant_id = :product_variant_id OR pli.product_variant_id IS NULL)
         AND pli.measurement_unit_id = :measurement_unit_id
        JOIN product_variants pv ON pv.id = :product_variant_id
        JOIN products p ON p.id = pv.product_id
        JOIN measurement_units mu ON mu.id = pli.measurement_unit_id
        WHERE {' AND '.join(list_filters)}
        ORDER BY CASE WHEN pli.product_variant_id = :product_variant_id THEN 0 ELSE 1 END, pl.priority ASC, pl.id ASC
        LIMIT 1
    """
    result = await session.execute(text(base_query), params)
    direct = result.mappings().first()
    if direct:
        return dict(direct)

    derived_query = f"""
        SELECT
          base_pli.id AS price_list_item_id,
          pl.id AS price_list_id,
          pl.price_list_code,
          pl.price_list_name,
          pl.currency_code,
          pl.priority,
          pl.base_price_list_id,
          pl.base_adjustment_type,
          pl.base_adjustment_value,
          base_pli.product_id AS price_product_id,
          base_pli.product_variant_id AS price_product_variant_id,
          :product_variant_id AS product_variant_id,
          base_pli.measurement_unit_id,
          base_pli.base_price,
          CASE
            WHEN pl.base_adjustment_type = 'PERCENTAGE' THEN base_pli.sale_price * (1 + COALESCE(pl.base_adjustment_value, 0) / 100)
            WHEN pl.base_adjustment_type = 'FIXED' THEN base_pli.sale_price + COALESCE(pl.base_adjustment_value, 0)
            ELSE base_pli.sale_price
          END AS sale_price,
          base_pli.cost_price,
          base_pli.margin_percentage,
          pv.variant_sku,
          pv.variant_name,
          p.product_name,
          mu.unit_code,
          mu.unit_name,
          CASE WHEN base_pli.product_variant_id IS NULL THEN 'PRODUCT' ELSE 'VARIANT' END AS price_scope,
          CASE WHEN base_pli.product_variant_id IS NULL THEN 'PRODUCT_DERIVED' ELSE 'VARIANT_DERIVED' END AS resolution_source
        FROM price_lists pl
        JOIN price_lists base_pl
          ON base_pl.id = pl.base_price_list_id
         AND base_pl.deleted_at IS NULL
         AND base_pl.is_active = TRUE
        JOIN price_list_items base_pli
          ON base_pli.price_list_id = base_pl.id
         AND base_pli.deleted_at IS NULL
         AND base_pli.is_active = TRUE
         AND base_pli.product_id = :product_id
         AND (base_pli.product_variant_id = :product_variant_id OR base_pli.product_variant_id IS NULL)
         AND base_pli.measurement_unit_id = :measurement_unit_id
        JOIN product_variants pv ON pv.id = :product_variant_id
        JOIN products p ON p.id = pv.product_id
        JOIN measurement_units mu ON mu.id = base_pli.measurement_unit_id
        WHERE {' AND '.join(list_filters)}
          AND pl.base_price_list_id IS NOT NULL
        ORDER BY CASE WHEN base_pli.product_variant_id = :product_variant_id THEN 0 ELSE 1 END, pl.priority ASC, pl.id ASC
        LIMIT 1
    """
    result = await session.execute(text(derived_query), params)
    derived = result.mappings().first()
    return dict(derived) if derived else None


async def _validate_price_item_payload(session, *, product_id: int, product_variant_id: int | None, measurement_unit_id: int) -> str | None:
    product_result = await session.execute(
        select(Product).where(and_(Product.id == product_id, Product.deleted_at.is_(None)))
    )
    if not product_result.scalar_one_or_none():
        return "Producto no encontrado"
    if product_variant_id:
        variant_result = await session.execute(
            select(ProductVariant).where(and_(ProductVariant.id == product_variant_id, ProductVariant.deleted_at.is_(None)))
        )
        variant = variant_result.scalar_one_or_none()
        if not variant:
            return "SKU no encontrado"
        if int(variant.product_id) != int(product_id):
            return "El SKU seleccionado no pertenece al producto base"
    units = await _product_unit_rows(session, product_id)
    if not units:
        return "Producto sin unidades configuradas"
    if int(measurement_unit_id) not in {int(unit["id"]) for unit in units if unit.get("is_sale_unit") or unit.get("is_base_unit")}:
        return "La unidad seleccionada no esta habilitada para venta en este producto"
    return None


async def _validate_price_item_duplicate(
    session,
    *,
    price_list_id: int,
    product_id: int,
    product_variant_id: int | None,
    measurement_unit_id: int,
    exclude_item_id: int | None = None,
) -> str | None:
    conditions = [
        PriceListItem.price_list_id == price_list_id,
        PriceListItem.product_id == product_id,
        PriceListItem.measurement_unit_id == measurement_unit_id,
        PriceListItem.deleted_at.is_(None),
    ]
    if product_variant_id:
        conditions.append(PriceListItem.product_variant_id == product_variant_id)
    else:
        conditions.append(PriceListItem.product_variant_id.is_(None))
    if exclude_item_id:
        conditions.append(PriceListItem.id != exclude_item_id)
    result = await session.execute(select(PriceListItem.id).where(and_(*conditions)).limit(1))
    if result.scalar_one_or_none():
        return "Ya existe un precio para la lista, producto, SKU y unidad seleccionados"
    return None


def company_to_dict(company: DteCompanyConfig) -> dict:
    return {
        "id": company.id,
        "company_rut": company.company_rut,
        "company_name": company.company_name,
        "company_business_name": company.company_business_name,
        "company_address": company.company_address,
        "company_comuna": company.company_comuna,
        "company_city": company.company_city,
        "company_region": company.company_region,
        "economic_activity_code": company.economic_activity_code,
        "economic_activity_name": company.economic_activity_name,
        "dte_environment": company.dte_environment.value if company.dte_environment else None,
        "default_customer_currency_code": company.default_customer_currency_code,
        "default_supplier_currency_code": company.default_supplier_currency_code,
        "default_sales_currency_code": company.default_sales_currency_code,
        "sii_user": company.sii_user,
        "logo_media_asset_id": company.logo_media_asset_id,
        "banner_media_asset_id": company.banner_media_asset_id,
        "is_active": company.is_active,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
    }


async def enforce_company_singletons(session, values: dict, exclude_company_id: int | None = None) -> None:
    if values.get("is_active") is True:
        statement = update(DteCompanyConfig).where(DteCompanyConfig.is_active.is_(True))
        if exclude_company_id:
            statement = statement.where(DteCompanyConfig.id != exclude_company_id)
        await session.execute(statement.values(is_active=False))

    if values.get("dte_environment") == DteEnvironment.PRODUCCION:
        statement = update(DteCompanyConfig).where(DteCompanyConfig.dte_environment == DteEnvironment.PRODUCCION)
        if exclude_company_id:
            statement = statement.where(DteCompanyConfig.id != exclude_company_id)
        await session.execute(statement.values(dte_environment=DteEnvironment.CERTIFICACION))


async def _media_map(session, asset_ids: list[int]) -> dict[int, dict]:
    ids = sorted({int(asset_id) for asset_id in asset_ids if asset_id})
    if not ids:
        return {}
    result = await session.execute(
        text(f"SELECT * FROM media_assets WHERE id IN ({', '.join(str(item) for item in ids)}) AND deleted_at IS NULL")
    )
    assets = {}
    for asset in result.mappings().all():
        item = {key: (value.isoformat() if hasattr(value, "isoformat") else value) for key, value in asset.items()}
        assets[int(asset["id"])] = media_storage.safe_asset(item)
    return assets


@router.get("/tax-rates", response_class=JSONResponse)
async def list_tax_rates(request: Request, user: dict = Depends(require_taxes_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(TaxRate).where(TaxRate.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(TaxRate.is_active == True)
        result = await session.execute(stmt.order_by(TaxRate.tax_code))
        return ResponseManager.success(data=[tax_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/tax-rates", response_class=JSONResponse)
async def create_tax_rate(data: TaxRateCreate, request: Request, user: dict = Depends(require_taxes_write)):
    async with db_manager.get_async_session() as session:
        if data.is_default:
            await session.execute(TaxRate.__table__.update().values(is_default=False))
        tax = TaxRate(tax_code=await generate_sequential_code(session, TaxRate, "tax_code", "TAX"), tax_name=data.tax_name, tax_type=TaxType(data.tax_type), rate_percentage=data.rate_percentage, is_default=data.is_default, valid_from=data.valid_from, valid_to=data.valid_to, is_active=data.is_active)
        session.add(tax)
        await session.commit()
        await session.refresh(tax)
        return ResponseManager.success(data=tax_to_dict(tax), message="Impuesto creado correctamente", request=request)


@router.put("/tax-rates/{tax_id}", response_class=JSONResponse)
async def update_tax_rate(data: TaxRateUpdate, request: Request, tax_id: int = Path(..., gt=0), user: dict = Depends(require_taxes_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(TaxRate).where(and_(TaxRate.id == tax_id, TaxRate.deleted_at.is_(None))))
        tax = result.scalar_one_or_none()
        if not tax:
            return ResponseManager.error(message="Impuesto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        if data.is_default:
            await session.execute(TaxRate.__table__.update().where(TaxRate.id != tax_id).values(is_default=False))
        for field in ["tax_name", "rate_percentage", "is_default", "valid_from", "valid_to", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(tax, field, value)
        if data.tax_type is not None:
            tax.tax_type = TaxType(data.tax_type)
        await session.commit()
        await session.refresh(tax)
        return ResponseManager.success(data=tax_to_dict(tax), message="Impuesto actualizado correctamente", request=request)


@router.delete("/tax-rates/{tax_id}", response_class=JSONResponse)
async def delete_tax_rate(request: Request, tax_id: int = Path(..., gt=0), user: dict = Depends(require_taxes_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(TaxRate).where(and_(TaxRate.id == tax_id, TaxRate.deleted_at.is_(None))))
        tax = result.scalar_one_or_none()
        if not tax:
            return ResponseManager.error(message="Impuesto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        tax.deleted_at = datetime.now(timezone.utc)
        tax.is_active = False
        await session.commit()
        return ResponseManager.success(data=tax_to_dict(tax), message="Impuesto eliminado correctamente", request=request)


@router.get("/price-list-groups", response_class=JSONResponse)
async def list_price_list_groups(request: Request, user: dict = Depends(require_prices_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(PriceListGroup).where(PriceListGroup.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(PriceListGroup.is_active == True)
        result = await session.execute(stmt.order_by(PriceListGroup.group_code))
        return ResponseManager.success(data=[group_to_dict(item) for item in result.scalars().all()], request=request)


@router.get("/price-list-categories", response_class=JSONResponse)
async def list_price_list_categories(request: Request, user: dict = Depends(require_prices_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(PriceListGroup).where(PriceListGroup.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(PriceListGroup.is_active == True)
        result = await session.execute(
            stmt.order_by(
                text("FIELD(group_code, 'PLC_RETAIL', 'PLC_WHOLESALE', 'PLC_AGREEMENT', 'PLC_PROMOTION', 'PLC_INTERNAL')"),
                PriceListGroup.group_name,
            )
        )
        return ResponseManager.success(data=[group_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/price-list-groups", response_class=JSONResponse)
async def create_price_list_group(data: PriceListGroupCreate, request: Request, user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        group = PriceListGroup(group_code=await generate_sequential_code(session, PriceListGroup, "group_code", "PLG"), group_name=data.group_name, group_description=data.group_description, is_active=data.is_active)
        session.add(group)
        await session.commit()
        await session.refresh(group)
        return ResponseManager.success(data=group_to_dict(group), message="Grupo creado correctamente", request=request)


@router.put("/price-list-groups/{group_id}", response_class=JSONResponse)
async def update_price_list_group(data: PriceListGroupUpdate, request: Request, group_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceListGroup).where(and_(PriceListGroup.id == group_id, PriceListGroup.deleted_at.is_(None))))
        group = result.scalar_one_or_none()
        if not group:
            return ResponseManager.error(message="Grupo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field in ["group_name", "group_description", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(group, field, value)
        await session.commit()
        await session.refresh(group)
        return ResponseManager.success(data=group_to_dict(group), message="Grupo actualizado correctamente", request=request)


@router.delete("/price-list-groups/{group_id}", response_class=JSONResponse)
async def delete_price_list_group(request: Request, group_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceListGroup).where(and_(PriceListGroup.id == group_id, PriceListGroup.deleted_at.is_(None))))
        group = result.scalar_one_or_none()
        if not group:
            return ResponseManager.error(message="Grupo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        group.deleted_at = datetime.now(timezone.utc)
        group.is_active = False
        await session.commit()
        return ResponseManager.success(data=group_to_dict(group), message="Grupo eliminado correctamente", request=request)


@router.get("/price-lists", response_class=JSONResponse)
async def list_price_lists(request: Request, user: dict = Depends(require_prices_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(PriceList).options(selectinload(PriceList.group), selectinload(PriceList.base_price_list)).where(PriceList.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(PriceList.is_active == True)
        result = await session.execute(stmt.order_by(PriceList.priority, PriceList.price_list_code))
        return ResponseManager.success(data=[price_list_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/price-lists", response_class=JSONResponse)
async def create_price_list(data: PriceListCreate, request: Request, user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        price_list = PriceList(price_list_code=await generate_sequential_code(session, PriceList, "price_list_code", "PRL"), price_list_group_id=data.price_list_group_id, price_list_name=data.price_list_name, base_price_list_id=data.base_price_list_id, base_adjustment_type=BaseAdjustmentType(data.base_adjustment_type) if data.base_adjustment_type else None, base_adjustment_value=data.base_adjustment_value, currency_code=data.currency_code.upper(), valid_from=data.valid_from, valid_to=data.valid_to, priority=data.priority, applies_to=PriceListScope(data.applies_to), is_active=data.is_active)
        session.add(price_list)
        await session.commit()
        await session.refresh(price_list)
        return ResponseManager.success(data=price_list_to_dict(price_list), message="Lista creada correctamente", request=request)


@router.put("/price-lists/{price_list_id}", response_class=JSONResponse)
async def update_price_list(data: PriceListUpdate, request: Request, price_list_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceList).options(selectinload(PriceList.group), selectinload(PriceList.base_price_list)).where(and_(PriceList.id == price_list_id, PriceList.deleted_at.is_(None))))
        price_list = result.scalar_one_or_none()
        if not price_list:
            return ResponseManager.error(message="Lista no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        if data.base_price_list_id is not None and int(data.base_price_list_id) == int(price_list_id):
            return ResponseManager.error(message="La lista base no puede ser la misma lista", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
        provided_fields = data.model_fields_set
        nullable_fields = {"price_list_group_id", "base_price_list_id", "base_adjustment_value", "valid_to"}
        for field in ["price_list_group_id", "price_list_name", "base_price_list_id", "base_adjustment_value", "valid_from", "valid_to", "priority", "is_active"]:
            if field not in provided_fields:
                continue
            value = getattr(data, field)
            if value is not None or field in nullable_fields:
                setattr(price_list, field, value)
        if data.currency_code is not None:
            price_list.currency_code = data.currency_code.upper()
        if "base_adjustment_type" in provided_fields:
            price_list.base_adjustment_type = BaseAdjustmentType(data.base_adjustment_type) if data.base_adjustment_type else None
        if data.applies_to is not None:
            price_list.applies_to = PriceListScope(data.applies_to)
        await session.commit()
        await session.refresh(price_list)
        return ResponseManager.success(data=price_list_to_dict(price_list), message="Lista actualizada correctamente", request=request)


@router.delete("/price-lists/{price_list_id}", response_class=JSONResponse)
async def delete_price_list(request: Request, price_list_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceList).where(and_(PriceList.id == price_list_id, PriceList.deleted_at.is_(None))))
        price_list = result.scalar_one_or_none()
        if not price_list:
            return ResponseManager.error(message="Lista no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        price_list.deleted_at = datetime.now(timezone.utc)
        price_list.is_active = False
        await session.commit()
        return ResponseManager.success(data=price_list_to_dict(price_list), message="Lista eliminada correctamente", request=request)


@router.get("/price-list-items", response_class=JSONResponse)
async def list_price_list_items(request: Request, user: dict = Depends(require_prices_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(PriceListItem).options(selectinload(PriceListItem.price_list), selectinload(PriceListItem.product), selectinload(PriceListItem.product_variant).selectinload(ProductVariant.product), selectinload(PriceListItem.measurement_unit)).where(PriceListItem.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(PriceListItem.is_active == True)
        result = await session.execute(stmt.order_by(PriceListItem.price_list_id, PriceListItem.product_id, PriceListItem.product_variant_id))
        return ResponseManager.success(data=[price_item_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/price-list-items", response_class=JSONResponse)
async def create_price_list_item(data: PriceListItemCreate, request: Request, user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        validation_error = await _validate_price_item_payload(session, product_id=data.product_id, product_variant_id=data.product_variant_id, measurement_unit_id=data.measurement_unit_id)
        if not validation_error:
            validation_error = await _validate_price_item_duplicate(
                session,
                price_list_id=data.price_list_id,
                product_id=data.product_id,
                product_variant_id=data.product_variant_id,
                measurement_unit_id=data.measurement_unit_id,
            )
        if validation_error:
            return ResponseManager.error(message=validation_error, status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
        item = PriceListItem(**data.model_dump())
        session.add(item)
        await session.commit()
        await session.refresh(item)
        return ResponseManager.success(data=price_item_to_dict(item), message="Precio creado correctamente", request=request)


@router.put("/price-list-items/{item_id}", response_class=JSONResponse)
async def update_price_list_item(data: PriceListItemUpdate, request: Request, item_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceListItem).where(and_(PriceListItem.id == item_id, PriceListItem.deleted_at.is_(None))))
        item = result.scalar_one_or_none()
        if not item:
            return ResponseManager.error(message="Precio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        next_product_id = data.product_id or item.product_id
        next_variant_id = data.product_variant_id if "product_variant_id" in data.model_fields_set else item.product_variant_id
        next_unit_id = data.measurement_unit_id or item.measurement_unit_id
        next_price_list_id = data.price_list_id or item.price_list_id
        validation_error = await _validate_price_item_payload(session, product_id=next_product_id, product_variant_id=next_variant_id, measurement_unit_id=next_unit_id)
        if not validation_error:
            validation_error = await _validate_price_item_duplicate(
                session,
                price_list_id=next_price_list_id,
                product_id=next_product_id,
                product_variant_id=next_variant_id,
                measurement_unit_id=next_unit_id,
                exclude_item_id=item_id,
            )
        if validation_error:
            return ResponseManager.error(message=validation_error, status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        await session.commit()
        await session.refresh(item)
        return ResponseManager.success(data=price_item_to_dict(item), message="Precio actualizado correctamente", request=request)


@router.delete("/price-list-items/{item_id}", response_class=JSONResponse)
async def delete_price_list_item(request: Request, item_id: int = Path(..., gt=0), user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(PriceListItem).where(and_(PriceListItem.id == item_id, PriceListItem.deleted_at.is_(None))))
        item = result.scalar_one_or_none()
        if not item:
            return ResponseManager.error(message="Precio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        item.deleted_at = datetime.now(timezone.utc)
        item.is_active = False
        await session.commit()
        return ResponseManager.success(data=price_item_to_dict(item), message="Precio eliminado correctamente", request=request)


@router.get("/products/{product_id}/units", response_class=JSONResponse)
async def list_product_units(request: Request, product_id: int = Path(..., gt=0), user: dict = Depends(require_prices_read)):
    async with db_manager.get_async_session() as session:
        rows = await _product_unit_rows(session, product_id)
        if not rows:
            return ResponseManager.error(message="Producto sin unidades de venta configuradas", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        data = [{
            "id": int(row["id"]),
            "measurement_unit_id": int(row["id"]),
            "unit_code": row["unit_code"],
            "unit_name": row["unit_name"],
            "unit_symbol": row["unit_symbol"],
            "conversion_factor": _decimal(row["conversion_factor"]),
            "is_sale_unit": bool(row["is_sale_unit"]),
            "is_inventory_unit": bool(row["is_inventory_unit"]),
            "is_base_unit": bool(row["is_base_unit"]),
        } for row in rows if row.get("is_sale_unit") or row.get("is_base_unit")]
        return ResponseManager.success(data=data, request=request)


@router.get("/product-variants/{variant_id}/units", response_class=JSONResponse)
async def list_variant_units(request: Request, variant_id: int = Path(..., gt=0), user: dict = Depends(require_prices_read)):
    async with db_manager.get_async_session() as session:
        rows = await _variant_unit_rows(session, variant_id)
        if not rows:
            return ResponseManager.error(message="SKU sin unidades de venta configuradas", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        data = [{
            "id": int(row["id"]),
            "measurement_unit_id": int(row["id"]),
            "unit_code": row["unit_code"],
            "unit_name": row["unit_name"],
            "unit_symbol": row["unit_symbol"],
            "conversion_factor": _decimal(row["conversion_factor"]),
            "is_sale_unit": bool(row["is_sale_unit"]),
            "is_inventory_unit": bool(row["is_inventory_unit"]),
            "is_base_unit": bool(row["is_base_unit"]),
        } for row in rows if row.get("is_sale_unit") or row.get("is_base_unit")]
        return ResponseManager.success(data=data, request=request)


@router.get("/product-variants/{variant_id}/pricing-reference", response_class=JSONResponse)
async def get_variant_pricing_reference(
    request: Request,
    variant_id: int = Path(..., gt=0),
    measurement_unit_id: int | None = Query(None, gt=0),
    user: dict = Depends(require_prices_read),
):
    async with db_manager.get_async_session() as session:
        variant_result = await session.execute(
            text(
                """
                SELECT pv.id, pv.variant_name, p.product_name
                FROM product_variants pv
                JOIN products p ON p.id = pv.product_id
                WHERE pv.id = :variant_id
                  AND pv.deleted_at IS NULL
                  AND p.deleted_at IS NULL
                """
            ),
            {"variant_id": variant_id},
        )
        variant = variant_result.mappings().first()
        if not variant:
            return ResponseManager.error(message="SKU no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)

        params = {"variant_id": variant_id, "measurement_unit_id": measurement_unit_id}
        stock_unit_filter = "AND sm.measurement_unit_id = :measurement_unit_id" if measurement_unit_id else ""
        stock_result = await session.execute(
            text(
                f"""
                SELECT sm.unit_cost, sm.created_at, sm.reference_type, sm.movement_type, mu.unit_code, mu.unit_name
                FROM stock_movements sm
                LEFT JOIN measurement_units mu ON mu.id = sm.measurement_unit_id
                WHERE sm.product_variant_id = :variant_id
                  AND sm.quantity > 0
                  AND sm.unit_cost IS NOT NULL
                  AND sm.unit_cost > 0
                  {stock_unit_filter}
                ORDER BY sm.created_at DESC, sm.id DESC
                LIMIT 1
                """
            ),
            params,
        )
        stock_cost = stock_result.mappings().first()

        supplier_unit_filter = "AND (sp.measurement_unit_id = :measurement_unit_id OR sp.measurement_unit_id IS NULL)" if measurement_unit_id else ""
        supplier_result = await session.execute(
            text(
                f"""
                SELECT sp.last_purchase_cost, sp.updated_at, sp.is_preferred, sp.measurement_unit_id, mu.unit_code, mu.unit_name, s.legal_name AS supplier_name
                FROM supplier_products sp
                JOIN suppliers s ON s.id = sp.supplier_id
                LEFT JOIN measurement_units mu ON mu.id = sp.measurement_unit_id
                WHERE sp.product_variant_id = :variant_id
                  AND sp.deleted_at IS NULL
                  AND sp.is_active = TRUE
                  AND s.deleted_at IS NULL
                  AND s.is_active = TRUE
                  AND sp.last_purchase_cost IS NOT NULL
                  AND sp.last_purchase_cost > 0
                  {supplier_unit_filter}
                ORDER BY
                  CASE WHEN sp.measurement_unit_id = :measurement_unit_id THEN 0 ELSE 1 END,
                  sp.is_preferred DESC,
                  sp.updated_at DESC,
                  sp.id DESC
                LIMIT 1
                """
            ),
            params,
        )
        supplier_cost = supplier_result.mappings().first()

        suggested_cost = None
        cost_source = "MANUAL"
        cost_source_label = "Sin costo de referencia"
        cost_reference_date = None
        cost_reference_detail = "Ingresa el costo manualmente."

        if stock_cost:
            suggested_cost = _decimal(stock_cost["unit_cost"])
            cost_source = "STOCK_MOVEMENT"
            cost_source_label = "Ultimo ingreso de stock"
            cost_reference_date = stock_cost["created_at"].isoformat() if stock_cost["created_at"] else None
            cost_reference_detail = f"{stock_cost['movement_type']} / {stock_cost['reference_type']}"
        elif supplier_cost:
            suggested_cost = _decimal(supplier_cost["last_purchase_cost"])
            cost_source = "PREFERRED_SUPPLIER" if supplier_cost["is_preferred"] else "SUPPLIER"
            cost_source_label = "Proveedor preferido" if supplier_cost["is_preferred"] else "Producto por proveedor"
            cost_reference_date = supplier_cost["updated_at"].isoformat() if supplier_cost["updated_at"] else None
            cost_reference_detail = supplier_cost["supplier_name"]

        data = {
            "product_variant_id": int(variant["id"]),
            "variant_name": variant["variant_name"],
            "product_name": variant["product_name"],
            "measurement_unit_id": measurement_unit_id,
            "suggested_cost": suggested_cost,
            "cost_source": cost_source,
            "cost_source_label": cost_source_label,
            "cost_reference_date": cost_reference_date,
            "cost_reference_detail": cost_reference_detail,
            "last_stock_cost": _decimal(stock_cost["unit_cost"]) if stock_cost else None,
            "preferred_supplier_cost": _decimal(supplier_cost["last_purchase_cost"]) if supplier_cost else None,
        }
        return ResponseManager.success(data=data, request=request)


@router.get("/pricing/resolve", response_class=JSONResponse)
async def resolve_price(
    request: Request,
    product_variant_id: int = Query(..., gt=0),
    measurement_unit_id: int | None = Query(None, gt=0),
    customer_id: int | None = Query(None, gt=0),
    price_list_id: int | None = Query(None, gt=0),
    currency_code: str | None = Query(None, min_length=3, max_length=3),
    price_date: date | None = Query(None),
    user: dict = Depends(require_prices_read),
):
    async with db_manager.get_async_session() as session:
        row = await _resolve_price_row(
            session,
            product_variant_id=product_variant_id,
            measurement_unit_id=measurement_unit_id,
            customer_id=customer_id,
            price_list_id=price_list_id,
            currency_code=currency_code,
            price_date=price_date,
        )
        if not row:
            return ResponseManager.error(message="No existe precio vigente para el SKU y unidad seleccionados", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        data = {
            "price_list_item_id": row["price_list_item_id"],
            "price_list_id": row["price_list_id"],
            "price_list_code": row["price_list_code"],
            "price_list_name": row["price_list_name"],
            "currency_code": row["currency_code"],
            "price_scope": row["price_scope"],
            "product_id": row["price_product_id"],
            "product_variant_id": row["product_variant_id"],
            "price_product_variant_id": row["price_product_variant_id"],
            "variant_sku": row["variant_sku"],
            "variant_name": row["variant_name"],
            "product_name": row["product_name"],
            "measurement_unit_id": row["measurement_unit_id"],
            "unit_code": row["unit_code"],
            "unit_name": row["unit_name"],
            "base_price": _decimal(row["base_price"]),
            "sale_price": _decimal(row["sale_price"]),
            "cost_price": _decimal(row["cost_price"]),
            "margin_percentage": _decimal(row["margin_percentage"]),
            "resolution_source": row["resolution_source"],
            "price_date": (price_date or date.today()).isoformat(),
        }
        return ResponseManager.success(data=data, request=request)


@router.get("/products", response_class=JSONResponse)
async def list_products(request: Request, user: dict = Depends(require_products_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(Product).options(selectinload(Product.category), selectinload(Product.base_unit), selectinload(Product.brand_ref), selectinload(Product.model_ref)).where(Product.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(Product.is_active == True)
        result = await session.execute(stmt.order_by(Product.product_code))
        products = result.scalars().all()
        rows = [product_to_dict(item) for item in products]
        assets = await _media_map(session, [item.get("primary_image_media_asset_id") for item in rows])
        for row in rows:
            row["primary_image"] = assets.get(row.get("primary_image_media_asset_id"))
        return ResponseManager.success(data=rows, request=request)


@router.post("/products", response_class=JSONResponse)
async def create_product(data: ProductCreate, request: Request, user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        product = Product(product_code=await generate_sequential_code(session, Product, "product_code", "PRD"), **data.model_dump())
        session.add(product)
        await session.commit()
        await session.refresh(product)
        return ResponseManager.success(data=product_to_dict(product), message="Producto creado correctamente", request=request)


@router.put("/products/{product_id}", response_class=JSONResponse)
async def update_product(data: ProductUpdate, request: Request, product_id: int = Path(..., gt=0), user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(Product).options(selectinload(Product.category), selectinload(Product.base_unit), selectinload(Product.brand_ref), selectinload(Product.model_ref)).where(and_(Product.id == product_id, Product.deleted_at.is_(None))))
        product = result.scalar_one_or_none()
        if not product:
            return ResponseManager.error(message="Producto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
        await session.commit()
        await session.refresh(product)
        return ResponseManager.success(data=product_to_dict(product), message="Producto actualizado correctamente", request=request)


@router.delete("/products/{product_id}", response_class=JSONResponse)
async def delete_product(request: Request, product_id: int = Path(..., gt=0), user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(Product).where(and_(Product.id == product_id, Product.deleted_at.is_(None))))
        product = result.scalar_one_or_none()
        if not product:
            return ResponseManager.error(message="Producto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        product.deleted_at = datetime.now(timezone.utc)
        product.is_active = False
        await session.commit()
        return ResponseManager.success(data=product_to_dict(product), message="Producto eliminado correctamente", request=request)


@router.get("/product-variants", response_class=JSONResponse)
async def list_product_variants(request: Request, user: dict = Depends(require_products_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(ProductVariant).options(selectinload(ProductVariant.product)).where(ProductVariant.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(ProductVariant.is_active == True)
        result = await session.execute(stmt.order_by(ProductVariant.variant_sku))
        variants = result.scalars().all()
        attributes = await _variant_attribute_map(session, [item.id for item in variants])
        rows = []
        for item in variants:
            item._attributes = attributes.get(item.id, [])
            rows.append(variant_to_dict(item))
        return ResponseManager.success(data=rows, request=request)


@router.get("/product-variants/sku-attributes", response_class=JSONResponse)
async def list_sku_attributes(request: Request, user: dict = Depends(require_products_read)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT
                  a.id AS attribute_id,
                  a.attribute_code,
                  a.attribute_name,
                  a.attribute_type,
                  a.is_required,
                  a.sort_order,
                  av.id AS value_id,
                  av.value_code,
                  av.value_name,
                  av.sort_order AS value_sort_order
                FROM attributes a
                JOIN attribute_values av ON av.attribute_id = a.id
                 AND av.deleted_at IS NULL
                 AND av.is_active = TRUE
                WHERE a.deleted_at IS NULL
                  AND a.is_active = TRUE
                  AND a.affects_sku = TRUE
                  AND a.attribute_type IN ('SELECT', 'MULTISELECT')
                ORDER BY a.sort_order, a.attribute_name, av.sort_order, av.value_name
                """
            )
        )
        attributes: dict[int, dict] = {}
        for row in result.mappings():
            item = attributes.setdefault(row["attribute_id"], {
                "id": row["attribute_id"],
                "attribute_code": row["attribute_code"],
                "attribute_name": row["attribute_name"],
                "attribute_type": row["attribute_type"],
                "is_required": bool(row["is_required"]),
                "sort_order": row["sort_order"],
                "values": [],
            })
            item["values"].append({
                "id": row["value_id"],
                "value_code": row["value_code"],
                "value_name": row["value_name"],
                "sort_order": row["value_sort_order"],
            })
        return ResponseManager.success(data=list(attributes.values()), request=request)


@router.post("/product-variants", response_class=JSONResponse)
async def create_product_variant(data: ProductVariantCreate, request: Request, user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        variant = ProductVariant(variant_sku=await generate_sequential_code(session, ProductVariant, "variant_sku", "SKU"), **data.model_dump())
        if data.is_default_variant:
            await session.execute(ProductVariant.__table__.update().where(ProductVariant.product_id == data.product_id).values(is_default_variant=False))
        session.add(variant)
        await session.commit()
        await session.refresh(variant)
        return ResponseManager.success(data=variant_to_dict(variant), message="SKU creado correctamente", request=request)


@router.post("/product-variants/generate", response_class=JSONResponse)
async def generate_product_variants(data: ProductVariantGenerate, request: Request, user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        product_result = await session.execute(select(Product).where(and_(Product.id == data.product_id, Product.deleted_at.is_(None))))
        base_product = product_result.scalar_one_or_none()
        if not base_product:
            return ResponseManager.error(message="Producto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        if not base_product.has_variants:
            return ResponseManager.error(message="El producto no usa variantes", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        attribute_ids = [item.attribute_id for item in data.attributes]
        value_ids = [value_id for item in data.attributes for value_id in item.value_ids]
        if len(set(attribute_ids)) != len(attribute_ids):
            return ResponseManager.error(message="No se puede repetir un atributo en la generacion", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        attr_params = {f"attr_{index}": item_id for index, item_id in enumerate(attribute_ids)}
        value_params = {f"value_{index}": item_id for index, item_id in enumerate(value_ids)}
        attr_placeholders = ", ".join(f":{key}" for key in attr_params)
        value_placeholders = ", ".join(f":{key}" for key in value_params)
        attr_result = await session.execute(
            text(
                f"""
                SELECT id, attribute_code, attribute_name
                FROM attributes
                WHERE id IN ({attr_placeholders})
                  AND deleted_at IS NULL
                  AND is_active = TRUE
                  AND affects_sku = TRUE
                  AND attribute_type IN ('SELECT', 'MULTISELECT')
                """
            ),
            attr_params,
        )
        attrs = {row["id"]: dict(row) for row in attr_result.mappings()}
        value_result = await session.execute(
            text(
                f"""
                SELECT id, attribute_id, value_code, value_name
                FROM attribute_values
                WHERE id IN ({value_placeholders})
                  AND deleted_at IS NULL
                  AND is_active = TRUE
                """
            ),
            value_params,
        )
        values = {row["id"]: dict(row) for row in value_result.mappings()}
        if len(attrs) != len(attribute_ids) or len(values) != len(value_ids):
            return ResponseManager.error(message="Atributos o valores invalidos para SKU", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

        selected_groups = []
        for item in data.attributes:
            attr = attrs.get(item.attribute_id)
            selected_values = [values[value_id] for value_id in item.value_ids]
            if any(value["attribute_id"] != item.attribute_id for value in selected_values):
                return ResponseManager.error(message="Un valor no pertenece al atributo seleccionado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
            selected_groups.append({"attribute": attr, "values": selected_values})

        existing_result = await session.execute(
            text(
                """
                SELECT pv.id, GROUP_CONCAT(CONCAT(pva.attribute_id, ':', pva.attribute_value_id) ORDER BY pva.attribute_id SEPARATOR '|') AS signature
                FROM product_variants pv
                JOIN product_variant_attributes pva ON pva.product_variant_id = pv.id
                WHERE pv.product_id = :product_id
                  AND pv.deleted_at IS NULL
                GROUP BY pv.id
                """
            ),
            {"product_id": data.product_id},
        )
        existing_signatures = {row["signature"] for row in existing_result.mappings() if row["signature"]}
        existing_count = await session.execute(text("SELECT COUNT(*) FROM product_variants WHERE product_id = :product_id AND deleted_at IS NULL"), {"product_id": data.product_id})
        has_existing_variants = int(existing_count.scalar() or 0) > 0

        created = []
        skipped = 0
        for combination in cartesian_product(*[group["values"] for group in selected_groups]):
            signature_parts = [f"{selected_groups[index]['attribute']['id']}:{value['id']}" for index, value in enumerate(combination)]
            signature = "|".join(sorted(signature_parts, key=lambda part: int(part.split(":")[0])))
            if signature in existing_signatures:
                skipped += 1
                continue

            value_names = [value["value_name"] for value in combination]
            variant = ProductVariant(
                product_id=data.product_id,
                variant_sku=await generate_sequential_code(session, ProductVariant, "variant_sku", "SKU"),
                variant_name=f"{base_product.product_name} - {' / '.join(value_names)}",
                variant_description=None,
                is_default_variant=not has_existing_variants and not created,
                is_active=data.is_active,
            )
            session.add(variant)
            await session.flush()
            for index, value in enumerate(combination):
                await session.execute(
                    text(
                        """
                        INSERT INTO product_variant_attributes (product_variant_id, attribute_id, attribute_value_id)
                        VALUES (:variant_id, :attribute_id, :value_id)
                        """
                    ),
                    {"variant_id": variant.id, "attribute_id": selected_groups[index]["attribute"]["id"], "value_id": value["id"]},
                )
            existing_signatures.add(signature)
            variant._attributes = [{
                "attribute_id": selected_groups[index]["attribute"]["id"],
                "attribute_code": selected_groups[index]["attribute"]["attribute_code"],
                "attribute_name": selected_groups[index]["attribute"]["attribute_name"],
                "value_id": value["id"],
                "value_code": value["value_code"],
                "value_name": value["value_name"],
                "text_value": None,
            } for index, value in enumerate(combination)]
            created.append(variant)

        await session.commit()
        return ResponseManager.success(data={"created": [variant_to_dict(item) for item in created], "created_count": len(created), "skipped_count": skipped}, message="SKU generados correctamente", request=request)


@router.put("/product-variants/{variant_id}", response_class=JSONResponse)
async def update_product_variant(data: ProductVariantUpdate, request: Request, variant_id: int = Path(..., gt=0), user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(ProductVariant).options(selectinload(ProductVariant.product)).where(and_(ProductVariant.id == variant_id, ProductVariant.deleted_at.is_(None))))
        variant = result.scalar_one_or_none()
        if not variant:
            return ResponseManager.error(message="SKU no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        values = data.model_dump(exclude_unset=True)
        target_product_id = values.get("product_id", variant.product_id)
        if values.get("is_default_variant") is True:
            await session.execute(ProductVariant.__table__.update().where(ProductVariant.product_id == target_product_id).values(is_default_variant=False))
        for field, value in values.items():
            setattr(variant, field, value)
        await session.commit()
        await session.refresh(variant)
        return ResponseManager.success(data=variant_to_dict(variant), message="SKU actualizado correctamente", request=request)


@router.delete("/product-variants/{variant_id}", response_class=JSONResponse)
async def delete_product_variant(request: Request, variant_id: int = Path(..., gt=0), user: dict = Depends(require_products_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(ProductVariant).where(and_(ProductVariant.id == variant_id, ProductVariant.deleted_at.is_(None))))
        variant = result.scalar_one_or_none()
        if not variant:
            return ResponseManager.error(message="SKU no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        variant.deleted_at = datetime.now(timezone.utc)
        variant.is_active = False
        await session.commit()
        return ResponseManager.success(data=variant_to_dict(variant), message="SKU eliminado correctamente", request=request)


@router.get("/company-config", response_class=JSONResponse)
async def list_company_configs(request: Request, user: dict = Depends(require_company_read)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DteCompanyConfig).where(DteCompanyConfig.deleted_at.is_(None)).order_by(DteCompanyConfig.company_name))
        rows = [company_to_dict(item) for item in result.scalars().all()]
        assets = await _media_map(session, [item.get("logo_media_asset_id") for item in rows] + [item.get("banner_media_asset_id") for item in rows])
        for row in rows:
            row["logo"] = assets.get(row.get("logo_media_asset_id"))
            row["banner"] = assets.get(row.get("banner_media_asset_id"))
        return ResponseManager.success(data=rows, request=request)


@router.post("/company-config", response_class=JSONResponse)
async def create_company_config(data: CompanyConfigCreate, request: Request, user: dict = Depends(require_company_write)):
    async with db_manager.get_async_session() as session:
        values = data.model_dump()
        values["dte_environment"] = DteEnvironment(values["dte_environment"])
        values["default_customer_currency_code"] = values["default_customer_currency_code"].upper()
        values["default_supplier_currency_code"] = values["default_supplier_currency_code"].upper()
        values["default_sales_currency_code"] = values["default_sales_currency_code"].upper()
        await enforce_company_singletons(session, values)
        company = DteCompanyConfig(**values)
        session.add(company)
        await session.commit()
        await session.refresh(company)
        return ResponseManager.success(data=company_to_dict(company), message="Empresa creada correctamente", request=request)


@router.put("/company-config/{company_id}", response_class=JSONResponse)
async def update_company_config(data: CompanyConfigUpdate, request: Request, company_id: int = Path(..., gt=0), user: dict = Depends(require_company_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DteCompanyConfig).where(and_(DteCompanyConfig.id == company_id, DteCompanyConfig.deleted_at.is_(None))))
        company = result.scalar_one_or_none()
        if not company:
            return ResponseManager.error(message="Empresa no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        values = data.model_dump(exclude_unset=True)
        if "dte_environment" in values:
            values["dte_environment"] = DteEnvironment(values["dte_environment"])
        if "default_customer_currency_code" in values and values["default_customer_currency_code"]:
            values["default_customer_currency_code"] = values["default_customer_currency_code"].upper()
        if "default_supplier_currency_code" in values and values["default_supplier_currency_code"]:
            values["default_supplier_currency_code"] = values["default_supplier_currency_code"].upper()
        if "default_sales_currency_code" in values and values["default_sales_currency_code"]:
            values["default_sales_currency_code"] = values["default_sales_currency_code"].upper()
        await enforce_company_singletons(session, values, exclude_company_id=company_id)
        for field, value in values.items():
            setattr(company, field, value)
        await session.commit()
        await session.refresh(company)
        return ResponseManager.success(data=company_to_dict(company), message="Empresa actualizada correctamente", request=request)


@router.delete("/company-config/{company_id}", response_class=JSONResponse)
async def delete_company_config(request: Request, company_id: int = Path(..., gt=0), user: dict = Depends(require_company_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DteCompanyConfig).where(and_(DteCompanyConfig.id == company_id, DteCompanyConfig.deleted_at.is_(None))))
        company = result.scalar_one_or_none()
        if not company:
            return ResponseManager.error(message="Empresa no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        company.deleted_at = datetime.now(timezone.utc)
        company.is_active = False
        if company.dte_environment == DteEnvironment.PRODUCCION:
            company.dte_environment = DteEnvironment.CERTIFICACION
        await session.commit()
        return ResponseManager.success(data={"id": company_id}, message="Empresa eliminada correctamente", request=request)
