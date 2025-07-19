"""
volumes/backend-api/middleware/response_middleware.py
Middleware para manejo unificado de respuestas y trazabilidad
"""
import time
import uuid
import traceback
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import ValidationError

from core.response import ResponseManager
from core.exceptions import BaseAppException
from core.constants import TRACE_ID_HEADER
from core.config import settings

from utils.log_helper import setup_logger
logger = setup_logger(__name__)

class ResponseMiddleware(BaseHTTPMiddleware):
    """
    Middleware para:
    - Generar trace IDs únicos
    - Medir tiempo de ejecución
    - Capturar excepciones globalmente
    - Formatear respuestas de manera unificada
    - Agregar headers de seguridad básicos
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # ==========================================
        # 1. SETUP - Preparar request
        # ==========================================
        
        # Generar o extraer trace ID
        trace_id = request.headers.get(TRACE_ID_HEADER) or str(uuid.uuid4())
        request.state.trace_id = trace_id
        request.state.start_time = time.time()
        
        # Agregar información útil al state
        request.state.ip_address = self._get_client_ip(request)
        request.state.user_agent = request.headers.get("user-agent", "")
        
        try:
            # ==========================================
            # 2. PROCESS - Ejecutar request
            # ==========================================
            response = await call_next(request)
            
            # ==========================================
            # 3. POST-PROCESS - Agregar headers y metadatos
            # ==========================================
            response = await self._add_response_headers(response, request)
            
            return response
            
        except BaseAppException as e:
            # ==========================================
            # 4. HANDLE - Excepciones personalizadas
            # ==========================================
            return await self._handle_app_exception(e, request)
            
        except ValidationError as e:
            # ==========================================
            # 5. HANDLE - Errores de validación Pydantic
            # ==========================================
            return await self._handle_validation_error(e, request)
            
        except Exception as e:
            # ==========================================
            # 6. HANDLE - Excepciones no manejadas
            # ==========================================
            return await self._handle_unexpected_error(e, request)
    
    def _get_client_ip(self, request: Request) -> str:
        """
        Obtener IP real del cliente considerando proxies
        """
        # Verificar headers de proxy en orden de prioridad
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # Tomar la primera IP (cliente original)
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Fallback a IP directa
        if hasattr(request.client, "host"):
            return request.client.host
        
        return "unknown"
    
    async def _add_response_headers(self, response: Response, request: Request) -> Response:
        """
        Agregar headers de respuesta estándar
        """
        # Headers de trazabilidad
        response.headers[TRACE_ID_HEADER] = request.state.trace_id
        response.headers["X-Response-Time"] = f"{int((time.time() - request.state.start_time) * 1000)}ms"
        response.headers["X-API-Version"] = settings.API_VERSION
        
        # Headers de seguridad básicos
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # CORS básico (ajustar según necesidades)
        response.headers["Access-Control-Allow-Origin"] = "*"  # Cambiar en producción
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Trace-ID"
        response.headers["Access-Control-Expose-Headers"] = "X-Trace-ID, X-Response-Time"
        
        return response
    
    async def _handle_app_exception(self, exception: BaseAppException, request: Request) -> JSONResponse:
        """
        Manejar excepciones personalizadas de la aplicación
        """
        # Log del error (implementar según tu sistema de logging)
        self._log_exception(exception, request, "APP_EXCEPTION")
        
        # Obtener stack trace solo en desarrollo
        stack_trace = None
        if settings.ENABLE_STACK_TRACE and settings.is_development:
            stack_trace = traceback.format_exc()
        
        return ResponseManager.from_exception(
            exception=exception,
            request=request,
            stack_trace=stack_trace
        )
    
    async def _handle_validation_error(self, error: ValidationError, request: Request) -> JSONResponse:
        """
        Manejar errores de validación de Pydantic
        """
        self._log_exception(error, request, "VALIDATION_ERROR")
        
        return ResponseManager.validation_error(
            errors=error.errors(),
            request=request
        )
    
    async def _handle_unexpected_error(self, error: Exception, request: Request) -> JSONResponse:
        """
        Manejar errores inesperados del sistema
        """
        self._log_exception(error, request, "UNEXPECTED_ERROR")
        
        # Stack trace para debugging
        stack_trace = None
        if settings.ENABLE_STACK_TRACE and settings.is_development:
            stack_trace = traceback.format_exc()
        
        # En producción, no revelar detalles internos
        if settings.is_production:
            message = "Error interno del servidor"
            details = "Ha ocurrido un error inesperado"
        else:
            message = f"Error inesperado: {type(error).__name__}"
            details = str(error)
        
        return ResponseManager.internal_server_error(
            message=message,
            details=details,
            request=request,
            stack_trace=stack_trace
        )
    
    def _log_exception(self, exception: Exception, request: Request, error_type: str):
        """
        Log de excepciones usando el sistema de logging configurado
        """
                
        # Información básica del error
        error_msg = f"[{error_type}] {type(exception).__name__}: {str(exception)}"
        
        # Contexto del request
        context = {
            "path": request.url.path,
            "method": request.method,
            "ip_address": getattr(request.state, 'ip_address', 'unknown'),
            "trace_id": getattr(request.state, 'trace_id', 'unknown')
        }
        
        # Log según severidad del error
        if error_type in ["VALIDATION_ERROR", "BAD_REQUEST", "NOT_FOUND"]:
            logger.warning(f"{error_msg} - {context}")
        elif error_type in ["UNAUTHORIZED", "FORBIDDEN", "RATE_LIMIT_EXCEEDED"]:
            logger.warning(f"{error_msg} - {context}")
        else:
            # Errores inesperados
            logger.error(f"{error_msg} - {context}", exc_info=settings.ENABLE_STACK_TRACE)
        
        # En debug mode, log adicional con más detalle
        if settings.DEBUG_MODE:
            debug_details = (
                f"[{error_type}] {type(exception).__name__}: {str(exception)} | "
                f"Path: {request.url.path} | Method: {request.method} | "
                f"IP: {getattr(request.state, 'ip_address', 'unknown')} | "
                f"Trace ID: {getattr(request.state, 'trace_id', 'unknown')}"
            )
            logger.debug(debug_details)