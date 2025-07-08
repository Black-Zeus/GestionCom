"""
Servicio de rate limiting usando Redis con algoritmo sliding window
"""
import time
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple, List

from cache.redis_client import redis_client, redis_fallback
from core.config import settings
from core.constants import RedisKeys
from core.exceptions import CacheException


logger = logging.getLogger(__name__)


class RateLimitService:
    """
    Servicio de rate limiting con diferentes estrategias:
    - Rate limiting general por IP
    - Rate limiting específico para login
    - Rate limiting por usuario autenticado
    - Sliding window para distribución uniforme
    - Burst protection
    """
    
    def __init__(self):
        # Configuración por defecto
        self.default_requests_per_minute = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        self.default_login_attempts_per_hour = settings.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR
        self.default_window = settings.RATE_LIMIT_WINDOW
        
        # Configuración de burst protection
        self.burst_threshold = 10  # Máximo burst antes de aplicar penalización
        self.burst_penalty_seconds = 60  # Tiempo de penalización por burst
    
    # ==========================================
    # RATE LIMITING PRINCIPAL
    # ==========================================
    
    @redis_fallback((True, 999, int(time.time()) + 60))  # Si Redis falla, permitir con límites altos
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60,
        increment: bool = True
    ) -> Tuple[bool, int, int]:
        """
        Verificar y aplicar rate limiting usando sliding window
        
        Args:
            key: Clave única para el rate limit (IP, user_id, etc.)
            limit: Número máximo de requests permitidos
            window_seconds: Ventana de tiempo en segundos
            increment: Si incrementar el contador (False para solo verificar)
        
        Returns:
            Tuple (allowed, remaining, reset_time)
            - allowed: Si el request está permitido
            - remaining: Requests restantes en la ventana
            - reset_time: Timestamp cuando se resetea la ventana
        """
        if not key or limit <= 0:
            return True, limit, int(time.time()) + window_seconds
        
        try:
            current_time = int(time.time())
            window_start = current_time - window_seconds
            rate_limit_key = f"rate_limit:{key}"
            
            # Usar pipeline para operaciones atómicas
            async with redis_client.pipeline() as pipe:
                # 1. Limpiar entradas antiguas fuera de la ventana
                pipe.zremrangebyscore(rate_limit_key, 0, window_start)
                
                # 2. Contar requests actuales en la ventana
                pipe.zcard(rate_limit_key)
                
                # 3. Si se debe incrementar, agregar request actual
                if increment:
                    pipe.zadd(rate_limit_key, {str(current_time): current_time})
                
                # 4. Establecer expiración de la clave
                pipe.expire(rate_limit_key, window_seconds + 60)  # TTL extra para cleanup
                
                results = await pipe.execute()
            
            # Obtener el conteo actual (después de limpiar entries antiguos)
            current_count = results[1] if len(results) > 1 else 0
            
            # Si se incrementó, incluir el nuevo request en el conteo
            if increment and current_count < limit:
                current_count += 1
            
            # Determinar si está permitido
            allowed = current_count <= limit
            remaining = max(0, limit - current_count)
            reset_time = current_time + window_seconds
            
            # Log para debugging
            if not allowed:
                logger.warning(f"Rate limit exceeded for key {key}: {current_count}/{limit}")
            else:
                logger.debug(f"Rate limit check for key {key}: {current_count}/{limit}")
            
            return allowed, remaining, reset_time
            
        except Exception as e:
            logger.error(f"Error in rate limit check for key {key}: {e}")
            # En caso de error, permitir el request (fail open)
            return True, limit - 1, int(time.time()) + window_seconds
    
    async def check_burst_protection(self, key: str, window_seconds: int = 60) -> bool:
        """
        Verificar protección contra burst de requests
        """
        try:
            burst_key = f"burst:{key}"
            current_time = int(time.time())
            
            # Contar requests en los últimos 10 segundos
            burst_window_start = current_time - 10
            
            async with redis_client.pipeline() as pipe:
                pipe.zremrangebyscore(burst_key, 0, burst_window_start)
                pipe.zcard(burst_key)
                pipe.expire(burst_key, 60)
                
                results = await pipe.execute()
            
            burst_count = results[1] if len(results) > 1 else 0
            
            # Si hay demasiados requests en burst, aplicar penalización
            if burst_count >= self.burst_threshold:
                penalty_key = f"penalty:{key}"
                await redis_client.setex(penalty_key, self.burst_penalty_seconds, "burst_detected")
                logger.warning(f"Burst protection activated for key {key}: {burst_count} requests in 10s")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error in burst protection for key {key}: {e}")
            return True  # Permitir en caso de error
    
    async def is_in_penalty(self, key: str) -> bool:
        """
        Verificar si una clave está en período de penalización
        """
        try:
            penalty_key = f"penalty:{key}"
            return await redis_client.exists(penalty_key)
        except Exception as e:
            logger.error(f"Error checking penalty for key {key}: {e}")
            return False
    
    # ==========================================
    # RATE LIMITING ESPECÍFICO POR TIPO
    # ==========================================
    
    async def check_general_rate_limit(self, identifier: str) -> Tuple[bool, int, int]:
        """
        Rate limiting general (por IP, usuario, etc.)
        """
        key = f"general_{identifier}"
        return await self.check_rate_limit(
            key=key,
            limit=self.default_requests_per_minute,
            window_seconds=self.default_window
        )
    
    async def check_login_rate_limit(self, identifier: str) -> Tuple[bool, int, int]:
        """
        Rate limiting específico para intentos de login
        """
        key = f"login_{identifier}"
        return await self.check_rate_limit(
            key=key,
            limit=self.default_login_attempts_per_hour,
            window_seconds=3600  # 1 hora
        )
    
    async def check_api_endpoint_rate_limit(
        self,
        identifier: str,
        endpoint: str,
        limit: int,
        window_seconds: int = 60
    ) -> Tuple[bool, int, int]:
        """
        Rate limiting específico por endpoint de API
        """
        key = f"api_{endpoint}_{identifier}"
        return await self.check_rate_limit(
            key=key,
            limit=limit,
            window_seconds=window_seconds
        )
    
    # ==========================================
    # MANEJO DE INTENTOS DE LOGIN
    # ==========================================
    
    async def record_login_attempt(self, identifier: str, success: bool) -> Dict[str, Any]:
        """
        Registrar intento de login y aplicar lógica específica
        
        Args:
            identifier: IP o identificador único
            success: Si el login fue exitoso
        
        Returns:
            Información del estado del rate limiting
        """
        try:
            current_time = int(time.time())
            
            # 1. Registrar el intento en rate limiting general
            allowed, remaining, reset_time = await self.check_login_rate_limit(identifier)
            
            # 2. Si el login falló, aplicar penalizaciones progresivas
            if not success:
                await self._apply_failed_login_penalty(identifier)
            else:
                # Si fue exitoso, limpiar penalizaciones
                await self._clear_failed_login_penalty(identifier)
            
            # 3. Registrar estadística del intento
            await self._record_login_stats(identifier, success)
            
            return {
                "allowed": allowed,
                "remaining": remaining,
                "reset_time": reset_time,
                "success": success,
                "timestamp": current_time
            }
            
        except Exception as e:
            logger.error(f"Error recording login attempt for {identifier}: {e}")
            return {
                "allowed": True,
                "remaining": self.default_login_attempts_per_hour - 1,
                "reset_time": int(time.time()) + 3600,
                "success": success,
                "error": str(e)
            }
    
    async def _apply_failed_login_penalty(self, identifier: str):
        """
        Aplicar penalización progresiva por intentos de login fallidos
        """
        try:
            failed_key = f"failed_login:{identifier}"
            
            # Incrementar contador de fallos
            failed_count = await redis_client.incr(failed_key)
            
            if failed_count == 1:
                # Primera vez, establecer TTL
                await redis_client.expire(failed_key, 3600)  # 1 hora
            
            # Aplicar penalizaciones progresivas
            if failed_count >= 5:
                # 5 fallos: bloqueo de 15 minutos
                penalty_key = f"login_penalty:{identifier}"
                await redis_client.setex(penalty_key, 900, f"failed_attempts_{failed_count}")
                logger.warning(f"Login penalty applied for {identifier}: {failed_count} failed attempts")
            elif failed_count >= 10:
                # 10 fallos: bloqueo de 1 hora
                penalty_key = f"login_penalty:{identifier}"
                await redis_client.setex(penalty_key, 3600, f"failed_attempts_{failed_count}")
                logger.warning(f"Extended login penalty applied for {identifier}: {failed_count} failed attempts")
            
        except Exception as e:
            logger.error(f"Error applying failed login penalty for {identifier}: {e}")
    
    async def _clear_failed_login_penalty(self, identifier: str):
        """
        Limpiar penalizaciones por login exitoso
        """
        try:
            failed_key = f"failed_login:{identifier}"
            penalty_key = f"login_penalty:{identifier}"
            
            # Eliminar contadores y penalizaciones
            await redis_client.delete(failed_key, penalty_key)
            
        except Exception as e:
            logger.error(f"Error clearing failed login penalty for {identifier}: {e}")
    
    async def is_login_blocked(self, identifier: str) -> Tuple[bool, Optional[int]]:
        """
        Verificar si un identificador está bloqueado para login
        
        Returns:
            Tuple (is_blocked, seconds_remaining)
        """
        try:
            penalty_key = f"login_penalty:{identifier}"
            ttl = await redis_client.ttl(penalty_key)
            
            if ttl > 0:
                return True, ttl
            
            return False, None
            
        except Exception as e:
            logger.error(f"Error checking login block for {identifier}: {e}")
            return False, None
    
    # ==========================================
    # ESTADÍSTICAS Y MONITOREO
    # ==========================================
    
    async def _record_login_stats(self, identifier: str, success: bool):
        """
        Registrar estadísticas de intentos de login
        """
        try:
            current_hour = int(time.time()) // 3600
            stats_key = f"login_stats:{current_hour}"
            
            # Incrementar contadores
            field = "successful" if success else "failed"
            await redis_client.hincrby(stats_key, field, 1)
            await redis_client.hincrby(stats_key, "total", 1)
            
            # TTL de 25 horas para mantener estadísticas
            await redis_client.expire(stats_key, 25 * 3600)
            
        except Exception as e:
            logger.error(f"Error recording login stats: {e}")
    
    async def get_rate_limit_status(self, key: str) -> Dict[str, Any]:
        """
        Obtener estado actual del rate limiting para una clave
        """
        try:
            rate_limit_key = f"rate_limit:{key}"
            current_time = int(time.time())
            
            # Obtener información del rate limit
            async with redis_client.pipeline() as pipe:
                pipe.zcard(rate_limit_key)
                pipe.ttl(rate_limit_key)
                pipe.exists(f"penalty:{key}")
                pipe.ttl(f"penalty:{key}")
                
                results = await pipe.execute()
            
            current_count = results[0] if results[0] else 0
            ttl = results[1] if results[1] and results[1] > 0 else 0
            in_penalty = results[2] == 1
            penalty_ttl = results[3] if results[3] and results[3] > 0 else 0
            
            return {
                "key": key,
                "current_count": current_count,
                "limit": self.default_requests_per_minute,
                "remaining": max(0, self.default_requests_per_minute - current_count),
                "reset_in_seconds": ttl,
                "in_penalty": in_penalty,
                "penalty_expires_in": penalty_ttl,
                "timestamp": current_time
            }
            
        except Exception as e:
            logger.error(f"Error getting rate limit status for {key}: {e}")
            return {"error": str(e)}
    
    async def get_login_stats(self, hours: int = 24) -> Dict[str, Any]:
        """
        Obtener estadísticas de login de las últimas N horas
        """
        try:
            current_hour = int(time.time()) // 3600
            stats = {
                "total_successful": 0,
                "total_failed": 0,
                "total_attempts": 0,
                "hourly_breakdown": []
            }
            
            for i in range(hours):
                hour = current_hour - i
                stats_key = f"login_stats:{hour}"
                
                hour_stats = await redis_client.hgetall(stats_key)
                
                if hour_stats:
                    successful = int(hour_stats.get("successful", 0))
                    failed = int(hour_stats.get("failed", 0))
                    total = int(hour_stats.get("total", 0))
                    
                    stats["total_successful"] += successful
                    stats["total_failed"] += failed
                    stats["total_attempts"] += total
                    
                    stats["hourly_breakdown"].append({
                        "hour": hour,
                        "successful": successful,
                        "failed": failed,
                        "total": total
                    })
            
            # Calcular tasas
            if stats["total_attempts"] > 0:
                stats["success_rate"] = stats["total_successful"] / stats["total_attempts"]
                stats["failure_rate"] = stats["total_failed"] / stats["total_attempts"]
            else:
                stats["success_rate"] = 0
                stats["failure_rate"] = 0
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting login stats: {e}")
            return {"error": str(e)}
    
    # ==========================================
    # OPERACIONES ADMINISTRATIVAS
    # ==========================================
    
    async def reset_rate_limit(self, key: str) -> bool:
        """
        Resetear rate limit para una clave específica
        """
        try:
            rate_limit_key = f"rate_limit:{key}"
            penalty_key = f"penalty:{key}"
            failed_key = f"failed_login:{key}"
            login_penalty_key = f"login_penalty:{key}"
            
            deleted = await redis_client.delete(
                rate_limit_key,
                penalty_key,
                failed_key,
                login_penalty_key
            )
            
            logger.info(f"Rate limit reset for key {key}, {deleted} keys deleted")
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Error resetting rate limit for key {key}: {e}")
            return False
    
    async def get_top_rate_limited_keys(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Obtener las claves con más rate limiting (función de monitoreo)
        """
        try:
            # Esta función requeriría un tracking adicional de las claves
            # Por simplicidad, retornamos un placeholder
            # En implementación real se mantendría un sorted set con contadores
            
            return [
                {
                    "key": "example_key",
                    "hits": 0,
                    "message": "Feature not implemented - requires additional tracking"
                }
            ]
            
        except Exception as e:
            logger.error(f"Error getting top rate limited keys: {e}")
            return []
    
    async def cleanup_expired_entries(self) -> int:
        """
        Limpiar entradas expiradas manualmente (Redis lo hace automáticamente)
        """
        # Redis maneja automáticamente la expiración con TTL
        # Esta función es principalmente para logging/monitoreo
        logger.info("Rate limit cleanup completed (handled automatically by Redis TTL)")
        return 0


# ==========================================
# INSTANCIA GLOBAL Y FUNCIONES DE CONVENIENCIA
# ==========================================

rate_limit_service = RateLimitService()


# Funciones de conveniencia para usar en middleware
async def check_rate_limit(
    key: str,
    limit: int,
    window_seconds: int = 60
) -> Tuple[bool, int, int]:
    """
    Función de conveniencia para verificar rate limit
    """
    return await rate_limit_service.check_rate_limit(key, limit, window_seconds)


async def check_general_rate_limit(identifier: str) -> Tuple[bool, int, int]:
    """
    Función de conveniencia para rate limiting general
    """
    return await rate_limit_service.check_general_rate_limit(identifier)


async def check_login_rate_limit(identifier: str) -> Tuple[bool, int, int]:
    """
    Función de conveniencia para rate limiting de login
    """
    return await rate_limit_service.check_login_rate_limit(identifier)


async def record_login_attempt(identifier: str, success: bool) -> Dict[str, Any]:
    """
    Función de conveniencia para registrar intento de login
    """
    return await rate_limit_service.record_login_attempt(identifier, success)


async def is_login_blocked(identifier: str) -> Tuple[bool, Optional[int]]:
    """
    Función de conveniencia para verificar bloqueo de login
    """
    return await rate_limit_service.is_login_blocked(identifier)


# ==========================================
# FUNCIONES ADMINISTRATIVAS
# ==========================================

async def reset_rate_limit(key: str) -> bool:
    """
    Función administrativa para resetear rate limit
    """
    return await rate_limit_service.reset_rate_limit(key)


async def get_rate_limit_status(key: str) -> Dict[str, Any]:
    """
    Función para obtener estado de rate limit
    """
    return await rate_limit_service.get_rate_limit_status(key)


async def get_login_stats(hours: int = 24) -> Dict[str, Any]:
    """
    Función para obtener estadísticas de login
    """
    return await rate_limit_service.get_login_stats(hours)


# ==========================================
# DECORADORES PARA ENDPOINTS ESPECÍFICOS
# ==========================================

def endpoint_rate_limit(limit: int, window_seconds: int = 60, key_func=None):
    """
    Decorador para aplicar rate limiting a endpoints específicos
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Buscar Request en los argumentos
            request = None
            for arg in args:
                if hasattr(arg, 'client'):  # Detectar Request object
                    request = arg
                    break
            
            if request:
                # Generar clave para rate limiting
                if key_func:
                    key = key_func(request)
                else:
                    ip = request.client.host if request.client else "unknown"
                    endpoint = request.url.path
                    key = f"{ip}_{endpoint}"
                
                # Verificar rate limit
                allowed, remaining, reset_time = await check_rate_limit(
                    key=key,
                    limit=limit,
                    window_seconds=window_seconds
                )
                
                if not allowed:
                    from core.exceptions import TooManyRequestsException
                    retry_after = max(1, reset_time - int(time.time()))
                    raise TooManyRequestsException(retry_after=retry_after)
            
            # Ejecutar función original
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator