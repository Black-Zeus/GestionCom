"""
volumes/backend-api/middleware/main_middleware.py
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from core.response import ResponseManager
from core.constants import PRIVATE_ROUTES, RESPONSE_MANAGER_AVAILABLE, SELF_AUTH_ROUTES, HTTPStatus
from core.exceptions import AuthenticationException
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

        if request.method == "OPTIONS":
            return await call_next(request)

        if any(path.startswith(route) for route in SELF_AUTH_ROUTES):
            return await call_next(request)
        
        # Verificar si la ruta requiere autenticación
        if any(path.startswith(route) for route in PRIVATE_ROUTES):
            try:
                # Import dinámico para evitar dependencias circulares
                from middleware.auth_middleware import authenticate_request
                await authenticate_request(request)
            except AuthenticationException as e:
                if RESPONSE_MANAGER_AVAILABLE:
                    return ResponseManager.from_exception(e, request)
                return JSONResponse(
                    status_code=e.status_code,
                    content={
                        "success": False,
                        "status": e.status_code,
                        "message": e.message,
                        "error": e.to_dict()
                    }
                )
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
                        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                        content={
                            "success": False,
                            "status": HTTPStatus.INTERNAL_SERVER_ERROR,
                            "message": "Error interno de autenticación",
                            "error": {"code": "AUTH_SYSTEM_ERROR", "details": str(e)}
                        }
                    )
        
        return await call_next(request)
