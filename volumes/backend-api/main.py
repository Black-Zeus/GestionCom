"""
Aplicación principal FastAPI - Versión Final Simple
Sistema de carga de routers con lista específica y configuración centralizada
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime

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
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambiar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Rutas que requieren autenticación
PRIVATE_ROUTES = ["/users", "/inventory", "/admin", "/reports"]

# ==========================================
# MIDDLEWARE DE AUTENTICACIÓN SIMPLE
# ==========================================

class SimpleAuthMiddleware(BaseHTTPMiddleware):
    """Middleware de autenticación simplificado"""
    
    async def dispatch(self, request: Request, call_next):
        path = request.scope["path"]
        
        # Verificar si la ruta requiere autenticación
        if any(path.startswith(route) for route in PRIVATE_ROUTES):
            try:
                # Import dinámico para evitar dependencias circulares
                from middleware.auth_middleware import authenticate_request
                await authenticate_request(request)
            except ImportError:
                # Si no hay middleware de auth, permitir acceso temporalmente
                pass
            except HTTPException as e:
                return JSONResponse(
                    status_code=e.status_code,
                    content={
                        "success": False,
                        "status": e.status_code,
                        "message": e.detail,
                        "error": {"code": "AUTH_FAILED", "details": e.detail}
                    }
                )
            except Exception as e:
                return JSONResponse(
                    status_code=500,
                    content={
                        "success": False,
                        "status": 500,
                        "message": "Error interno de autenticación",
                        "error": {"code": "AUTH_SYSTEM_ERROR", "details": str(e)}
                    }
                )
        
        return await call_next(request)

# Agregar middleware
app.add_middleware(SimpleAuthMiddleware)

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
        if len(error_msg) > 31:
            error_msg = error_msg[:28] + "..."
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
async def root():
    """Endpoint raíz de la API"""
    return {
        "message": "API de Conectividad con la Base de Datos del Sistema",
        "version": "1.0.0",
        "status": "active",
        "docs_url": "/swagger",
        "routers": {
            "loaded": [r["name"] for r in router_stats["loaded"]],
            "failed": list(router_stats["failed"].keys()),
            "success_rate": f"{len(router_stats['loaded'])}/{router_stats['total_configured']}",
            "success_percentage": f"{(len(router_stats['loaded']) / router_stats['total_configured'] * 100) if router_stats['total_configured'] > 0 else 0:.1f}%"
        }
    }

@app.get("/system/redis", tags=["System"])
async def redis_status():
    """Estado detallado de Redis"""
    try:
        from cache.redis_client import redis_client
        
        # Obtener health check detallado
        health_info = await redis_client.health_check()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "redis_status": health_info,
            "client_info": {
                "is_available": redis_client.is_available,
                "location": "cache.redis_client",
                "client_type": "RedisClient (async)"
            }
        }
        
    except Exception as e:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "redis_status": {
                "status": "error",
                "available": False,
                "error": str(e)
            },
            "client_info": {
                "is_available": False,
                "location": "cache.redis_client",
                "error": "Failed to import or initialize"
            }
        }

# ==========================================
# MANEJO DE EXCEPCIONES GLOBAL
# ==========================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Manejador global de excepciones"""
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
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# ==========================================
# EVENTOS DE STARTUP/SHUTDOWN
# ==========================================

@app.on_event("startup")
async def startup_event():
    """Eventos de inicio"""
    print("🚀 API iniciando...")
    
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