"""
volumes/backend-api/cache/redis_client.py
Cliente Redis configurado con connection pooling, fallback y manejo de errores
"""
import asyncio
import json
from utils.log_helper import setup_logger
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import (
    ConnectionError as RedisConnectionError,
    TimeoutError as RedisTimeoutError,
    RedisError
)

from core.config import settings
from core.exceptions import CacheException

# Configurar logger
logger = setup_logger(__name__)


class RedisClient:
    """
    Cliente Redis con features avanzadas:
    - Connection pooling
    - Fallback graceful cuando Redis no está disponible
    - Retry automático con backoff
    - Serialización automática JSON
    - Pipelines para operaciones batch
    - Health checking
    """
    
    def __init__(self):
        self._pool: Optional[ConnectionPool] = None
        self._redis: Optional[Redis] = None
        self._is_available = False
        self._connection_attempts = 0
        self._max_connection_attempts = 3
        self._reconnect_delay = 1.0  # seconds
        
        # Configuración de retry
        self._max_retries = 2
        self._retry_delay = 0.1  # seconds
    
    async def initialize(self) -> bool:
        """
        Inicializar conexión Redis con retry automático
        """
        try:
            # Crear connection pool
            self._pool = ConnectionPool(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD,
                max_connections=settings.REDIS_MAX_CONNECTIONS,
                retry_on_timeout=True,
                socket_connect_timeout=settings.REDIS_CONNECTION_TIMEOUT,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                health_check_interval=30,  # Health check cada 30s
                decode_responses=True,     # Decodificar respuestas automáticamente
                encoding='utf-8'
            )
            
            # Crear cliente Redis
            self._redis = Redis(connection_pool=self._pool)
            
            # Probar conexión
            await self._test_connection()
            
            self._is_available = True
            self._connection_attempts = 0
            
            logger.info(f"Redis conectado exitosamente: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            return True
            
        except Exception as e:
            self._is_available = False
            self._connection_attempts += 1
            
            logger.error(f"Error conectando a Redis (intento {self._connection_attempts}): {e}")
            
            # Si no se pudo conectar, el sistema funcionará en modo degradado
            return False
    
    async def _test_connection(self):
        """
        Probar conexión Redis con un ping
        """
        if self._redis:
            await self._redis.ping()
    
    async def close(self):
        """
        Cerrar conexiones Redis limpiamente
        """
        if self._redis:
            await self._redis.close()
        
        if self._pool:
            await self._pool.disconnect()
        
        self._is_available = False
        logger.info("Conexiones Redis cerradas")
    
    async def _execute_with_retry(self, operation, *args, **kwargs):
        """
        Ejecutar operación Redis con retry automático
        """
        if not self._is_available:
            # Intentar reconectar
            await self._attempt_reconnect()
        
        if not self._is_available:
            # Si sigue sin estar disponible, devolver None o raise según configuración
            return None
        
        last_exception = None
        
        for attempt in range(self._max_retries + 1):
            try:
                result = await operation(*args, **kwargs)
                return result
                
            except (RedisConnectionError, RedisTimeoutError) as e:
                last_exception = e
                self._is_available = False
                
                if attempt < self._max_retries:
                    await asyncio.sleep(self._retry_delay * (attempt + 1))
                    await self._attempt_reconnect()
                
            except RedisError as e:
                # Error de Redis que no es de conexión
                logger.error(f"Redis error: {e}")
                raise CacheException(f"Error en operación Redis: {str(e)}")
        
        # Si llegamos aquí, todos los reintentos fallaron
        logger.error(f"Redis operation failed after {self._max_retries} retries: {last_exception}")
        return None
    
    async def _attempt_reconnect(self):
        """
        Intentar reconectar a Redis
        """
        if self._connection_attempts >= self._max_connection_attempts:
            return False
        
        try:
            await asyncio.sleep(self._reconnect_delay)
            await self.initialize()
            return self._is_available
        except Exception:
            return False
    
    # ==========================================
    # OPERACIONES BÁSICAS
    # ==========================================
    
    async def get(self, key: str, default: Optional[Any] = None) -> Optional[Any]:
        """
        Obtener valor de Redis con deserialización automática
        """
        async def _get_operation():
            value = await self._redis.get(key)
            if value is None:
                return default
            
            # Intentar deserializar JSON, si falla devolver string
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        
        return await self._execute_with_retry(_get_operation)
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ex: Optional[int] = None,
        nx: bool = False
    ) -> bool:
        """
        Establecer valor en Redis con serialización automática
        
        Args:
            key: Clave Redis
            value: Valor a almacenar
            ex: Tiempo de expiración en segundos
            nx: Solo establecer si la clave no existe
        """
        async def _set_operation():
            # Serializar valor si no es string
            if isinstance(value, (dict, list, bool, int, float)) and not isinstance(value, str):
                serialized_value = json.dumps(value, ensure_ascii=False)
            else:
                serialized_value = str(value)
            
            return await self._redis.set(key, serialized_value, ex=ex, nx=nx)
        
        result = await self._execute_with_retry(_set_operation)
        return result is True
    
    async def setex(self, key: str, time: int, value: Any) -> bool:
        """
        Establecer valor con tiempo de expiración
        """
        return await self.set(key, value, ex=time)
    
    async def delete(self, *keys: str) -> int:
        """
        Eliminar una o más claves
        """
        async def _delete_operation():
            return await self._redis.delete(*keys)
        
        result = await self._execute_with_retry(_delete_operation)
        return result or 0
    
    async def exists(self, key: str) -> bool:
        """
        Verificar si una clave existe
        """
        async def _exists_operation():
            return await self._redis.exists(key)
        
        result = await self._execute_with_retry(_exists_operation)
        return result == 1
    
    async def expire(self, key: str, time: int) -> bool:
        """
        Establecer tiempo de expiración para una clave
        """
        async def _expire_operation():
            return await self._redis.expire(key, time)
        
        result = await self._execute_with_retry(_expire_operation)
        return result is True
    
    async def ttl(self, key: str) -> int:
        """
        Obtener tiempo de vida restante de una clave
        """
        async def _ttl_operation():
            return await self._redis.ttl(key)
        
        result = await self._execute_with_retry(_ttl_operation)
        return result or -1
    
    # ==========================================
    # OPERACIONES DE INCREMENTO
    # ==========================================
    
    async def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Incrementar valor numérico
        """
        async def _incr_operation():
            return await self._redis.incr(key, amount)
        
        return await self._execute_with_retry(_incr_operation)
    
    async def decr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Decrementar valor numérico
        """
        async def _decr_operation():
            return await self._redis.decr(key, amount)
        
        return await self._execute_with_retry(_decr_operation)
    
    # ==========================================
    # OPERACIONES DE LISTA
    # ==========================================
    
    async def lpush(self, key: str, *values: Any) -> Optional[int]:
        """
        Agregar elementos al inicio de una lista
        """
        async def _lpush_operation():
            serialized_values = []
            for value in values:
                if isinstance(value, (dict, list, bool, int, float)) and not isinstance(value, str):
                    serialized_values.append(json.dumps(value, ensure_ascii=False))
                else:
                    serialized_values.append(str(value))
            
            return await self._redis.lpush(key, *serialized_values)
        
        return await self._execute_with_retry(_lpush_operation)
    
    async def lrange(self, key: str, start: int = 0, end: int = -1) -> List[Any]:
        """
        Obtener rango de elementos de una lista
        """
        async def _lrange_operation():
            values = await self._redis.lrange(key, start, end)
            
            # Deserializar cada valor
            result = []
            for value in values:
                try:
                    result.append(json.loads(value))
                except (json.JSONDecodeError, TypeError):
                    result.append(value)
            
            return result
        
        result = await self._execute_with_retry(_lrange_operation)
        return result or []
    
    async def ltrim(self, key: str, start: int, end: int) -> bool:
        """
        Mantener solo un rango de elementos en una lista
        """
        async def _ltrim_operation():
            return await self._redis.ltrim(key, start, end)
        
        result = await self._execute_with_retry(_ltrim_operation)
        return result is True
    
    # ==========================================
    # OPERACIONES DE SET
    # ==========================================
    
    async def sadd(self, key: str, *values: Any) -> Optional[int]:
        """
        Agregar elementos a un set
        """
        async def _sadd_operation():
            serialized_values = []
            for value in values:
                if isinstance(value, (dict, list, bool, int, float)) and not isinstance(value, str):
                    serialized_values.append(json.dumps(value, ensure_ascii=False))
                else:
                    serialized_values.append(str(value))
            
            return await self._redis.sadd(key, *serialized_values)
        
        return await self._execute_with_retry(_sadd_operation)
    
    async def srem(self, key: str, *values: Any) -> Optional[int]:
        """
        Remover elementos de un set
        """
        async def _srem_operation():
            serialized_values = []
            for value in values:
                if isinstance(value, (dict, list, bool, int, float)) and not isinstance(value, str):
                    serialized_values.append(json.dumps(value, ensure_ascii=False))
                else:
                    serialized_values.append(str(value))
            
            return await self._redis.srem(key, *serialized_values)
        
        return await self._execute_with_retry(_srem_operation)
    
    async def smembers(self, key: str) -> List[Any]:
        """
        Obtener todos los elementos de un set
        """
        async def _smembers_operation():
            values = await self._redis.smembers(key)
            
            # Deserializar cada valor
            result = []
            for value in values:
                try:
                    result.append(json.loads(value))
                except (json.JSONDecodeError, TypeError):
                    result.append(value)
            
            return result
        
        result = await self._execute_with_retry(_smembers_operation)
        return result or []
    
    # ==========================================
    # PIPELINE OPERATIONS
    # ==========================================
    
    @asynccontextmanager
    async def pipeline(self):
        """
        Context manager para operaciones pipeline
        """
        if not self._is_available or not self._redis:
            # Si Redis no está disponible, devolver un pipeline dummy
            yield DummyPipeline()
            return
        
        pipe = self._redis.pipeline()
        try:
            yield pipe
        finally:
            # El pipeline se ejecuta automáticamente al salir del context
            pass
    
    # ==========================================
    # HEALTH CHECK
    # ==========================================
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Verificar estado de salud de Redis
        """
        try:
            if not self._redis:
                return {
                    "status": "disconnected",
                    "available": False,
                    "error": "Redis client not initialized"
                }
            
            # Medir latencia
            start_time = asyncio.get_event_loop().time()
            await self._redis.ping()
            latency = (asyncio.get_event_loop().time() - start_time) * 1000
            
            # Obtener información del servidor
            info = await self._redis.info()
            
            return {
                "status": "connected",
                "available": True,
                "latency_ms": round(latency, 2),
                "version": info.get("redis_version", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "keyspace": info.get("db0", {})
            }
            
        except Exception as e:
            self._is_available = False
            return {
                "status": "error",
                "available": False,
                "error": str(e)
            }
    
    @property
    def is_available(self) -> bool:
        """
        Verificar si Redis está disponible
        """
        return self._is_available


class DummyPipeline:
    """
    Pipeline dummy para cuando Redis no está disponible
    """
    
    def __getattr__(self, name):
        # Devolver una función dummy que no hace nada
        return lambda *args, **kwargs: None
    
    async def execute(self):
        return []


# ==========================================
# INSTANCIA GLOBAL
# ==========================================

# Instancia global del cliente Redis
redis_client = RedisClient()


# ==========================================
# FUNCIONES DE CONVENIENCIA
# ==========================================

async def get_redis() -> RedisClient:
    """
    Obtener instancia del cliente Redis (para dependency injection)
    """
    return redis_client


async def initialize_redis() -> bool:
    """
    Inicializar Redis en startup de la aplicación
    """
    return await redis_client.initialize()


async def close_redis():
    """
    Cerrar Redis en shutdown de la aplicación
    """
    await redis_client.close()


# ==========================================
# DECORADOR PARA FALLBACK
# ==========================================

def redis_fallback(fallback_value: Any = None):
    """
    Decorador para funciones que usan Redis con fallback automático
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except CacheException:
                logger.warning(f"Redis operation failed in {func.__name__}, using fallback")
                return fallback_value
            except Exception as e:
                logger.error(f"Unexpected error in {func.__name__}: {e}")
                return fallback_value
        
        return wrapper
    return decorator


