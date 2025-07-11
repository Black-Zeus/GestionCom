"""
Servicio de cache para datos de usuarios - User secrets, permisos y información básica
Integrado con tu arquitectura Redis existente
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple

from cache.redis_client import redis_client
from core.config import settings
from core.constants import RedisKeys
from core.exceptions import CacheException, SystemException


# Configurar logger
logger = logging.getLogger(__name__)


class UserCacheService:
    """
    Servicio de cache para datos de usuarios con fallback a BD
    """
    
    def __init__(self):
        # TTLs configurables desde settings
        self.user_secret_ttl = settings.USER_SECRET_CACHE_TTL  # 1 hour por defecto
        self.user_data_ttl = 1800  # 30 minutos para datos de usuario
        self.permission_ttl = 3600  # 1 hora para permisos/roles
        
        # Configuración de fallback
        self.enable_db_fallback = True
        self.cache_miss_retry_delay = 0.1  # seconds
    
    # ==========================================
    # USER SECRET MANAGEMENT
    # ==========================================
    
    async def get_user_secret(self, user_id: int) -> Optional[str]:
        """
        Obtener user secret desde cache con fallback a BD
        
        Args:
            user_id: ID del usuario
            
        Returns:
            User secret o None si no existe
            
        Raises:
            CacheException: Error en operación de cache
            SystemException: Error en fallback a BD
        """
        if not user_id:
            logger.warning("get_user_secret called with invalid user_id")
            return None
        
        try:
            # 1. Intentar desde cache primero
            cache_key = RedisKeys.user_secret(user_id)
            cached_secret = await redis_client.get(cache_key)
            
            if cached_secret is not None:
                logger.debug(f"User secret cache HIT for user {user_id}")
                return cached_secret
            
            logger.debug(f"User secret cache MISS for user {user_id}")
            
            # 2. Fallback a base de datos
            if self.enable_db_fallback:
                db_secret = await self._fetch_user_secret_from_db(user_id)
                
                if db_secret:
                    # Cachear para próximas consultas
                    await self._cache_user_secret(user_id, db_secret)
                    logger.debug(f"User secret cached from DB for user {user_id}")
                
                return db_secret
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user secret for user {user_id}: {e}")
            
            # En caso de error crítico, intentar fallback a BD
            if self.enable_db_fallback:
                try:
                    return await self._fetch_user_secret_from_db(user_id)
                except Exception as db_error:
                    logger.error(f"Database fallback failed for user {user_id}: {db_error}")
            
            # Si todo falla, es un error crítico para autenticación
            raise CacheException(f"No se pudo obtener user secret para usuario {user_id}")
    
    async def cache_user_secret(self, user_id: int, user_secret: str) -> bool:
        """
        Cachear user secret explícitamente
        
        Args:
            user_id: ID del usuario
            user_secret: Secret a cachear
            
        Returns:
            True si se cacheó exitosamente
        """
        return await self._cache_user_secret(user_id, user_secret)
    
    async def invalidate_user_secret(self, user_id: int) -> bool:
        """
        Invalidar user secret del cache
        
        Args:
            user_id: ID del usuario
            
        Returns:
            True si se invalidó exitosamente
        """
        try:
            cache_key = RedisKeys.user_secret(user_id)
            deleted = await redis_client.delete(cache_key)
            
            if deleted:
                logger.info(f"User secret cache invalidated for user {user_id}")
            
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Error invalidating user secret cache for {user_id}: {e}")
            return False
    
    async def _cache_user_secret(self, user_id: int, user_secret: str) -> bool:
        """
        Cachear user secret internamente
        """
        try:
            cache_key = RedisKeys.user_secret(user_id)
            success = await redis_client.setex(cache_key, self.user_secret_ttl, user_secret)
            
            if success:
                logger.debug(f"User secret cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user secret for {user_id}: {e}")
            return False
    
    async def _fetch_user_secret_from_db(self, user_id: int) -> Optional[str]:
        """
        Obtener user secret desde base de datos
        """
        try:
            # Importación dinámica para evitar circular imports
            from database.repositories.user_repository import get_user_secret_by_id
            
            return await get_user_secret_by_id(user_id)
            
        except Exception as e:
            logger.error(f"Error fetching user secret from DB for {user_id}: {e}")
            return None
    
    # ==========================================
    # USER BASIC DATA CACHE
    # ==========================================
    
    async def get_user_auth_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener datos básicos de usuario para autenticación desde cache
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Dict con datos básicos del usuario o None
        """
        try:
            cache_key = f"user:auth:{user_id}"
            cached_data = await redis_client.get(cache_key)
            
            if cached_data:
                logger.debug(f"User auth data cache HIT for user {user_id}")
                return cached_data
            
            logger.debug(f"User auth data cache MISS for user {user_id}")
            
            # Fallback a BD
            if self.enable_db_fallback:
                db_data = await self._fetch_user_auth_data_from_db(user_id)
                
                if db_data:
                    await self._cache_user_auth_data(user_id, db_data)
                
                return db_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user auth data for {user_id}: {e}")
            return None
    
    async def cache_user_auth_data(
        self,
        user_id: int,
        username: str,
        email: str,
        is_active: bool,
        full_name: Optional[str] = None
    ) -> bool:
        """
        Cachear datos básicos de usuario para autenticación
        """
        try:
            cache_key = f"user:auth:{user_id}"
            
            auth_data = {
                "user_id": user_id,
                "username": username,
                "email": email,
                "is_active": is_active,
                "full_name": full_name,
                "_cached_at": datetime.now(timezone.utc).isoformat()
            }
            
            success = await redis_client.setex(cache_key, self.user_data_ttl, auth_data)
            
            if success:
                logger.debug(f"User auth data cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user auth data for {user_id}: {e}")
            return False
    
    async def invalidate_user_auth_data(self, user_id: int) -> bool:
        """
        Invalidar datos de autenticación del usuario
        """
        try:
            cache_key = f"user:auth:{user_id}"
            deleted = await redis_client.delete(cache_key)
            
            if deleted:
                logger.info(f"User auth data cache invalidated for user {user_id}")
            
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Error invalidating user auth data cache for {user_id}: {e}")
            return False
    
    async def _cache_user_auth_data(self, user_id: int, auth_data: Dict[str, Any]) -> bool:
        """
        Cachear datos de autenticación internamente
        """
        try:
            cache_key = f"user:auth:{user_id}"
            
            # Agregar timestamp de cache
            auth_data["_cached_at"] = datetime.now(timezone.utc).isoformat()
            
            success = await redis_client.setex(cache_key, self.user_data_ttl, auth_data)
            
            if success:
                logger.debug(f"User auth data cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user auth data for {user_id}: {e}")
            return False
    
    async def _fetch_user_auth_data_from_db(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener datos básicos de usuario desde base de datos
        """
        try:
            from database.repositories.user_repository import get_user_auth_data_by_id
            
            return await get_user_auth_data_by_id(user_id)
            
        except Exception as e:
            logger.error(f"Error fetching user auth data from DB for {user_id}: {e}")
            return None
    
    # ==========================================
    # USER PERMISSIONS & ROLES CACHE
    # ==========================================
    
    async def get_user_permissions(self, user_id: int) -> Dict[str, List[str]]:
        """
        Obtener roles y permisos de usuario desde cache
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Dict con 'roles' y 'permissions' como listas
        """
        try:
            cache_key = f"user:permissions:{user_id}"
            cached_permissions = await redis_client.get(cache_key)
            
            if cached_permissions:
                logger.debug(f"User permissions cache HIT for user {user_id}")
                return cached_permissions
            
            logger.debug(f"User permissions cache MISS for user {user_id}")
            
            # Fallback a BD
            if self.enable_db_fallback:
                db_permissions = await self._fetch_user_permissions_from_db(user_id)
                
                if db_permissions:
                    await self._cache_user_permissions(user_id, db_permissions)
                
                return db_permissions
            
            return {"roles": [], "permissions": []}
            
        except Exception as e:
            logger.error(f"Error getting user permissions for {user_id}: {e}")
            try:
                return await self._fetch_user_permissions_from_db(user_id)
            except Exception as db_error:
                logger.error(f"Database fallback failed for user permissions {user_id}: {db_error}")
                return {"roles": [], "permissions": []}
    
    async def cache_user_permissions(
        self,
        user_id: int,
        roles: List[str],
        permissions: List[str]
    ) -> bool:
        """
        Cachear roles y permisos de usuario
        """
        permissions_data = {
            "roles": roles,
            "permissions": permissions
        }
        
        return await self._cache_user_permissions(user_id, permissions_data)
    
    async def invalidate_user_permissions(self, user_id: int) -> bool:
        """
        Invalidar permisos de usuario en cache
        """
        try:
            cache_key = f"user:permissions:{user_id}"
            deleted = await redis_client.delete(cache_key)
            
            if deleted:
                logger.info(f"User permissions cache invalidated for user {user_id}")
            
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Error invalidating user permissions cache for {user_id}: {e}")
            return False
    
    async def _cache_user_permissions(self, user_id: int, permissions_data: Dict[str, List[str]]) -> bool:
        """
        Guardar permisos de usuario en cache
        """
        try:
            cache_key = f"user:permissions:{user_id}"
            
            # Agregar timestamp de cache
            permissions_data["_cached_at"] = datetime.now(timezone.utc).isoformat()
            
            success = await redis_client.setex(cache_key, self.permission_ttl, permissions_data)
            
            if success:
                logger.debug(f"User permissions cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user permissions for {user_id}: {e}")
            return False
    
    async def _fetch_user_permissions_from_db(self, user_id: int) -> Dict[str, List[str]]:
        """
        Obtener permisos y roles desde base de datos
        """
        try:
            from database.repositories.permission_repository import get_user_permissions_and_roles
            
            permissions_data = await get_user_permissions_and_roles(user_id)
            
            return {
                "roles": permissions_data.get("roles", []),
                "permissions": permissions_data.get("permissions", [])
            }
            
        except Exception as e:
            logger.error(f"Error fetching user permissions from DB for {user_id}: {e}")
            return {"roles": [], "permissions": []}
    
    # ==========================================
    # OPERACIONES BATCH Y OPTIMIZACIÓN
    # ==========================================
    
    async def get_multiple_user_secrets(self, user_ids: List[int]) -> Dict[int, Optional[str]]:
        """
        Obtener múltiples user secrets en una operación batch
        """
        result = {}
        
        if not user_ids:
            return result
        
        try:
            # 1. Preparar keys para pipeline
            cache_keys = [RedisKeys.user_secret(user_id) for user_id in user_ids]
            
            # 2. Obtener desde cache usando pipeline
            cached_values = await redis_client.mget(cache_keys)
            
            # 3. Procesar resultados
            missing_user_ids = []
            for i, user_id in enumerate(user_ids):
                if cached_values[i] is not None:
                    result[user_id] = cached_values[i]
                    logger.debug(f"User secret cache HIT for user {user_id} (batch)")
                else:
                    missing_user_ids.append(user_id)
                    logger.debug(f"User secret cache MISS for user {user_id} (batch)")
            
            # 4. Obtener faltantes desde BD
            if missing_user_ids and self.enable_db_fallback:
                db_secrets = await self._fetch_multiple_user_secrets_from_db(missing_user_ids)
                
                # Cachear los encontrados
                for user_id, secret in db_secrets.items():
                    if secret:
                        await self._cache_user_secret(user_id, secret)
                    result[user_id] = secret
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting multiple user secrets: {e}")
            
            # Fallback individual para cada usuario
            if self.enable_db_fallback:
                try:
                    return await self._fetch_multiple_user_secrets_from_db(user_ids)
                except Exception as db_error:
                    logger.error(f"Database batch fallback failed: {db_error}")
            
            return {user_id: None for user_id in user_ids}
    
    async def _fetch_multiple_user_secrets_from_db(self, user_ids: List[int]) -> Dict[int, Optional[str]]:
        """
        Obtener múltiples user secrets desde base de datos
        """
        try:
            from database.repositories.user_repository import get_multiple_user_secrets
            
            return await get_multiple_user_secrets(user_ids)
            
        except Exception as e:
            logger.error(f"Error fetching multiple user secrets from DB: {e}")
            return {user_id: None for user_id in user_ids}
    
    # ==========================================
    # INVALIDACIÓN MASIVA
    # ==========================================
    
    async def invalidate_all_user_cache(self, user_id: int) -> bool:
        """
        Invalidar todo el cache relacionado con un usuario
        """
        try:
            # Keys a invalidar
            keys_to_delete = [
                RedisKeys.user_secret(user_id),
                f"user:auth:{user_id}",
                f"user:permissions:{user_id}"
            ]
            
            # Usar pipeline para eficiencia
            deleted_count = await redis_client.delete(*keys_to_delete)
            
            logger.info(f"Invalidated {deleted_count} cache keys for user {user_id}")
            
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error invalidating all cache for user {user_id}: {e}")
            return False
    
    async def invalidate_users_by_role_change(self, role_code: str) -> bool:
        """
        Invalidar cache de permisos para usuarios que tienen un rol específico
        
        Nota: Esta operación puede ser costosa. En producción considera usar
        un patrón pub/sub para notificar cambios de roles.
        """
        try:
            # En una implementación real, tendrías una lista de usuarios por rol
            # Por ahora, invalidaremos usando un patrón de key
            
            pattern = "user:permissions:*"
            keys = await redis_client.keys(pattern)
            
            if keys:
                deleted_count = await redis_client.delete(*keys)
                logger.info(f"Invalidated {deleted_count} permission cache keys due to role {role_code} change")
                return deleted_count > 0
            
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating cache for role {role_code}: {e}")
            return False
    
    # ==========================================
    # UTILIDADES Y MONITOREO
    # ==========================================
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas del cache de usuarios
        """
        try:
            # Estadísticas básicas
            stats = {
                "redis_status": "connected" if redis_client._is_available else "disconnected",
                "user_secret_ttl": self.user_secret_ttl,
                "user_data_ttl": self.user_data_ttl,
                "permission_ttl": self.permission_ttl,
                "db_fallback_enabled": self.enable_db_fallback,
            }
            
            # Contar keys aproximadamente (usar con cuidado en producción)
            if redis_client._is_available:
                try:
                    secret_keys = await redis_client.keys("user:secret:*")
                    auth_keys = await redis_client.keys("user:auth:*")
                    permission_keys = await redis_client.keys("user:permissions:*")
                    
                    stats.update({
                        "cached_secrets_count": len(secret_keys) if secret_keys else 0,
                        "cached_auth_data_count": len(auth_keys) if auth_keys else 0,
                        "cached_permissions_count": len(permission_keys) if permission_keys else 0,
                    })
                except Exception:
                    # Si falla el conteo, no es crítico
                    pass
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Verificar salud del servicio de cache
        """
        try:
            # Test básico de conectividad
            if not redis_client._is_available:
                return {
                    "status": "unhealthy",
                    "error": "Redis not available"
                }
            
            # Test de operación básica
            test_key = "health:check"
            test_value = "ok"
            
            await redis_client.setex(test_key, 10, test_value)
            retrieved_value = await redis_client.get(test_key)
            await redis_client.delete(test_key)
            
            if retrieved_value == test_value:
                return {
                    "status": "healthy",
                    "redis_available": True,
                    "operations": "ok"
                }
            else:
                return {
                    "status": "degraded",
                    "redis_available": True,
                    "operations": "failed"
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# ==========================================
# INSTANCIA GLOBAL Y FUNCIONES DE CONVENIENCIA
# ==========================================

# Instancia global del servicio
user_cache_service = UserCacheService()


# Funciones de conveniencia para usar en tu auth middleware
async def get_user_secret(user_id: int) -> Optional[str]:
    """
    Función de conveniencia para obtener user secret
    Esta es la función que usa tu auth_middleware.py
    """
    return await user_cache_service.get_user_secret(user_id)


async def cache_user_secret(user_id: int, user_secret: str) -> bool:
    """
    Función de conveniencia para cachear user secret
    """
    return await user_cache_service.cache_user_secret(user_id, user_secret)


async def invalidate_user_cache(user_id: int) -> bool:
    """
    Función de conveniencia para invalidar todo el cache de un usuario
    """
    return await user_cache_service.invalidate_all_user_cache(user_id)


async def get_user_permissions_cached(user_id: int) -> Dict[str, List[str]]:
    """
    Función de conveniencia para obtener permisos de usuario
    """
    return await user_cache_service.get_user_permissions(user_id)