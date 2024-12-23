from fastapi import APIRouter, HTTPException
import httpx
import os
import logging

router = APIRouter()

DOCS_URL = os.getenv("DOCS_API_URL", "http://backend-docs:8010")

# Configuración básica del logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@router.post("/generaPDF")
async def generate_pdf():
    url = f"{DOCS_URL}/pdf/generate"
    logger.info(f"Enviando petición a: {url}")  # Muestra la URL en terminal
    async with httpx.AsyncClient() as client:
        response = await client.post(url)
        if response.status_code != 200:
            logger.error(f"Error generando PDF: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Error generando PDF")
    return response.json()

@router.post("/healthPDF")
async def health_pdf():
    url = f"{DOCS_URL}/pdf/health"
    logger.info(f"Enviando petición a: {url}")  # Muestra la URL en terminal
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            logger.error(f"Error en health de PDF: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail="Error en health PDF")
    return response.json()