# Agregar al RedisClient en cache/redis_client.py

async def hincrby(self, key: str, field: str, amount: int = 1) -> int:
    """
    Incrementar valor de un field en un hash
    
    Args:
        key: Clave del hash
        field: Campo del hash a incrementar
        amount: Cantidad a incrementar (default 1)
        
    Returns:
        Nuevo valor después del incremento
    """
    async def _hincrby_operation():
        return await self._redis.hincrby(key, field, amount)
    
    result = await self._execute_with_retry(_hincrby_operation)
    return result or 0

async def hget(self, key: str, field: str) -> Optional[Any]:
    """
    Obtener valor de un field en un hash
    """
    async def _hget_operation():
        value = await self._redis.hget(key, field)
        if value is None:
            return None
        
        # Intentar convertir a número si es posible
        try:
            return int(value)
        except (ValueError, TypeError):
            try:
                return float(value)
            except (ValueError, TypeError):
                return value
    
    return await self._execute_with_retry(_hget_operation)

async def hgetall(self, key: str) -> Dict[str, Any]:
    """
    Obtener todos los fields y valores de un hash
    """
    async def _hgetall_operation():
        result = await self._redis.hgetall(key)
        
        # Convertir valores a tipos apropiados
        converted = {}
        for field, value in result.items():
            try:
                converted[field] = int(value)
            except (ValueError, TypeError):
                try:
                    converted[field] = float(value)
                except (ValueError, TypeError):
                    converted[field] = value
        
        return converted
    
    result = await self._execute_with_retry(_hgetall_operation)
    return result or {}