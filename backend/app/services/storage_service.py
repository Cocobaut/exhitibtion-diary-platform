import os
import uuid
import aiofiles
from pathlib import Path
from typing import List, Optional
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import AppException

# Supported magic bytes signatures
MAGIC_SIGNATURES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],  # also verified with WEBP at offset 8
}

ALLOWED_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def verify_magic_bytes(
    header: bytes,
    allowed_mimes: Optional[List[str]] = None,
    unsupported_msg: Optional[str] = None
) -> str:
    """Verify magic bytes and return normalized mime type or raise exception."""
    default_msg = unsupported_msg or "Chỉ chấp nhận ảnh PNG hoặc JPEG"

    if len(header) < 8:
        raise AppException(
            status_code=400,
            error_code="UNSUPPORTED_FILE_TYPE",
            message=default_msg
        )

    detected_mime = None
    if header.startswith(b"\xff\xd8\xff"):
        detected_mime = "image/jpeg"
    elif header.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_mime = "image/png"
    elif header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        detected_mime = "image/webp"

    if not detected_mime:
        raise AppException(
            status_code=400,
            error_code="UNSUPPORTED_FILE_TYPE",
            message=default_msg
        )

    if allowed_mimes and detected_mime not in allowed_mimes:
        raise AppException(
            status_code=400,
            error_code="UNSUPPORTED_FILE_TYPE",
            message=default_msg
        )

    return detected_mime


class StorageService:
    @staticmethod
    async def save(
        file: UploadFile,
        folder: str = "artworks",
        filename_stem: Optional[str] = None,
        max_bytes: int = 5 * 1024 * 1024,
        allowed_mimes: Optional[List[str]] = None,
        file_too_large_msg: str = "Ảnh vượt quá dung lượng 5MB",
        unsupported_type_msg: str = "Chỉ chấp nhận ảnh PNG hoặc JPEG",
    ) -> str:
        """Stream upload file with chunk validation of size and magic bytes.
        Saves to uploads/<folder>/<filename> and returns public accessible URL.
        """
        upload_dir = Path(settings.UPLOAD_DIR) / folder
        upload_dir.mkdir(parents=True, exist_ok=True)

        if not filename_stem:
            filename_stem = uuid.uuid4().hex

        chunk_size = 64 * 1024  # 64 KB
        first_chunk = True
        total_size = 0
        file_ext = ".jpg"

        temp_filename = f"{filename_stem}.tmp"
        temp_filepath = upload_dir / temp_filename

        try:
            async with aiofiles.open(temp_filepath, "wb") as out_file:
                while chunk := await file.read(chunk_size):
                    total_size += len(chunk)
                    if total_size > max_bytes:
                        raise AppException(
                            status_code=400,
                            error_code="FILE_TOO_LARGE",
                            message=file_too_large_msg
                        )

                    if first_chunk:
                        detected_mime = verify_magic_bytes(
                            chunk,
                            allowed_mimes=allowed_mimes,
                            unsupported_msg=unsupported_type_msg
                        )
                        file_ext = ALLOWED_EXTENSIONS.get(detected_mime, ".jpg")
                        first_chunk = False

                    await out_file.write(chunk)

            if first_chunk:  # File was empty
                raise AppException(
                    status_code=400,
                    error_code="UNSUPPORTED_FILE_TYPE",
                    message=unsupported_type_msg
                )

            final_filename = f"{filename_stem}{file_ext}"
            final_filepath = upload_dir / final_filename

            if temp_filepath.exists():
                if final_filepath.exists():
                    final_filepath.unlink()
                temp_filepath.rename(final_filepath)

            public_base = settings.PUBLIC_BASE_URL.rstrip("/")
            return f"{public_base}/static/{folder}/{final_filename}"

        except Exception:
            if temp_filepath.exists():
                try:
                    temp_filepath.unlink()
                except OSError:
                    pass
            raise
        finally:
            await file.seek(0)

    @staticmethod
    def delete(file_url: str) -> bool:
        """Optional delete local file given public URL."""
        try:
            public_base = settings.PUBLIC_BASE_URL.rstrip("/")
            prefix = f"{public_base}/static/"
            if file_url.startswith(prefix):
                rel_path = file_url[len(prefix):]
                target_path = Path(settings.UPLOAD_DIR) / rel_path
                if target_path.exists():
                    target_path.unlink()
                    return True
        except Exception:
            pass
        return False
