import asyncio
import json
import os
import urllib.error
import urllib.request
from functools import partial
from typing import Any, Dict, Iterable, Optional

from utils.log_helper import setup_logger

logger = setup_logger(__name__)

DEFAULT_ORCHESTRATOR_URL = "http://events-orchestrator:8040"


def _setting(name: str, default: str = "") -> str:
    value = os.getenv(name, default)
    if not value or "${" in value:
        return default
    return value


def _orchestrator_url() -> str:
    return _setting("EVENTS_ORCHESTRATOR_URL", DEFAULT_ORCHESTRATOR_URL).rstrip("/")


def _post_json(url: str, payload: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            **(headers or {}),
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=2) as response:
        response_payload = response.read().decode("utf-8")
        return json.loads(response_payload) if response_payload else {}


async def publish_event(
    event_type: str,
    *,
    payload: Optional[Dict[str, Any]] = None,
    user_ids: Optional[Iterable[int]] = None,
    role_codes: Optional[Iterable[str]] = None,
    broadcast: bool = False,
    scope: str = "user",
    ttl_seconds: Optional[int] = None,
    dedupe_key: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    target = {
        "user_ids": [int(user_id) for user_id in user_ids or []],
        "role_codes": [str(role_code).upper() for role_code in role_codes or []],
        "broadcast": broadcast,
    }
    event_payload: Dict[str, Any] = {
        "type": event_type,
        "scope": scope,
        "target": target,
        "payload": payload or {},
    }

    if ttl_seconds is not None:
        event_payload["ttl_seconds"] = ttl_seconds
    if dedupe_key:
        event_payload["dedupe_key"] = dedupe_key

    headers = {}
    publish_token = _setting("EVENTS_PUBLISH_TOKEN")
    if publish_token:
        headers["X-Events-Token"] = publish_token

    try:
        return await asyncio.to_thread(
            _post_json,
            f"{_orchestrator_url()}/events/publish",
            event_payload,
            headers,
        )
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        logger.warning(f"No fue posible publicar evento SSE {event_type}: {error}")
        return None


async def publish_permissions_refresh(user_ids: Iterable[int], reason: str, payload: Optional[Dict[str, Any]] = None):
    normalized_ids = [int(user_id) for user_id in user_ids if user_id]
    if not normalized_ids:
        return None

    return await publish_event(
        "permissions.v1.refresh_requested",
        user_ids=normalized_ids,
        ttl_seconds=60,
        dedupe_key=f"permissions-refresh:{'-'.join(map(str, sorted(normalized_ids)))}:{reason}",
        payload={
            "reason": reason,
            **(payload or {}),
        },
    )


async def publish_role_permissions_refresh(role_codes: Iterable[str], reason: str, payload: Optional[Dict[str, Any]] = None):
    normalized_roles = sorted({str(role_code).upper() for role_code in role_codes if str(role_code).strip()})
    if not normalized_roles:
        return None

    return await publish_event(
        "permissions.v1.refresh_requested",
        role_codes=normalized_roles,
        scope="role",
        ttl_seconds=60,
        dedupe_key=f"permissions-refresh:roles:{'-'.join(normalized_roles)}:{reason}",
        payload={
            "reason": reason,
            **(payload or {}),
        },
    )


def queue_event(coro_factory):
    def log_task_result(task: asyncio.Task):
        try:
            task.result()
        except Exception as error:
            logger.warning(f"Publicacion SSE en background fallo: {error}")

    try:
        task = asyncio.create_task(coro_factory())
        task.add_done_callback(log_task_result)
    except RuntimeError:
        logger.warning("No fue posible encolar evento SSE: no hay event loop activo")


def queue_permissions_refresh(user_ids: Iterable[int], reason: str, payload: Optional[Dict[str, Any]] = None):
    ids = [int(user_id) for user_id in user_ids if user_id]
    queue_event(partial(publish_permissions_refresh, ids, reason, payload))


def queue_role_permissions_refresh(role_codes: Iterable[str], reason: str, payload: Optional[Dict[str, Any]] = None):
    codes = [str(role_code).upper() for role_code in role_codes if str(role_code).strip()]
    queue_event(partial(publish_role_permissions_refresh, codes, reason, payload))
