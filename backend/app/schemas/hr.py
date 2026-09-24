from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class HRCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    department_id: int

class HRResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    company_id: int
    department_id: int
    name: str
    email: str
    department_name: Optional[str] = None
    company_name: Optional[str] = None
    created_at: datetime

class CompanySummary(BaseModel):
    id: int
    name: str

class DepartmentSummary(BaseModel):
    id: int
    name: str

class HRProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    company: CompanySummary
    department: DepartmentSummary

class RecentApplicationItem(BaseModel):
    application_id: int
    candidate_name: str
    vacancy_title: str
    status: str
    applied_at: datetime

class HRDashboardResponse(BaseModel):
    company_name: str
    department_name: str
    active_vacancies_count: int
    total_applicants_count: int
    recent_applications: List[RecentApplicationItem]
