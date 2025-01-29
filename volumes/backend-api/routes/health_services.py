from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse

from sqlalchemy.orm import Session
from sqlalchemy.sql import text  # Asegúrate de importar text

from utils.security import verify_jwt_token
from utils.dbConfig import SessionLocal, db_config
from utils.redisConfig import redis_client

from datetime import datetime
import os

router = APIRouter()

# Dependencia de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
# Endpoint de salud de la API
@router.get("/", response_class=JSONResponse)
async def health_check():
    """
    Endpoint para verificar el estado básico de la API.
    """
    return {
        "name": "API de Conectividad con la Base de Datos del Sistema",
        "role": "Gestión y acceso a la base de datos del sistema",
        "status": "active",  # Estado general de la API
        "timestamp": datetime.utcnow().isoformat(),  # Fecha y hora actual
        "version": "1.0.0",  # Versión de la API
    }


@router.get("/db", response_class=JSONResponse)
async def health_db(db: Session = Depends(get_db)):
    """
    Endpoint para verificar la conectividad con la base de datos.
    """
    try:
        # Usa text para envolver la consulta SQL
        db.execute(text("SELECT 1"))
        return {
            "name": "Base de Datos",
            "status": "connected",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "name": "Base de Datos",
            "status": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        })
       
@router.get("/redis", response_class=JSONResponse)
async def health_redis():
    """Endpoint para verificar la conectividad con Redis."""
    try:
        if redis_client.ping():
            return {
                "name": "Redis",
                "status": "connected",
                "timestamp": datetime.utcnow().isoformat(),
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "name": "Redis",
            "status": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        })
        
# Solo para DEV
     
# Endpoint para mostrar parámetros de conexión (solo en dev)
@router.get("/db-config", response_class=JSONResponse)
async def show_db_config():
    """
    Endpoint para mostrar los parámetros de conexión a la base de datos.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(status_code=403, detail="Este endpoint solo está disponible en entornos de desarrollo.")

    return {
        "environment":environment,
        "database": db_config.database_name,
        "user": os.getenv("MYSQL_USER"),
        "host": os.getenv("MYSQL_HOST"),
        "port": os.getenv("MYSQL_PORT"),
        "pass": os.getenv("MYSQL_PASSWORD"),
        "timestamp": datetime.utcnow().isoformat(),
    }

     
# Endpoint para mostrar parámetros de conexión (solo en dev)
@router.get("/redis-config", response_class=JSONResponse)
async def show_db_config():
    """
    Endpoint para mostrar los parámetros de conexión a la base de datos.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(status_code=403, detail="Este endpoint solo está disponible en entornos de desarrollo.")

    return {        
        "environment":environment,
        "db": os.getenv("REDIS_DB"),
        "host": os.getenv("REDIS_HOST"),
        "port": os.getenv("REDIS_PORT"),
        "pass": os.getenv("REDIS_PASSWORD"),
        "timestamp": datetime.utcnow().isoformat(),
    }

# 🔹 Endpoint para validar un JWT (Solo en entornos de desarrollo)
@router.get("/validate-jwt", response_class=JSONResponse)
async def validate_jwt(authorization: str = Header(None)):
    """
    Endpoint para validar un JWT y devolver su contenido.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(status_code=403, detail="Este endpoint solo está disponible en entornos de desarrollo.")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticación faltante o inválido")

    token = authorization.split("Bearer ")[-1]

    try:
        # Verificar el token con la función `verify_jwt_token`
        payload = verify_jwt_token(token)
        return {
            "message": "Token válido",
            "token_data": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))    