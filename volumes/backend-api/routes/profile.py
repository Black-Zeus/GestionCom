"""
Modulo de perfil y carga sanitizada de imagenes.
"""
from datetime import datetime, timezone

from io import BytesIO

from fastapi import APIRouter, Depends, File, Path, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from services.media_storage import media_storage
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Profile"])

MAX_IMAGE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _user_id(user: dict) -> int:
    return int(user.get("user_id") or user.get("id"))


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_profile(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["PROFILE_ACCESS", "SYSTEM_CONFIG"]):
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


async def _create_media_asset(session, *, owner_type: str, owner_id: int, media_role: str, profile: str, file: UploadFile, uploaded_by: int) -> dict:
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
                       u.avatar_media_asset_id, up.theme, up.timezone, up.table_page_size
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
            "table_page_size": profile.pop("table_page_size", None),
        }
        return ResponseManager.success(data=profile, request=request)


@router.put("/me", response_class=JSONResponse)
async def update_profile(payload: dict, request: Request, user: dict = Depends(require_profile)):
    data = {
        "first_name": str(payload.get("first_name", "")).strip(),
        "last_name": str(payload.get("last_name", "")).strip(),
        "phone": str(payload.get("phone", "")).strip() or None,
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
    data = {
        "user_id": _user_id(user),
        "theme": payload.get("theme"),
        "timezone": payload.get("timezone"),
        "table_page_size": int(payload["table_page_size"]) if payload.get("table_page_size") else None,
    }
    async with db_manager.get_async_session() as session:
        await session.execute(
            text(
                """
                INSERT INTO user_preferences (user_id, theme, timezone, table_page_size)
                VALUES (:user_id, :theme, :timezone, :table_page_size)
                ON DUPLICATE KEY UPDATE theme = VALUES(theme), timezone = VALUES(timezone), table_page_size = VALUES(table_page_size)
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
    if not _has_any_permission(user, ["COMPANY_CONFIG_MANAGE", "SYSTEM_CONFIG"]):
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
    if not _has_any_permission(user, ["PRODUCTS_MANAGE", "SYSTEM_CONFIG"]):
        return ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    try:
        async with db_manager.get_async_session() as session:
            asset = await _create_media_asset(session, owner_type="PRODUCT", owner_id=product_id, media_role="PRODUCT_IMAGE", profile="product", file=file, uploaded_by=_user_id(user))
            await session.execute(text("UPDATE products SET primary_image_media_asset_id = :asset_id WHERE id = :product_id"), {"asset_id": asset["id"], "product_id": product_id})
            await session.commit()
            return ResponseManager.success(data=_asset_urls(asset), message="Imagen de producto actualizada", request=request)
    except ValueError as exc:
        return ResponseManager.error(message=str(exc), status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)
