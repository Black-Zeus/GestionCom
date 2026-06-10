"""
Router para configuracion operativa de puntos de venta y asignaciones.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.cash_registers import CashRegister
from database.models.sales_operations import CashRegisterUserAssignment, SalesPoint, SalesPointUserAssignment
from database.models.users import User
from database.models.warehouses import Warehouse
from database.schemas.sales_operations import (
    CashRegisterAssignmentCreate,
    OperatorAssignmentUpdate,
    SalesPointAssignmentCreate,
    SalesPointCreate,
    SalesPointUpdate,
)
from utils.auth_helpers import get_client_ip
from utils.code_generator import generate_sequential_code
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(tags=["Sales Operations"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


def _raise_forbidden(request: Request, user: dict, details: str):
    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos en %s %s - IP: %s",
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
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_sales_ops_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["SALES_POINTS_ACCESS", "SALES_POINTS_MANAGE", "OPERATOR_ASSIGNMENTS_ACCESS", "OPERATOR_ASSIGNMENTS_MANAGE", "CASH_POS_ADMIN_ACCESS", "CASH_SETTINGS_MANAGE"]):
        return user
    _raise_forbidden(request, user, "Se requiere permiso para ver configuracion operativa de ventas")


async def require_sales_ops_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["SALES_POINTS_MANAGE", "OPERATOR_ASSIGNMENTS_MANAGE", "CASH_SETTINGS_MANAGE"]):
        return user
    _raise_forbidden(request, user, "Se requiere permiso para gestionar configuracion operativa de ventas")


def user_to_dict(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
    }


def sales_point_to_dict(sales_point: SalesPoint) -> dict:
    warehouse = sales_point.warehouse
    cash_register = sales_point.default_cash_register
    return {
        "id": sales_point.id,
        "sales_point_code": sales_point.sales_point_code,
        "sales_point_name": sales_point.sales_point_name,
        "warehouse_id": sales_point.warehouse_id,
        "warehouse_code": warehouse.warehouse_code if warehouse else None,
        "warehouse_name": warehouse.warehouse_name if warehouse else None,
        "default_cash_register_id": sales_point.default_cash_register_id,
        "default_cash_register_code": cash_register.register_code if cash_register else None,
        "default_cash_register_name": cash_register.register_name if cash_register else None,
        "channel_type": sales_point.channel_type,
        "location_description": sales_point.location_description,
        "is_active": sales_point.is_active,
        "display_name": sales_point.display_name,
        "created_at": sales_point.created_at.isoformat() if sales_point.created_at else None,
        "updated_at": sales_point.updated_at.isoformat() if sales_point.updated_at else None,
    }


def cash_assignment_to_dict(assignment: CashRegisterUserAssignment) -> dict:
    cash_register = assignment.cash_register
    return {
        "id": assignment.id,
        "scope": "cash_register",
        "cash_register_id": assignment.cash_register_id,
        "cash_register_code": cash_register.register_code if cash_register else None,
        "cash_register_name": cash_register.register_name if cash_register else None,
        "user_id": assignment.user_id,
        "user": user_to_dict(assignment.user),
        "operator_role": assignment.operator_role,
        "is_default": assignment.is_default,
        "valid_from": assignment.valid_from.isoformat() if assignment.valid_from else None,
        "valid_until": assignment.valid_until.isoformat() if assignment.valid_until else None,
        "notes": assignment.notes,
        "is_active": assignment.is_active,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        "updated_at": assignment.updated_at.isoformat() if assignment.updated_at else None,
    }


def sales_point_assignment_to_dict(assignment: SalesPointUserAssignment) -> dict:
    sales_point = assignment.sales_point
    return {
        "id": assignment.id,
        "scope": "sales_point",
        "sales_point_id": assignment.sales_point_id,
        "sales_point_code": sales_point.sales_point_code if sales_point else None,
        "sales_point_name": sales_point.sales_point_name if sales_point else None,
        "user_id": assignment.user_id,
        "user": user_to_dict(assignment.user),
        "operator_role": assignment.operator_role,
        "is_default": assignment.is_default,
        "valid_from": assignment.valid_from.isoformat() if assignment.valid_from else None,
        "valid_until": assignment.valid_until.isoformat() if assignment.valid_until else None,
        "notes": assignment.notes,
        "is_active": assignment.is_active,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        "updated_at": assignment.updated_at.isoformat() if assignment.updated_at else None,
    }


async def get_active_warehouse(session, warehouse_id: int):
    result = await session.execute(select(Warehouse).where(and_(Warehouse.id == warehouse_id, Warehouse.deleted_at.is_(None))))
    return result.scalar_one_or_none()


async def get_active_cash_register(session, cash_register_id: int):
    result = await session.execute(select(CashRegister).where(and_(CashRegister.id == cash_register_id, CashRegister.deleted_at.is_(None))))
    return result.scalar_one_or_none()


async def get_active_user(session, user_id: int):
    result = await session.execute(select(User).where(and_(User.id == user_id, User.deleted_at.is_(None))))
    return result.scalar_one_or_none()


@router.get("/sales-points", response_class=JSONResponse)
async def list_sales_points(
    request: Request,
    user: dict = Depends(require_sales_ops_read),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    warehouse_id: int | None = Query(None, gt=0),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = (
                select(SalesPoint)
                .options(selectinload(SalesPoint.warehouse), selectinload(SalesPoint.default_cash_register))
                .where(SalesPoint.deleted_at.is_(None))
            )
            if active_only:
                stmt = stmt.where(SalesPoint.is_active == True)
            if warehouse_id:
                stmt = stmt.where(SalesPoint.warehouse_id == warehouse_id)
            result = await session.execute(stmt.order_by(SalesPoint.sales_point_code).offset(skip).limit(limit))
            sales_points = [sales_point_to_dict(row) for row in result.scalars().all()]
            return ResponseManager.success(data=sales_points, message=f"Se encontraron {len(sales_points)} puntos de venta", request=request)
    except Exception as exc:
        logger.error("Error al listar puntos de venta: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener puntos de venta", details=str(exc), request=request)


@router.post("/sales-points", response_class=JSONResponse)
async def create_sales_point(sales_point_data: SalesPointCreate, request: Request, user: dict = Depends(require_sales_ops_write)):
    try:
        async with db_manager.get_async_session() as session:
            warehouse = await get_active_warehouse(session, sales_point_data.warehouse_id)
            if not warehouse:
                return ResponseManager.error(message="Bodega/sucursal no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)

            cash_register = None
            if sales_point_data.default_cash_register_id:
                cash_register = await get_active_cash_register(session, sales_point_data.default_cash_register_id)
                if not cash_register:
                    return ResponseManager.error(message="Caja por defecto no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)

            sales_point = SalesPoint(
                sales_point_code=await generate_sequential_code(session, SalesPoint, "sales_point_code", "PV"),
                sales_point_name=sales_point_data.sales_point_name,
                warehouse_id=sales_point_data.warehouse_id,
                default_cash_register_id=sales_point_data.default_cash_register_id,
                channel_type=sales_point_data.channel_type,
                location_description=sales_point_data.location_description,
                is_active=sales_point_data.is_active,
            )
            session.add(sales_point)
            await session.commit()
            await session.refresh(sales_point)
            sales_point.warehouse = warehouse
            sales_point.default_cash_register = cash_register
            logger.info("Usuario %s creo punto de venta: %s", user.get("username"), sales_point.sales_point_code)
            return ResponseManager.success(data=sales_point_to_dict(sales_point), message="Punto de venta creado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear punto de venta: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear punto de venta", details=str(exc), request=request)


@router.put("/sales-points/{sales_point_id}", response_class=JSONResponse)
async def update_sales_point(sales_point_data: SalesPointUpdate, request: Request, sales_point_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(select(SalesPoint).options(selectinload(SalesPoint.warehouse), selectinload(SalesPoint.default_cash_register)).where(and_(SalesPoint.id == sales_point_id, SalesPoint.deleted_at.is_(None))))
            sales_point = result.scalar_one_or_none()
            if not sales_point:
                return ResponseManager.error(message="Punto de venta no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)

            if sales_point_data.warehouse_id is not None:
                warehouse = await get_active_warehouse(session, sales_point_data.warehouse_id)
                if not warehouse:
                    return ResponseManager.error(message="Bodega/sucursal no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
                sales_point.warehouse_id = sales_point_data.warehouse_id
                sales_point.warehouse = warehouse

            if "default_cash_register_id" in sales_point_data.model_fields_set:
                if sales_point_data.default_cash_register_id is None:
                    sales_point.default_cash_register_id = None
                    sales_point.default_cash_register = None
                else:
                    cash_register = await get_active_cash_register(session, sales_point_data.default_cash_register_id)
                    if not cash_register:
                        return ResponseManager.error(message="Caja por defecto no encontrada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
                    sales_point.default_cash_register_id = sales_point_data.default_cash_register_id
                    sales_point.default_cash_register = cash_register

            for field in ["sales_point_name", "channel_type", "location_description", "is_active"]:
                value = getattr(sales_point_data, field)
                if value is not None:
                    setattr(sales_point, field, value)
            sales_point.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(sales_point)
            return ResponseManager.success(data=sales_point_to_dict(sales_point), message="Punto de venta actualizado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar punto de venta %s: %s", sales_point_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar punto de venta", details=str(exc), request=request)


@router.delete("/sales-points/{sales_point_id}", response_class=JSONResponse)
async def delete_sales_point(request: Request, sales_point_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(select(SalesPoint).where(and_(SalesPoint.id == sales_point_id, SalesPoint.deleted_at.is_(None))))
            sales_point = result.scalar_one_or_none()
            if not sales_point:
                return ResponseManager.error(message="Punto de venta no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            sales_point.deleted_at = datetime.now(timezone.utc)
            sales_point.is_active = False
            await session.commit()
            return ResponseManager.success(data=sales_point_to_dict(sales_point), message="Punto de venta eliminado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar punto de venta %s: %s", sales_point_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar punto de venta", details=str(exc), request=request)


@router.get("/assignments/cash-registers", response_class=JSONResponse)
async def list_cash_register_assignments(request: Request, user: dict = Depends(require_sales_ops_read), active_only: bool = Query(False)):
    try:
        async with db_manager.get_async_session() as session:
            stmt = select(CashRegisterUserAssignment).options(selectinload(CashRegisterUserAssignment.cash_register), selectinload(CashRegisterUserAssignment.user)).where(CashRegisterUserAssignment.deleted_at.is_(None))
            if active_only:
                stmt = stmt.where(CashRegisterUserAssignment.is_active == True)
            result = await session.execute(stmt.order_by(CashRegisterUserAssignment.cash_register_id, CashRegisterUserAssignment.user_id))
            assignments = [cash_assignment_to_dict(row) for row in result.scalars().all()]
            return ResponseManager.success(data=assignments, message=f"Se encontraron {len(assignments)} asignaciones de caja", request=request)
    except Exception as exc:
        logger.error("Error al listar asignaciones de caja: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener asignaciones de caja", details=str(exc), request=request)


@router.post("/assignments/cash-registers", response_class=JSONResponse)
async def create_cash_register_assignment(assignment_data: CashRegisterAssignmentCreate, request: Request, user: dict = Depends(require_sales_ops_write)):
    try:
        async with db_manager.get_async_session() as session:
            cash_register = await get_active_cash_register(session, assignment_data.cash_register_id)
            operator = await get_active_user(session, assignment_data.user_id)
            if not cash_register or not operator:
                return ResponseManager.error(message="Caja o usuario no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
            assignment = CashRegisterUserAssignment(**assignment_data.model_dump())
            session.add(assignment)
            await session.commit()
            await session.refresh(assignment)
            assignment.cash_register = cash_register
            assignment.user = operator
            return ResponseManager.success(data=cash_assignment_to_dict(assignment), message="Asignacion de caja creada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear asignacion de caja: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear asignacion de caja", details=str(exc), request=request)


@router.put("/assignments/cash-registers/{assignment_id}", response_class=JSONResponse)
async def update_cash_register_assignment(assignment_data: OperatorAssignmentUpdate, request: Request, assignment_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    return await _update_assignment(CashRegisterUserAssignment, cash_assignment_to_dict, assignment_data, request, assignment_id)


@router.delete("/assignments/cash-registers/{assignment_id}", response_class=JSONResponse)
async def delete_cash_register_assignment(request: Request, assignment_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    return await _delete_assignment(CashRegisterUserAssignment, cash_assignment_to_dict, request, assignment_id)


@router.get("/assignments/sales-points", response_class=JSONResponse)
async def list_sales_point_assignments(request: Request, user: dict = Depends(require_sales_ops_read), active_only: bool = Query(False)):
    try:
        async with db_manager.get_async_session() as session:
            stmt = select(SalesPointUserAssignment).options(selectinload(SalesPointUserAssignment.sales_point), selectinload(SalesPointUserAssignment.user)).where(SalesPointUserAssignment.deleted_at.is_(None))
            if active_only:
                stmt = stmt.where(SalesPointUserAssignment.is_active == True)
            result = await session.execute(stmt.order_by(SalesPointUserAssignment.sales_point_id, SalesPointUserAssignment.user_id))
            assignments = [sales_point_assignment_to_dict(row) for row in result.scalars().all()]
            return ResponseManager.success(data=assignments, message=f"Se encontraron {len(assignments)} asignaciones POS", request=request)
    except Exception as exc:
        logger.error("Error al listar asignaciones POS: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener asignaciones POS", details=str(exc), request=request)


@router.post("/assignments/sales-points", response_class=JSONResponse)
async def create_sales_point_assignment(assignment_data: SalesPointAssignmentCreate, request: Request, user: dict = Depends(require_sales_ops_write)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(select(SalesPoint).where(and_(SalesPoint.id == assignment_data.sales_point_id, SalesPoint.deleted_at.is_(None))))
            sales_point = result.scalar_one_or_none()
            operator = await get_active_user(session, assignment_data.user_id)
            if not sales_point or not operator:
                return ResponseManager.error(message="Punto de venta o usuario no encontrado", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
            assignment = SalesPointUserAssignment(**assignment_data.model_dump())
            session.add(assignment)
            await session.commit()
            await session.refresh(assignment)
            assignment.sales_point = sales_point
            assignment.user = operator
            return ResponseManager.success(data=sales_point_assignment_to_dict(assignment), message="Asignacion POS creada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear asignacion POS: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear asignacion POS", details=str(exc), request=request)


@router.put("/assignments/sales-points/{assignment_id}", response_class=JSONResponse)
async def update_sales_point_assignment(assignment_data: OperatorAssignmentUpdate, request: Request, assignment_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    return await _update_assignment(SalesPointUserAssignment, sales_point_assignment_to_dict, assignment_data, request, assignment_id)


@router.delete("/assignments/sales-points/{assignment_id}", response_class=JSONResponse)
async def delete_sales_point_assignment(request: Request, assignment_id: int = Path(..., gt=0), user: dict = Depends(require_sales_ops_write)):
    return await _delete_assignment(SalesPointUserAssignment, sales_point_assignment_to_dict, request, assignment_id)


async def _update_assignment(model, serializer, assignment_data: OperatorAssignmentUpdate, request: Request, assignment_id: int):
    try:
        async with db_manager.get_async_session() as session:
            load_options = [selectinload(model.user)]
            if model is CashRegisterUserAssignment:
                load_options.append(selectinload(model.cash_register))
            else:
                load_options.append(selectinload(model.sales_point))
            result = await session.execute(select(model).options(*load_options).where(and_(model.id == assignment_id, model.deleted_at.is_(None))))
            assignment = result.scalar_one_or_none()
            if not assignment:
                return ResponseManager.error(message="Asignacion no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            for field, value in assignment_data.model_dump(exclude_unset=True).items():
                setattr(assignment, field, value)
            assignment.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(assignment)
            return ResponseManager.success(data=serializer(assignment), message="Asignacion actualizada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar asignacion %s: %s", assignment_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar asignacion", details=str(exc), request=request)


async def _delete_assignment(model, serializer, request: Request, assignment_id: int):
    try:
        async with db_manager.get_async_session() as session:
            load_options = [selectinload(model.user)]
            if model is CashRegisterUserAssignment:
                load_options.append(selectinload(model.cash_register))
            else:
                load_options.append(selectinload(model.sales_point))
            result = await session.execute(select(model).options(*load_options).where(and_(model.id == assignment_id, model.deleted_at.is_(None))))
            assignment = result.scalar_one_or_none()
            if not assignment:
                return ResponseManager.error(message="Asignacion no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            assignment.deleted_at = datetime.now(timezone.utc)
            assignment.is_active = False
            await session.commit()
            return ResponseManager.success(data=serializer(assignment), message="Asignacion eliminada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar asignacion %s: %s", assignment_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar asignacion", details=str(exc), request=request)
