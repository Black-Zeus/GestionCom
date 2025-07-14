"""
Servicio de blacklist para tokens JWT - Invalidación y verificación
Integrado con Redis y tu arquitectura de cache existente
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Set

from cache.redis_client import redis_client
from core.config import settings
from core.security import jwt_manager
from core.constants import RedisKeys
from core.exceptions import CacheException, SystemException
from database.schemas.token import BlacklistReason, TokenType
import json

# Configurar logger
logger = logging.getLogger(__name__)


class BlacklistService:
    """
    Servicio para gestión de blacklist de tokens JWT
    """
    
    def __init__(self):
        # TTLs por defecto
        self.default_blacklist_ttl = 86400  # 24 horas
        self.cleanup_batch_size = 1000
        
        # Prefijos de Redis keys
        self.token_blacklist_prefix = "blacklist:token:"
        self.user_tokens_prefix = "blacklist:user:"
        self.blacklist_metadata_prefix = "blacklist:meta:"
        
        # Configuración de operaciones batch
        self.max_batch_size = 100
    
    # ==========================================
    # BLACKLIST INDIVIDUAL DE TOKENS
    # ==========================================
    
    async def blacklist_token(
        self,
        jti: str,
        reason: str,
        user_id: int,
        expires_at: Optional[datetime] = None,
        blacklisted_by_user_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> bool:
        """
        Agregar token a blacklist
        
        Args:
            jti: JWT ID del token
            reason: Razón del blacklist
            user_id: ID del usuario propietario
            expires_at: Cuándo expira el blacklist (por defecto: expiración del token)
            blacklisted_by_user_id: Quién blacklisteó el token
            notes: Notas adicionales
            
        Returns:
            True si se blacklisteó exitosamente
        """
        try:
            # 1. Calcular TTL del blacklist
            ttl = self._calculate_blacklist_ttl(expires_at)
            
            # 2. Crear metadata del blacklist
            metadata = {
                "jti": jti,
                "user_id": user_id,
                "reason": reason,
                "blacklisted_at": datetime.now(timezone.utc).isoformat(),
                "blacklisted_by_user_id": blacklisted_by_user_id,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "notes": notes
            }
            
            # 3. Keys de Redis
            token_key = f"{self.token_blacklist_prefix}{jti}"
            user_tokens_key = f"{self.user_tokens_prefix}{user_id}"
            metadata_key = f"{self.blacklist_metadata_prefix}{jti}"
            
            # 4. Usar pipeline para operación atómica
            async with redis_client.pipeline() as pipe:
                # Marcar token como blacklisteado
                pipe.setex(token_key, ttl, "1")
                
                # Agregar a lista de tokens del usuario
                pipe.sadd(user_tokens_key, jti)
                pipe.expire(user_tokens_key, ttl)
                
                # Guardar metadata
                # pipe.setex(metadata_key, ttl, metadata)
                pipe.setex(metadata_key, ttl, json.dumps(metadata))
                
                # Incrementar contador global
                pipe.incr("blacklist:stats:total")
                pipe.incr(f"blacklist:stats:reason:{reason}")
                
                results = await pipe.execute()
            
            # 5. Verificar que todas las operaciones fueron exitosas
            success = all(results[:3])  # Las primeras 3 operaciones deben ser exitosas
            
            if success:
                logger.info(f"Token {jti} blacklisted successfully for user {user_id}, reason: {reason}")
            else:
                logger.error(f"Failed to blacklist token {jti}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error blacklisting token {jti}: {e}")
            return False
    
    async def is_token_blacklisted(self, jti: str, user_id: Optional[int] = None) -> bool:
        """
        Verificar si un token está en blacklist
        
        Args:
            jti: JWT ID del token
            user_id: ID del usuario (opcional, para validación adicional)
            
        Returns:
            True si el token está blacklisteado
        """
        try:
            token_key = f"{self.token_blacklist_prefix}{jti}"
            
            # Verificar existencia en blacklist
            is_blacklisted = await redis_client.exists(token_key)
            
            if is_blacklisted:
                logger.debug(f"Token {jti} found in blacklist")
                
                # Validación adicional por usuario si se proporciona
                if user_id:
                    user_tokens_key = f"{self.user_tokens_prefix}{user_id}"
                    is_user_token = await redis_client.sismember(user_tokens_key, jti)
                    
                    if not is_user_token:
                        logger.warning(f"Token {jti} in blacklist but not associated with user {user_id}")
                        return False
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking blacklist for token {jti}: {e}")
            # En caso de error, por seguridad asumir que SÍ está blacklisteado
            return True
    
    async def remove_from_blacklist(self, jti: str, user_id: int) -> bool:
        """
        Remover token de blacklist (para casos especiales)
        
        Args:
            jti: JWT ID del token
            user_id: ID del usuario
            
        Returns:
            True si se removió exitosamente
        """
        try:
            token_key = f"{self.token_blacklist_prefix}{jti}"
            user_tokens_key = f"{self.user_tokens_prefix}{user_id}"
            metadata_key = f"{self.blacklist_metadata_prefix}{jti}"
            
            # Usar pipeline para operación atómica
            async with redis_client.pipeline() as pipe:
                pipe.delete(token_key)
                pipe.srem(user_tokens_key, jti)
                pipe.delete(metadata_key)
                
                results = await pipe.execute()
            
            removed = results[0] > 0  # Si se deletó al menos 1 key
            
            if removed:
                logger.info(f"Token {jti} removed from blacklist for user {user_id}")
            
            return removed
            
        except Exception as e:
            logger.error(f"Error removing token {jti} from blacklist: {e}")
            return False
    
    # ==========================================
    # BLACKLIST MASIVO POR USUARIO
    # ==========================================
    
    async def blacklist_user_tokens(
        self,
        user_id: int,
        reason: str,
        token_types: Optional[List[TokenType]] = None,
        exclude_jti: Optional[str] = None,
        issued_after: Optional[datetime] = None,
        issued_before: Optional[datetime] = None,
        blacklisted_by_user_id: Optional[int] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Blacklistear todos los tokens de un usuario
        
        Args:
            user_id: ID del usuario
            reason: Razón del blacklist
            token_types: Tipos de tokens a blacklistear (None = todos)
            exclude_jti: JTI a excluir del blacklist
            issued_after: Solo tokens emitidos después de esta fecha
            issued_before: Solo tokens emitidos antes de esta fecha
            blacklisted_by_user_id: Quién ejecuta el blacklist
            notes: Notas del blacklist masivo
            
        Returns:
            Diccionario con estadísticas del blacklist
        """
        try:
            logger.info(f"Starting bulk blacklist for user {user_id}, reason: {reason}")
            
            # 1. Obtener tokens activos del usuario (simulado - en implementación real sería desde una BD de sesiones)
            active_tokens = await self._get_user_active_tokens(user_id)
            
            if not active_tokens:
                logger.info(f"No active tokens found for user {user_id}")
                return {
                    "total_found": 0,
                    "total_blacklisted": 0,
                    "blacklisted_jtis": [],
                    "failed_jtis": [],
                    "excluded_jtis": []
                }
            
            # 2. Filtrar tokens según criterios
            tokens_to_blacklist = []
            excluded_jtis = []
            
            for token_info in active_tokens:
                jti = token_info.get("jti")
                token_type = token_info.get("token_type")
                issued_at = token_info.get("issued_at")
                
                # Excluir token específico
                if exclude_jti and jti == exclude_jti:
                    excluded_jtis.append(jti)
                    continue
                
                # Filtrar por tipo de token
                if token_types and token_type not in token_types:
                    continue
                
                # Filtrar por fecha de emisión
                if issued_after and issued_at and issued_at < issued_after:
                    continue
                
                if issued_before and issued_at and issued_at > issued_before:
                    continue
                
                tokens_to_blacklist.append(token_info)
            
            # 3. Blacklistear tokens en lotes
            blacklisted_jtis = []
            failed_jtis = []
            
            for i in range(0, len(tokens_to_blacklist), self.max_batch_size):
                batch = tokens_to_blacklist[i:i + self.max_batch_size]
                batch_results = await self._blacklist_token_batch(
                    batch, reason, user_id, blacklisted_by_user_id, notes
                )
                
                blacklisted_jtis.extend(batch_results["successful"])
                failed_jtis.extend(batch_results["failed"])
            
            result = {
                "total_found": len(active_tokens),
                "total_blacklisted": len(blacklisted_jtis),
                "blacklisted_jtis": blacklisted_jtis,
                "failed_jtis": failed_jtis,
                "excluded_jtis": excluded_jtis,
                "reason": reason,
                "blacklisted_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Bulk blacklist completed for user {user_id}: {len(blacklisted_jtis)} tokens blacklisted")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in bulk blacklist for user {user_id}: {e}")
            return {
                "total_found": 0,
                "total_blacklisted": 0,
                "blacklisted_jtis": [],
                "failed_jtis": [],
                "excluded_jtis": [],
                "error": str(e)
            }
    
    async def _blacklist_token_batch(
        self,
        tokens: List[Dict[str, Any]],
        reason: str,
        user_id: int,
        blacklisted_by_user_id: Optional[int],
        notes: Optional[str]
    ) -> Dict[str, List[str]]:
        """
        Blacklistear un lote de tokens
        """
        successful = []
        failed = []
        
        try:
            # Procesar tokens individualmente dentro del lote
            for token_info in tokens:
                jti = token_info.get("jti")
                expires_at = token_info.get("expires_at")
                
                try:
                    success = await self.blacklist_token(
                        jti=jti,
                        reason=reason,
                        user_id=user_id,
                        expires_at=expires_at,
                        blacklisted_by_user_id=blacklisted_by_user_id,
                        notes=notes
                    )
                    
                    if success:
                        successful.append(jti)
                    else:
                        failed.append(jti)
                        
                except Exception as e:
                    logger.error(f"Error blacklisting token {jti} in batch: {e}")
                    failed.append(jti)
            
            return {"successful": successful, "failed": failed}
            
        except Exception as e:
            logger.error(f"Error processing token batch: {e}")
            return {"successful": [], "failed": [token.get("jti") for token in tokens]}
    
    async def get_user_blacklisted_tokens(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Obtener todos los tokens blacklisteados de un usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            Lista de tokens blacklisteados con metadata
        """
        try:
            user_tokens_key = f"{self.user_tokens_prefix}{user_id}"
            
            # Obtener JTIs blacklisteados del usuario
            blacklisted_jtis = await redis_client.smembers(user_tokens_key)
            
            if not blacklisted_jtis:
                return []
            
            # Obtener metadata de cada token
            tokens_info = []
            
            for jti in blacklisted_jtis:
                metadata_key = f"{self.blacklist_metadata_prefix}{jti}"
                # metadata = await redis_client.get(metadata_key)
                metadata_json = await redis_client.get(metadata_key)
                metadata = json.loads(metadata_json) if metadata_json else None
                
                if metadata:
                    tokens_info.append(metadata)
                else:
                    # Token sin metadata, crear entrada básica
                    tokens_info.append({
                        "jti": jti,
                        "user_id": user_id,
                        "reason": "unknown",
                        "blacklisted_at": None
                    })
            
            return tokens_info
            
        except Exception as e:
            logger.error(f"Error getting blacklisted tokens for user {user_id}: {e}")
            return []
    
    # ==========================================
    # OPERACIONES DE LIMPIEZA Y MANTENIMIENTO
    # ==========================================
    
    async def cleanup_expired_blacklist_entries(self) -> Dict[str, int]:
        """
        Limpiar entradas expiradas de blacklist
        
        Returns:
            Estadísticas de limpieza
        """
        try:
            logger.info("Starting blacklist cleanup")
            
            # Obtener todas las keys de blacklist
            token_pattern = f"{self.token_blacklist_prefix}*"
            metadata_pattern = f"{self.blacklist_metadata_prefix}*"
            
            token_keys = await redis_client.keys(token_pattern)
            metadata_keys = await redis_client.keys(metadata_pattern)
            
            # Verificar cuáles han expirado realmente
            expired_tokens = []
            expired_metadata = []
            
            # Procesar en lotes para no sobrecargar Redis
            for i in range(0, len(token_keys), self.cleanup_batch_size):
                batch = token_keys[i:i + self.cleanup_batch_size]
                
                for key in batch:
                    ttl = await redis_client.ttl(key)
                    if ttl == -2:  # Key expirada
                        expired_tokens.append(key)
            
            for i in range(0, len(metadata_keys), self.cleanup_batch_size):
                batch = metadata_keys[i:i + self.cleanup_batch_size]
                
                for key in batch:
                    ttl = await redis_client.ttl(key)
                    if ttl == -2:  # Key expirada
                        expired_metadata.append(key)
            
            # Eliminar keys expiradas
            if expired_tokens:
                await redis_client.delete(*expired_tokens)
            
            if expired_metadata:
                await redis_client.delete(*expired_metadata)
            
            stats = {
                "expired_tokens_cleaned": len(expired_tokens),
                "expired_metadata_cleaned": len(expired_metadata),
                "total_cleaned": len(expired_tokens) + len(expired_metadata)
            }
            
            logger.info(f"Blacklist cleanup completed: {stats['total_cleaned']} entries removed")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error in blacklist cleanup: {e}")
            return {"error": str(e)}
    
    async def get_blacklist_statistics(self) -> Dict[str, Any]:
        """
        Obtener estadísticas del sistema de blacklist
        
        Returns:
            Estadísticas completas del blacklist
        """
        try:
            # Contadores básicos
            total_blacklisted = await redis_client.get("blacklist:stats:total") or 0
            
            # Estadísticas por razón
            reasons_stats = {}
            for reason in BlacklistReason:
                count = await redis_client.get(f"blacklist:stats:reason:{reason.value}") or 0
                reasons_stats[reason.value] = int(count)
            
            # Contar keys activas (aproximado)
            token_pattern = f"{self.token_blacklist_prefix}*"
            active_tokens = await redis_client.keys(token_pattern)
            active_count = len(active_tokens) if active_tokens else 0
            
            # Información de TTLs
            ttl_info = {}
            if active_tokens:
                sample_size = min(10, len(active_tokens))
                sample_keys = active_tokens[:sample_size]
                
                ttls = []
                for key in sample_keys:
                    ttl = await redis_client.ttl(key)
                    if ttl > 0:
                        ttls.append(ttl)
                
                if ttls:
                    ttl_info = {
                        "min_ttl": min(ttls),
                        "max_ttl": max(ttls),
                        "avg_ttl": sum(ttls) // len(ttls)
                    }
            
            return {
                "total_blacklisted_ever": int(total_blacklisted),
                "currently_active": active_count,
                "reasons_breakdown": reasons_stats,
                "ttl_info": ttl_info,
                "calculated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting blacklist statistics: {e}")
            return {"error": str(e)}
    
    # ==========================================
    # MÉTODOS PRIVADOS Y UTILIDADES
    # ==========================================
    
    def _calculate_blacklist_ttl(self, expires_at: Optional[datetime]) -> int:
        """
        Calcular TTL para entrada de blacklist
        
        Args:
            expires_at: Cuándo expira el token original
            
        Returns:
            TTL en segundos
        """
        if expires_at:
            now = datetime.now(timezone.utc)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            ttl = int((expires_at - now).total_seconds())
            
            # Asegurar TTL mínimo y máximo
            ttl = max(60, ttl)  # Mínimo 1 minuto
            ttl = min(ttl, self.default_blacklist_ttl)  # Máximo configurado
            
            return ttl
        
        return self.default_blacklist_ttl
    
    async def _get_user_active_tokens(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Obtener tokens activos de un usuario
        
        NOTA: Esta es una implementación simplificada.
        En una implementación real, esto vendría de:
        1. Una tabla de sesiones en BD
        2. Un registry de tokens activos en Redis
        3. Análisis de logs de tokens emitidos
        
        Por ahora, retorna una lista vacía para evitar errores.
        """
        try:
            # Implementación placeholder
            # En tu implementación real, aquí obtendrías tokens activos desde:
            # - Base de datos de sesiones
            # - Registry de tokens en Redis
            # - Sistema de tracking de tokens
            
            logger.debug(f"Getting active tokens for user {user_id} - placeholder implementation")
            
            # Por ahora retornar lista vacía
            # TODO: Implementar obtención real de tokens activos
            return []
            
        except Exception as e:
            logger.error(f"Error getting active tokens for user {user_id}: {e}")
            return []
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Verificar salud del servicio de blacklist
        """
        try:
            # Test básico de conectividad
            if not redis_client._is_available:
                return {
                    "status": "unhealthy",
                    "error": "Redis not available"
                }
            
            # Test de operación básica
            test_jti = f"health_check_{datetime.now().timestamp()}"
            test_key = f"{self.token_blacklist_prefix}{test_jti}"
            
            # Intentar escribir y leer
            await redis_client.setex(test_key, 10, "health_check")
            value = await redis_client.get(test_key)
            await redis_client.delete(test_key)
            
            if value == "health_check":
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
blacklist_service = BlacklistService()


# Funciones de conveniencia para usar en otros servicios
async def blacklist_token(
    jti: str,
    reason: str,
    user_id: int,
    expires_at: Optional[datetime] = None,
    blacklisted_by_user_id: Optional[int] = None,
    notes: Optional[str] = None
) -> bool:
    """
    Función de conveniencia para blacklistear token individual
    """
    return await blacklist_service.blacklist_token(
        jti=jti,
        reason=reason,
        user_id=user_id,
        expires_at=expires_at,
        blacklisted_by_user_id=blacklisted_by_user_id,
        notes=notes
    )


async def is_token_blacklisted(jti: str, user_id: Optional[int] = None) -> bool:
    """
    Función de conveniencia para verificar blacklist
    Esta es la función que usa tu auth_middleware.py
    """
    return await blacklist_service.is_token_blacklisted(jti, user_id)


async def blacklist_all_user_tokens(
    user_id: int,
    reason: str = BlacklistReason.USER_LOGOUT.value,
    exclude_jti: Optional[str] = None
) -> Dict[str, Any]:
    """
    Función de conveniencia para blacklist masivo
    """
    return await blacklist_service.blacklist_user_tokens(
        user_id=user_id,
        reason=reason,
        exclude_jti=exclude_jti
    )


async def cleanup_expired_blacklist() -> Dict[str, int]:
    """
    Función de conveniencia para limpieza programada
    """
    return await blacklist_service.cleanup_expired_blacklist_entries()


async def get_blacklist_stats() -> Dict[str, Any]:
    """
    Función de conveniencia para estadísticas
    """
    return await blacklist_service.get_blacklist_statistics()