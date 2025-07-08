"""
Servicio de blacklist para tokens JWT revocados
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from cache.redis_client import redis_client, redis_fallback
from core.config import settings
from core.constants import RedisKeys
from core.security import jwt_manager


logger = logging.getLogger(__name__)


class BlacklistService:
    """
    Servicio para manejar tokens JWT en blacklist:
    - Agregar tokens revocados a blacklist
    - Verificar si tokens están blacklisted
    - Limpiar tokens expirados
    - Estadísticas de blacklist
    """
    
    def __init__(self):
        self.default_ttl = settings.TOKEN_BLACKLIST_TTL
    
    # ==========================================
    # OPERACIONES PRINCIPALES
    # ==========================================
    
    @redis_fallback(False)  # Si Redis falla, asumimos que NO está blacklisted
    async def is_token_blacklisted(self, jti: str, user_id: Optional[int] = None) -> bool:
        """
        Verificar si un token está en blacklist
        
        Args:
            jti: JWT ID del token
            user_id: ID del usuario (opcional, para verificaciones adicionales)
        
        Returns:
            True si está blacklisted, False si no
        """
        if not jti:
            return False
        
        try:
            # 1. Verificar blacklist específica del token
            token_key = RedisKeys.token_blacklist(jti)
            is_blacklisted = await redis_client.exists(token_key)
            
            if is_blacklisted:
                logger.debug(f"Token {jti} found in blacklist")
                return True
            
            # 2. Verificar blacklist de refresh tokens
            refresh_key = RedisKeys.refresh_blacklist(jti)
            is_refresh_blacklisted = await redis_client.exists(refresh_key)
            
            if is_refresh_blacklisted:
                logger.debug(f"Refresh token {jti} found in blacklist")
                return True
            
            # 3. Verificar revocación masiva por usuario (si se proporciona user_id)
            if user_id:
                user_revoked_data = await self._get_user_revocation_info(user_id)
                if user_revoked_data:
                    # Si hay revocación masiva, verificar timestamp del token
                    token_revoked_before = user_revoked_data.get("all_tokens_before")
                    if token_revoked_before:
                        # Comparar con issued_at del token (requiere decodificar)
                        # Esto es una verificación adicional de seguridad
                        return await self._is_token_revoked_by_timestamp(jti, token_revoked_before)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking blacklist for token {jti}: {e}")
            # En caso de error, por seguridad asumimos que NO está blacklisted
            # para no bloquear usuarios legítimos
            return False
    
    async def add_token_to_blacklist(
        self,
        jti: str,
        reason: str = "manual_revocation",
        user_id: Optional[int] = None,
        revoked_by: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Agregar token a blacklist
        
        Args:
            jti: JWT ID del token
            reason: Razón de revocación
            user_id: ID del usuario dueño del token
            revoked_by: Quien revocó el token (user/admin/system)
            ttl: Tiempo de vida en cache (default: configurado)
        
        Returns:
            True si se agregó exitosamente
        """
        if not jti:
            return False
        
        try:
            # Preparar información de revocación
            revocation_info = {
                "jti": jti,
                "reason": reason,
                "revoked_at": datetime.now(timezone.utc).isoformat(),
                "revoked_by": revoked_by or "system",
                "user_id": user_id
            }
            
            # Calcular TTL apropiado
            effective_ttl = ttl or self.default_ttl
            
            # Si tenemos el token, usar su tiempo restante como TTL máximo
            if user_id:
                remaining_time = await self._get_token_remaining_time(jti)
                if remaining_time and remaining_time > 0:
                    effective_ttl = min(effective_ttl, remaining_time)
            
            # Agregar a blacklist
            token_key = RedisKeys.token_blacklist(jti)
            success = await redis_client.setex(
                token_key,
                effective_ttl,
                revocation_info
            )
            
            if success:
                logger.info(f"Token {jti} added to blacklist. Reason: {reason}")
                
                # Incrementar contador de estadísticas
                await self._increment_blacklist_stats(reason)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error adding token {jti} to blacklist: {e}")
            return False
    
    async def add_refresh_token_to_blacklist(
        self,
        refresh_jti: str,
        reason: str = "manual_revocation",
        user_id: Optional[int] = None,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Agregar refresh token a blacklist
        """
        if not refresh_jti:
            return False
        
        try:
            revocation_info = {
                "jti": refresh_jti,
                "token_type": "refresh",
                "reason": reason,
                "revoked_at": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id
            }
            
            # TTL más largo para refresh tokens
            effective_ttl = ttl or (settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)
            
            refresh_key = RedisKeys.refresh_blacklist(refresh_jti)
            success = await redis_client.setex(
                refresh_key,
                effective_ttl,
                revocation_info
            )
            
            if success:
                logger.info(f"Refresh token {refresh_jti} added to blacklist. Reason: {reason}")
                await self._increment_blacklist_stats(f"refresh_{reason}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error adding refresh token {refresh_jti} to blacklist: {e}")
            return False
    
    # ==========================================
    # REVOCACIÓN MASIVA POR USUARIO
    # ==========================================
    
    async def revoke_all_user_tokens(
        self,
        user_id: int,
        reason: str = "security_breach",
        revoked_by: str = "admin"
    ) -> bool:
        """
        Revocar todos los tokens de un usuario
        
        Esto se hace estableciendo un timestamp límite.
        Todos los tokens emitidos antes de este timestamp quedan invalidados.
        """
        try:
            revocation_data = {
                "user_id": user_id,
                "reason": reason,
                "revoked_by": revoked_by,
                "revoked_at": datetime.now(timezone.utc).isoformat(),
                "all_tokens_before": datetime.now(timezone.utc).isoformat()
            }
            
            # Guardar en Redis con TTL largo (máximo tiempo de vida de cualquier token)
            max_token_lifetime = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
            user_revoke_key = f"user:tokens:revoked:{user_id}"
            
            success = await redis_client.setex(
                user_revoke_key,
                max_token_lifetime,
                revocation_data
            )
            
            if success:
                logger.warning(f"All tokens revoked for user {user_id}. Reason: {reason}")
                await self._increment_blacklist_stats(f"mass_revocation_{reason}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error revoking all tokens for user {user_id}: {e}")
            return False
    
    async def _get_user_revocation_info(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Obtener información de revocación masiva para un usuario
        """
        try:
            user_revoke_key = f"user:tokens:revoked:{user_id}"
            revocation_data = await redis_client.get(user_revoke_key)
            return revocation_data
        except Exception as e:
            logger.error(f"Error getting user revocation info for {user_id}: {e}")
            return None
    
    async def _is_token_revoked_by_timestamp(self, jti: str, revoked_before: str) -> bool:
        """
        Verificar si un token fue emitido antes del timestamp de revocación masiva
        """
        try:
            # Obtener timestamp de emisión del token
            # Nota: Esto requiere decodificar el token sin validar
            # Se podría optimizar guardando issued_at en cache al crear tokens
            
            # Por ahora, para simplificar, si hay revocación masiva asumimos revocado
            # En implementación real se compararían los timestamps
            
            revoked_datetime = datetime.fromisoformat(revoked_before.replace('Z', '+00:00'))
            current_time = datetime.now(timezone.utc)
            
            # Si la revocación fue hace menos de 1 día, asumir revocado
            # (todos los access tokens habrán expirado)
            time_diff = current_time - revoked_datetime
            return time_diff.total_seconds() < (24 * 3600)
            
        except Exception as e:
            logger.error(f"Error checking token timestamp revocation: {e}")
            return True  # Por seguridad, asumir revocado
    
    # ==========================================
    # OPERACIONES DE MANTENIMIENTO
    # ==========================================
    
    async def remove_token_from_blacklist(self, jti: str) -> bool:
        """
        Remover token de blacklist (función administrativa)
        """
        try:
            token_key = RedisKeys.token_blacklist(jti)
            refresh_key = RedisKeys.refresh_blacklist(jti)
            
            # Intentar eliminar de ambas blacklists
            deleted_count = await redis_client.delete(token_key, refresh_key)
            
            if deleted_count > 0:
                logger.info(f"Token {jti} removed from blacklist")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error removing token {jti} from blacklist: {e}")
            return False
    
    async def clear_expired_blacklist_entries(self) -> int:
        """
        Limpiar entradas expiradas de blacklist (Redis lo hace automáticamente,
        pero esta función puede usarse para estadísticas)
        """
        # Redis maneja automáticamente la expiración con TTL
        # Esta función podría implementar limpieza manual si fuera necesario
        logger.info("Blacklist cleanup completed (handled automatically by Redis TTL)")
        return 0
    
    # ==========================================
    # ESTADÍSTICAS Y MONITOREO
    # ==========================================
    
    async def get_blacklist_stats(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de blacklist
        """
        try:
            stats_key = "blacklist:stats"
            stats = await redis_client.get(stats_key) or {}
            
            # Agregar información adicional
            health_info = await redis_client.health_check()
            
            return {
                "total_blacklisted_tokens": stats.get("total_revocations", 0),
                "revocations_by_reason": stats.get("by_reason", {}),
                "last_updated": stats.get("last_updated"),
                "redis_status": health_info.get("status", "unknown")
            }
            
        except Exception as e:
            logger.error(f"Error getting blacklist stats: {e}")
            return {"error": str(e)}
    
    async def _increment_blacklist_stats(self, reason: str):
        """
        Incrementar contadores de estadísticas
        """
        try:
            stats_key = "blacklist:stats"
            
            # Obtener estadísticas actuales
            current_stats = await redis_client.get(stats_key) or {
                "total_revocations": 0,
                "by_reason": {},
                "last_updated": None
            }
            
            # Incrementar contadores
            current_stats["total_revocations"] += 1
            current_stats["by_reason"][reason] = current_stats["by_reason"].get(reason, 0) + 1
            current_stats["last_updated"] = datetime.now(timezone.utc).isoformat()
            
            # Guardar con TTL de 30 días
            await redis_client.setex(stats_key, 30 * 24 * 3600, current_stats)
            
        except Exception as e:
            logger.error(f"Error updating blacklist stats: {e}")
    
    async def _get_token_remaining_time(self, jti: str) -> Optional[int]:
        """
        Obtener tiempo restante de un token (para optimizar TTL de blacklist)
        """
        try:
            # En implementación real, esto podría usar un cache de tokens activos
            # o decodificar el token para obtener exp
            
            # Por simplicidad, usar TTL por defecto
            return self.default_ttl
            
        except Exception as e:
            logger.error(f"Error getting token remaining time: {e}")
            return None


# ==========================================
# INSTANCIA GLOBAL Y FUNCIONES DE CONVENIENCIA
# ==========================================

blacklist_service = BlacklistService()


# Funciones de conveniencia para usar en middleware y dependencies
async def is_token_blacklisted(jti: str, user_id: Optional[int] = None) -> bool:
    """
    Función de conveniencia para verificar blacklist
    """
    return await blacklist_service.is_token_blacklisted(jti, user_id)


async def add_token_to_blacklist(
    jti: str,
    reason: str = "manual_revocation",
    user_id: Optional[int] = None,
    revoked_by: Optional[str] = None
) -> bool:
    """
    Función de conveniencia para agregar token a blacklist
    """
    return await blacklist_service.add_token_to_blacklist(jti, reason, user_id, revoked_by)


async def revoke_all_user_tokens(
    user_id: int,
    reason: str = "security_breach",
    revoked_by: str = "admin"
) -> bool:
    """
    Función de conveniencia para revocar todos los tokens de un usuario
    """
    return await blacklist_service.revoke_all_user_tokens(user_id, reason, revoked_by)


async def revoke_refresh_token(
    refresh_jti: str,
    reason: str = "manual_revocation",
    user_id: Optional[int] = None
) -> bool:
    """
    Función de conveniencia para revocar refresh token
    """
    return await blacklist_service.add_refresh_token_to_blacklist(refresh_jti, reason, user_id)


# ==========================================
# FUNCIONES ADMINISTRATIVAS
# ==========================================

async def remove_token_from_blacklist(jti: str) -> bool:
    """
    Función administrativa para remover token de blacklist
    """
    return await blacklist_service.remove_token_from_blacklist(jti)


async def get_blacklist_stats() -> Dict[str, Any]:
    """
    Función para obtener estadísticas de blacklist
    """
    return await blacklist_service.get_blacklist_stats()


async def clear_user_token_revocation(user_id: int) -> bool:
    """
    Función administrativa para limpiar revocación masiva de usuario
    """
    try:
        user_revoke_key = f"user:tokens:revoked:{user_id}"
        deleted = await redis_client.delete(user_revoke_key)
        
        if deleted:
            logger.info(f"Cleared token revocation for user {user_id}")
            
        return deleted > 0
        
    except Exception as e:
        logger.error(f"Error clearing user token revocation for {user_id}: {e}")
        return False