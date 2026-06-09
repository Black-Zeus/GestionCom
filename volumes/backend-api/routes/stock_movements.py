"""
API transaccional para movimientos manuales de stock.
"""
from datetime import date, datetime
from decimal import Decimal
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.inventory_tracking import validate_tracking_dimensions
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Stock Movements"])

READ_PERMISSIONS = ["STOCK_MOVEMENTS_ACCESS", "STOCK_VIEW", "WAREHOUSE_INVENTORY_VIEW"]
WRITE_PERMISSIONS = ["STOCK_ADJUST", "WAREHOUSE_INVENTORY_MANAGE"]

MOVEMENT_TYPES = {
    "MANUAL_IN": {"movement_type": "IN", "reference_type": "ADJUSTMENT", "sign": Decimal("1")},
    "MANUAL_OUT": {"movement_type": "OUT", "reference_type": "ADJUSTMENT", "sign": Decimal("-1")},
    "ADJUST_POSITIVE": {"movement_type": "ADJUSTMENT", "reference_type": "ADJUSTMENT", "sign": Decimal("1")},
    "ADJUST_NEGATIVE": {"movement_type": "ADJUSTMENT", "reference_type": "ADJUSTMENT", "sign": Decimal("-1")},
    "DAMAGE": {"movement_type": "OUT", "reference_type": "DAMAGE", "sign": Decimal("-1")},
    "RETURN_IN": {"movement_type": "IN", "reference_type": "RETURN", "sign": Decimal("1")},
}


class StockMovementCreate(BaseModel):
    manual_movement_type: str = Field(min_length=1, max_length=50)
    product_variant_id: int = Field(gt=0)
    measurement_unit_id: int = Field(gt=0)
    warehouse_id: int = Field(gt=0)
    warehouse_zone_id: int | None = Field(default=None, gt=0)
    warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    quantity: Decimal = Field(gt=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)
    batch_lot_number: str | None = Field(default=None, max_length=100)
    expiry_date: date | None = None
    notes: str = Field(min_length=3, max_length=500)


def _json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row(row) -> dict | None:
    return {key: _json_value(value) for key, value in row.items()} if row else None


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


def _permission_error(request: Request):
    response = ResponseManager.error(
        message="Acceso denegado",
        status_code=HTTPStatus.FORBIDDEN,
        error_code=ErrorCode.PERMISSION_DENIED,
        error_type=ErrorType.PERMISSION_ERROR,
        request=request,
    )
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def _validation_response(message: str, request: Request):
    return ResponseManager.error(
        message=message,
        status_code=HTTPStatus.BAD_REQUEST,
        error_code=ErrorCode.VALIDATION_FIELD_REQUIRED,
        error_type=ErrorType.VALIDATION_ERROR,
        request=request,
    )


async def require_stock_movements_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, READ_PERMISSIONS):
        return user
    _permission_error(request)


async def require_stock_movements_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, WRITE_PERMISSIONS):
        return user
    _permission_error(request)


async def _validate_location(session, warehouse_id: int, zone_id: int | None, location_id: int | None) -> tuple[int | None, int | None]:
    result = await session.execute(text("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL"), {"id": warehouse_id})
    if not result.scalar_one_or_none():
        raise ValueError("Bodega no encontrada")

    if location_id:
        result = await session.execute(
            text(
                "SELECT wzl.id, wzl.warehouse_zone_id "
                "FROM warehouse_zone_locations wzl "
                "JOIN warehouse_zones wz ON wz.id = wzl.warehouse_zone_id "
                "WHERE wzl.id = :location_id AND wzl.deleted_at IS NULL "
                "AND wz.deleted_at IS NULL AND wz.warehouse_id = :warehouse_id"
            ),
            {"location_id": location_id, "warehouse_id": warehouse_id},
        )
        location = result.mappings().first()
        if not location:
            raise ValueError("La ubicacion interna no pertenece a la bodega")
        if zone_id and int(location["warehouse_zone_id"]) != int(zone_id):
            raise ValueError("La ubicacion interna no pertenece a la zona indicada")
        zone_id = int(location["warehouse_zone_id"])

    if zone_id:
        result = await session.execute(
            text("SELECT id FROM warehouse_zones WHERE id = :zone_id AND warehouse_id = :warehouse_id AND deleted_at IS NULL"),
            {"zone_id": zone_id, "warehouse_id": warehouse_id},
        )
        if not result.scalar_one_or_none():
            raise ValueError("La zona no pertenece a la bodega")

    return zone_id, location_id


