"""
Router para el sistema de impresión térmica centralizada.

Endpoints administrativos (JWT): gestión de templates y visualización de jobs.
Endpoints de agente (printer_api_key): polling de jobs pendientes y actualización de estado.
"""
import secrets
import string
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import and_, select, update

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from database.models.print_jobs import PrintJob, PrintJobStatus, PrintTemplate, PrintTicketType
from database.models.sales_operations import SaleDocument, SaleDocumentLine, SalesPoint
from database.models.business_foundation import DteCompanyConfig
from database.schemas.print_jobs import PrintJobStatusUpdate, PrintTemplateCreate, PrintTemplateUpdate, ReprintRequest
from utils.log_helper import setup_logger
from utils.permissions_utils import get_current_user

logger = setup_logger(__name__)

router = APIRouter(
    tags=["Thermal Printing"],
    responses={
        401: {"description": "Token inválido o expirado"},
        403: {"description": "Acceso denegado"},
        404: {"description": "Recurso no encontrado"},
        422: {"description": "Error de validación"},
        500: {"description": "Error interno del servidor"},
    },
)

_API_KEY_CHARS = string.ascii_uppercase + string.digits
_API_KEY_GROUP = 4
_API_KEY_GROUPS = 4


def _generate_printer_api_key() -> str:
    """Genera clave en formato XXXX-XXXX-XXXX-XXXX (19 chars, estilo licencia)."""
    groups = [
        "".join(secrets.choice(_API_KEY_CHARS) for _ in range(_API_KEY_GROUP))
        for _ in range(_API_KEY_GROUPS)
    ]
    return "-".join(groups)


def _current_user_id(user: dict) -> int | None:
    raw_id = user.get("user_id") or user.get("id")
    try:
        return int(raw_id) if raw_id else None
    except (TypeError, ValueError):
        return None


async def _get_sales_point_by_api_key(session, api_key: str) -> SalesPoint | None:
    result = await session.execute(
        select(SalesPoint).where(
            and_(
                SalesPoint.printer_api_key == api_key,
                SalesPoint.has_printer.is_(True),
                SalesPoint.deleted_at.is_(None),
            )
        )
    )
    return result.scalar_one_or_none()


def _template_to_dict(t: PrintTemplate) -> dict:
    return {
        "id": t.id,
        "template_code": t.template_code,
        "template_name": t.template_name,
        "version": t.version,
        "content": t.content,
        "paper_width_mm": t.paper_width_mm,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _job_to_dict(j: PrintJob) -> dict:
    return {
        "id": j.id,
        "job_code": j.job_code,
        "sales_point_id": j.sales_point_id,
        "cash_register_id": j.cash_register_id,
        "sale_document_id": j.sale_document_id,
        "ticket_type": j.ticket_type,
        "template_version": j.template_version,
        "status": j.status,
        "payload": j.payload,
        "error_message": j.error_message,
        "attempts": j.attempts,
        "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        "created_at": j.created_at.isoformat() if j.created_at else None,
    }


# ==========================================
# GESTIÓN DE TEMPLATES (Admin / JWT)
# ==========================================

@router.get("/templates", response_class=JSONResponse)
async def list_templates(request: Request, user: dict = Depends(get_current_user)):
    """Lista todos los templates activos."""
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(PrintTemplate).where(PrintTemplate.deleted_at.is_(None)).order_by(PrintTemplate.template_code)
        )
        templates = result.scalars().all()
        return ResponseManager.success(data=[_template_to_dict(t) for t in templates], request=request)


