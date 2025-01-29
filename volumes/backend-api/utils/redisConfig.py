#volumes\backend-api\utils\redisConfig.py
import os
from dotenv import load_dotenv
import redis

# Cargar variables del archivo .env
load_dotenv()

class RedisConfig:
    """Clase para encapsular la configuración de Redis."""

    def __init__(self):
        self.__host = os.getenv("REDIS_HOST", "localhost")
        self.__port = int(os.getenv("REDIS_PORT", 6379))
        self.__password = os.getenv("REDIS_PASSWORD", None)
        self.__db = int(os.getenv("REDIS_DB", 0))
        self.__client = self.__connect()

    def __connect(self) -> redis.Redis:
        """Crea y devuelve la conexión a Redis."""
        return redis.Redis(
            host=self.__host,
            port=self.__port,
            password=self.__password,
            db=self.__db,
            decode_responses=True,  # Decodificar respuestas en UTF-8
        )

    @property
    def client(self) -> redis.Redis:
        """Devuelve la instancia del cliente Redis."""
        return self.__client

    @property
    def redis_host(self) -> str:
        """Devuelve la dirección del servidor Redis."""
        return self.__host

    @property
    def redis_port(self) -> int:
        """Devuelve el puerto de conexión a Redis."""
        return self.__port

# Instancia global de configuración de Redis
redis_config = RedisConfig()
redis_client = redis_config.client
