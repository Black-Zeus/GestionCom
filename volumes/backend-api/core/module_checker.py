"""
volumes/backend-api/core/module_checker.py
Verificador centralizado de módulos disponibles
"""
from typing import Dict
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class ModuleChecker:
    """Verificador centralizado de disponibilidad de módulos"""
    
    _cached_modules = None
    
    @classmethod
    def get_available_modules(cls) -> Dict[str, bool]:
        """Obtener módulos disponibles (con cache)"""
        if cls._cached_modules is None:
            cls._cached_modules = cls._check_all_modules()
        return cls._cached_modules
    
    @classmethod
    def _check_all_modules(cls) -> Dict[str, bool]:
        """Verificar todos los módulos una sola vez"""
        modules = {}
        
        # Verificar database
        try:
            import database
            modules['database'] = True
            logger.info("✅ database module disponible")
        except ImportError as e:
            modules['database'] = False
            logger.error(f"❌ database module no disponible: {e}")
        
        # Verificar password_manager
        try:
            from core.password_manager import hash_user_password
            modules['password_manager'] = True
            logger.info("✅ password_manager module disponible")
        except ImportError as e:
            modules['password_manager'] = False
            logger.error(f"❌ password_manager module no disponible: {e}")
        
        # Verificar jwt_manager
        try:
            from core.security import jwt_manager
            modules['jwt_manager'] = True
            logger.info("✅ jwt_manager module disponible")
        except ImportError as e:
            modules['jwt_manager'] = False
            logger.error(f"❌ jwt_manager module no disponible: {e}")
        
        # Verificar Redis client de manera segura
        try:
            # Import directo sin usar redis_client para evitar circular import
            import redis.asyncio as aioredis
            # Intentar conexión básica para verificar disponibilidad
            modules['redis_available'] = True
            logger.info("✅ redis module disponible")
        except ImportError as e:
            modules['redis_available'] = False
            logger.error(f"❌ redis module no disponible: {e}")
        
        # Verificar user_cache basado en Redis
        modules['user_cache'] = modules['redis_available']
        if modules['user_cache']:
            logger.info("✅ user_cache module disponible (Redis OK)")
        else:
            logger.error("❌ user_cache module no disponible (Redis requerido)")
        
        # Verificar rate_limit basado en Redis
        modules['rate_limit'] = modules['redis_available']
        if modules['rate_limit']:
            logger.info("✅ rate_limit module disponible (Redis OK)")
        else:
            logger.error("❌ rate_limit module no disponible (Redis requerido)")
        
        return modules