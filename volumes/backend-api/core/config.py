"""
Configuración global del sistema JWT Auth
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Configuración global de la aplicación"""
    
    # ==========================================
    # JWT Configuration
    # ==========================================
    JWT_SECRET_SYSTEM: str = Field(..., env="JWT_SECRET_SYSTEM")
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=30, env="JWT_REFRESH_TOKEN_EXPIRE_DAYS")
    
    # ==========================================
    # Redis Configuration
    # ==========================================
    REDIS_HOST: str = Field(default="redis", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, env="REDIS_PASSWORD")
    REDIS_MAX_CONNECTIONS: int = Field(default=20, env="REDIS_MAX_CONNECTIONS")
    REDIS_CONNECTION_TIMEOUT: int = Field(default=5, env="REDIS_CONNECTION_TIMEOUT")
    REDIS_SOCKET_TIMEOUT: int = Field(default=5, env="REDIS_SOCKET_TIMEOUT")
    
    # ==========================================
    # Cache TTLs (seconds)
    # ==========================================
    USER_SECRET_CACHE_TTL: int = Field(default=3600, env="USER_SECRET_CACHE_TTL")  # 1 hour
    TOKEN_BLACKLIST_TTL: int = Field(default=1800, env="TOKEN_BLACKLIST_TTL")  # 30 min
    RATE_LIMIT_WINDOW: int = Field(default=60, env="RATE_LIMIT_WINDOW")  # 1 minute
    
    # ==========================================
    # Security Settings
    # ==========================================
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60, env="RATE_LIMIT_REQUESTS_PER_MINUTE")
    RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR: int = Field(default=10, env="RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR")
    MAX_LOGIN_ATTEMPTS: int = Field(default=5, env="MAX_LOGIN_ATTEMPTS")
    LOCKOUT_DURATION_MINUTES: int = Field(default=15, env="LOCKOUT_DURATION_MINUTES")
    
    # ==========================================
    # Database Configuration
    # ==========================================
    DATABASE_URL: Optional[str] = Field(default=None, env="DATABASE_URL")
    DB_HOST: str = Field(default="mariadb", env="DB_HOST")
    DB_PORT: int = Field(default=3306, env="DB_PORT")
    DB_NAME: str = Field(default="inventario", env="DB_NAME")
    DB_USER: str = Field(default="root", env="DB_USER")
    DB_PASSWORD: str = Field(..., env="DB_PASSWORD")
    
    # ==========================================
    # Application Settings
    # ==========================================
    API_VERSION: str = Field(default="v1", env="API_VERSION")
    DEBUG_MODE: bool = Field(default=False, env="DEBUG_MODE")
    ENABLE_STACK_TRACE: bool = Field(default=False, env="ENABLE_STACK_TRACE")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    
    # ==========================================
    # Logging Configuration
    # ==========================================
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(default="json", env="LOG_FORMAT")  # json | text
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    
    @property
    def redis_url(self) -> str:
        """Construir URL de Redis"""
        password_part = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{password_part}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    @property
    def database_connection_url(self) -> str:
        """Construir URL de conexión a la base de datos"""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    @property
    def is_development(self) -> bool:
        """Verificar si estamos en desarrollo"""
        return self.ENVIRONMENT.lower() in ["development", "dev"]
    
    @property
    def is_production(self) -> bool:
        """Verificar si estamos en producción"""
        return self.ENVIRONMENT.lower() in ["production", "prod"]


# Instancia global de configuración
settings = Settings()


def get_settings() -> Settings:
    """
    Dependency para FastAPI - permite inyección de configuración
    """
    return settings