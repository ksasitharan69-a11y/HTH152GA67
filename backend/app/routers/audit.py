import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user, get_current_hr
from app.database.models import (
    User, UserRole, Application, MatchResult, Evidence,
    VerificationHistory, HRChallenge, MatchStatus, Vacancy
)
from app.schemas.audit import (
    AuditDefenseQueryRequest, AuditDefenseQueryResponse,
    AuditOverrideRequest, AuditOverrideResponse
)
from app.schemas.ai import FinalAnalysisResponse
from app.services.audit_defense_service import audit_defense_service
from app.services.verification_service import verification_service
from app.ai.final_analyzer import final_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit", tags=["Explainability & Audit Defense"])

def check_recruiter_access(application: Application, user: User):
    """Enforces that only HR or CEO of the respective company can access audit records."""
    if user.role == UserRole.HR:
        hr_prof = user.hr_profile
        if not hr_prof or application.vacancy.company_id != hr_prof.company_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to company audit trail.")
    elif user.role == UserRole.CEO:
        if not user.company or application.vacancy.company_id != user.company.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to company audit trail.")
    else:
        raise HTTPException(status_code=403, detail="Recruiter or CEO authorization required.")

@router.get(
    "/{application_id}",
    response_model=FinalAnalysisResponse,
    summary="Get Application Audit Trail",
    description="Returns complete evidence graph, verified citations, verification history, and human overrides."
)
def get_audit_trail(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_recruiter_access(application, current_user)
    return final_analyzer.generate_final_report(application)

@router.post(
    "/{application_id}/override",
    response_model=AuditOverrideResponse,
    summary="Record Auditable Recruiter Override",
    description="Records a human recruiter override with justification, preserving original AI determinations."
)
def record_override(
    application_id: int,
    payload: AuditOverrideRequest,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_recruiter_access(application, current_hr)

    # Convert new_status to MatchStatus if valid
    target_match_status = None
    try:
        target_match_status = MatchStatus(payload.new_status.upper())
    except Exception:
        pass

    if payload.requirement_id:
        challenge = verification_service.record_hr_challenge(
            application_id=application.id,
            requirement_id=payload.requirement_id,
            reason=payload.reason,
            new_status=target_match_status,
            hr_user=current_hr,
            db=db
        )
    else:
        # Application-level override
        challenge = HRChallenge(
            application_id=application.id,
            requirement_id=None,
            hr_user_id=current_hr.id,
            original_status=payload.original_status,
            new_status=payload.new_status,
            reason=payload.reason
        )
        db.add(challenge)
        db.commit()
        db.refresh(challenge)

    return AuditOverrideResponse(
        id=challenge.id,
        application_id=challenge.application_id,
        requirement_id=challenge.requirement_id,
        original_status=challenge.original_status,
        new_status=challenge.new_status,
        reason=challenge.reason,
        hr_user_id=challenge.hr_user_id,
        created_at=challenge.created_at
    )

@router.post(
    "/{application_id}/ask",
    response_model=AuditDefenseQueryResponse,
    summary="Ask Audit Defense Agent",
    description="Asks a natural language audit or explainability question grounded strictly in application records, evidence, and overrides."
)
async def ask_audit_defense(
    application_id: int,
    payload: AuditDefenseQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_recruiter_access(application, current_user)

    result = await audit_defense_service.ask_audit_defense(
        application_id=application_id,
        question=payload.question,
        db=db
    )

    return AuditDefenseQueryResponse(
        application_id=result.application_id,
        question=result.question,
        answer=result.answer,
        referenced_requirements=result.referenced_requirements,
        referenced_evidence_ids=result.referenced_evidence_ids,
        referenced_overrides=result.referenced_overrides,
        assessment_finding=result.assessment_finding
    )
