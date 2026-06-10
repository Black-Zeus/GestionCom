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
from services.inventory_expiry_alerts import emit_expiring_lot_alerts as emit_expiring_lot_notifications
from utils.inventory_tracking import validate_serial_quantity, validate_tracking_dimensions
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Stock Movements"])

READ_PERMISSIONS = ["STOCK_MOVEMENTS_ACCESS", "STOCK_VIEW", "WAREHOUSE_INVENTORY_VIEW"]
WRITE_PERMISSIONS = ["STOCK_ADJUST", "WAREHOUSE_INVENTORY_MANAGE"]
CONVERSION_READ_PERMISSIONS = ["STOCK_CONVERSIONS_ACCESS", "STOCK_VIEW", "WAREHOUSE_INVENTORY_VIEW"]
CONVERSION_WRITE_PERMISSIONS = ["STOCK_CONVERT", "STOCK_ADJUST", "WAREHOUSE_INVENTORY_MANAGE"]

MOVEMENT_TYPES = {
    "MANUAL_IN": {"movement_type": "IN", "reference_type": "ADJUSTMENT", "sign": Decimal("1")},
    "MANUAL_OUT": {"movement_type": "OUT", "reference_type": "ADJUSTMENT", "sign": Decimal("-1")},
    "ADJUST_POSITIVE": {"movement_type": "ADJUSTMENT", "reference_type": "ADJUSTMENT", "sign": Decimal("1")},
    "ADJUST_NEGATIVE": {"movement_type": "ADJUSTMENT", "reference_type": "ADJUSTMENT", "sign": Decimal("-1")},
    "DAMAGE": {"movement_type": "OUT", "reference_type": "DAMAGE", "sign": Decimal("-1")},
    "RETURN_IN": {"movement_type": "IN", "reference_type": "RETURN", "sign": Decimal("1")},
}

CONVERSION_OUT_TYPE = "UNIT_CONVERSION_OUT"
CONVERSION_IN_TYPE = "UNIT_CONVERSION_IN"


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
    serial_number: str | None = Field(default=None, max_length=100)
    notes: str = Field(min_length=3, max_length=500)


class StockUnitConversionCreate(BaseModel):
    product_variant_id: int = Field(gt=0)
    warehouse_id: int = Field(gt=0)
    warehouse_zone_id: int | None = Field(default=None, gt=0)
    warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    from_measurement_unit_id: int = Field(gt=0)
    to_measurement_unit_id: int = Field(gt=0)
    from_quantity: Decimal = Field(gt=0)
    batch_lot_number: str | None = Field(default=None, max_length=100)
    expiry_date: date | None = None
    serial_number: str | None = Field(default=None, max_length=100)
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


async def require_stock_conversions_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, CONVERSION_READ_PERMISSIONS):
        return user
    _permission_error(request)


async def require_stock_conversions_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, CONVERSION_WRITE_PERMISSIONS):
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
    serial_number: str | None,
) -> dict | None:
    result = await session.execute(
        text(
            "SELECT * FROM stock WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id <=> :zone_id AND warehouse_zone_location_id <=> :location_id "
            "AND batch_lot_number <=> :batch_lot_number AND expiry_date <=> :expiry_date "
            "AND serial_number <=> :serial_number LIMIT 1"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "serial_number": serial_number,
        },
    )
    return _row(result.mappings().first())


async def _unit_balance_row(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    measurement_unit_id: int,
    batch_lot_number: str | None,
    expiry_date: date | None,
    serial_number: str | None,
) -> dict | None:
    result = await session.execute(
        text(
            "SELECT * FROM stock_unit_balances "
            "WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id <=> :zone_id AND warehouse_zone_location_id <=> :location_id "
            "AND measurement_unit_id = :measurement_unit_id "
            "AND batch_lot_number <=> :batch_lot_number AND expiry_date <=> :expiry_date "
            "AND serial_number <=> :serial_number LIMIT 1"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "measurement_unit_id": measurement_unit_id,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "serial_number": serial_number,
        },
    )
    return _row(result.mappings().first())


