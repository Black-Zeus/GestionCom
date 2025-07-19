"""
volumes/backend-api/routes/system.py
Router de System - Endpoints del sistema y estado
Incluye monitoreo de Redis, estado general y información del sistema
"""
from utils.log_helper import setup_logger
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from core.response import ResponseManager
from core.constants import HTTPStatus, ErrorCode, ErrorType
from core.constants import RESPONSE_MANAGER_AVAILABLE, PRIVATE_ROUTES

# ==========================================
# CONFIGURACIÓN DEL ROUTER
# ==========================================

logger = setup_logger(__name__)

router = APIRouter(
    tags=["System"],
    responses={
        503: {"description": "Servicio no disponible"},
        500: {"description": "Error interno del servidor"}
    }
)

# Variable para almacenar estadísticas de routers (se debe inyectar desde main.py)
router_stats = {
    "loaded": [],
    "failed": {},
    "total_configured": 0
}

def set_router_stats(stats: dict):
    """Establecer estadísticas de routers desde main.py"""
    global router_stats
    router_stats = stats

# ==========================================
# ENDPOINTS DE SISTEMA
# ==========================================

@router.get("/redis", response_class=JSONResponse)
async def redis_status(request: Request):
    """Estado detallado de Redis"""
    
    try:
        from cache.redis_client import redis_client
        
        # Obtener health check detallado
        health_info = await redis_client.health_check()
        
        data = {
            "redis_status": health_info,
            "client_info": {
                "is_available": redis_client.is_available,
                "location": "cache.redis_client",
                "client_type": "RedisClient (async)"
            }
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            if health_info.get("available", False):
                return ResponseManager.success(
                    data=data,
                    message="Redis funcionando correctamente",
                    request=request
                )
            else:
                return ResponseManager.service_unavailable(
                    message="Redis no disponible",
                    details=health_info.get("error", "Estado desconocido"),
                    request=request
                )
        else:
            # Fallback a respuesta básica
            return JSONResponse(
                status_code=HTTPStatus.OK if health_info.get("available") else 503,
                content={
                    "success": health_info.get("available", False),
                    "message": "Redis funcionando correctamente" if health_info.get("available") else "Redis no disponible",
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
    except Exception as e:
        error_details = str(e)
        logger.error(f"Error al verificar Redis: {error_details}")
        
        data = {
            "redis_status": {
                "status": "error",
                "available": False,
                "error": error_details
            },
            "client_info": {
                "is_available": False,
                "location": "cache.redis_client",
                "error": "Failed to import or initialize"
            }
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Error al verificar Redis",
                details=error_details,
                request=request
            )
        else:
            # Fallback a respuesta básica
            return JSONResponse(
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                content={
                    "success": False,
                    "message": "Error al verificar Redis",
                    "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )

@router.get("/status", response_class=JSONResponse)
async def system_status(request: Request):
    """Estado general del sistema"""
    
    # Verificar estado de componentes
    components = {}
    overall_healthy = True
    
    # 1. Estado de routers
    loaded_count = len(router_stats["loaded"])
    failed_count = len(router_stats["failed"])
    total_count = router_stats["total_configured"]
    
    components["routers"] = {
        "status": "healthy" if failed_count == 0 else "degraded",
        "loaded": loaded_count,
        "failed": failed_count,
        "total": total_count,
        "success_rate": f"{loaded_count}/{total_count}",
        "success_percentage": f"{(loaded_count / total_count * 100) if total_count > 0 else 0:.1f}%"
    }
    
    if failed_count > 0:
        overall_healthy = False
    
    # 2. Estado de Redis
    try:
        from cache.redis_client import redis_client
        health_info = await redis_client.health_check()
        components["redis"] = {
            "status": "healthy" if health_info.get("available") else "unhealthy",
            "available": health_info.get("available", False),
            "details": health_info
        }
        if not health_info.get("available"):
            overall_healthy = False
    except Exception as e:
        components["redis"] = {
            "status": "unhealthy",
            "available": False,
            "error": str(e)
        }
        overall_healthy = False
    
    # 3. Estado de ResponseManager
    components["response_manager"] = {
        "status": "healthy" if RESPONSE_MANAGER_AVAILABLE else "unavailable",
        "available": RESPONSE_MANAGER_AVAILABLE
    }
    
    # 4. Estado de autenticación
    components["authentication"] = {
        "status": "configured",
        "middleware_active": True,
        "private_routes": PRIVATE_ROUTES
    }
    
    data = {
        "overall_status": "healthy" if overall_healthy else "degraded",
        "components": components,
        "system_info": {
            "uptime_check": True,
            "memory_usage": "N/A",  # Podrías agregar psutil aquí
            "disk_usage": "N/A",
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        "router_details": {
            "loaded_routers": [r["name"] for r in router_stats["loaded"]],
            "failed_routers": list(router_stats["failed"].keys()),
            "failed_details": router_stats["failed"] if router_stats["failed"] else None
        }
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        if overall_healthy:
            return ResponseManager.success(
                data=data,
                message="Sistema funcionando correctamente",
                request=request
            )
        else:
            return ResponseManager.error(
                message="Sistema con problemas detectados",
                error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
                error_type=ErrorType.SYSTEM_ERROR,
                details="Uno o más componentes presentan problemas",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE,
                request=request
            )
    else:
        # Fallback a respuesta básica
        status_code = 200 if overall_healthy else 503
        return JSONResponse(
            status_code=status_code,
            content={
                "success": overall_healthy,
                "message": "Sistema funcionando correctamente" if overall_healthy else "Sistema con problemas",
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/info", response_class=JSONResponse)
async def system_info(request: Request):
    """Información detallada del sistema"""
    
    data = {
        "api_info": {
            "name": "API de Conectividad con la Base de Datos del Sistema",
            "version": "1.0.0",
            "description": "API encargada de gestionar la conectividad y acceso a la base de datos del sistema",
            "docs_url": "/swagger",
            "openapi_url": "/openapi.json"
        },
        "routers": {
            "loaded": [r["name"] for r in router_stats["loaded"]],
            "failed": list(router_stats["failed"].keys()),
            "success_rate": f"{len(router_stats['loaded'])}/{router_stats['total_configured']}",
            "success_percentage": f"{(len(router_stats['loaded']) / router_stats['total_configured'] * 100) if router_stats['total_configured'] > 0 else 0:.1f}%"
        },
        "features": {
            "response_manager": RESPONSE_MANAGER_AVAILABLE,
            "auth_middleware": True,
            "trace_middleware": True,
            "private_routes": PRIVATE_ROUTES,
            "cors_enabled": True,
            "jwt_authentication": True
        },
        "endpoints_summary": {
            "health_check": "/health",
            "authentication": "/auth",
            "users": "/users", 
            "warehouses": "/warehouses",
            "system": "/system",
            "documentation": "/swagger"
        }
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="Información del sistema obtenida",
            request=request
        )
    else:
        # Fallback a respuesta básica
        return JSONResponse(
            status_code=HTTPStatus.OK,
            content={
                "success": True,
                "message": "Información del sistema obtenida",
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

@router.get("/health", response_class=JSONResponse)
async def system_health_check(request: Request):
    """Health check simplificado del sistema"""
    
    try:
        # Verificaciones básicas
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime": True,
            "components": {}
        }
        
        # Verificar Redis
        try:
            from cache.redis_client import redis_client
            redis_health = await redis_client.health_check()
            health_status["components"]["redis"] = "healthy" if redis_health.get("available") else "unhealthy"
        except Exception:
            health_status["components"]["redis"] = "unavailable"
        
        # Verificar routers
        failed_count = len(router_stats["failed"])
        health_status["components"]["routers"] = "healthy" if failed_count == 0 else "degraded"
        
        # Verificar ResponseManager
        health_status["components"]["response_manager"] = "healthy" if RESPONSE_MANAGER_AVAILABLE else "unavailable"
        
        # Determinar estado general
        unhealthy_components = [k for k, v in health_status["components"].items() if v in ["unhealthy", "unavailable"]]
        if unhealthy_components:
            health_status["status"] = "degraded"
            health_status["issues"] = unhealthy_components
        
        status_code = 200 if health_status["status"] == "healthy" else 503
        
        if RESPONSE_MANAGER_AVAILABLE and health_status["status"] == "healthy":
            return ResponseManager.success(
                data=health_status,
                message="Sistema saludable",
                request=request
            )
        else:
            return JSONResponse(
                status_code=status_code,
                content={
                    "success": health_status["status"] == "healthy",
                    "message": f"Sistema {health_status['status']}",
                    "data": health_status,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )
        
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        
        error_response = {
            "status": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }
        
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.internal_server_error(
                message="Error en health check del sistema",
                details=str(e),
                request=request
            )
        else:
            return JSONResponse(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "message": "Error en health check del sistema",
                    "data": error_response,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            )