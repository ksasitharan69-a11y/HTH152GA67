from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_candidate
from app.database.models import (
    User, Company, Vacancy, VacancyStatus, Application,
    CandidateProfile, ApplicationStatus
)
from app.schemas.company import PublicCompanyResponse
from app.schemas.vacancy import PublicVacancyResponse
from app.schemas.application import (
    CandidateProfileResponse, CandidateProfileUpdate,
    ApplicationResponse, ApplicationDetailResponse
)
from app.schemas.ai import FeedbackResponse
from app.services.resume_service import resume_service
from app.services.application_service import application_service

router = APIRouter(tags=["Candidate & Public Operations"])

# -------------------------------------------------------------
# Public Company & Vacancy Browsing
# -------------------------------------------------------------

@router.get(
    "/companies",
    response_model=List[PublicCompanyResponse],
    summary="List Active Companies",
    description="Returns all active companies open for job applications (DB sourced, not hardcoded)."
)
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).filter(Company.is_active == True).all()

@router.get(
    "/companies/{company_id}/vacancies",
    response_model=List[PublicVacancyResponse],
    summary="List Published Vacancies for Company",
    description="Returns only PUBLISHED vacancies for the specified company. Draft and closed jobs are omitted."
)
def list_company_published_vacancies(
    company_id: int,
    db: Session = Depends(get_db)
):
    company = db.query(Company).filter(Company.id == company_id, Company.is_active == True).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or inactive.")

    vacancies = db.query(Vacancy).filter(
        Vacancy.company_id == company_id,
        Vacancy.status == VacancyStatus.PUBLISHED
    ).all()

    results = []
    for v in vacancies:
        results.append(PublicVacancyResponse(
            id=v.id,
            company_id=v.company_id,
            department_id=v.department_id,
            title=v.title,
            description=v.description,
            required_experience=v.required_experience,
            education=v.education,
            required_skills=v.required_skills,
            preferred_skills=v.preferred_skills,
            other_requirements=v.other_requirements,
            status=v.status,
            created_at=v.created_at,
            company_name=company.name,
            department_name=v.department.name if v.department else None
        ))
    return results

# -------------------------------------------------------------
# Candidate Profile
# -------------------------------------------------------------

@router.get(
    "/candidate/profile",
    response_model=CandidateProfileResponse,
    summary="Get Candidate Profile",
    description="Returns the profile information for the authenticated candidate."
)
def get_candidate_profile(current_candidate: User = Depends(get_current_candidate)):
    cp = current_candidate.candidate_profile_instance
    return CandidateProfileResponse(
        id=cp.id,
        user_id=cp.user_id,
        name=cp.name,
        github_url=cp.github_url,
        linkedin_url=cp.linkedin_url,
        email=current_candidate.email,
        created_at=cp.created_at
    )

