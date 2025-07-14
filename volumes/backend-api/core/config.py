# volumes/backend-api/config.py
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
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES") or "60")
    BACKEND_API_SECRET_KEY: str = os.getenv("JWT_SECRET_SYSTEM", "default_secret_key")  # Alias para compatibilidad
    
    # ====== Servicios externos ======
    DOCS_API_URL: Optional[str] = os.getenv("DOCS_API_URL")
    TASKS_API_URL: Optional[str] = os.getenv("TASKS_API_URL")
    
    # ====== Configuraciones adicionales ======
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")
    
    # ====== Security Settings ======
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE") or "60")
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS") or "5")
    LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES") or "15")
    
    # ====== Cache TTLs ======
    USER_SECRET_CACHE_TTL: int = int(os.getenv("USER_SECRET_CACHE_TTL") or "3600")
    TOKEN_BLACKLIST_TTL: int = int(os.getenv("TOKEN_BLACKLIST_TTL") or "1800")
    
    #======== Enable Stack =====
    ENABLE_STACK_TRACE:bool = os.getenv("ENABLE_STACK_TRACE", "false").lower() == "true"
    
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
            ("SECRET_KEY", self.SECRET_KEY),
        ]
        
        missing_vars = [var_name for var_name, var_value in required_vars if not var_value]
        
        if missing_vars:
            raise ValueError(f"Variables de entorno faltantes: {', '.join(missing_vars)}")
    
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
        }
    
    def get_sensitive_debug_info(self) -> dict:
        """Retorna información sensible solo para desarrollo."""
        if not self.is_development:
            raise ValueError("Información sensible solo disponible en desarrollo")
        
        return {
            **self.get_debug_info(),
            "mysql_password": self.MYSQL_PASSWORD,
            "redis_password": self.REDIS_PASSWORD,
            "secret_key": self.SECRET_KEY[:10] + "..." if len(self.SECRET_KEY) > 10 else self.SECRET_KEY,
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