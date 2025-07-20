"""
utils/router_loader.py
Módulo para cargar routers dinámicamente con estadísticas y reporte visual
"""
from typing import List, Dict, Any
from fastapi import FastAPI


class RouterStats:
    """Clase para manejar estadísticas de carga de routers"""
    
    def __init__(self, total_configured: int):
        self.loaded = []
        self.failed = {}
        self.total_configured = total_configured
    
    @property
    def loaded_count(self) -> int:
        return len(self.loaded)
    
    @property
    def failed_count(self) -> int:
        return len(self.failed)
    
    @property
    def success_percentage(self) -> float:
        if self.total_configured == 0:
            return 0.0
        return (self.loaded_count / self.total_configured) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir estadísticas a diccionario"""
        return {
            "loaded": self.loaded,
            "failed": self.failed,
            "total_configured": self.total_configured,
            "loaded_count": self.loaded_count,
            "failed_count": self.failed_count,
            "success_percentage": self.success_percentage
        }


class RouterLoader:
    """Cargador de routers con reporte visual"""
    
    def __init__(self, app: FastAPI, routers_config: List[Dict[str, Any]], verbose: bool = True):
        """
        Inicializar el cargador de routers
        
        Args:
            app: Instancia de FastAPI
            routers_config: Lista de configuraciones de routers
            verbose: Si mostrar output detallado
        """
        self.app = app
        self.routers_config = self._sort_routers_by_tags(routers_config)
        self.verbose = verbose
        self.stats = RouterStats(len(self.routers_config))
    
    @staticmethod
    def _sort_routers_by_tags(routers_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ordenar routers por tags alfabéticamente"""
        return sorted(routers_list, key=lambda x: x["tags"][0].lower())
    
    def _print_header(self):
        """Imprimir header del reporte"""
        if not self.verbose:
            return
            
        print("🚀 Iniciando carga de routers...")
        print(f"📋 Routers configurados: {len(self.routers_config)}")
        print()
        print("┌─────────────────────┬────────────┬─────────────────────────────────┐")
        print("│ Módulo              │ Estado     │ Detalles                        │")
        print("├─────────────────────┼────────────┼─────────────────────────────────┤")
    
    def _print_router_result(self, router_name: str, success: bool, details: str):
        """Imprimir resultado de carga de un router"""
        if not self.verbose:
            return
            
        status = "✅ EXITOSO" if success else "❌ ERROR  "
        print(f"│ {router_name:<19} │ {status} │ {details:<31} │")
    
    def _print_footer(self):
        """Imprimir footer del reporte"""
        if not self.verbose:
            return
            
        print("└─────────────────────┴────────────┴─────────────────────────────────┘")
        print()
    
    def _print_summary(self):
        """Imprimir resumen final"""
        if not self.verbose:
            return
            
        print("📊 RESUMEN DE CARGA:")
        print(f"   ✅ Routers exitosos: {self.stats.loaded_count}")
        print(f"   ❌ Routers con error: {self.stats.failed_count}")
        print(f"   📈 Total procesados: {self.stats.total_configured}")
        print(f"   🎯 Tasa de éxito: {self.stats.success_percentage:.1f}%")
        
        if self.stats.failed_count > 0:
            print(f"\n❌ ERRORES DETALLADOS:")
            for router_name, error in self.stats.failed.items():
                print(f"   └─ {router_name}: {error}")
        
        print(f"\n🚀 API lista para usar - {self.stats.loaded_count} routers activos")
        print("=" * 60)
    
    def _load_single_router(self, router_config: Dict[str, Any]) -> bool:
        """
        Cargar un router individual
        
        Args:
            router_config: Configuración del router
            
        Returns:
            bool: True si se cargó exitosamente
        """
        router_name = router_config["name"]
        prefix = router_config["prefix"]
        tags = router_config["tags"]
        
        try:
            # Importar el módulo
            module = __import__(f"routes.{router_name}", fromlist=[router_name])
            
            if hasattr(module, 'router'):
                # Registrar el router
                self.app.include_router(module.router, prefix=prefix, tags=tags)
                
                # Agregar a estadísticas de éxito
                self.stats.loaded.append({
                    "name": router_name,
                    "prefix": prefix,
                    "tags": tags
                })
                
                # Inyectar estadísticas en el router de system
                if router_name == "system" and hasattr(module, 'set_router_stats'):
                    module.set_router_stats(self.stats.to_dict())
                
                # Contar endpoints
                endpoint_count = len(getattr(module.router, 'routes', []))
                details = f"{prefix} ({endpoint_count} endpoints)"
                
                self._print_router_result(router_name, True, details)
                return True
                
            else:
                error_msg = "No tiene atributo 'router'"
                self.stats.failed[router_name] = error_msg
                self._print_router_result(router_name, False, error_msg)
                return False
                
        except Exception as e:
            error_msg = str(e)
            self.stats.failed[router_name] = error_msg
            self._print_router_result(router_name, False, error_msg)
            return False
    
    def load_all_routers(self) -> RouterStats:
        """
        Cargar todos los routers configurados
        
        Returns:
            RouterStats: Estadísticas de carga
        """
        self._print_header()
        
        for router_config in self.routers_config:
            self._load_single_router(router_config)
        
        self._print_footer()
        self._print_summary()
        
        return self.stats
    
    def load_routers_silent(self) -> RouterStats:
        """
        Cargar routers sin output (modo silencioso)
        
        Returns:
            RouterStats: Estadísticas de carga
        """
        original_verbose = self.verbose
        self.verbose = False
        
        for router_config in self.routers_config:
            self._load_single_router(router_config)
        
        self.verbose = original_verbose
        return self.stats


