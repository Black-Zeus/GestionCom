"""
API transaccional de transferencias, recepcion y ubicacion de stock.
"""
from datetime import date, datetime
from decimal import Decimal
import json

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Stock Transfers"])

READ_PERMISSIONS = ["TRANSFERS_ACCESS", "STOCK_TRANSFER", "TRANSFER_RECEPTIONS_MANAGE"]
WRITE_PERMISSIONS = ["STOCK_TRANSFER", "TRANSFER_RECEPTIONS_MANAGE"]


class TransferCreate(BaseModel):
    source_warehouse_id: int = Field(gt=0)
    target_warehouse_id: int = Field(gt=0)
    notes: str | None = None


class TransferUpdate(BaseModel):
    source_warehouse_id: int = Field(gt=0)
    target_warehouse_id: int = Field(gt=0)
    notes: str | None = None


class TransferItemCreate(BaseModel):
    product_variant_id: int = Field(gt=0)
    quantity: Decimal = Field(gt=0)
    measurement_unit_id: int | None = Field(default=None, gt=0)
    source_warehouse_zone_id: int | None = Field(default=None, gt=0)
    source_warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    unit_cost: Decimal | None = None
    notes: str | None = None


class ReceiveTransferPayload(BaseModel):
    items: list[dict] = Field(default_factory=list)
    notes: str | None = None


class ReceptionLineDecision(BaseModel):
    reception_status: str = Field(min_length=1, max_length=20)
    received_quantity: Decimal = Field(ge=0)
    reception_notes: str | None = None


class PutawayPayload(BaseModel):
    stock_transfer_item_id: int = Field(gt=0)
    warehouse_zone_id: int | None = Field(default=None, gt=0)
    warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    quantity: Decimal = Field(gt=0)
    notes: str | None = None


class NotesPayload(BaseModel):
    notes: str | None = None


RECEPTION_STATUSES = {"ACCEPTED", "OBSERVED"}


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


async def require_transfer_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, READ_PERMISSIONS):
        return user
    _permission_error(request)


async def require_transfer_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, WRITE_PERMISSIONS):
        return user
    _permission_error(request)


async def _next_transfer_code(session) -> str:
    result = await session.execute(text("SELECT transfer_code FROM stock_transfers WHERE transfer_code LIKE 'TRF_%' ORDER BY transfer_code DESC LIMIT 1"))
    current = result.scalar_one_or_none()
    next_number = 1
    if current:
        try:
            next_number = int(str(current).split("_")[-1]) + 1
        except ValueError:
            next_number = 1
    return f"TRF_{next_number:04d}"


async def _validate_warehouse(session, warehouse_id: int, label: str = "Bodega") -> None:
    result = await session.execute(text("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL"), {"id": warehouse_id})
    if not result.scalar_one_or_none():
        raise ValueError(f"{label} no encontrada")


async def _validate_location(session, warehouse_id: int, zone_id: int | None, location_id: int | None) -> tuple[int | None, int | None]:
    await _validate_warehouse(session, warehouse_id)
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
        row = result.mappings().first()
        if not row:
            raise ValueError("Ubicacion interna no pertenece a la bodega")
        if zone_id and int(row["warehouse_zone_id"]) != int(zone_id):
            raise ValueError("La ubicacion interna no pertenece a la zona indicada")
        zone_id = int(row["warehouse_zone_id"])
    if zone_id:
        result = await session.execute(
            text("SELECT id FROM warehouse_zones WHERE id = :zone_id AND warehouse_id = :warehouse_id AND deleted_at IS NULL"),
            {"zone_id": zone_id, "warehouse_id": warehouse_id},
        )
        if not result.scalar_one_or_none():
            raise ValueError("Zona no pertenece a la bodega")
    return zone_id, location_id


