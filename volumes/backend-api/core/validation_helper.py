"""
volumes/backend-api/core/validation_helper.py
Helper centralizado para validaciones comunes
"""
from utils.log_helper import setup_logger

logger = setup_logger(__name__)

class ValidationHelper:
    """Validaciones reutilizables"""
    
    @staticmethod
    def validate_user_id(user_id: int, function_name: str) -> bool:
        """Validación centralizada de user_id"""
        if not user_id or user_id <= 0:
            logger.warning(f"{function_name} called with invalid user_id: {user_id}")
            return False
        return True
    
    @staticmethod
    def validate_non_empty_list(data_list: list, field_name: str) -> bool:
        """Validar que una lista no esté vacía"""
        if not data_list:
            logger.debug(f"{field_name} is empty")
            return False
        return True