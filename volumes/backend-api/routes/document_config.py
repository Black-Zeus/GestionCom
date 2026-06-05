"""
Router de tipos y series de documentos.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.document_config import DocumentCategory, DocumentSeries, DocumentType, MovementType
from database.models.warehouses import Warehouse
from database.schemas.document_config import DocumentSeriesCreate, DocumentSeriesUpdate, DocumentTypeUpdate
from utils.code_generator import generate_sequential_code
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Document Config"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_document_config_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["DOCUMENT_SERIES_ACCESS", "DOCUMENT_SERIES_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_document_config_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["DOCUMENT_SERIES_MANAGE"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def type_to_dict(document_type: DocumentType) -> dict:
    return {
        "id": document_type.id,
        "document_type_code": document_type.document_type_code,
        "document_type_name": document_type.document_type_name,
        "document_category": document_type.document_category.value if document_type.document_category else None,
        "requires_approval": document_type.requires_approval,
        "generates_movement": document_type.generates_movement,
        "movement_type": document_type.movement_type.value if document_type.movement_type else None,
        "is_active": document_type.is_active,
        "created_at": document_type.created_at.isoformat() if document_type.created_at else None,
        "updated_at": document_type.updated_at.isoformat() if document_type.updated_at else None,
    }


def series_to_dict(series: DocumentSeries) -> dict:
    document_type = series.document_type
    warehouse = series.warehouse
    return {
        "id": series.id,
        "document_type_id": series.document_type_id,
        "document_type_code": document_type.document_type_code if document_type else None,
        "document_type_name": document_type.document_type_name if document_type else None,
        "warehouse_id": series.warehouse_id,
        "warehouse_code": warehouse.warehouse_code if warehouse else None,
        "warehouse_name": warehouse.warehouse_name if warehouse else None,
        "series_code": series.series_code,
        "series_prefix": series.series_prefix,
        "current_number": series.current_number,
        "min_number": series.min_number,
        "max_number": series.max_number,
        "number_length": series.number_length,
        "is_active": series.is_active,
    }


async def _document_type_exists(session, document_type_id: int):
    result = await session.execute(select(DocumentType).where(and_(DocumentType.id == document_type_id, DocumentType.deleted_at.is_(None))))
    return result.scalar_one_or_none()


async def _warehouse_exists(session, warehouse_id: int | None):
    if not warehouse_id:
        return None
    result = await session.execute(select(Warehouse).where(and_(Warehouse.id == warehouse_id, Warehouse.deleted_at.is_(None))))
    return result.scalar_one_or_none()


def _validate_series_range(data, request: Request):
    min_number = data.min_number
    max_number = data.max_number
    current_number = data.current_number
    if min_number is not None and max_number is not None and max_number < min_number:
        return ResponseManager.error(message="El numero maximo no puede ser menor que el minimo", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    if current_number is not None and max_number is not None and current_number > max_number:
        return ResponseManager.error(message="El numero actual no puede superar el maximo", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    return None


@router.get("/types", response_class=JSONResponse)
async def list_document_types(request: Request, user: dict = Depends(require_document_config_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(DocumentType).where(DocumentType.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(DocumentType.is_active == True)
        result = await session.execute(stmt.order_by(DocumentType.document_category, DocumentType.document_type_name))
        return ResponseManager.success(data=[type_to_dict(item) for item in result.scalars().all()], request=request)


@router.put("/types/{document_type_id}", response_class=JSONResponse)
async def update_document_type(data: DocumentTypeUpdate, request: Request, document_type_id: int = Path(..., gt=0), user: dict = Depends(require_document_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DocumentType).where(and_(DocumentType.id == document_type_id, DocumentType.deleted_at.is_(None))))
        document_type = result.scalar_one_or_none()
        if not document_type:
            return ResponseManager.error(message="Tipo de documento no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        for field in ["document_type_name", "requires_approval", "generates_movement", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(document_type, field, value)
        if data.document_category is not None:
            document_type.document_category = DocumentCategory(data.document_category)
        if data.movement_type is not None:
            document_type.movement_type = MovementType(data.movement_type)
        if data.generates_movement is False:
            document_type.movement_type = None
        document_type.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(document_type)
        return ResponseManager.success(data=type_to_dict(document_type), request=request)


@router.get("/series", response_class=JSONResponse)
async def list_document_series(request: Request, user: dict = Depends(require_document_config_read), active_only: bool = Query(False)):
    async with db_manager.get_async_session() as session:
        stmt = select(DocumentSeries).options(selectinload(DocumentSeries.document_type), selectinload(DocumentSeries.warehouse)).where(DocumentSeries.deleted_at.is_(None))
        if active_only:
            stmt = stmt.where(DocumentSeries.is_active == True)
        result = await session.execute(stmt.order_by(DocumentSeries.series_code))
        return ResponseManager.success(data=[series_to_dict(item) for item in result.scalars().all()], request=request)


@router.post("/series", response_class=JSONResponse)
async def create_document_series(data: DocumentSeriesCreate, request: Request, user: dict = Depends(require_document_config_write)):
    async with db_manager.get_async_session() as session:
        document_type = await _document_type_exists(session, data.document_type_id)
        warehouse = await _warehouse_exists(session, data.warehouse_id)
        if not document_type:
            return ResponseManager.error(message="Tipo de documento no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        if data.warehouse_id and not warehouse:
            return ResponseManager.error(message="Bodega no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        range_error = _validate_series_range(data, request)
        if range_error:
            return range_error
        series = DocumentSeries(series_code=await generate_sequential_code(session, DocumentSeries, "series_code", "SER"), document_type_id=data.document_type_id, warehouse_id=data.warehouse_id, series_prefix=data.series_prefix, current_number=data.current_number, min_number=data.min_number, max_number=data.max_number, number_length=data.number_length, is_active=data.is_active)
        session.add(series)
        await session.commit()
        await session.refresh(series)
        series.document_type = document_type
        series.warehouse = warehouse
        return ResponseManager.success(data=series_to_dict(series), message="Serie creada correctamente", request=request)


@router.put("/series/{series_id}", response_class=JSONResponse)
async def update_document_series(data: DocumentSeriesUpdate, request: Request, series_id: int = Path(..., gt=0), user: dict = Depends(require_document_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DocumentSeries).options(selectinload(DocumentSeries.document_type), selectinload(DocumentSeries.warehouse)).where(and_(DocumentSeries.id == series_id, DocumentSeries.deleted_at.is_(None))))
        series = result.scalar_one_or_none()
        if not series:
            return ResponseManager.error(message="Serie no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        range_error = _validate_series_range(data, request)
        if range_error:
            return range_error
        for field in ["document_type_id", "warehouse_id", "series_prefix", "current_number", "min_number", "max_number", "number_length", "is_active"]:
            value = getattr(data, field)
            if value is not None:
                setattr(series, field, value)
        await session.commit()
        await session.refresh(series)
        return ResponseManager.success(data=series_to_dict(series), request=request)


@router.delete("/series/{series_id}", response_class=JSONResponse)
async def delete_document_series(request: Request, series_id: int = Path(..., gt=0), user: dict = Depends(require_document_config_write)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(select(DocumentSeries).where(and_(DocumentSeries.id == series_id, DocumentSeries.deleted_at.is_(None))))
        series = result.scalar_one_or_none()
        if not series:
            return ResponseManager.error(message="Serie no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        series.deleted_at = datetime.now(timezone.utc)
        series.is_active = False
        await session.commit()
        return ResponseManager.success(data=series_to_dict(series), request=request)
