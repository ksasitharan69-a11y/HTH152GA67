from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_hr
from app.database.models import (
    User, Vacancy, VacancyStatus, JobRequirement, Application,
    ApplicationStatus, ApplicationFeedback, MatchResult
)
from app.schemas.hr import HRProfileResponse, HRDashboardResponse, RecentApplicationItem
from app.schemas.vacancy import VacancyCreate, VacancyResponse, JobRequirementResponse
from app.schemas.application import (
    ApplicationResponse, ApplicationStatusUpdateRequest, ApplicationDetailResponse
)
from app.schemas.ai import (
    FinalAnalysisResponse, HRChallengeRequest, HRChallengeResponse,
    FeedbackCreateRequest, FeedbackResponse
)
from app.services.verification_service import verification_service
from app.ai.final_analyzer import final_analyzer
from app.ai.jd_analyzer import jd_analyzer

router = APIRouter(prefix="/hr", tags=["HR Operations"])

# -------------------------------------------------------------
# Profile & Dashboard
# -------------------------------------------------------------

@router.get(
    "/profile",
    response_model=HRProfileResponse,
    summary="Get HR Profile",
    description="Returns profile information for the authenticated HR user."
)
def get_hr_profile(current_hr: User = Depends(get_current_hr)):
    profile = current_hr.hr_profile_instance
    return HRProfileResponse(
        id=profile.id,
        name=profile.name,
        email=current_hr.email,
        company={"id": profile.company.id, "name": profile.company.name},
        department={"id": profile.department.id, "name": profile.department.name}
    )

