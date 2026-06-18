"""
Router operativo de caja chica: gastos y revision.
"""
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
import json
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, Request, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from pydantic import BaseModel, Field
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from services.media_storage import media_storage
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Petty Cash"])

READ_PERMISSIONS = ["PETTY_CASH_EXPENSES_ACCESS", "PETTY_CASH_ACCESS", "PETTY_CASH_APPROVE"]
CREATE_PERMISSIONS = ["PETTY_CASH_EXPENSES_CREATE", "PETTY_CASH_SPEND", "PETTY_CASH_ACCESS"]
APPROVE_PERMISSIONS = ["PETTY_CASH_EXPENSES_APPROVE", "PETTY_CASH_APPROVE"]
MAX_RECEIPT_BYTES = 10 * 1024 * 1024
IMAGE_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
PDF_MIME_TYPES = {"application/pdf"}


class PettyCashExpenseCreate(BaseModel):
    petty_cash_fund_id: int = Field(gt=0)
    category_id: int = Field(gt=0)
    expense_amount: Decimal = Field(gt=0)
    expense_description: str = Field(min_length=3, max_length=2000)
    vendor_name: str | None = Field(default=None, max_length=255)
    expense_date: date
    has_receipt: bool = False
    cash_register_session_id: int | None = Field(default=None, gt=0)


class PettyCashExpenseReject(BaseModel):
    rejection_reason: str = Field(min_length=3, max_length=2000)


class PettyCashExpenseForm:
    def __init__(
        self,
        petty_cash_fund_id: int = Form(..., gt=0),
        category_id: int = Form(..., gt=0),
        expense_amount: str = Form(...),
        expense_description: str = Form(..., min_length=3, max_length=2000),
        expense_date: date = Form(...),
        has_receipt: bool = Form(False),
        vendor_name: str | None = Form(default=None, max_length=255),
        cash_register_session_id: int | None = Form(default=None, gt=0),
    ):
        self.petty_cash_fund_id = petty_cash_fund_id
        self.category_id = category_id
        self.expense_amount = _parse_localized_decimal(expense_amount)
        if self.expense_amount <= 0:
            raise ValueError("El monto del gasto debe ser mayor que cero")
        self.expense_description = expense_description
        self.vendor_name = vendor_name
        self.expense_date = expense_date
        self.has_receipt = has_receipt
        self.cash_register_session_id = cash_register_session_id


def _json_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _row(row) -> dict | None:
    return {key: _json_value(value) for key, value in row.items()} if row else None


def _parse_localized_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    text = str(value or "").strip().replace("$", "").replace("CLP", "").replace(" ", "")
    if not text:
        raise ValueError("Monto requerido")
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif "." in text:
        parts = text.split(".")
        if len(parts) > 1 and all(len(part) == 3 for part in parts[1:]):
            text = "".join(parts)
    return Decimal(text)


def _format_clp(value) -> str:
    amount = Decimal(str(value or 0)).quantize(Decimal("1"))
    return f"${int(amount):,}".replace(",", ".")


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


def _normalize_vendor_name(value: str | None) -> str | None:
    normalized = " ".join(str(value or "").strip().split())
    return normalized[:255] if normalized else None


async def _store_receipt_file(file: UploadFile, *, expense_code: str) -> dict:
    content = await file.read()
    if not content:
        raise ValueError("El comprobante esta vacio")
    if len(content) > MAX_RECEIPT_BYTES:
        raise ValueError("El comprobante supera el maximo permitido de 10 MB")

    source_mime = (file.content_type or "").lower()
    metadata = {
        "evidence_width": None,
        "evidence_height": None,
        "evidence_original_filename": file.filename,
    }

    if source_mime in PDF_MIME_TYPES or content.startswith(b"%PDF"):
        if not content.startswith(b"%PDF"):
            raise ValueError("El PDF no tiene una estructura valida")
        extension = "pdf"
        mime_type = "application/pdf"
    else:
        try:
            image = Image.open(BytesIO(content))
            image.verify()
            image = Image.open(BytesIO(content))
            image_format = (image.format or "").upper()
            image = ImageOps.exif_transpose(image)
        except Exception as exc:
            raise ValueError("La imagen del comprobante no es valida") from exc
        if image_format not in IMAGE_FORMATS:
            raise ValueError("Formato de imagen no soportado. Usa JPG, PNG o WebP")
        extension = IMAGE_FORMATS[image_format]
        mime_type = f"image/{'jpeg' if extension == 'jpg' else extension}"
        metadata["evidence_width"] = image.width
        metadata["evidence_height"] = image.height

    media_storage.ensure_bucket()
    receipt_code = f"PCR_{uuid4().hex[:16].upper()}"
    object_key = f"petty_cash/expenses/{expense_code}/{receipt_code}.{extension}"
    media_storage.client.put_object(media_storage.bucket, object_key, BytesIO(content), len(content), content_type=mime_type)
    return {
        "evidence_file_hash": object_key,
        "evidence_file_extension": extension,
        "evidence_file_size": len(content),
        "evidence_mime_type": mime_type,
        **metadata,
    }


