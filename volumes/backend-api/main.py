"""
Aplicación principal FastAPI - Versión Final Simple
Sistema de carga de routers con lista específica y configuración centralizada
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi  # ✅ AGREGAR ESTE IMPORT
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import traceback
from middleware.main_middleware import TraceMiddleware, SimpleAuthMiddleware
from core.response import ResponseManager
from core.constants import HTTPStatus, ErrorCode, ErrorType
from core.constants import RESPONSE_MANAGER_AVAILABLE 
from core.constants import PRIVATE_ROUTES

# ==========================================
# CONFIGURACIÓN DE LA APLICACIÓN
# ==========================================

app = FastAPI(
    title="API de Conectividad con la Base de Datos del Sistema",
    description="API encargada de gestionar la conectividad y acceso a la base de datos del sistema, con múltiples endpoints para manejar datos específicos.",
    version="1.0.0",
    docs_url="/swagger",
    redoc_url=None,
    openapi_url="/openapi.json",
    # ✅ CONFIGURACIÓN CORRECTA DE SEGURIDAD JWT
    openapi_components={
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT"
            }
        }
    }
)

# ==========================================
# CONFIGURACIÓN AUTOMÁTICA DE SEGURIDAD
# ==========================================

def customize_openapi():
    """
    Personalizar OpenAPI para agregar seguridad automáticamente 
    a rutas que estén en PRIVATE_ROUTES
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    # Generar schema base
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Agregar esquemas de seguridad
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    # ✅ AGREGAR SEGURIDAD AUTOMÁTICAMENTE A RUTAS PROTEGIDAS
    for route_path in openapi_schema.get("paths", {}):
        # Verificar si la ruta está en PRIVATE_ROUTES
        if any(route_path.startswith(private_route) for private_route in PRIVATE_ROUTES):
            for method in openapi_schema["paths"][route_path]:
                if method.lower() in ["get", "post", "put", "delete", "patch"]:
                    # Agregar requerimiento de seguridad
                    if "security" not in openapi_schema["paths"][route_path][method]:
                        openapi_schema["paths"][route_path][method]["security"] = [{"bearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Aplicar la personalización
app.openapi = customize_openapi

# ==========================================
# MIDDLEWARE CONFIGURATION
# ==========================================

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambiar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agregar middleware de trace
app.add_middleware(TraceMiddleware)

# Agregar middleware de autenticación
app.add_middleware(SimpleAuthMiddleware)

# ==========================================
# CONFIGURACIÓN DE ROUTERS
# ==========================================

# Lista de routers a cargar (en orden de prioridad)
ROUTERS_TO_LOAD = [
    {
        "name": "health_services",
        "prefix": "/health",
        "tags": ["Health Check"]
    },
    {
        "name": "users", 
        "prefix": "/users",
        "tags": ["Users"]
    },
    {
        "name": "auth",
        "prefix": "/auth", 
        "tags": ["Authentication"]
    }
    # Para agregar más routers, simplemente añadir aquí:
    # {
    #     "name": "products",
    #     "prefix": "/products",
    #     "tags": ["Products"]
    # },
]

# ==========================================
# CARGA DE ROUTERS
# ==========================================

# Estadísticas de carga
router_stats = {
    "loaded": [],
    "failed": {},
    "total_configured": len(ROUTERS_TO_LOAD)
}

print("🚀 Iniciando carga de routers...")
print(f"📋 Routers configurados: {len(ROUTERS_TO_LOAD)}")
print()

# Headers de la tabla
print("┌─────────────────────┬────────────┬─────────────────────────────────┐")
print("│ Módulo              │ Estado     │ Detalles                        │")
print("├─────────────────────┼────────────┼─────────────────────────────────┤")

for router_config in ROUTERS_TO_LOAD:
    router_name = router_config["name"]
    prefix = router_config["prefix"]
    tags = router_config["tags"]
    
    try:
        # Importar el módulo
        module = __import__(f"routes.{router_name}", fromlist=[router_name])
        
        if hasattr(module, 'router'):
            # Registrar el router
            app.include_router(module.router, prefix=prefix, tags=tags)
            router_stats["loaded"].append({
                "name": router_name,
                "prefix": prefix,
                "tags": tags
            })
            
            # Contar endpoints
            endpoint_count = len(getattr(module.router, 'routes', []))
            details = f"{prefix} ({endpoint_count} endpoints)"
            
            print(f"│ {router_name:<19} │ ✅ EXITOSO │ {details:<31} │")
        else:
            error_msg = "No tiene atributo 'router'"
            router_stats["failed"][router_name] = error_msg
            print(f"│ {router_name:<19} │ ❌ ERROR   │ {error_msg:<31} │")
            
    except Exception as e:
        error_msg = str(e)
        
        router_stats["failed"][router_name] = error_msg
        print(f"│ {router_name:<19} │ ❌ ERROR   │ {error_msg:<31} │")

# Cerrar tabla
print("└─────────────────────┴────────────┴─────────────────────────────────┘")
print()

# Resumen final
loaded_count = len(router_stats["loaded"])
failed_count = len(router_stats["failed"])
total_count = router_stats["total_configured"]
success_percentage = (loaded_count / total_count * 100) if total_count > 0 else 0

print("📊 RESUMEN DE CARGA:")
print(f"   ✅ Routers exitosos: {loaded_count}")
print(f"   ❌ Routers con error: {failed_count}")
print(f"   📈 Total procesados: {total_count}")
print(f"   🎯 Tasa de éxito: {success_percentage:.1f}%")

if failed_count > 0:
    print(f"\n❌ ERRORES DETALLADOS:")
    for router_name, error in router_stats["failed"].items():
        print(f"   └─ {router_name}: {error}")

print(f"\n🚀 API lista para usar - {loaded_count} routers activos")
print("=" * 60)

# ==========================================
# ENDPOINTS PRINCIPALES
# ==========================================

@app.get("/", tags=["Root"])
async def root(request: Request):
    """Endpoint raíz de la API"""
    
    data = {
        "message": "API de Conectividad con la Base de Datos del Sistema",
        "version": "1.0.0",
        "status": "active",
        "docs_url": "/swagger",
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
            "private_routes": PRIVATE_ROUTES
        }
    }
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.success(
            data=data,
            message="API funcionando correctamente",
            request=request
        )
    else:
        # Fallback a respuesta básica
        return {
            "success": True,
            "message": "API funcionando correctamente",
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@app.get("/system/redis", tags=["System"])
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
            return {
                "success": health_info.get("available", False),
                "message": "Redis funcionando correctamente" if health_info.get("available") else "Redis no disponible",
                "data": data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
    except Exception as e:
        error_details = str(e)
        
        if RESPONSE_MANAGER_AVAILABLE:
            return ResponseManager.service_unavailable(
                message="Error al verificar Redis",
                details=error_details,
                request=request
            )
        else:
            # Fallback a respuesta básica
            return {
                "success": False,
                "message": "Error al verificar Redis",
                "data": {
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
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

@app.get("/system/status", tags=["System"])
async def system_status(request: Request):
    """Estado general del sistema"""
    
    # Verificar estado de componentes
    components = {}
    overall_healthy = True
    
    # 1. Estado de routers
    components["routers"] = {
        "status": "healthy" if failed_count == 0 else "degraded",
        "loaded": loaded_count,
        "failed": failed_count,
        "total": total_count
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
    
    data = {
        "overall_status": "healthy" if overall_healthy else "degraded",
        "components": components,
        "system_info": {
            "uptime_check": True,
            "memory_usage": "N/A",  # Podrías agregar psutil aquí
            "disk_usage": "N/A"
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
                error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE if RESPONSE_MANAGER_AVAILABLE else None,
                error_type=ErrorType.SYSTEM_ERROR if RESPONSE_MANAGER_AVAILABLE else None,
                details="Uno o más componentes presentan problemas",
                status_code=HTTPStatus.SERVICE_UNAVAILABLE if RESPONSE_MANAGER_AVAILABLE else 503,
                request=request
            )
    else:
        # Fallback a respuesta básica
        return {
            "success": overall_healthy,
            "message": "Sistema funcionando correctamente" if overall_healthy else "Sistema con problemas",
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# ==========================================
# MANEJO DE EXCEPCIONES GLOBAL
# ==========================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Manejador global de excepciones"""
    
    # Obtener stack trace para desarrollo
    stack_trace = traceback.format_exc()
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.internal_server_error(
            message="Error interno del servidor",
            details=str(exc),
            request=request,
            stack_trace=stack_trace
        )
    else:
        # Fallback a respuesta básica
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": 500,
                "message": "Error interno del servidor",
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "details": str(exc) if app.debug else "Ha ocurrido un error inesperado"
                },
                "path": str(request.url.path),
                "method": request.method,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )

# ==========================================
# EVENTOS DE STARTUP/SHUTDOWN
# ==========================================

@app.on_event("startup")
async def startup_event():
    """Eventos de inicio"""
    print("🚀 API iniciando...")
    
    # Verificar ResponseManager
    if RESPONSE_MANAGER_AVAILABLE:
        print("✅ ResponseManager cargado correctamente")
    else:
        print("⚠️  ResponseManager no disponible - usando respuestas básicas")
    
    # Verificar Redis con la ubicación correcta
    try:
        from cache.redis_client import redis_client, initialize_redis
        
        # Inicializar Redis
        redis_connected = await initialize_redis()
        
        if redis_connected:
            print("✅ Redis conectado correctamente")
        else:
            print("⚠️  Redis no disponible - funcionando en modo degradado")
            
    except Exception as e:
        print(f"⚠️  Redis no disponible: {e}")
    
    print("✅ API iniciada correctamente")
    print(f"🔒 Rutas protegidas configuradas: {PRIVATE_ROUTES}")

@app.on_event("shutdown")
async def shutdown_event():
    """Eventos de cierre"""
    print("🛑 API cerrando...")
    
    # Cerrar Redis con la ubicación correcta
    try:
        from cache.redis_client import close_redis
        await close_redis()
        print("✅ Redis desconectado")
    except Exception:
        pass
    
    print("✅ API cerrada correctamente")

# ==========================================
# PUNTO DE ENTRADA
# ==========================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )