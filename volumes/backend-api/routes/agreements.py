"""
Modulo de convenios comerciales y beneficiarios.
"""
import re
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Agreements"])


def money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def normalize_rut(value: str) -> str:
    return re.sub(r"[^0-9Kk]", "", value or "").upper()


def format_rut(value: str) -> str:
    rut = normalize_rut(value)
    if len(rut) < 2:
        return value
    body, verifier = rut[:-1], rut[-1]
    chunks, pos = [], 0
    for i in range(len(body), 0, -3):
        chunks.insert(0, body[max(0, i - 3):i])
    return f"{'.'.join(chunks)}-{verifier}"


def valid_rut(value: str) -> bool:
    rut = normalize_rut(value)
    if len(rut) < 2:
        return False
    body, verifier = rut[:-1], rut[-1]
    if not body.isdigit():
        return False
    total = 0
    factor = 2
    for digit in reversed(body):
        total += int(digit) * factor
        factor = 2 if factor == 7 else factor + 1
    expected = 11 - (total % 11)
    expected_digit = "0" if expected == 11 else "K" if expected == 10 else str(expected)
    return verifier == expected_digit


def row_to_dict(row) -> dict:
    item = dict(row)
    for key, val in item.items():
        if isinstance(val, Decimal):
            item[key] = float(val)
    for key in ("valid_from", "valid_to", "created_at", "updated_at", "last_consumed_at"):
        if key in item and item[key] is not None:
            item[key] = item[key].isoformat()
    item.pop("deleted_at", None)
    if "is_active" in item:
        item["is_active"] = bool(item["is_active"])
    if "single_purchase" in item:
        item["single_purchase"] = bool(item["single_purchase"])
    return item


class AgreementPayload(BaseModel):
    agreement_name: str = Field(..., min_length=2, max_length=180)
    agreement_type: str = Field(..., pattern="^(CREDIT|DISCOUNT)$")
    company_tax_id: str = Field(..., min_length=2, max_length=30)
    company_name: str = Field(..., min_length=2, max_length=180)
    valid_from: date
    valid_to: date | None = None
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100)
    benefit_amount: Decimal = Field(default=0, ge=0)
    single_purchase: bool = True
    is_active: bool = True

    @model_validator(mode="after")
    def validate_payload(self):
        if self.valid_to and self.valid_to < self.valid_from:
            raise ValueError("La fecha hasta no puede ser anterior a la fecha desde")
        if self.agreement_type == "DISCOUNT" and not self.discount_percent:
            raise ValueError("El porcentaje de descuento es obligatorio para convenios de descuento")
        if self.agreement_type == "CREDIT":
            self.discount_percent = None
        return self


class BeneficiaryPayload(BaseModel):
    identifier_type: str = Field(..., pattern="^(RUT|CODE)$")
    beneficiary_identifier: str = Field(..., min_length=2, max_length=80)
    beneficiary_name: str = Field(..., min_length=2, max_length=180)
    benefit_amount: Decimal | None = Field(default=None, ge=0)
    is_active: bool = True

    @model_validator(mode="after")
    def validate_identifier(self):
        if self.identifier_type == "RUT" and not valid_rut(self.beneficiary_identifier):
            raise ValueError("RUT de beneficiario invalido")
        if self.identifier_type == "RUT":
            self.beneficiary_identifier = format_rut(self.beneficiary_identifier)
        return self


@router.get("/", response_class=JSONResponse)
async def list_agreements(request: Request, active_only: bool = Query(False), user: dict = Depends(get_current_user)):
    clauses = ["1=1"]
    if active_only:
        clauses.append("is_active = 1")
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                "SELECT a.*, "
                "(SELECT COUNT(*) FROM agreement_beneficiaries b WHERE b.agreement_id = a.id) AS beneficiaries_count, "
                "(SELECT COALESCE(SUM(u.discount_amount), 0) FROM agreement_usage_records u WHERE u.agreement_id = a.id) AS consumed_amount "
                "FROM agreements a "
                f"WHERE {' AND '.join(clauses)} "
                "ORDER BY a.is_active DESC, a.valid_from DESC, a.agreement_name"
            )
        )
        return ResponseManager.success(data=[row_to_dict(row) for row in result.mappings().all()], request=request)


