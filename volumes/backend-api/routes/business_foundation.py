"""
Routers para mantenedores base de ventas e inventario.
"""
from datetime import datetime, timezone

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
    return await _require(request, ["TAX_CONFIG_ACCESS", "TAX_CONFIG_MANAGE", "SYSTEM_CONFIG"], "Se requiere permiso para ver impuestos")


async def require_taxes_write(request: Request) -> dict:
    return await _require(request, ["TAX_CONFIG_MANAGE", "SYSTEM_CONFIG"], "Se requiere permiso para gestionar impuestos")


async def require_company_read(request: Request) -> dict:
    return await _require(request, ["COMPANY_CONFIG_ACCESS", "COMPANY_CONFIG_MANAGE", "SYSTEM_CONFIG"], "Se requiere permiso para ver empresa")


async def require_company_write(request: Request) -> dict:
    return await _require(request, ["COMPANY_CONFIG_MANAGE", "SYSTEM_CONFIG"], "Se requiere permiso para gestionar empresa")


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
        "created_at": variant.created_at.isoformat() if variant.created_at else None,
        "updated_at": variant.updated_at.isoformat() if variant.updated_at else None,
    }


def price_item_to_dict(item: PriceListItem) -> dict:
    price_list = _rel(item, "price_list")
    variant = _rel(item, "product_variant")
    measurement_unit = _rel(item, "measurement_unit")
    product = _rel(variant, "product") if variant else None
    return {
        "id": item.id,
        "price_list_id": item.price_list_id,
        "price_list_code": price_list.price_list_code if price_list else None,
        "price_list_name": price_list.price_list_name if price_list else None,
        "product_variant_id": item.product_variant_id,
        "variant_sku": variant.variant_sku if variant else None,
        "variant_name": variant.variant_name if variant else None,
        "product_name": product.product_name if product else None,
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
        item["full_url"] = media_storage.presigned_url(asset["object_key_full"])
        item["thumb_url"] = media_storage.presigned_url(asset["object_key_thumb"])
        assets[int(asset["id"])] = item
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
        for field in ["price_list_group_id", "price_list_name", "base_price_list_id", "base_adjustment_value", "valid_from", "valid_to", "priority", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(price_list, field, value)
        if data.currency_code is not None:
            price_list.currency_code = data.currency_code.upper()
        if data.base_adjustment_type is not None:
            price_list.base_adjustment_type = BaseAdjustmentType(data.base_adjustment_type)
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
        stmt = select(PriceListItem).options(selectinload(PriceListItem.price_list), selectinload(PriceListItem.product_variant).selectinload(ProductVariant.product), selectinload(PriceListItem.measurement_unit)).where(PriceListItem.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(PriceListItem.is_active == True)
        result = await session.execute(stmt.order_by(PriceListItem.price_list_id, PriceListItem.product_variant_id))
        return ResponseManager.success(data=[price_item_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/price-list-items", response_class=JSONResponse)
async def create_price_list_item(data: PriceListItemCreate, request: Request, user: dict = Depends(require_prices_write)):
    async with db_manager.get_async_session() as session:
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
        return ResponseManager.success(data=[variant_to_dict(item) for item in result.scalars().all()], request=request)


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
        result = await session.execute(select(DteCompanyConfig).order_by(DteCompanyConfig.company_name))
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
        await enforce_company_singletons(session, values)
        company = DteCompanyConfig(**values)
        session.add(company)
        await session.commit()
        await session.refresh(company)
        return ResponseManager.success(data=company_to_dict(company), message="Empresa creada correctamente", request=request)


@router.put("/company-config/{company_id}", response_class=JSONResponse)
async def update_company_config(data: CompanyConfigUpdate, request: Request, company_id: int = Path(..., gt=0), user: dict = Depends(require_company_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DteCompanyConfig).where(DteCompanyConfig.id == company_id))
        company = result.scalar_one_or_none()
        if not company:
            return ResponseManager.error(message="Empresa no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        values = data.model_dump(exclude_unset=True)
        if "dte_environment" in values:
            values["dte_environment"] = DteEnvironment(values["dte_environment"])
        await enforce_company_singletons(session, values, exclude_company_id=company_id)
        for field, value in values.items():
            setattr(company, field, value)
        await session.commit()
        await session.refresh(company)
        return ResponseManager.success(data=company_to_dict(company), message="Empresa actualizada correctamente", request=request)
