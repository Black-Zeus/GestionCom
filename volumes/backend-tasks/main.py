from fastapi import FastAPI
from routes import task_routes  # Importar rutas de tareas

app = FastAPI()

# Incluir rutas con prefijo general
app.include_router(task_routes.router, prefix="/tasks")

# Endpoint para verificar estado de salud
@app.get("/health")
async def health_check():
    return {"status": "ok"}