async def _validate_variant_unit(session, product_variant_id: int, measurement_unit_id: int) -> dict:
    result = await session.execute(
        text(
            "SELECT pv.id, pv.product_id, p.base_measurement_unit_id "
            "FROM product_variants pv "
            "JOIN products p ON p.id = pv.product_id "
            "WHERE pv.id = :id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
        ),
        {"id": product_variant_id},
    )
    variant = result.mappings().first()
    if not variant:
        raise ValueError("SKU / variacion no encontrada")
    result = await session.execute(
        text(
            "SELECT pmu.measurement_unit_id, pmu.conversion_factor, mu.unit_name, mu.unit_symbol "
            "FROM product_measurement_units pmu "
            "JOIN measurement_units mu ON mu.id = pmu.measurement_unit_id "
            "WHERE pmu.product_id = :product_id AND pmu.measurement_unit_id = :measurement_unit_id "
            "AND pmu.is_active = TRUE AND pmu.is_inventory_unit = TRUE AND mu.deleted_at IS NULL AND mu.is_active = TRUE"
        ),
        {"product_id": variant["product_id"], "measurement_unit_id": measurement_unit_id},
    )
    unit = result.mappings().first()
    if not unit and int(measurement_unit_id) == int(variant["base_measurement_unit_id"]):
        result = await session.execute(
            text(
                "SELECT id AS measurement_unit_id, 1.000000 AS conversion_factor, unit_name, unit_symbol "
                "FROM measurement_units "
                "WHERE id = :measurement_unit_id AND deleted_at IS NULL AND is_active = TRUE"
            ),
            {"measurement_unit_id": measurement_unit_id},
        )
        unit = result.mappings().first()
    if not unit:
        raise ValueError("La unidad seleccionada no esta habilitada para inventario en este producto")
    return {
        "base_measurement_unit_id": int(variant["base_measurement_unit_id"]),
        "measurement_unit_id": int(unit["measurement_unit_id"]),
        "conversion_factor": Decimal(str(unit["conversion_factor"] or 1)),
        "unit_name": unit["unit_name"],
        "unit_symbol": unit["unit_symbol"],
    }


async def _stock_row(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    batch_lot_number: str | None,
    expiry_date: date | None,
) -> dict | None:
    result = await session.execute(
        text(
            "SELECT * FROM stock WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id <=> :zone_id AND warehouse_zone_location_id <=> :location_id "
            "AND batch_lot_number <=> :batch_lot_number AND expiry_date <=> :expiry_date LIMIT 1"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
        },
    )
    return _row(result.mappings().first())


