import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Tuple, Optional
import httpx
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.ai.resume_parser import ResumeParser

logger = logging.getLogger(__name__)

class DocumentStorage(ABC):
    """Abstract interface for document storage (supports Local, Supabase, etc.)."""

    @abstractmethod
    async def save_file(self, file: UploadFile, subfolder: str = "resumes") -> Tuple[str, str, str]:
        """Save file and return (stored_file_path_or_key, original_filename, content_type)."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Delete stored file."""
        pass

    @abstractmethod
    def download_file(self, file_path: str) -> bytes:
        """Download file content as raw bytes."""
        pass

    @abstractmethod
    def get_file_url(self, file_path: str) -> str:
        """Get accessible download/view URL."""
        pass


class LocalDocumentStorage(DocumentStorage):
    """Local disk document storage implementation."""

    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(os.path.join(self.base_dir, "resumes"), exist_ok=True)

    async def save_file(self, file: UploadFile, subfolder: str = "resumes") -> Tuple[str, str, str]:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must have a filename."
            )

        ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '.{ext}'. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        content = await file.read()
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB."
            )

        unique_name = f"{uuid.uuid4().hex}.{ext}"
        target_dir = os.path.join(self.base_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(content)

        content_type = file.content_type or ("application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        return file_path, file.filename, content_type

    def delete_file(self, file_path: str) -> bool:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
        except Exception as e:
            logger.error(f"Failed to delete local file {file_path}: {e}")
        return False

    def download_file(self, file_path: str) -> bytes:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Requested file was not found on local storage.")
        with open(file_path, "rb") as f:
            return f.read()

    def get_file_url(self, file_path: str) -> str:
        # Returns server-relative path for local development
        norm = os.path.normpath(file_path).replace("\\", "/")
        return f"/{norm}"


class SupabaseStorageService(DocumentStorage):
    """
    Supabase Storage provider using REST API with local fallback if credentials are unset.
    Does NOT leak service keys to the frontend.
    """

    def __init__(
        self,
        supabase_url: Optional[str] = settings.SUPABASE_URL,
        service_role_key: Optional[str] = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
        bucket_name: str = settings.SUPABASE_STORAGE_BUCKET
    ):
        self.supabase_url = (supabase_url or "").rstrip("/")
        self.service_role_key = service_role_key or ""
        self.bucket = bucket_name
        self.local_fallback = LocalDocumentStorage()

        if not self.supabase_url or not self.service_role_key:
            logger.warning("Supabase Storage credentials missing. SupabaseStorageService will route to local storage fallback.")

    @property
    def is_configured(self) -> bool:
        return bool(self.supabase_url and self.service_role_key)

    async def save_file(self, file: UploadFile, subfolder: str = "resumes") -> Tuple[str, str, str]:
        if not self.is_configured:
            return await self.local_fallback.save_file(file, subfolder)

        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file must have a filename.")

        ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type '.{ext}'.")

        content = await file.read()
        unique_name = f"{subfolder}/{uuid.uuid4().hex}.{ext}"
        content_type = file.content_type or ("application/pdf" if ext == "pdf" else "application/octet-stream")

        url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{unique_name}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
            "Content-Type": content_type
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, content=content, headers=headers)
                if res.status_code in [200, 201]:
                    # Also keep local copy for parser if needed
                    local_path, _, _ = await self.local_fallback.save_file(
                        UploadFile(filename=file.filename, file=None),
                        subfolder
                    ) if False else (unique_name, file.filename, content_type)
                    return unique_name, file.filename, content_type
                else:
                    logger.warning(f"Supabase Storage upload failed with status {res.status_code}: {res.text}. Falling back to local storage.")
        except Exception as e:
            logger.warning(f"Supabase Storage exception: {e}. Falling back to local storage.")

        # Local fallback on error
        await file.seek(0)
        return await self.local_fallback.save_file(file, subfolder)

    def delete_file(self, file_path: str) -> bool:
        if not self.is_configured or os.path.exists(file_path):
            return self.local_fallback.delete_file(file_path)

        url = f"{self.supabase_url}/storage/v1/object/{self.bucket}/{file_path}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.delete(url, headers=headers)
                return res.status_code in [200, 204]
        except Exception as e:
            logger.error(f"Failed to delete file from Supabase storage: {e}")
            return False

    def download_file(self, file_path: str) -> bytes:
        if not self.is_configured or os.path.exists(file_path):
            return self.local_fallback.download_file(file_path)

        url = f"{self.supabase_url}/storage/v1/object/authenticated/{self.bucket}/{file_path}"
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        try:
            with httpx.Client(timeout=15.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    return res.content
        except Exception as e:
            logger.error(f"Supabase download failed: {e}")
        return self.local_fallback.download_file(file_path)

    def get_file_url(self, file_path: str) -> str:
        if not self.is_configured:
            return self.local_fallback.get_file_url(file_path)
        return f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{file_path}"


def create_storage_provider() -> DocumentStorage:
    if settings.STORAGE_PROVIDER.lower() == "supabase" and settings.SUPABASE_URL:
        return SupabaseStorageService()
    return LocalDocumentStorage()

storage_service: DocumentStorage = create_storage_provider()


class ResumeService:
    """Coordinating service for resume uploads, storage provider switching, and parsing."""

    def __init__(self, storage: DocumentStorage = storage_service):
        self.storage = storage

    async def upload_resume(self, file: UploadFile) -> Tuple[str, str, str, str]:
        """Convenience method matching standard upload_resume signature."""
        return await self.process_resume_upload(file)

    def download_resume(self, file_path: str) -> bytes:
        return self.storage.download_file(file_path)

    def delete_resume(self, file_path: str) -> bool:
        return self.storage.delete_file(file_path)

    def get_resume_url(self, file_path: str) -> str:
        return self.storage.get_file_url(file_path)

    async def process_resume_upload(self, file: UploadFile) -> Tuple[str, str, str, str]:
        """
        Processes an uploaded resume file:
        1. Validates and stores the file (Local or Supabase)
        2. Extracts and normalizes text
        Returns (stored_path, original_filename, mime_type, extracted_text)
        """
        stored_path, original_name, mime_type = await self.storage.save_file(file, "resumes")
        
        try:
            # If stored path is on disk, extract directly
            if os.path.exists(stored_path):
                extracted_text = ResumeParser.extract_text(stored_path, mime_type)
            else:
                # If stored in remote storage, download to temp memory/disk for extraction
                file_bytes = self.storage.download_file(stored_path)
                import tempfile
                ext = os.path.splitext(original_name)[1]
                with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name
                try:
                    extracted_text = ResumeParser.extract_text(tmp_path, mime_type)
                finally:
                    if os.path.exists(tmp_path):
                        os.remove(tmp_path)
        except Exception as e:
            logger.error(f"Text extraction failed for {stored_path}: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unable to extract text from resume: {str(e)}"
            )

        if not extracted_text or len(extracted_text.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded resume appears to be empty or unreadable text."
            )

        return stored_path, original_name, mime_type, extracted_text


resume_service = ResumeService()