@router.put(
    "/candidate/profile",
    response_model=CandidateProfileResponse,
    summary="Update Candidate Profile",
    description="Updates GitHub, LinkedIn, or personal name for the authenticated candidate."
)
def update_candidate_profile(
    payload: CandidateProfileUpdate,
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    cp = current_candidate.candidate_profile_instance
    if payload.name:
        cp.name = payload.name.strip()
    if payload.github_url is not None:
        cp.github_url = payload.github_url.strip() if payload.github_url else None
    if payload.linkedin_url is not None:
        cp.linkedin_url = payload.linkedin_url.strip() if payload.linkedin_url else None

    db.commit()
    db.refresh(cp)

    return CandidateProfileResponse(
        id=cp.id,
        user_id=cp.user_id,
        name=cp.name,
        github_url=cp.github_url,
        linkedin_url=cp.linkedin_url,
        email=current_candidate.email,
        created_at=cp.created_at
    )

# -------------------------------------------------------------
# Application & Resume Upload
# -------------------------------------------------------------

@router.post(
    "/candidate/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for Vacancy with Resume Upload",
    description="Uploads a PDF/DOCX resume, extracts text, creates the application, and triggers the AI matching pipeline."
)
async def apply_for_vacancy(
    vacancy_id: int = Form(...),
    resume_file: UploadFile = File(...),
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    candidate_profile = current_candidate.candidate_profile_instance

    # 1. Verify vacancy exists and is PUBLISHED
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found.")
    if vacancy.status != VacancyStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Applications are only accepted for PUBLISHED vacancies."
        )

    # 2. Check duplicate application
    existing_app = db.query(Application).filter(
        Application.vacancy_id == vacancy_id,
        Application.candidate_id == candidate_profile.id
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted an application for this vacancy."
        )

    # 3. Store resume and extract text
    stored_path, orig_filename, mime_type, extracted_text = await resume_service.process_resume_upload(resume_file)

    # 4. Create Application record
    new_app = Application(
        vacancy_id=vacancy.id,
        candidate_id=candidate_profile.id,
        resume_file_path=stored_path,
        resume_filename=orig_filename,
        resume_mime_type=mime_type,
        extracted_resume_text=extracted_text,
        status=ApplicationStatus.APPLIED
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # 5. Trigger AI Analysis Pipeline synchronously for MVP responsiveness
    try:
        await application_service.run_ai_analysis_pipeline(new_app.id, db)
        db.refresh(new_app)
    except Exception as e:
        # AI analysis error does not fail application upload; application remains APPLIED
        pass

    return ApplicationResponse(
        id=new_app.id,
        vacancy_id=new_app.vacancy_id,
        candidate_id=new_app.candidate_id,
        status=new_app.status,
        applied_at=new_app.applied_at,
        updated_at=new_app.updated_at,
        resume_filename=new_app.resume_filename,
        vacancy_title=vacancy.title,
        company_name=vacancy.company.name if vacancy.company else None,
        candidate_name=candidate_profile.name,
        has_analysis=len(new_app.match_results) > 0
    )

@router.get(
    "/candidate/applications",
    response_model=List[ApplicationResponse],
    summary="Track Candidate's Own Applications",
    description="Returns all applications submitted by the authenticated candidate."
)
def list_candidate_applications(
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    candidate_profile = current_candidate.candidate_profile_instance
    apps = db.query(Application).filter(Application.candidate_id == candidate_profile.id).order_by(Application.applied_at.desc()).all()
    results = []
    for a in apps:
        results.append(ApplicationResponse(
            id=a.id,
            vacancy_id=a.vacancy_id,
            candidate_id=a.candidate_id,
            status=a.status,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            resume_filename=a.resume_filename,
            vacancy_title=a.vacancy.title if a.vacancy else None,
            company_name=a.vacancy.company.name if a.vacancy and a.vacancy.company else None,
            candidate_name=candidate_profile.name,
            has_analysis=len(a.match_results) > 0
        ))
    return results

@router.get(
    "/candidate/applications/{application_id}",
    response_model=ApplicationDetailResponse,
    summary="Get Specific Application Details",
    description="Returns application details. Enforces that the application belongs strictly to the authenticated candidate."
)
def get_candidate_application_detail(
    application_id: int,
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    candidate_profile = current_candidate.candidate_profile_instance
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.candidate_id == candidate_profile.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or unauthorized."
        )

    text_preview = app.extracted_resume_text[:400] + "..." if app.extracted_resume_text else None

    return ApplicationDetailResponse(
        id=app.id,
        vacancy_id=app.vacancy_id,
        candidate_id=app.candidate_id,
        status=app.status,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        resume_filename=app.resume_filename,
        resume_mime_type=app.resume_mime_type,
        extracted_text_preview=text_preview,
        candidate_name=candidate_profile.name,
        candidate_email=current_candidate.email,
        candidate_github=candidate_profile.github_url,
        candidate_linkedin=candidate_profile.linkedin_url,
        vacancy_title=app.vacancy.title if app.vacancy else None,
        company_name=app.vacancy.company.name if app.vacancy and app.vacancy.company else None
    )

@router.get(
    "/candidate/applications/{application_id}/feedback",
    response_model=List[FeedbackResponse],
    summary="Get Application Feedback",
    description="Returns all constructive feedback provided to the candidate for this application."
)
def get_application_feedback(
    application_id: int,
    current_candidate: User = Depends(get_current_candidate),
    db: Session = Depends(get_db)
):
    candidate_profile = current_candidate.candidate_profile_instance
    app = db.query(Application).filter(
        Application.id == application_id,
        Application.candidate_id == candidate_profile.id
    ).first()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found or unauthorized."
        )

    return [FeedbackResponse.model_validate(fb) for fb in app.feedbacks]