async def _apply_unit_balance_delta(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    measurement_unit_id: int,
    batch_lot_number: str | None,
    expiry_date: date | None,
    serial_number: str | None,
    delta_quantity: Decimal,
    *,
    allow_negative: bool,
) -> tuple[Decimal, Decimal]:
    balance = await _unit_balance_row(
        session,
        product_variant_id,
        warehouse_id,
        zone_id,
        location_id,
        measurement_unit_id,
        batch_lot_number,
        expiry_date,
        serial_number,
    )
    quantity_before = Decimal(str(balance["current_quantity"])) if balance else Decimal("0")
    quantity_after = quantity_before + Decimal(str(delta_quantity))
    if not allow_negative and quantity_after < 0:
        raise ValueError(
            f"Saldo insuficiente en la unidad seleccionada. Disponible: {quantity_before}, requerido: {abs(delta_quantity)}"
        )
    if balance:
        await session.execute(
            text("UPDATE stock_unit_balances SET current_quantity = :quantity_after WHERE id = :id"),
            {"quantity_after": quantity_after, "id": balance["id"]},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO stock_unit_balances (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
                "measurement_unit_id, batch_lot_number, expiry_date, serial_number, current_quantity) "
                "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :measurement_unit_id, "
                ":batch_lot_number, :expiry_date, :serial_number, :quantity_after)"
            ),
            {
                "product_variant_id": product_variant_id,
                "warehouse_id": warehouse_id,
                "zone_id": zone_id,
                "location_id": location_id,
                "measurement_unit_id": measurement_unit_id,
                "batch_lot_number": batch_lot_number,
                "expiry_date": expiry_date,
                "serial_number": serial_number,
                "quantity_after": quantity_after,
            },
        )
    return quantity_before, quantity_after


async def _apply_stock_delta(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    batch_lot_number: str | None,
    expiry_date: date | None,
    serial_number: str | None,
    signed_quantity: Decimal,
    movement_type: str,
) -> tuple[Decimal, Decimal]:
    stock = await _stock_row(session, product_variant_id, warehouse_id, zone_id, location_id, batch_lot_number, expiry_date, serial_number)
    quantity_before = Decimal(str(stock["current_quantity"])) if stock else Decimal("0")
    quantity_after = quantity_before + signed_quantity
    if quantity_after < 0:
        raise ValueError(f"Stock insuficiente en la ubicacion seleccionada. Disponible: {quantity_before}, requerido: {abs(signed_quantity)}")

    if stock:
        await session.execute(
            text(
                "UPDATE stock SET current_quantity = :quantity_after, last_movement_date = CURRENT_TIMESTAMP, "
                "last_movement_type = :movement_type WHERE id = :id"
            ),
            {"quantity_after": quantity_after, "movement_type": movement_type, "id": stock["id"]},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO stock (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, batch_lot_number, expiry_date, serial_number, "
                "current_quantity, reserved_quantity, last_movement_date, last_movement_type) "
                "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :batch_lot_number, :expiry_date, :serial_number, :quantity_after, 0, CURRENT_TIMESTAMP, :movement_type)"
            ),
            {
                "product_variant_id": product_variant_id,
                "warehouse_id": warehouse_id,
                "zone_id": zone_id,
                "location_id": location_id,
                "batch_lot_number": batch_lot_number,
                "expiry_date": expiry_date,
                "serial_number": serial_number,
                "quantity_after": quantity_after,
                "movement_type": movement_type,
            },
        )
    return quantity_before, quantity_after


