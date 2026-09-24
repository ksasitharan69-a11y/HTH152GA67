import os
import uuid
import logging
from abc import ABC, abstractmethod
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.ai.resume_parser import ResumeParser

logger = logging.getLogger(__name__)

class DocumentStorage(ABC):
    """Abstract interface for document storage (supports local, S3, Supabase, etc.)."""

    @abstractmethod
    async def save_file(self, file: UploadFile, subfolder: str = "resumes") -> Tuple[str, str, str]:
        """Save file and return (stored_file_path, original_filename, content_type)."""
        pass

    @abstractmethod
    def delete_file(self, file_path: str) -> bool:
        """Delete stored file."""
        pass

class LocalDocumentStorage(DocumentStorage):
    """Local disk document storage implementation."""

    def __init__(self, base_dir: str = settings.UPLOAD_DIR):
        self.base_dir = base_dir

    async def save_file(self, file: UploadFile, subfolder: str = "resumes") -> Tuple[str, str, str]:
        # Validate filename
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must have a filename."
            )

        # Validate extension
        ext = os.path.splitext(file.filename)[1].lower().lstrip(".")
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '.{ext}'. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Validate file size
        content = await file.read()
        max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB."
            )

        # Generate secure unique filename
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        target_dir = os.path.join(self.base_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, unique_name)

        # Save to disk
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
            logger.error(f"Failed to delete file {file_path}: {e}")
        return False

# Global storage instance
storage_service = LocalDocumentStorage()

class ResumeService:
    """High-level service coordinating resume upload, validation, and text extraction."""

    def __init__(self, storage: DocumentStorage = storage_service):
        self.storage = storage

    async def process_resume_upload(self, file: UploadFile) -> Tuple[str, str, str, str]:
        """
        Processes an uploaded resume file:
        1. Validates and stores the file
        2. Extracts and normalizes text
        Returns (stored_path, original_filename, mime_type, extracted_text)
        """
        stored_path, original_name, mime_type = await self.storage.save_file(file, "resumes")
        
        try:
            extracted_text = ResumeParser.extract_text(stored_path, mime_type)
        except Exception as e:
            logger.error(f"Text extraction failed for {stored_path}: {e}")
            # If text extraction completely fails, raise clear bad request
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
