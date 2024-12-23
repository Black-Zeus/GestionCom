from fastapi import APIRouter
from services.docx_service import generate_docx

router = APIRouter()

@router.post("/generate")
async def create_docx():
    return await generate_docx()
