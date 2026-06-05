"""
Centro de notificaciones de usuario y catalogo de tipos emitibles.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Path, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from core.constants import ErrorCode, ErrorType, HTTPStatus
from core.response import ResponseManager
from database.database import db_manager
from utils.permissions_utils import get_current_user

router = APIRouter(tags=["Notifications"])


def _has_any_permission(user: dict, permissions: list[str]) -> bool:
    user_permissions = {str(permission).upper() for permission in user.get("permissions", [])}
    return any(permission.upper() in user_permissions for permission in permissions)


async def require_notifications_read(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["NOTIFICATIONS_ACCESS"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


async def require_notification_types_write(request: Request) -> dict:
    user = await get_current_user(request)
    if _has_any_permission(user, ["NOTIFICATIONS_MANAGE_TYPES"]):
        return user
    from fastapi import HTTPException
    import json
    response = ResponseManager.error(message="Acceso denegado", status_code=HTTPStatus.FORBIDDEN, error_code=ErrorCode.PERMISSION_DENIED, error_type=ErrorType.PERMISSION_ERROR, request=request)
    raise HTTPException(status_code=HTTPStatus.FORBIDDEN, detail=json.loads(response.body.decode("utf-8")))


def _user_id(user: dict) -> int:
    return int(user.get("user_id") or user.get("id"))


def _json_value(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _row(row):
    return {key: _json_value(value) for key, value in row.items()}


def _selected_ids(payload: dict) -> list[int]:
    values = payload.get("ids") or []
    ids = []
    for value in values:
        try:
            item_id = int(value)
        except (TypeError, ValueError):
            continue
        if item_id > 0 and item_id not in ids:
            ids.append(item_id)
    return ids


def _ids_where(ids: list[int]) -> tuple[str, dict]:
    params = {}
    placeholders = []
    for index, item_id in enumerate(ids):
        key = f"id_{index}"
        placeholders.append(f":{key}")
        params[key] = item_id
    return ", ".join(placeholders), params


@router.get("/summary", response_class=JSONResponse)
async def summary(request: Request, user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        unread = await session.execute(
            text("SELECT COUNT(*) FROM user_notifications WHERE user_id = :user_id AND is_read = FALSE AND deleted_at IS NULL"),
            {"user_id": _user_id(user)},
        )
        latest = await session.execute(
            text(
                """
                SELECT un.*, nt.type_code, nt.type_name, nt.severity, nt.icon_name
                FROM user_notifications un
                JOIN notification_types nt ON nt.id = un.notification_type_id
                WHERE un.user_id = :user_id
                  AND un.deleted_at IS NULL
                  AND (un.expires_at IS NULL OR un.expires_at > CURRENT_TIMESTAMP)
                ORDER BY un.delivered_at DESC, un.id DESC
                LIMIT 5
                """
            ),
            {"user_id": _user_id(user)},
        )
        return ResponseManager.success(data={"unread_count": unread.scalar_one(), "latest": [_row(item) for item in latest.mappings().all()]}, request=request)


@router.get("/", response_class=JSONResponse)
async def list_notifications(
    request: Request,
    user: dict = Depends(require_notifications_read),
    unread_only: bool = Query(False),
    source: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    async with db_manager.get_async_session() as session:
        where = "un.user_id = :user_id AND un.deleted_at IS NULL"
        params = {"user_id": _user_id(user), "limit": limit}
        if unread_only:
            where += " AND un.is_read = FALSE"
        if source:
            where += " AND COALESCE(un.source_label, un.source_table, 'Sistema') = :source"
            params["source"] = source
        result = await session.execute(
            text(
                f"""
                SELECT un.*, nt.type_code, nt.type_name, nt.severity, nt.icon_name
                FROM user_notifications un
                JOIN notification_types nt ON nt.id = un.notification_type_id
                WHERE {where}
                ORDER BY un.delivered_at DESC, un.id DESC
                LIMIT :limit
                """
            ),
            params,
        )
        return ResponseManager.success(data=[_row(item) for item in result.mappings().all()], request=request)


@router.get("/sources", response_class=JSONResponse)
async def list_sources(request: Request, user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT DISTINCT COALESCE(source_label, source_table, 'Sistema') AS source
                FROM user_notifications
                WHERE user_id = :user_id AND deleted_at IS NULL
                ORDER BY source
                """
            ),
            {"user_id": _user_id(user)},
        )
        return ResponseManager.success(data=[item["source"] for item in result.mappings().all() if item["source"]], request=request)


@router.get("/types/catalog", response_class=JSONResponse)
async def list_types(request: Request, user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text("SELECT * FROM notification_types WHERE deleted_at IS NULL ORDER BY type_code")
        )
        return ResponseManager.success(data=[_row(item) for item in result.mappings().all()], request=request)