async def require_petty_cash_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, READ_PERMISSIONS):
        return user
    _permission_error(request)


async def require_petty_cash_create(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, CREATE_PERMISSIONS):
        return user
    _permission_error(request)


async def require_petty_cash_approve(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, APPROVE_PERMISSIONS):
        return user
    _permission_error(request)


async def _next_expense_code(session) -> str:
    result = await session.execute(
        text(
            "SELECT COALESCE(MAX(CAST(SUBSTRING(expense_code, 5) AS UNSIGNED)), 0) + 1 "
            "FROM petty_cash_expenses WHERE expense_code LIKE 'PCE_%'"
        )
    )
    return f"PCE_{int(result.scalar_one()):06d}"


async def _get_expense(session, expense_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT e.*, f.fund_code, f.warehouse_id, f.responsible_user_id, "
            "w.warehouse_name, c.category_name, c.requires_evidence, "
            "creator.username AS created_by_username, creator.first_name AS created_by_first_name, creator.last_name AS created_by_last_name, "
            "approver.username AS approved_by_username, approver.first_name AS approved_by_first_name, approver.last_name AS approved_by_last_name, "
            "responsible.username AS responsible_username, responsible.first_name AS responsible_first_name, responsible.last_name AS responsible_last_name "
            "FROM petty_cash_expenses e "
            "JOIN petty_cash_funds f ON f.id = e.petty_cash_fund_id "
            "JOIN warehouses w ON w.id = f.warehouse_id "
            "JOIN petty_cash_categories c ON c.id = e.category_id "
            "JOIN users creator ON creator.id = e.created_by_user_id "
            "LEFT JOIN users approver ON approver.id = e.approved_by_user_id "
            "LEFT JOIN users responsible ON responsible.id = f.responsible_user_id "
            "WHERE e.id = :id"
        ),
        {"id": expense_id},
    )
    return _row(result.mappings().first())


async def _fund_for_expense(session, fund_id: int) -> dict | None:
    result = await session.execute(
        text(
            "SELECT f.*, w.warehouse_name, u.username AS responsible_username, u.first_name, u.last_name "
            "FROM petty_cash_funds f "
            "JOIN warehouses w ON w.id = f.warehouse_id "
            "JOIN users u ON u.id = f.responsible_user_id "
            "WHERE f.id = :id AND f.deleted_at IS NULL"
        ),
        {"id": fund_id},
    )
    return _row(result.mappings().first())


async def _resolve_cash_register_session_id(session, requested_session_id: int | None, fund: dict, user_id: int | None) -> int | None:
    if requested_session_id:
        result = await session.execute(
            text(
                "SELECT crs.id "
                "FROM cash_register_sessions crs "
                "JOIN cash_registers cr ON cr.id = crs.cash_register_id "
                "WHERE crs.id = :session_id "
                "AND crs.status_id = 14 "
                "AND crs.deleted_at IS NULL "
                "AND cr.deleted_at IS NULL "
                "AND cr.warehouse_id = :warehouse_id"
            ),
            {"session_id": requested_session_id, "warehouse_id": fund["warehouse_id"]},
        )
        session_id = result.scalar_one_or_none()
        if not session_id:
            raise ValueError("La sesion de caja indicada no esta abierta para la bodega del fondo")
        return int(session_id)

    result = await session.execute(
        text(
            "SELECT crs.id "
            "FROM cash_register_sessions crs "
            "JOIN cash_registers cr ON cr.id = crs.cash_register_id "
            "WHERE crs.status_id = 14 "
            "AND crs.deleted_at IS NULL "
            "AND cr.deleted_at IS NULL "
            "AND cr.warehouse_id = :warehouse_id "
            "ORDER BY CASE WHEN crs.cashier_user_id = :user_id THEN 0 ELSE 1 END, crs.opening_datetime DESC "
            "LIMIT 1"
        ),
        {"warehouse_id": fund["warehouse_id"], "user_id": user_id or 0},
    )
    session_id = result.scalar_one_or_none()
    return int(session_id) if session_id else None


