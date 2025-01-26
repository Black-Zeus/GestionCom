from fastapi import APIRouter, HTTPException
from services import task_service

router = APIRouter()

# Obtener estado de una tarea específica
@router.get("/taskstatus/{task_id}")
async def get_task_status(task_id: str):
    status = task_service.get_task_status(task_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"status": status}

# Crear una nueva tarea (Ejemplo)
@router.post("/create")
async def create_task(task_name: str):
    task_id = task_service.create_task(task_name)
    return {"task_id": task_id, "message": "Tarea creada"}
