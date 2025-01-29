import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Cargar las variables del archivo .env
load_dotenv()

Base = declarative_base()

class DatabaseConfig:
    """Clase para encapsular la configuración de la base de datos."""

    def __init__(self):
        self.__database = os.getenv("MYSQL_DATABASE")
        self.__user = os.getenv("MYSQL_USER")
        self.__password = os.getenv("MYSQL_PASSWORD")
        self.__host = os.getenv("MYSQL_HOST")
        self.__port = os.getenv("MYSQL_PORT")
        self.__connection_url = self.__generate_connection_url()

    def __generate_connection_url(self) -> str:
        """Genera la URL de conexión a la base de datos."""
        return f"mysql+pymysql://{self.__user}:{self.__password}@{self.__host}:{self.__port}/{self.__database}"

    @property
    def connection_url(self) -> str:
        """Devuelve la URL de conexión."""
        return self.__connection_url

    @property
    def database_name(self) -> str:
        """Devuelve el nombre de la base de datos."""
        return self.__database

# Instancia de configuración para evitar múltiples cargas
db_config = DatabaseConfig()

# Configurar el motor y la sesión de SQLAlchemy
engine = create_engine(db_config.connection_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
