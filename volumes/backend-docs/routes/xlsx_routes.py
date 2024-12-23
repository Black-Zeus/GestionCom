from fastapi import APIRouter
from services.xlsx_service import generate_xlsx

router = APIRouter()

@router.post("/generate")
async def create_xlsx():
    return await generate_xlsx()
