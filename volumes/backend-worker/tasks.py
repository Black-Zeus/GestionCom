from celery import Celery
import os
from celery_settings import get_broker_url, get_result_backend

# Configuración de Celery
celery_app = Celery(
    "tasks",
    broker=get_broker_url(),
    backend=get_result_backend()
)

# Configuración global
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=int(os.getenv("WORKER_CONCURRENCY", 2)),  
    worker_log_level=os.getenv("WORKER_LOG_LEVEL", "INFO"),
)

# =====================
# Definición de tareas generales
# =====================
@celery_app.task
def add(x, y):
    return x + y

@celery_app.task
def process_data(data):
    return {"processed_data": data.upper()}
