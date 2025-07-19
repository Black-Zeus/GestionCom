"""
volumes/backend-api/middleware/rate_limit_middleware.py
Middleware de Rate Limiting para proteger contra abuso de API
"""
import time
from typing import Callable, Optional, List
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from core.config import settings
from core.response import ResponseManager
from core.exceptions import TooManyRequestsException, TooManyLoginAttemptsException


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware para limitar la tasa de requests:
    - Rate limiting general por IP
    - Rate limiting específico para endpoints de login
    - Rate limiting por usuario autenticado
    """
    
    def __init__(self, app, exclude_paths: Optional[List[str]] = None):
        super().__init__(app)
        # Paths que no están sujetos a rate limiting
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]
        
        # Configuración de límites
        self.general_limit = settings.RATE_LIMIT_REQUESTS_PER_MINUTE
        self.login_limit = settings.RATE_LIMIT_LOGIN_ATTEMPTS_PER_HOUR
        self.window_seconds = settings.RATE_LIMIT_WINDOW
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # ==========================================
        # 1. VERIFICAR SI PATH ESTÁ EXCLUIDO
        # ==========================================
        
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)
        
        # ==========================================
        # 2. OBTENER IDENTIFICADORES
        # ==========================================
        
        client_ip = self._get_client_ip(request)
        
        try:
            # ==========================================
            # 3. APLICAR RATE LIMITING SEGÚN ENDPOINT
            # ==========================================
            
            if self._is_login_endpoint(path):
                await self._check_login_rate_limit(client_ip)
            else:
                await self._check_general_rate_limit(client_ip, request)
            
            # ==========================================
            # 4. PROCESAR REQUEST
            # ==========================================
            
            response = await call_next(request)
            
            # ==========================================
            # 5. REGISTRAR REQUEST EXITOSO
            # ==========================================
            
            if self._is_login_endpoint(path):
                await self._record_login_attempt(client_ip, response.status_code)
            else:
                await self._record_general_request(client_ip, request)
            
            return response
            
        except (TooManyRequestsException, TooManyLoginAttemptsException) as e:
            # ==========================================
            # 6. MANEJAR RATE LIMIT EXCEEDED
            # ==========================================
            
            return ResponseManager.from_exception(e, request)
        
        except Exception as e:
            # ==========================================
            # 7. MANEJAR ERRORES INESPERADOS
            # ==========================================
            
            # Si hay error en rate limiting, permitir request (fail open)
            return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Obtener IP real del cliente (mismo método que ResponseMiddleware)
        """
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"
    
    def _is_login_endpoint(self, path: str) -> bool:
        """
        Verificar si es un endpoint de autenticación
        """
        login_paths = ["/auth/login", "/auth/refresh"]
        return any(path.startswith(login_path) for login_path in login_paths)
    
    async def _check_general_rate_limit(self, client_ip: str, request: Request):
        """
        Verificar rate limit general por IP
        """
        # Importación dinámica para evitar circular imports
        from cache.services.rate_limit_service import check_rate_limit
        
        key = f"general_{client_ip}"
        allowed, remaining, reset_time = await check_rate_limit(
            key=key,
            limit=self.general_limit,
            window_seconds=self.window_seconds
        )
        
        if not allowed:
            retry_after = max(1, reset_time - int(time.time()))
            raise TooManyRequestsException(retry_after=retry_after)
        
        # Agregar headers informativos al request para respuesta posterior
        request.state.rate_limit_remaining = remaining
        request.state.rate_limit_reset = reset_time
    
    async def _check_login_rate_limit(self, client_ip: str):
        """
        Verificar rate limit específico para login
        """
        from cache.services.rate_limit_service import check_rate_limit
        
        key = f"login_{client_ip}"
        allowed, remaining, reset_time = await check_rate_limit(
            key=key,
            limit=self.login_limit,
            window_seconds=3600  # 1 hora para login attempts
        )
        
        if not allowed:
            retry_after = max(1, reset_time - int(time.time()))
            raise TooManyLoginAttemptsException(retry_after=retry_after)
    
    async def _record_general_request(self, client_ip: str, request: Request):
        """
        Registrar request general exitoso
        """
        # El incremento ya se hace en check_rate_limit
        pass
    
    async def _record_login_attempt(self, client_ip: str, status_code: int):
        """
        Registrar intento de login (exitoso o fallido)
        """
        from cache.services.rate_limit_service import record_login_attempt
        
        success = 200 <= status_code < 300
        await record_login_attempt(client_ip, success)
    
    async def _add_rate_limit_headers(self, response: Response, request: Request):
        """
        Agregar headers de rate limiting a la respuesta
        """
        if hasattr(request.state, 'rate_limit_remaining'):
            response.headers["X-RateLimit-Remaining"] = str(request.state.rate_limit_remaining)
        
        if hasattr(request.state, 'rate_limit_reset'):
            response.headers["X-RateLimit-Reset"] = str(request.state.rate_limit_reset)
        
        response.headers["X-RateLimit-Limit"] = str(self.general_limit)


# ==========================================
# DECORADOR PARA RATE LIMITING PERSONALIZADO
# ==========================================

def rate_limit(limit: int, window_seconds: int = 60, key_func: Optional[Callable] = None):
    """
    Decorador para aplicar rate limiting personalizado a endpoints específicos
    
    Args:
        limit: Número máximo de requests
        window_seconds: Ventana de tiempo en segundos
        key_func: Función para generar clave personalizada (default: IP)
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Buscar Request en los argumentos
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request:
                # Generar clave para rate limiting
                if key_func:
                    key = key_func(request)
                else:
                    key = f"custom_{request.client.host if request.client else 'unknown'}"
                
                # Verificar rate limit
                from cache.services.rate_limit_service import check_rate_limit
                
                allowed, remaining, reset_time = await check_rate_limit(
                    key=key,
                    limit=limit,
                    window_seconds=window_seconds
                )
                
                if not allowed:
                    retry_after = max(1, reset_time - int(time.time()))
                    raise TooManyRequestsException(retry_after=retry_after)
            
            # Ejecutar función original
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# ==========================================
# FUNCIONES DE UTILIDAD
# ==========================================

async def get_rate_limit_status(client_ip: str, limit_type: str = "general") -> dict:
    """
    Obtener estado actual del rate limiting para una IP
    """
    from cache.services.rate_limit_service import get_rate_limit_status as get_status
    
    key = f"{limit_type}_{client_ip}"
    return await get_status(key)


async def reset_rate_limit(client_ip: str, limit_type: str = "general") -> bool:
    """
    Resetear rate limit para una IP específica (función administrativa)
    """
    from cache.services.rate_limit_service import reset_rate_limit as reset_limit
    
    key = f"{limit_type}_{client_ip}"
    return await reset_limit(key)


# ==========================================
# CONFIGURACIÓN POR DEFECTO
# ==========================================

def create_rate_limit_middleware(exclude_paths: Optional[List[str]] = None):
    """
    Factory function para crear middleware con configuración personalizada
    """
    default_excludes = [
        "/health",
        "/docs", 
        "/openapi.json",
        "/redoc",
        "/favicon.ico"
    ]
    
    if exclude_paths:
        default_excludes.extend(exclude_paths)
    
    return lambda app: RateLimitMiddleware(app, exclude_paths=default_excludes)