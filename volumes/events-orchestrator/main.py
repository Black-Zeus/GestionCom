import asyncio
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, List, Optional

import httpx
import redis.asyncio as redis
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config import settings
from event_catalog import EVENT_SCHEMA, get_event_defaults, is_known_event_type, requires_dedupe_key
from schemas import AuthenticatedUser, EventEnvelope, PublishEventRequest

app = FastAPI(title="GestionCom Events Orchestrator", version="1.0.0")

SSE_EVENT_NAME = "gestioncom.event"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

redis_client: Optional[redis.Redis] = None


@app.on_event("startup")
async def startup_event():
    global redis_client
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    await redis_client.ping()


@app.on_event("shutdown")
async def shutdown_event():
    if redis_client:
        await redis_client.aclose()


def response(data=None, message="OK"):
    return {"success": True, "message": message, "data": data or {}}


def global_stream() -> str:
    return f"{settings.STREAM_PREFIX}:global"


def user_stream(user_id: int) -> str:
    return f"{settings.STREAM_PREFIX}:user:{int(user_id)}"


def role_stream(role_code: str) -> str:
    normalized_role = str(role_code).strip().upper()
    return f"{settings.STREAM_PREFIX}:role:{normalized_role}"


def stream_names_for_event(event: dict) -> List[str]:
    target = event.get("target") or {}
    streams = set()

    if target.get("broadcast") or event.get("scope") == "global":
        streams.add(global_stream())

    for user_id in target.get("user_ids", []):
        if str(user_id).isdigit():
            streams.add(user_stream(int(user_id)))

    for role_code in target.get("role_codes", []):
        if str(role_code).strip():
            streams.add(role_stream(role_code))

    if not streams:
        streams.add(global_stream())

    return sorted(streams)


def stream_names_for_user(user: AuthenticatedUser) -> List[str]:
    streams = {global_stream(), user_stream(user.user_id)}
    streams.update(role_stream(role) for role in user.roles if str(role).strip())
    return sorted(streams)


def is_event_expired(event: dict) -> bool:
    ttl_seconds = int(event.get("ttl_seconds") or settings.DEFAULT_TTL_SECONDS)
    created_at = event.get("created_at")
    if not created_at:
        return False
    created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    age_seconds = (datetime.now(timezone.utc) - created_dt).total_seconds()
    return age_seconds > ttl_seconds


def sse_message(event_id: Optional[str], event: str, data: dict) -> str:
    lines = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.extend([
        f"event: {event}",
        f"data: {json.dumps(data, ensure_ascii=False, separators=(',', ':'))}",
        "",
    ])
    return "\n".join(lines) + "\n"


async def validate_token(token: str) -> AuthenticatedUser:
    async with httpx.AsyncClient(timeout=10.0) as client:
        result = await client.post(
            f"{settings.BACKEND_API_URL.rstrip('/')}/auth/validate-token",
            json={"token": token},
        )
        result.raise_for_status()
        payload = result.json().get("data") or {}

    if not payload.get("valid"):
        raise HTTPException(status_code=401, detail="Token invalido")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sin usuario")

    return AuthenticatedUser(
        user_id=int(user_id),
        username=payload.get("username"),
        roles=payload.get("roles") or [],
        permissions=payload.get("permissions") or [],
    )


async def validate_sse_ticket(ticket: str) -> AuthenticatedUser:
    async with httpx.AsyncClient(timeout=10.0) as client:
        result = await client.post(
            f"{settings.BACKEND_API_URL.rstrip('/')}/auth/validate-sse-ticket",
            json={"token": ticket},
        )
        result.raise_for_status()
        payload = result.json().get("data") or {}

    if not payload.get("valid"):
        raise HTTPException(status_code=401, detail="Ticket SSE invalido")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Ticket SSE sin usuario")

    return AuthenticatedUser(
        user_id=int(user_id),
        username=payload.get("username"),
        roles=payload.get("roles") or [],
        permissions=[],
    )


