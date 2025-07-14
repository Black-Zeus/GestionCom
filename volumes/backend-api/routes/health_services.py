"""
Router de health check - Endpoints para verificar estado de la API y servicios
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy.sql import text

from core.config import settings

# Importar ResponseManager
try:
    from core.response import ResponseManager
    from core.constants import HTTPStatus, ErrorCode, ErrorType
    RESPONSE_MANAGER_AVAILABLE = True
except ImportError:
    from fastapi.responses import JSONResponse
    from datetime import datetime, timezone
    RESPONSE_MANAGER_AVAILABLE = False

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

@router.get("/")
async def health_check(request: Request):
    """
    Endpoint para verificar el estado básico de la API.
    """
    data = {
        "name": settings.APP_NAME,
        "role": "Gestión y acceso a la base de datos del sistema",
        "status": "active",
        "version": settings.API_VERSION,
        "environment": settings.ENVIRONMENT
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="Health check exitoso",
            request=request
        )
    else:
        return JSONResponse(content={
            **data,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

@router.get("/db")
async def health_db(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint para verificar la conectividad con la base de datos.
    """
    if db is None:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Base de datos no configurada",
                details="Configuración de base de datos no disponible",
                request=request
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "name": "Base de Datos",
                    "status": "not_configured",
                    "error": "Configuración de base de datos no disponible",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    
    try:
        # Usar text para envolver la consulta SQL
        db.execute(text("SELECT 1"))
        
        data = {
            "name": "Base de Datos",
            "status": "connected",
            "host": settings.MYSQL_HOST,
            "database": settings.MYSQL_DATABASE
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.success(
                data=data,
                message="Base de datos conectada exitosamente",
                request=request
            )
        else:
            return JSONResponse(content={
                **data,
                "success": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
    except Exception as e:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Error de conectividad con la base de datos",
                details=str(e),
                request=request
            )
        else:
            raise HTTPException(status_code=500, detail={
                "name": "Base de Datos",
                "status": "disconnected",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

@router.get("/redis")
async def health_redis(request: Request):
    """
    Endpoint para verificar la conectividad con Redis.
    """
    try:
        # Import condicional para Redis con ubicación correcta
        from cache.redis_client import redis_client
        
        # Obtener health check detallado
        health_info = await redis_client.health_check()
        
        data = {
            "name": "Redis",
            "status": health_info.get("status", "unknown"),
            "available": health_info.get("available", False),
            "details": health_info
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            if health_info.get("available", False):
                return ResponseManager.success(
                    data=data,
                    message="Redis conectado exitosamente",
                    request=request
                )
            else:
                return ResponseManager.service_unavailable(
                    message="Redis no disponible",
                    details=health_info.get("error", "Estado desconocido"),
                    request=request
                )
        else:
            return JSONResponse(content={
                **data,
                "success": health_info.get("available", False),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
    except ImportError:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Redis no configurado",
                details="Cliente Redis no disponible - verificar cache.redis_client",
                request=request
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "name": "Redis",
                    "status": "not_configured",
                    "error": "Redis client no disponible",
                    "suggestion": "Verificar cache.redis_client",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    except Exception as e:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Error al verificar Redis",
                details=str(e),
                request=request
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "name": "Redis", 
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )

# ==========================================
# ENDPOINT DE ESTADO COMPLETO
# ==========================================

@router.get("/all")
async def health_all(request: Request):
    """
    Endpoint para verificar el estado de todos los servicios.
    """
    services = {}
    overall_status = "healthy"
    
    # 1. Estado de la API
    services["api"] = {
        "name": "API Principal",
        "status": "active",
        "message": "Funcionando correctamente"
    }
    
    # 2. Estado de la base de datos
    try:
        db = next(get_db())
        if db is not None:
            db.execute(text("SELECT 1"))
            services["database"] = {
                "name": "Base de Datos",
                "status": "connected",
                "message": "Conectada exitosamente"
            }
        else:
            services["database"] = {
                "name": "Base de Datos",
                "status": "not_configured",
                "message": "No configurada"
            }
            overall_status = "degraded"
    except Exception as e:
        services["database"] = {
            "name": "Base de Datos",
            "status": "disconnected",
            "message": "Error de conexión",
            "error": str(e)
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
            "message": "Conectado exitosamente" if health_info.get("available") else "No disponible"
        }
        
        if not health_info.get("available", False):
            overall_status = "degraded"
            
    except Exception as e:
        services["redis"] = {
            "name": "Redis",
            "status": "not_available",
            "message": "Error de conexión",
            "error": str(e)
        }
        overall_status = "degraded"
    
    # Datos de respuesta
    data = {
        "overall_status": overall_status,
        "services": services,
        "summary": {
            "total_services": len(services),
            "healthy_services": len([s for s in services.values() if s.get("status") in ["active", "connected"]]),
            "degraded_services": len([s for s in services.values() if s.get("status") not in ["active", "connected"]])
        }
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        if overall_status == "healthy":
            return ResponseManager.success(
                data=data,
                message="Todos los servicios funcionando correctamente",
                request=request
            )
        else:
            return ResponseManager.error(
                message="Algunos servicios presentan problemas",
                error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                error_type=ErrorType.SYSTEM_ERROR,
                details=f"{data['summary']['degraded_services']} de {data['summary']['total_services']} servicios con problemas",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                request=request
            )
    else:
        status_code = 200 if overall_status == "healthy" else 503
        return JSONResponse(
            status_code=status_code,
            content={
                **data,
                "success": overall_status == "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

# ==========================================
# ENDPOINTS DE DESARROLLO (Solo en DEV)
# ==========================================

@router.get("/db-config")
async def show_db_config(request: Request):
    """
    Endpoint para mostrar los parámetros de conexión a la base de datos.
    Solo disponible en entornos de desarrollo.
    """
    if not settings.is_development:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.forbidden(
                message="Endpoint solo disponible en desarrollo",
                details="Este endpoint está restringido a entornos de desarrollo",
                request=request
            )
        else:
            raise HTTPException(
                status_code=403, 
                detail="Este endpoint solo está disponible en entornos de desarrollo."
            )

    data = {
        "environment": settings.ENVIRONMENT,
        "database": settings.MYSQL_DATABASE,
        "user": settings.MYSQL_USER,
        "password": settings.MYSQL_PASSWORD,
        "host": settings.MYSQL_HOST,
        "port": settings.MYSQL_PORT,
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="Configuración de base de datos obtenida",
            request=request
        )
    else:
        return JSONResponse(content={
            **data,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

@router.get("/redis-config")
async def show_redis_config(request: Request):
    """
    Endpoint para mostrar los parámetros de conexión a Redis.
    Solo disponible en entornos de desarrollo.
    """
    if not settings.is_development:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.forbidden(
                message="Endpoint solo disponible en desarrollo",
                details="Este endpoint está restringido a entornos de desarrollo",
                request=request
            )
        else:
            raise HTTPException(
                status_code=403, 
                detail="Este endpoint solo está disponible en entornos de desarrollo."
            )

    data = {
        "environment": settings.ENVIRONMENT,
        "redis_db": settings.REDIS_DB,
        "redis_host": settings.REDIS_HOST,
        "redis_port": settings.REDIS_PORT,
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="Configuración de Redis obtenida",
            request=request
        )
    else:
        return JSONResponse(content={
            **data,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

@router.get("/validate-jwt")
async def validate_jwt(request: Request, authorization: str = Header(None)):
    """
    Endpoint para validar un JWT y devolver su contenido.
    Solo disponible en entornos de desarrollo.
    """
    if not settings.is_development:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.forbidden(
                message="Endpoint solo disponible en desarrollo",
                details="Este endpoint está restringido a entornos de desarrollo",
                request=request
            )
        else:
            raise HTTPException(
                status_code=403, 
                detail="Este endpoint solo está disponible en entornos de desarrollo."
            )

    if not authorization or not authorization.startswith("Bearer "):
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.unauthorized(
                message="Token de autenticación requerido",
                details="Debe proporcionar un token Bearer válido",
                request=request
            )
        else:
            raise HTTPException(
                status_code=401, 
                detail="Token de autenticación faltante o inválido"
            )

    token = authorization.split("Bearer ")[-1]

    try:
        # Import condicional para utils.security
        from utils.security import verify_jwt_token
        payload = verify_jwt_token(token)
        
        data = {
            "message": "Token válido",
            "token_data": payload,
            "token_preview": f"{token[:20]}..." if len(token) > 20 else token
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.success(
                data=data,
                message="Token JWT válido",
                request=request
            )
        else:
            return JSONResponse(content={
                **data,
                "success": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
    except ImportError:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Módulo de seguridad no disponible",
                details="El módulo utils.security no está configurado",
                request=request
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "message": "Error: utils.security no disponible",
                    "error": "Módulo de seguridad no configurado",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
    except ValueError as e:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.unauthorized(
                message="Token JWT inválido",
                details=str(e),
                request=request
            )
        else:
            raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.internal_server_error(
                message="Error al validar token",
                details=str(e),
                request=request
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error validando token: {str(e)}")

@router.get("/system-info")
async def system_info(request: Request):
    """
    Endpoint para mostrar información del sistema.
    Solo disponible en entornos de desarrollo.
    """
    if not settings.is_development:
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.forbidden(
                message="Endpoint solo disponible en desarrollo",
                details="Este endpoint está restringido a entornos de desarrollo",
                request=request
            )
        else:
            raise HTTPException(
                status_code=403, 
                detail="Este endpoint solo está disponible en entornos de desarrollo."
            )

    # Verificar qué módulos están disponibles
    modules_status = {}
    
    modules_to_check = [
        ("utils.security", "utils.security"),
        ("utils.dbConfig", "utils.dbConfig"),
        ("cache.redis_client", "cache.redis_client"),
        ("database.get_async_session", "database"),
        ("core.config", "core.config"),
        ("core.response", "core.response")
    ]
    
    for display_name, import_path in modules_to_check:
        try:
            if "." in import_path:
                module_name, attr_name = import_path.split(".", 1)
                module = __import__(module_name, fromlist=[attr_name])
                getattr(module, attr_name)
            else:
                __import__(import_path)
            modules_status[display_name] = {"status": "available", "message": "✅ Disponible"}
        except ImportError:
            modules_status[display_name] = {"status": "not_available", "message": "❌ No disponible"}
        except AttributeError:
            modules_status[display_name] = {"status": "partial", "message": "⚠️ Parcialmente disponible"}
    
    # Redis specific check
    try:
        from cache.redis_client import redis_client
        redis_available = redis_client.is_available
        modules_status["cache.redis_client"]["redis_connected"] = redis_available
        if not redis_available:
            modules_status["cache.redis_client"]["message"] = "⚠️ Disponible pero desconectado"
    except:
        pass

    data = {
        "environment": settings.ENVIRONMENT,
        "app_config": settings.get_debug_info() if hasattr(settings, 'get_debug_info') else {"error": "Debug info not available"},
        "modules_status": modules_status,
        "system_health": {
            "total_modules": len(modules_status),
            "available_modules": len([m for m in modules_status.values() if m["status"] == "available"]),
            "unavailable_modules": len([m for m in modules_status.values() if m["status"] == "not_available"]),
            "partial_modules": len([m for m in modules_status.values() if m["status"] == "partial"])
        }
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="Información del sistema obtenida",
            request=request
        )
    else:
        return JSONResponse(content={
            **data,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })