from fastapi import FastAPI, Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from routes import users, auth, health_services
from utils.authMiddleware import authenticate_request  # Middleware de autenticación

# Configuración de la aplicación
app = FastAPI(
    title="API de Conectividad con la Base de Datos del Sistema",
    description="API encargada de gestionar la conectividad y acceso a la base de datos del sistema, con múltiples endpoints para manejar datos específicos.",
    version="1.0.0",
    docs_url="/swagger",
    redoc_url=None,
    openapi_url="/openapi.json",
)

# Lista de endpoints protegidos (Privados)
PRIVATE_ROUTES = ["/users", "/inventory", "/admin", "/reports"]

# Middleware para proteger solo los endpoints privados
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.scope["path"]

        # Si la ruta está en la lista de privadas, se requiere autenticación
        if any(path.startswith(route) for route in PRIVATE_ROUTES):
            try:
                authenticate_request(request)
            except HTTPException as e:
                return HTTPException(status_code=e.status_code, detail=e.detail)

        # Si la ruta no es privada, se asume pública y se permite el acceso
        return await call_next(request)

# Agregar middleware a la aplicación
app.add_middleware(AuthMiddleware)

# Incluir los endpoints (auth y health son públicos automáticamente)
## Endpoints Publicos
app.include_router(auth.router, prefix="/auth")
app.include_router(health_services.router, prefix="/health")

## Endpoints Privados
app.include_router(users.router, prefix="/users")
