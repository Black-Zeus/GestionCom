from fastapi import APIRouter, HTTPException, Query
from services import task_service

router = APIRouter()

# Obtener estado de una tarea específica
@router.get("/taskstatus/{task_id}")
async def get_task_status(task_id: str):
    """
    Obtener el estado de una tarea específica por su ID.
    """
    status = task_service.get_task_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail=f"Tarea con ID '{task_id}' no encontrada")
    
    return {
        "task_id": task_id,
        "status": status,
        "description": "Estado actual de la tarea"
    }

# Crear una nueva tarea
@router.post("/create")
async def create_task(task_name: str = Query(..., description="Nombre de la tarea a crear")):
    """
    Crear una nueva tarea.
    """
    if not task_name.strip():
        raise HTTPException(status_code=400, detail="El nombre de la tarea no puede estar vacío")

    task_id = task_service.create_task(task_name)

    return {
        "task_id": task_id,
        "task_name": task_name,
        "message": "La tarea se creó exitosamente",
        "timestamp": task_service.get_current_timestamp()  # Ejemplo de timestamp simulado
    }
