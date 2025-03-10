from celery import Celery
import os

# Configuración de Celery
celery_app = Celery(
    "beat",
    broker=os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
    backend=os.getenv("CELERY_BACKEND", "redis://localhost:6379/1")
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
