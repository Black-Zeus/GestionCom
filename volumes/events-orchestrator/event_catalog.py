EVENT_SCHEMA = "gestioncom.event.v1"

EVENT_CATALOG = {
    "system.v1.ping": {
        "description": "Mantiene viva la conexion SSE.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 0,
    },
    "notification.v1.toast": {
        "description": "Muestra un toast al usuario.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 0,
    },
    "permissions.v1.refresh_requested": {
        "description": "Indica al frontend resincronizar permisos/sesion.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 2000,
    },
    "menu.v1.refresh_requested": {
        "description": "Indica al frontend recargar menu desde BD.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 2000,
    },
    "session.v1.invalidate_requested": {
        "description": "Indica al frontend cerrar sesion local.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 0,
    },
    "profile.v1.refresh_requested": {
        "description": "Indica al frontend recargar perfil del usuario.",
        "default_ttl_seconds": 60,
        "coalesce_window_ms": 2000,
    },
    "task.v1.started": {"description": "Tarea iniciada.", "default_ttl_seconds": 60, "coalesce_window_ms": 500},
    "task.v1.progress": {"description": "Avance de tarea.", "default_ttl_seconds": 30, "coalesce_window_ms": 1000},
    "task.v1.completed": {"description": "Tarea completada.", "default_ttl_seconds": 120},
    "task.v1.failed": {"description": "Tarea fallida.", "default_ttl_seconds": 120},
    "backup.v1.started": {"description": "Backup iniciado.", "default_ttl_seconds": 60, "coalesce_window_ms": 500},
    "backup.v1.progress": {"description": "Avance de backup.", "default_ttl_seconds": 30, "coalesce_window_ms": 1000},
    "backup.v1.completed": {"description": "Backup completado.", "default_ttl_seconds": 120},
    "backup.v1.failed": {"description": "Backup fallido.", "default_ttl_seconds": 120},
    "document.v1.ready": {"description": "Documento listo.", "default_ttl_seconds": 120},
}


def get_event_defaults(event_type: str) -> dict:
    return EVENT_CATALOG.get(event_type, {})


def is_known_event_type(event_type: str) -> bool:
    return event_type in EVENT_CATALOG


def requires_dedupe_key(event_type: str) -> bool:
    defaults = get_event_defaults(event_type)
    return int(defaults.get("coalesce_window_ms") or 0) > 0
