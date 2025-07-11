"""
Servicio para gestión de user secrets - Generación, regeneración y poblado
Integrado con tu arquitectura de cache y base de datos
"""
import secrets
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from sqlalchemy.orm import selectinload

from core.config import settings
from core.exceptions import SystemException, ValidationException, DatabaseException
from core.constants import ErrorCode
from cache.services.user_cache import user_cache_service
from models.user import User


# Configurar logger
logger = logging.getLogger(__name__)


class UserSecretService:
    """
    Servicio para gestión completa de user secrets
    """
    
    # Configuración de generación de secrets
    SECRET_LENGTH = 32  # 32 bytes = 256 bits
    SECRET_ENCODING = 'utf-8'
    
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.db_session = db_session
        self.batch_size = 100  # Para operaciones masivas
    
    # ==========================================
    # GENERACIÓN DE SECRETS
    # ==========================================
    
    @classmethod
    def generate_user_secret(cls) -> str:
        """
        Generar un user secret seguro y único
        
        Returns:
            String hexadecimal de 64 caracteres (32 bytes)
        """
        try:
            # Generar 32 bytes aleatorios criptográficamente seguros
            random_bytes = secrets.token_bytes(cls.SECRET_LENGTH)
            
            # Convertir a hexadecimal para almacenamiento
            secret_hex = random_bytes.hex()
            
            logger.debug(f"Generated user secret: {len(secret_hex)} chars")
            return secret_hex
            
        except Exception as e:
            logger.error(f"Error generating user secret: {e}")
            raise SystemException(
                message="Error generando secret de usuario",
                details=f"Error interno: {str(e)}"
            )
    
    @classmethod
    def validate_user_secret(cls, secret: str) -> bool:
        """
        Validar formato de user secret
        
        Args:
            secret: Secret a validar
            
        Returns:
            True si el secret es válido
        """
        if not secret:
            return False
        
        # Debe ser string hexadecimal de exactamente 64 caracteres
        if len(secret) != cls.SECRET_LENGTH * 2:  # 32 bytes = 64 hex chars
            return False
        
        try:
            # Verificar que sea hexadecimal válido
            int(secret, 16)
            return True
        except ValueError:
            return False
    
    # ==========================================
    # OPERACIONES DE BASE DE DATOS
    # ==========================================
    
    async def create_user_secret(self, user_id: int) -> str:
        """
        Crear y asignar un nuevo secret a un usuario
        
        Args:
            user_id: ID del usuario
            
        Returns:
            El secret generado
            
        Raises:
            ValidationException: Si el usuario no existe o ya tiene secret
            DatabaseException: Error en operación de BD
        """
        try:
            # Verificar que el usuario existe
            user = await self._get_user_by_id(user_id)
            if not user:
                raise ValidationException(
                    message="Usuario no encontrado",
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND,
                    details=f"Usuario {user_id} no existe"
                )
            
            # Verificar que no tenga secret ya
            if user.secret:
                raise ValidationException(
                    message="Usuario ya tiene secret asignado",
                    error_code=ErrorCode.AUTH_SECRET_EXISTS,
                    details=f"Usuario {user_id} ya tiene secret. Use regenerate_user_secret para cambiarlo."
                )
            
            # Generar nuevo secret
            new_secret = self.generate_user_secret()
            
            # Actualizar en base de datos
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    secret=new_secret,
                    updated_at=datetime.now(timezone.utc)
                )
            )
            
            result = await self.db_session.execute(stmt)
            
            if result.rowcount == 0:
                raise DatabaseException("No se pudo actualizar el secret del usuario")
            
            # Confirmar transacción
            await self.db_session.commit()
            
            # Cachear el nuevo secret
            await user_cache_service.cache_user_secret(user_id, new_secret)
            
            logger.info(f"User secret created for user {user_id}")
            return new_secret
            
        except (ValidationException, DatabaseException):
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error creating user secret for {user_id}: {e}")
            raise SystemException(
                message="Error creando secret de usuario",
                details=f"Error interno: {str(e)}"
            )
    
    async def regenerate_user_secret(self, user_id: int, invalidate_tokens: bool = True) -> str:
        """
        Regenerar secret de usuario existente
        
        Args:
            user_id: ID del usuario
            invalidate_tokens: Si invalidar tokens existentes
            
        Returns:
            El nuevo secret generado
            
        Raises:
            ValidationException: Si el usuario no existe
            DatabaseException: Error en operación de BD
        """
        try:
            # Verificar que el usuario existe
            user = await self._get_user_by_id(user_id)
            if not user:
                raise ValidationException(
                    message="Usuario no encontrado",
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND,
                    details=f"Usuario {user_id} no existe"
                )
            
            # Generar nuevo secret
            new_secret = self.generate_user_secret()
            
            # Actualizar en base de datos
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(
                    secret=new_secret,
                    updated_at=datetime.now(timezone.utc)
                )
            )
            
            result = await self.db_session.execute(stmt)
            
            if result.rowcount == 0:
                raise DatabaseException("No se pudo actualizar el secret del usuario")
            
            # Confirmar transacción
            await self.db_session.commit()
            
            # Invalidar cache del usuario (incluyendo secret anterior)
            await user_cache_service.invalidate_all_user_cache(user_id)
            
            # Cachear el nuevo secret
            await user_cache_service.cache_user_secret(user_id, new_secret)
            
            # Si se requiere, invalidar tokens existentes
            if invalidate_tokens:
                await self._invalidate_user_tokens(user_id)
            
            logger.info(f"User secret regenerated for user {user_id}")
            return new_secret
            
        except (ValidationException, DatabaseException):
            await self.db_session.rollback()
            raise
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error regenerating user secret for {user_id}: {e}")
            raise SystemException(
                message="Error regenerando secret de usuario",
                details=f"Error interno: {str(e)}"
            )
    
    async def get_or_create_user_secret(self, user_id: int) -> str:
        """
        Obtener secret existente o crear uno nuevo si no existe
        
        Args:
            user_id: ID del usuario
            
        Returns:
            El secret del usuario (existente o recién creado)
        """
        try:
            # Intentar obtener desde cache primero
            cached_secret = await user_cache_service.get_user_secret(user_id)
            if cached_secret:
                logger.debug(f"Found cached secret for user {user_id}")
                return cached_secret
            
            # Obtener desde base de datos
            user = await self._get_user_by_id(user_id)
            if not user:
                raise ValidationException(
                    message="Usuario no encontrado",
                    error_code=ErrorCode.AUTH_USER_NOT_FOUND,
                    details=f"Usuario {user_id} no existe"
                )
            
            # Si ya tiene secret, devolverlo
            if user.secret and self.validate_user_secret(user.secret):
                await user_cache_service.cache_user_secret(user_id, user.secret)
                logger.debug(f"Found existing secret for user {user_id}")
                return user.secret
            
            # Si no tiene secret válido, crear uno nuevo
            logger.info(f"Creating new secret for user {user_id} (no valid secret found)")
            return await self.create_user_secret(user_id)
            
        except (ValidationException, DatabaseException):
            raise
        except Exception as e:
            logger.error(f"Error getting or creating user secret for {user_id}: {e}")
            raise SystemException(
                message="Error obteniendo secret de usuario",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # OPERACIONES MASIVAS
    # ==========================================
    
    async def populate_missing_secrets(self, batch_size: Optional[int] = None) -> Dict[str, Any]:
        """
        Poblar secrets faltantes para usuarios existentes
        
        Args:
            batch_size: Tamaño del lote para procesamiento
            
        Returns:
            Estadísticas de la operación
        """
        if batch_size is None:
            batch_size = self.batch_size
        
        try:
            # Obtener usuarios sin secret válido
            users_without_secret = await self._get_users_without_secret()
            
            if not users_without_secret:
                logger.info("No users found without secrets")
                return {
                    "total_users": 0,
                    "processed": 0,
                    "successful": 0,
                    "failed": 0,
                    "errors": []
                }
            
            total_users = len(users_without_secret)
            successful = 0
            failed = 0
            errors = []
            
            logger.info(f"Found {total_users} users without secrets. Processing in batches of {batch_size}")
            
            # Procesar en lotes
            for i in range(0, total_users, batch_size):
                batch = users_without_secret[i:i + batch_size]
                batch_results = await self._process_secret_batch(batch)
                
                successful += batch_results["successful"]
                failed += batch_results["failed"]
                errors.extend(batch_results["errors"])
                
                logger.info(f"Processed batch {i//batch_size + 1}: {len(batch)} users")
            
            return {
                "total_users": total_users,
                "processed": total_users,
                "successful": successful,
                "failed": failed,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Error in populate_missing_secrets: {e}")
            raise SystemException(
                message="Error poblando secrets faltantes",
                details=f"Error interno: {str(e)}"
            )
    
    async def _process_secret_batch(self, users: List[User]) -> Dict[str, Any]:
        """
        Procesar un lote de usuarios para crear secrets
        """
        successful = 0
        failed = 0
        errors = []
        
        try:
            # Preparar updates en batch
            updates = []
            secrets_to_cache = {}
            
            for user in users:
                try:
                    new_secret = self.generate_user_secret()
                    
                    updates.append({
                        "id": user.id,
                        "secret": new_secret,
                        "updated_at": datetime.now(timezone.utc)
                    })
                    
                    secrets_to_cache[user.id] = new_secret
                    
                except Exception as e:
                    failed += 1
                    errors.append({
                        "user_id": user.id,
                        "error": str(e)
                    })
            
            # Ejecutar updates en batch
            if updates:
                stmt = update(User)
                result = await self.db_session.execute(stmt, updates)
                await self.db_session.commit()
                
                successful = result.rowcount
                
                # Cachear secrets generados
                for user_id, secret in secrets_to_cache.items():
                    try:
                        await user_cache_service.cache_user_secret(user_id, secret)
                    except Exception as cache_error:
                        logger.warning(f"Failed to cache secret for user {user_id}: {cache_error}")
            
            return {
                "successful": successful,
                "failed": failed,
                "errors": errors
            }
            
        except Exception as e:
            await self.db_session.rollback()
            logger.error(f"Error processing secret batch: {e}")
            return {
                "successful": 0,
                "failed": len(users),
                "errors": [{"batch_error": str(e)}]
            }
    
    async def regenerate_all_secrets(self, user_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """
        Regenerar todos los secrets (operación de seguridad)
        
        Args:
            user_ids: Lista específica de usuarios, o None para todos
            
        Returns:
            Estadísticas de la operación
        """
        try:
            if user_ids:
                users = await self._get_users_by_ids(user_ids)
            else:
                users = await self._get_all_active_users()
            
            if not users:
                return {
                    "total_users": 0,
                    "processed": 0,
                    "successful": 0,
                    "failed": 0,
                    "errors": []
                }
            
            total_users = len(users)
            successful = 0
            failed = 0
            errors = []
            
            logger.warning(f"Starting mass secret regeneration for {total_users} users")
            
            # Procesar en lotes
            for i in range(0, total_users, self.batch_size):
                batch = users[i:i + self.batch_size]
                
                for user in batch:
                    try:
                        await self.regenerate_user_secret(user.id, invalidate_tokens=True)
                        successful += 1
                    except Exception as e:
                        failed += 1
                        errors.append({
                            "user_id": user.id,
                            "error": str(e)
                        })
                
                logger.info(f"Regenerated secrets for batch {i//self.batch_size + 1}")
            
            return {
                "total_users": total_users,
                "processed": total_users,
                "successful": successful,
                "failed": failed,
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Error in regenerate_all_secrets: {e}")
            raise SystemException(
                message="Error regenerando todos los secrets",
                details=f"Error interno: {str(e)}"
            )
    
    # ==========================================
    # CONSULTAS DE BASE DE DATOS
    # ==========================================
    
    async def _get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Obtener usuario por ID
        """
        try:
            stmt = select(User).where(
                and_(
                    User.id == user_id,
                    User.deleted_at.is_(None)  # Solo usuarios no eliminados
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            raise DatabaseException(f"Error consultando usuario: {str(e)}")
    
    async def _get_users_by_ids(self, user_ids: List[int]) -> List[User]:
        """
        Obtener múltiples usuarios por IDs
        """
        try:
            stmt = select(User).where(
                and_(
                    User.id.in_(user_ids),
                    User.deleted_at.is_(None)
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting users by IDs: {e}")
            raise DatabaseException(f"Error consultando usuarios: {str(e)}")
    
    async def _get_users_without_secret(self) -> List[User]:
        """
        Obtener usuarios sin secret válido
        """
        try:
            stmt = select(User).where(
                and_(
                    User.deleted_at.is_(None),
                    User.is_active == True,  # Solo usuarios activos
                    or_(
                        User.secret.is_(None),
                        User.secret == "",
                        # Agregar más condiciones para secrets inválidos si es necesario
                    )
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting users without secret: {e}")
            raise DatabaseException(f"Error consultando usuarios sin secret: {str(e)}")
    
    async def _get_all_active_users(self) -> List[User]:
        """
        Obtener todos los usuarios activos
        """
        try:
            stmt = select(User).where(
                and_(
                    User.deleted_at.is_(None),
                    User.is_active == True
                )
            )
            
            result = await self.db_session.execute(stmt)
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting all active users: {e}")
            raise DatabaseException(f"Error consultando usuarios activos: {str(e)}")
    
    # ==========================================
    # INTEGRACIÓN CON BLACKLIST
    # ==========================================
    
    async def _invalidate_user_tokens(self, user_id: int) -> None:
        """
        Invalidar todos los tokens de un usuario
        
        Nota: Esto requiere integración con el servicio de blacklist
        """
        try:
            # Importación dinámica para evitar circular imports
            from cache.services.blacklist_service import blacklist_all_user_tokens
            
            await blacklist_all_user_tokens(user_id)
            logger.info(f"All tokens invalidated for user {user_id}")
            
        except ImportError:
            logger.warning("Blacklist service not available, tokens not invalidated")
        except Exception as e:
            logger.error(f"Error invalidating tokens for user {user_id}: {e}")
            # No es crítico si falla la invalidación de tokens
    
    # ==========================================
    # UTILIDADES Y ESTADÍSTICAS
    # ==========================================
    
    async def get_secret_statistics(self) -> Dict[str, Any]:
        """
        Obtener estadísticas de secrets de usuarios
        """
        try:
            # Contar usuarios por estado de secret
            stmt_total = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    User.is_active == True
                )
            )
            
            stmt_with_secret = select(func.count(User.id)).where(
                and_(
                    User.deleted_at.is_(None),
                    User.is_active == True,
                    User.secret.is_not(None),
                    User.secret != ""
                )
            )
            
            total_users = await self.db_session.scalar(stmt_total)
            users_with_secret = await self.db_session.scalar(stmt_with_secret)
            users_without_secret = total_users - users_with_secret
            
            return {
                "total_active_users": total_users,
                "users_with_secret": users_with_secret,
                "users_without_secret": users_without_secret,
                "secret_coverage_percentage": round((users_with_secret / total_users * 100) if total_users > 0 else 0, 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting secret statistics: {e}")
            return {"error": str(e)}
    
    async def validate_all_secrets(self) -> Dict[str, Any]:
        """
        Validar todos los secrets existentes
        """
        try:
            stmt = select(User.id, User.secret).where(
                and_(
                    User.deleted_at.is_(None),
                    User.secret.is_not(None),
                    User.secret != ""
                )
            )
            
            result = await self.db_session.execute(stmt)
            users_with_secrets = result.all()
            
            valid_secrets = 0
            invalid_secrets = []
            
            for user_id, secret in users_with_secrets:
                if self.validate_user_secret(secret):
                    valid_secrets += 1
                else:
                    invalid_secrets.append(user_id)
            
            return {
                "total_checked": len(users_with_secrets),
                "valid_secrets": valid_secrets,
                "invalid_secrets_count": len(invalid_secrets),
                "invalid_user_ids": invalid_secrets
            }
            
        except Exception as e:
            logger.error(f"Error validating all secrets: {e}")
            return {"error": str(e)}


# ==========================================
# FUNCIONES DE CONVENIENCIA Y FACTORY
# ==========================================

def create_user_secret_service(db_session: AsyncSession) -> UserSecretService:
    """
    Factory para crear instancia del servicio
    """
    return UserSecretService(db_session)


async def ensure_user_has_secret(user_id: int, db_session: AsyncSession) -> str:
    """
    Función de conveniencia para asegurar que un usuario tenga secret
    """
    service = create_user_secret_service(db_session)
    return await service.get_or_create_user_secret(user_id)


async def generate_and_assign_secret(user_id: int, db_session: AsyncSession) -> str:
    """
    Función de conveniencia para generar y asignar un nuevo secret
    """
    service = create_user_secret_service(db_session)
    return await service.create_user_secret(user_id)

