
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from core.response import ResponseManager
from core.constants import PRIVATE_ROUTES, RESPONSE_MANAGER_AVAILABLE 
import time

# ==========================================
# MIDDLEWARE PARA TRACE ID Y TIMING
# ==========================================

class TraceMiddleware(BaseHTTPMiddleware):
    """Middleware para agregar trace ID y timing a las requests"""
    
    async def dispatch(self, request: Request, call_next):
        # Agregar trace ID y tiempo de inicio
        import uuid
        request.state.trace_id = str(uuid.uuid4())
        request.state.start_time = time.time()
        
        response = await call_next(request)
        return response

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
                from utils.authMiddleware import authenticate_request
                authenticate_request(request)  # SIN await - función sincrónica
            except ImportError:
                # Si no hay middleware de auth, permitir acceso temporalmente
                pass
            except HTTPException as e:
                # Usar ResponseManager si está disponible
                if RESPONSE_MANAGER_AVAILABLE:
                    return ResponseManager.unauthorized(
                        message=e.detail,
                        details="Error de autenticación",
                        request=request
                    )
                else:
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
                # Usar ResponseManager si está disponible
                if RESPONSE_MANAGER_AVAILABLE:
                    return ResponseManager.internal_server_error(
                        message="Error interno de autenticación",
                        details=str(e),
                        request=request
                    )
                else:
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
