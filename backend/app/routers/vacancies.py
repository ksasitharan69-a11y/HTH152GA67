from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user, get_current_hr
from app.database.models import User, UserRole, Vacancy, VacancyStatus
from app.schemas.vacancy import VacancyCreate, VacancyResponse, JobRequirementResponse
from app.routers.hr import create_vacancy as hr_create_vacancy, list_company_vacancies

router = APIRouter(prefix="/vacancies", tags=["Vacancies Hub"])

@router.post(
    "",
    response_model=VacancyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New Vacancy",
    description="Allows HR to define and publish new job vacancies."
)
async def create_vacancy(
    payload: VacancyCreate,
    current_hr: User = Depends(get_current_hr),
    db: Session = Depends(get_db)
):
    return await hr_create_vacancy(payload, current_hr, db)

@router.get(
    "",
    response_model=List[VacancyResponse],
    summary="List Vacancies",
    description="Returns published vacancies for candidates, or company vacancies for HR."
)
def list_vacancies(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if current_user and current_user.role in [UserRole.HR, UserRole.CEO]:
        company_id = current_user.company.id if current_user.company else current_user.hr_profile.company_id
        vacancies = db.query(Vacancy).filter(Vacancy.company_id == company_id).all()
    else:
        vacancies = db.query(Vacancy).filter(Vacancy.status == VacancyStatus.PUBLISHED).all()

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
            company_name=v.company.name if v.company else "Unknown Company",
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
    "/{vacancy_id}",
    response_model=VacancyResponse,
    summary="Get Vacancy Details",
    description="Retrieves a specific vacancy by ID."
)
def get_vacancy(
    vacancy_id: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    v = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vacancy not found.")

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
        company_name=v.company.name if v.company else "Unknown Company",
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
