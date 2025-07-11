"""
Dynamic Router Loader - Cargador dinámico de routers
Descubre y carga automáticamente todos los routers desde el directorio routes/
"""
import os
import importlib
import inspect
from pathlib import Path
from typing import Dict, List, Optional, Any
from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

class RouterLoader:
    """
    Cargador dinámico de routers FastAPI
    """
    
    def __init__(self, routes_directory: str = "routes", exclude_files: List[str] = None):
        """
        Inicializar el cargador de routers
        
        Args:
            routes_directory: Directorio donde están los routers
            exclude_files: Archivos a excluir de la carga automática
        """
        self.routes_directory = routes_directory
        self.exclude_files = exclude_files or ["__init__.py", "__pycache__"]
        self.loaded_routers: Dict[str, Any] = {}
        self.failed_imports: Dict[str, str] = {}
        self.router_configs: Dict[str, Dict] = {}
    
    def discover_router_files(self) -> List[str]:
        """
        Descubrir automáticamente archivos de router en el directorio
        
        Returns:
            Lista de nombres de archivos de router (sin extensión)
        """
        router_files = []
        routes_path = Path(self.routes_directory)
        
        if not routes_path.exists():
            logger.warning(f"📁 Directorio {self.routes_directory} no existe")
            return []
        
        for file_path in routes_path.glob("*.py"):
            filename = file_path.stem  # Nombre sin extensión
            
            # Excluir archivos especificados
            if f"{filename}.py" in self.exclude_files:
                continue
            
            router_files.append(filename)
        
        return sorted(router_files)
    
    def load_router_from_module(self, module_name: str) -> Optional[APIRouter]:
        """
        Cargar router desde un módulo específico
        
        Args:
            module_name: Nombre del módulo (ej: "auth", "users")
            
        Returns:
            APIRouter si se carga exitosamente, None si falla
        """
        try:
            print(f"  ├─ Importando routes.{module_name}...")
            
            # Importar el módulo
            module = importlib.import_module(f"{self.routes_directory}.{module_name}")
            
            # Buscar el router en el módulo
            router = None
            
            # Buscar atributo 'router' (convención estándar)
            if hasattr(module, 'router'):
                router = getattr(module, 'router')
                
            # Si no encuentra 'router', buscar cualquier instancia de APIRouter
            if router is None:
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, APIRouter):
                        router = attr
                        break
            
            if router is None:
                raise AttributeError(f"No se encontró router en el módulo {module_name}")
            
            # Obtener información del router
            router_info = self._extract_router_info(router, module_name)
            self.router_configs[module_name] = router_info
            
            print(f"  ✅ {module_name} importado correctamente")
            logger.info(f"Router {module_name} cargado: {router_info['endpoints']} endpoints")
            
            return router
            
        except Exception as e:
            error_msg = str(e)
            print(f"  ❌ Error importando {module_name}: {error_msg}")
            logger.error(f"Failed to load router {module_name}: {error_msg}")
            self.failed_imports[module_name] = error_msg
            return None
    
    def load_all_routers(self, router_list: Optional[List[str]] = None) -> Dict[str, APIRouter]:
        """
        Cargar todos los routers especificados o descubiertos automáticamente
        
        Args:
            router_list: Lista específica de routers a cargar. Si es None, descubre automáticamente.
            
        Returns:
            Diccionario con routers cargados exitosamente
        """
        print("🔍 Iniciando carga dinámica de routers...")
        
        # Determinar qué routers cargar
        if router_list is None:
            router_names = self.discover_router_files()
            print(f"📁 Routers descubiertos automáticamente: {router_names}")
        else:
            router_names = router_list
            print(f"📋 Routers especificados manualmente: {router_names}")
        
        # Cargar cada router
        for router_name in router_names:
            router = self.load_router_from_module(router_name)
            if router:
                self.loaded_routers[router_name] = router
        
        # Resumen de carga
        self._print_loading_summary()
        
        return self.loaded_routers
    
    def _extract_router_info(self, router: APIRouter, module_name: str) -> Dict:
        """
        Extraer información útil del router
        """
        routes_info = []
        
        for route in router.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                methods = list(route.methods) if route.methods else ['GET']
                routes_info.append({
                    'methods': methods,
                    'path': route.path,
                    'name': getattr(route, 'name', 'unnamed')
                })
        
        return {
            'module': module_name,
            'prefix': getattr(router, 'prefix', ''),
            'tags': getattr(router, 'tags', []),
            'endpoints': len(routes_info),
            'routes': routes_info
        }
    
    def _print_loading_summary(self):
        """
        Imprimir resumen de la carga de routers
        """
        total_routers = len(self.loaded_routers) + len(self.failed_imports)
        successful = len(self.loaded_routers)
        failed = len(self.failed_imports)
        
        print(f"\n📊 Resumen de carga de routers:")
        print(f"   Total procesados: {total_routers}")
        print(f"   ✅ Exitosos: {successful}")
        print(f"   ❌ Fallidos: {failed}")
        
        if self.loaded_routers:
            print(f"\n✅ Routers cargados exitosamente:")
            for name, router in self.loaded_routers.items():
                config = self.router_configs.get(name, {})
                endpoints = config.get('endpoints', 0)
                prefix = config.get('prefix', '')
                print(f"   └─ {name}: {endpoints} endpoints{f' (prefix: {prefix})' if prefix else ''}")
        
        if self.failed_imports:
            print(f"\n❌ Routers que fallaron:")
            for name, error in self.failed_imports.items():
                print(f"   └─ {name}: {error}")
        
        print(f"🔍 Carga de routers completada\n")
    
    def get_router_status(self) -> Dict[str, Any]:
        """
        Obtener estado detallado de todos los routers
        """
        return {
            "loaded_routers": list(self.loaded_routers.keys()),
            "failed_imports": self.failed_imports,
            "router_configs": self.router_configs,
            "total_endpoints": sum(
                config.get('endpoints', 0) 
                for config in self.router_configs.values()
            )
        }
    
    def register_routers_to_app(self, app, include_failed_placeholders: bool = False):
        """
        Registrar todos los routers cargados a la aplicación FastAPI
        
        Args:
            app: Instancia de FastAPI
            include_failed_placeholders: Si crear endpoints placeholder para routers fallidos
        """
        print("🔌 Registrando routers en la aplicación...")
        
        for name, router in self.loaded_routers.items():
            config = self.router_configs.get(name, {})
            prefix = config.get('prefix') or f"/{name}"
            tags = config.get('tags') or [name.title()]
            
            try:
                app.include_router(router, prefix=prefix, tags=tags)
                print(f"   ✅ Router {name} registrado en {prefix}")
            except Exception as e:
                print(f"   ❌ Error registrando {name}: {e}")
        
        # Crear placeholders para routers fallidos (opcional)
        if include_failed_placeholders:
            self._create_failed_router_placeholders(app)
        
        print("🔌 Registro de routers completado\n")
    
    def _create_failed_router_placeholders(self, app):
        """
        Crear endpoints placeholder para routers que fallaron al cargar
        """
        for failed_router_name, error in self.failed_imports.items():
            placeholder_router = APIRouter(
                prefix=f"/{failed_router_name}",
                tags=[f"{failed_router_name.title()} (No disponible)"]
            )
            
            @placeholder_router.get("/")
            async def placeholder_endpoint():
                return {
                    "status": "unavailable",
                    "message": f"Router {failed_router_name} no está disponible",
                    "error": error,
                    "suggestion": "Verifica las dependencias y configuración"
                }
            
            app.include_router(placeholder_router)
            print(f"   🔄 Placeholder creado para {failed_router_name}")