async def _apply_manual_movement(session, data: StockMovementCreate, user_id: int) -> int:
    movement_config = MOVEMENT_TYPES.get(data.manual_movement_type)
    if not movement_config:
        raise ValueError("Tipo de movimiento no valido")

    zone_id, location_id = await _validate_location(session, data.warehouse_id, data.warehouse_zone_id, data.warehouse_zone_location_id)
    unit = await _validate_variant_unit(session, data.product_variant_id, data.measurement_unit_id)
    tracking = await validate_tracking_dimensions(session, data.product_variant_id, location_id, data.batch_lot_number, data.expiry_date, data.serial_number)
    validate_serial_quantity(tracking, data.quantity)
    batch_lot_number = tracking["batch_lot_number"]
    expiry_date = tracking["expiry_date"]
    serial_number = tracking["serial_number"]

    base_quantity = Decimal(str(data.quantity)) * unit["conversion_factor"]
    signed_quantity = base_quantity * movement_config["sign"]
    quantity_before, quantity_after = await _apply_stock_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        batch_lot_number,
        expiry_date,
        serial_number,
        signed_quantity,
        movement_config["movement_type"],
    )
    await _apply_unit_balance_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        unit["measurement_unit_id"],
        batch_lot_number,
        expiry_date,
        serial_number,
        Decimal(str(data.quantity)) * movement_config["sign"],
        allow_negative=True,
    )

    total_cost = Decimal(str(data.unit_cost or 0)) * data.quantity
    await session.execute(
        text(
            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
            "movement_type, reference_type, manual_movement_type, measurement_unit_id, movement_unit_quantity, quantity, quantity_before, quantity_after, unit_cost, total_cost, batch_lot_number, expiry_date, serial_number, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :movement_type, :reference_type, :manual_movement_type, :measurement_unit_id, "
            ":movement_unit_quantity, :quantity, :quantity_before, :quantity_after, :unit_cost, :total_cost, :batch_lot_number, :expiry_date, :serial_number, :notes, :user_id)"
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
            "serial_number": serial_number,
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


async def _insert_conversion_movement(
    session,
    *,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    movement_type: str,
    manual_movement_type: str,
    conversion_id: int,
    measurement_unit_id: int,
    movement_unit_quantity: Decimal,
    signed_base_quantity: Decimal,
    quantity_before: Decimal,
    quantity_after: Decimal,
    batch_lot_number: str | None,
    expiry_date: date | None,
    serial_number: str | None,
    notes: str,
    user_id: int,
) -> None:
    await session.execute(
        text(
            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
            "movement_type, reference_type, reference_document_id, manual_movement_type, measurement_unit_id, movement_unit_quantity, "
            "quantity, quantity_before, quantity_after, unit_cost, total_cost, batch_lot_number, expiry_date, serial_number, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :movement_type, 'UNIT_CONVERSION', :conversion_id, "
            ":manual_movement_type, :measurement_unit_id, :movement_unit_quantity, :quantity, :quantity_before, :quantity_after, "
            "NULL, 0, :batch_lot_number, :expiry_date, :serial_number, :notes, :user_id)"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "movement_type": movement_type,
            "conversion_id": conversion_id,
            "manual_movement_type": manual_movement_type,
            "measurement_unit_id": measurement_unit_id,
            "movement_unit_quantity": movement_unit_quantity,
            "quantity": signed_base_quantity,
            "quantity_before": quantity_before,
            "quantity_after": quantity_after,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "serial_number": serial_number,
            "notes": notes,
            "user_id": user_id,
        },
    )


async def _get_conversion(session, conversion_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT suc.*, pv.variant_name, pv.variant_sku, p.product_name, p.product_code, "
            "w.warehouse_name, wz.zone_name, wzl.location_name, "
            "from_mu.unit_name AS from_unit_name, from_mu.unit_symbol AS from_unit_symbol, "
            "to_mu.unit_name AS to_unit_name, to_mu.unit_symbol AS to_unit_symbol, "
            "u.username AS created_by_username "
            "FROM stock_unit_conversions suc "
            "JOIN product_variants pv ON pv.id = suc.product_variant_id "
            "JOIN products p ON p.id = pv.product_id "
            "JOIN warehouses w ON w.id = suc.warehouse_id "
            "JOIN measurement_units from_mu ON from_mu.id = suc.from_measurement_unit_id "
            "JOIN measurement_units to_mu ON to_mu.id = suc.to_measurement_unit_id "
            "LEFT JOIN warehouse_zones wz ON wz.id = suc.warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = suc.warehouse_zone_location_id "
            "LEFT JOIN users u ON u.id = suc.created_by_user_id "
            "WHERE suc.id = :id"
        ),
        {"id": conversion_id},
    )
    return _row(result.mappings().first())


async def _apply_unit_conversion(session, data: StockUnitConversionCreate, user_id: int) -> int:
    if int(data.from_measurement_unit_id) == int(data.to_measurement_unit_id):
        raise ValueError("La unidad origen y destino deben ser distintas")

    zone_id, location_id = await _validate_location(session, data.warehouse_id, data.warehouse_zone_id, data.warehouse_zone_location_id)
    from_unit = await _validate_variant_unit(session, data.product_variant_id, data.from_measurement_unit_id)
    to_unit = await _validate_variant_unit(session, data.product_variant_id, data.to_measurement_unit_id)
    tracking = await validate_tracking_dimensions(session, data.product_variant_id, location_id, data.batch_lot_number, data.expiry_date, data.serial_number)
    if tracking.get("has_serial_numbers"):
        raise ValueError("La conversion entre unidades no aplica a productos con control de seriales")

    batch_lot_number = tracking["batch_lot_number"]
    expiry_date = tracking["expiry_date"]
    serial_number = tracking["serial_number"]
    from_quantity = Decimal(str(data.from_quantity))
    base_quantity = from_quantity * from_unit["conversion_factor"]
    if to_unit["conversion_factor"] <= 0:
        raise ValueError("La unidad destino tiene un factor de conversion invalido")
    to_quantity = base_quantity / to_unit["conversion_factor"]

    await _apply_unit_balance_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        from_unit["measurement_unit_id"],
        batch_lot_number,
        expiry_date,
        serial_number,
        -from_quantity,
        allow_negative=False,
    )
    await _apply_unit_balance_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        to_unit["measurement_unit_id"],
        batch_lot_number,
        expiry_date,
        serial_number,
        to_quantity,
        allow_negative=False,
    )

    result = await session.execute(
        text(
            "INSERT INTO stock_unit_conversions (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
            "from_measurement_unit_id, to_measurement_unit_id, from_quantity, to_quantity, base_quantity, "
            "batch_lot_number, expiry_date, serial_number, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :from_measurement_unit_id, :to_measurement_unit_id, "
            ":from_quantity, :to_quantity, :base_quantity, :batch_lot_number, :expiry_date, :serial_number, :notes, :user_id)"
        ),
        {
            "product_variant_id": data.product_variant_id,
            "warehouse_id": data.warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "from_measurement_unit_id": from_unit["measurement_unit_id"],
            "to_measurement_unit_id": to_unit["measurement_unit_id"],
            "from_quantity": from_quantity,
            "to_quantity": to_quantity,
            "base_quantity": base_quantity,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
            "serial_number": serial_number,
            "notes": data.notes,
            "user_id": user_id,
        },
    )
    conversion_id = result.lastrowid
    if not conversion_id:
        conversion_id = int((await session.execute(text("SELECT LAST_INSERT_ID()"))).scalar_one())

    out_before, out_after = await _apply_stock_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        batch_lot_number,
        expiry_date,
        serial_number,
        -base_quantity,
        "OUT",
    )
    conversion_note = (
        f"Conversion #{conversion_id}: {from_quantity} {from_unit['unit_symbol'] or from_unit['unit_name']} "
        f"-> {to_quantity} {to_unit['unit_symbol'] or to_unit['unit_name']}. {data.notes}"
    )
    await _insert_conversion_movement(
        session,
        product_variant_id=data.product_variant_id,
        warehouse_id=data.warehouse_id,
        zone_id=zone_id,
        location_id=location_id,
        movement_type="OUT",
        manual_movement_type=CONVERSION_OUT_TYPE,
        conversion_id=conversion_id,
        measurement_unit_id=from_unit["measurement_unit_id"],
        movement_unit_quantity=from_quantity,
        signed_base_quantity=-base_quantity,
        quantity_before=out_before,
        quantity_after=out_after,
        batch_lot_number=batch_lot_number,
        expiry_date=expiry_date,
        serial_number=serial_number,
        notes=conversion_note,
        user_id=user_id,
    )

    in_before, in_after = await _apply_stock_delta(
        session,
        data.product_variant_id,
        data.warehouse_id,
        zone_id,
        location_id,
        batch_lot_number,
        expiry_date,
        serial_number,
        base_quantity,
        "IN",
    )
    await _insert_conversion_movement(
        session,
        product_variant_id=data.product_variant_id,
        warehouse_id=data.warehouse_id,
        zone_id=zone_id,
        location_id=location_id,
        movement_type="IN",
        manual_movement_type=CONVERSION_IN_TYPE,
        conversion_id=conversion_id,
        measurement_unit_id=to_unit["measurement_unit_id"],
        movement_unit_quantity=to_quantity,
        signed_base_quantity=base_quantity,
        quantity_before=in_before,
        quantity_after=in_after,
        batch_lot_number=batch_lot_number,
        expiry_date=expiry_date,
        serial_number=serial_number,
        notes=conversion_note,
        user_id=user_id,
    )
    return int(conversion_id)


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


