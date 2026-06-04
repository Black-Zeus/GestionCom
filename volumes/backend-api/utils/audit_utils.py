"""
Utilidades de auditoria persistente.
"""
import json
from typing import Any, Optional

from sqlalchemy import text


def _json_dump(value: Optional[dict[str, Any]]) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value, ensure_ascii=False, default=str)


def get_request_audit_data(request) -> dict[str, Optional[str]]:
    client_host = request.client.host if getattr(request, "client", None) else None
    return {
        "ip_address": client_host,
        "user_agent": request.headers.get("user-agent") if request else None,
    }


async def record_audit_log(
    session,
    *,
    table_name: str,
    record_id: int,
    action_type: str,
    user_id: Optional[int],
    changed_fields: list[str] | str,
    old_values: Optional[dict[str, Any]] = None,
    new_values: Optional[dict[str, Any]] = None,
    request=None,
) -> None:
    request_data = get_request_audit_data(request)
    fields_value = ",".join(changed_fields) if isinstance(changed_fields, list) else changed_fields

    await session.execute(
        text(
            """
            INSERT INTO audit_log (
                table_name,
                record_id,
                action_type,
                old_values,
                new_values,
                changed_fields,
                user_id,
                ip_address,
                user_agent
            )
            VALUES (
                :table_name,
                :record_id,
                :action_type,
                :old_values,
                :new_values,
                :changed_fields,
                :user_id,
                :ip_address,
                :user_agent
            )
            """
        ),
        {
            "table_name": table_name,
            "record_id": record_id,
            "action_type": action_type,
            "old_values": _json_dump(old_values),
            "new_values": _json_dump(new_values),
            "changed_fields": fields_value,
            "user_id": user_id,
            "ip_address": request_data["ip_address"],
            "user_agent": request_data["user_agent"],
        },
    )
