from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter()

TASKS_URL = os.getenv("TASKS_API_URL", "http://backend-tasks:8020")


@router.get("/taskstatus/{id_task}")
async def get_task_status(id_task: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{TASKS_URL}/taskstatus/{id_task}")
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Error obteniendo estado de tarea")
    return response.json()
