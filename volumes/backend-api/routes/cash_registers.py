"""
Router de configuracion de cajas POS.
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
from database.models.warehouses import Warehouse
from database.schemas.cash_registers import CashRegisterCreate, CashRegisterUpdate
from utils.auth_helpers import get_client_ip
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Cash Registers"],
    responses={
        401: {"description": "Token invalido o expirado"},
        403: {"description": "Acceso denegado - Permisos insuficientes"},
        404: {"description": "Recurso no encontrado"},
        422: {"description": "Error de validacion"},
        500: {"description": "Error interno del servidor"},
    },
)


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_cash_register_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["CASH_POS_ADMIN_ACCESS", "CASH_SETTINGS_MANAGE", "CASH_SETTINGS_ADMIN"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para leer cajas POS en %s %s - IP: %s",
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
        details="Se requiere permiso para administrar cajas POS",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_cash_register_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["CASH_SETTINGS_MANAGE", "CASH_SETTINGS_ADMIN"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para modificar cajas POS en %s %s - IP: %s",
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
        details="Se requiere permiso para gestionar configuracion de cajas",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def cash_register_to_dict(cash_register: CashRegister) -> dict:
    warehouse = cash_register.warehouse
    return {
        "id": cash_register.id,
        "register_code": cash_register.register_code,
        "register_name": cash_register.register_name,
        "warehouse_id": cash_register.warehouse_id,
        "warehouse_code": warehouse.warehouse_code if warehouse else None,
        "warehouse_name": warehouse.warehouse_name if warehouse else None,
        "terminal_identifier": cash_register.terminal_identifier,
        "ip_address": cash_register.ip_address,
        "location_description": cash_register.location_description,
        "is_active": cash_register.is_active,
        "requires_supervisor_approval": cash_register.requires_supervisor_approval,
        "max_difference_amount": float(cash_register.max_difference_amount or 0),
        "display_name": cash_register.display_name,
        "created_at": cash_register.created_at.isoformat() if cash_register.created_at else None,
        "updated_at": cash_register.updated_at.isoformat() if cash_register.updated_at else None,
    }


async def get_active_warehouse(session, warehouse_id: int):
    result = await session.execute(
        select(Warehouse).where(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.deleted_at.is_(None),
            )
        )
    )
    return result.scalar_one_or_none()


@router.get("/", response_class=JSONResponse)
async def list_cash_registers(
    request: Request,
    user: dict = Depends(require_cash_register_read),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    warehouse_id: int | None = Query(None, gt=0),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = (
                select(CashRegister)
                .options(selectinload(CashRegister.warehouse))
                .where(CashRegister.deleted_at.is_(None))
            )

            if active_only:
                stmt = stmt.where(CashRegister.is_active == True)
            if warehouse_id:
                stmt = stmt.where(CashRegister.warehouse_id == warehouse_id)

            stmt = stmt.order_by(CashRegister.register_code).offset(skip).limit(limit)
            result = await session.execute(stmt)
            registers = [cash_register_to_dict(register) for register in result.scalars().all()]

            logger.info("Usuario %s listo %s cajas POS", user.get("username"), len(registers))
            return ResponseManager.success(data=registers, message=f"Se encontraron {len(registers)} cajas POS", request=request)
    except Exception as exc:
        logger.error("Error al listar cajas POS: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener cajas POS", details=str(exc), request=request)


@router.post("/", response_class=JSONResponse)
async def create_cash_register(
    cash_register_data: CashRegisterCreate,
    request: Request,
    user: dict = Depends(require_cash_register_write),
):
    try:
        async with db_manager.get_async_session() as session:
            existing_result = await session.execute(
                select(CashRegister).where(
                    and_(
                        CashRegister.register_code == cash_register_data.register_code.upper(),
                        CashRegister.deleted_at.is_(None),
                    )
                )
            )
            if existing_result.scalar_one_or_none():
                return ResponseManager.error(
                    message=f"Ya existe una caja con el codigo: {cash_register_data.register_code}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.RESOURCE_DUPLICATE,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            warehouse = await get_active_warehouse(session, cash_register_data.warehouse_id)
            if not warehouse:
                return ResponseManager.error(
                    message=f"Bodega no encontrada: {cash_register_data.warehouse_id}",
                    status_code=HTTPStatus.BAD_REQUEST,
                    error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                    error_type=ErrorType.VALIDATION_ERROR,
                    request=request,
                )

            new_register = CashRegister(
                register_code=cash_register_data.register_code,
                register_name=cash_register_data.register_name,
                warehouse_id=cash_register_data.warehouse_id,
                terminal_identifier=cash_register_data.terminal_identifier,
                ip_address=cash_register_data.ip_address,
                location_description=cash_register_data.location_description,
                is_active=cash_register_data.is_active,
                requires_supervisor_approval=cash_register_data.requires_supervisor_approval,
                max_difference_amount=cash_register_data.max_difference_amount,
            )
            session.add(new_register)
            await session.commit()
            await session.refresh(new_register)
            new_register.warehouse = warehouse

            logger.info("Usuario %s creo caja POS: %s", user.get("username"), new_register.register_code)
            return ResponseManager.success(data=cash_register_to_dict(new_register), message="Caja POS creada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear caja POS: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear caja POS", details=str(exc), request=request)


@router.put("/{cash_register_id}", response_class=JSONResponse)
async def update_cash_register(
    cash_register_data: CashRegisterUpdate,
    request: Request,
    cash_register_id: int = Path(..., gt=0),
    user: dict = Depends(require_cash_register_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(CashRegister)
                .options(selectinload(CashRegister.warehouse))
                .where(and_(CashRegister.id == cash_register_id, CashRegister.deleted_at.is_(None)))
            )
            cash_register = result.scalar_one_or_none()
            if not cash_register:
                return ResponseManager.error(
                    message=f"Caja POS no encontrada: {cash_register_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            if cash_register_data.warehouse_id is not None:
                warehouse = await get_active_warehouse(session, cash_register_data.warehouse_id)
                if not warehouse:
                    return ResponseManager.error(
                        message=f"Bodega no encontrada: {cash_register_data.warehouse_id}",
                        status_code=HTTPStatus.BAD_REQUEST,
                        error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
                        error_type=ErrorType.VALIDATION_ERROR,
                        request=request,
                    )
                cash_register.warehouse_id = cash_register_data.warehouse_id
                cash_register.warehouse = warehouse

            for field in [
                "register_name",
                "terminal_identifier",
                "ip_address",
                "location_description",
                "is_active",
                "requires_supervisor_approval",
                "max_difference_amount",
            ]:
                value = getattr(cash_register_data, field)
                if value is not None:
                    setattr(cash_register, field, value)

            cash_register.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(cash_register)

            logger.info("Usuario %s actualizo caja POS: %s", user.get("username"), cash_register.register_code)
            return ResponseManager.success(data=cash_register_to_dict(cash_register), message="Caja POS actualizada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar caja POS %s: %s", cash_register_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar caja POS", details=str(exc), request=request)


@router.delete("/{cash_register_id}", response_class=JSONResponse)
async def delete_cash_register(
    request: Request,
    cash_register_id: int = Path(..., gt=0),
    user: dict = Depends(require_cash_register_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(CashRegister)
                .options(selectinload(CashRegister.warehouse))
                .where(and_(CashRegister.id == cash_register_id, CashRegister.deleted_at.is_(None)))
            )
            cash_register = result.scalar_one_or_none()
            if not cash_register:
                return ResponseManager.error(
                    message=f"Caja POS no encontrada: {cash_register_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            cash_register.deleted_at = datetime.now(timezone.utc)
            cash_register.is_active = False
            await session.commit()

            logger.info("Usuario %s elimino caja POS: %s", user.get("username"), cash_register.register_code)
            return ResponseManager.success(data=cash_register_to_dict(cash_register), message="Caja POS eliminada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar caja POS %s: %s", cash_register_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar caja POS", details=str(exc), request=request)