@router.post("/types/catalog", response_class=JSONResponse)
async def create_type(payload: dict, request: Request, user: dict = Depends(require_notification_types_write)):
    data = {
        "type_code": str(payload.get("type_code", "")).strip().upper(),
        "type_name": payload.get("type_name"),
        "type_description": payload.get("type_description"),
        "severity": payload.get("severity", "INFO"),
        "icon_name": payload.get("icon_name"),
        "default_action_label": payload.get("default_action_label"),
        "is_user_visible": payload.get("is_user_visible", True),
        "is_active": payload.get("is_active", True),
    }
    if not data["type_code"] or not data["type_name"]:
        return ResponseManager.error(message="Codigo y nombre son requeridos", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
    async with db_manager.get_async_session() as session:
        await session.execute(
            text(
                """
                INSERT INTO notification_types (
                  type_code, type_name, type_description, severity, icon_name,
                  default_action_label, is_user_visible, is_active
                ) VALUES (
                  :type_code, :type_name, :type_description, :severity, :icon_name,
                  :default_action_label, :is_user_visible, :is_active
                )
                """
            ),
            data,
        )
        await session.commit()
        return ResponseManager.success(data=data, message="Tipo de notificacion creado", request=request)


@router.get("/{notification_id}", response_class=JSONResponse)
async def get_notification(request: Request, notification_id: int = Path(..., gt=0), user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        result = await session.execute(
            text(
                """
                SELECT un.*, nt.type_code, nt.type_name, nt.severity, nt.icon_name
                FROM user_notifications un
                JOIN notification_types nt ON nt.id = un.notification_type_id
                WHERE un.id = :id AND un.user_id = :user_id AND un.deleted_at IS NULL
                """
            ),
            {"id": notification_id, "user_id": _user_id(user)},
        )
        notification = result.mappings().first()
        if not notification:
            return ResponseManager.error(message="Notificacion no encontrada", status_code=HTTPStatus.NOT_FOUND, error_code=ErrorCode.RESOURCE_NOT_FOUND, error_type=ErrorType.RESOURCE_ERROR, request=request)
        await session.execute(
            text("UPDATE user_notifications SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = :id"),
            {"id": notification_id},
        )
        await session.commit()
        return ResponseManager.success(data=_row(notification), request=request)


@router.put("/{notification_id}/read", response_class=JSONResponse)
async def mark_read(request: Request, notification_id: int = Path(..., gt=0), user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        await session.execute(
            text("UPDATE user_notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id = :user_id"),
            {"id": notification_id, "user_id": _user_id(user)},
        )
        await session.commit()
        return ResponseManager.success(data={"id": notification_id}, message="Notificacion marcada como leida", request=request)


@router.put("/read-all", response_class=JSONResponse)
async def mark_all_read(request: Request, user: dict = Depends(require_notifications_read)):
    async with db_manager.get_async_session() as session:
        await session.execute(
            text("UPDATE user_notifications SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE user_id = :user_id AND is_read = FALSE"),
            {"user_id": _user_id(user)},
        )
        await session.commit()
        return ResponseManager.success(data={"read_at": datetime.now(timezone.utc).isoformat()}, message="Notificaciones marcadas como leidas", request=request)


@router.put("/bulk-action", response_class=JSONResponse)
async def bulk_action(payload: dict, request: Request, user: dict = Depends(require_notifications_read)):
    action = str(payload.get("action", "")).strip().lower()
    scope = str(payload.get("scope", "selected")).strip().lower()
    allowed_actions = {"read", "unread", "delete"}
    if action not in allowed_actions:
        return ResponseManager.error(message="Accion no soportada", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_FORMAT, error_type=ErrorType.VALIDATION_ERROR, request=request)

    params = {"user_id": _user_id(user)}
    where = "user_id = :user_id AND deleted_at IS NULL"
    if scope != "all":
        ids = _selected_ids(payload)
        if not ids:
            return ResponseManager.error(message="Selecciona al menos una notificacion", status_code=HTTPStatus.BAD_REQUEST, error_code=ErrorCode.VALIDATION_FIELD_REQUIRED, error_type=ErrorType.VALIDATION_ERROR, request=request)
        ids_sql, ids_params = _ids_where(ids)
        params.update(ids_params)
        where += f" AND id IN ({ids_sql})"

    statements = {
        "read": f"UPDATE user_notifications SET is_read = TRUE, read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE {where}",
        "unread": f"UPDATE user_notifications SET is_read = FALSE, read_at = NULL WHERE {where}",
        "delete": f"UPDATE user_notifications SET deleted_at = CURRENT_TIMESTAMP WHERE {where}",
    }
    messages = {
        "read": "Notificaciones marcadas como leidas",
        "unread": "Notificaciones marcadas como no leidas",
        "delete": "Notificaciones eliminadas",
    }
    async with db_manager.get_async_session() as session:
        result = await session.execute(text(statements[action]), params)
        await session.commit()
        return ResponseManager.success(data={"affected": result.rowcount or 0, "scope": scope, "action": action}, message=messages[action], request=request)