@router.post("/templates", response_class=JSONResponse)
async def create_template(payload: PrintTemplateCreate, request: Request, user: dict = Depends(get_current_user)):
    """Crea un nuevo template de boleta."""
    async with db_manager.get_async_session() as session:
        existing = await session.execute(
            select(PrintTemplate).where(
                and_(PrintTemplate.template_code == payload.template_code.upper(), PrintTemplate.deleted_at.is_(None))
            )
        )
        if existing.scalar_one_or_none():
            return ResponseManager.error(
                message="Ya existe un template con ese código",
                status_code=HTTPStatus.CONFLICT,
                error_code=ErrorCode.RESOURCE_CONFLICT,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        template = PrintTemplate(
            template_code=payload.template_code.upper(),
            template_name=payload.template_name,
            version=payload.version,
            content=payload.content,
            paper_width_mm=payload.paper_width_mm,
            is_active=payload.is_active,
        )
        session.add(template)
        await session.flush()
        return ResponseManager.success(
            data=_template_to_dict(template),
            message="Template creado",
            status_code=HTTPStatus.CREATED,
            request=request,
        )


@router.get("/templates/{template_code}", response_class=JSONResponse)
async def get_template(template_code: str, request: Request, user: dict = Depends(get_current_user)):
    """Obtiene un template por código."""
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(PrintTemplate).where(
                and_(PrintTemplate.template_code == template_code.upper(), PrintTemplate.deleted_at.is_(None))
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            return ResponseManager.error(
                message="Template no encontrado",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )
        return ResponseManager.success(data=_template_to_dict(template), request=request)


@router.patch("/templates/{template_id}", response_class=JSONResponse)
async def update_template(
    payload: PrintTemplateUpdate,
    request: Request,
    template_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
):
    """Actualiza un template existente (incrementar versión fuerza actualización en agentes)."""
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            select(PrintTemplate).where(and_(PrintTemplate.id == template_id, PrintTemplate.deleted_at.is_(None)))
        )
        template = result.scalar_one_or_none()
        if not template:
            return ResponseManager.error(
                message="Template no encontrado",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )
        if payload.template_name is not None:
            template.template_name = payload.template_name
        if payload.version is not None:
            template.version = payload.version
        if payload.content is not None:
            template.content = payload.content
        if payload.paper_width_mm is not None:
            template.paper_width_mm = payload.paper_width_mm
        if payload.is_active is not None:
            template.is_active = payload.is_active
        await session.flush()
        return ResponseManager.success(data=_template_to_dict(template), message="Template actualizado", request=request)


# ==========================================
# ENDPOINTS PARA AGENTE (printer_api_key)
# ==========================================

@router.get("/agent/template-version", response_class=JSONResponse)
async def agent_get_template_version(x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key")):
    """
    Chequeo liviano de versión del template activo.
    El agente llama esto en cada arranque y cada N minutos.
    Si la versión cambió, descarga el template completo.
    """
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )
        result = await session.execute(
            select(PrintTemplate.template_code, PrintTemplate.version, PrintTemplate.paper_width_mm)
            .where(and_(PrintTemplate.is_active.is_(True), PrintTemplate.deleted_at.is_(None)))
            .order_by(PrintTemplate.id.desc())
            .limit(1)
        )
        row = result.one_or_none()
        if not row:
            return ResponseManager.success(data={"template_code": None, "version": None})
        return ResponseManager.success(
            data={"template_code": row.template_code, "version": row.version, "paper_width_mm": row.paper_width_mm}
        )


@router.get("/agent/template-versions", response_class=JSONResponse)
async def agent_get_all_template_versions(x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key")):
    """
    Retorna todos los templates activos con su versión.
    El agente los compara contra su cache y descarga los que cambiaron.
    """
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )
        result = await session.execute(
            select(PrintTemplate.template_code, PrintTemplate.version)
            .where(and_(PrintTemplate.is_active.is_(True), PrintTemplate.deleted_at.is_(None)))
            .order_by(PrintTemplate.template_code)
        )
        rows = result.mappings().all()
        return ResponseManager.success(data=[
            {"template_code": r.template_code, "version": r.version}
            for r in rows
        ])


@router.get("/agent/template/{template_code}", response_class=JSONResponse)
async def agent_download_template(
    template_code: str,
    x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key"),
):
    """Descarga el template completo. Llamado cuando el agente detecta versión nueva."""
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )
        result = await session.execute(
            select(PrintTemplate).where(
                and_(
                    PrintTemplate.template_code == template_code.upper(),
                    PrintTemplate.is_active.is_(True),
                    PrintTemplate.deleted_at.is_(None),
                )
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            return ResponseManager.error(
                message="Template no encontrado",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
            )
        return ResponseManager.success(data=_template_to_dict(template))


@router.get("/agent/jobs/pending", response_class=JSONResponse)
async def agent_poll_pending_jobs(x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key")):
    """
    El agente llama esto cada ~2 segundos para obtener trabajos pendientes.
    Retorna sólo los PENDING del punto de venta autorizado por la API key.
    """
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )
        result = await session.execute(
            select(PrintJob)
            .where(
                and_(
                    PrintJob.sales_point_id == sp.id,
                    PrintJob.status == PrintJobStatus.PENDING,
                    PrintJob.deleted_at.is_(None),
                )
            )
            .order_by(PrintJob.created_at.asc())
            .limit(5)
        )
        jobs = result.scalars().all()
        return ResponseManager.success(data=[_job_to_dict(j) for j in jobs])


@router.patch("/agent/jobs/{job_code}/status", response_class=JSONResponse)
async def agent_update_job_status(
    payload: PrintJobStatusUpdate,
    job_code: str,
    x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key"),
):
    """El agente informa el resultado de un trabajo (COMPLETED / FAILED)."""
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )
        result = await session.execute(
            select(PrintJob).where(
                and_(PrintJob.job_code == job_code, PrintJob.sales_point_id == sp.id, PrintJob.deleted_at.is_(None))
            )
        )
        job = result.scalar_one_or_none()
        if not job:
            return ResponseManager.error(
                message="Trabajo no encontrado",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
            )
        job.status = PrintJobStatus(payload.status)
        job.attempts = (job.attempts or 0) + 1
        if payload.status == "FAILED":
            job.error_message = payload.error_message
        if payload.status == "COMPLETED":
            job.completed_at = datetime.now(timezone.utc)
            job.error_message = None
        await session.flush()
        return ResponseManager.success(data=_job_to_dict(job), message="Estado actualizado")


# ==========================================
# REIMPRESIÓN Y CONSULTAS (Admin / JWT)
# ==========================================

@router.post("/jobs/reprint/{sale_document_id}", response_class=JSONResponse)
async def reprint_sale(
    payload: ReprintRequest,
    request: Request,
    sale_document_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
):
    """Encola un trabajo de reimpresión para una venta ya cerrada."""
    async with db_manager.get_async_session() as session:
        sale_result = await session.execute(
            select(SaleDocument).where(and_(SaleDocument.id == sale_document_id, SaleDocument.deleted_at.is_(None)))
        )
        sale = sale_result.scalar_one_or_none()
        if not sale:
            return ResponseManager.error(
                message="Venta no encontrada",
                status_code=HTTPStatus.NOT_FOUND,
                error_code=ErrorCode.RESOURCE_NOT_FOUND,
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                request=request,
            )

        sp_result = await session.execute(
            select(SalesPoint).where(
                and_(SalesPoint.id == payload.sales_point_id, SalesPoint.deleted_at.is_(None))
            )
        )
        sp = sp_result.scalar_one_or_none()
        if not sp or not sp.has_printer:
            return ResponseManager.error(
                message="Punto de venta no tiene impresora configurada",
                status_code=HTTPStatus.BAD_REQUEST,
                error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
                error_type=ErrorType.VALIDATION_ERROR,
                request=request,
            )

        template_result = await session.execute(
            select(PrintTemplate).where(
                and_(PrintTemplate.is_active.is_(True), PrintTemplate.deleted_at.is_(None))
            ).order_by(PrintTemplate.id.desc()).limit(1)
        )
        template = template_result.scalar_one_or_none()

        lines_result = await session.execute(
            select(SaleDocumentLine).where(SaleDocumentLine.sale_document_id == sale_document_id)
        )
        lines = lines_result.scalars().all()

        company_result = await session.execute(
            select(DteCompanyConfig).where(DteCompanyConfig.is_active.is_(True)).limit(1)
        )
        company_obj = company_result.scalar_one_or_none()
        company_dict = None
        if company_obj:
            async def _mcode(asset_id):
                if not asset_id:
                    return None
                from sqlalchemy import text as _t
                res = await session.execute(
                    _t("SELECT media_code FROM media_assets WHERE id = :id AND deleted_at IS NULL"),
                    {"id": asset_id},
                )
                row = res.fetchone()
                return row[0] if row else None

            logo_code   = await _mcode(company_obj.logo_media_asset_id)
            banner_code = await _mcode(company_obj.banner_media_asset_id)
            address_parts = [p for p in [
                company_obj.company_address or "",
                company_obj.company_comuna  or "",
                company_obj.company_city    or "",
            ] if p]
            company_dict = {
                "name":        company_obj.company_name or "",
                "fantasy_name": company_obj.company_business_name or "",
                "rut":         company_obj.company_rut or "",
                "address":     ", ".join(address_parts),
                "logo_url":    f"/api/profile/media/{logo_code}/full"   if logo_code   else None,
                "banner_url":  f"/api/profile/media/{banner_code}/full" if banner_code else None,
            }

        sale_payload = _build_sale_payload(sale, lines, company=company_dict)
        sale_payload["reprint_date"] = datetime.now(timezone.utc).isoformat()

        job = PrintJob(
            job_code=str(uuid4()),
            sales_point_id=sp.id,
            cash_register_id=sale.cash_register_id,
            sale_document_id=sale.id,
            ticket_type=PrintTicketType(payload.ticket_type),
            template_version=template.version if template else None,
            status=PrintJobStatus.PENDING,
            payload=sale_payload,
            requested_by_user_id=_current_user_id(user),
        )
        session.add(job)
        await session.flush()
        return ResponseManager.success(
            data=_job_to_dict(job), message="Reimpresión encolada", status_code=HTTPStatus.CREATED, request=request
        )


@router.get("/jobs", response_class=JSONResponse)
async def list_jobs(
    request: Request,
    sales_point_id: int | None = Query(None),
    status: str | None = Query(None),
    ticket_type: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user),
):
    """Lista trabajos de impresión con filtros opcionales."""
    from sqlalchemy import cast, Date as SADate
    async with db_manager.get_async_session() as session:
        filters = [PrintJob.deleted_at.is_(None)]
        if sales_point_id:
            filters.append(PrintJob.sales_point_id == sales_point_id)
        if status:
            filters.append(PrintJob.status == status)
        if ticket_type:
            filters.append(PrintJob.ticket_type == ticket_type)
        if date_from:
            filters.append(cast(PrintJob.created_at, SADate) >= date_from)
        if date_to:
            filters.append(cast(PrintJob.created_at, SADate) <= date_to)
        result = await session.execute(
            select(PrintJob).where(and_(*filters)).order_by(PrintJob.created_at.desc()).limit(limit)
        )
        jobs = result.scalars().all()
        return ResponseManager.success(data=[_job_to_dict(j) for j in jobs], request=request)


