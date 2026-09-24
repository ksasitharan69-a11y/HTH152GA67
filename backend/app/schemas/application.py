from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.database.models import ApplicationStatus

class CandidateProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime

class CandidateProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vacancy_id: int
    candidate_id: int
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    resume_filename: str
    vacancy_title: Optional[str] = None
    company_name: Optional[str] = None
    candidate_name: Optional[str] = None
    has_analysis: bool = False

class ApplicationStatusUpdateRequest(BaseModel):
    status: ApplicationStatus

class ApplicationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vacancy_id: int
    candidate_id: int
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime
    resume_filename: str
    resume_mime_type: str
    extracted_text_preview: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_github: Optional[str] = None
    candidate_linkedin: Optional[str] = None
    vacancy_title: Optional[str] = None
    company_name: Optional[str] = None