@router.get("/unit-conversions", response_class=JSONResponse)
async def list_unit_conversions(
    request: Request,
    user: dict = Depends(require_stock_conversions_read),
    limit: int = Query(500, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT suc.*, pv.variant_name, pv.variant_sku, p.product_name, p.product_code, "
                    "w.warehouse_name, wz.zone_name, wzl.location_name, "
                    "from_mu.unit_name AS from_unit_name, from_mu.unit_symbol AS from_unit_symbol, "
                    "to_mu.unit_name AS to_unit_name, to_mu.unit_symbol AS to_unit_symbol, "
                    "u.username AS created_by_username "
                    "FROM stock_unit_conversions suc "
                    "JOIN product_variants pv ON pv.id = suc.product_variant_id "
                    "JOIN products p ON p.id = pv.product_id "
                    "JOIN warehouses w ON w.id = suc.warehouse_id "
                    "JOIN measurement_units from_mu ON from_mu.id = suc.from_measurement_unit_id "
                    "JOIN measurement_units to_mu ON to_mu.id = suc.to_measurement_unit_id "
                    "LEFT JOIN warehouse_zones wz ON wz.id = suc.warehouse_zone_id "
                    "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = suc.warehouse_zone_location_id "
                    "LEFT JOIN users u ON u.id = suc.created_by_user_id "
                    "ORDER BY suc.created_at DESC, suc.id DESC LIMIT :limit"
                ),
                {"limit": limit},
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar conversiones de stock", details=str(exc), request=request)


@router.post("/unit-conversions", response_class=JSONResponse)
async def create_unit_conversion(data: StockUnitConversionCreate, request: Request, user: dict = Depends(require_stock_conversions_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                conversion_id = await _apply_unit_conversion(session, data, user.get("user_id") or user.get("id"))
                await session.commit()
                return ResponseManager.success(data=await _get_conversion(session, conversion_id), message="Conversion de stock registrada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al registrar conversion de stock", details=str(exc), request=request)


@router.get("/reports/location-gaps", response_class=JSONResponse)
async def list_location_tracking_gaps(
    request: Request,
    user: dict = Depends(require_stock_movements_read),
    limit: int = Query(500, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT s.id AS stock_id, s.product_variant_id, p.product_code, p.product_name, "
                    "pv.variant_sku, pv.variant_name, w.warehouse_code, w.warehouse_name, "
                    "wz.zone_code, wz.zone_name, s.batch_lot_number, s.expiry_date, s.serial_number, "
                    "s.current_quantity, s.reserved_quantity, s.available_quantity, s.last_movement_date "
                    "FROM stock s "
                    "JOIN product_variants pv ON pv.id = s.product_variant_id "
                    "JOIN products p ON p.id = pv.product_id "
                    "JOIN warehouses w ON w.id = s.warehouse_id "
                    "LEFT JOIN warehouse_zones wz ON wz.id = s.warehouse_zone_id "
                    "WHERE p.has_location_tracking = TRUE "
                    "AND s.warehouse_zone_location_id IS NULL "
                    "AND s.current_quantity <> 0 "
                    "AND p.deleted_at IS NULL AND pv.deleted_at IS NULL AND w.deleted_at IS NULL "
                    "ORDER BY w.warehouse_name, p.product_name, pv.variant_name LIMIT :limit"
                ),
                {"limit": limit},
            )
            rows = [_row(row) for row in result.mappings().all()]
            return ResponseManager.success(data=rows, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar brechas de ubicacion", details=str(exc), request=request)


@router.get("/reports/expiring-lots", response_class=JSONResponse)
async def list_expiring_lots(
    request: Request,
    user: dict = Depends(require_stock_movements_read),
    days: int = Query(30, ge=0, le=365),
    include_missing: bool = Query(True),
    limit: int = Query(500, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            missing_clause = "OR (p.has_expiry_date = TRUE AND s.expiry_date IS NULL)" if include_missing else ""
            result = await session.execute(
                text(
                    "SELECT s.id AS stock_id, s.product_variant_id, p.product_code, p.product_name, "
                    "pv.variant_sku, pv.variant_name, w.warehouse_code, w.warehouse_name, "
                    "wz.zone_code, wz.zone_name, wzl.location_code, wzl.location_name, "
                    "s.batch_lot_number, s.expiry_date, s.serial_number, s.current_quantity, "
                    "s.reserved_quantity, s.available_quantity, "
                    "CASE WHEN s.expiry_date IS NULL THEN NULL ELSE DATEDIFF(s.expiry_date, CURRENT_DATE) END AS days_to_expiry, "
                    "CASE "
                    "WHEN s.expiry_date IS NULL THEN 'MISSING' "
                    "WHEN s.expiry_date < CURRENT_DATE THEN 'EXPIRED' "
                    "WHEN DATEDIFF(s.expiry_date, CURRENT_DATE) <= 7 THEN 'CRITICAL' "
                    "WHEN DATEDIFF(s.expiry_date, CURRENT_DATE) <= 30 THEN 'WARNING' "
                    "ELSE 'OK' END AS expiry_status "
                    "FROM stock s "
                    "JOIN product_variants pv ON pv.id = s.product_variant_id "
                    "JOIN products p ON p.id = pv.product_id "
                    "JOIN warehouses w ON w.id = s.warehouse_id "
                    "LEFT JOIN warehouse_zones wz ON wz.id = s.warehouse_zone_id "
                    "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = s.warehouse_zone_location_id "
                    "WHERE p.has_expiry_date = TRUE "
                    "AND s.current_quantity > 0 "
                    "AND (s.expiry_date <= DATE_ADD(CURRENT_DATE, INTERVAL :days DAY) "
                    f"{missing_clause}) "
                    "AND p.deleted_at IS NULL AND pv.deleted_at IS NULL AND w.deleted_at IS NULL "
                    "ORDER BY CASE WHEN s.expiry_date IS NULL THEN 0 ELSE 1 END, s.expiry_date ASC, p.product_name LIMIT :limit"
                ),
                {"days": days, "limit": limit},
            )
            rows = [_row(row) for row in result.mappings().all()]
            return ResponseManager.success(data=rows, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar lotes por vencer", details=str(exc), request=request)


@router.post("/reports/expiring-lots/alerts", response_class=JSONResponse)
async def emit_expiring_lot_alerts(
    request: Request,
    user: dict = Depends(require_stock_movements_write),
    days: int = Query(30, ge=0, le=365),
    include_missing: bool = Query(True),
    limit: int = Query(500, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await emit_expiring_lot_notifications(session, days=days, include_missing=include_missing, limit=limit)
            if result.get("skipped_reason") == "missing_inventory_alert_type":
                return ResponseManager.error(message="No existe el tipo de notificacion INVENTORY_ALERT activo", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            await session.commit()
            message = "No hay usuarios destinatarios para alertas de inventario" if result.get("skipped_reason") == "no_recipients" else "Alertas de vencimiento emitidas"
            return ResponseManager.success(data=result, message=message, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al emitir alertas de vencimiento", details=str(exc), request=request)


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
