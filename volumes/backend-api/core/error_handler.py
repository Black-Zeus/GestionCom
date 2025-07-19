"""
volumes/backend-api/core/error_handler.py
Manejo centralizado de errores y fallbacks
"""
from typing import Dict, List
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class ErrorHandler:
    """Manejo centralizado de errores"""
    
    @staticmethod
    def log_and_return_empty_permissions(error: Exception, context: str, user_id: int = None) -> Dict[str, List[str]]:
        """Manejo estándar de errores para permisos"""
        user_context = f" for user {user_id}" if user_id else ""
        logger.error(f"Error in {context}{user_context}: {error}")
        
        return {
            "roles": [],
            "permissions": []
        }
    
    @staticmethod
    def log_and_return_none(error: Exception, context: str, user_id: int = None) -> None:
        """Manejo estándar de errores que retornan None"""
        user_context = f" for user {user_id}" if user_id else ""
        logger.error(f"Error in {context}{user_context}: {error}")
        return None