"""
Configuración de SQLAlchemy para la base de datos
"""
import logging
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

from sqlalchemy import create_engine, event, pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from core.config import settings
from core.exceptions import DatabaseException

# Configurar logger
logger = logging.getLogger(__name__)

# ==========================================
# BASE DECLARATIVA
# ==========================================

Base = declarative_base()

# ==========================================
# CONFIGURACIÓN DE ENGINES
# ==========================================

class DatabaseManager:
    """
    Manejador centralizado de conexiones a la base de datos
    """
    
    def __init__(self):
        self._engine = None
        self._async_engine = None
        self._session_factory = None
        self._async_session_factory = None
        self._is_initialized = False
    
    def initialize(self):
        """
        Inicializar engines y session factories
        """
        if self._is_initialized:
            return
        
        try:
            # ==========================================
            # ENGINE SÍNCRONO
            # ==========================================
            
            # URL de conexión síncrona (para operaciones que lo requieran)
            sync_database_url = settings.database_connection_url
            
            self._engine = create_engine(
                sync_database_url,
                echo=settings.DEBUG_MODE,  # Log SQL queries en debug
                pool_size=10,             # Tamaño del pool de conexiones
                max_overflow=20,          # Conexiones adicionales
                pool_pre_ping=True,       # Verificar conexiones antes de usar
                pool_recycle=3600,        # Reciclar conexiones cada hora
                poolclass=QueuePool,      # Tipo de pool
                connect_args={
                    "charset": "utf8mb4",
                    "connect_timeout": settings.DATABASE_TIMEOUT if hasattr(settings, 'DATABASE_TIMEOUT') else 10,
                    "autocommit": False
                }
            )
            
            # ==========================================
            # ENGINE ASÍNCRONO  
            # ==========================================
            
            # URL de conexión asíncrona (aiomysql para MariaDB/MySQL)
            async_database_url = sync_database_url.replace("mysql+pymysql://", "mysql+aiomysql://")
            
            self._async_engine = create_async_engine(
                async_database_url,
                echo=settings.DEBUG_MODE,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={
                    "charset": "utf8mb4",
                    "connect_timeout": settings.DATABASE_TIMEOUT if hasattr(settings, 'DATABASE_TIMEOUT') else 10,
                    "autocommit": False
                }
            )
            
            # ==========================================
            # SESSION FACTORIES
            # ==========================================
            
            # Factory para sesiones síncronas
            self._session_factory = sessionmaker(
                bind=self._engine,
                class_=Session,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False
            )
            
            # Factory para sesiones asíncronas
            self._async_session_factory = async_sessionmaker(
                bind=self._async_engine,
                class_=AsyncSession,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False
            )
            
            # ==========================================
            # EVENT LISTENERS
            # ==========================================
            
            # Configurar listeners para optimización
            self._setup_event_listeners()
            
            self._is_initialized = True
            logger.info("Database manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing database manager: {e}")
            raise DatabaseException(f"Failed to initialize database: {str(e)}")
    
    def _setup_event_listeners(self):
        """
        Configurar event listeners para optimizaciones
        """
        
        # ==========================================
        # LISTENER: Configuración de conexión MySQL
        # ==========================================
        
        @event.listens_for(self._engine, "connect")
        def set_mysql_mode(dbapi_connection, connection_record):
            """
            Configurar modo MySQL al conectar
            """
            try:
                with dbapi_connection.cursor() as cursor:
                    # Configurar timezone
                    cursor.execute("SET time_zone = '+00:00'")
                    
                    # Configurar SQL mode para compatibilidad
                    cursor.execute("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")
                    
                    # Configurar charset
                    cursor.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
                    
                    # Optimizaciones de performance
                    cursor.execute("SET SESSION query_cache_type = OFF")
                    
                logger.debug("MySQL connection configured successfully")
                
            except Exception as e:
                logger.warning(f"Failed to configure MySQL connection: {e}")
        
        # ==========================================
        # LISTENER: Log de conexiones (solo en debug)
        # ==========================================
        
        if settings.DEBUG_MODE:
            
            @event.listens_for(self._engine, "connect")
            def log_connection(dbapi_connection, connection_record):
                logger.debug(f"New database connection established: {id(dbapi_connection)}")
            
            @event.listens_for(self._engine, "close")
            def log_disconnection(dbapi_connection, connection_record):
                logger.debug(f"Database connection closed: {id(dbapi_connection)}")
    
    # ==========================================
    # CONTEXT MANAGERS PARA SESIONES
    # ==========================================
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Context manager para sesiones asíncronas
        """
        if not self._is_initialized:
            self.initialize()
        
        session = self._async_session_factory()
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise DatabaseException(f"Database operation failed: {str(e)}")
        finally:
            await session.close()
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[Session, None]:
        """
        Context manager para sesiones síncronas
        """
        if not self._is_initialized:
            self.initialize()
        
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise DatabaseException(f"Database operation failed: {str(e)}")
        finally:
            session.close()
    
    # ==========================================
    # PROPIEDADES Y MÉTODOS DE ACCESO
    # ==========================================
    
    @property
    def engine(self):
        """Obtener engine síncrono"""
        if not self._is_initialized:
            self.initialize()
        return self._engine
    
    @property
    def async_engine(self):
        """Obtener engine asíncrono"""
        if not self._is_initialized:
            self.initialize()
        return self._async_engine
    
    def get_session_factory(self):
        """Obtener factory de sesiones síncronas"""
        if not self._is_initialized:
            self.initialize()
        return self._session_factory
    
    def get_async_session_factory(self):
        """Obtener factory de sesiones asíncronas"""
        if not self._is_initialized:
            self.initialize()
        return self._async_session_factory
    
    async def health_check(self) -> dict:
        """
        Verificar estado de salud de la base de datos
        """
        try:
            if not self._is_initialized:
                return {
                    "status": "not_initialized",
                    "error": "Database manager not initialized"
                }
            
            # Test de conexión síncrona
            async with self.get_session() as session:
                result = session.execute("SELECT 1 as test").fetchone()
                sync_test = result[0] == 1 if result else False
            
            # Test de conexión asíncrona
            async with self.get_async_session() as session:
                result = await session.execute("SELECT 1 as test")
                row = result.fetchone()
                async_test = row[0] == 1 if row else False
            
            # Información del pool de conexiones
            pool_info = {
                "pool_size": self._engine.pool.size(),
                "checked_in": self._engine.pool.checkedin(),
                "checked_out": self._engine.pool.checkedout(),
                "overflow": self._engine.pool.overflow(),
            }
            
            return {
                "status": "healthy" if sync_test and async_test else "unhealthy",
                "sync_connection": sync_test,
                "async_connection": async_test,
                "pool_info": pool_info,
                "database_url": settings.DB_HOST + ":" + str(settings.DB_PORT) + "/" + settings.DB_NAME
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def close(self):
        """
        Cerrar todas las conexiones
        """
        try:
            if self._async_engine:
                await self._async_engine.dispose()
            
            if self._engine:
                self._engine.dispose()
            
            self._is_initialized = False
            logger.info("Database connections closed successfully")
            
        except Exception as e:
            logger.error(f"Error closing database connections: {e}")


# ==========================================
# INSTANCIA GLOBAL
# ==========================================

# Instancia global del database manager
db_manager = DatabaseManager()

# ==========================================
# FUNCIONES DE CONVENIENCIA
# ==========================================

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection para FastAPI - Sesión asíncrona
    """
    async with db_manager.get_async_session() as session:
        yield session


