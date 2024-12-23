from minio import Minio
import os

def get_minio_client():
    minio_host = os.getenv("MINIO_HOST").replace("http://", "")
    minio_access_key = os.getenv("MINIO_ACCESS_KEY")
    minio_secret_key = os.getenv("MINIO_SECRET_KEY")
    
    return Minio(
        minio_host,
        access_key=minio_access_key,
        secret_key=minio_secret_key,
        secure=False
    )

# Variables globales para buckets y paths
# Buckets
MINIO_BUCKET_TEMP = os.getenv("MINIO_BUCKET_TEMP", "temporary")
MINIO_BUCKET_BACKUPS = os.getenv("MINIO_BUCKET_BACKUPS", "backups")
MINIO_BUCKET_REPORTS = os.getenv("MINIO_BUCKET_REPORTS", "reports")
MINIO_BUCKET_INVOICES = os.getenv("MINIO_BUCKET_INVOICES", "invoices")

# OutPath temporal
TMP_OUTPUT = os.getenv("TMP_OUTPUT", "/app/tmp")