@router.get(
    "/dashboard",
    response_model=HRDashboardResponse,
    summary="Get HR Dashboard Metrics",
    description="Returns aggregate metrics: active vacancies, total applicants, and recent applications."
)
def get_hr_dashboard(
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    company_id = profile.company_id

    # Active vacancies count
    active_vacancies_count = db.query(Vacancy).filter(
        Vacancy.company_id == company_id,
        Vacancy.status == VacancyStatus.PUBLISHED
    ).count()

    # Total applicants across company's vacancies
    total_applicants_count = db.query(Application).join(Vacancy).filter(
        Vacancy.company_id == company_id
    ).count()

    # Recent applications
    recent_apps = db.query(Application).join(Vacancy).filter(
        Vacancy.company_id == company_id
    ).order_by(Application.applied_at.desc()).limit(10).all()

    recent_items = [
        RecentApplicationItem(
            application_id=app.id,
            candidate_name=app.candidate.name,
            vacancy_title=app.vacancy.title,
            status=app.status.value,
            applied_at=app.applied_at
        ) for app in recent_apps
    ]

    return HRDashboardResponse(
        company_name=profile.company.name,
        department_name=profile.department.name,
        active_vacancies_count=active_vacancies_count,
        total_applicants_count=total_applicants_count,
        recent_applications=recent_items
    )

# -------------------------------------------------------------
# Vacancy Management
# -------------------------------------------------------------

@router.post(
    "/vacancies",
    response_model=VacancyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Job Vacancy",
    description="Creates a new job vacancy and automatically extracts initial structured requirements."
)
async def create_vacancy(
    payload: VacancyCreate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    
    vacancy = Vacancy(
        company_id=profile.company_id,
        department_id=payload.department_id,
        created_by_hr_id=profile.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        required_experience=payload.required_experience.strip(),
        education=payload.education.strip(),
        required_skills=payload.required_skills,
        preferred_skills=payload.preferred_skills,
        other_requirements=payload.other_requirements,
        status=VacancyStatus.DRAFT
    )
    db.add(vacancy)
    db.flush()

    # Automatically extract and persist structured requirements
    jd_analysis = await jd_analyzer.analyze(
        description=vacancy.description,
        title=vacancy.title,
        required_skills=vacancy.required_skills,
        preferred_skills=vacancy.preferred_skills,
        required_experience=vacancy.required_experience,
        education=vacancy.education
    )
    for req in jd_analysis.requirements:
        db_req = JobRequirement(
            vacancy_id=vacancy.id,
            requirement_text=req.requirement,
            requirement_type=req.type,
            importance=req.importance
        )
        db.add(db_req)

    db.commit()
    db.refresh(vacancy)

    return VacancyResponse(
        id=vacancy.id,
        company_id=vacancy.company_id,
        department_id=vacancy.department_id,
        created_by_hr_id=vacancy.created_by_hr_id,
        title=vacancy.title,
        description=vacancy.description,
        required_experience=vacancy.required_experience,
        education=vacancy.education,
        required_skills=vacancy.required_skills,
        preferred_skills=vacancy.preferred_skills,
        other_requirements=vacancy.other_requirements,
        status=vacancy.status,
        created_at=vacancy.created_at,
        updated_at=vacancy.updated_at,
        company_name=profile.company.name,
        department_name=vacancy.department.name if vacancy.department else None,
        requirements=[
            JobRequirementResponse(
                id=r.id,
                vacancy_id=r.vacancy_id,
                requirement_text=r.requirement_text,
                requirement_type=r.requirement_type,
                importance=r.importance,
                created_at=r.created_at
            ) for r in vacancy.requirements
        ]
    )

@router.post(
    "/vacancies/{vacancy_id}/publish",
    response_model=VacancyResponse,
    summary="Publish Vacancy",
    description="Transitions a vacancy status from DRAFT to PUBLISHED."
)
def publish_vacancy(
    vacancy_id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    vacancy = db.query(Vacancy).filter(
        Vacancy.id == vacancy_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found in your company.")

    vacancy.status = VacancyStatus.PUBLISHED
    db.commit()
    db.refresh(vacancy)

    return VacancyResponse(
        id=vacancy.id,
        company_id=vacancy.company_id,
        department_id=vacancy.department_id,
        created_by_hr_id=vacancy.created_by_hr_id,
        title=vacancy.title,
        description=vacancy.description,
        required_experience=vacancy.required_experience,
        education=vacancy.education,
        required_skills=vacancy.required_skills,
        preferred_skills=vacancy.preferred_skills,
        other_requirements=vacancy.other_requirements,
        status=vacancy.status,
        created_at=vacancy.created_at,
        updated_at=vacancy.updated_at,
        company_name=profile.company.name,
        department_name=vacancy.department.name if vacancy.department else None,
        requirements=[
            JobRequirementResponse(
                id=r.id,
                vacancy_id=r.vacancy_id,
                requirement_text=r.requirement_text,
                requirement_type=r.requirement_type,
                importance=r.importance,
                created_at=r.created_at
            ) for r in vacancy.requirements
        ]
    )

@router.get(
    "/vacancies",
    response_model=List[VacancyResponse],
    summary="List Company Vacancies",
    description="Returns all vacancies created within the HR's company."
)
def list_company_vacancies(
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    vacancies = db.query(Vacancy).filter(Vacancy.company_id == profile.company_id).all()
    results = []
    for v in vacancies:
        results.append(VacancyResponse(
            id=v.id,
            company_id=v.company_id,
            department_id=v.department_id,
            created_by_hr_id=v.created_by_hr_id,
            title=v.title,
            description=v.description,
            required_experience=v.required_experience,
            education=v.education,
            required_skills=v.required_skills,
            preferred_skills=v.preferred_skills,
            other_requirements=v.other_requirements,
            status=v.status,
            created_at=v.created_at,
            updated_at=v.updated_at,
            company_name=profile.company.name,
            department_name=v.department.name if v.department else None,
            requirements=[
                JobRequirementResponse(
                    id=r.id,
                    vacancy_id=r.vacancy_id,
                    requirement_text=r.requirement_text,
                    requirement_type=r.requirement_type,
                    importance=r.importance,
                    created_at=r.created_at
                ) for r in v.requirements
            ]
        ))
    return results

@router.get(
    "/vacancies/{vacancy_id}",
    response_model=VacancyResponse,
    summary="Get Vacancy Details",
    description="Returns detailed vacancy info including structured requirements."
)
def get_vacancy_detail(
    vacancy_id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    v = db.query(Vacancy).filter(
        Vacancy.id == vacancy_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found in your company.")

    return VacancyResponse(
        id=v.id,
        company_id=v.company_id,
        department_id=v.department_id,
        created_by_hr_id=v.created_by_hr_id,
        title=v.title,
        description=v.description,
        required_experience=v.required_experience,
        education=v.education,
        required_skills=v.required_skills,
        preferred_skills=v.preferred_skills,
        other_requirements=v.other_requirements,
        status=v.status,
        created_at=v.created_at,
        updated_at=v.updated_at,
        company_name=profile.company.name,
        department_name=v.department.name if v.department else None,
        requirements=[
            JobRequirementResponse(
                id=r.id,
                vacancy_id=r.vacancy_id,
                requirement_text=r.requirement_text,
                requirement_type=r.requirement_type,
                importance=r.importance,
                created_at=r.created_at
            ) for r in v.requirements
        ]
    )

# -------------------------------------------------------------
# Applications & Review
# -------------------------------------------------------------

@router.get(
    "/vacancies/{vacancy_id}/applications",
    response_model=List[ApplicationResponse],
    summary="List Applicants for Vacancy",
    description="Returns candidates who applied to the specified vacancy."
)
def get_vacancy_applications(
    vacancy_id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    vacancy = db.query(Vacancy).filter(
        Vacancy.id == vacancy_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found in your company.")

    apps = db.query(Application).filter(Application.vacancy_id == vacancy.id).all()
    results = []
    for a in apps:
        has_analysis = len(a.match_results) > 0
        results.append(ApplicationResponse(
            id=a.id,
            vacancy_id=a.vacancy_id,
            candidate_id=a.candidate_id,
            status=a.status,
            applied_at=a.applied_at,
            updated_at=a.updated_at,
            resume_filename=a.resume_filename,
            vacancy_title=vacancy.title,
            company_name=profile.company.name,
            candidate_name=a.candidate.name,
            has_analysis=has_analysis
        ))
    return results

@router.get(
    "/applications/{application_id}/analysis",
    response_model=FinalAnalysisResponse,
    summary="HR AI Review & Explainability Analysis",
    description="Returns comprehensive AI match analysis, evidence proof, verification audit, and human overrides."
)
def get_application_analysis(
    application_id: int,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    app = db.query(Application).join(Vacancy).filter(
        Application.id == application_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized.")

    return final_analyzer.generate_final_report(app)

@router.post(
    "/applications/{application_id}/challenge",
    response_model=HRChallengeResponse,
    summary="Human HR Challenge / Override",
    description="Record an HR human override with justification without erasing the original AI decision."
)
def challenge_decision(
    application_id: int,
    payload: HRChallengeRequest,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    app = db.query(Application).join(Vacancy).filter(
        Application.id == application_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized.")

    challenge = verification_service.record_hr_challenge(
        application_id=app.id,
        requirement_id=payload.requirement_id,
        reason=payload.reason,
        new_status=payload.new_status,
        hr_user=current_hr,
        db=db
    )
    return challenge

@router.put(
    "/applications/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update Application Status",
    description="Update application stage (e.g. SHORTLISTED, SELECTED, NOT_SELECTED)."
)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdateRequest,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    app = db.query(Application).join(Vacancy).filter(
        Application.id == application_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized.")

    app.status = payload.status
    db.commit()
    db.refresh(app)

    return ApplicationResponse(
        id=app.id,
        vacancy_id=app.vacancy_id,
        candidate_id=app.candidate_id,
        status=app.status,
        applied_at=app.applied_at,
        updated_at=app.updated_at,
        resume_filename=app.resume_filename,
        vacancy_title=app.vacancy.title,
        company_name=profile.company.name,
        candidate_name=app.candidate.name,
        has_analysis=len(app.match_results) > 0
    )

@router.post(
    "/applications/{application_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provide Candidate Feedback",
    description="Attaches constructive feedback to the candidate's application."
)
def add_candidate_feedback(
    application_id: int,
    payload: FeedbackCreateRequest,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    profile = current_hr.hr_profile_instance
    app = db.query(Application).join(Vacancy).filter(
        Application.id == application_id,
        Vacancy.company_id == profile.company_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized.")

    fb = ApplicationFeedback(
        application_id=app.id,
        feedback_type=payload.feedback_type,
        content=payload.content.strip(),
        created_by=f"HR ({profile.name})"
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb
