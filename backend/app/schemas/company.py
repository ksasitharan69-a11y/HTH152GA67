from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    ceo_user_id: int
    is_active: bool
    created_at: datetime

class PublicCompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_active: bool
    created_at: datetime

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class DepartmentUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)

class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    name: str
    created_at: datetime
