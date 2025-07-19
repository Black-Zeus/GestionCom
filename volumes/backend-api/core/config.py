"""
volumes/backend-api/config.py
Configuración centralizada de la aplicación con validaciones y propiedades computadas
"""
import os
from typing import Optional
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv()

class Settings:
    """Configuración centralizada de la aplicación."""
    
    # ====== Configuración de la aplicación ======
    APP_NAME: str = "API de Conectividad con la Base de Datos del Sistema"
    API_VERSION: str = os.getenv("API_VERSION", "1.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("JWT_SECRET_SYSTEM", "default_secret_key")
    
    # ====== API Configuration ======
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT") or "8000")
    API_PREFIX: str = os.getenv("API_PREFIX", "/api/v1")
    
    # ====== Base de datos (MySQL/MariaDB) ======
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT") or "3306")
    MYSQL_USER: str = os.getenv("MYSQL_USER")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE")
    
    # ====== Redis ======
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT") or "6379")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD")
    REDIS_DB: int = int(os.getenv("REDIS_DB") or "0")
    REDIS_MAX_CONNECTIONS: int = int(os.getenv("REDIS_MAX_CONNECTIONS") or "10")
    REDIS_CONNECTION_TIMEOUT: int = int(os.getenv("REDIS_CONNECTION_TIMEOUT") or "5")
    REDIS_SOCKET_TIMEOUT: int = int(os.getenv("REDIS_SOCKET_TIMEOUT") or "5")
    
    # ====== JWT Configuration ======
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_SECRET_SYSTEM: str = os.getenv("JWT_SECRET_SYSTEM", "default_secret_key_change_in_production")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES") or "30")
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS") or "7")
    
    # ====== Aliases para compatibilidad ======
    BACKEND_API_SECRET_KEY: str = JWT_SECRET_SYSTEM  # Alias para compatibilidad
    JWT_EXPIRATION_MINUTES: int = JWT_ACCESS_TOKEN_EXPIRE_MINUTES  # Alias para compatibilidad
    
    # ====== Servicios externos ======
    DOCS_API_URL: Optional[str] = os.getenv("DOCS_API_URL")
    TASKS_API_URL: Optional[str] = os.getenv("TASKS_API_URL")
    
    # ====== Configuraciones adicionales ======
    DEBUG_MODE: bool = os.getenv("BACKEND_API_DEBUG_MODE", "false").lower() == "true"
    LOG_DIR = os.getenv("BACKEND_API_LOG_DIR", "/var/log/app")
    LOG_LEVEL = os.getenv("BACKEND_API_LOG_LEVEL", "INFO").upper()
    LOG_FILE_NAME = os.getenv("BACKEND_API_LOG_FILE_NAME", "app.log")
    LOG_ROTATE_WHEN = os.getenv("BACKEND_API_LOG_ROTATE_WHEN", "midnight")
    LOG_ROTATE_INTERVAL = int(os.getenv("BACKEND_API_LOG_ROTATE_INTERVAL", 1))
    LOG_BACKUP_COUNT = int(os.getenv("BACKEND_API_LOG_BACKUP_COUNT", 7))
    LOG_FORMAT = os.getenv("BACKEND_API_LOG_FORMAT", "txt").lower()

    # ====== Security Settings ======
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE") or "60")
    RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR: int = int(os.getenv("RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR") or "10")
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW") or "60")
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS") or "5")
    LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES") or "15")

    REDIS_TTL_RESETPASS: int = int(os.getenv("REDIS_TTL_RESETPASS") or "15")
    RESET_PASSWORD_REQUESTS_PER_HOUR: int = int(os.getenv("RESET_PASSWORD_REQUESTS_PER_HOUR") or "3")
    RESET_PASSWORD_CODE_LENGTH: int = int(os.getenv("RESET_PASSWORD_CODE_LENGTH") or "6")
    RESET_PASSWORD_CODE_EXPIRE_MINUTES: int = int(os.getenv("RESET_PASSWORD_CODE_EXPIRE_MINUTES") or "15")
    

    # ====== Cache TTLs ======
    USER_SECRET_CACHE_TTL: int = int(os.getenv("USER_SECRET_CACHE_TTL") or "3600")
    TOKEN_BLACKLIST_TTL: int = int(os.getenv("TOKEN_BLACKLIST_TTL") or "1800")
    
    # ====== JWT Refresh Token Settings ======
    JWT_REFRESH_TOKEN_ROTATION: bool = os.getenv("JWT_REFRESH_TOKEN_ROTATION", "false").lower() == "true"
    
    #======== Enable Stack =====
    ENABLE_STACK_TRACE: bool = os.getenv("ENABLE_STACK_TRACE", "false").lower() == "true"
    
    # ====== Propiedades computadas ======
    @property
    def is_development(self) -> bool:
        """Retorna True si está en modo desarrollo."""
        return self.ENVIRONMENT.lower() in ["development", "dev"]
    
    @property
    def is_production(self) -> bool:
        """Retorna True si está en modo producción."""
        return self.ENVIRONMENT.lower() in ["production", "prod"]
    
    @property
    def database_url(self) -> str:
        """Genera la URL de conexión a la base de datos."""
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"
    
    @property
    def database_connection_url(self) -> str:
        """Genera la URL de conexión a la base de datos (alias para compatibilidad)."""
        return self.database_url
    
    @property
    def redis_url(self) -> str:
        """Genera la URL de conexión a Redis."""
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # ====== Validaciones ======
    def validate(self) -> None:
        """Valida que las configuraciones requeridas estén presentes."""
        required_vars = [
            ("MYSQL_USER", self.MYSQL_USER),
            ("MYSQL_PASSWORD", self.MYSQL_PASSWORD),
            ("MYSQL_DATABASE", self.MYSQL_DATABASE),
            ("JWT_SECRET_SYSTEM", self.JWT_SECRET_SYSTEM),
        ]
        
        missing_vars = [var_name for var_name, var_value in required_vars if not var_value]
        
        if missing_vars:
            raise ValueError(f"Variables de entorno faltantes: {', '.join(missing_vars)}")
        
        # Validaciones adicionales de seguridad
        if self.is_production and self.JWT_SECRET_SYSTEM == "default_secret_key_change_in_production":
            raise ValueError("JWT_SECRET_SYSTEM debe ser cambiado en producción")
        
        if len(self.JWT_SECRET_SYSTEM) < 32:
            print("⚠️  Advertencia: JWT_SECRET_SYSTEM debería tener al menos 32 caracteres para mayor seguridad")
    
    # ====== Información de debug ======
    def get_debug_info(self) -> dict:
        """Retorna información de configuración para debugging (sin datos sensibles)."""
        return {
            "environment": self.ENVIRONMENT,
            "app_name": self.APP_NAME,
            "api_version": self.API_VERSION,
            "api_host": self.API_HOST,
            "api_port": self.API_PORT,
            "mysql_host": self.MYSQL_HOST,
            "mysql_port": self.MYSQL_PORT,
            "mysql_database": self.MYSQL_DATABASE,
            "mysql_user": self.MYSQL_USER,
            "redis_host": self.REDIS_HOST,
            "redis_port": self.REDIS_PORT,
            "redis_db": self.REDIS_DB,
            "is_development": self.is_development,
            "is_production": self.is_production,
            "jwt_algorithm": self.JWT_ALGORITHM,
            "jwt_access_token_expire_minutes": self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
            "jwt_refresh_token_expire_days": self.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
            "rate_limit_requests_per_minute": self.RATE_LIMIT_REQUESTS_PER_MINUTE,
            "rate_limit_login_attempts_per_hour": self.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR,
        }
    
    def get_sensitive_debug_info(self) -> dict:
        """Retorna información sensible solo para desarrollo."""
        if not self.is_development:
            raise ValueError("Información sensible solo disponible en desarrollo")
        
        return {
            **self.get_debug_info(),
            "mysql_password": self.MYSQL_PASSWORD,
            "redis_password": self.REDIS_PASSWORD,
            "jwt_secret_system": self.JWT_SECRET_SYSTEM[:10] + "..." if len(self.JWT_SECRET_SYSTEM) > 10 else self.JWT_SECRET_SYSTEM,
        }

# Instancia global de configuración
settings = Settings()

# Validar al importar (opcional)
try:
    settings.validate()
except ValueError as e:
    print(f"⚠️  Error de configuración: {e}")
    # En desarrollo, continuar con advertencia
    # En producción, podrías hacer exit(1)