@router.get("/agent/station-info", response_class=JSONResponse)
async def agent_get_station_info(x_printer_api_key: str = Header(..., alias="X-Printer-Api-Key")):
    """
    Información del punto de venta y empresa activa.
    Usada por el portal del agente para mostrar nombre de cliente, sucursal, logo y banner.
    """
    async with db_manager.get_async_session() as session:
        sp = await _get_sales_point_by_api_key(session, x_printer_api_key)
        if not sp:
            return ResponseManager.error(
                message="Clave de impresora inválida",
                status_code=HTTPStatus.UNAUTHORIZED,
                error_code=ErrorCode.AUTH_TOKEN_INVALID,
                error_type=ErrorType.AUTHENTICATION_ERROR,
            )

        company_result = await session.execute(
            select(DteCompanyConfig).where(DteCompanyConfig.is_active.is_(True)).limit(1)
        )
        company = company_result.scalar_one_or_none()

        async def _media_code(asset_id: int | None) -> str | None:
            if not asset_id:
                return None
            from sqlalchemy import text as sa_text
            res = await session.execute(
                sa_text("SELECT media_code FROM media_assets WHERE id = :id AND deleted_at IS NULL"),
                {"id": asset_id},
            )
            row = res.fetchone()
            return row[0] if row else None

        logo_code   = await _media_code(company.logo_media_asset_id   if company else None)
        banner_code = await _media_code(company.banner_media_asset_id  if company else None)

        address_parts = [p for p in [
            company.company_address or "",
            company.company_comuna  or "",
            company.company_city    or "",
        ] if p] if company else []

        return ResponseManager.success(data={
            "sales_point_name":        sp.sales_point_name,
            "sales_point_code":        sp.sales_point_code,
            "sales_point_location":    sp.location_description or "",
            "company_name":            company.company_name             if company else "",
            "company_fantasy_name":    company.company_business_name    if company else "",
            "company_rut":             company.company_rut              if company else "",
            "company_address":         ", ".join(address_parts),
            "company_comuna":          company.company_comuna           if company else "",
            "company_city":            company.company_city             if company else "",
            "company_region":          company.company_region           if company else "",
            "company_activity_code":   company.economic_activity_code   if company else "",
            "company_activity_name":   company.economic_activity_name   if company else "",
            "logo_url":   f"/api/profile/media/{logo_code}/full"   if logo_code   else None,
            "banner_url": f"/api/profile/media/{banner_code}/full" if banner_code else None,
        })


