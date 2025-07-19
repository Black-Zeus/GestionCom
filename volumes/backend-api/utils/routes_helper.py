"""
volumes/backend-api/utils/routes_helper.py
Utilidades para manejo de rutas y endpoints en FastAPI
"""
from typing import List, Optional
from fastapi import APIRouter
from utils.log_helper import setup_logger

logger = setup_logger(__name__)


def get_router_endpoints(router_instance: APIRouter, prefix: Optional[str] = None) -> List[str]:
    """
    Extraer endpoints de un router de FastAPI
    
    Args:
        router_instance: Instancia del APIRouter
        prefix: Prefijo a agregar a las rutas (ej: "/auth")
    
    Returns:
        List[str]: Lista de endpoints en formato "METHOD /path"
    """
    endpoints = []
    
    try:
        for route in router_instance.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                for method in route.methods:
                    # Excluir métodos automáticos de FastAPI
                    if method not in ["HEAD", "OPTIONS"]:
                        path = route.path
                        
                        # Agregar prefijo si se proporciona
                        if prefix:
                            if path == "/":
                                path = prefix
                            else:
                                path = f"{prefix}{path}"
                        
                        endpoints.append(f"{method} {path}")
        
        # Ordenar para consistencia
        endpoints.sort()
        
        logger.debug(f"Extraídos {len(endpoints)} endpoints del router")
        return endpoints
        
    except Exception as e:
        logger.error(f"Error extrayendo endpoints del router: {e}")
        return []


# ==========================================
# FUNCIONES DE CONVENIENCIA ESPECÍFICAS
# ==========================================

async def get_module_info(
    router_instance: APIRouter,
    request,
    module_name: str,
    prefix: str,
    custom_data: dict = None
) -> dict:
    """
    Función unificada para obtener información de cualquier router/módulo
    
    Args:
        router_instance: Instancia del APIRouter
        request: Request object de FastAPI
        module_name: Nombre del módulo (ej: "Autenticación", "Usuarios", "Almacenes")
        prefix: Prefijo del router (ej: "/auth", "/users", "/warehouses")
        custom_data: Datos adicionales específicos del módulo
    """
    from core.response import ResponseManager
    from core.config import settings
    
    # Obtener endpoints una sola vez para eficiencia
    endpoints = get_router_endpoints(router_instance, prefix)
    
    # Datos base comunes para todos los módulos
    base_data = {
        "name": settings.APP_NAME,
        "version": settings.API_VERSION,
        "status": "active",
        "module": module_name.lower(),
        "available_endpoints": endpoints,
        "total_endpoints": len(endpoints)
    }
    
    # Agregar datos personalizados si se proporcionan
    if custom_data:
        base_data.update(custom_data)
    
    return ResponseManager.success(
        data=base_data,
        message=f"Información del sistema de {module_name.lower()}",
        request=request
    )


# Funciones específicas simplificadas (ahora solo wrappers)
async def get_auth_info(auth_router: APIRouter, request) -> dict:
    """Información del router de autenticación"""
    custom_data = {
        "authentication_method": "JWT con doble secreto"
    }
    
    # Obtener dependencias específicas de auth
    try:
        from utils.auth_helpers import AuthHelper
        auth_helper = AuthHelper()
        custom_data["dependencies_status"] = await auth_helper.get_system_status()
    except Exception as e:
        logger.warning(f"No se pudo obtener estado de dependencias: {e}")
    
    return await get_module_info(auth_router, request, "Autenticación", "/auth", custom_data)

async def get_health_info(users_router: APIRouter, request) -> dict:
    """Información del router de Health Check"""
    return await get_module_info(users_router, request, "Health Check", "/health")

async def get_warehouses_info(users_router: APIRouter, request) -> dict:
    """Información del router de Bodegas"""
    return await get_module_info(users_router, request, "Warehouses", "/warehouses")

async def get_users_info(users_router: APIRouter, request) -> dict:
    """Información del router de Health Check"""
    return await get_module_info(users_router, request, "Users", "/users")


# Alias para mantener compatibilidad y claridad
get_generic_router_info = get_module_info