async def _apply_manual_movement(session, data: StockMovementCreate, user_id: int) -> int:
    movement_config = MOVEMENT_TYPES.get(data.manual_movement_type)
    if not movement_config:
        raise ValueError("Tipo de movimiento no valido")

    zone_id, location_id = await _validate_location(session, data.warehouse_id, data.warehouse_zone_id, data.warehouse_zone_location_id)
    unit = await _validate_variant_unit(session, data.product_variant_id, data.measurement_unit_id)
    tracking = await validate_tracking_dimensions(session, data.product_variant_id, location_id, data.batch_lot_number, data.expiry_date)
    batch_lot_number = tracking["batch_lot_number"]
    expiry_date = tracking["expiry_date"]

    stock = await _stock_row(session, data.product_variant_id, data.warehouse_id, zone_id, location_id, batch_lot_number, expiry_date)
    quantity_before = Decimal(str(stock["current_quantity"])) if stock else Decimal("0")
    base_quantity = Decimal(str(data.quantity)) * unit["conversion_factor"]
    signed_quantity = base_quantity * movement_config["sign"]
    quantity_after = quantity_before + signed_quantity
    if quantity_after < 0:
        raise ValueError(f"Stock insuficiente en la ubicacion seleccionada. Disponible: {quantity_before}, requerido: {base_quantity}")

    if stock:
        await session.execute(
            text(
                "UPDATE stock SET current_quantity = :quantity_after, last_movement_date = CURRENT_TIMESTAMP, "
                "last_movement_type = :movement_type WHERE id = :id"
            ),
            {"quantity_after": quantity_after, "movement_type": movement_config["movement_type"], "id": stock["id"]},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO stock (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, batch_lot_number, expiry_date, "
                "current_quantity, reserved_quantity, last_movement_date, last_movement_type) "
                "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :batch_lot_number, :expiry_date, :quantity_after, 0, CURRENT_TIMESTAMP, :movement_type)"
            ),
            {
                "product_variant_id": data.product_variant_id,
                "warehouse_id": data.warehouse_id,
                "zone_id": zone_id,
                "location_id": location_id,
                "batch_lot_number": batch_lot_number,
                "expiry_date": expiry_date,
                "quantity_after": quantity_after,
                "movement_type": movement_config["movement_type"],
            },
        )

    total_cost = Decimal(str(data.unit_cost or 0)) * data.quantity
    await session.execute(
        text(
            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
            "movement_type, reference_type, manual_movement_type, measurement_unit_id, movement_unit_quantity, quantity, quantity_before, quantity_after, unit_cost, total_cost, batch_lot_number, expiry_date, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :movement_type, :reference_type, :manual_movement_type, :measurement_unit_id, "
            ":movement_unit_quantity, :quantity, :quantity_before, :quantity_after, :unit_cost, :total_cost, :batch_lot_number, :expiry_date, :notes, :user_id)"
        ),
        {
            "product_variant_id": data.product_variant_id,
            "warehouse_id": data.warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "movement_type": movement_config["movement_type"],
            "reference_type": movement_config["reference_type"],
            "manual_movement_type": data.manual_movement_type,
            "measurement_unit_id": unit["measurement_unit_id"],
            "movement_unit_quantity": data.quantity,
            "quantity": signed_quantity,
            "quantity_before": quantity_before,
            "quantity_after": quantity_after,
            "unit_cost": data.unit_cost,
            "total_cost": total_cost,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "notes": data.notes,
            "user_id": user_id,
        },
    )
    result = await session.execute(text("SELECT LAST_INSERT_ID()"))
    return int(result.scalar_one())


async def _get_movement(session, movement_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT sm.*, pv.variant_name, p.product_name, w.warehouse_name, wz.zone_name, wzl.location_name, "
            "mu.unit_name, mu.unit_symbol, pmu.conversion_factor AS unit_conversion_factor, u.username AS created_by_username "
            "FROM stock_movements sm "
            "JOIN product_variants pv ON pv.id = sm.product_variant_id "
            "JOIN products p ON p.id = pv.product_id "
            "JOIN warehouses w ON w.id = sm.warehouse_id "
            "LEFT JOIN measurement_units mu ON mu.id = sm.measurement_unit_id "
            "LEFT JOIN product_measurement_units pmu ON pmu.product_id = p.id AND pmu.measurement_unit_id = sm.measurement_unit_id "
            "LEFT JOIN warehouse_zones wz ON wz.id = sm.warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = sm.warehouse_zone_location_id "
            "LEFT JOIN users u ON u.id = sm.created_by_user_id "
            "WHERE sm.id = :id"
        ),
        {"id": movement_id},
    )
    return _row(result.mappings().first())


