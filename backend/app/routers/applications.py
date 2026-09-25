from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user, get_current_candidate
from app.database.models import User, UserRole, Application, Vacancy, CandidateProfile
from app.schemas.application import ApplicationResponse, ApplicationDetailResponse
from app.schemas.vacancy import JobRequirementResponse
from app.schemas.ai import RequirementMatchItem, EvidenceResponseItem
from app.routers.candidate import apply_for_vacancy as candidate_apply

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Job Application",
    description="Submits a candidate resume application to a vacancy."
)
async def submit_application(
    vacancy_id: int = Form(...),
    resume: Optional[UploadFile] = File(None),
    resume_file: Optional[UploadFile] = File(None),
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    target_file = resume or resume_file
    if not target_file:
        raise HTTPException(status_code=400, detail="Resume file is required.")
    return await candidate_apply(vacancy_id, target_file, current_candidate, db)

@router.get(
    "",
    response_model=List[ApplicationResponse],
    summary="List Applications",
    description="Lists applications for the current candidate, or company applicants for HR."
)
def list_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.CANDIDATE:
        candidate = current_user.candidate_profile
        if not candidate:
            return []
        apps = db.query(Application).filter(Application.candidate_id == candidate.id).all()
    elif current_user.role in [UserRole.HR, UserRole.CEO]:
        company_id = current_user.company.id if current_user.company else current_user.hr_profile.company_id
        apps = db.query(Application).join(Vacancy).filter(Vacancy.company_id == company_id).all()
    else:
        return []

    return [
        ApplicationResponse(
            id=a.id,
            vacancy_id=a.vacancy_id,
            candidate_id=a.candidate_id,
            status=a.status,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            resume_filename=a.resume_filename,
            vacancy_title=a.vacancy.title if a.vacancy else "Vacancy",
            company_name=a.vacancy.company.name if a.vacancy and a.vacancy.company else "Company",
            candidate_name=a.candidate.name if a.candidate else "Candidate",
            has_analysis=len(a.match_results) > 0
        )
        for a in apps
    ]

@router.get(
    "/{application_id}",
    response_model=ApplicationDetailResponse,
    summary="Get Application Detail",
    description="Fetches full application details, requirements, and match results."
)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Access control
    if current_user.role == UserRole.CANDIDATE:
        if not current_user.candidate_profile or app.candidate_id != current_user.candidate_profile.id:
            raise HTTPException(status_code=403, detail="Unauthorized.")
    elif current_user.role == UserRole.HR:
        if not current_user.hr_profile or app.vacancy.company_id != current_user.hr_profile.company_id:
            raise HTTPException(status_code=403, detail="Unauthorized.")
    elif current_user.role == UserRole.CEO:
        if not current_user.company or app.vacancy.company_id != current_user.company.id:
            raise HTTPException(status_code=403, detail="Unauthorized.")

    # Map match results
    ev_by_req = {}
    for ev in app.evidences:
        ev_by_req.setdefault(ev.requirement_id, []).append(EvidenceResponseItem(
            id=ev.id,
            source_type=ev.source_type,
            source_text=ev.source_text,
            source_location=ev.source_location,
            confidence=ev.confidence
        ))

    match_items = []
    for mr in app.match_results:
        req = mr.requirement
        match_items.append(RequirementMatchItem(
            requirement_id=req.id,
            requirement=req.requirement_text,
            type=req.requirement_type,
            importance=req.importance,
            status=mr.status,
            evidence=ev_by_req.get(req.id, []),
            reasoning=mr.reasoning,
            confidence=mr.confidence
        ))

    return ApplicationDetailResponse(
        id=app.id,
        vacancy_id=app.vacancy_id,
        candidate_id=app.candidate_id,
        status=app.status,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        resume_filename=app.resume_filename,
        vacancy_title=app.vacancy.title,
        company_name=app.vacancy.company.name,
        candidate_name=app.candidate.name,
        candidate_email=app.candidate.user.email,
        candidate_github=app.candidate.github_url,
        candidate_linkedin=app.candidate.linkedin_url,
        match_results=match_items
    )