async def _category_for_expense(session, category_id: int) -> dict | None:
    result = await session.execute(
        text("SELECT * FROM petty_cash_categories WHERE id = :id AND deleted_at IS NULL AND is_active = TRUE"),
        {"id": category_id},
    )
    return _row(result.mappings().first())


async def _cash_payment_method_id(session) -> int | None:
    result = await session.execute(
        text(
            "SELECT id FROM payment_methods "
            "WHERE deleted_at IS NULL AND is_active = TRUE AND method_code = 'CASH' "
            "LIMIT 1"
        )
    )
    method_id = result.scalar_one_or_none()
    return int(method_id) if method_id else None


async def _sync_petty_cash_movement(session, *, expense_id: int, expense_code: str, cash_register_session_id: int | None, amount: Decimal, description: str, user_id: int | None) -> None:
    await session.execute(
        text(
            "DELETE FROM cash_movements "
            "WHERE movement_type = 'PETTY_CASH' "
            "AND reference_number = :reference_number"
        ),
        {"reference_number": expense_code},
    )
    if not cash_register_session_id:
        return

    payment_method_id = await _cash_payment_method_id(session)
    if not payment_method_id:
        return

    await session.execute(
        text(
            "INSERT INTO cash_movements (cash_register_session_id, movement_type, document_id, payment_method_id, "
            "amount, change_amount, received_amount, reference_number, description, created_by_user_id) "
            "VALUES (:session_id, 'PETTY_CASH', NULL, :payment_method_id, :amount, 0, 0, :reference_number, :description, :user_id)"
        ),
        {
            "session_id": cash_register_session_id,
            "payment_method_id": payment_method_id,
            "amount": -abs(amount),
            "reference_number": expense_code,
            "description": description,
            "user_id": user_id,
        },
    )


async def _record_vendor_suggestion(session, vendor_name: str | None, user_id: int | None) -> None:
    normalized = _normalize_vendor_name(vendor_name)
    if not normalized:
        return
    await session.execute(
        text(
            "INSERT INTO petty_cash_vendor_suggestions (vendor_name, usage_count, last_used_at, created_by_user_id, updated_by_user_id) "
            "VALUES (:vendor_name, 1, CURRENT_TIMESTAMP, :user_id, :user_id) "
            "ON DUPLICATE KEY UPDATE "
            "usage_count = usage_count + 1, "
            "last_used_at = CURRENT_TIMESTAMP, "
            "updated_by_user_id = VALUES(updated_by_user_id), "
            "deleted_at = NULL"
        ),
        {"vendor_name": normalized, "user_id": user_id},
    )


@router.get("/funds", response_class=JSONResponse)
async def list_available_funds(
    request: Request,
    user: dict = Depends(require_petty_cash_create),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        user_id = user.get("user_id") or user.get("id")
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT f.id, f.warehouse_id, f.responsible_user_id, f.initial_amount, f.current_balance, "
                    "f.total_expenses, f.total_replenishments, f.fund_status, f.last_replenishment_date, "
                    "w.warehouse_name, responsible.username AS responsible_username, "
                    "responsible.first_name AS responsible_first_name, responsible.last_name AS responsible_last_name "
                    "FROM petty_cash_funds f "
                    "JOIN warehouses w ON w.id = f.warehouse_id "
                    "JOIN users responsible ON responsible.id = f.responsible_user_id "
                    "WHERE f.deleted_at IS NULL "
                    "AND f.responsible_user_id = :user_id "
                    "AND f.fund_status = 'UNDECLARED' "
                    "ORDER BY w.warehouse_name, f.id "
                    "LIMIT :limit"
                ),
                {"user_id": user_id, "limit": limit},
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar fondos disponibles de caja chica", details=str(exc), request=request)


