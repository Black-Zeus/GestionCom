from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime
from routes import users

# Configuración de la aplicación
app = FastAPI(
    title="API de Conectividad con la Base de Datos del Sistema",
    description="API encargada de gestionar la conectividad y acceso a la base de datos del sistema, con múltiples endpoints para manejar datos específicos.",
    version="1.0.0",
    docs_url="/swagger",  # Habilitar solo Swagger UI
    redoc_url=None,  # Deshabilitar ReDoc
    openapi_url="/openapi.json",  # Habilita OpenAPI para Swagger
)

# Incluir los endpoints (ejemplo: usuarios, inventarios, etc.)
app.include_router(users.router, prefix="/users")  # Endpoint de usuarios (ejemplo)

# Endpoint de salud de la API
@app.get("/health", response_class=JSONResponse)
async def health_check():
    """
    Endpoint para verificar el estado básico de la API.
    """
    return {
        "name": "API de Conectividad con la Base de Datos del Sistema",
        "role": "Gestión y acceso a la base de datos del sistema",
        "status": "active",  # Estado general de la API
        "timestamp": datetime.utcnow().isoformat(),  # Fecha y hora actual
        "version": "1.0.0",  # Versión de la API
    }
