"""
Router de health check - Endpoints para verificar estado de la API y servicios
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from datetime import datetime
import os

router = APIRouter()

# ==========================================
# CONFIGURACIÓN DE BASE DE DATOS
# ==========================================

def get_db():
    """
    Dependency para base de datos con manejo de errores
    """
    try:
        # Import condicional para evitar errores si no existe
        from utils.dbConfig import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    except ImportError:
        # Si no hay dbConfig, intentar con database
        try:
            from database import get_session
            db = next(get_session())
            try:
                yield db
            finally:
                db.close()
        except ImportError:
            # Si tampoco hay database, crear una sesión dummy
            yield None

# ==========================================
# ENDPOINTS BÁSICOS DE SALUD
# ==========================================

@router.get("/", response_class=JSONResponse)
async def health_check():
    """
    Endpoint para verificar el estado básico de la API.
    """
    return {
        "name": "API de Conectividad con la Base de Datos del Sistema",
        "role": "Gestión y acceso a la base de datos del sistema",
        "status": "active",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }

@router.get("/db", response_class=JSONResponse)
async def health_db(db: Session = Depends(get_db)):
    """
    Endpoint para verificar la conectividad con la base de datos.
    """
    if db is None:
        return {
            "name": "Base de Datos",
            "status": "not_configured",
            "error": "Configuración de base de datos no disponible",
            "timestamp": datetime.utcnow().isoformat(),
        }
    
    try:
        # Usar text para envolver la consulta SQL
        result = db.execute(text("SELECT 1"))
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
    """
    Endpoint para verificar la conectividad con Redis.
    """
    try:
        # Import condicional para Redis con ubicación correcta
        from cache.redis_client import redis_client
        
        # Obtener health check detallado
        health_info = await redis_client.health_check()
        
        return {
            "name": "Redis",
            "status": health_info.get("status", "unknown"),
            "available": health_info.get("available", False),
            "details": health_info,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
    except ImportError:
        return {
            "name": "Redis",
            "status": "not_configured",
            "error": "Redis client no disponible",
            "suggestion": "Verificar cache.redis_client",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "name": "Redis", 
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
        }

# ==========================================
# ENDPOINT DE ESTADO COMPLETO
# ==========================================

@router.get("/all", response_class=JSONResponse)
async def health_all():
    """
    Endpoint para verificar el estado de todos los servicios.
    """
    services = {}
    overall_status = "healthy"
    
    # 1. Estado de la API
    services["api"] = {
        "name": "API Principal",
        "status": "active",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # 2. Estado de la base de datos
    try:
        db = next(get_db())
        if db is not None:
            db.execute(text("SELECT 1"))
            services["database"] = {
                "name": "Base de Datos",
                "status": "connected",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            services["database"] = {
                "name": "Base de Datos",
                "status": "not_configured",
                "timestamp": datetime.utcnow().isoformat()
            }
            overall_status = "degraded"
    except Exception as e:
        services["database"] = {
            "name": "Base de Datos",
            "status": "disconnected",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        overall_status = "degraded"
    
    # 3. Estado de Redis
    try:
        from cache.redis_client import redis_client
        health_info = await redis_client.health_check()
        
        services["redis"] = {
            "name": "Redis",
            "status": health_info.get("status", "unknown"),
            "available": health_info.get("available", False),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if not health_info.get("available", False):
            overall_status = "degraded"
            
    except Exception as e:
        services["redis"] = {
            "name": "Redis",
            "status": "not_available",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        overall_status = "degraded"
    
    return {
        "overall_status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "services": services,
        "summary": {
            "total_services": len(services),
            "healthy_services": len([s for s in services.values() if s.get("status") in ["active", "connected"]]),
            "degraded_services": len([s for s in services.values() if s.get("status") not in ["active", "connected"]])
        }
    }

# ==========================================
# ENDPOINTS DE DESARROLLO (Solo en DEV)
# ==========================================

@router.get("/db-config", response_class=JSONResponse)
async def show_db_config():
    """
    Endpoint para mostrar los parámetros de conexión a la base de datos.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(
            status_code=403, 
            detail="Este endpoint solo está disponible en entornos de desarrollo."
        )

    return {
        "environment": environment,
        "database": os.getenv("DB_NAME", "unknown"),
        "user": os.getenv("DB_USER", "unknown"),
        "host": os.getenv("DB_HOST", "unknown"),
        "port": os.getenv("DB_PORT", "unknown"),
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/redis-config", response_class=JSONResponse)
async def show_redis_config():
    """
    Endpoint para mostrar los parámetros de conexión a Redis.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(
            status_code=403, 
            detail="Este endpoint solo está disponible en entornos de desarrollo."
        )

    return {        
        "environment": environment,
        "db": os.getenv("REDIS_DB", "0"),
        "host": os.getenv("REDIS_HOST", "unknown"),
        "port": os.getenv("REDIS_PORT", "unknown"),
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/validate-jwt", response_class=JSONResponse)
async def validate_jwt(authorization: str = Header(None)):
    """
    Endpoint para validar un JWT y devolver su contenido.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(
            status_code=403, 
            detail="Este endpoint solo está disponible en entornos de desarrollo."
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Token de autenticación faltante o inválido"
        )

    token = authorization.split("Bearer ")[-1]

    try:
        # Import condicional para utils.security
        from utils.security import verify_jwt_token
        payload = verify_jwt_token(token)
        return {
            "message": "Token válido",
            "token_data": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except ImportError:
        return {
            "message": "Error: utils.security no disponible",
            "error": "Módulo de seguridad no configurado",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validando token: {str(e)}")

@router.get("/system-info", response_class=JSONResponse)
async def system_info():
    """
    Endpoint para mostrar información del sistema.
    Solo disponible en entornos de desarrollo.
    """
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "development":
        raise HTTPException(
            status_code=403, 
            detail="Este endpoint solo está disponible en entornos de desarrollo."
        )

    # Verificar qué módulos están disponibles
    modules_status = {}
    
    try:
        import utils.security
        modules_status["utils.security"] = "✅ Disponible"
    except ImportError:
        modules_status["utils.security"] = "❌ No disponible"
    
    try:
        import utils.dbConfig
        modules_status["utils.dbConfig"] = "✅ Disponible"
    except ImportError:
        modules_status["utils.dbConfig"] = "❌ No disponible"
    
    try:
        # Corregir referencia a Redis
        from cache.redis_client import redis_client
        modules_status["cache.redis_client"] = "✅ Disponible"
    except ImportError:
        modules_status["cache.redis_client"] = "❌ No disponible"
    
    try:
        from database import get_async_session
        modules_status["database.get_async_session"] = "✅ Disponible"
    except ImportError:
        modules_status["database.get_async_session"] = "❌ No disponible"
    
    try:
        from core.config import settings
        modules_status["core.config"] = "✅ Disponible"
    except ImportError:
        modules_status["core.config"] = "❌ No disponible"

    return {
        "environment": environment,
        "modules_status": modules_status,
        "timestamp": datetime.utcnow().isoformat(),
    }