async def _pending_location(session, warehouse_id: int) -> tuple[int, int]:
    result = await session.execute(
        text(
            "SELECT wz.id AS zone_id, wzl.id AS location_id "
            "FROM warehouse_zones wz "
            "JOIN warehouse_zone_locations wzl ON wzl.warehouse_zone_id = wz.id "
            "JOIN warehouses w ON w.id = wz.warehouse_id "
            "WHERE wz.warehouse_id = :warehouse_id "
            "AND wz.zone_code = CONCAT('REC_', REPLACE(w.warehouse_code, 'BOD_', '')) "
            "AND wzl.location_code = CONCAT('PEND_', REPLACE(w.warehouse_code, 'BOD_', '')) "
            "AND wz.deleted_at IS NULL AND wzl.deleted_at IS NULL LIMIT 1"
        ),
        {"warehouse_id": warehouse_id},
    )
    row = result.mappings().first()
    if not row:
        raise ValueError("La bodega destino no tiene ubicacion de recepcion pendiente")
    return int(row["zone_id"]), int(row["location_id"])


async def _variant_unit_id(session, product_variant_id: int, measurement_unit_id: int | None) -> int:
    result = await session.execute(
        text(
            "SELECT pv.id, p.base_measurement_unit_id "
            "FROM product_variants pv JOIN products p ON p.id = pv.product_id "
            "WHERE pv.id = :id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
        ),
        {"id": product_variant_id},
    )
    row = result.mappings().first()
    if not row:
        raise ValueError("SKU / Variacion no encontrada")
    unit_id = measurement_unit_id or row["base_measurement_unit_id"]
    result = await session.execute(text("SELECT id FROM measurement_units WHERE id = :id AND deleted_at IS NULL"), {"id": unit_id})
    if not result.scalar_one_or_none():
        raise ValueError("Unidad de medida no encontrada")
    return int(unit_id)


async def _get_transfer(session, transfer_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT st.*, sw.warehouse_code AS source_warehouse_code, sw.warehouse_name AS source_warehouse_name, "
            "tw.warehouse_code AS target_warehouse_code, tw.warehouse_name AS target_warehouse_name, "
            "creator.username AS created_by_username, shipper.username AS shipped_by_username, "
            "receiver.username AS received_by_username, locator.username AS located_by_username, "
            "COUNT(sti.id) AS item_count, COALESCE(SUM(sti.quantity), 0) AS total_quantity, "
            "COALESCE(SUM(COALESCE(sti.received_quantity, 0)), 0) AS total_received_quantity, "
            "COALESCE(SUM(sti.putaway_quantity), 0) AS total_putaway_quantity "
            "FROM stock_transfers st "
            "JOIN warehouses sw ON sw.id = st.source_warehouse_id "
            "JOIN warehouses tw ON tw.id = st.target_warehouse_id "
            "LEFT JOIN users creator ON creator.id = st.created_by_user_id "
            "LEFT JOIN users shipper ON shipper.id = st.shipped_by_user_id "
            "LEFT JOIN users receiver ON receiver.id = st.received_by_user_id "
            "LEFT JOIN users locator ON locator.id = st.located_by_user_id "
            "LEFT JOIN stock_transfer_items sti ON sti.stock_transfer_id = st.id "
            "WHERE st.id = :id AND st.deleted_at IS NULL GROUP BY st.id"
        ),
        {"id": transfer_id},
    )
    return _row(result.mappings().first())


async def _get_transfer_by_key(session, transfer_key: str) -> dict | None:
    key = str(transfer_key).strip()
    if key.isdigit():
        return await _get_transfer(session, int(key))
    result = await session.execute(
        text("SELECT id FROM stock_transfers WHERE transfer_code = :code AND deleted_at IS NULL LIMIT 1"),
        {"code": key},
    )
    transfer_id = result.scalar_one_or_none()
    if not transfer_id:
        return None
    return await _get_transfer(session, int(transfer_id))


async def _items(session, transfer_id: int) -> list[dict]:
    result = await session.execute(
        text(
            "SELECT sti.*, pv.variant_name, p.product_name, mu.unit_name, mu.unit_symbol, "
            "sz.zone_name AS source_zone_name, sl.location_name AS source_location_name, "
            "pz.zone_name AS pending_zone_name, pl.location_name AS pending_location_name "
            "FROM stock_transfer_items sti "
            "JOIN product_variants pv ON pv.id = sti.product_variant_id "
            "JOIN products p ON p.id = pv.product_id "
            "JOIN measurement_units mu ON mu.id = sti.measurement_unit_id "
            "LEFT JOIN warehouse_zones sz ON sz.id = sti.source_warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations sl ON sl.id = sti.source_warehouse_zone_location_id "
            "LEFT JOIN warehouse_zones pz ON pz.id = sti.target_pending_warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations pl ON pl.id = sti.target_pending_warehouse_zone_location_id "
            "WHERE sti.stock_transfer_id = :id ORDER BY p.product_name, pv.variant_name, sti.id"
        ),
        {"id": transfer_id},
    )
    return [_row(row) for row in result.mappings().all()]


