from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from app.database.models import AssessmentStatus

class AssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    drill_down_questions: List[str]
    broken_code_snippet: str
    status: str
    score: Optional[int] = None
    verdict: Optional[str] = None
    findings_breakdown: Optional[Dict[str, Any]] = None
    audit_justification: Optional[str] = None
    created_at: datetime
    evaluated_at: Optional[datetime] = None

class AssessmentSubmitRequest(BaseModel):
    drill_down_responses: Dict[str, str] = Field(default_factory=dict)
    code_review_response: str = Field(..., min_length=10)

class AssessmentResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    score: int
    verdict: str
    status: str
    findings_breakdown: Optional[Dict[str, Any]] = None
    audit_justification: Optional[str] = None
    evaluated_at: Optional[datetime] = None