@router.get("/categories", response_class=JSONResponse)
async def list_available_categories(
    request: Request,
    user: dict = Depends(require_petty_cash_create),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT id, category_name, category_description, max_amount_per_expense, requires_evidence "
                    "FROM petty_cash_categories "
                    "WHERE deleted_at IS NULL AND is_active = TRUE "
                    "ORDER BY category_name "
                    "LIMIT :limit"
                ),
                {"limit": limit},
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar categorias disponibles de caja chica", details=str(exc), request=request)


@router.get("/vendors", response_class=JSONResponse)
async def list_vendor_suggestions(
    request: Request,
    user: dict = Depends(require_petty_cash_create),
    search: str | None = Query(default=None, max_length=255),
    limit: int = Query(100, ge=1, le=1000),
):
    try:
        normalized_search = " ".join(str(search or "").strip().split())
        where = "WHERE deleted_at IS NULL"
        params = {"limit": limit}
        if normalized_search:
            where += " AND vendor_name LIKE :search"
            params["search"] = f"%{normalized_search}%"
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT id, vendor_name, usage_count, last_used_at "
                    "FROM petty_cash_vendor_suggestions "
                    f"{where} "
                    "ORDER BY usage_count DESC, last_used_at DESC, vendor_name "
                    "LIMIT :limit"
                ),
                params,
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar comercios de caja chica", details=str(exc), request=request)


