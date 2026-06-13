"""
volumes/backend-api/main.py
Aplicación principal FastAPI - Versión Final Simple
Sistema de carga de routers con lista específica y configuración centralizada
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from starlette.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import traceback

from middleware.main_middleware import TraceMiddleware, SimpleAuthMiddleware
from core.response import ResponseManager
from core.constants import RESPONSE_MANAGER_AVAILABLE, PRIVATE_ROUTES, HTTPStatus
from core.config import settings
from services.inventory_expiry_scheduler import start_inventory_expiry_alert_scheduler, stop_inventory_expiry_alert_scheduler
from utils.router_loader import load_routers

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
    
    # Agregar seguridad automáticamente a rutas protegidas
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

# Agregar middleware de trace
app.add_middleware(TraceMiddleware)

# Agregar middleware de autenticación
app.add_middleware(SimpleAuthMiddleware)

# CORS debe quedar como capa externa para cubrir tambien respuestas cortadas por middleware.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
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
    },
    {
        "name": "roles",
        "prefix": "/roles",
        "tags": ["Roles"]
    },
    {
        "name": "warehouses",
        "prefix": "/warehouses",
        "tags": ["Warehouses"]
    },
    {
        "name": "cash_registers",
        "prefix": "/cash-registers",
        "tags": ["Cash Registers"]
    },
    {
        "name": "cash_sessions",
        "prefix": "/cash-sessions",
        "tags": ["Cash Sessions"]
    },
    {
        "name": "sales_operations",
        "prefix": "/sales-operations",
        "tags": ["Sales Operations"]
    },
    {
        "name": "sales_documents",
        "prefix": "/sales-documents",
        "tags": ["Sales Documents"]
    },
    {
        "name": "petty_cash_admin",
        "prefix": "/petty-cash-admin",
        "tags": ["Petty Cash Admin"]
    },
    {
        "name": "petty_cash",
        "prefix": "/petty-cash",
        "tags": ["Petty Cash"]
    },
    {
        "name": "payment_methods",
        "prefix": "/payment-methods",
        "tags": ["Payment Methods"]
    },
    {
        "name": "physical_inventory",
        "prefix": "/physical-inventory",
        "tags": ["Physical Inventory"]
    },
    {
        "name": "stock_transfers",
        "prefix": "/stock-transfers",
        "tags": ["Stock Transfers"]
    },
    {
        "name": "stock_movements",
        "prefix": "/stock-movements",
        "tags": ["Stock Movements"]
    },
    {
        "name": "measurement_units",
        "prefix": "/measurement-units",
        "tags": ["Measurement Units"]
    },
    {
        "name": "product_config",
        "prefix": "/product-config",
        "tags": ["Product Config"]
    },
    {
        "name": "document_config",
        "prefix": "/document-config",
        "tags": ["Document Config"]
    },
    {
        "name": "business_foundation",
        "prefix": "/business-foundation",
        "tags": ["Business Foundation"]
    },
    {
        "name": "admin_maintainers",
        "prefix": "/admin-maintainers",
        "tags": ["Admin Maintainers"]
    },
    {
        "name": "notifications",
        "prefix": "/notifications",
        "tags": ["Notifications"]
    },
    {
        "name": "profile",
        "prefix": "/profile",
        "tags": ["Profile"]
    },
    {
        "name": "global_search",
        "prefix": "/global-search",
        "tags": ["Global Search"]
    },
    {
        "name": "system",
        "prefix": "/system",
        "tags": ["System"]
    },
    {
        "name": "menu_items",
        "prefix": "/menu-items",
        "tags": ["Menu Items"]
    },
    {
        "name": "user_menus",
        "prefix": "/user-menus", 
        "tags": ["User Menus"]
    }
]

ROUTERS_TO_LOAD = sorted(ROUTERS_TO_LOAD, key=lambda x: x["tags"][0].lower())


# ==========================================
# CARGA DE ROUTERS
# ==========================================
router_stats = load_routers(app, ROUTERS_TO_LOAD)

# ==========================================
# ENDPOINT RAÍZ
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
            # FIX: Usar atributos de la clase en lugar de acceso de diccionario
            "loaded": [r["name"] for r in router_stats.loaded],
            "failed": list(router_stats.failed.keys()),
            "success_rate": f"{router_stats.loaded_count}/{router_stats.total_configured}",
            "success_percentage": f"{router_stats.success_percentage:.1f}%"
        },
        "features": {
            "response_manager": RESPONSE_MANAGER_AVAILABLE,
            "auth_middleware": True,
            "trace_middleware": True,
            "private_routes": PRIVATE_ROUTES
        },
        "available_modules": {
            "health": "/health",
            "authentication": "/auth",
            "users": "/users",
            "warehouses": "/warehouses",
            "cash_registers": "/cash-registers",
            "petty_cash_admin": "/petty-cash-admin",
            "petty_cash": "/petty-cash",
            "system": "/system"
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

# ==========================================
# MANEJO DE EXCEPCIONES GLOBAL
# ==========================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Manejador global de excepciones"""
    
    stack_trace = traceback.format_exc()
    print(f"Error no controlado en {request.method} {request.url.path}: {exc}")
    print(stack_trace)
    
    if RESPONSE_MANAGER_AVAILABLE:
        return ResponseManager.internal_server_error(
            message="Error interno del servidor",
            details="Ha ocurrido un error inesperado. Contacte al administrador con el identificador de traza.",
            request=request,
        )
    else:
        # Fallback a respuesta básica
        return JSONResponse(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "status": HTTPStatus.INTERNAL_SERVER_ERROR,
                "message": "Error interno del servidor",
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "details": "Ha ocurrido un error inesperado"
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
    
    # Verificar Redis
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

    try:
        start_inventory_expiry_alert_scheduler()
        print("✅ Scheduler de alertas de vencimiento activo")
    except Exception as e:
        print(f"⚠️  Scheduler de alertas de vencimiento no disponible: {e}")
    
    print("✅ API iniciada correctamente")
    print(f"🔒 Rutas protegidas configuradas: {PRIVATE_ROUTES}")

@app.on_event("shutdown")
async def shutdown_event():
    """Eventos de cierre"""
    print("🛑 API cerrando...")
    
    # Cerrar Redis
    try:
        from cache.redis_client import close_redis
        await close_redis()
        print("✅ Redis desconectado")
    except Exception:
        pass

    try:
        await stop_inventory_expiry_alert_scheduler()
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
        port=settings.API_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL
    )
