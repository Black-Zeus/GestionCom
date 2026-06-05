"""
Router de mantenedor de metodos de pago.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.payment_methods import PaymentMethod, PaymentMethodType
from database.schemas.payment_methods import PaymentMethodCreate, PaymentMethodUpdate
from utils.auth_helpers import get_client_ip
from utils.code_generator import generate_sequential_code
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Payment Methods"],
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


async def require_payment_method_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PAYMENT_METHODS_ACCESS", "PAYMENT_METHODS_MANAGE"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para leer metodos de pago en %s %s - IP: %s",
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
        details="Se requiere permiso para ver metodos de pago",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_payment_method_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PAYMENT_METHODS_MANAGE"]):
        return user

    logger.warning(
        "ACCESO DENEGADO - Usuario: %s sin permisos para modificar metodos de pago en %s %s - IP: %s",
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
        details="Se requiere permiso para gestionar metodos de pago",
        request=request,
    )
    from fastapi import HTTPException
    import json

    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def payment_method_to_dict(payment_method: PaymentMethod) -> dict:
    return {
        "id": payment_method.id,
        "method_code": payment_method.method_code,
        "method_name": payment_method.method_name,
        "method_type": payment_method.method_type.value if payment_method.method_type else None,
        "affects_cash_flow": payment_method.affects_cash_flow,
        "requires_authorization": payment_method.requires_authorization,
        "currency_code": payment_method.currency_code,
        "is_active": payment_method.is_active,
        "allows_postdated": payment_method.allows_postdated,
        "requires_bank_info": payment_method.requires_bank_info,
        "default_terms_days": payment_method.default_terms_days,
        "display_name": payment_method.display_name,
        "created_at": payment_method.created_at.isoformat() if payment_method.created_at else None,
        "updated_at": payment_method.updated_at.isoformat() if payment_method.updated_at else None,
    }


def _method_type(value: str) -> PaymentMethodType:
    return PaymentMethodType(str(value).upper())


@router.get("/", response_class=JSONResponse)
async def list_payment_methods(
    request: Request,
    user: dict = Depends(require_payment_method_read),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(False),
    method_type: str | None = Query(None, pattern="^(CASH|CARD|TRANSFER|OTHER)$"),
):
    try:
        async with db_manager.get_async_session() as session:
            stmt = select(PaymentMethod).where(PaymentMethod.deleted_at.is_(None))

            if active_only:
                stmt = stmt.where(PaymentMethod.is_active == True)
            if method_type:
                stmt = stmt.where(PaymentMethod.method_type == _method_type(method_type))

            stmt = stmt.order_by(PaymentMethod.method_code).offset(skip).limit(limit)
            result = await session.execute(stmt)
            methods = [payment_method_to_dict(method) for method in result.scalars().all()]

            logger.info("Usuario %s listo %s metodos de pago", user.get("username"), len(methods))
            return ResponseManager.success(data=methods, message=f"Se encontraron {len(methods)} metodos de pago", request=request)
    except Exception as exc:
        logger.error("Error al listar metodos de pago: %s", exc)
        return ResponseManager.internal_server_error(message="Error al obtener metodos de pago", details=str(exc), request=request)


@router.post("/", response_class=JSONResponse)
async def create_payment_method(
    payment_method_data: PaymentMethodCreate,
    request: Request,
    user: dict = Depends(require_payment_method_write),
):
    try:
        async with db_manager.get_async_session() as session:
            method_code = await generate_sequential_code(session, PaymentMethod, "method_code", "PAY")
            payment_method = PaymentMethod(
                method_code=method_code,
                method_name=payment_method_data.method_name,
                method_type=_method_type(payment_method_data.method_type),
                affects_cash_flow=payment_method_data.affects_cash_flow,
                requires_authorization=payment_method_data.requires_authorization,
                currency_code=payment_method_data.currency_code,
                is_active=payment_method_data.is_active,
                allows_postdated=payment_method_data.allows_postdated,
                requires_bank_info=payment_method_data.requires_bank_info,
                default_terms_days=payment_method_data.default_terms_days,
            )
            session.add(payment_method)
            await session.commit()
            await session.refresh(payment_method)

            logger.info("Usuario %s creo metodo de pago: %s", user.get("username"), payment_method.method_code)
            return ResponseManager.success(data=payment_method_to_dict(payment_method), message="Metodo de pago creado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al crear metodo de pago: %s", exc)
        return ResponseManager.internal_server_error(message="Error al crear metodo de pago", details=str(exc), request=request)


@router.put("/{payment_method_id}", response_class=JSONResponse)
async def update_payment_method(
    payment_method_data: PaymentMethodUpdate,
    request: Request,
    payment_method_id: int = Path(..., gt=0),
    user: dict = Depends(require_payment_method_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PaymentMethod).where(and_(PaymentMethod.id == payment_method_id, PaymentMethod.deleted_at.is_(None)))
            )
            payment_method = result.scalar_one_or_none()
            if not payment_method:
                return ResponseManager.error(
                    message=f"Metodo de pago no encontrado: {payment_method_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            for field in [
                "method_name",
                "affects_cash_flow",
                "requires_authorization",
                "currency_code",
                "is_active",
                "allows_postdated",
                "requires_bank_info",
                "default_terms_days",
            ]:
                value = getattr(payment_method_data, field)
                if value is not None:
                    setattr(payment_method, field, value)

            if payment_method_data.method_type is not None:
                payment_method.method_type = _method_type(payment_method_data.method_type)

            payment_method.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(payment_method)

            logger.info("Usuario %s actualizo metodo de pago: %s", user.get("username"), payment_method.method_code)
            return ResponseManager.success(data=payment_method_to_dict(payment_method), message="Metodo de pago actualizado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al actualizar metodo de pago %s: %s", payment_method_id, exc)
        return ResponseManager.internal_server_error(message="Error al actualizar metodo de pago", details=str(exc), request=request)


@router.delete("/{payment_method_id}", response_class=JSONResponse)
async def delete_payment_method(
    request: Request,
    payment_method_id: int = Path(..., gt=0),
    user: dict = Depends(require_payment_method_write),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(PaymentMethod).where(and_(PaymentMethod.id == payment_method_id, PaymentMethod.deleted_at.is_(None)))
            )
            payment_method = result.scalar_one_or_none()
            if not payment_method:
                return ResponseManager.error(
                    message=f"Metodo de pago no encontrado: {payment_method_id}",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_ERROR,
                    request=request,
                )

            payment_method.deleted_at = datetime.now(timezone.utc)
            payment_method.is_active = False
            await session.commit()

            logger.info("Usuario %s elimino metodo de pago: %s", user.get("username"), payment_method.method_code)
            return ResponseManager.success(data=payment_method_to_dict(payment_method), message="Metodo de pago eliminado correctamente", request=request)
    except Exception as exc:
        logger.error("Error al eliminar metodo de pago %s: %s", payment_method_id, exc)
        return ResponseManager.internal_server_error(message="Error al eliminar metodo de pago", details=str(exc), request=request)
