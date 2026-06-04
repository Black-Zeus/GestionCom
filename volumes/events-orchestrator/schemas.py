from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from event_catalog import EVENT_SCHEMA


class EventTarget(BaseModel):
    user_ids: List[int] = Field(default_factory=list)
    role_codes: List[str] = Field(default_factory=list)
    broadcast: bool = False

    @field_validator("role_codes")
    @classmethod
    def normalize_roles(cls, value):
        return [str(role).upper() for role in value or []]


class EventEnvelope(BaseModel):
    schema_name: str = Field(default=EVENT_SCHEMA, alias="schema")
    id: str = Field(default_factory=lambda: f"evt_{uuid4().hex}")
    type: str
    version: int = 1
    scope: Literal["user", "role", "global"] = "user"
    target: EventTarget = Field(default_factory=EventTarget)
    priority: Literal["low", "normal", "high"] = "normal"
    ttl_seconds: int = 60
    dedupe_key: Optional[str] = None
    coalesce_window_ms: int = 0
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True}


class PublishEventRequest(BaseModel):
    type: str
    scope: Literal["user", "role", "global"] = "user"
    target: EventTarget = Field(default_factory=EventTarget)
    priority: Literal["low", "normal", "high"] = "normal"
    ttl_seconds: Optional[int] = None
    dedupe_key: Optional[str] = None
    coalesce_window_ms: Optional[int] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class AuthenticatedUser(BaseModel):
    user_id: int
    username: Optional[str] = None
    roles: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)