async def get_session() -> AsyncGenerator[Session, None]:
    """
    Dependency injection para FastAPI - Sesión síncrona
    """
    async with db_manager.get_session() as session:
        yield session


def initialize_database():
    """
    Inicializar base de datos en startup de la aplicación
    """
    db_manager.initialize()


async def close_database():
    """
    Cerrar base de datos en shutdown de la aplicación
    """
    await db_manager.close()


async def database_health_check() -> dict:
    """
    Health check de la base de datos
    """
    return await db_manager.health_check()


# ==========================================
# FUNCIONES PARA TESTING
# ==========================================

def create_test_session():
    """
    Crear sesión para testing (síncrona)
    """
    if not db_manager._is_initialized:
        db_manager.initialize()
    
    return db_manager.get_session_factory()()


async def create_test_async_session():
    """
    Crear sesión para testing (asíncrona)
    """
    if not db_manager._is_initialized:
        db_manager.initialize()
    
    return db_manager.get_async_session_factory()()


# ==========================================
# CONFIGURACIÓN PARA ALEMBIC (si decides usarlo después)
# ==========================================

def get_database_url() -> str:
    """
    Obtener URL de base de datos para Alembic
    """
    return settings.database_connection_url


def get_engine_for_alembic():
    """
    Obtener engine para Alembic
    """
    return create_engine(get_database_url())


# ==========================================
# UTILIDADES DE TRANSACCIONES
# ==========================================

@asynccontextmanager
async def database_transaction():
    """
    Context manager para transacciones manuales
    """
    async with db_manager.get_async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise


async def execute_raw_query(query: str, params: dict = None) -> list:
    """
    Ejecutar query SQL crudo de forma segura
    """
    async with db_manager.get_async_session() as session:
        result = await session.execute(query, params or {})
        return result.fetchall()


# ==========================================
# CONFIGURACIÓN DE LOGGING PARA SQL
# ==========================================

if settings.DEBUG_MODE:
    # Configurar logging detallado de SQL en modo debug
    logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    logging.getLogger('sqlalchemy.dialects').setLevel(logging.DEBUG)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.DEBUG)