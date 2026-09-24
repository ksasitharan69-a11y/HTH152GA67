from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from app.database.models import (
    RequirementType, MatchStatus, EvidenceSourceType,
    VerificationType, VerificationEvaluationResult
)

# -------------------------------------------------------------
# JD & Resume Extraction Schemas
# -------------------------------------------------------------

class ExtractedRequirement(BaseModel):
    requirement: str
    type: RequirementType = RequirementType.SKILL
    importance: str = "HIGH"

class JDAnalysisResponse(BaseModel):
    requirements: List[ExtractedRequirement]

class ResumeAnalysisResponse(BaseModel):
    skills: List[str] = []
    experience: List[str] = []
    projects: List[str] = []
    education: List[str] = []
    certifications: List[str] = []

# -------------------------------------------------------------
# Evidence & Match Schemas
# -------------------------------------------------------------

class EvidenceResponseItem(BaseModel):
    id: Optional[int] = None
    source_type: EvidenceSourceType
    source_text: str
    source_location: Optional[str] = None
    confidence: float = 1.0

class RequirementMatchItem(BaseModel):
    requirement_id: int
    requirement: str
    type: RequirementType
    importance: str
    status: MatchStatus
    evidence: List[EvidenceResponseItem] = []
    reasoning: str
    confidence: float = 0.0

class ApplicationAnalysisResponse(BaseModel):
    application_id: int
    candidate_id: int
    candidate_name: str
    vacancy_id: int
    vacancy_title: str
    overall_coverage_pct: float
    requirements: List[RequirementMatchItem]

# -------------------------------------------------------------
# Evidence Graph Schemas
# -------------------------------------------------------------

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # requirement, evidence, reasoning, decision
    data: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None

class EvidenceGraphResponse(BaseModel):
    application_id: int
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# -------------------------------------------------------------
# Verification & Proving Schemas
# -------------------------------------------------------------

class ProveRequirementResponse(BaseModel):
    requirement_id: int
    requirement: str
    current_status: MatchStatus
    verification_type: VerificationType
    reason: str

class VerificationChallengeRequest(BaseModel):
    application_id: int
    requirement_id: int

class VerificationChallengeResponse(BaseModel):
    application_id: int
    requirement_id: int
    requirement: str
    verification_type: VerificationType = VerificationType.AI_CHALLENGE
    challenge: str
    instructions: str

class VerificationInterviewQuestionRequest(BaseModel):
    application_id: int
    requirement_id: int

class VerificationInterviewQuestionResponse(BaseModel):
    application_id: int
    requirement_id: int
    requirement: str
    verification_type: VerificationType = VerificationType.AI_INTERVIEW
    question: str

class CandidateAnswerEvaluationRequest(BaseModel):
    application_id: int
    requirement_id: int
    question: str
    candidate_answer: str = Field(..., min_length=5)

class CandidateAnswerEvaluationResponse(BaseModel):
    result: VerificationEvaluationResult
    confidence: float
    reasoning: str
    evidence: str
    original_status: MatchStatus
    updated_status: MatchStatus

# -------------------------------------------------------------
# Audit, HR Challenge & Feedback Schemas
# -------------------------------------------------------------

class HRChallengeRequest(BaseModel):
    requirement_id: int
    reason: str = Field(..., min_length=5)
    new_status: Optional[MatchStatus] = None

class HRChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    requirement_id: int
    original_status: str
    new_status: Optional[str]
    reason: str
    created_at: datetime
    hr_user_id: int

class FeedbackCreateRequest(BaseModel):
    feedback_type: str = "HR"
    content: str = Field(..., min_length=5)

class FeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    feedback_type: str
    content: str
    created_by: str
    created_at: datetime

class VerificationHistoryItem(BaseModel):
    id: int
    requirement_id: int
    requirement_text: str
    verification_type: VerificationType
    question: str
    candidate_response: str
    ai_result: VerificationEvaluationResult
    ai_reasoning: str
    confidence: float
    created_at: datetime

class FinalAnalysisResponse(BaseModel):
    application_id: int
    candidate: Dict[str, Any]
    vacancy: Dict[str, Any]
    overall_requirement_coverage: float
    total_requirements: int
    verified_count: int
    partial_count: int
    unverified_count: int
    gap_count: int
    requirement_breakdown: List[RequirementMatchItem]
    verification_audit_trail: List[VerificationHistoryItem]
    human_reviews: List[HRChallengeResponse]
    feedbacks: List[FeedbackResponse]
