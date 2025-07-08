"""
Servicio de cache para user secrets y datos de usuario
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from cache.redis_client import redis_client, redis_fallback
from core.config import settings
from core.constants import RedisKeys
from core.exceptions import CacheException, DatabaseException


logger = logging.getLogger(__name__)


class UserCacheService:
    """
    Servicio para cache de:
    - User secrets para JWT doble secreto
    - Datos básicos de usuario
    - Información de permisos y roles
    - Estado de activación de usuario
    """
    
    def __init__(self):
        self.secret_ttl = settings.USER_SECRET_CACHE_TTL
        self.user_data_ttl = 1800  # 30 minutos para datos de usuario
        self.permission_ttl = 3600  # 1 hora para permisos (cambian menos frecuentemente)
    
    # ==========================================
    # CACHE DE USER SECRETS
    # ==========================================
    
    @redis_fallback(None)
    async def get_user_secret(self, user_id: int) -> Optional[str]:
        """
        Obtener user secret desde cache, con fallback a base de datos
        
        Args:
            user_id: ID del usuario
            
        Returns:
            User secret o None si no se encuentra
        """
        if not user_id:
            return None
        
        try:
            # 1. Intentar obtener desde Redis cache
            cache_key = RedisKeys.user_secret(user_id)
            cached_secret = await redis_client.get(cache_key)
            
            if cached_secret:
                logger.debug(f"User secret cache HIT for user {user_id}")
                return cached_secret
            
            # 2. Cache MISS - obtener desde base de datos
            logger.debug(f"User secret cache MISS for user {user_id}")
            secret = await self._fetch_user_secret_from_db(user_id)
            
            if secret:
                # 3. Guardar en cache para próximas consultas
                await self._cache_user_secret(user_id, secret)
                return secret
            
            logger.warning(f"User secret not found for user {user_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting user secret for {user_id}: {e}")
            # Intentar fallback directo a BD
            try:
                return await self._fetch_user_secret_from_db(user_id)
            except Exception as db_error:
                logger.error(f"Database fallback failed for user {user_id}: {db_error}")
                return None
    
    async def _cache_user_secret(self, user_id: int, secret: str) -> bool:
        """
        Guardar user secret en cache
        """
        try:
            cache_key = RedisKeys.user_secret(user_id)
            success = await redis_client.setex(cache_key, self.secret_ttl, secret)
            
            if success:
                logger.debug(f"User secret cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user secret for {user_id}: {e}")
            return False
    
    async def invalidate_user_secret(self, user_id: int) -> bool:
        """
        Invalidar user secret en cache (cuando se regenera)
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
    
    async def update_user_secret_cache(self, user_id: int, new_secret: str) -> bool:
        """
        Actualizar user secret en cache directamente
        (usado cuando se regenera el secret)
        """
        try:
            # Invalidar cache anterior
            await self.invalidate_user_secret(user_id)
            
            # Cachear nuevo secret
            return await self._cache_user_secret(user_id, new_secret)
            
        except Exception as e:
            logger.error(f"Error updating user secret cache for {user_id}: {e}")
            return False
    
    # ==========================================
    # CACHE DE DATOS DE USUARIO
    # ==========================================
    
    @redis_fallback(None)
    async def get_user_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener datos básicos de usuario desde cache
        """
        if not user_id:
            return None
        
        try:
            cache_key = f"user:data:{user_id}"
            cached_data = await redis_client.get(cache_key)
            
            if cached_data:
                logger.debug(f"User data cache HIT for user {user_id}")
                return cached_data
            
            # Cache MISS - obtener desde BD
            logger.debug(f"User data cache MISS for user {user_id}")
            user_data = await self._fetch_user_data_from_db(user_id)
            
            if user_data:
                await self._cache_user_data(user_id, user_data)
                return user_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting user data for {user_id}: {e}")
            try:
                return await self._fetch_user_data_from_db(user_id)
            except Exception as db_error:
                logger.error(f"Database fallback failed for user data {user_id}: {db_error}")
                return None
    
    async def _cache_user_data(self, user_id: int, user_data: Dict[str, Any]) -> bool:
        """
        Guardar datos de usuario en cache
        """
        try:
            cache_key = f"user:data:{user_id}"
            
            # Agregar timestamp de cache
            user_data["_cached_at"] = datetime.now(timezone.utc).isoformat()
            
            success = await redis_client.setex(cache_key, self.user_data_ttl, user_data)
            
            if success:
                logger.debug(f"User data cached for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error caching user data for {user_id}: {e}")
            return False
    
    async def invalidate_user_data(self, user_id: int) -> bool:
        """
        Invalidar datos de usuario en cache
        """
        try:
            cache_key = f"user:data:{user_id}"
            deleted = await redis_client.delete(cache_key)
            
            if deleted:
                logger.info(f"User data cache invalidated for user {user_id}")
            
            return deleted > 0
            
        except Exception as e:
            logger.error(f"Error invalidating user data cache for {user_id}: {e}")
            return False
    
    # ==========================================
    # CACHE DE PERMISOS Y ROLES
    # ==========================================
    
    @redis_fallback({"roles": [], "permissions": []})
    async def get_user_permissions(self, user_id: int) -> Dict[str, List[str]]:
        """
        Obtener roles y permisos de usuario desde cache
        """
        if not user_id:
            return {"roles": [], "permissions": []}
        
        try:
            cache_key = f"user:permissions:{user_id}"
            cached_permissions = await redis_client.get(cache_key)
            
            if cached_permissions:
                logger.debug(f"User permissions cache HIT for user {user_id}")
                return cached_permissions
            
            # Cache MISS - obtener desde BD
            logger.debug(f"User permissions cache MISS for user {user_id}")
            permissions_data = await self._fetch_user_permissions_from_db(user_id)
            
            if permissions_data:
                await self._cache_user_permissions(user_id, permissions_data)
                return permissions_data
            
            return {"roles": [], "permissions": []}
            
        except Exception as e:
            logger.error(f"Error getting user permissions for {user_id}: {e}")
            try:
                return await self._fetch_user_permissions_from_db(user_id)
            except Exception as db_error:
                logger.error(f"Database fallback failed for user permissions {user_id}: {db_error}")
                return {"roles": [], "permissions": []}
    
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
    
    # ==========================================
    # OPERACIONES BATCH
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
            async with redis_client.pipeline() as pipe:
                for cache_key in cache_keys:
                    pipe.get(cache_key)
                
                cached_values = await pipe.execute()
            
            # 3. Procesar resultados y identificar cache misses
            cache_misses = []
            
            for i, user_id in enumerate(user_ids):
                cached_value = cached_values[i] if i < len(cached_values) else None
                
                if cached_value:
                    result[user_id] = cached_value
                    logger.debug(f"User secret cache HIT for user {user_id}")
                else:
                    cache_misses.append(user_id)
                    logger.debug(f"User secret cache MISS for user {user_id}")
            
            # 4. Obtener cache misses desde BD
            if cache_misses:
                db_results = await self._fetch_multiple_user_secrets_from_db(cache_misses)
                
                # 5. Actualizar cache y resultado
                async with redis_client.pipeline() as pipe:
                    for user_id, secret in db_results.items():
                        if secret:
                            cache_key = RedisKeys.user_secret(user_id)
                            pipe.setex(cache_key, self.secret_ttl, secret)
                            result[user_id] = secret
                        else:
                            result[user_id] = None
                    
                    await pipe.execute()
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting multiple user secrets: {e}")
            # Fallback: obtener uno por uno
            for user_id in user_ids:
                try:
                    secret = await self.get_user_secret(user_id)
                    result[user_id] = secret
                except Exception:
                    result[user_id] = None
            
            return result
    
    async def invalidate_multiple_users(self, user_ids: List[int]) -> int:
        """
        Invalidar cache de múltiples usuarios
        """
        if not user_ids:
            return 0
        
        try:
            # Preparar todas las keys a eliminar
            keys_to_delete = []
            
            for user_id in user_ids:
                keys_to_delete.extend([
                    RedisKeys.user_secret(user_id),
                    f"user:data:{user_id}",
                    f"user:permissions:{user_id}"
                ])
            
            # Eliminar en batch
            deleted_count = await redis_client.delete(*keys_to_delete)
            
            logger.info(f"Invalidated cache for {len(user_ids)} users, {deleted_count} keys deleted")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error invalidating multiple users cache: {e}")
            return 0
    
    # ==========================================
    # FALLBACK A BASE DE DATOS
    # ==========================================
    
    async def _fetch_user_secret_from_db(self, user_id: int) -> Optional[str]:
        """
        Obtener user secret desde base de datos
        """
        try:
            # Importación dinámica para evitar circular imports
            from database.repositories.user_repository import get_user_secret_by_id
            
            secret = await get_user_secret_by_id(user_id)
            return secret
            
        except Exception as e:
            logger.error(f"Error fetching user secret from DB for {user_id}: {e}")
            raise DatabaseException(f"No se pudo obtener secret del usuario {user_id}")
    
    async def _fetch_user_data_from_db(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener datos básicos de usuario desde base de datos
        """
        try:
            from database.repositories.user_repository import get_user_by_id
            
            user_data = await get_user_by_id(user_id)
            
            if user_data:
                # Convertir a formato serializable y remover campos sensibles
                return {
                    "id": user_data.get("id"),
                    "username": user_data.get("username"),
                    "email": user_data.get("email"),
                    "first_name": user_data.get("first_name"),
                    "last_name": user_data.get("last_name"),
                    "is_active": user_data.get("is_active"),
                    "last_login_at": user_data.get("last_login_at"),
                    "created_at": user_data.get("created_at")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user data from DB for {user_id}: {e}")
            raise DatabaseException(f"No se pudo obtener datos del usuario {user_id}")
    
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
    # ESTADÍSTICAS Y MONITOREO
    # ==========================================
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas del cache de usuarios
        """
        try:
            # Obtener información general de Redis
            redis_health = await redis_client.health_check()
            
            # Contar keys relacionadas con usuarios (aproximado)
            # Nota: En producción usar SCAN en lugar de KEYS para mejor performance
            
            stats = {
                "redis_status": redis_health.get("status", "unknown"),
                "redis_memory": redis_health.get("used_memory_human", "unknown"),
                "cache_ttls": {
                    "user_secret_ttl": self.secret_ttl,
                    "user_data_ttl": self.user_data_ttl,
                    "permission_ttl": self.permission_ttl
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}


# ==========================================
# INSTANCIA GLOBAL Y FUNCIONES DE CONVENIENCIA
# ==========================================

user_cache_service = UserCacheService()


# Funciones de conveniencia para usar en middleware y services
async def get_user_secret(user_id: int) -> Optional[str]:
    """
    Función de conveniencia para obtener user secret
    """
    return await user_cache_service.get_user_secret(user_id)


async def get_user_data(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Función de conveniencia para obtener datos de usuario
    """
    return await user_cache_service.get_user_data(user_id)


async def get_user_permissions(user_id: int) -> Dict[str, List[str]]:
    """
    Función de conveniencia para obtener permisos de usuario
    """
    return await user_cache_service.get_user_permissions(user_id)


async def invalidate_user_cache(user_id: int) -> bool:
    """
    Función de conveniencia para invalidar todo el cache de un usuario
    """
    secret_invalidated = await user_cache_service.invalidate_user_secret(user_id)
    data_invalidated = await user_cache_service.invalidate_user_data(user_id)
    permissions_invalidated = await user_cache_service.invalidate_user_permissions(user_id)
    
    return secret_invalidated or data_invalidated or permissions_invalidated


async def update_user_secret_cache(user_id: int, new_secret: str) -> bool:
    """
    Función de conveniencia para actualizar user secret en cache
    """
    return await user_cache_service.update_user_secret_cache(user_id, new_secret)


# ==========================================
# FUNCIONES ADMINISTRATIVAS
# ==========================================

async def get_cache_stats() -> Dict[str, Any]:
    """
    Función para obtener estadísticas del cache
    """
    return await user_cache_service.get_cache_stats()


async def warm_up_user_cache(user_ids: List[int]) -> Dict[str, int]:
    """
    Función para pre-cargar cache de usuarios (warm-up)
    """
    try:
        # Pre-cargar secrets
        secrets_result = await user_cache_service.get_multiple_user_secrets(user_ids)
        
        # Contar éxitos
        secrets_loaded = sum(1 for secret in secrets_result.values() if secret is not None)
        
        # Pre-cargar datos de usuario
        data_loaded = 0
        for user_id in user_ids:
            try:
                user_data = await user_cache_service.get_user_data(user_id)
                if user_data:
                    data_loaded += 1
            except Exception:
                pass
        
        # Pre-cargar permisos
        permissions_loaded = 0
        for user_id in user_ids:
            try:
                permissions = await user_cache_service.get_user_permissions(user_id)
                if permissions.get("roles") or permissions.get("permissions"):
                    permissions_loaded += 1
            except Exception:
                pass
        
        logger.info(f"Cache warm-up completed for {len(user_ids)} users")
        
        return {
            "total_users": len(user_ids),
            "secrets_loaded": secrets_loaded,
            "data_loaded": data_loaded,
            "permissions_loaded": permissions_loaded
        }
        
    except Exception as e:
        logger.error(f"Error during cache warm-up: {e}")
        return {"error": str(e)}