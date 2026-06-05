"""
Servicio de media sanitizada para imagenes en MinIO.
"""
from __future__ import annotations

from datetime import timedelta
from io import BytesIO
from uuid import uuid4

from minio import Minio
from PIL import Image, ImageOps

from core.config import settings


IMAGE_PROFILES = {
    "avatar": {"full": (1024, 1024), "thumb": (128, 128), "fit": True},
    "logo": {"full": (1024, 1024), "thumb": (128, 128), "fit": False},
    "banner": {"full": (1600, 500), "thumb": (320, 100), "fit": False},
    "product": {"full": (1024, 1024), "thumb": (160, 160), "fit": False},
}


class MediaStorage:
    def __init__(self):
        self.bucket = settings.MINIO_MEDIA_BUCKET
        self.client = Minio(
            f"{settings.MINIO_HOST}:{settings.MINIO_PORT}",
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_SECURE,
            region=settings.MINIO_REGION,
        )
        self.public_client = Minio(
            f"{settings.MINIO_PUBLIC_HOST}:{settings.MINIO_PUBLIC_PORT}",
            access_key=settings.MINIO_ROOT_USER,
            secret_key=settings.MINIO_ROOT_PASSWORD,
            secure=settings.MINIO_PUBLIC_SECURE,
            region=settings.MINIO_REGION,
        )

    def ensure_bucket(self) -> None:
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    @staticmethod
    def _render_variant(image: Image.Image, size: tuple[int, int], fit: bool) -> tuple[bytes, tuple[int, int]]:
        working = ImageOps.exif_transpose(image)
        if fit:
            working = ImageOps.fit(working, size, method=Image.Resampling.LANCZOS)
        else:
            working.thumbnail(size, Image.Resampling.LANCZOS)
        if working.mode not in ("RGB", "RGBA"):
            working = working.convert("RGBA" if "A" in working.getbands() else "RGB")
        output = BytesIO()
        working.save(output, format="WEBP", quality=88, method=6)
        return output.getvalue(), working.size

    def process_image(self, content: bytes, profile: str) -> dict:
        if profile not in IMAGE_PROFILES:
            raise ValueError("Perfil de imagen no soportado")
        config = IMAGE_PROFILES[profile]
        try:
            image = Image.open(BytesIO(content))
            image.verify()
            image = Image.open(BytesIO(content))
        except Exception as exc:
            raise ValueError("Archivo de imagen invalido") from exc

        full_bytes, full_size = self._render_variant(image, config["full"], config["fit"])
        thumb_bytes, thumb_size = self._render_variant(image, config["thumb"], config["fit"])
        return {
            "full": full_bytes,
            "thumb": thumb_bytes,
            "full_width": full_size[0],
            "full_height": full_size[1],
            "thumb_width": thumb_size[0],
            "thumb_height": thumb_size[1],
        }

    def upload_image(self, *, content: bytes, profile: str, owner_type: str, owner_id: int, role: str) -> dict:
        self.ensure_bucket()
        processed = self.process_image(content, profile)
        media_code = f"MED_{uuid4().hex[:16].upper()}"
        base_key = f"{owner_type.lower()}/{owner_id}/{role.lower()}/{media_code}"
        full_key = f"{base_key}/full.webp"
        thumb_key = f"{base_key}/thumb.webp"

        self.client.put_object(self.bucket, full_key, BytesIO(processed["full"]), len(processed["full"]), content_type="image/webp")
        self.client.put_object(self.bucket, thumb_key, BytesIO(processed["thumb"]), len(processed["thumb"]), content_type="image/webp")

        return {
            "media_code": media_code,
            "bucket_name": self.bucket,
            "object_key_full": full_key,
            "object_key_thumb": thumb_key,
            "mime_type": "image/webp",
            "full_width": processed["full_width"],
            "full_height": processed["full_height"],
            "thumb_width": processed["thumb_width"],
            "thumb_height": processed["thumb_height"],
            "full_size_bytes": len(processed["full"]),
            "thumb_size_bytes": len(processed["thumb"]),
        }

    def presigned_url(self, object_key: str) -> str:
        return self.public_client.presigned_get_object(
            self.bucket,
            object_key,
            expires=timedelta(seconds=settings.MEDIA_PRESIGNED_EXPIRE_SECONDS),
        )


media_storage = MediaStorage()
