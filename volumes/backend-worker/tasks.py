from celery import Celery
import os

# Configuración de Celery
celery_app = Celery(
    "tasks",
    broker=os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
    backend=os.getenv("CELERY_BACKEND", "redis://localhost:6379/1")
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
