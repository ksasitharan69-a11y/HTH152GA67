from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.database.models import UserRole

class CEORegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    company_name: str = Field(..., min_length=2, max_length=100)

class CandidateRegisterRequest(BaseModel):
    name: Optional[str] = Field(default="Candidate", min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    role: UserRole
    is_email_verified: bool
    is_active: bool
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user: UserResponse
    company_id: Optional[int] = None
    company_name: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    email: Optional[str] = None
    otp_preview: Optional[str] = None  # Helper for hackathon/dev testing if email service not connected
