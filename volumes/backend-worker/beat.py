from celery import Celery
import os
from celery_settings import get_broker_url, get_result_backend

# Configuración de Celery
celery_app = Celery(
    "beat",
    broker=get_broker_url(),
    backend=get_result_backend()
)

# Configuración de Celery Beat
celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
)

# =====================
# Tareas Periódicas
# =====================
@celery_app.task
def scheduled_task():
    return "Tarea programada ejecutada"
