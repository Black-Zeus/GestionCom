from fastapi import FastAPI, Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from routes import users, auth, health_services
from middleware.auth_middleware import authenticate_request  # ← Movemos aquí
from middleware.response_middleware import ResponseMiddleware  # ← Agregamos

app = FastAPI(
    title="API de Conectividad con la Base de Datos del Sistema",
    description="API encargada de gestionar la conectividad y acceso a la base de datos del sistema, con múltiples endpoints para manejar datos específicos.",
    version="1.0.0",
    docs_url="/swagger",
    redoc_url=None,
    openapi_url="/openapi.json",
)

PRIVATE_ROUTES = ["/users", "/inventory", "/admin", "/reports"]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.scope["path"]
        
        if any(path.startswith(route) for route in PRIVATE_ROUTES):
            try:
                await authenticate_request(request)  # ← Hacemos async
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
        
        return await call_next(request)

# Middleware en orden correcto
app.add_middleware(ResponseMiddleware)  # ← Primero respuestas unificadas
app.add_middleware(AuthMiddleware)      # ← Luego autenticación

# Routers (sin cambios)
app.include_router(auth.router, prefix="/auth")
app.include_router(health_services.router, prefix="/health")
app.include_router(users.router, prefix="/users")