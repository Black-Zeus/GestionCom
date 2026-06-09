"""
API transaccional para inventario fisico.
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
from utils.inventory_tracking import validate_tracking_dimensions
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Physical Inventory"])


READ_PERMISSIONS = ["PHYSICAL_INVENTORY_ACCESS", "PHYSICAL_COUNTS_VIEW", "PHYSICAL_COUNTS_MANAGE"]
WRITE_PERMISSIONS = ["PHYSICAL_COUNTS_MANAGE"]


class PhysicalCountCreate(BaseModel):
    warehouse_id: int = Field(gt=0)
    warehouse_zone_id: int | None = Field(default=None, gt=0)
    warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    count_type: str = "PARTIAL"
    scope_description: str | None = None
    scheduled_date: date | None = None
    freeze_stock: bool = False
    notes: str | None = None


class PhysicalCountItemCreate(BaseModel):
    product_variant_id: int = Field(gt=0)
    warehouse_zone_id: int | None = Field(default=None, gt=0)
    warehouse_zone_location_id: int | None = Field(default=None, gt=0)
    measurement_unit_id: int | None = Field(default=None, gt=0)
    system_quantity: Decimal | None = None
    counted_quantity: Decimal | None = None
    unit_cost: Decimal | None = None
    batch_lot_number: str | None = None
    expiry_date: date | None = None
    serial_number: str | None = None
    notes: str | None = None


class PhysicalCountItemUpdate(BaseModel):
    counted_quantity: Decimal = Field(ge=0)
    notes: str | None = None


class PhysicalCountNotes(BaseModel):
    notes: str | None = None


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


async def require_physical_inventory_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, READ_PERMISSIONS):
        return user
    _permission_error(request)


async def require_physical_inventory_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, WRITE_PERMISSIONS):
        return user
    _permission_error(request)


async def _status_id(session, status_code: str) -> int | None:
    result = await session.execute(
        text(
            "SELECT id FROM system_statuses "
            "WHERE status_group = 'PHYSICAL_COUNT' AND status_code = :status_code LIMIT 1"
        ),
        {"status_code": status_code},
    )
    return result.scalar_one_or_none()


async def _next_count_code(session) -> str:
    result = await session.execute(
        text("SELECT count_code FROM physical_inventory_counts WHERE count_code LIKE 'INVF_%' ORDER BY count_code DESC LIMIT 1")
    )
    current = result.scalar_one_or_none()
    next_number = 1
    if current:
        try:
            next_number = int(str(current).split("_")[-1]) + 1
        except ValueError:
            next_number = 1
    return f"INVF_{next_number:04d}"


async def _get_count(session, count_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT pic.*, ss.status_code, ss.status_display_es AS status_name, "
            "w.warehouse_code, w.warehouse_name, wz.zone_code, wz.zone_name, "
            "wzl.location_code, wzl.location_name, "
            "creator.username AS created_by_username, approver.username AS approved_by_username, "
            "COUNT(pici.id) AS item_count, "
            "SUM(CASE WHEN pici.counted_quantity IS NOT NULL THEN 1 ELSE 0 END) AS counted_item_count, "
            "SUM(CASE WHEN pici.counted_quantity IS NOT NULL AND pici.difference_quantity <> 0 THEN 1 ELSE 0 END) AS difference_item_count "
            "FROM physical_inventory_counts pic "
            "JOIN warehouses w ON w.id = pic.warehouse_id "
            "LEFT JOIN warehouse_zones wz ON wz.id = pic.warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = pic.warehouse_zone_location_id "
            "LEFT JOIN system_statuses ss ON ss.id = pic.status_id "
            "LEFT JOIN users creator ON creator.id = pic.created_by_user_id "
            "LEFT JOIN users approver ON approver.id = pic.approved_by_user_id "
            "LEFT JOIN physical_inventory_count_items pici ON pici.physical_inventory_count_id = pic.id "
            "WHERE pic.id = :count_id AND pic.deleted_at IS NULL "
            "GROUP BY pic.id"
        ),
        {"count_id": count_id},
    )
    return _row(result.mappings().first())


async def _get_item(session, item_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT pici.*, pic.status_id, ss.status_code "
            "FROM physical_inventory_count_items pici "
            "JOIN physical_inventory_counts pic ON pic.id = pici.physical_inventory_count_id "
            "LEFT JOIN system_statuses ss ON ss.id = pic.status_id "
            "WHERE pici.id = :item_id AND pic.deleted_at IS NULL"
        ),
        {"item_id": item_id},
    )
    return _row(result.mappings().first())


async def _validate_scope(session, warehouse_id: int, warehouse_zone_id: int | None, warehouse_zone_location_id: int | None) -> tuple[int | None, int | None]:
    warehouse_result = await session.execute(
        text("SELECT id FROM warehouses WHERE id = :warehouse_id AND deleted_at IS NULL"),
        {"warehouse_id": warehouse_id},
    )
    if not warehouse_result.scalar_one_or_none():
        raise ValueError("Bodega no encontrada")

    if warehouse_zone_location_id:
        location_result = await session.execute(
            text(
                "SELECT wzl.id, wzl.warehouse_zone_id "
                "FROM warehouse_zone_locations wzl "
                "JOIN warehouse_zones wz ON wz.id = wzl.warehouse_zone_id "
                "WHERE wzl.id = :location_id AND wzl.deleted_at IS NULL "
                "AND wz.deleted_at IS NULL AND wz.warehouse_id = :warehouse_id"
            ),
            {"location_id": warehouse_zone_location_id, "warehouse_id": warehouse_id},
        )
        location = location_result.mappings().first()
        if not location:
            raise ValueError("Ubicacion interna no encontrada para la bodega")
        if warehouse_zone_id and int(location["warehouse_zone_id"]) != int(warehouse_zone_id):
            raise ValueError("La ubicacion interna no pertenece a la zona indicada")
        warehouse_zone_id = int(location["warehouse_zone_id"])

    if warehouse_zone_id:
        zone_result = await session.execute(
            text(
                "SELECT id FROM warehouse_zones "
                "WHERE id = :zone_id AND warehouse_id = :warehouse_id AND deleted_at IS NULL"
            ),
            {"zone_id": warehouse_zone_id, "warehouse_id": warehouse_id},
        )
        if not zone_result.scalar_one_or_none():
            raise ValueError("Zona no encontrada para la bodega")

    return warehouse_zone_id, warehouse_zone_location_id


async def _variant_unit_id(session, product_variant_id: int, measurement_unit_id: int | None) -> int:
    result = await session.execute(
        text(
            "SELECT pv.id, p.base_measurement_unit_id "
            "FROM product_variants pv "
            "JOIN products p ON p.id = pv.product_id "
            "WHERE pv.id = :variant_id AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
        ),
        {"variant_id": product_variant_id},
    )
    row = result.mappings().first()
    if not row:
        raise ValueError("SKU / Variacion no encontrada")

    unit_id = measurement_unit_id or row["base_measurement_unit_id"]
    unit_result = await session.execute(
        text("SELECT id FROM measurement_units WHERE id = :unit_id AND deleted_at IS NULL"),
        {"unit_id": unit_id},
    )
    if not unit_result.scalar_one_or_none():
        raise ValueError("Unidad de medida no encontrada")
    return int(unit_id)


async def _system_quantity(
    session,
    product_variant_id: int,
    warehouse_id: int,
    warehouse_zone_id: int | None,
    warehouse_zone_location_id: int | None,
    batch_lot_number: str | None,
    expiry_date: date | None,
) -> Decimal:
    result = await session.execute(
        text(
            "SELECT COALESCE(SUM(current_quantity), 0) "
            "FROM stock "
            "WHERE product_variant_id = :product_variant_id "
            "AND warehouse_id = :warehouse_id "
            "AND (:warehouse_zone_id IS NULL OR warehouse_zone_id = :warehouse_zone_id) "
            "AND (:warehouse_zone_location_id IS NULL OR warehouse_zone_location_id = :warehouse_zone_location_id) "
            "AND batch_lot_number <=> :batch_lot_number "
            "AND expiry_date <=> :expiry_date"
        ),
        {
            "product_variant_id": product_variant_id,
            "warehouse_id": warehouse_id,
            "warehouse_zone_id": warehouse_zone_id,
            "warehouse_zone_location_id": warehouse_zone_location_id,
            "batch_lot_number": batch_lot_number,
            "expiry_date": expiry_date,
        },
    )
    return result.scalar_one_or_none() or Decimal("0")


async def _insert_count_item(session, count: dict, item: PhysicalCountItemCreate) -> int:
    zone_id = item.warehouse_zone_id if item.warehouse_zone_id is not None else count.get("warehouse_zone_id")
    location_id = item.warehouse_zone_location_id if item.warehouse_zone_location_id is not None else count.get("warehouse_zone_location_id")
    zone_id, location_id = await _validate_scope(session, int(count["warehouse_id"]), zone_id, location_id)
    unit_id = await _variant_unit_id(session, item.product_variant_id, item.measurement_unit_id)
    tracking = await validate_tracking_dimensions(session, item.product_variant_id, location_id, item.batch_lot_number, item.expiry_date)
    system_quantity = item.system_quantity
    if system_quantity is None:
        system_quantity = await _system_quantity(session, item.product_variant_id, int(count["warehouse_id"]), zone_id, location_id, tracking["batch_lot_number"], tracking["expiry_date"])
    review_status = "PENDING"
    if item.counted_quantity is not None:
        review_status = "OK" if item.counted_quantity == system_quantity else "DIFFERENCE"
    await session.execute(
        text(
            "INSERT INTO physical_inventory_count_items ("
            "physical_inventory_count_id, product_variant_id, warehouse_zone_id, warehouse_zone_location_id, "
            "measurement_unit_id, system_quantity, counted_quantity, unit_cost, batch_lot_number, expiry_date, serial_number, "
            "counted_by_user_id, counted_at, review_status, notes"
            ") VALUES ("
            ":count_id, :product_variant_id, :warehouse_zone_id, :warehouse_zone_location_id, "
            ":measurement_unit_id, :system_quantity, :counted_quantity, :unit_cost, :batch_lot_number, :expiry_date, :serial_number, "
            ":counted_by_user_id, :counted_at, :review_status, :notes"
            ")"
        ),
        {
            "count_id": count["id"],
            "product_variant_id": item.product_variant_id,
            "warehouse_zone_id": zone_id,
            "warehouse_zone_location_id": location_id,
            "measurement_unit_id": unit_id,
            "system_quantity": system_quantity,
            "counted_quantity": item.counted_quantity,
            "unit_cost": item.unit_cost,
            "batch_lot_number": tracking["batch_lot_number"],
            "expiry_date": tracking["expiry_date"],
            "serial_number": item.serial_number,
            "counted_by_user_id": None,
            "counted_at": None,
            "review_status": review_status,
            "notes": item.notes,
        },
    )
    result = await session.execute(text("SELECT LAST_INSERT_ID()"))
    return int(result.scalar_one())


async def _items_for_count(session, count_id: int) -> list[dict]:
    result = await session.execute(
        text(
            "SELECT pici.*, pv.variant_name, p.product_name, mu.unit_name, mu.unit_symbol, "
            "wz.zone_name, wzl.location_name, counted_by.username AS counted_by_username "
            "FROM physical_inventory_count_items pici "
            "JOIN product_variants pv ON pv.id = pici.product_variant_id "
            "JOIN products p ON p.id = pv.product_id "
            "JOIN measurement_units mu ON mu.id = pici.measurement_unit_id "
            "LEFT JOIN warehouse_zones wz ON wz.id = pici.warehouse_zone_id "
            "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = pici.warehouse_zone_location_id "
            "LEFT JOIN users counted_by ON counted_by.id = pici.counted_by_user_id "
            "WHERE pici.physical_inventory_count_id = :count_id "
            "ORDER BY p.product_name, pv.variant_name, wz.zone_name, wzl.location_name, pici.id"
        ),
        {"count_id": count_id},
    )
    return [_row(row) for row in result.mappings().all()]


async def _set_count_status(session, count_id: int, status_code: str, extra_updates: str = "", params: dict | None = None) -> None:
    status_id = await _status_id(session, status_code)
    if not status_id:
        raise ValueError(f"Estado {status_code} no configurado")
    update_params = {"count_id": count_id, "status_id": status_id, **(params or {})}
    await session.execute(
        text(f"UPDATE physical_inventory_counts SET status_id = :status_id{extra_updates} WHERE id = :count_id"),
        update_params,
    )


@router.get("/counts", response_class=JSONResponse)
async def list_counts(
    request: Request,
    user: dict = Depends(require_physical_inventory_read),
    status: str | None = Query(None),
    warehouse_id: int | None = Query(None, gt=0),
    limit: int = Query(100, ge=1, le=500),
):
    try:
        conditions = ["pic.deleted_at IS NULL"]
        params = {"limit": limit}
        if status:
            conditions.append("ss.status_code = :status")
            params["status"] = status
        if warehouse_id:
            conditions.append("pic.warehouse_id = :warehouse_id")
            params["warehouse_id"] = warehouse_id
        where = " AND ".join(conditions)
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT pic.*, ss.status_code, ss.status_display_es AS status_name, "
                    "w.warehouse_code, w.warehouse_name, wz.zone_name, wzl.location_name, "
                    "COUNT(pici.id) AS item_count, "
                    "SUM(CASE WHEN pici.counted_quantity IS NOT NULL THEN 1 ELSE 0 END) AS counted_item_count, "
                    "SUM(CASE WHEN pici.counted_quantity IS NOT NULL AND pici.difference_quantity <> 0 THEN 1 ELSE 0 END) AS difference_item_count "
                    "FROM physical_inventory_counts pic "
                    "JOIN warehouses w ON w.id = pic.warehouse_id "
                    "LEFT JOIN warehouse_zones wz ON wz.id = pic.warehouse_zone_id "
                    "LEFT JOIN warehouse_zone_locations wzl ON wzl.id = pic.warehouse_zone_location_id "
                    "LEFT JOIN system_statuses ss ON ss.id = pic.status_id "
                    "LEFT JOIN physical_inventory_count_items pici ON pici.physical_inventory_count_id = pic.id "
                    f"WHERE {where} "
                    "GROUP BY pic.id "
                    "ORDER BY pic.created_at DESC LIMIT :limit"
                ),
                params,
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar inventarios fisicos", details=str(exc), request=request)


@router.post("/counts", response_class=JSONResponse)
async def create_count(data: PhysicalCountCreate, request: Request, user: dict = Depends(require_physical_inventory_write)):
    try:
        count_type = data.count_type.upper()
        if count_type not in {"FULL", "PARTIAL", "RANDOM", "CYCLE"}:
            raise ValueError("Tipo de conteo no valido")
        async with db_manager.get_async_session() as session:
            try:
                zone_id, location_id = await _validate_scope(session, data.warehouse_id, data.warehouse_zone_id, data.warehouse_zone_location_id)
                status_id = await _status_id(session, "DRAFT")
                if not status_id:
                    raise ValueError("Estado inicial de inventario fisico no configurado")
                await session.execute(
                    text(
                        "INSERT INTO physical_inventory_counts ("
                        "count_code, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, count_type, scope_description, "
                        "scheduled_date, status_id, freeze_stock, created_by_user_id, notes"
                        ") VALUES ("
                        ":count_code, :warehouse_id, :warehouse_zone_id, :warehouse_zone_location_id, :count_type, :scope_description, "
                        ":scheduled_date, :status_id, :freeze_stock, :created_by_user_id, :notes"
                        ")"
                    ),
                    {
                        "count_code": await _next_count_code(session),
                        "warehouse_id": data.warehouse_id,
                        "warehouse_zone_id": zone_id,
                        "warehouse_zone_location_id": location_id,
                        "count_type": count_type,
                        "scope_description": data.scope_description,
                        "scheduled_date": data.scheduled_date,
                        "status_id": status_id,
                        "freeze_stock": data.freeze_stock,
                        "created_by_user_id": user.get("user_id") or user.get("id"),
                        "notes": data.notes,
                    },
                )
                result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                count_id = int(result.scalar_one())
                await session.commit()
                return ResponseManager.success(data=await _get_count(session, count_id), message="Inventario fisico creado correctamente", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al crear inventario fisico", details=str(exc), request=request)


@router.get("/counts/{count_id}", response_class=JSONResponse)
async def get_count_detail(request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_read)):
    try:
        async with db_manager.get_async_session() as session:
            count = await _get_count(session, count_id)
            if not count:
                return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            count["items"] = await _items_for_count(session, count_id)
            return ResponseManager.success(data=count, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al obtener inventario fisico", details=str(exc), request=request)


@router.post("/counts/{count_id}/items", response_class=JSONResponse)
async def add_count_item(data: PhysicalCountItemCreate, request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") not in {"DRAFT", "COUNTING"}:
                    raise ValueError("Solo se pueden agregar items en borrador o conteo")
                item_id = await _insert_count_item(session, count, data)
                await session.commit()
                item = await _get_item(session, item_id)
                return ResponseManager.success(data=item, message="Item agregado al conteo", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al agregar item", details=str(exc), request=request)


@router.post("/counts/{count_id}/generate-items", response_class=JSONResponse)
async def generate_count_items(request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") != "DRAFT":
                    raise ValueError("La carga automatica solo esta disponible en borrador")
                result = await session.execute(
                    text(
                        "SELECT s.product_variant_id, s.warehouse_zone_id, s.warehouse_zone_location_id, "
                        "s.batch_lot_number, s.expiry_date, "
                        "p.base_measurement_unit_id AS measurement_unit_id, s.current_quantity AS system_quantity "
                        "FROM stock s "
                        "JOIN product_variants pv ON pv.id = s.product_variant_id "
                        "JOIN products p ON p.id = pv.product_id "
                        "WHERE s.warehouse_id = :warehouse_id "
                        "AND (:warehouse_zone_id IS NULL OR s.warehouse_zone_id = :warehouse_zone_id) "
                        "AND (:warehouse_zone_location_id IS NULL OR s.warehouse_zone_location_id = :warehouse_zone_location_id) "
                        "AND pv.deleted_at IS NULL AND p.deleted_at IS NULL"
                    ),
                    {
                        "warehouse_id": count["warehouse_id"],
                        "warehouse_zone_id": count.get("warehouse_zone_id"),
                        "warehouse_zone_location_id": count.get("warehouse_zone_location_id"),
                    },
                )
                created = 0
                for row in result.mappings().all():
                    await _insert_count_item(session, count, PhysicalCountItemCreate(**dict(row)))
                    created += 1
                await session.commit()
                return ResponseManager.success(data={"created": created}, message=f"Se generaron {created} items", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al generar items", details=str(exc), request=request)


@router.post("/counts/{count_id}/start", response_class=JSONResponse)
async def start_count(request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") != "DRAFT":
                    raise ValueError("Solo se puede iniciar un conteo en borrador")
                await _set_count_status(session, count_id, "COUNTING", ", started_at = COALESCE(started_at, CURRENT_TIMESTAMP)")
                await session.commit()
                return ResponseManager.success(data=await _get_count(session, count_id), message="Conteo iniciado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al iniciar conteo", details=str(exc), request=request)


@router.put("/counts/{count_id}/items/{item_id}/count", response_class=JSONResponse)
async def update_counted_item(data: PhysicalCountItemUpdate, request: Request, count_id: int = Path(..., gt=0), item_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                item = await _get_item(session, item_id)
                if not item or int(item["physical_inventory_count_id"]) != count_id:
                    return ResponseManager.error(message="Item de conteo no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if item.get("status_code") != "COUNTING":
                    raise ValueError("Solo se puede contar items en estado En Conteo")
                review_status = "OK" if Decimal(str(data.counted_quantity)) == Decimal(str(item["system_quantity"])) else "DIFFERENCE"
                await session.execute(
                    text(
                        "UPDATE physical_inventory_count_items "
                        "SET counted_quantity = :counted_quantity, counted_by_user_id = :user_id, counted_at = CURRENT_TIMESTAMP, "
                        "review_status = :review_status, notes = :notes "
                        "WHERE id = :item_id"
                    ),
                    {
                        "counted_quantity": data.counted_quantity,
                        "user_id": user.get("user_id") or user.get("id"),
                        "review_status": review_status,
                        "notes": data.notes,
                        "item_id": item_id,
                    },
                )
                await session.commit()
                return ResponseManager.success(data=await _get_item(session, item_id), message="Cantidad registrada", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al registrar conteo", details=str(exc), request=request)


@router.post("/counts/{count_id}/review", response_class=JSONResponse)
async def send_to_review(request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") != "COUNTING":
                    raise ValueError("Solo se puede enviar a revision un conteo en curso")
                if int(count.get("item_count") or 0) == 0:
                    raise ValueError("El conteo no tiene items")
                if int(count.get("counted_item_count") or 0) < int(count.get("item_count") or 0):
                    raise ValueError("Todos los items deben tener cantidad contada")
                await _set_count_status(session, count_id, "REVIEW", ", completed_at = CURRENT_TIMESTAMP")
                await session.commit()
                return ResponseManager.success(data=await _get_count(session, count_id), message="Conteo enviado a revision", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al enviar a revision", details=str(exc), request=request)


@router.post("/counts/{count_id}/approve", response_class=JSONResponse)
async def approve_count(data: PhysicalCountNotes, request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") != "REVIEW":
                    raise ValueError("Solo se puede aprobar un conteo en revision")
                await _set_count_status(
                    session,
                    count_id,
                    "APPROVED",
                    ", approved_by_user_id = :user_id, approved_at = CURRENT_TIMESTAMP, notes = COALESCE(:notes, notes)",
                    {"user_id": user.get("user_id") or user.get("id"), "notes": data.notes},
                )
                await session.execute(
                    text("UPDATE physical_inventory_count_items SET review_status = 'APPROVED' WHERE physical_inventory_count_id = :count_id"),
                    {"count_id": count_id},
                )
                await session.commit()
                return ResponseManager.success(data=await _get_count(session, count_id), message="Conteo aprobado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al aprobar conteo", details=str(exc), request=request)


async def _stock_row(session, item: dict, warehouse_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT * FROM stock "
            "WHERE product_variant_id = :product_variant_id AND warehouse_id = :warehouse_id "
            "AND warehouse_zone_id <=> :warehouse_zone_id "
            "AND warehouse_zone_location_id <=> :warehouse_zone_location_id "
            "AND batch_lot_number <=> :batch_lot_number "
            "AND expiry_date <=> :expiry_date "
            "LIMIT 1"
        ),
        {
            "product_variant_id": item["product_variant_id"],
            "warehouse_id": warehouse_id,
            "warehouse_zone_id": item.get("warehouse_zone_id"),
            "warehouse_zone_location_id": item.get("warehouse_zone_location_id"),
            "batch_lot_number": item.get("batch_lot_number"),
            "expiry_date": item.get("expiry_date"),
        },
    )
    return _row(result.mappings().first())


@router.post("/counts/{count_id}/post", response_class=JSONResponse)
async def post_count(data: PhysicalCountNotes, request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") != "APPROVED":
                    raise ValueError("Solo se puede contabilizar un conteo aprobado")
                items = await _items_for_count(session, count_id)
                if not items:
                    raise ValueError("El conteo no tiene items")

                posted_user_id = user.get("user_id") or user.get("id")
                total_positive = Decimal("0")
                total_negative = Decimal("0")
                total_cost = Decimal("0")
                first_movement_id = None
                movement_count = 0

                for item in items:
                    counted_quantity = Decimal(str(item["counted_quantity"] or 0))
                    system_quantity = Decimal(str(item["system_quantity"] or 0))
                    difference = counted_quantity - system_quantity
                    if difference == 0:
                        continue
                    stock_row = await _stock_row(session, item, int(count["warehouse_id"]))
                    quantity_before = Decimal(str(stock_row["current_quantity"])) if stock_row else Decimal("0")
                    quantity_after = counted_quantity
                    if stock_row:
                        await session.execute(
                            text(
                                "UPDATE stock SET current_quantity = :quantity_after, last_movement_date = CURRENT_TIMESTAMP, "
                                "last_movement_type = 'ADJUSTMENT' WHERE id = :stock_id"
                            ),
                            {"quantity_after": quantity_after, "stock_id": stock_row["id"]},
                        )
                    else:
                        await session.execute(
                            text(
                                "INSERT INTO stock (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, batch_lot_number, expiry_date, "
                                "current_quantity, reserved_quantity, last_movement_date, last_movement_type) "
                                "VALUES (:product_variant_id, :warehouse_id, :warehouse_zone_id, :warehouse_zone_location_id, :batch_lot_number, :expiry_date, "
                                ":quantity_after, 0, CURRENT_TIMESTAMP, 'ADJUSTMENT')"
                            ),
                            {
                                "product_variant_id": item["product_variant_id"],
                                "warehouse_id": count["warehouse_id"],
                                "warehouse_zone_id": item.get("warehouse_zone_id"),
                                "warehouse_zone_location_id": item.get("warehouse_zone_location_id"),
                                "batch_lot_number": item.get("batch_lot_number"),
                                "expiry_date": item.get("expiry_date"),
                                "quantity_after": quantity_after,
                            },
                        )
                    await session.execute(
                        text(
                            "INSERT INTO stock_movements (product_variant_id, warehouse_id, warehouse_zone_id, warehouse_zone_location_id, "
                            "movement_type, reference_type, quantity, quantity_before, quantity_after, unit_cost, total_cost, "
                            "batch_lot_number, expiry_date, serial_number, notes, created_by_user_id) "
                            "VALUES (:product_variant_id, :warehouse_id, :warehouse_zone_id, :warehouse_zone_location_id, "
                            "'ADJUSTMENT', 'ADJUSTMENT', :quantity, :quantity_before, :quantity_after, :unit_cost, :total_cost, "
                            ":batch_lot_number, :expiry_date, :serial_number, :notes, :created_by_user_id)"
                        ),
                        {
                            "product_variant_id": item["product_variant_id"],
                            "warehouse_id": count["warehouse_id"],
                            "warehouse_zone_id": item.get("warehouse_zone_id"),
                            "warehouse_zone_location_id": item.get("warehouse_zone_location_id"),
                            "quantity": difference,
                            "quantity_before": quantity_before,
                            "quantity_after": quantity_after,
                            "unit_cost": item.get("unit_cost"),
                            "total_cost": Decimal(str(item.get("difference_cost") or 0)),
                            "batch_lot_number": item.get("batch_lot_number"),
                            "expiry_date": item.get("expiry_date"),
                            "serial_number": item.get("serial_number"),
                            "notes": f"Ajuste por inventario fisico {count['count_code']}",
                            "created_by_user_id": posted_user_id,
                        },
                    )
                    movement_result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                    movement_id = int(movement_result.scalar_one())
                    first_movement_id = first_movement_id or movement_id
                    movement_count += 1
                    if difference > 0:
                        total_positive += difference
                    else:
                        total_negative += abs(difference)
                    total_cost += Decimal(str(item.get("difference_cost") or 0))

                await session.execute(
                    text(
                        "INSERT INTO physical_inventory_adjustments (physical_inventory_count_id, stock_movement_id, adjustment_date, "
                        "total_positive_quantity, total_negative_quantity, total_difference_cost, posted_by_user_id, notes) "
                        "VALUES (:count_id, :stock_movement_id, CURRENT_DATE, :total_positive, :total_negative, :total_cost, :posted_by_user_id, :notes)"
                    ),
                    {
                        "count_id": count_id,
                        "stock_movement_id": first_movement_id,
                        "total_positive": total_positive,
                        "total_negative": total_negative,
                        "total_cost": total_cost,
                        "posted_by_user_id": posted_user_id,
                        "notes": data.notes,
                    },
                )
                await _set_count_status(session, count_id, "POSTED")
                await session.commit()
                next_count = await _get_count(session, count_id)
                next_count["posted_movement_count"] = movement_count
                return ResponseManager.success(data=next_count, message="Inventario fisico contabilizado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al contabilizar inventario fisico", details=str(exc), request=request)


@router.post("/counts/{count_id}/cancel", response_class=JSONResponse)
async def cancel_count(data: PhysicalCountNotes, request: Request, count_id: int = Path(..., gt=0), user: dict = Depends(require_physical_inventory_write)):
    try:
        async with db_manager.get_async_session() as session:
            try:
                count = await _get_count(session, count_id)
                if not count:
                    return ResponseManager.error(message="Inventario fisico no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if count.get("status_code") == "POSTED":
                    raise ValueError("No se puede cancelar un inventario contabilizado")
                await _set_count_status(session, count_id, "CANCELLED", ", notes = COALESCE(:notes, notes)", {"notes": data.notes})
                await session.commit()
                return ResponseManager.success(data=await _get_count(session, count_id), message="Inventario fisico cancelado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al cancelar inventario fisico", details=str(exc), request=request)
