from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from routes import uploads

# Configuración de la aplicación
app = FastAPI(
    title="API Documental",
    description="API encargada de gestionar la carga y manejo de documentos en el sistema.",
    version="1.0.0",
    docs_url="/swagger",  # Habilitar solo Swagger UI
    redoc_url=None,  # Deshabilitar ReDoc
    openapi_url="/openapi.json",  # Habilita OpenAPI para Swagger
)

# Incluir rutas específicas para la API documental
app.include_router(uploads.router, prefix="/upload")  # Rutas para carga de documentos

# Endpoint de salud de la API documental
@app.get("/health", response_class=JSONResponse)
async def health_check():
    """
    Endpoint para verificar el estado básico de la API documental.
    """
    return {
        "name": "API Documental",
        "role": "Gestión de carga y manejo de documentos",
        "status": "active",  # Estado general de la API
        "timestamp": datetime.now(timezone.utc),  # Fecha y hora actual
        "version": "1.0.0",  # Versión de la API
    }