@router.get("/movements", response_class=JSONResponse)
async def list_movements(
    request: Request,
    user: dict = Depends(require_stock_movements_read),
    limit: int = Query(500, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT sm.*, pv.variant_name, p.product_name, w.warehouse_name, wz.zone_name, wzl.location_name, "
                    "mu.unit_name, mu.unit_symbol, pmu.conversion_factor AS unit_conversion_factor, u.username AS created_by_username "
                    "FROM stock_movements sm "
                    "JOIN product_variants pv ON pv.id = sm.product_variant_id "
                    "JOIN products p ON p.id = pv.product_id "
                    "JOIN warehouses w ON w.id = sm.warehouse_id "
                    "LEFT JOIN measurement_units mu ON mu.id = sm.measurement_unit_id "
                    "LEFT JOIN product_measurement_units pmu ON pmu.product_id = p.id AND pmu.measurement_unit_id = sm.measurement_unit_id "
                    "LEFT JOIN warehouse_zones wz ON wz.id = sm.warehouse_zone_id "
                    "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = sm.warehouse_zone_location_id "
                    "LEFT JOIN users u ON u.id = sm.created_by_user_id "
                    "ORDER BY sm.created_at DESC, sm.id DESC LIMIT :limit"
                ),
                {"limit": limit},
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar movimientos de stock", details=str(exc), request=request)


@router.get("/variant-units/{product_variant_id}", response_class=JSONResponse)
async def list_variant_units(product_variant_id: int, request: Request, user: dict = Depends(require_stock_movements_read)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT mu.id, mu.unit_code, mu.unit_name, mu.unit_symbol, pmu.conversion_factor, "
                    "CASE WHEN p.base_measurement_unit_id = mu.id THEN TRUE ELSE FALSE END AS is_base_unit "
                    "FROM product_variants pv "
                    "JOIN products p ON p.id = pv.product_id "
                    "JOIN product_measurement_units pmu ON pmu.product_id = p.id "
                    "JOIN measurement_units mu ON mu.id = pmu.measurement_unit_id "
                    "WHERE pv.id = :product_variant_id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL "
                    "AND pmu.is_active = TRUE AND pmu.is_inventory_unit = TRUE AND mu.deleted_at IS NULL AND mu.is_active = TRUE "
                    "ORDER BY CASE WHEN p.base_measurement_unit_id = mu.id THEN 0 ELSE 1 END, mu.unit_name"
                ),
                {"product_variant_id": product_variant_id},
            )
            units = [_row(row) for row in result.mappings().all()]
            if not units:
                fallback_result = await session.execute(
                    text(
                        "SELECT mu.id, mu.unit_code, mu.unit_name, mu.unit_symbol, 1.000000 AS conversion_factor, TRUE AS is_base_unit "
                        "FROM product_variants pv "
                        "JOIN products p ON p.id = pv.product_id "
                        "JOIN measurement_units mu ON mu.id = p.base_measurement_unit_id "
                        "WHERE pv.id = :product_variant_id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL "
                        "AND mu.deleted_at IS NULL AND mu.is_active = TRUE"
                    ),
                    {"product_variant_id": product_variant_id},
                )
                units = [_row(row) for row in fallback_result.mappings().all()]
            return ResponseManager.success(data=units, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar unidades del SKU", details=str(exc), request=request)


@router.get("/variants-options", response_class=JSONResponse)
async def list_inventory_variant_options(request: Request, user: dict = Depends(require_stock_movements_read)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT pv.id, pv.product_id, pv.variant_sku, pv.variant_name, pv.is_active, "
                    "p.product_code, p.product_name, p.has_location_tracking, p.has_batch_control, p.has_expiry_date, p.has_serial_numbers "
                    "FROM product_variants pv "
                    "JOIN products p ON p.id = pv.product_id "
                    "WHERE pv.deleted_at IS NULL AND p.deleted_at IS NULL AND pv.is_active = TRUE AND p.is_active = TRUE "
                    "ORDER BY p.product_name, pv.variant_name, pv.variant_sku"
                )
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar SKU para inventario", details=str(exc), request=request)


@router.post("/movements", response_class=JSONResponse)
async def create_movement(data: StockMovementCreate, request: Request, user: dict = Depends(require_stock_movements_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                movement_id = await _apply_manual_movement(session, data, user.get("user_id") or user.get("id"))
                await session.commit()
                return ResponseManager.success(data=await _get_movement(session, movement_id), message="Movimiento registrado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al registrar movimiento de stock", details=str(exc), request=request)