def target_fingerprint(target: dict) -> str:
    normalized_target = {
        "broadcast": bool(target.get("broadcast")),
        "user_ids": sorted(int(user_id) for user_id in target.get("user_ids", []) if str(user_id).isdigit()),
        "role_codes": sorted(str(role).strip().upper() for role in target.get("role_codes", []) if str(role).strip()),
    }
    target_json = json.dumps(normalized_target, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(target_json.encode("utf-8")).hexdigest()[:16]


def payload_fingerprint(payload: dict) -> str:
    stable_keys = ("task_id", "job_id", "backup_id", "document_id", "operation_id", "resource_id")
    stable_payload = {key: payload.get(key) for key in stable_keys if payload.get(key) is not None}
    if not stable_payload:
        stable_payload = payload or {}

    payload_json = json.dumps(stable_payload, separators=(",", ":"), sort_keys=True, default=str)
    return hashlib.sha256(payload_json.encode("utf-8")).hexdigest()[:16]


def effective_dedupe_key(event_request: PublishEventRequest) -> Optional[str]:
    if event_request.dedupe_key:
        return event_request.dedupe_key

    if requires_dedupe_key(event_request.type):
        return f"auto:{payload_fingerprint(event_request.payload)}"

    return None


def connection_key(user_id: int) -> str:
    return f"{settings.STREAM_PREFIX}:connections:user:{int(user_id)}"


def connection_client_prefix(user_id: int) -> str:
    return f"{connection_key(user_id)}:clients"


def normalize_client_id(client_id: Optional[str], token: str) -> str:
    raw_client_id = (client_id or "").strip()
    if raw_client_id and re.fullmatch(r"[A-Za-z0-9_.:-]{1,96}", raw_client_id):
        return raw_client_id

    fingerprint = hashlib.sha256(token.encode("utf-8")).hexdigest()[:24]
    return f"token:{fingerprint}"


def connection_client_key(user_id: int, client_id: str) -> str:
    return f"{connection_client_prefix(user_id)}:{client_id}"


async def count_user_connections(user_id: int) -> int:
    count = 0
    async for _ in redis_client.scan_iter(match=f"{connection_client_prefix(user_id)}:*", count=50):
        count += 1
    return count


async def register_connection(user_id: int, client_id: str) -> bool:
    key = connection_client_key(user_id, client_id)
    existed = bool(await redis_client.exists(key))
    await redis_client.set(
        key,
        datetime.now(timezone.utc).isoformat(),
        ex=settings.CONNECTION_TTL_SECONDS,
    )

    current_count = await count_user_connections(user_id)
    if current_count <= settings.MAX_CONNECTIONS_PER_USER or existed:
        return True

    await redis_client.delete(key)
    return False


async def refresh_connection(user_id: int, client_id: str):
    await redis_client.expire(connection_client_key(user_id, client_id), settings.CONNECTION_TTL_SECONDS)


async def release_connection(user_id: int, client_id: str):
    await redis_client.delete(connection_client_key(user_id, client_id))


@app.get("/health")
async def health():
    await redis_client.ping()
    return response({"service": settings.SERVICE_NAME, "stream_prefix": settings.STREAM_PREFIX})


@app.post("/events/publish")
async def publish_event(
    event_request: PublishEventRequest,
    x_events_token: Optional[str] = Header(default=None),
):
    if settings.REQUIRE_PUBLISH_TOKEN and not settings.PUBLISH_TOKEN:
        raise HTTPException(status_code=503, detail="Token interno de publicacion no configurado")

    if settings.PUBLISH_TOKEN and x_events_token != settings.PUBLISH_TOKEN:
        raise HTTPException(status_code=403, detail="Token interno invalido")

    if not is_known_event_type(event_request.type):
        raise HTTPException(status_code=400, detail="Tipo de evento no catalogado")

    target_count = (
        len(event_request.target.user_ids or [])
        + len(event_request.target.role_codes or [])
        + (1 if event_request.target.broadcast else 0)
    )
    if target_count > settings.MAX_TARGETS_PER_EVENT:
        raise HTTPException(status_code=413, detail="Demasiados destinatarios para un evento")

    defaults = get_event_defaults(event_request.type)
    ttl_seconds = event_request.ttl_seconds or defaults.get("default_ttl_seconds") or settings.DEFAULT_TTL_SECONDS
    coalesce_window_ms = (
        event_request.coalesce_window_ms
        if event_request.coalesce_window_ms is not None
        else defaults.get("coalesce_window_ms", 0)
    )

    envelope = EventEnvelope(
        type=event_request.type,
        scope=event_request.scope,
        target=event_request.target,
        priority=event_request.priority,
        ttl_seconds=ttl_seconds,
        dedupe_key=event_request.dedupe_key,
        coalesce_window_ms=coalesce_window_ms,
        payload=event_request.payload,
    )

    data = envelope.model_dump(by_alias=True, mode="json")
    event_json = json.dumps(data, ensure_ascii=False)
    if len(event_json.encode("utf-8")) > settings.MAX_PAYLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Payload de evento demasiado grande")

    stream_names = stream_names_for_event(data)
    dedupe_key_value = effective_dedupe_key(event_request)

    if dedupe_key_value and coalesce_window_ms > 0:
        dedupe_key = (
            f"{settings.STREAM_PREFIX}:dedupe:{event_request.type}:"
            f"{target_fingerprint(data.get('target') or {})}:{dedupe_key_value}"
        )
        was_set = await redis_client.set(dedupe_key, "1", nx=True, px=coalesce_window_ms)
        if not was_set:
            return response(
                {"coalesced": True, "streams": stream_names, "event": data},
                "Evento coalescido",
            )

    published = {}
    for stream_name in stream_names:
        published[stream_name] = await redis_client.xadd(
            stream_name,
            {"event": event_json},
            maxlen=settings.STREAM_MAXLEN,
            approximate=True,
        )
        await redis_client.expire(stream_name, settings.STREAM_IDLE_TTL_SECONDS)

    return response({"streams": published, "event": data}, "Evento publicado")


@app.get("/events/stream")
async def stream_events(
    request: Request,
    ticket: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
    client_id: Optional[str] = Query(default=None),
    last_event_id: Optional[str] = Query(default=None),
    last_event_id_header: Optional[str] = Header(default=None, alias="Last-Event-ID"),
):
    if ticket:
        user = await validate_sse_ticket(ticket)
        credential_fingerprint_source = ticket
    elif token:
        user = await validate_token(token)
        credential_fingerprint_source = token
    else:
        raise HTTPException(status_code=401, detail="Credencial SSE requerida")

    connection_id = normalize_client_id(client_id, credential_fingerprint_source)
    stream_names = stream_names_for_user(user)
    if len(stream_names) > settings.MAX_STREAMS_PER_CONNECTION:
        raise HTTPException(status_code=413, detail="Demasiados streams para la conexion SSE")

    if not await register_connection(user.user_id, connection_id):
        raise HTTPException(status_code=429, detail="Demasiadas conexiones SSE para el usuario")

    # last_event_id se acepta por compatibilidad HTTP/SSE, pero este canal es best-effort:
    # no se reenvian eventos emitidos mientras el usuario estaba desconectado.
    start_offsets = {stream_name: "$" for stream_name in stream_names}

    async def generator() -> AsyncGenerator[str, None]:
        try:
            stream_offsets = dict(start_offsets)
            heartbeat_due = asyncio.get_event_loop().time() + settings.HEARTBEAT_SECONDS

            yield sse_message(
                None,
                SSE_EVENT_NAME,
                {
                    "schema": EVENT_SCHEMA,
                    "type": "system.v1.ping",
                    "payload": {"connected": True},
                },
            )

            while not await request.is_disconnected():
                await refresh_connection(user.user_id, connection_id)
                timeout_ms = settings.READ_BLOCK_MS
                result = await redis_client.xread(
                    stream_offsets,
                    count=50,
                    block=timeout_ms,
                )

                if not result:
                    now = asyncio.get_event_loop().time()
                    if now >= heartbeat_due:
                        heartbeat_due = now + settings.HEARTBEAT_SECONDS
                        yield sse_message(
                            None,
                            SSE_EVENT_NAME,
                            {
                                "schema": EVENT_SCHEMA,
                                "type": "system.v1.ping",
                                "payload": {"ts": datetime.now(timezone.utc).isoformat()},
                            },
                        )
                        continue

                for stream_name, messages in result:
                    for stream_id, values in messages:
                        stream_offsets[stream_name] = stream_id
                        try:
                            event = json.loads(values.get("event") or "{}")
                        except json.JSONDecodeError:
                            continue

                        if is_event_expired(event):
                            continue

                        event["stream_name"] = stream_name
                        event["stream_id"] = stream_id
                        yield sse_message(stream_id, SSE_EVENT_NAME, event)
        finally:
            await release_connection(user.user_id, connection_id)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
