"""
Database package initialization
Exporta las funciones y clases principales para uso en toda la aplicación
"""

# ==========================================
# IMPORTS PRINCIPALES
# ==========================================

try:
    # Intentar importar configuración principal
    from core.config import settings
    CONFIG_AVAILABLE = True
except ImportError:
    print("⚠️  Warning: core.config no disponible, usando configuración básica")
    CONFIG_AVAILABLE = False
    # Configuración básica de fallback
    class BasicSettings:
        DB_HOST = "mariadb"
        DB_PORT = 3306
        DB_NAME = "inventario"
        DB_USER = "root"
        DB_PASSWORD = "password"
        
        @property
        def database_connection_url(self):
            return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    settings = BasicSettings()

# Imports de SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from typing import AsyncGenerator, Generator
import logging

# ==========================================
# CONFIGURACIÓN DE LOGGING
# ==========================================

logger = logging.getLogger(__name__)

# ==========================================
# CONFIGURACIÓN DE ENGINES Y SESSIONS
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
        self._initialized = False
    
    def initialize(self):
        """
        Inicializar conexiones de base de datos
        """
        if self._initialized:
            return
        
        try:
            # URLs de conexión
            if CONFIG_AVAILABLE:
                sync_url = settings.database_connection_url
                async_url = settings.database_connection_url.replace("mysql+pymysql", "mysql+aiomysql")
            else:
                sync_url = settings.database_connection_url
                async_url = sync_url.replace("mysql+pymysql", "mysql+aiomysql")
            
            # Engine síncrono
            self._engine = create_engine(
                sync_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
                echo=False  # Cambiar a True para debug SQL
            )
            
            # Engine asíncrono
            self._async_engine = create_async_engine(
                async_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
                echo=False  # Cambiar a True para debug SQL
            )
            
            # Session factories
            self._session_factory = sessionmaker(
                bind=self._engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False
            )
            
            self._async_session_factory = async_sessionmaker(
                bind=self._async_engine,
                class_=AsyncSession,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False
            )
            
            self._initialized = True
            logger.info("✅ Database manager initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Error initializing database: {e}")
            self._initialized = False
            raise
    
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Obtener sesión asíncrona para uso con FastAPI
        """
        if not self._initialized:
            self.initialize()
        
        async with self._async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    def get_session(self) -> Generator[Session, None, None]:
        """
        Obtener sesión síncrona
        """
        if not self._initialized:
            self.initialize()
        
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    async def test_connection(self) -> bool:
        """
        Probar conexión a la base de datos
        """
        try:
            if not self._initialized:
                self.initialize()
            
            # Test conexión asíncrona
            async with self._async_session_factory() as session:
                result = await session.execute(text("SELECT 1"))
                row = result.fetchone()
                return row[0] == 1 if row else False
                
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    async def close(self):
        """
        Cerrar todas las conexiones
        """
        try:
            if self._async_engine:
                await self._async_engine.dispose()
            
            if self._engine:
                self._engine.dispose()
            
            self._initialized = False
            logger.info("✅ Database connections closed")
            
        except Exception as e:
            logger.error(f"Error closing database: {e}")

# ==========================================
# INSTANCIA GLOBAL
# ==========================================

# Crear instancia global del database manager
_db_manager = DatabaseManager()

# ==========================================
# FUNCIONES EXPORTADAS
# ==========================================

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection para FastAPI - Sesión asíncrona
    
    Usage:
        @app.get("/users")
        async def get_users(db: AsyncSession = Depends(get_async_session)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async for session in _db_manager.get_async_session():
        yield session

def get_session() -> Generator[Session, None, None]:
    """
    Dependency injection para FastAPI - Sesión síncrona
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_session)):
            return db.query(User).all()
    """
    yield from _db_manager.get_session()

async def initialize_database():
    """
    Inicializar base de datos (llamar en startup de la app)
    """
    try:
        _db_manager.initialize()
        is_connected = await _db_manager.test_connection()
        if is_connected:
            logger.info("✅ Database initialized and connection test passed")
            return True
        else:
            logger.warning("⚠️  Database initialized but connection test failed")
            return False
    except Exception as e:
        logger.error(f"❌ Failed to initialize database: {e}")
        return False

async def close_database():
    """
    Cerrar base de datos (llamar en shutdown de la app)
    """
    await _db_manager.close()

async def database_health_check() -> dict:
    """
    Health check de la base de datos
    """
    try:
        is_connected = await _db_manager.test_connection()
        
        if is_connected:
            return {
                "status": "healthy",
                "message": "Database connection successful",
                "connected": True
            }
        else:
            return {
                "status": "unhealthy", 
                "message": "Database connection failed",
                "connected": False
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database health check error: {str(e)}",
            "connected": False,
            "error": str(e)
        }

def get_engine():
    """
    Obtener engine síncrono (para casos especiales)
    """
    if not _db_manager._initialized:
        _db_manager.initialize()
    return _db_manager._engine

def get_async_engine():
    """
    Obtener engine asíncrono (para casos especiales)
    """
    if not _db_manager._initialized:
        _db_manager.initialize()
    return _db_manager._async_engine

# ==========================================
# UTILIDADES ADICIONALES
# ==========================================

async def execute_raw_query(query: str, params: dict = None) -> list:
    """
    Ejecutar query SQL crudo de forma segura
    
    Args:
        query: Query SQL con parámetros nombrados
        params: Diccionario de parámetros
    
    Returns:
        Lista de resultados
    """
    async for session in get_async_session():
        try:
            result = await session.execute(text(query), params or {})
            return result.fetchall()
        except Exception as e:
            logger.error(f"Error executing raw query: {e}")
            raise

async def check_database_connection() -> bool:
    """
    Verificar si la base de datos está disponible
    """
    return await _db_manager.test_connection()

# ==========================================
# EXPORTS
# ==========================================

__all__ = [
    # Funciones principales
    'get_async_session',
    'get_session',
    'initialize_database',
    'close_database',
    'database_health_check',
    
    # Utilidades
    'execute_raw_query',
    'check_database_connection',
    'get_engine',
    'get_async_engine',
    
    # Clases
    'DatabaseManager',
    
    # SQLAlchemy exports
    'AsyncSession',
    'Session',
    'text'
]

# ==========================================
# CONFIGURACIÓN PARA TESTING
# ==========================================

def create_test_session():
    """
    Crear sesión para testing (síncrona)
    """
    if not _db_manager._initialized:
        _db_manager.initialize()
    return _db_manager._session_factory()

async def create_test_async_session():
    """
    Crear sesión para testing (asíncrona) 
    """
    if not _db_manager._initialized:
        _db_manager.initialize()
    return _db_manager._async_session_factory()

# ==========================================
# AUTO-INITIALIZATION (Opcional)
# ==========================================

# Inicializar automáticamente si se desea
# Comentado por defecto para control manual
try:
    _db_manager.initialize()
    print("✅ Database auto-initialized")
except Exception as e:
    print(f"⚠️  Database auto-initialization failed: {e}")