# ==========================================
# FUNCIONES DE CONVENIENCIA
# ==========================================

def load_routers(app: FastAPI, routers_config: List[Dict[str, Any]], verbose: bool = True) -> RouterStats:
    """
    Función de conveniencia para cargar routers
    
    Args:
        app: Instancia de FastAPI
        routers_config: Lista de configuraciones de routers
        verbose: Si mostrar output detallado
        
    Returns:
        RouterStats: Estadísticas de carga
    """
    loader = RouterLoader(app, routers_config, verbose)
    return loader.load_all_routers()


def load_routers_silent(app: FastAPI, routers_config: List[Dict[str, Any]]) -> RouterStats:
    """
    Función de conveniencia para cargar routers en modo silencioso
    
    Args:
        app: Instancia de FastAPI
        routers_config: Lista de configuraciones de routers
        
    Returns:
        RouterStats: Estadísticas de carga
    """
    loader = RouterLoader(app, routers_config, verbose=False)
    return loader.load_routers_silent()


def sort_routers_by_tags(routers_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ordenar lista de routers por tags alfabéticamente
    
    Args:
        routers_list: Lista de configuraciones de routers
        
    Returns:
        Lista ordenada por tags
    """
    return RouterLoader._sort_routers_by_tags(routers_list)


# ==========================================
# EJEMPLO DE USO
# ==========================================

if __name__ == "__main__":
    # Ejemplo de configuración (normalmente viene de main.py)
    EXAMPLE_ROUTERS = [
        {"name": "health_services", "prefix": "/health", "tags": ["Health Check"]},
        {"name": "users", "prefix": "/users", "tags": ["Users"]},
        {"name": "auth", "prefix": "/auth", "tags": ["Authentication"]},
        {"name": "warehouses", "prefix": "/warehouses", "tags": ["Warehouses"]},
        {"name": "system", "prefix": "/system", "tags": ["System"]}
    ]
    
    # Ejemplo de uso (requiere app FastAPI real)
    # from fastapi import FastAPI
    # app = FastAPI()
    # stats = load_routers(app, EXAMPLE_ROUTERS)
    # print(f"Cargados: {stats.loaded_count}/{stats.total_configured}")
    
    # Ejemplo de solo ordenamiento
    sorted_routers = sort_routers_by_tags(EXAMPLE_ROUTERS)
    print("Routers ordenados por tags:")
    for router in sorted_routers:
        print(f"  - {router['tags'][0]}: {router['name']}")