"""
volumes/backend-api/database/__init__.py
Database package initialization
Exporta las funciones y clases principales para uso en toda la aplicación
"""

# ==========================================
# IMPORTS PRINCIPALES
# ==========================================

try:
    # Usar tu configuración real que lee desde .env
    from core.config import settings
    CONFIG_AVAILABLE = True
    
    # Validar configuración al importar
    settings.validate()
    logger = None  # Se inicializará después
    
except ImportError as e:
    print(f"❌ Error crítico: No se pudo cargar la configuración desde config.py")
    print(f"Detalles: {e}")
    raise ImportError("La configuración es requerida para el funcionamiento del sistema")
    
except ValueError as e:
    print(f"❌ Error de configuración: {e}")
    if hasattr(settings, 'is_production') and settings.is_production:
        raise  # En producción, fallar inmediatamente
    else:
        print("⚠️  Continuando en modo desarrollo con configuración incompleta")
        CONFIG_AVAILABLE = True

# Imports de SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from typing import AsyncGenerator, Generator
from database.database import Base
from utils.log_helper import setup_logger

# ==========================================
# CONFIGURACIÓN DE LOGGING
# ==========================================

logger = setup_logger(__name__)

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
            # URLs de conexión usando tu configuración real
            sync_url = settings.database_connection_url
            async_url = sync_url.replace("mysql+pymysql", "mysql+aiomysql")
            
            logger.info(f"Conectando a base de datos: {settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}")
            
            # Engine síncrono
            self._engine = create_engine(
                sync_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
                echo=settings.DEBUG_MODE if hasattr(settings, 'DEBUG_MODE') else False,
                connect_args={
                    "charset": "utf8mb4"
                }
            )
            
            # Engine asíncrono
            self._async_engine = create_async_engine(
                async_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20,
                echo=settings.DEBUG_MODE if hasattr(settings, 'DEBUG_MODE') else False,
                connect_args={
                    "charset": "utf8mb4"
                }
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
                "connected": True,
                "database_host": settings.MYSQL_HOST,
                "database_port": settings.MYSQL_PORT,
                "database_name": settings.MYSQL_DATABASE,
                "environment": settings.ENVIRONMENT
            }
        else:
            return {
                "status": "unhealthy", 
                "message": "Database connection failed",
                "connected": False,
                "database_host": settings.MYSQL_HOST,
                "database_port": settings.MYSQL_PORT
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
    'Base',  
    
    # SQLAlchemy exports
    'AsyncSession',
    'Session',
    'text',
    
    # Configuración
    'settings',
    'CONFIG_AVAILABLE'
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
# AUTO-INITIALIZATION (Controlada)
# ==========================================

# Solo mostrar información de configuración, no auto-inicializar
if CONFIG_AVAILABLE:
    debug_info = settings.get_debug_info()
    logger.info(f"📊 Database configuration loaded: {debug_info['mysql_host']}:{debug_info['mysql_port']}/{debug_info['mysql_database']}")
    
    if settings.is_development:
        logger.debug("🔧 Running in development mode")
    elif settings.is_production:
        logger.info("🚀 Running in production mode")
else:
    logger.warning("⚠️  Database configuration not fully available")