# ==========================================
# GESTIÓN DE API KEY (Admin / JWT)
# ==========================================

@router.post("/sales-points/{sales_point_id}/regenerate-key", response_class=JSONResponse)
async def regenerate_printer_api_key(
    request: Request,
    sales_point_id: int = Path(..., gt=0),
    user: dict = Depends(get_current_user),
):
    """Genera o regenera la clave de autorización del agente para un punto de venta."""
    try:
        async with db_manager.get_async_session() as session:
            result = await session.execute(
                select(SalesPoint).where(and_(SalesPoint.id == sales_point_id, SalesPoint.deleted_at.is_(None)))
            )
            sp = result.scalar_one_or_none()
            if not sp:
                return ResponseManager.error(
                    message="Punto de venta no encontrado",
                    status_code=HTTPStatus.NOT_FOUND,
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    error_type=ErrorType.RESOURCE_NOT_FOUND,
                    request=request,
                )
            sp.printer_api_key = _generate_printer_api_key()
            sp.has_printer = True
            await session.flush()
            return ResponseManager.success(
                data={"sales_point_id": sp.id, "printer_api_key": sp.printer_api_key},
                message="Clave de impresora generada. Guárdala en el archivo de configuración del agente.",
                request=request,
            )
    except Exception as exc:
        logger.error("Error generando clave de impresora para sales_point %s: %s", sales_point_id, exc)
        return ResponseManager.error(
            message="Error al generar la clave de impresora",
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            error_type=ErrorType.RESOURCE_ERROR,
            details=str(exc),
            request=request,
        )


