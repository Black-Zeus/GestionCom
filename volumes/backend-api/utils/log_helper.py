import os
import logging
from logging.handlers import TimedRotatingFileHandler
from core.config import settings

# Cache para evitar configurar el mismo logger múltiples veces
_configured_loggers = set()

def setup_logger(name: str) -> logging.Logger:
    """
    Configurar logger único del sistema
    
    Args:
        name: Nombre del logger (usar __name__ del módulo)
    
    Returns:
        Logger configurado con archivo + consola + información de ubicación
    """
    logger = logging.getLogger(name)
    
    # Si ya está configurado, devolverlo
    if name in _configured_loggers:
        return logger
    
    # Limpiar handlers previos
    logger.handlers.clear()
    
    # Configurar nivel
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(log_level)
    
    # Evitar propagación duplicada
    logger.propagate = False
    
    # Crear formateador CON INFORMACIÓN DE ARCHIVO Y LÍNEA
    if settings.LOG_FORMAT.lower() == "json":
        try:
            from pythonjsonlogger import jsonlogger
            # JSON con archivo y línea
            formatter = jsonlogger.JsonFormatter(
                '%(asctime)s %(name)s %(levelname)s %(filename)s %(lineno)d %(funcName)s %(message)s'
            )
        except ImportError:
            # Fallback con formato estándar mejorado
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
            )
    else:
        # Formato estándar con archivo y línea - ESTE ES EL CAMBIO PRINCIPAL
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
        )
    
    # Handler de archivo (con protección de errores)
    try:
        os.makedirs(settings.LOG_DIR, exist_ok=True)
        log_file_path = os.path.join(settings.LOG_DIR, settings.LOG_FILE_NAME)
        
        file_handler = TimedRotatingFileHandler(
            log_file_path,
            when=settings.LOG_ROTATE_WHEN,
            interval=settings.LOG_ROTATE_INTERVAL,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: No se pudo crear log file: {e}")
    
    # Handler de consola
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Marcar como configurado
    _configured_loggers.add(name)
    
    return logger