async def _stock_row(session, product_variant_id: int, warehouse_id: int, zone_id: int | None, location_id: int | None) -> dict | None:
    result = await session.execute(
        text(
            "SELECT * FROM stock WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id <=> :zone_id AND warehouse_zone_location_id <=> :location_id LIMIT 1"
        ),
        {"product_variant_id": product_variant_id, "warehouse_id": warehouse_id, "zone_id": zone_id, "location_id": location_id},
    )
    return _row(result.mappings().first())


async def _validate_available_stock(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    quantity: Decimal,
) -> None:
    stock = await _stock_row(session, product_variant_id, warehouse_id, zone_id, location_id)
    available = Decimal(str(stock["current_quantity"])) if stock else Decimal("0")
    required = Decimal(str(quantity))
    if available < required:
        raise ValueError(f"Stock insuficiente en la ubicacion origen. Disponible: {available}, requerido: {required}")


async def _apply_stock_delta(
    session,
    product_variant_id: int,
    warehouse_id: int,
    zone_id: int | None,
    location_id: int | None,
    delta: Decimal,
    movement_type: str,
    reference_type: str,
    user_id: int,
    notes: str,
    unit_cost: Decimal | None = None,
):
    stock = await _stock_row(session, product_variant_id, warehouse_id, zone_id, location_id)
    before = Decimal(str(stock["current_quantity"])) if stock else Decimal("0")
    after = before + Decimal(str(delta))
    if after < 0:
        required = abs(Decimal(str(delta)))
        raise ValueError(f"Stock insuficiente para despachar desde la ubicacion indicada. Disponible: {before}, requerido: {required}")
    if stock:
        await session.execute(
            text("UPDATE stock SET current_quantity = :qty, last_movement_date = CURRENT_TIMESTAMP, last_movement_type = :movement_type WHERE id = :id"),
            {"qty": after, "movement_type": movement_type, "id": stock["id"]},
        )
    else:
        await session.execute(
            text(
                "INSERT INTO stock (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, current_quantity, reserved_quantity, last_movement_date, last_movement_type) "
                "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :qty, 0, CURRENT_TIMESTAMP, :movement_type)"
            ),
            {"product_variant_id": product_variant_id, "warehouse_id": warehouse_id, "zone_id": zone_id, "location_id": location_id, "qty": after, "movement_type": movement_type},
        )
    await session.execute(
        text(
            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, movement_type, reference_type, quantity, quantity_before, quantity_after, unit_cost, total_cost, notes, created_by_user_id) "
            "VALUES (:product_variant_id, :warehouse_id, :zone_id, :location_id, :movement_type, :reference_type, :delta, :before, :after, :unit_cost, :total_cost, :notes, :user_id)"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "zone_id": zone_id,
            "location_id": location_id,
            "movement_type": movement_type,
            "reference_type": reference_type,
            "delta": delta,
            "before": before,
            "after": after,
            "unit_cost": unit_cost,
            "total_cost": Decimal(str(unit_cost or 0)) * abs(Decimal(str(delta))),
            "notes": notes,
            "user_id": user_id,
        },
    )


