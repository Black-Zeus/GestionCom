from fastapi import APIRouter
import uuid
from datetime import datetime, timezone

router = APIRouter()

@router.post("/uploadDocumento")
async def create_docx():
    """
    Endpoint dummy para cargar un documento.
    """
    # Simulación de un ID único para el documento
    document_id = str(uuid.uuid4())

    return {
        "status": "Success",
        "message": "El documento se cargó satisfactoriamente.",
        "document_id": document_id,  # ID único generado para el documento
        "uploaded_at": datetime.now(timezone.utc),  # Timestamp de la carga
        "details": {
            "filename": "dummy_document.docx",  # Nombre del archivo simulado
            "size": "1024KB",  # Tamaño simulado
            "file_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  # Tipo de archivo simulado
        }
    }
