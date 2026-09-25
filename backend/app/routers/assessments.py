import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.database.models import User, UserRole, Application, Assessment, AssessmentStatus, Vacancy
from app.schemas.assessment import (
    AssessmentResponse, AssessmentSubmitRequest, AssessmentResultResponse
)
from app.services.assessment_service import assessment_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assessments", tags=["Candidate Assessment & Skill Verification"])

def check_application_access(application: Application, user: User, db: Session):
    """Ensures candidate owns application or HR/CEO belongs to vacancy company."""
    if user.role == UserRole.CANDIDATE:
        if not user.candidate_profile or application.candidate_id != user.candidate_profile.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to application.")
    elif user.role == UserRole.HR:
        hr_prof = user.hr_profile
        if not hr_prof or application.vacancy.company_id != hr_prof.company_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to candidate application.")
    elif user.role == UserRole.CEO:
        if not user.company or application.vacancy.company_id != user.company.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to company application.")

@router.post(
    "/{application_id}/generate",
    response_model=AssessmentResponse,
    summary="Generate Candidate Assessment Challenge",
    description="Generates deep drill-down questions, production broken-code challenge, and answer key grounded in candidate resume and vacancy requirements."
)
def generate_assessment(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_access(application, current_user, db)

    assessment = assessment_service.generate_assessment_for_application(application_id, db)
    return AssessmentResponse(
        id=assessment.id,
        application_id=assessment.application_id,
        drill_down_questions=assessment.drill_down_questions,
        broken_code_snippet=assessment.broken_code_snippet,
        status=assessment.status.value,
        score=assessment.score,
        verdict=assessment.verdict,
        findings_breakdown=assessment.findings_breakdown,
        audit_justification=assessment.audit_justification,
        created_at=assessment.created_at,
        evaluated_at=assessment.evaluated_at
    )

@router.get(
    "/{application_id}",
    response_model=AssessmentResponse,
    summary="Get Assessment Challenge",
    description="Fetches the assessment challenge for the candidate without exposing internal answer keys."
)
def get_assessment(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_access(application, current_user, db)

    assessment = db.query(Assessment).filter(Assessment.application_id == application_id).first()
    if not assessment:
        # Auto-generate if not yet created
        assessment = assessment_service.generate_assessment_for_application(application_id, db)

    return AssessmentResponse(
        id=assessment.id,
        application_id=assessment.application_id,
        drill_down_questions=assessment.drill_down_questions,
        broken_code_snippet=assessment.broken_code_snippet,
        status=assessment.status.value,
        score=assessment.score,
        verdict=assessment.verdict,
        findings_breakdown=assessment.findings_breakdown,
        audit_justification=assessment.audit_justification,
        created_at=assessment.created_at,
        evaluated_at=assessment.evaluated_at
    )

@router.post(
    "/{application_id}/submit",
    response_model=AssessmentResultResponse,
    summary="Submit Assessment Answers & Grade Candidate",
    description="Submits candidate answers to drill-down questions and code review, performs rubric grading, and records final assessment verdict."
)
def submit_assessment(
    application_id: int,
    payload: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_access(application, current_user, db)

    candidate_answers = {
        "drill_down_responses": payload.drill_down_responses,
        "code_review_response": payload.code_review_response
    }

    evaluated = assessment_service.evaluate_candidate_submission(
        application_id=application_id,
        candidate_answers=candidate_answers,
        db=db
    )

    return AssessmentResultResponse(
        id=evaluated.id,
        application_id=evaluated.application_id,
        score=evaluated.score or 0,
        verdict=evaluated.verdict or "PENDING",
        status=evaluated.status.value,
        findings_breakdown=evaluated.findings_breakdown,
        audit_justification=evaluated.audit_justification,
        evaluated_at=evaluated.evaluated_at
    )

@router.get(
    "/{application_id}/result",
    response_model=AssessmentResultResponse,
    summary="Get Assessment Result & Findings",
    description="Retrieves the final graded assessment result, rubric score (0-100), and verdict."
)
def get_assessment_result(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_access(application, current_user, db)

    assessment = db.query(Assessment).filter(Assessment.application_id == application_id).first()
    if not assessment or assessment.status != AssessmentStatus.EVALUATED:
        raise HTTPException(status_code=404, detail="Assessment has not been submitted or evaluated yet.")

    return AssessmentResultResponse(
        id=assessment.id,
        application_id=assessment.application_id,
        score=assessment.score or 0,
        verdict=assessment.verdict or "PENDING",
        status=assessment.status.value,
        findings_breakdown=assessment.findings_breakdown,
        audit_justification=assessment.audit_justification,
        evaluated_at=assessment.evaluated_at
    )
