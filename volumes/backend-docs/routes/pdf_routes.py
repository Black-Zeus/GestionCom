from fastapi import APIRouter
from services.pdf_service import generate_pdf

router = APIRouter()

@router.post("/generate")
async def create_pdf():
    return await generate_pdf()


@router.get("/health")
async def health_check():
    return {"status": "ok - PDF"}
