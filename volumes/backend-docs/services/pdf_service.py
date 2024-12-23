from reportlab.pdfgen import canvas
import os
from config.minio_config import get_minio_client, MINIO_BUCKET_TEMP, TMP_OUTPUT

minio_client = get_minio_client()

async def generate_pdf():
    pdf_path = f"{TMP_OUTPUT}/pdf_demo.pdf"
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "Reporte PDF generado correctamente.")
    c.save()

    # Subir a MinIO (Bucket de reportes)
    #minio_client.fput_object(MINIO_BUCKET_TEMP, "pdf_demo.pdf", pdf_path)
    #os.remove(pdf_path)

    return {"message": "PDF generado y subido a MinIO (reports)"}

