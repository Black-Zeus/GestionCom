from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
from routes import task_routes  # Importar las rutas específicas para las tareas

# Configuración de la aplicación
app = FastAPI(
    title="API de Tareas en Segundo Plano",
    description="API encargada de gestionar tareas en segundo plano y colas de trabajo para el sistema.",
    version="1.0.0",
    docs_url="/swagger",  # Habilitar solo Swagger UI
    redoc_url=None,  # Deshabilitar ReDoc
    openapi_url="/openapi.json",  # Habilita OpenAPI para Swagger
)

# Incluir rutas específicas para las tareas en segundo plano
app.include_router(task_routes.router, prefix="/tasks")  # Rutas específicas para tareas

# Endpoint de salud de la API de tareas
@app.get("/health", response_class=JSONResponse)
async def health_check():
    """
    Endpoint para verificar el estado básico de la API de tareas en segundo plano.
    """
    return {
        "name": "API de Tareas en Segundo Plano",
        "role": "Gestión de colas de trabajo y procesamiento en segundo plano",
        "status": "active",  # Estado general de la API
        "timestamp": datetime.now(timezone.utc),  # Fecha y hora actual
        "version": "1.0.0",  # Versión de la API
    }
