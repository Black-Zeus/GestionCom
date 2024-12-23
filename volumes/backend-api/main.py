from fastapi import FastAPI
from routes import api_docs, api_tasks, api_users
import os

app = FastAPI()

# Prefijo general para la API
global_prefix = os.getenv("BACKEND_API_PREFIX", "/api/v1")

# Incluir las rutas usando el prefijo general
app.include_router(api_docs.router, prefix=f"{global_prefix}/docs")
app.include_router(api_tasks.router, prefix=f"{global_prefix}/tasks")
app.include_router(api_users.router, prefix=f"{global_prefix}/usuarios")

# Salud de la API principal
@app.get(f"{global_prefix}/health")
async def health_check():
    return {"status": "ok"}
