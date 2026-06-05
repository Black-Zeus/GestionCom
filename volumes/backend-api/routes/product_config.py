"""
Routers de categorias y atributos de productos.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.product_config import AttributeGroup, AttributeType, AttributeValue, Category, ProductAttribute
from database.schemas.product_config import (
    AttributeCreate,
    AttributeGroupCreate,
    AttributeGroupUpdate,
    AttributeUpdate,
    AttributeValueCreate,
    AttributeValueUpdate,
    CategoryCreate,
    CategoryUpdate,
)
from utils.code_generator import generate_sequential_code
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Product Config"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_product_config_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["CATEGORIES_ACCESS", "PRODUCT_CATEGORIES_MANAGE", "PRODUCT_ATTRIBUTES_ACCESS", "PRODUCT_ATTRIBUTES_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_product_config_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PRODUCT_CATEGORIES_MANAGE", "PRODUCT_ATTRIBUTES_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def category_to_dict(category: Category) -> dict:
    parent = category.parent
    return {
        "id": category.id,
        "parent_id": category.parent_id,
        "parent_code": parent.category_code if parent else None,
        "parent_name": parent.category_name if parent else None,
        "category_code": category.category_code,
        "category_name": category.category_name,
        "category_description": category.category_description,
        "category_level": category.category_level,
        "category_path": category.category_path,
        "sort_order": category.sort_order,
        "is_active": category.is_active,
        "created_at": category.created_at.isoformat() if category.created_at else None,
        "updated_at": category.updated_at.isoformat() if category.updated_at else None,
    }


def group_to_dict(group: AttributeGroup) -> dict:
    return {
        "id": group.id,
        "group_code": group.group_code,
        "group_name": group.group_name,
        "group_description": group.group_description,
        "sort_order": group.sort_order,
        "is_active": group.is_active,
        "created_at": group.created_at.isoformat() if group.created_at else None,
        "updated_at": group.updated_at.isoformat() if group.updated_at else None,
    }


def attribute_to_dict(attribute: ProductAttribute) -> dict:
    group = attribute.group
    return {
        "id": attribute.id,
        "attribute_group_id": attribute.attribute_group_id,
        "group_code": group.group_code if group else None,
        "group_name": group.group_name if group else None,
        "attribute_code": attribute.attribute_code,
        "attribute_name": attribute.attribute_name,
        "attribute_type": attribute.attribute_type.value if attribute.attribute_type else None,
        "is_required": attribute.is_required,
        "affects_sku": attribute.affects_sku,
        "sort_order": attribute.sort_order,
        "is_active": attribute.is_active,
        "created_at": attribute.created_at.isoformat() if attribute.created_at else None,
        "updated_at": attribute.updated_at.isoformat() if attribute.updated_at else None,
    }


def value_to_dict(value: AttributeValue) -> dict:
    attribute = value.attribute
    return {
        "id": value.id,
        "attribute_id": value.attribute_id,
        "attribute_code": attribute.attribute_code if attribute else None,
        "attribute_name": attribute.attribute_name if attribute else None,
        "value_code": value.value_code,
        "value_name": value.value_name,
        "sort_order": value.sort_order,
        "is_active": value.is_active,
        "created_at": value.created_at.isoformat() if value.created_at else None,
        "updated_at": value.updated_at.isoformat() if value.updated_at else None,
    }


async def _get_category(session, category_id: int | None):
    if not category_id:
        return None
    result = await session.execute(select(Category).where(and_(Category.id == category_id, Category.deleted_at.is_(None))))
    return result.scalar_one_or_none()


def _set_category_tree(category: Category, parent: Category | None):
    category.category_level = (parent.category_level + 1) if parent else 1
    category.category_path = f"{parent.category_path}/{category.category_name}" if parent and parent.category_path else category.category_name


@router.get("/categories", response_class=JSONResponse)
async def list_categories(request: Request, user: dict = Depends(require_product_config_read), active_only: bool = Query(False), limit: int = Query(1000, ge=1, le=1000)):
    async with db_manager.get_async_session() as session:
        stmt = select(Category).options(selectinload(Category.parent)).where(Category.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(Category.is_active == True)
        result = await session.execute(stmt.order_by(Category.category_level, Category.sort_order, Category.category_name).limit(limit))
        return ResponseManager.success(data=[category_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/categories", response_class=JSONResponse)
async def create_category(data: CategoryCreate, request: Request, user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        parent = await _get_category(session, data.parent_id)
        if data.parent_id and not parent:
            return ResponseManager.error(message="Categoria padre no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        category = Category(category_code=await generate_sequential_code(session, Category, "category_code", "CAT"), category_name=data.category_name, category_description=data.category_description, parent_id=data.parent_id, sort_order=data.sort_order, is_active=data.is_active)
        _set_category_tree(category, parent)
        session.add(category)
        await session.commit()
        await session.refresh(category)
        category.parent = parent
        return ResponseManager.success(data=category_to_dict(category), message="Categoria creada correctamente", request=request)


@router.put("/categories/{category_id}", response_class=JSONResponse)
async def update_category(data: CategoryUpdate, request: Request, category_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(Category).options(selectinload(Category.parent)).where(and_(Category.id == category_id, Category.deleted_at.is_(None))))
        category = result.scalar_one_or_none()
        if not category:
            return ResponseManager.error(message="Categoria no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        if data.parent_id is not None and data.parent_id == category.id:
            return ResponseManager.error(message="Una categoria no puede ser su propio padre", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        parent = category.parent
        if data.parent_id is not None:
            parent = await _get_category(session, data.parent_id)
            if not parent:
                return ResponseManager.error(message="Categoria padre no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
            category.parent_id = data.parent_id
        for field in ["category_name", "category_description", "sort_order", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(category, field, value)
        _set_category_tree(category, parent)
        category.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(category)
        return ResponseManager.success(data=category_to_dict(category), message="Categoria actualizada correctamente", request=request)


@router.delete("/categories/{category_id}", response_class=JSONResponse)
async def delete_category(request: Request, category_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(Category).where(and_(Category.id == category_id, Category.deleted_at.is_(None))))
        category = result.scalar_one_or_none()
        if not category:
            return ResponseManager.error(message="Categoria no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        category.deleted_at = datetime.now(timezone.utc)
        category.is_active = False
        await session.commit()
        return ResponseManager.success(data=category_to_dict(category), message="Categoria eliminada correctamente", request=request)


@router.get("/attribute-groups", response_class=JSONResponse)
async def list_attribute_groups(request: Request, user: dict = Depends(require_product_config_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(AttributeGroup).where(AttributeGroup.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(AttributeGroup.is_active == True)
        result = await session.execute(stmt.order_by(AttributeGroup.sort_order, AttributeGroup.group_name))
        return ResponseManager.success(data=[group_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/attribute-groups", response_class=JSONResponse)
async def create_attribute_group(data: AttributeGroupCreate, request: Request, user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        group = AttributeGroup(group_code=await generate_sequential_code(session, AttributeGroup, "group_code", "ATG"), group_name=data.group_name, group_description=data.group_description, sort_order=data.sort_order, is_active=data.is_active)
        session.add(group)
        await session.commit()
        await session.refresh(group)
        return ResponseManager.success(data=group_to_dict(group), message="Grupo creado correctamente", request=request)


@router.put("/attribute-groups/{group_id}", response_class=JSONResponse)
async def update_attribute_group(data: AttributeGroupUpdate, request: Request, group_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(AttributeGroup).where(and_(AttributeGroup.id == group_id, AttributeGroup.deleted_at.is_(None))))
        group = result.scalar_one_or_none()
        if not group:
            return ResponseManager.error(message="Grupo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field in ["group_name", "group_description", "sort_order", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(group, field, value)
        await session.commit()
        await session.refresh(group)
        return ResponseManager.success(data=group_to_dict(group), request=request)


@router.delete("/attribute-groups/{group_id}", response_class=JSONResponse)
async def delete_attribute_group(request: Request, group_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(AttributeGroup).where(and_(AttributeGroup.id == group_id, AttributeGroup.deleted_at.is_(None))))
        group = result.scalar_one_or_none()
        if not group:
            return ResponseManager.error(message="Grupo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        group.deleted_at = datetime.now(timezone.utc)
        group.is_active = False
        await session.commit()
        return ResponseManager.success(data=group_to_dict(group), request=request)


@router.get("/attributes", response_class=JSONResponse)
async def list_attributes(request: Request, user: dict = Depends(require_product_config_read), group_id: int | None = Query(None, gt=0), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(ProductAttribute).options(selectinload(ProductAttribute.group)).where(ProductAttribute.deleted_at.is_(None))
        if group_id:
            stmt = stmt.where(ProductAttribute.attribute_group_id == group_id)
        if active_only:
            stmt = stmt.where(ProductAttribute.is_active == True)
        result = await session.execute(stmt.order_by(ProductAttribute.sort_order, ProductAttribute.attribute_name))
        return ResponseManager.success(data=[attribute_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/attributes", response_class=JSONResponse)
async def create_attribute(data: AttributeCreate, request: Request, user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(AttributeGroup).where(and_(AttributeGroup.id == data.attribute_group_id, AttributeGroup.deleted_at.is_(None))))
        group = result.scalar_one_or_none()
        if not group:
            return ResponseManager.error(message="Grupo no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        attribute = ProductAttribute(attribute_code=await generate_sequential_code(session, ProductAttribute, "attribute_code", "ATT"), attribute_group_id=data.attribute_group_id, attribute_name=data.attribute_name, attribute_type=AttributeType(data.attribute_type), is_required=data.is_required, affects_sku=data.affects_sku, sort_order=data.sort_order, is_active=data.is_active)
        session.add(attribute)
        await session.commit()
        await session.refresh(attribute)
        attribute.group = group
        return ResponseManager.success(data=attribute_to_dict(attribute), request=request)


@router.put("/attributes/{attribute_id}", response_class=JSONResponse)
async def update_attribute(data: AttributeUpdate, request: Request, attribute_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(ProductAttribute).options(selectinload(ProductAttribute.group)).where(and_(ProductAttribute.id == attribute_id, ProductAttribute.deleted_at.is_(None))))
        attribute = result.scalar_one_or_none()
        if not attribute:
            return ResponseManager.error(message="Atributo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field in ["attribute_group_id", "attribute_name", "is_required", "affects_sku", "sort_order", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(attribute, field, value)
        if data.attribute_type is not None:
            attribute.attribute_type = AttributeType(data.attribute_type)
        await session.commit()
        await session.refresh(attribute)
        return ResponseManager.success(data=attribute_to_dict(attribute), request=request)


@router.delete("/attributes/{attribute_id}", response_class=JSONResponse)
async def delete_attribute(request: Request, attribute_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(ProductAttribute).where(and_(ProductAttribute.id == attribute_id, ProductAttribute.deleted_at.is_(None))))
        attribute = result.scalar_one_or_none()
        if not attribute:
            return ResponseManager.error(message="Atributo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        attribute.deleted_at = datetime.now(timezone.utc)
        attribute.is_active = False
        await session.commit()
        return ResponseManager.success(data=attribute_to_dict(attribute), request=request)


@router.get("/attribute-values", response_class=JSONResponse)
async def list_attribute_values(request: Request, user: dict = Depends(require_product_config_read), attribute_id: int | None = Query(None, gt=0)):
    async with db_manager.get_async_session() as session:
        stmt = select(AttributeValue).options(selectinload(AttributeValue.attribute)).where(AttributeValue.deleted_at.is_(None))
        if attribute_id:
            stmt = stmt.where(AttributeValue.attribute_id == attribute_id)
        result = await session.execute(stmt.order_by(AttributeValue.sort_order, AttributeValue.value_name))
        return ResponseManager.success(data=[value_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/attribute-values", response_class=JSONResponse)
async def create_attribute_value(data: AttributeValueCreate, request: Request, user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(ProductAttribute).where(and_(ProductAttribute.id == data.attribute_id, ProductAttribute.deleted_at.is_(None))))
        attribute = result.scalar_one_or_none()
        if not attribute:
            return ResponseManager.error(message="Atributo no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        value = AttributeValue(attribute_id=data.attribute_id, value_code=await generate_sequential_code(session, AttributeValue, "value_code", "ATV"), value_name=data.value_name, sort_order=data.sort_order, is_active=data.is_active)
        session.add(value)
        await session.commit()
        await session.refresh(value)
        value.attribute = attribute
        return ResponseManager.success(data=value_to_dict(value), request=request)


@router.put("/attribute-values/{value_id}", response_class=JSONResponse)
async def update_attribute_value(data: AttributeValueUpdate, request: Request, value_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(AttributeValue).options(selectinload(AttributeValue.attribute)).where(and_(AttributeValue.id == value_id, AttributeValue.deleted_at.is_(None))))
        value = result.scalar_one_or_none()
        if not value:
            return ResponseManager.error(message="Valor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field in ["value_name", "sort_order", "is_active"]:
            incoming = getattr(data, field)
            if incoming is not None:
                setattr(value, field, incoming)
        await session.commit()
        await session.refresh(value)
        return ResponseManager.success(data=value_to_dict(value), request=request)


@router.delete("/attribute-values/{value_id}", response_class=JSONResponse)
async def delete_attribute_value(request: Request, value_id: int = Path(..., gt=0), user: dict = Depends(require_product_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(AttributeValue).where(and_(AttributeValue.id == value_id, AttributeValue.deleted_at.is_(None))))
        value = result.scalar_one_or_none()
        if not value:
            return ResponseManager.error(message="Valor no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        value.deleted_at = datetime.now(timezone.utc)
        value.is_active = False
        await session.commit()
        return ResponseManager.success(data=value_to_dict(value), request=request)