@router.get("/transfers", response_class=JSONResponse)
async def list_transfers(request: Request, user: dict = Depends(require_transfer_read), status: str | None = Query(None), limit: int = Query(500, ge=1, le=1000)):
    try:
        conditions = ["st.deleted_at IS NULL"]
        params = {"limit": limit}
        if status:
            conditions.append("st.status = :status")
            params["status"] = status
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT st.*, sw.warehouse_name AS source_warehouse_name, tw.warehouse_name AS target_warehouse_name, "
                    "COUNT(sti.id) AS item_count, COALESCE(SUM(sti.quantity), 0) AS total_quantity, "
                    "COALESCE(SUM(COALESCE(sti.received_quantity, 0)), 0) AS total_received_quantity, "
                    "COALESCE(SUM(sti.putaway_quantity), 0) AS total_putaway_quantity "
                    "FROM stock_transfers st "
                    "JOIN warehouses sw ON sw.id = st.source_warehouse_id "
                    "JOIN warehouses tw ON tw.id = st.target_warehouse_id "
                    "LEFT JOIN stock_transfer_items sti ON sti.stock_transfer_id = st.id "
                    f"WHERE {' AND '.join(conditions)} GROUP BY st.id ORDER BY st.created_at DESC LIMIT :limit"
                ),
                params,
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar transferencias", details=str(exc), request=request)


@router.get("/available-stock", response_class=JSONResponse)
async def get_available_stock(
    request: Request,
    product_variant_id: int = Query(..., gt=0),
    warehouse_id: int = Query(..., gt=0),
    warehouse_zone_id: int | None = Query(None, gt=0),
    warehouse_zone_location_id: int | None = Query(None, gt=0),
    user: dict = Depends(require_transfer_read),
):
    try:
        async with db_manager.get_async_session() as session:
            stock = await _stock_row(session, product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id)
            current_quantity = Decimal(str(stock["current_quantity"])) if stock else Decimal("0")
            reserved_quantity = Decimal(str(stock["reserved_quantity"])) if stock else Decimal("0")
            available_quantity = current_quantity - reserved_quantity
            return ResponseManager.success(
                data={
                    "product_variant_id": product_variant_id,
                    "warehouse_id": warehouse_id,
                    "warehouse_zone_id": warehouse_zone_id,
                    "warehouse_zone_location_id": warehouse_zone_location_id,
                    "current_quantity": _json_value(current_quantity),
                    "reserved_quantity": _json_value(reserved_quantity),
                    "available_quantity": _json_value(available_quantity),
                },
                request=request,
            )
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al consultar stock disponible", details=str(exc), request=request)


