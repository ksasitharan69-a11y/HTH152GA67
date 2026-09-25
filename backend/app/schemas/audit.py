from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class AuditDefenseQueryRequest(BaseModel):
    question: str = Field(..., min_length=3)

class AuditDefenseQueryResponse(BaseModel):
    application_id: int
    question: str
    answer: str
    referenced_requirements: List[str] = []
    referenced_evidence_ids: List[int] = []
    referenced_overrides: List[Dict[str, Any]] = []
    assessment_finding: Optional[str] = None

class AuditOverrideRequest(BaseModel):
    requirement_id: Optional[int] = None
    original_status: str
    new_status: str
    reason: str = Field(..., min_length=5)

class AuditOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    requirement_id: Optional[int] = None
    original_status: str
    new_status: Optional[str] = None
    reason: str
    hr_user_id: int
    created_at: datetime
