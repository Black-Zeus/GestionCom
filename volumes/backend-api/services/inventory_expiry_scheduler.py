"""
Scheduler liviano para alertas de vencimiento de inventario.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging

from sqlalchemy import text

from core.config import settings
from database.database import db_manager
from services.inventory_expiry_alerts import emit_expiring_lot_alerts

logger = logging.getLogger(__name__)

_task: asyncio.Task | None = None


def start_inventory_expiry_alert_scheduler() -> None:
    global _task
    if not settings.INVENTORY_EXPIRY_ALERTS_ENABLED:
        logger.info("Scheduler de alertas de vencimiento deshabilitado")
        return
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_scheduler_loop())
    logger.info("Scheduler de alertas de vencimiento iniciado")


async def stop_inventory_expiry_alert_scheduler() -> None:
    global _task
    if not _task:
        return
    _task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await _task
    _task = None
    logger.info("Scheduler de alertas de vencimiento detenido")


async def _scheduler_loop() -> None:
    interval = max(300, int(settings.INVENTORY_EXPIRY_ALERTS_INTERVAL_SECONDS or 86400))
    while True:
        try:
            await run_inventory_expiry_alert_job()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning("Error en scheduler de alertas de vencimiento: %s", exc)
        await asyncio.sleep(interval)


async def run_inventory_expiry_alert_job() -> dict:
    async with db_manager.get_async_session() as session:
        lock_result = await session.execute(text("SELECT GET_LOCK('gestioncom_inventory_expiry_alerts', 1)"))
        lock_acquired = lock_result.scalar_one_or_none()
        if lock_acquired != 1:
            return {"skipped_reason": "lock_not_acquired"}
        try:
            result = await emit_expiring_lot_alerts(
                session,
                days=settings.INVENTORY_EXPIRY_ALERTS_DAYS,
                include_missing=settings.INVENTORY_EXPIRY_ALERTS_INCLUDE_MISSING,
                limit=settings.INVENTORY_EXPIRY_ALERTS_LIMIT,
            )
            await session.commit()
            logger.info("Alertas de vencimiento procesadas: %s", result)
            return result
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.execute(text("SELECT RELEASE_LOCK('gestioncom_inventory_expiry_alerts')"))

