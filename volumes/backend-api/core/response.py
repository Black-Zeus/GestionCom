"""
Manejador de respuestas unificadas para toda la aplicación
"""
import uuid
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from fastapi import Request
from fastapi.responses import JSONResponse

from .constants import HTTPStatus, ErrorCode, ErrorType
from .exceptions import BaseAppException
from .config import settings


class ErrorInfo(BaseModel):
    """Información de error en la respuesta"""
    code: Optional[str] = None
    type: Optional[str] = None
    details: Optional[str] = None
    field: Optional[str] = None
    stack: Optional[str] = None


class MetaInfo(BaseModel):
    """Información meta de la respuesta"""
    trace_id: str
    version: str = settings.API_VERSION
    execution_time_ms: Optional[int] = None
    pagination: Optional[Dict[str, Any]] = None


class ApiResponse(BaseModel):
    """Modelo de respuesta unificada de la API"""
    success: bool
    status: int
    timestamp: str
    path: str
    method: str
    message: str
    data: Optional[Union[Dict[str, Any], list, str, int, bool]] = None
    error: ErrorInfo = Field(default_factory=ErrorInfo)
    meta: MetaInfo


class ResponseManager:
    """Manejador centralizado de respuestas"""
    
    @staticmethod
    def _get_trace_id(request: Optional[Request] = None) -> str:
        """Obtener o generar trace ID"""
        if request and hasattr(request.state, 'trace_id'):
            return request.state.trace_id
        return str(uuid.uuid4())
    
    @staticmethod
    def _get_execution_time(request: Optional[Request] = None) -> Optional[int]:
        """Calcular tiempo de ejecución en millisegundos"""
        if request and hasattr(request.state, 'start_time'):
            return int((time.time() - request.state.start_time) * 1000)
        return None
    
    @staticmethod
    def _get_path_and_method(request: Optional[Request] = None) -> tuple[str, str]:
        """Obtener path y método HTTP"""
        if request:
            return request.url.path, request.method
        return "/", "UNKNOWN"
    
    @classmethod
    def success(
        cls,
        data: Optional[Union[Dict[str, Any], list, str, int, bool]] = None,
        message: str = "Operación exitosa",
        status_code: HTTPStatus = HTTPStatus.OK,
        request: Optional[Request] = None,
        pagination: Optional[Dict[str, Any]] = None
    ) -> JSONResponse:
        """
        Crear respuesta de éxito
        """
        path, method = cls._get_path_and_method(request)
        
        response_data = ApiResponse(
            success=True,
            status=status_code,
            timestamp=datetime.now(timezone.utc).isoformat(),
            path=path,
            method=method,
            message=message,
            data=data,
            error=ErrorInfo(),
            meta=MetaInfo(
                trace_id=cls._get_trace_id(request),
                execution_time_ms=cls._get_execution_time(request),
                pagination=pagination
            )
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response_data.model_dump(exclude_none=True)
        )
    
    @classmethod
    def error(
        cls,
        message: str,
        error_code: Optional[ErrorCode] = None,
        error_type: Optional[ErrorType] = None,
        details: Optional[str] = None,
        field: Optional[str] = None,
        status_code: HTTPStatus = HTTPStatus.INTERNAL_SERVER_ERROR,
        request: Optional[Request] = None,
        stack_trace: Optional[str] = None
    ) -> JSONResponse:
        """
        Crear respuesta de error
        """
        path, method = cls._get_path_and_method(request)
        
        # Solo incluir stack trace en desarrollo
        include_stack = settings.ENABLE_STACK_TRACE and settings.is_development
        
        response_data = ApiResponse(
            success=False,
            status=status_code,
            timestamp=datetime.now(timezone.utc).isoformat(),
            path=path,
            method=method,
            message=message,
            data=None,
            error=ErrorInfo(
                code=error_code,
                type=error_type,
                details=details,
                field=field,
                stack=stack_trace if include_stack else None
            ),
            meta=MetaInfo(
                trace_id=cls._get_trace_id(request),
                execution_time_ms=cls._get_execution_time(request)
            )
        )
        
        return JSONResponse(
            status_code=status_code,
            content=response_data.model_dump(exclude_none=True)
        )
    
    @classmethod
    def from_exception(
        cls,
        exception: BaseAppException,
        request: Optional[Request] = None,
        stack_trace: Optional[str] = None
    ) -> JSONResponse:
        """
        Crear respuesta desde una excepción personalizada
        """
        return cls.error(
            message=exception.message,
            error_code=exception.error_code,
            error_type=exception.error_type,
            details=exception.details,
            field=exception.field,
            status_code=exception.status_code,
            request=request,
            stack_trace=stack_trace
        )
    
    @classmethod
    def validation_error(
        cls,
        errors: list,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta para errores de validación de Pydantic
        """
        # Tomar el primer error para el mensaje principal
        first_error = errors[0] if errors else {}
        field_name = ".".join(str(x) for x in first_error.get("loc", []))
        error_msg = first_error.get("msg", "Error de validación")
        
        # Formatear detalles con todos los errores
        details_list = []
        for error in errors:
            field = ".".join(str(x) for x in error.get("loc", []))
            msg = error.get("msg", "")
            details_list.append(f"{field}: {msg}")
        
        details = "; ".join(details_list)
        
        return cls.error(
            message=f"Error de validación en campo '{field_name}'",
            error_code=ErrorCode.VALIDATION_FIELD_FORMAT,
            error_type=ErrorType.VALIDATION_ERROR,
            details=details,
            field=field_name,
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            request=request
        )
    
    @classmethod
    def unauthorized(
        cls,
        message: str = "No autorizado",
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta de no autorizado (401)
        """
        return cls.error(
            message=message,
            error_code=ErrorCode.AUTH_TOKEN_MISSING,
            error_type=ErrorType.AUTHENTICATION_ERROR,
            details=details or "Token de autenticación requerido",
            status_code=HTTPStatus.UNAUTHORIZED,
            request=request
        )
    
    @classmethod
    def forbidden(
        cls,
        message: str = "Acceso denegado",
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta de acceso denegado (403)
        """
        return cls.error(
            message=message,
            error_code=ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
            error_type=ErrorType.PERMISSION_ERROR,
            details=details or "No tiene permisos para realizar esta operación",
            status_code=HTTPStatus.FORBIDDEN,
            request=request
        )
    
    @classmethod
    def not_found(
        cls,
        message: str = "Recurso no encontrado",
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta de recurso no encontrado (404)
        """
        return cls.error(
            message=message,
            error_code=ErrorCode.AUTH_USER_NOT_FOUND,
            error_type=ErrorType.SYSTEM_ERROR,
            details=details,
            status_code=HTTPStatus.NOT_FOUND,
            request=request
        )
    
    @classmethod
    def too_many_requests(
        cls,
        message: str = "Demasiadas solicitudes",
        details: Optional[str] = None,
        retry_after: Optional[int] = None,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta de límite de tasa excedido (429)
        """
        response = cls.error(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            error_type=ErrorType.RATE_LIMIT_ERROR,
            details=details or "Ha excedido el límite de solicitudes permitidas",
            status_code=HTTPStatus.TOO_MANY_REQUESTS,
            request=request
        )
        
        # Agregar header Retry-After si se proporciona
        if retry_after:
            response.headers["Retry-After"] = str(retry_after)
        
        return response
    
    @classmethod
    def internal_server_error(
        cls,
        message: str = "Error interno del servidor",
        details: Optional[str] = None,
        request: Optional[Request] = None,
        stack_trace: Optional[str] = None
    ) -> JSONResponse:
        """
        Crear respuesta de error interno del servidor (500)
        """
        return cls.error(
            message=message,
            error_code=ErrorCode.SYSTEM_INTERNAL_ERROR,
            error_type=ErrorType.SYSTEM_ERROR,
            details=details,
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            request=request,
            stack_trace=stack_trace
        )
    
    @classmethod
    def service_unavailable(
        cls,
        message: str = "Servicio no disponible",
        details: Optional[str] = None,
        request: Optional[Request] = None
    ) -> JSONResponse:
        """
        Crear respuesta de servicio no disponible (503)
        """
        return cls.error(
            message=message,
            error_code=ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
            error_type=ErrorType.SYSTEM_ERROR,
            details=details or "El servicio está temporalmente no disponible",
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            request=request
        )


# ==========================================
# Funciones de conveniencia
# ==========================================

def success_response(
    data: Optional[Union[Dict[str, Any], list, str, int, bool]] = None,
    message: str = "Operación exitosa",
    status_code: HTTPStatus = HTTPStatus.OK,
    request: Optional[Request] = None,
    pagination: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """Función de conveniencia para respuestas exitosas"""
    return ResponseManager.success(
        data=data,
        message=message,
        status_code=status_code,
        request=request,
        pagination=pagination
    )


def error_response(
    message: str,
    error_code: Optional[ErrorCode] = None,
    error_type: Optional[ErrorType] = None,
    details: Optional[str] = None,
    field: Optional[str] = None,
    status_code: HTTPStatus = HTTPStatus.INTERNAL_SERVER_ERROR,
    request: Optional[Request] = None
) -> JSONResponse:
    """Función de conveniencia para respuestas de error"""
    return ResponseManager.error(
        message=message,
        error_code=error_code,
        error_type=error_type,
        details=details,
        field=field,
        status_code=status_code,
        request=request
    )


# ==========================================
# Helpers para paginación
# ==========================================

def create_pagination_info(
    total: int,
    limit: int,
    offset: int,
    current_page: Optional[int] = None
) -> Dict[str, Any]:
    """
    Crear información de paginación para incluir en respuestas
    """
    if current_page is None:
        current_page = (offset // limit) + 1 if limit > 0 else 1
    
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    has_next = offset + limit < total
    has_previous = offset > 0
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "current_page": current_page,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_previous": has_previous
    }


def paginated_response(
    data: list,
    total: int,
    limit: int,
    offset: int,
    message: str = "Datos obtenidos exitosamente",
    request: Optional[Request] = None
) -> JSONResponse:
    """
    Crear respuesta paginada
    """
    pagination = create_pagination_info(total, limit, offset)
    
    return ResponseManager.success(
        data=data,
        message=message,
        pagination=pagination,
        request=request
    )