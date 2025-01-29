from celery import Celery
import os

celery_app = Celery(
    "tasks",
    broker=os.getenv("CELERY_BACKEND", ""),
    backend=os.getenv("CELERY_BACKEND", "")
)



@celery_app.task
def add(x, y):
    return x + y

@celery_app.task
def process_data(data):
    return {"processed_data": data.upper()}
