"""
Router de administracion de caja chica.
"""
from datetime import datetime, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.petty_cash import PettyCashCategory, PettyCashFund, PettyCashFundStatus
from database.models.users import User
from database.models.warehouses import Warehouse
from database.schemas.petty_cash import (
    PettyCashCategoryCreate,
    PettyCashCategoryUpdate,
    PettyCashFundCreate,
    PettyCashFundUpdate,
)
from utils.auth_helpers import get_client_ip
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(tags=["Petty Cash Admin"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


def _deny(request: Request, user: dict, details: str):
    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para caja chica admin en %s %s - IP: %s",
        user.get("username", "unknown"),
        request.method,
        request.url.path,
        get_client_ip(request),
    )
    response = ResponseManager.error(
        message="Acceso denegado",
        status_code=HTTPStatus.FORBIDDEN,
        error_code=ErrorCode.PERMISSION_DENIED,
        error_type=ErrorType.PERMISSION_ERROR,
        details=details,
        request=request,
    )
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_petty_cash_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PETTY_CASH_ADMIN_ACCESS", "PETTY_CASH_MANAGE", "PETTY_CASH_APPROVE"]):
        return user
    _deny(request, user, "Se requiere permiso para administrar caja chica")


async def require_petty_cash_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PETTY_CASH_MANAGE", "PETTY_CASH_APPROVE"]):
        return user
    _deny(request, user, "Se requiere permiso para gestionar caja chica")


def category_to_dict(category: PettyCashCategory) -> dict:
    return {
        "id": category.id,
        "category_code": category.category_code,
        "category_name": category.category_name,
        "category_description": category.category_description,
        "max_amount_per_expense": float(category.max_amount_per_expense) if category.max_amount_per_expense is not None else None,
        "requires_evidence": category.requires_evidence,
        "is_active": category.is_active,
        "created_at": category.created_at.isoformat() if category.created_at else None,
        "updated_at": category.updated_at.isoformat() if category.updated_at else None,
    }


def fund_to_dict(fund: PettyCashFund) -> dict:
    warehouse = fund.warehouse
    responsible = fund.responsible_user
    return {
        "id": fund.id,
        "fund_code": fund.fund_code,
        "warehouse_id": fund.warehouse_id,
        "warehouse_code": warehouse.warehouse_code if warehouse else None,
        "warehouse_name": warehouse.warehouse_name if warehouse else None,
        "responsible_user_id": fund.responsible_user_id,
        "responsible_username": responsible.username if responsible else None,
        "responsible_name": responsible.display_name if responsible and hasattr(responsible, "display_name") else None,
        "initial_amount": float(fund.initial_amount or 0),
        "current_balance": float(fund.current_balance or 0),
        "total_expenses": float(fund.total_expenses or 0),
        "total_replenishments": float(fund.total_replenishments or 0),
        "fund_status": fund.fund_status.value if fund.fund_status else None,
        "last_replenishment_date": fund.last_replenishment_date.isoformat() if fund.last_replenishment_date else None,
        "created_at": fund.created_at.isoformat() if fund.created_at else None,
        "updated_at": fund.updated_at.isoformat() if fund.updated_at else None,
    }


async def get_active_warehouse(session, warehouse_id: int):
    result = await session.execute(
        select(Warehouse).where(and_(Warehouse.id == warehouse_id, Warehouse.deleted_at.is_(None)))
    )
    return result.scalar_one_or_none()


async def get_active_user(session, user_id: int):
    result = await session.execute(
        select(User).where(and_(User.id == user_id, User.deleted_at.is_(None)))
    )
    return result.scalar_one_or_none()


@router.get("/categories", response_class=JSONResponse)
async def list_categories(
    request: Request,
    user: dict = Depends(require_petty_cash_read),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = select(PettyCashCategory).where(PettyCashCategory.deleted_at.is_(None))
            if active_only:
                stmt = stmt.where(PettyCashCategory.is_active == True)
            stmt = stmt.order_by(PettyCashCategory.category_name).offset(skip).limit(limit)
            result = await session.execute(stmt)
            data = [category_to_dict(category) for category in result.scalars().all()]
            logger.info("Usuario %s listo %s categorias de caja chica", user.get("username"), len(data))
            return ResponseManager.success(data=data, message=f"Se encontraron {len(data)} categorias", request=request)
    except Exception as exc:
        logger.error("Error al listar categorias de caja chica: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener categorias", details=str(exc), request=request)


@router.post("/categories", response_class=JSONResponse)
async def create_category(
    category_data: PettyCashCategoryCreate,
    request: Request,
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            existing = await session.execute(
                select(PettyCashCategory).where(
                    and_(
                        PettyCashCategory.category_code == category_data.category_code.upper(),
                        PettyCashCategory.deleted_at.is_(None),
                    )
                )
            )
            if existing.scalar_one_or_none():
                return ResponseManager.error(
                    message=f"Ya existe una categoria con el codigo: {category_data.category_code}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            category = PettyCashCategory(**category_data.model_dump())
            session.add(category)
            await session.commit()
            await session.refresh(category)
            logger.info("Usuario %s creo categoria caja chica: %s", user.get("username"), category.category_code)
            return ResponseManager.success(data=category_to_dict(category), message="Categoria creada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear categoria caja chica: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear categoria", details=str(exc), request=request)


@router.put("/categories/{category_id}", response_class=JSONResponse)
async def update_category(
    category_data: PettyCashCategoryUpdate,
    request: Request,
    category_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PettyCashCategory).where(and_(PettyCashCategory.id == category_id, PettyCashCategory.deleted_at.is_(None)))
            )
            category = result.scalar_one_or_none()
            if not category:
                return ResponseManager.error(
                    message=f"Categoria no encontrada: {category_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            for field, value in category_data.model_dump(exclude_unset=True).items():
                setattr(category, field, value)
            category.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(category)
            logger.info("Usuario %s actualizo categoria caja chica: %s", user.get("username"), category.category_code)
            return ResponseManager.success(data=category_to_dict(category), message="Categoria actualizada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar categoria caja chica %s: %s", category_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar categoria", details=str(exc), request=request)


@router.delete("/categories/{category_id}", response_class=JSONResponse)
async def delete_category(
    request: Request,
    category_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PettyCashCategory).where(and_(PettyCashCategory.id == category_id, PettyCashCategory.deleted_at.is_(None)))
            )
            category = result.scalar_one_or_none()
            if not category:
                return ResponseManager.error(
                    message=f"Categoria no encontrada: {category_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )
            category.deleted_at = datetime.now(timezone.utc)
            category.is_active = False
            await session.commit()
            logger.info("Usuario %s elimino categoria caja chica: %s", user.get("username"), category.category_code)
            return ResponseManager.success(data=category_to_dict(category), message="Categoria eliminada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar categoria caja chica %s: %s", category_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar categoria", details=str(exc), request=request)


@router.get("/funds", response_class=JSONResponse)
async def list_funds(
    request: Request,
    user: dict = Depends(require_petty_cash_read),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = (
                select(PettyCashFund)
                .options(selectinload(PettyCashFund.warehouse), selectinload(PettyCashFund.responsible_user))
                .where(PettyCashFund.deleted_at.is_(None))
            )
            if active_only:
                stmt = stmt.where(PettyCashFund.fund_status == PettyCashFundStatus.ACTIVE)
            stmt = stmt.order_by(PettyCashFund.fund_code).offset(skip).limit(limit)
            result = await session.execute(stmt)
            data = [fund_to_dict(fund) for fund in result.scalars().all()]
            logger.info("Usuario %s listo %s fondos de caja chica", user.get("username"), len(data))
            return ResponseManager.success(data=data, message=f"Se encontraron {len(data)} fondos", request=request)
    except Exception as exc:
        logger.error("Error al listar fondos caja chica: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener fondos", details=str(exc), request=request)


@router.post("/funds", response_class=JSONResponse)
async def create_fund(
    fund_data: PettyCashFundCreate,
    request: Request,
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            existing = await session.execute(
                select(PettyCashFund).where(
                    and_(
                        PettyCashFund.fund_code == fund_data.fund_code.upper(),
                        PettyCashFund.deleted_at.is_(None),
                    )
                )
            )
            if existing.scalar_one_or_none():
                return ResponseManager.error(
                    message=f"Ya existe un fondo con el codigo: {fund_data.fund_code}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            warehouse = await get_active_warehouse(session, fund_data.warehouse_id)
            responsible = await get_active_user(session, fund_data.responsible_user_id)
            if not warehouse or not responsible:
                return ResponseManager.error(
                    message="Bodega o responsable no encontrado",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                    error_type=ErrorType.VALIDATION_ERROR,
                    request=request,
                )

            payload = fund_data.model_dump()
            payload["fund_status"] = PettyCashFundStatus(payload["fund_status"])
            fund = PettyCashFund(**payload)
            session.add(fund)
            await session.commit()
            await session.refresh(fund)
            fund.warehouse = warehouse
            fund.responsible_user = responsible
            logger.info("Usuario %s creo fondo caja chica: %s", user.get("username"), fund.fund_code)
            return ResponseManager.success(data=fund_to_dict(fund), message="Fondo creado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear fondo caja chica: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear fondo", details=str(exc), request=request)


@router.put("/funds/{fund_id}", response_class=JSONResponse)
async def update_fund(
    fund_data: PettyCashFundUpdate,
    request: Request,
    fund_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PettyCashFund)
                .options(selectinload(PettyCashFund.warehouse), selectinload(PettyCashFund.responsible_user))
                .where(and_(PettyCashFund.id == fund_id, PettyCashFund.deleted_at.is_(None)))
            )
            fund = result.scalar_one_or_none()
            if not fund:
                return ResponseManager.error(
                    message=f"Fondo no encontrado: {fund_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            payload = fund_data.model_dump(exclude_unset=True)
            if "warehouse_id" in payload and not await get_active_warehouse(session, payload["warehouse_id"]):
                return ResponseManager.error(message="Bodega no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
            if "responsible_user_id" in payload and not await get_active_user(session, payload["responsible_user_id"]):
                return ResponseManager.error(message="Responsable no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)

            for field, value in payload.items():
                if field == "fund_status":
                    value = PettyCashFundStatus(value)
                setattr(fund, field, value)

            fund.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(fund)
            logger.info("Usuario %s actualizo fondo caja chica: %s", user.get("username"), fund.fund_code)
            return ResponseManager.success(data=fund_to_dict(fund), message="Fondo actualizado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar fondo caja chica %s: %s", fund_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar fondo", details=str(exc), request=request)


@router.delete("/funds/{fund_id}", response_class=JSONResponse)
async def delete_fund(
    request: Request,
    fund_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PettyCashFund)
                .options(selectinload(PettyCashFund.warehouse), selectinload(PettyCashFund.responsible_user))
                .where(and_(PettyCashFund.id == fund_id, PettyCashFund.deleted_at.is_(None)))
            )
            fund = result.scalar_one_or_none()
            if not fund:
                return ResponseManager.error(message=f"Fondo no encontrado: {fund_id}", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            fund.deleted_at = datetime.now(timezone.utc)
            fund.fund_status = PettyCashFundStatus.CLOSED
            await session.commit()
            logger.info("Usuario %s elimino fondo caja chica: %s", user.get("username"), fund.fund_code)
            return ResponseManager.success(data=fund_to_dict(fund), message="Fondo eliminado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar fondo caja chica %s: %s", fund_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar fondo", details=str(exc), request=request)
