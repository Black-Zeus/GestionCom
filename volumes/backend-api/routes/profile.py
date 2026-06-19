"""
Modulo de perfil y carga sanitizada de imagenes.
"""
from datetime import datetime, timezone

from io import BytesIO
import logging

from fastapi import APIRouter, Depends, File, Path, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from services.media_storage import media_storage
from utils.permissions_utils import get_current_user
from utils.phone import normalize_phone_for_storage

router = APIRouter(tags=["Profile"])
logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _user_id(user: dict) -> int:
    return int(user.get("user_id") or user.get("id"))


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_profile(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PROFILE_ACCESS"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def _json_value(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _row(row):
    return {key: _json_value(value) for key, value in row.items()} if row else None


def _asset_urls(asset: dict | None) -> dict | None:
    return media_storage.safe_asset(asset)


async def _read_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise ValueError("Solo se permiten imagenes JPG, PNG o WebP")
    content = await file.read()
    if not content:
        raise ValueError("Archivo vacio")
    if len(content) > MAX_IMAGE_BYTES:
        raise ValueError("La imagen no puede superar 5 MB")
    return content


async def _create_media_asset(session, *, owner_type: str, owner_id: int, media_role: str, profile: str, file: UploadFile, uploaded_by: int, replace_existing: bool = True) -> dict:
    content = await _read_image(file)
    stored = media_storage.upload_image(content=content, profile=profile, owner_type=owner_type, owner_id=owner_id, role=media_role)
    params = {
        **stored,
        "owner_type": owner_type,
        "owner_id": owner_id,
        "media_role": media_role,
        "file_name": file.filename,
        "uploaded_by_user_id": uploaded_by,
    }
    if replace_existing:
        await session.execute(
            text(
                """
                UPDATE media_assets
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE owner_type = :owner_type AND owner_id = :owner_id AND media_role = :media_role AND deleted_at IS NULL
                """
            ),
            params,
        )
    await session.execute(
        text(
            """
            INSERT INTO media_assets (
              media_code, owner_type, owner_id, media_role, bucket_name,
              object_key_full, object_key_thumb, file_name, mime_type,
              full_width, full_height, thumb_width, thumb_height,
              full_size_bytes, thumb_size_bytes, uploaded_by_user_id
            ) VALUES (
              :media_code, :owner_type, :owner_id, :media_role, :bucket_name,
              :object_key_full, :object_key_thumb, :file_name, :mime_type,
              :full_width, :full_height, :thumb_width, :thumb_height,
              :full_size_bytes, :thumb_size_bytes, :uploaded_by_user_id
            )
            """
        ),
        params,
    )
    result = await session.execute(text("SELECT * FROM media_assets WHERE id = LAST_INSERT_ID()"))
    return _row(result.mappings().first())


async def _get_asset(session, asset_id):
    if not asset_id:
        return None
    result = await session.execute(text("SELECT * FROM media_assets WHERE id = :id AND deleted_at IS NULL"), {"id": asset_id})
    return _row(result.mappings().first())


@router.get("/media/{media_code}/{variant}")
async def get_media(media_code: str = Path(...), variant: str = Path(...)):
    normalized_variant = variant.strip().lower()
    if normalized_variant not in {"full", "thumb"}:
        return ResponseManager.error(
            message="Variante de media no valida",
            status_code=HTTPStatus.BAD_REQUEST,
            error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
            error_type=ErrorType.VALIDATION_ERROR,
        )

    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT media_code, object_key_full, object_key_thumb, mime_type
                FROM media_assets
                WHERE media_code = :media_code AND deleted_at IS NULL
                LIMIT 1
                """
            ),
            {"media_code": media_code.strip()},
        )
        asset = _row(result.mappings().first())

    if not asset:
        return ResponseManager.error(
            message="Media no encontrada",
            status_code=HTTPStatus.NOT_FOUND,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            error_type=ErrorType.RESOURCE_ERROR,
        )

    object_key = asset["object_key_thumb"] if normalized_variant == "thumb" else asset["object_key_full"]
    try:
        content = media_storage.get_object_bytes(object_key)
    except Exception:
        return ResponseManager.error(
            message="Media no disponible",
            status_code=HTTPStatus.NOT_FOUND,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            error_type=ErrorType.RESOURCE_ERROR,
        )

    return StreamingResponse(
        BytesIO(content),
        media_type=asset.get("mime_type") or "image/webp",
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/me", response_class=JSONResponse)
async def get_profile(request: Request, user: dict = Depends(require_profile)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
                       u.last_login_at, u.last_login_ip, u.password_changed_at,
                       u.avatar_media_asset_id, up.theme, up.timezone, up.hour_format, up.table_page_size
                FROM users u
                LEFT JOIN user_preferences up ON up.user_id = u.id
                WHERE u.id = :user_id AND u.deleted_at IS NULL
                """
            ),
            {"user_id": _user_id(user)},
        )
        profile = _row(result.mappings().first())
        if not profile:
            return ResponseManager.error(message="Perfil no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        asset = await _get_asset(session, profile.get("avatar_media_asset_id"))
        profile["full_name"] = f"{profile.get('first_name') or ''} {profile.get('last_name') or ''}".strip()
        profile["avatar"] = _asset_urls(asset)
        profile["preferences"] = {
            "theme": profile.pop("theme", None),
            "timezone": profile.pop("timezone", None),
            "hour_format": profile.pop("hour_format", None),
            "table_page_size": profile.pop("table_page_size", None),
        }
        return ResponseManager.success(data=profile, request=request)


@router.put("/me", response_class=JSONResponse)
async def update_profile(payload: dict, request: Request, user: dict = Depends(require_profile)):
    try:
        phone = normalize_phone_for_storage(payload.get("phone"))
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

    data = {
        "first_name": str(payload.get("first_name", "")).strip(),
        "last_name": str(payload.get("last_name", "")).strip(),
        "phone": phone,
        "user_id": _user_id(user),
    }
    if not data["first_name"] or not data["last_name"]:
        return ResponseManager.error(message="Nombre y apellido son requeridos", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    async with db_manager.get_async_session() as session:
        await session.execute(text("UPDATE users SET first_name = :first_name, last_name = :last_name, phone = :phone WHERE id = :user_id"), data)
        await session.commit()
        return ResponseManager.success(data={"updated_at": datetime.now(timezone.utc).isoformat()}, message="Perfil actualizado", request=request)


@router.put("/preferences", response_class=JSONResponse)
async def update_preferences(payload: dict, request: Request, user: dict = Depends(require_profile)):
    hour_format = str(payload.get("hour_format") or "24h").strip().lower()
    if hour_format not in {"24h", "12h"}:
        return ResponseManager.error(message="Formato horario no valido", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

    data = {
        "user_id": _user_id(user),
        "theme": payload.get("theme"),
        "timezone": payload.get("timezone"),
        "hour_format": hour_format,
        "table_page_size": int(payload["table_page_size"]) if payload.get("table_page_size") else None,
    }
    async with db_manager.get_async_session() as session:
        await session.execute(
            text(
                """
                INSERT INTO user_preferences (user_id, theme, timezone, hour_format, table_page_size)
                VALUES (:user_id, :theme, :timezone, :hour_format, :table_page_size)
                ON DUPLICATE KEY UPDATE theme = VALUES(theme), timezone = VALUES(timezone), hour_format = VALUES(hour_format), table_page_size = VALUES(table_page_size)
                """
            ),
            data,
        )
        await session.commit()
        return ResponseManager.success(data=data, message="Preferencias actualizadas", request=request)


@router.get("/sessions", response_class=JSONResponse)
async def list_sessions(request: Request, user: dict = Depends(require_profile)):
    data = [{
        "id": "current",
        "device": request.headers.get("user-agent", "Navegador actual"),
        "ip_address": request.client.host if request.client else None,
        "status": "ACTIVE",
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
        "is_current": True,
    }]
    return ResponseManager.success(data=data, request=request)


@router.get("/access-history", response_class=JSONResponse)
async def list_access_history(request: Request, user: dict = Depends(require_profile)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT
                  id,
                  session_id,
                  login_at,
                  logout_at,
                  last_seen_at,
                  login_method,
                  logout_method,
                  ip_address,
                  user_agent,
                  browser_name,
                  browser_version,
                  os_name,
                  device_type,
                  client_timezone,
                  client_language,
                  client_platform,
                  client_vendor,
                  hardware_concurrency,
                  is_active
                FROM user_session_history
                WHERE user_id = :user_id
                ORDER BY login_at DESC, id DESC
                LIMIT 100
                """
            ),
            {"user_id": _user_id(user)},
        )
        rows = [_row(row) for row in result.mappings().all()]
        return ResponseManager.success(data=rows, request=request)


@router.post("/avatar", response_class=JSONResponse)
async def upload_avatar(request: Request, file: UploadFile = File(...), user: dict = Depends(require_profile)):
    try:
        async with db_manager.get_async_session() as session:
            asset = await _create_media_asset(session, owner_type="USER", owner_id=_user_id(user), media_role="AVATAR", profile="avatar", file=file, uploaded_by=_user_id(user))
            await session.execute(text("UPDATE users SET avatar_media_asset_id = :asset_id WHERE id = :user_id"), {"asset_id": asset["id"], "user_id": _user_id(user)})
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Avatar actualizado", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.post("/companies/{company_id}/{media_role}", response_class=JSONResponse)
async def upload_company_media(request: Request, company_id: int = Path(..., gt=0), media_role: str = Path(...), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["COMPANY_CONFIG_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    role = media_role.strip().upper()
    if role not in {"LOGO", "BANNER"}:
        return ResponseManager.error(message="Tipo de media invalido", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            asset = await _create_media_asset(session, owner_type="COMPANY", owner_id=company_id, media_role=role, profile=role.lower(), file=file, uploaded_by=_user_id(user))
            column = "logo_media_asset_id" if role == "LOGO" else "banner_media_asset_id"
            await session.execute(text(f"UPDATE dte_company_config SET {column} = :asset_id WHERE id = :company_id"), {"asset_id": asset["id"], "company_id": company_id})
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de empresa actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.post("/products/{product_id}/image", response_class=JSONResponse)
async def upload_product_image(request: Request, product_id: int = Path(..., gt=0), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["PRODUCTS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            product = await session.execute(text("SELECT id FROM products WHERE id = :product_id AND deleted_at IS NULL"), {"product_id": product_id})
            if not product.mappings().first():
                return ResponseManager.error(message="Producto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            try:
                asset = await _create_media_asset(session, owner_type="PRODUCT", owner_id=product_id, media_role="PRODUCT_IMAGE", profile="product", file=file, uploaded_by=_user_id(user))
            except ValueError as exc:
                return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
            except Exception as exc:
                logger.exception("No fue posible procesar imagen de producto %s", product_id)
                return ResponseManager.error(message="No fue posible procesar la imagen de producto.", status_code=HTTPStatus.INTERNAL_SERVER_ERROR, error_code=ErrorCode.SYSTEM_INTERNAL_ERROR, error_type=ErrorType.SYSTEM_ERROR, request=request)
            await session.execute(text("UPDATE products SET primary_image_media_asset_id = :asset_id WHERE id = :product_id"), {"asset_id": asset["id"], "product_id": product_id})
            await session.execute(text("UPDATE product_media SET deleted_at = CURRENT_TIMESTAMP, is_primary = FALSE WHERE product_id = :product_id AND deleted_at IS NULL"), {"product_id": product_id})
            await session.execute(
                text(
                    """
                    INSERT INTO product_media (
                      product_id, media_asset_id, media_type, storage_provider,
                      bucket_name, object_key, file_name, mime_type,
                      file_size_bytes, is_primary, sort_order, uploaded_by_user_id
                    ) VALUES (
                      :product_id, :media_asset_id, 'IMAGE', 'MINIO',
                      :bucket_name, :object_key, :file_name, :mime_type,
                      :file_size_bytes, TRUE, 0, :uploaded_by_user_id
                    )
                    """
                ),
                {
                    "product_id": product_id,
                    "media_asset_id": asset["id"],
                    "bucket_name": asset.get("bucket_name"),
                    "object_key": asset.get("object_key_full"),
                    "file_name": asset.get("file_name"),
                    "mime_type": asset.get("mime_type"),
                    "file_size_bytes": asset.get("full_size_bytes"),
                    "uploaded_by_user_id": _user_id(user),
                },
            )
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de producto actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.delete("/products/{product_id}/image", response_class=JSONResponse)
async def delete_product_image(request: Request, product_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["PRODUCTS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    async with db_manager.get_async_session() as session:
        product = await session.execute(
            text("SELECT id, primary_image_media_asset_id FROM products WHERE id = :product_id AND deleted_at IS NULL"),
            {"product_id": product_id},
        )
        row = product.mappings().first()
        if not row:
            return ResponseManager.error(message="Producto no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)

        await session.execute(text("UPDATE products SET primary_image_media_asset_id = NULL WHERE id = :product_id"), {"product_id": product_id})
        await session.execute(text("UPDATE product_media SET deleted_at = CURRENT_TIMESTAMP, is_primary = FALSE WHERE product_id = :product_id AND deleted_at IS NULL"), {"product_id": product_id})
        await session.execute(
            text(
                """
                UPDATE media_assets
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE owner_type = 'PRODUCT'
                  AND owner_id = :product_id
                  AND media_role = 'PRODUCT_IMAGE'
                  AND deleted_at IS NULL
                """
            ),
            {"product_id": product_id},
        )
        await session.commit()
        return ResponseManager.success(data={"product_id": product_id, "primary_image": None}, message="Imagen de producto removida", request=request)


@router.post("/product-variants/{variant_id}/image", response_class=JSONResponse)
async def upload_variant_image(request: Request, variant_id: int = Path(..., gt=0), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["PRODUCTS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            row = (await session.execute(text("SELECT id FROM product_variants WHERE id = :variant_id AND deleted_at IS NULL"), {"variant_id": variant_id})).mappings().first()
            if not row:
                return ResponseManager.error(message="Variante no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            try:
                asset = await _create_media_asset(session, owner_type="PRODUCT_VARIANT", owner_id=variant_id, media_role="VARIANT_IMAGE", profile="product", file=file, uploaded_by=_user_id(user))
            except ValueError as exc:
                return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
            except Exception:
                logger.exception("No fue posible procesar imagen de variante %s", variant_id)
                return ResponseManager.error(message="No fue posible procesar la imagen de variante.", status_code=HTTPStatus.INTERNAL_SERVER_ERROR, error_code=ErrorCode.SYSTEM_INTERNAL_ERROR, error_type=ErrorType.SYSTEM_ERROR, request=request)
            await session.execute(
                text("UPDATE product_variants SET primary_image_media_asset_id = :asset_id, image_mode = 'own' WHERE id = :variant_id"),
                {"asset_id": asset["id"], "variant_id": variant_id},
            )
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de variante actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.delete("/product-variants/{variant_id}/image", response_class=JSONResponse)
async def delete_variant_image(request: Request, variant_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["PRODUCTS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    async with db_manager.get_async_session() as session:
        row = (await session.execute(
            text("SELECT id, primary_image_media_asset_id FROM product_variants WHERE id = :variant_id AND deleted_at IS NULL"),
            {"variant_id": variant_id},
        )).mappings().first()
        if not row:
            return ResponseManager.error(message="Variante no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        await session.execute(
            text("UPDATE product_variants SET primary_image_media_asset_id = NULL WHERE id = :variant_id"),
            {"variant_id": variant_id},
        )
        await session.execute(
            text("UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE owner_type = 'PRODUCT_VARIANT' AND owner_id = :variant_id AND media_role = 'VARIANT_IMAGE' AND deleted_at IS NULL"),
            {"variant_id": variant_id},
        )
        await session.commit()
        return ResponseManager.success(data={"variant_id": variant_id, "primary_image": None}, message="Imagen de variante removida", request=request)


@router.post("/agreements/{agreement_id}/logo", response_class=JSONResponse)
async def upload_agreement_logo(request: Request, agreement_id: int = Path(..., gt=0), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    try:
        async with db_manager.get_async_session() as session:
            row = (await session.execute(text("SELECT id FROM agreements WHERE id = :id"), {"id": agreement_id})).mappings().first()
            if not row:
                return ResponseManager.error(message="Convenio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
            try:
                asset = await _create_media_asset(session, owner_type="AGREEMENT", owner_id=agreement_id, media_role="LOGO", profile="logo", file=file, uploaded_by=_user_id(user))
            except ValueError as exc:
                return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
            except Exception:
                logger.exception("No fue posible procesar logo del convenio %s", agreement_id)
                return ResponseManager.error(message="No fue posible procesar el logo del convenio.", status_code=HTTPStatus.INTERNAL_SERVER_ERROR, error_code=ErrorCode.SYSTEM_INTERNAL_ERROR, error_type=ErrorType.SYSTEM_ERROR, request=request)
            await session.execute(
                text("UPDATE agreements SET logo_media_asset_id = :asset_id WHERE id = :id"),
                {"asset_id": asset["id"], "id": agreement_id},
            )
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Logo del convenio actualizado", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.delete("/agreements/{agreement_id}/logo", response_class=JSONResponse)
async def delete_agreement_logo(request: Request, agreement_id: int = Path(..., gt=0), user: dict = Depends(get_current_user)):
    async with db_manager.get_async_session() as session:
        row = (await session.execute(
            text("SELECT id, logo_media_asset_id FROM agreements WHERE id = :id"),
            {"id": agreement_id},
        )).mappings().first()
        if not row:
            return ResponseManager.error(message="Convenio no encontrado", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        await session.execute(
            text("UPDATE agreements SET logo_media_asset_id = NULL WHERE id = :id"),
            {"id": agreement_id},
        )
        await session.execute(
            text("UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP WHERE owner_type = 'AGREEMENT' AND owner_id = :agreement_id AND media_role = 'LOGO' AND deleted_at IS NULL"),
            {"agreement_id": agreement_id},
        )
        await session.commit()
        return ResponseManager.success(data={"agreement_id": agreement_id, "logo": None}, message="Logo del convenio removido", request=request)


@router.post("/customers/{customer_id}/{media_role}", response_class=JSONResponse)
async def upload_customer_media(request: Request, customer_id: int = Path(..., gt=0), media_role: str = Path(...), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["FOUNDATION_MAINTAINERS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    role = media_role.strip().upper()
    if role not in {"LOGO", "BANNER"}:
        return ResponseManager.error(message="Tipo de media invalido", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            asset = await _create_media_asset(session, owner_type="CUSTOMER", owner_id=customer_id, media_role=role, profile=role.lower(), file=file, uploaded_by=_user_id(user))
            column = "logo_media_asset_id" if role == "LOGO" else "banner_media_asset_id"
            await session.execute(text(f"UPDATE customers SET {column} = :asset_id WHERE id = :customer_id"), {"asset_id": asset["id"], "customer_id": customer_id})
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de cliente actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)


@router.post("/suppliers/{supplier_id}/{media_role}", response_class=JSONResponse)
async def upload_supplier_media(request: Request, supplier_id: int = Path(..., gt=0), media_role: str = Path(...), file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not _has_any_permission(user, ["FOUNDATION_MAINTAINERS_MANAGE"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    role = media_role.strip().upper()
    if role not in {"LOGO", "BANNER"}:
        return ResponseManager.error(message="Tipo de media invalido", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            asset = await _create_media_asset(session, owner_type="SUPPLIER", owner_id=supplier_id, media_role=role, profile=role.lower(), file=file, uploaded_by=_user_id(user))
            column = "logo_media_asset_id" if role == "LOGO" else "banner_media_asset_id"
            await session.execute(text(f"UPDATE suppliers SET {column} = :asset_id WHERE id = :supplier_id"), {"asset_id": asset["id"], "supplier_id": supplier_id})
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de proveedor actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
