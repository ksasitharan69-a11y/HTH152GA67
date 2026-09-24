import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "HireProof AI"
    VERSION: str = "1.0.0"
    TAGLINE: str = "Don't Just Match. Prove. Verify. Explain."
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./hireproof.db")
    
    # JWT Authentication
    SECRET_KEY: str = Field(default="hireproof_ai_super_secret_jwt_key_hackathon_2026_change_in_prod")
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)
    OTP_EXPIRE_MINUTES: int = Field(default=15)
    
    # LLM Settings
    LLM_PROVIDER: str = Field(default="gemini")
    LLM_API_KEY: Optional[str] = Field(default=None)
    LLM_MODEL: str = Field(default="gemini-1.5-flash")
    LLM_BASE_URL: Optional[str] = Field(default=None)
    
    # CORS
    FRONTEND_URL: str = Field(default="http://localhost:5173")
    
    # File Storage
    UPLOAD_DIR: str = Field(default="uploads")
    MAX_FILE_SIZE_MB: int = Field(default=10)
    ALLOWED_EXTENSIONS: List[str] = ["pdf", "docx"]

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "resumes"), exist_ok=True)