# ==========================================
# FUNCIÓN INTERNA: construir payload de venta
# ==========================================

def _extract_agreement(payment_details) -> dict | None:
    if not isinstance(payment_details, dict):
        return None
    pd_type = str(payment_details.get("type") or "").upper()
    if pd_type in ("AGREEMENT", "AGREEMENT_DISCOUNT"):
        ag = payment_details.get("agreement")
        return ag if isinstance(ag, dict) else None
    if pd_type == "MIXED":
        for item in payment_details.get("payments") or []:
            if isinstance(item, dict) and isinstance(item.get("agreement"), dict):
                return item["agreement"]
    return None


def _extract_payment_breakdown(payment_details) -> list[dict] | None:
    """Para pagos MIXED: retorna lista simplificada [{method, amount}] para el agente."""
    if not isinstance(payment_details, dict):
        return None
    if str(payment_details.get("type") or "").upper() != "MIXED":
        return None
    result = []
    for item in payment_details.get("payments") or []:
        if not isinstance(item, dict):
            continue
        name = item.get("payment_method_name") or item.get("payment_method_code") or ""
        amt = item.get("amount")
        if name and amt is not None:
            result.append({"method": name, "amount": str(amt)})
    return result or None


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or 0))
    except Exception:
        return Decimal("0")


