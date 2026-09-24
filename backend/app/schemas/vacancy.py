from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.database.models import VacancyStatus, RequirementType, RequirementImportance

class JobRequirementCreate(BaseModel):
    requirement_text: str = Field(..., min_length=2, max_length=500)
    requirement_type: RequirementType = RequirementType.SKILL
    importance: str = "HIGH"

class JobRequirementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vacancy_id: int
    requirement_text: str
    requirement_type: RequirementType
    importance: str
    created_at: datetime

class VacancyCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    department_id: int
    description: str = Field(..., min_length=10)
    required_experience: str = Field(..., min_length=1, max_length=255)
    education: str = Field(..., min_length=1, max_length=255)
    required_skills: List[str] = Field(..., min_length=1)
    preferred_skills: List[str] = Field(default_factory=list)
    other_requirements: Optional[str] = None

class VacancyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    department_id: int
    created_by_hr_id: int
    title: str
    description: str
    required_experience: str
    education: str
    required_skills: List[str]
    preferred_skills: List[str]
    other_requirements: Optional[str] = None
    status: VacancyStatus
    created_at: datetime
    updated_at: datetime
    company_name: Optional[str] = None
    department_name: Optional[str] = None
    requirements: List[JobRequirementResponse] = []

class PublicVacancyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    department_id: int
    title: str
    description: str
    required_experience: str
    education: str
    required_skills: List[str]
    preferred_skills: List[str]
    other_requirements: Optional[str] = None
    status: VacancyStatus
    created_at: datetime
    company_name: Optional[str] = None
    department_name: Optional[str] = None
