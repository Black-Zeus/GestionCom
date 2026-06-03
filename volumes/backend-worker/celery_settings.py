import os
from urllib.parse import quote


def read_secret(name, default=None):
    file_path = os.getenv(f"{name}_FILE")
    if file_path:
        try:
            with open(file_path, "r", encoding="utf-8") as secret_file:
                return secret_file.read().strip()
        except OSError:
            pass
    return os.getenv(name, default)


def get_broker_url():
    configured_url = os.getenv("RABBITMQ_URL")
    if configured_url:
        return configured_url

    user = quote(read_secret("RABBITMQ_DEFAULT_USER", "guest"))
    password = quote(read_secret("RABBITMQ_DEFAULT_PASS", "guest"))
    host = os.getenv("RABBITMQ_HOST", "localhost")
    port = os.getenv("RABBITMQ_PORT", "5672")
    return f"amqp://{user}:{password}@{host}:{port}"


def get_result_backend():
    configured_backend = os.getenv("CELERY_BACKEND")
    if configured_backend:
        return configured_backend

    password = read_secret("REDIS_PASSWORD")
    host = os.getenv("REDIS_HOST", "localhost")
    port = os.getenv("REDIS_PORT", "6379")
    db = os.getenv("REDIS_DB", "1")
    auth = f":{quote(password)}@" if password else ""
    return f"redis://{auth}{host}:{port}/{db}"