def _enrich_agreement(agreement: dict | None, sale_total: Decimal) -> dict | None:
    """Agrega remaining_credit al dict de convenio si es de tipo CREDIT."""
    if not isinstance(agreement, dict):
        return agreement
    if str(agreement.get("agreement_type") or "").upper() != "CREDIT":
        return agreement
    benefit = _to_decimal(agreement.get("agreement_benefit_amount"))
    consumed = _to_decimal(agreement.get("beneficiary_consumed_amount"))
    remaining = max(benefit - consumed - sale_total, Decimal("0.00"))
    return {**agreement, "remaining_credit": str(remaining)}


def _build_sale_payload(sale: SaleDocument, lines: list[SaleDocumentLine], company: dict | None = None) -> dict:
    """Serializa los datos de la venta en el formato que consume el agente."""
    snap = sale.customer_snapshot or {}
    customer_name = (
        snap.get("customer_name") or
        snap.get("legal_name") or
        snap.get("name") or
        ""
    )
    sale_total = _to_decimal(sale.total_amount)
    agreement = _enrich_agreement(_extract_agreement(sale.payment_details), sale_total)

    is_exchange = sale.document_type_code == "EXCHANGE_DRAFT"
    is_return   = sale.document_type_code == "RETURN_TICKET"
    credit_lines = [l for l in lines if _to_decimal(l.paid_total_amount) < 0]
    dest_lines   = [l for l in lines if _to_decimal(l.paid_total_amount) >= 0]

    def _line_item(line):
        return {
            "name":             line.product_name,
            "quantity":         int(line.quantity or 0),
            "unit_price":       str(abs(_to_decimal(line.unit_price or 0))),
            "total":            str(abs(_to_decimal(line.paid_total_amount or 0))),
            "discount_percent": str(line.discount_percent or 0),
        }

    if is_exchange:
        display_subtotal = sum(_to_decimal(l.line_subtotal or 0) for l in dest_lines)
        display_tax      = sum(_to_decimal(l.tax_amount   or 0) for l in dest_lines)
        exchange_credit  = sum(abs(_to_decimal(l.paid_total_amount or 0)) for l in credit_lines)
    elif is_return:
        display_subtotal = sum(abs(_to_decimal(l.line_subtotal or 0)) for l in lines)
        display_tax      = sum(abs(_to_decimal(l.tax_amount   or 0)) for l in lines)
        exchange_credit  = None
    else:
        display_subtotal = _to_decimal(sale.subtotal_amount or 0)
        display_tax      = _to_decimal(sale.tax_amount or 0)
        exchange_credit  = None

    sale_date = sale.created_at.isoformat() if sale.created_at else datetime.now(timezone.utc).isoformat()

    payload = {
        "company":            company or {},
        "customer":           customer_name,
        "ticket_number":      sale.ticket_number,
        "sale_code":          sale.sale_code,
        "document_type":      sale.document_type_name,
        "sale_date":          sale_date,
        "items":              [_line_item(l) for l in dest_lines],
        "subtotal":           str(display_subtotal),
        "line_discount":      str(sale.line_discount_amount or 0),
        "document_discount":  str(sale.document_discount_amount or 0),
        "tax":                str(display_tax),
        "total":              str(abs(_to_decimal(sale.total_amount or 0))),
        "payment_method":     sale.payment_method_name,
        "payment_breakdown":  _extract_payment_breakdown(sale.payment_details),
        "amount_tendered":    str(sale.amount_tendered or 0),
        "change":             str(sale.change_amount or 0),
        "agreement_discount": str(sale.agreement_discount_amount or 0),
        "agreement":          agreement,
        "receipt_email":      sale.receipt_email,
    }
    if is_exchange:
        payload["exchange_credit_items"] = [_line_item(l) for l in credit_lines]
        payload["exchange_credit"]       = str(exchange_credit)
    if is_return:
        payload["return_items"]  = [_line_item(l) for l in lines]
        payload["refund_total"]  = str(sum(abs(_to_decimal(l.paid_total_amount or 0)) for l in lines))
    return payload