@router.post("/", response_class=JSONResponse)
async def create_agreement(payload: AgreementPayload, request: Request, user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        code_result = await session.execute(text("SELECT CONCAT('CONV-', LPAD(COALESCE(MAX(id), 0) + 1, 5, '0')) AS code FROM agreements"))
        agreement_code = code_result.mappings().first()["code"]
        await session.execute(
            text(
                "INSERT INTO agreements (agreement_code, agreement_name, agreement_type, company_tax_id, company_name, "
                "valid_from, valid_to, discount_percent, benefit_amount, single_purchase, is_active) "
                "VALUES (:agreement_code, :agreement_name, :agreement_type, :company_tax_id, :company_name, "
                ":valid_from, :valid_to, :discount_percent, :benefit_amount, :single_purchase, :is_active)"
            ),
            {
                **payload.model_dump(),
                "agreement_code": agreement_code,
                "benefit_amount": money(payload.benefit_amount),
                "single_purchase": 1 if payload.single_purchase else 0,
                "is_active": 1 if payload.is_active else 0,
            },
        )
        await session.flush()
        result = await session.execute(text("SELECT * FROM agreements WHERE agreement_code = :code"), {"code": agreement_code})
        return ResponseManager.success(data=row_to_dict(result.mappings().first()), message="Convenio creado", request=request)


@router.put("/{agreement_id}", response_class=JSONResponse)
async def update_agreement(payload: AgreementPayload, request: Request, agreement_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(text("SELECT id FROM agreements WHERE id = :id"), {"id": agreement_id})
        if not result.first():
            return ResponseManager.error(message="Convenio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        await session.execute(
            text(
                "UPDATE agreements SET agreement_name = :agreement_name, agreement_type = :agreement_type, company_tax_id = :company_tax_id, "
                "company_name = :company_name, valid_from = :valid_from, valid_to = :valid_to, discount_percent = :discount_percent, "
                "benefit_amount = :benefit_amount, single_purchase = :single_purchase, is_active = :is_active, updated_at = CURRENT_TIMESTAMP "
                "WHERE id = :id"
            ),
            {
                **payload.model_dump(),
                "id": agreement_id,
                "benefit_amount": money(payload.benefit_amount),
                "single_purchase": 1 if payload.single_purchase else 0,
                "is_active": 1 if payload.is_active else 0,
            },
        )
        result = await session.execute(text("SELECT * FROM agreements WHERE id = :id"), {"id": agreement_id})
        return ResponseManager.success(data=row_to_dict(result.mappings().first()), message="Convenio actualizado", request=request)


@router.delete("/{agreement_id}", response_class=JSONResponse)
async def delete_agreement(request: Request, agreement_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        exists = await session.execute(text("SELECT id FROM agreements WHERE id = :id"), {"id": agreement_id})
        if not exists.first():
            return ResponseManager.error(message="Convenio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        consumed = await session.execute(
            text("SELECT COUNT(*) FROM agreement_beneficiaries WHERE agreement_id = :id AND interactions_count > 0"),
            {"id": agreement_id},
        )
        if consumed.scalar() > 0:
            return ResponseManager.error(
                message="No se puede eliminar el convenio porque tiene beneficiarios que ya lo han utilizado",
                status_code=HTTPStatus.CONFLICT,
                error_code=ErrorCode.RESOURCE_CONFLICT,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        await session.execute(text("DELETE FROM agreements WHERE id = :id"), {"id": agreement_id})
        return ResponseManager.success(data={"id": agreement_id}, message="Convenio eliminado", request=request)


@router.get("/{agreement_id}/beneficiaries", response_class=JSONResponse)
async def list_beneficiaries(request: Request, agreement_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text("SELECT * FROM agreement_beneficiaries WHERE agreement_id = :id ORDER BY beneficiary_name"),
            {"id": agreement_id},
        )
        return ResponseManager.success(data=[row_to_dict(row) for row in result.mappings().all()], request=request)


@router.post("/{agreement_id}/beneficiaries", response_class=JSONResponse)
async def create_beneficiary(payload: BeneficiaryPayload, request: Request, agreement_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        try:
            await session.execute(
                text(
                    "INSERT INTO agreement_beneficiaries (agreement_id, identifier_type, beneficiary_identifier, beneficiary_name, benefit_amount, is_active) "
                    "VALUES (:agreement_id, :identifier_type, :beneficiary_identifier, :beneficiary_name, :benefit_amount, :is_active)"
                ),
                {
                    **payload.model_dump(),
                    "agreement_id": agreement_id,
                    "benefit_amount": money(payload.benefit_amount) if payload.benefit_amount is not None else None,
                    "is_active": 1 if payload.is_active else 0,
                },
            )
        except Exception as exc:
            if "Duplicate" in str(exc) or "duplicate" in str(exc):
                return ResponseManager.error(message="El beneficiario ya existe en este convenio", status_code=HTTPStatus.CONFLICT, error_code=ErrorCode.RESOURCE_CONFLICT, error_type=ErrorType.RESOURCE_ERROR, request=request)
            raise
        await session.flush()
        result = await session.execute(text("SELECT * FROM agreement_beneficiaries WHERE agreement_id = :id AND beneficiary_identifier = :identifier"), {"id": agreement_id, "identifier": payload.beneficiary_identifier})
        return ResponseManager.success(data=row_to_dict(result.mappings().first()), message="Beneficiario agregado", request=request)


@router.put("/{agreement_id}/beneficiaries/{beneficiary_id}", response_class=JSONResponse)
async def update_beneficiary(payload: BeneficiaryPayload, request: Request, agreement_id: int = Path(..., gt=0), beneficiary_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        await session.execute(
            text(
                "UPDATE agreement_beneficiaries SET identifier_type = :identifier_type, beneficiary_identifier = :beneficiary_identifier, "
                "beneficiary_name = :beneficiary_name, benefit_amount = :benefit_amount, is_active = :is_active, updated_at = CURRENT_TIMESTAMP "
                "WHERE id = :id AND agreement_id = :agreement_id"
            ),
            {
                **payload.model_dump(),
                "id": beneficiary_id,
                "agreement_id": agreement_id,
                "benefit_amount": money(payload.benefit_amount) if payload.benefit_amount is not None else None,
                "is_active": 1 if payload.is_active else 0,
            },
        )
        result = await session.execute(text("SELECT * FROM agreement_beneficiaries WHERE id = :id"), {"id": beneficiary_id})
        row = result.mappings().first()
        if not row:
            return ResponseManager.error(message="Beneficiario no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        return ResponseManager.success(data=row_to_dict(row), message="Beneficiario actualizado", request=request)


@router.delete("/{agreement_id}/beneficiaries/{beneficiary_id}", response_class=JSONResponse)
async def delete_beneficiary(request: Request, agreement_id: int = Path(..., gt=0), beneficiary_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        consumed = await session.execute(
            text("SELECT interactions_count FROM agreement_beneficiaries WHERE id = :id AND agreement_id = :agreement_id"),
            {"id": beneficiary_id, "agreement_id": agreement_id},
        )
        row = consumed.mappings().first()
        if not row:
            return ResponseManager.error(message="Beneficiario no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_NOT_FOUND, request=request)
        if row["interactions_count"] > 0:
            return ResponseManager.error(
                message="No se puede eliminar el beneficiario porque ya ha utilizado el convenio",
                status_code=HTTPStatus.CONFLICT,
                error_code=ErrorCode.RESOURCE_CONFLICT,
                error_type=ErrorType.RESOURCE_ERROR,
                request=request,
            )
        await session.execute(
            text("DELETE FROM agreement_beneficiaries WHERE id = :id AND agreement_id = :agreement_id"),
            {"id": beneficiary_id, "agreement_id": agreement_id},
        )
        return ResponseManager.success(data={"id": beneficiary_id}, message="Beneficiario eliminado", request=request)


@router.get("/usage/report", response_class=JSONResponse)
async def usage_report(request: Request, agreement_id: int | None = None, user: dict = Depends(get_current_user)):
    clauses = ["1=1"]
    params = {}
    if agreement_id:
        clauses.append("u.agreement_id = :agreement_id")
        params["agreement_id"] = agreement_id
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                "SELECT u.*, a.agreement_name, b.beneficiary_name "
                "FROM agreement_usage_records u "
                "LEFT JOIN agreements a ON a.id = u.agreement_id "
                "LEFT JOIN agreement_beneficiaries b ON b.id = u.agreement_beneficiary_id "
                f"WHERE {' AND '.join(clauses)} ORDER BY u.created_at DESC LIMIT 1000"
            ),
            params,
        )
        return ResponseManager.success(data=[row_to_dict(row) for row in result.mappings().all()], request=request)
