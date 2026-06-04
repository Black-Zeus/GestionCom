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
    configured_url = os.getenv("CELERY_BROKER_URL")
    if configured_url:
        return configured_url

    return get_redis_url(os.getenv("CELERY_BROKER_DB", "1"))


def get_result_backend():
    configured_backend = os.getenv("CELERY_BACKEND")
    if configured_backend:
        return configured_backend

    return get_redis_url(os.getenv("CELERY_BACKEND_DB", "2"))


def get_redis_url(db):
    password = read_secret("REDIS_PASSWORD")
    host = os.getenv("REDIS_HOST", "localhost")
    port = os.getenv("REDIS_PORT", "6379")
    auth = f":{quote(password)}@" if password else ""
    return f"redis://{auth}{host}:{port}/{db}"