# ==========================================
# FUNCIONES DE CONVENIENCIA
# ==========================================

def load_routers_automatically(
    app,
    routes_directory: str = "routes",
    router_list: Optional[List[str]] = None,
    include_placeholders: bool = False,
    exclude_files: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Función de conveniencia para cargar y registrar routers automáticamente
    
    Args:
        app: Instancia de FastAPI
        routes_directory: Directorio de routers
        router_list: Lista específica de routers (None = autodescubrir)
        include_placeholders: Si crear placeholders para routers fallidos
        exclude_files: Archivos a excluir
        
    Returns:
        Status de la carga
    """
    loader = RouterLoader(
        routes_directory=routes_directory,
        exclude_files=exclude_files
    )
    
    # Cargar routers
    loaded_routers = loader.load_all_routers(router_list)
    
    # Registrar en la app
    loader.register_routers_to_app(app, include_placeholders)
    
    # Retornar status
    return loader.get_router_status()

def load_specific_routers(
    app,
    router_configs: List[Dict[str, Any]],
    routes_directory: str = "routes"
) -> Dict[str, Any]:
    """
    Cargar routers con configuración específica
    
    Args:
        app: Instancia de FastAPI
        router_configs: Lista de configuraciones de router
            Ejemplo: [
                {"name": "auth", "prefix": "/api/auth", "tags": ["Authentication"]},
                {"name": "users", "prefix": "/api/users", "tags": ["Users"]}
            ]
        routes_directory: Directorio de routers
        
    Returns:
        Status de la carga
    """
    loader = RouterLoader(routes_directory=routes_directory)
    
    print("🔍 Cargando routers con configuración específica...")
    
    for config in router_configs:
        router_name = config["name"]
        router = loader.load_router_from_module(router_name)
        
        if router:
            prefix = config.get("prefix", f"/{router_name}")
            tags = config.get("tags", [router_name.title()])
            
            try:
                app.include_router(router, prefix=prefix, tags=tags)
                print(f"   ✅ {router_name} registrado en {prefix}")
                loader.loaded_routers[router_name] = router
            except Exception as e:
                print(f"   ❌ Error registrando {router_name}: {e}")
                loader.failed_imports[router_name] = str(e)
    
    loader._print_loading_summary()
    return loader.get_router_status()

# ==========================================
# DECORADOR PARA REGISTRO AUTOMÁTICO
# ==========================================

def auto_discover_routers(
    routes_directory: str = "routes",
    include_placeholders: bool = False,
    exclude_files: Optional[List[str]] = None
):
    """
    Decorador para auto-descubrir y registrar routers en una app FastAPI
    
    Usage:
        @auto_discover_routers()
        def create_app():
            app = FastAPI()
            return app
    """
    def decorator(create_app_func):
        def wrapper(*args, **kwargs):
            app = create_app_func(*args, **kwargs)
            
            load_routers_automatically(
                app=app,
                routes_directory=routes_directory,
                include_placeholders=include_placeholders,
                exclude_files=exclude_files
            )
            
            return app
        return wrapper
    return decorator