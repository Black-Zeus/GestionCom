import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


def read_secret(name: str, default: Optional[str] = None) -> Optional[str]:
    file_path = os.getenv(f"{name}_FILE")
    if file_path:
        try:
            with open(file_path, "r", encoding="utf-8") as secret_file:
                return secret_file.read().strip()
        except OSError:
            pass
    return os.getenv(name, default)


class Settings:
    SERVICE_NAME = os.getenv("EVENTS_SERVICE_NAME", "events-orchestrator")
    HOST = os.getenv("EVENTS_ORCHESTRATOR_HOST", "0.0.0.0")
    PORT = int(os.getenv("EVENTS_ORCHESTRATOR_PORT_INTERNAL", "8040"))

    REDIS_HOST = os.getenv("REDIS_HOST", "redis")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))
    REDIS_PASSWORD = read_secret("REDIS_PASSWORD")

    ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
    BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://backend-api:8000")
    STREAM_NAME = os.getenv("EVENTS_STREAM_NAME", "gestioncom:events:v1")
    STREAM_PREFIX = os.getenv("EVENTS_STREAM_PREFIX", "gestioncom:events:v1")
    STREAM_MAXLEN = int(os.getenv("EVENTS_STREAM_MAXLEN", "1000"))
    STREAM_IDLE_TTL_SECONDS = int(os.getenv("EVENTS_STREAM_IDLE_TTL_SECONDS", "300"))
    MAX_TARGETS_PER_EVENT = int(os.getenv("EVENTS_MAX_TARGETS_PER_EVENT", "1000"))
    MAX_STREAMS_PER_CONNECTION = int(os.getenv("EVENTS_MAX_STREAMS_PER_CONNECTION", "16"))
    MAX_CONNECTIONS_PER_USER = int(os.getenv("EVENTS_MAX_CONNECTIONS_PER_USER", "3"))
    CONNECTION_TTL_SECONDS = int(os.getenv("EVENTS_CONNECTION_TTL_SECONDS", "90"))
    MAX_PAYLOAD_BYTES = int(os.getenv("EVENTS_MAX_PAYLOAD_BYTES", "16384"))
    READ_BLOCK_MS = int(os.getenv("EVENTS_READ_BLOCK_MS", "25000"))
    HEARTBEAT_SECONDS = int(os.getenv("EVENTS_HEARTBEAT_SECONDS", "20"))
    DEFAULT_TTL_SECONDS = int(os.getenv("EVENTS_DEFAULT_TTL_SECONDS", "60"))
    PUBLISH_TOKEN = read_secret("EVENTS_PUBLISH_TOKEN")
    REQUIRE_PUBLISH_TOKEN = os.getenv("EVENTS_REQUIRE_PUBLISH_TOKEN", "true").lower() != "false"

    @property
    def redis_url(self) -> str:
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


settings = Settings()
