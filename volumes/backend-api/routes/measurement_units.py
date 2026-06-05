"""
Router de mantenedor de unidades de medida.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select
from sqlalchemy.orm import selectinload

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.measurement_units import MeasurementUnit, MeasurementUnitType
from database.schemas.measurement_units import MeasurementUnitCreate, MeasurementUnitUpdate
from utils.auth_helpers import get_client_ip
from utils.code_generator import generate_sequential_code
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Measurement Units"],
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


async def require_measurement_unit_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["MEASUREMENT_UNITS_ACCESS", "MEASUREMENT_UNITS_MANAGE"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para leer unidades en %s %s - IP: %s",
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
        details="Se requiere permiso para ver unidades de medida",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_measurement_unit_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["MEASUREMENT_UNITS_MANAGE"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para modificar unidades en %s %s - IP: %s",
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
        details="Se requiere permiso para gestionar unidades de medida",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def measurement_unit_to_dict(unit: MeasurementUnit) -> dict:
    base_unit = unit.base_unit
    return {
        "id": unit.id,
        "unit_code": unit.unit_code,
        "unit_name": unit.unit_name,
        "unit_symbol": unit.unit_symbol,
        "unit_type": unit.unit_type.value if unit.unit_type else None,
        "base_unit_id": unit.base_unit_id,
        "base_unit_code": base_unit.unit_code if base_unit else None,
        "base_unit_name": base_unit.unit_name if base_unit else None,
        "conversion_factor": float(unit.conversion_factor or 1),
        "allow_decimals": unit.allow_decimals,
        "is_active": unit.is_active,
        "display_name": unit.display_name,
        "created_at": unit.created_at.isoformat() if unit.created_at else None,
        "updated_at": unit.updated_at.isoformat() if unit.updated_at else None,
    }


def _unit_type(value: str) -> MeasurementUnitType:
    return MeasurementUnitType(str(value).upper())


async def _get_active_base_unit(session, base_unit_id: int | None):
    if not base_unit_id:
        return None

    result = await session.execute(
        select(MeasurementUnit).where(
            and_(
                MeasurementUnit.id == base_unit_id,
                MeasurementUnit.deleted_at.is_(None),
                MeasurementUnit.is_active == True,
            )
        )
    )
    return result.scalar_one_or_none()


async def _validate_unit_conversion(session, request: Request, unit_type: str, base_unit_id: int | None, current_unit_id: int | None = None):
    normalized_type = str(unit_type).upper()
    if normalized_type == "BASE":
        return None

    if not base_unit_id:
        return ResponseManager.error(
            message="Las unidades derivadas requieren una unidad base",
            status_code=HTTPStatus.BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
            error_type=ErrorType.VALIDATION_ERROR,
            request=request,
        )

    if current_unit_id and int(base_unit_id) == int(current_unit_id):
        return ResponseManager.error(
            message="Una unidad no puede usarse como su propia unidad base",
            status_code=HTTPStatus.BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
            error_type=ErrorType.VALIDATION_ERROR,
            request=request,
        )

    base_unit = await _get_active_base_unit(session, base_unit_id)
    if not base_unit:
        return ResponseManager.error(
            message=f"Unidad base no encontrada: {base_unit_id}",
            status_code=HTTPStatus.BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
            error_type=ErrorType.VALIDATION_ERROR,
            request=request,
        )

    return None


@router.get("/", response_class=JSONResponse)
async def list_measurement_units(
    request: Request,
    user: dict = Depends(require_measurement_unit_read),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    unit_type: str | None = Query(None, pattern="^(BASE|DERIVED)$"),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = (
                select(MeasurementUnit)
                .options(selectinload(MeasurementUnit.base_unit))
                .where(MeasurementUnit.deleted_at.is_(None))
            )

            if active_only:
                stmt = stmt.where(MeasurementUnit.is_active == True)
            if unit_type:
                stmt = stmt.where(MeasurementUnit.unit_type == _unit_type(unit_type))

            stmt = stmt.order_by(MeasurementUnit.unit_code).offset(skip).limit(limit)
            result = await session.execute(stmt)
            units = [measurement_unit_to_dict(unit) for unit in result.scalars().all()]

            logger.info("Usuario %s listo %s unidades de medida", user.get("username"), len(units))
            return ResponseManager.success(data=units, message=f"Se encontraron {len(units)} unidades de medida", request=request)
    except Exception as exc:
        logger.error("Error al listar unidades de medida: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener unidades de medida", details=str(exc), request=request)


@router.post("/", response_class=JSONResponse)
async def create_measurement_unit(
    unit_data: MeasurementUnitCreate,
    request: Request,
    user: dict = Depends(require_measurement_unit_write),
):
    try:
        async with db_manager.get_async_session() as session:
            validation_error = await _validate_unit_conversion(session, request, unit_data.unit_type, unit_data.base_unit_id)
            if validation_error:
                return validation_error

            unit_code = await generate_sequential_code(session, MeasurementUnit, "unit_code", "UM")
            unit = MeasurementUnit(
                unit_code=unit_code,
                unit_name=unit_data.unit_name,
                unit_symbol=unit_data.unit_symbol,
                unit_type=_unit_type(unit_data.unit_type),
                base_unit_id=unit_data.base_unit_id if unit_data.unit_type == "DERIVED" else None,
                conversion_factor=unit_data.conversion_factor,
                allow_decimals=unit_data.allow_decimals,
                is_active=unit_data.is_active,
            )
            session.add(unit)
            await session.commit()
            await session.refresh(unit)

            logger.info("Usuario %s creo unidad de medida: %s", user.get("username"), unit.unit_code)
            return ResponseManager.success(data=measurement_unit_to_dict(unit), message="Unidad de medida creada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear unidad de medida: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear unidad de medida", details=str(exc), request=request)


@router.put("/{unit_id}", response_class=JSONResponse)
async def update_measurement_unit(
    unit_data: MeasurementUnitUpdate,
    request: Request,
    unit_id: int = Path(..., gt=0),
    user: dict = Depends(require_measurement_unit_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(MeasurementUnit)
                .options(selectinload(MeasurementUnit.base_unit))
                .where(and_(MeasurementUnit.id == unit_id, MeasurementUnit.deleted_at.is_(None)))
            )
            unit = result.scalar_one_or_none()
            if not unit:
                return ResponseManager.error(
                    message=f"Unidad de medida no encontrada: {unit_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            next_unit_type = unit_data.unit_type or unit.unit_type.value
            next_base_unit_id = unit_data.base_unit_id if unit_data.base_unit_id is not None else unit.base_unit_id
            validation_error = await _validate_unit_conversion(session, request, next_unit_type, next_base_unit_id, current_unit_id=unit.id)
            if validation_error:
                return validation_error

            for field in ["unit_name", "unit_symbol", "conversion_factor", "allow_decimals", "is_active"]:
                value = getattr(unit_data, field)
                if value is not None:
                    setattr(unit, field, value)

            if unit_data.unit_type is not None:
                unit.unit_type = _unit_type(unit_data.unit_type)

            if next_unit_type == "BASE":
                unit.base_unit_id = None
            elif unit_data.base_unit_id is not None:
                unit.base_unit_id = unit_data.base_unit_id

            unit.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(unit)

            logger.info("Usuario %s actualizo unidad de medida: %s", user.get("username"), unit.unit_code)
            return ResponseManager.success(data=measurement_unit_to_dict(unit), message="Unidad de medida actualizada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar unidad de medida %s: %s", unit_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar unidad de medida", details=str(exc), request=request)


@router.delete("/{unit_id}", response_class=JSONResponse)
async def delete_measurement_unit(
    request: Request,
    unit_id: int = Path(..., gt=0),
    user: dict = Depends(require_measurement_unit_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(MeasurementUnit).where(and_(MeasurementUnit.id == unit_id, MeasurementUnit.deleted_at.is_(None)))
            )
            unit = result.scalar_one_or_none()
            if not unit:
                return ResponseManager.error(
                    message=f"Unidad de medida no encontrada: {unit_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            unit.deleted_at = datetime.now(timezone.utc)
            unit.is_active = False
            await session.commit()

            logger.info("Usuario %s elimino unidad de medida: %s", user.get("username"), unit.unit_code)
            return ResponseManager.success(data=measurement_unit_to_dict(unit), message="Unidad de medida eliminada correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar unidad de medida %s: %s", unit_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar unidad de medida", details=str(exc), request=request)