@router.get("/expenses", response_class=JSONResponse)
async def list_expenses(request: Request, user: dict = Depends(require_petty_cash_read)):
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                text(
                    "SELECT e.*, f.fund_code, f.warehouse_id, f.responsible_user_id, "
                    "w.warehouse_name, c.category_name, c.requires_evidence, "
                    "creator.username AS created_by_username, creator.first_name AS created_by_first_name, creator.last_name AS created_by_last_name, "
                    "approver.username AS approved_by_username, approver.first_name AS approved_by_first_name, approver.last_name AS approved_by_last_name, "
                    "responsible.username AS responsible_username, responsible.first_name AS responsible_first_name, responsible.last_name AS responsible_last_name, "
                    "cr.register_code, cr.register_name "
                    "FROM petty_cash_expenses e "
                    "JOIN petty_cash_funds f ON f.id = e.petty_cash_fund_id "
                    "JOIN warehouses w ON w.id = f.warehouse_id "
                    "JOIN petty_cash_categories c ON c.id = e.category_id "
                    "JOIN users creator ON creator.id = e.created_by_user_id "
                    "LEFT JOIN users approver ON approver.id = e.approved_by_user_id "
                    "LEFT JOIN users responsible ON responsible.id = f.responsible_user_id "
                    "LEFT JOIN cash_register_sessions crs ON crs.id = e.cash_register_session_id "
                    "LEFT JOIN cash_registers cr ON cr.id = crs.cash_register_id "
                    "ORDER BY e.created_at DESC, e.id DESC LIMIT 1000"
                )
            )
            return ResponseManager.success(data=[_row(row) for row in result.mappings().all()], request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al listar gastos de caja chica", details=str(exc), request=request)


@router.get("/expenses/{expense_id}/evidence", response_class=JSONResponse)
async def get_expense_evidence(
    request: Request,
    expense_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_read),
):
    try:
        async with db_manager.get_async_session() as session:
            expense = await _get_expense(session, expense_id)
            if not expense:
                return ResponseManager.error(message="Gasto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            object_key = expense.get("evidence_file_hash")
            if not expense.get("has_receipt") or not object_key:
                return _validation_response("El gasto no tiene evidencia adjunta", request)
            return ResponseManager.success(
                data={
                    "url": media_storage.presigned_url(object_key),
                    "mime_type": expense.get("evidence_mime_type"),
                    "extension": expense.get("evidence_file_extension"),
                    "size": expense.get("evidence_file_size"),
                    "width": expense.get("evidence_width"),
                    "height": expense.get("evidence_height"),
                    "file_name": expense.get("evidence_original_filename") or f"comprobante-{expense_id}.{expense.get('evidence_file_extension') or 'pdf'}",
                },
                request=request,
            )
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al obtener evidencia de caja chica", details=str(exc), request=request)


@router.post("/expenses", response_class=JSONResponse)
async def create_expense(
    request: Request,
    data: PettyCashExpenseForm = Depends(),
    evidence_file: UploadFile | None = File(default=None),
    user: dict = Depends(require_petty_cash_create),
):
    try:
        async with db_manager.get_async_session() as session:
            try:
                user_id = user.get("user_id") or user.get("id")
                vendor_name = _normalize_vendor_name(data.vendor_name)
                fund = await _fund_for_expense(session, data.petty_cash_fund_id)
                if not fund:
                    raise ValueError("Fondo de caja chica no encontrado")
                if fund["fund_status"] != "UNDECLARED":
                    raise ValueError("El fondo debe estar abierto/no declarado para registrar gastos")
                current_balance = Decimal(str(fund["current_balance"] or 0))
                amount = _parse_localized_decimal(data.expense_amount)

                category = await _category_for_expense(session, data.category_id)
                if not category:
                    raise ValueError("Categoria no encontrada o inactiva")
                max_amount = category.get("max_amount_per_expense")
                if max_amount is not None and amount > Decimal(str(max_amount)):
                    raise ValueError(f"La categoria {category.get('category_name') or 'seleccionada'} permite hasta {_format_clp(max_amount)} por gasto. Monto ingresado: {_format_clp(amount)}")
                if category.get("requires_evidence") and not data.has_receipt:
                    raise ValueError("La categoria requiere comprobante")
                if data.has_receipt and evidence_file is None:
                    raise ValueError("Debes adjuntar el comprobante")

                cash_register_session_id = await _resolve_cash_register_session_id(session, data.cash_register_session_id, fund, user_id)
                expense_code = await _next_expense_code(session)
                evidence = await _store_receipt_file(evidence_file, expense_code=expense_code) if data.has_receipt and evidence_file else {
                    "evidence_file_hash": None,
                    "evidence_file_extension": None,
                    "evidence_file_size": None,
                    "evidence_mime_type": None,
                    "evidence_width": None,
                    "evidence_height": None,
                    "evidence_original_filename": None,
                }
                new_balance = current_balance - amount
                await session.execute(
                    text(
                        "INSERT INTO petty_cash_expenses (expense_code, petty_cash_fund_id, category_id, cash_register_session_id, "
                        "expense_amount, expense_description, vendor_name, expense_date, evidence_file_hash, evidence_file_extension, evidence_file_size, "
                        "evidence_mime_type, evidence_width, evidence_height, evidence_original_filename, has_receipt, expense_status, created_by_user_id) "
                        "VALUES (:expense_code, :fund_id, :category_id, :session_id, :amount, :description, :vendor_name, :expense_date, "
                        ":evidence_file_hash, :evidence_file_extension, :evidence_file_size, :evidence_mime_type, :evidence_width, :evidence_height, "
                        ":evidence_original_filename, :has_receipt, 'PENDING', :user_id)"
                    ),
                    {
                        "expense_code": expense_code,
                        "fund_id": data.petty_cash_fund_id,
                        "category_id": data.category_id,
                        "session_id": cash_register_session_id,
                        "amount": amount,
                        "description": data.expense_description,
                        "vendor_name": vendor_name,
                        "expense_date": data.expense_date,
                        "has_receipt": data.has_receipt,
                        **evidence,
                        "user_id": user_id,
                    },
                )
                result = await session.execute(text("SELECT LAST_INSERT_ID()"))
                expense_id = int(result.scalar_one())
                await _record_vendor_suggestion(session, vendor_name, user_id)
                await _sync_petty_cash_movement(
                    session,
                    expense_id=expense_id,
                    expense_code=expense_code,
                    cash_register_session_id=cash_register_session_id,
                    amount=amount,
                    description=f"Caja chica {expense_code} - {data.expense_description}",
                    user_id=user_id,
                )
                await session.execute(
                    text(
                        "UPDATE petty_cash_funds SET current_balance = :new_balance, total_expenses = total_expenses + :amount, updated_at = CURRENT_TIMESTAMP "
                        "WHERE id = :fund_id"
                    ),
                    {"new_balance": new_balance, "amount": amount, "fund_id": data.petty_cash_fund_id},
                )
                await session.commit()
                return ResponseManager.success(data=await _get_expense(session, expense_id), message="Gasto registrado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al registrar gasto de caja chica", details=str(exc), request=request)


@router.put("/expenses/{expense_id}", response_class=JSONResponse)
async def update_expense(
    request: Request,
    data: PettyCashExpenseForm = Depends(),
    evidence_file: UploadFile | None = File(default=None),
    expense_id: int = Path(..., gt=0),
    user: dict = Depends(require_petty_cash_create),
):
    try:
        async with db_manager.get_async_session() as session:
            try:
                user_id = user.get("user_id") or user.get("id")
                expense = await _get_expense(session, expense_id)
                if not expense:
                    return ResponseManager.error(message="Gasto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
                if expense.get("expense_status") != "PENDING":
                    raise ValueError("Solo se pueden editar gastos pendientes")

                old_amount = Decimal(str(expense["expense_amount"] or 0))
                old_fund_id = int(expense["petty_cash_fund_id"])
                new_fund_id = int(data.petty_cash_fund_id)
                amount = _parse_localized_decimal(data.expense_amount)
                vendor_name = _normalize_vendor_name(data.vendor_name)

                fund = await _fund_for_expense(session, new_fund_id)
                if not fund:
                    raise ValueError("Fondo de caja chica no encontrado")
                if fund["fund_status"] != "UNDECLARED":
                    raise ValueError("El fondo debe estar abierto/no declarado para registrar gastos")

                current_balance = Decimal(str(fund["current_balance"] or 0))
                available_balance = current_balance + old_amount if old_fund_id == new_fund_id else current_balance

                category = await _category_for_expense(session, data.category_id)
                if not category:
                    raise ValueError("Categoria no encontrada o inactiva")
                max_amount = category.get("max_amount_per_expense")
                if max_amount is not None and amount > Decimal(str(max_amount)):
                    raise ValueError(f"La categoria {category.get('category_name') or 'seleccionada'} permite hasta {_format_clp(max_amount)} por gasto. Monto ingresado: {_format_clp(amount)}")
                if category.get("requires_evidence") and not data.has_receipt:
                    raise ValueError("La categoria requiere comprobante")
                if data.has_receipt and evidence_file is None and not expense.get("evidence_file_hash"):
                    raise ValueError("Debes adjuntar el comprobante")

                cash_register_session_id = await _resolve_cash_register_session_id(session, data.cash_register_session_id, fund, user_id)
                if data.has_receipt and evidence_file is not None:
                    evidence = await _store_receipt_file(evidence_file, expense_code=expense["expense_code"])
                elif data.has_receipt:
                    evidence = {
                        "evidence_file_hash": expense.get("evidence_file_hash"),
                        "evidence_file_extension": expense.get("evidence_file_extension"),
                        "evidence_file_size": expense.get("evidence_file_size"),
                        "evidence_mime_type": expense.get("evidence_mime_type"),
                        "evidence_width": expense.get("evidence_width"),
                        "evidence_height": expense.get("evidence_height"),
                        "evidence_original_filename": expense.get("evidence_original_filename"),
                    }
                else:
                    evidence = {
                        "evidence_file_hash": None,
                        "evidence_file_extension": None,
                        "evidence_file_size": None,
                        "evidence_mime_type": None,
                        "evidence_width": None,
                        "evidence_height": None,
                        "evidence_original_filename": None,
                    }

                await session.execute(
                    text(
                        "UPDATE petty_cash_expenses SET petty_cash_fund_id = :fund_id, category_id = :category_id, "
                        "cash_register_session_id = :session_id, expense_amount = :amount, expense_description = :description, "
                        "vendor_name = :vendor_name, expense_date = :expense_date, evidence_file_hash = :evidence_file_hash, "
                        "evidence_file_extension = :evidence_file_extension, evidence_file_size = :evidence_file_size, "
                        "evidence_mime_type = :evidence_mime_type, evidence_width = :evidence_width, evidence_height = :evidence_height, "
                        "evidence_original_filename = :evidence_original_filename, has_receipt = :has_receipt, updated_at = CURRENT_TIMESTAMP "
                        "WHERE id = :id"
                    ),
                    {
                        "id": expense_id,
                        "fund_id": new_fund_id,
                        "category_id": data.category_id,
                        "session_id": cash_register_session_id,
                        "amount": amount,
                        "description": data.expense_description,
                        "vendor_name": vendor_name,
                        "expense_date": data.expense_date,
                        "has_receipt": data.has_receipt,
                        **evidence,
                    },
                )

                if old_fund_id == new_fund_id:
                    await session.execute(
                        text(
                            "UPDATE petty_cash_funds SET current_balance = current_balance + :old_amount - :new_amount, "
                            "total_expenses = GREATEST(total_expenses - :old_amount + :new_amount, 0), updated_at = CURRENT_TIMESTAMP "
                            "WHERE id = :fund_id"
                        ),
                        {"old_amount": old_amount, "new_amount": amount, "fund_id": new_fund_id},
                    )
                else:
                    await session.execute(
                        text(
                            "UPDATE petty_cash_funds SET current_balance = current_balance + :old_amount, "
                            "total_expenses = GREATEST(total_expenses - :old_amount, 0), updated_at = CURRENT_TIMESTAMP "
                            "WHERE id = :fund_id"
                        ),
                        {"old_amount": old_amount, "fund_id": old_fund_id},
                    )
                    await session.execute(
                        text(
                            "UPDATE petty_cash_funds SET current_balance = current_balance - :new_amount, "
                            "total_expenses = total_expenses + :new_amount, updated_at = CURRENT_TIMESTAMP "
                            "WHERE id = :fund_id"
                        ),
                        {"new_amount": amount, "fund_id": new_fund_id},
                    )

                await _record_vendor_suggestion(session, vendor_name, user_id)
                await _sync_petty_cash_movement(
                    session,
                    expense_id=expense_id,
                    expense_code=expense["expense_code"],
                    cash_register_session_id=cash_register_session_id,
                    amount=amount,
                    description=f"Caja chica {expense['expense_code']} - {data.expense_description}",
                    user_id=user_id,
                )
                await session.commit()
                return ResponseManager.success(data=await _get_expense(session, expense_id), message="Gasto actualizado", request=request)
            except ValueError as exc:
                await session.rollback()
                return _validation_response(str(exc), request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al actualizar gasto de caja chica", details=str(exc), request=request)


@router.post("/expenses/{expense_id}/approve", response_class=JSONResponse)
async def approve_expense(request: Request, expense_id: int = Path(..., gt=0), user: dict = Depends(require_petty_cash_approve)):
    try:
        async with db_manager.get_async_session() as session:
            expense = await _get_expense(session, expense_id)
            if not expense:
                return ResponseManager.error(message="Gasto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            if expense.get("expense_status") != "PENDING":
                return _validation_response("Solo se pueden aprobar gastos pendientes", request)
            await session.execute(
                text(
                    "UPDATE petty_cash_expenses SET expense_status = 'APPROVED', approved_by_user_id = :user_id, "
                    "approved_datetime = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = :id"
                ),
                {"id": expense_id, "user_id": user.get("user_id") or user.get("id")},
            )
            await session.commit()
            return ResponseManager.success(data=await _get_expense(session, expense_id), message="Gasto aprobado", request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al aprobar gasto de caja chica", details=str(exc), request=request)


@router.post("/expenses/{expense_id}/reject", response_class=JSONResponse)
async def reject_expense(data: PettyCashExpenseReject, request: Request, expense_id: int = Path(..., gt=0), user: dict = Depends(require_petty_cash_approve)):
    try:
        async with db_manager.get_async_session() as session:
            expense = await _get_expense(session, expense_id)
            if not expense:
                return ResponseManager.error(message="Gasto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            if expense.get("expense_status") != "PENDING":
                return _validation_response("Solo se pueden rechazar gastos pendientes", request)
            amount = Decimal(str(expense["expense_amount"] or 0))
            await session.execute(
                text(
                    "UPDATE petty_cash_expenses SET expense_status = 'REJECTED', approved_by_user_id = :user_id, "
                    "approved_datetime = CURRENT_TIMESTAMP, rejection_reason = :reason WHERE id = :id"
                ),
                {"id": expense_id, "user_id": user.get("user_id") or user.get("id"), "reason": data.rejection_reason},
            )
            await session.execute(
                text(
                    "DELETE FROM cash_movements "
                    "WHERE movement_type = 'PETTY_CASH' AND reference_number = :reference_number"
                ),
                {"reference_number": expense["expense_code"]},
            )
            await session.execute(
                text(
                    "UPDATE petty_cash_funds SET current_balance = current_balance + :amount, total_expenses = GREATEST(total_expenses - :amount, 0), "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = :fund_id"
                ),
                {"amount": amount, "fund_id": expense["petty_cash_fund_id"]},
            )
            await session.commit()
            return ResponseManager.success(data=await _get_expense(session, expense_id), message="Gasto rechazado", request=request)
    except Exception as exc:
        return ResponseManager.internal_server_error(message="Error al rechazar gasto de caja chica", details=str(exc), request=request)