@router.post("/transfers", response_class=JSONResponse)
async def create_transfer(data: TransferCreate, request: Request, user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                if data.source_warehouse_id == data.target_warehouse_id:
                    raise ValueError("Origen y destino deben ser bodegas distintas")
                await _validate_warehouse(session, data.source_warehouse_id, "Bodega origen")
                await _validate_warehouse(session, data.target_warehouse_id, "Bodega destino")
                await _pending_location(session, data.target_warehouse_id)
                await session.execute(
                    text(
                        "INSERT INTO stock_transfers (transfer_code, source_warehouse_id, target_warehouse_id, created_by_user_id, notes) "
                        "VALUES (:code, :source_id, :target_id, :user_id, :notes)"
                    ),
                    {"code": await _next_transfer_code(session), "source_id": data.source_warehouse_id, "target_id": data.target_warehouse_id, "user_id": user.get("user_id") or user.get("id"), "notes": data.notes},
                )
                result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                transfer_id = int(result.scalar_one())
                await session.commit()
                transfer = await _get_transfer(session, transfer_id)
                return ResponseManager.success(data=transfer, message="Transferencia creada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al crear transferencia", details=str(exc), request=request)


@router.get("/transfers/{transfer_key}", response_class=JSONResponse)
async def get_transfer(request: Request, transfer_key: str = Path(..., min_length=1), user: dict = Depends(require_transfer_read)):
    try:
        async with db_manager.get_async_session() as session:
            transfer = await _get_transfer_by_key(session, transfer_key)
            if not transfer:
                return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            transfer["items"] = await _items(session, int(transfer["id"]))
            putaways = await session.execute(
                text(
                    "SELECT sp.*, wz.zone_name, wzl.location_name FROM stock_transfer_putaways sp "
                    "LEFT JOIN warehouse_zones wz ON wz.id = sp.warehouse_zone_id "
                    "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = sp.warehouse_zone_location_id "
                    "JOIN stock_transfer_items sti ON sti.id = sp.stock_transfer_item_id "
                    "WHERE sti.stock_transfer_id = :id ORDER BY sp.located_at DESC"
                ),
                {"id": transfer["id"]},
            )
            transfer["putaways"] = [_row(row) for row in putaways.mappings().all()]
            return ResponseManager.success(data=transfer, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al obtener transferencia", details=str(exc), request=request)


@router.put("/transfers/{transfer_id}", response_class=JSONResponse)
async def update_transfer(data: TransferUpdate, request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "DRAFT":
                    raise ValueError("Solo se puede editar una transferencia en borrador")
                if data.source_warehouse_id == data.target_warehouse_id:
                    raise ValueError("Origen y destino deben ser bodegas distintas")
                item_count = int(transfer.get("item_count") or 0)
                route_changed = int(transfer["source_warehouse_id"]) != data.source_warehouse_id or int(transfer["target_warehouse_id"]) != data.target_warehouse_id
                if item_count > 0 and route_changed:
                    raise ValueError("No se puede cambiar origen o destino si la transferencia ya tiene items")
                await _validate_warehouse(session, data.source_warehouse_id, "Bodega origen")
                await _validate_warehouse(session, data.target_warehouse_id, "Bodega destino")
                await _pending_location(session, data.target_warehouse_id)
                await session.execute(
                    text(
                        "UPDATE stock_transfers "
                        "SET source_warehouse_id = :source_id, target_warehouse_id = :target_id, notes = :notes "
                        "WHERE id = :id"
                    ),
                    {"source_id": data.source_warehouse_id, "target_id": data.target_warehouse_id, "notes": data.notes, "id": transfer_id},
                )
                await session.commit()
                return ResponseManager.success(data=await _get_transfer(session, transfer_id), message="Transferencia actualizada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al actualizar transferencia", details=str(exc), request=request)


@router.delete("/transfers/{transfer_id}", response_class=JSONResponse)
async def delete_transfer(request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] not in {"DRAFT", "CANCELLED"}:
                    raise ValueError("Solo se puede eliminar una transferencia en borrador o cancelada")
                await session.execute(text("UPDATE stock_transfers SET deleted_at = CURRENT_TIMESTAMP WHERE id = :id"), {"id": transfer_id})
                await session.commit()
                return ResponseManager.success(data={"id": transfer_id}, message="Transferencia eliminada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al eliminar transferencia", details=str(exc), request=request)


@router.post("/transfers/{transfer_id}/items", response_class=JSONResponse)
async def add_transfer_item(data: TransferItemCreate, request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "DRAFT":
                    raise ValueError("Solo se pueden agregar items en borrador")
                zone_id, location_id = await _validate_location(session, int(transfer["source_warehouse_id"]), data.source_warehouse_zone_id, data.source_warehouse_zone_location_id)
                unit_id = await _variant_unit_id(session, data.product_variant_id, data.measurement_unit_id)
                await _validate_available_stock(session, data.product_variant_id, int(transfer["source_warehouse_id"]), zone_id, location_id, data.quantity)
                await session.execute(
                    text(
                        "INSERT INTO stock_transfer_items (stock_transfer_id, product_variant_id, measurement_unit_id, quantity, source_warehouse_zone_id, source_warehouse_zone_location_id, unit_cost, notes) "
                        "VALUES (:transfer_id, :variant_id, :unit_id, :quantity, :zone_id, :location_id, :unit_cost, :notes)"
                    ),
                    {"transfer_id": transfer_id, "variant_id": data.product_variant_id, "unit_id": unit_id, "quantity": data.quantity, "zone_id": zone_id, "location_id": location_id, "unit_cost": data.unit_cost, "notes": data.notes},
                )
                await session.commit()
                transfer = await _get_transfer(session, transfer_id)
                transfer["items"] = await _items(session, transfer_id)
                return ResponseManager.success(data=transfer, message="Item agregado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al agregar item", details=str(exc), request=request)


@router.delete("/transfers/{transfer_id}/items/{item_id}", response_class=JSONResponse)
async def delete_transfer_item(request: Request, transfer_id: int = Path(..., gt=0), item_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "DRAFT":
                    raise ValueError("Solo se pueden eliminar items antes de despachar")
                item_result = await session.execute(
                    text("SELECT id FROM stock_transfer_items WHERE id = :item_id AND stock_transfer_id = :transfer_id LIMIT 1"),
                    {"item_id": item_id, "transfer_id": transfer_id},
                )
                if not item_result.scalar_one_or_none():
                    return ResponseManager.error(message="Item de transferencia no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                await session.execute(text("DELETE FROM stock_transfer_items WHERE id = :item_id"), {"item_id": item_id})
                await session.commit()
                transfer = await _get_transfer(session, transfer_id)
                transfer["items"] = await _items(session, transfer_id)
                return ResponseManager.success(data=transfer, message="Item eliminado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al eliminar item", details=str(exc), request=request)


@router.put("/transfers/{transfer_id}/items/{item_id}", response_class=JSONResponse)
async def update_transfer_item(data: TransferItemCreate, request: Request, transfer_id: int = Path(..., gt=0), item_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "DRAFT":
                    raise ValueError("Solo se pueden editar items antes de despachar")
                item_result = await session.execute(
                    text("SELECT id FROM stock_transfer_items WHERE id = :item_id AND stock_transfer_id = :transfer_id LIMIT 1"),
                    {"item_id": item_id, "transfer_id": transfer_id},
                )
                if not item_result.scalar_one_or_none():
                    return ResponseManager.error(message="Item de transferencia no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                zone_id, location_id = await _validate_location(session, int(transfer["source_warehouse_id"]), data.source_warehouse_zone_id, data.source_warehouse_zone_location_id)
                unit_id = await _variant_unit_id(session, data.product_variant_id, data.measurement_unit_id)
                await _validate_available_stock(session, data.product_variant_id, int(transfer["source_warehouse_id"]), zone_id, location_id, data.quantity)
                await session.execute(
                    text(
                        "UPDATE stock_transfer_items "
                        "SET product_variant_id = :variant_id, measurement_unit_id = :unit_id, quantity = :quantity, "
                        "source_warehouse_zone_id = :zone_id, source_warehouse_zone_location_id = :location_id, "
                        "unit_cost = :unit_cost, notes = :notes "
                        "WHERE id = :item_id"
                    ),
                    {"variant_id": data.product_variant_id, "unit_id": unit_id, "quantity": data.quantity, "zone_id": zone_id, "location_id": location_id, "unit_cost": data.unit_cost, "notes": data.notes, "item_id": item_id},
                )
                await session.commit()
                transfer = await _get_transfer(session, transfer_id)
                transfer["items"] = await _items(session, transfer_id)
                return ResponseManager.success(data=transfer, message="Item actualizado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al actualizar item", details=str(exc), request=request)


@router.put("/transfers/{transfer_id}/items/{item_id}/reception", response_class=JSONResponse)
async def save_reception_line_decision(data: ReceptionLineDecision, request: Request, transfer_id: int = Path(..., gt=0), item_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "SHIPPED":
                    raise ValueError("Solo se pueden confirmar lineas de una transferencia despachada")
                item_result = await session.execute(
                    text("SELECT id, quantity FROM stock_transfer_items WHERE id = :item_id AND stock_transfer_id = :transfer_id LIMIT 1"),
                    {"item_id": item_id, "transfer_id": transfer_id},
                )
                item = item_result.mappings().first()
                if not item:
                    return ResponseManager.error(message="Item de transferencia no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                reception_status = data.reception_status.upper()
                if reception_status not in RECEPTION_STATUSES:
                    raise ValueError("La linea debe estar marcada como aceptada u observada")
                if data.received_quantity > Decimal(str(item["quantity"])):
                    raise ValueError("La cantidad recibida no puede superar la cantidad despachada")
                reception_notes = (data.reception_notes or "").strip() or None
                if reception_status == "OBSERVED" and not reception_notes:
                    raise ValueError("Las lineas observadas deben incluir una observacion")
                await session.execute(
                    text(
                        "UPDATE stock_transfer_items "
                        "SET reception_status = :reception_status, received_quantity = :received_quantity, reception_notes = :reception_notes "
                        "WHERE id = :item_id"
                    ),
                    {
                        "reception_status": reception_status,
                        "received_quantity": data.received_quantity,
                        "reception_notes": reception_notes,
                        "item_id": item_id,
                    },
                )
                await session.commit()
                transfer = await _get_transfer(session, transfer_id)
                transfer["items"] = await _items(session, transfer_id)
                return ResponseManager.success(data=transfer, message="Linea de recepcion guardada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al guardar linea de recepcion", details=str(exc), request=request)


@router.post("/transfers/{transfer_id}/ship", response_class=JSONResponse)
async def ship_transfer(request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "DRAFT":
                    raise ValueError("Solo se puede despachar una transferencia en borrador")
                items = await _items(session, transfer_id)
                if not items:
                    raise ValueError("La transferencia no tiene items")
                user_id = user.get("user_id") or user.get("id")
                for item in items:
                    await _apply_stock_delta(
                        session,
                        item["product_variant_id"],
                        transfer["source_warehouse_id"],
                        item.get("source_warehouse_zone_id"),
                        item.get("source_warehouse_zone_location_id"),
                        -Decimal(str(item["quantity"])),
                        "TRANSFER",
                        "TRANSFER",
                        user_id,
                        f"Despacho transferencia {transfer['transfer_code']}",
                        item.get("unit_cost"),
                    )
                await session.execute(
                    text("UPDATE stock_transfers SET status = 'SHIPPED', shipped_at = CURRENT_TIMESTAMP, shipped_by_user_id = :user_id WHERE id = :id"),
                    {"user_id": user_id, "id": transfer_id},
                )
                await session.commit()
                return ResponseManager.success(data=await _get_transfer(session, transfer_id), message="Transferencia despachada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al despachar transferencia", details=str(exc), request=request)


@router.post("/transfers/{transfer_id}/receive", response_class=JSONResponse)
async def receive_transfer(data: ReceiveTransferPayload, request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "SHIPPED":
                    raise ValueError("Solo se puede recibir una transferencia despachada")
                target_zone_id, target_location_id = await _pending_location(session, int(transfer["target_warehouse_id"]))
                item_overrides = {int(item.get("id")): item for item in data.items if item.get("id")}
                user_id = user.get("user_id") or user.get("id")
                for item in await _items(session, transfer_id):
                    override = item_overrides.get(int(item["id"]))
                    if not override:
                        raise ValueError("Debes aceptar u observar cada linea antes de recibir la transferencia")
                    reception_status = str(override.get("reception_status") or "").upper()
                    if reception_status not in RECEPTION_STATUSES:
                        raise ValueError("Cada linea debe estar marcada como aceptada u observada")
                    received_quantity = Decimal(str(override.get("received_quantity", item["quantity"])))
                    if received_quantity < 0:
                        raise ValueError("La cantidad recibida no puede ser negativa")
                    if received_quantity > Decimal(str(item["quantity"])):
                        raise ValueError("La cantidad recibida no puede superar la cantidad despachada")
                    if reception_status == "OBSERVED" and not str(override.get("reception_notes") or "").strip():
                        raise ValueError("Las lineas observadas deben incluir una observacion")
                    await session.execute(
                        text(
                            "UPDATE stock_transfer_items "
                            "SET received_quantity = :received, reception_status = :reception_status, reception_notes = :reception_notes, "
                            "target_pending_warehouse_zone_id = :zone_id, target_pending_warehouse_zone_location_id = :location_id "
                            "WHERE id = :id"
                        ),
                        {
                            "received": received_quantity,
                            "reception_status": reception_status,
                            "reception_notes": str(override.get("reception_notes") or "").strip() or None,
                            "zone_id": target_zone_id,
                            "location_id": target_location_id,
                            "id": item["id"],
                        },
                    )
                    if received_quantity > 0:
                        await _apply_stock_delta(
                            session,
                            item["product_variant_id"],
                            transfer["target_warehouse_id"],
                            target_zone_id,
                            target_location_id,
                            received_quantity,
                            "TRANSFER",
                            "TRANSFER",
                            user_id,
                            f"Recepcion transferencia {transfer['transfer_code']}",
                            item.get("unit_cost"),
                        )
                await session.execute(
                    text("UPDATE stock_transfers SET status = 'RECEIVED', received_at = CURRENT_TIMESTAMP, received_by_user_id = :user_id, notes = COALESCE(:notes, notes) WHERE id = :id"),
                    {"user_id": user_id, "notes": data.notes, "id": transfer_id},
                )
                await session.commit()
                return ResponseManager.success(data=await _get_transfer(session, transfer_id), message="Transferencia recibida", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al recibir transferencia", details=str(exc), request=request)


@router.post("/transfers/{transfer_id}/putaway", response_class=JSONResponse)
async def putaway_transfer(data: PutawayPayload, request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] != "RECEIVED":
                    raise ValueError("Solo se puede ubicar stock recibido")
                items = {int(item["id"]): item for item in await _items(session, transfer_id)}
                item = items.get(data.stock_transfer_item_id)
                if not item:
                    raise ValueError("Item de transferencia no encontrado")
                pending = Decimal(str(item.get("pending_putaway_quantity") or 0))
                if data.quantity > pending:
                    raise ValueError("La cantidad a ubicar supera lo pendiente")
                zone_id, location_id = await _validate_location(session, int(transfer["target_warehouse_id"]), data.warehouse_zone_id, data.warehouse_zone_location_id)
                if zone_id == item.get("target_pending_warehouse_zone_id") and location_id == item.get("target_pending_warehouse_zone_location_id"):
                    raise ValueError("Selecciona una ubicacion final distinta a Recepcion")
                user_id = user.get("user_id") or user.get("id")
                await _apply_stock_delta(
                    session,
                    item["product_variant_id"],
                    transfer["target_warehouse_id"],
                    item.get("target_pending_warehouse_zone_id"),
                    item.get("target_pending_warehouse_zone_location_id"),
                    -Decimal(str(data.quantity)),
                    "TRANSFER",
                    "TRANSFER",
                    user_id,
                    f"Salida ubicacion pendiente {transfer['transfer_code']}",
                    item.get("unit_cost"),
                )
                await _apply_stock_delta(
                    session,
                    item["product_variant_id"],
                    transfer["target_warehouse_id"],
                    zone_id,
                    location_id,
                    Decimal(str(data.quantity)),
                    "TRANSFER",
                    "TRANSFER",
                    user_id,
                    f"Ubicacion final transferencia {transfer['transfer_code']}",
                    item.get("unit_cost"),
                )
                await session.execute(
                    text("INSERT INTO stock_transfer_putaways (stock_transfer_item_id, warehouse_zone_id, warehouse_zone_location_id, quantity, located_by_user_id, notes) VALUES (:item_id, :zone_id, :location_id, :quantity, :user_id, :notes)"),
                    {"item_id": item["id"], "zone_id": zone_id, "location_id": location_id, "quantity": data.quantity, "user_id": user_id, "notes": data.notes},
                )
                await session.execute(text("UPDATE stock_transfer_items SET putaway_quantity = putaway_quantity + :quantity WHERE id = :id"), {"quantity": data.quantity, "id": item["id"]})
                refreshed = await _items(session, transfer_id)
                if refreshed and all(Decimal(str(row.get("pending_putaway_quantity") or 0)) == 0 for row in refreshed):
                    await session.execute(
                        text("UPDATE stock_transfers SET status = 'LOCATED', located_at = CURRENT_TIMESTAMP, located_by_user_id = :user_id WHERE id = :id"),
                        {"user_id": user_id, "id": transfer_id},
                    )
                await session.commit()
                result = await _get_transfer(session, transfer_id)
                result["items"] = await _items(session, transfer_id)
                return ResponseManager.success(data=result, message="Stock ubicado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al ubicar stock", details=str(exc), request=request)


@router.post("/transfers/{transfer_id}/cancel", response_class=JSONResponse)
async def cancel_transfer(data: NotesPayload, request: Request, transfer_id: int = Path(..., gt=0), user: dict = Depends(require_transfer_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                transfer = await _get_transfer(session, transfer_id)
                if not transfer:
                    return ResponseManager.error(message="Transferencia no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if transfer["status"] not in {"DRAFT"}:
                    raise ValueError("Solo se puede cancelar una transferencia en borrador")
                await session.execute(text("UPDATE stock_transfers SET status = 'CANCELLED', notes = COALESCE(:notes, notes) WHERE id = :id"), {"notes": data.notes, "id": transfer_id})
                await session.commit()
                return ResponseManager.success(data=await _get_transfer(session, transfer_id), message="Transferencia cancelada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al cancelar transferencia", details=str(exc), request=request)
