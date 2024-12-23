from openpyxl import Workbook
import os
from config.minio_config import get_minio_client, MINIO_BUCKET_TEMP, TMP_OUTPUT

minio_client = get_minio_client()

async def generate_xlsx():
    xlsx_path = f"{TMP_OUTPUT}/xlsx_demo.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    sheet["A1"] = "Respaldo generado correctamente."
    workbook.save(xlsx_path)

    # Subir a MinIO (Bucket de backups)
    minio_client.fput_object(MINIO_BUCKET_TEMP, "xlsx_demo.xlsx", xlsx_path)
    os.remove(xlsx_path)

    return {"message": "Respaldo Excel generado y subido a MinIO (backups)"}
