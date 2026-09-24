from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.dependencies import get_current_ceo
from app.database.models import User, UserRole, Company, Department, HRProfile
from app.core.security import get_password_hash
from app.schemas.company import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse, CompanyResponse
)
from app.schemas.hr import HRCreateRequest, HRResponse

router = APIRouter(prefix="/ceo", tags=["CEO Operations"])

# -------------------------------------------------------------
# Company Details
# -------------------------------------------------------------

@router.get(
    "/company",
    response_model=CompanyResponse,
    summary="Get CEO's Company Profile",
    description="Returns company information belonging to the authenticated CEO."
)
def get_company(
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    return current_ceo.company_instance

# -------------------------------------------------------------
# Department Management
# -------------------------------------------------------------

@router.post(
    "/departments",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Department",
    description="Creates a new department within the CEO's company."
)
def create_department(
    payload: DepartmentCreate,
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    name_clean = payload.name.strip()

    # Check for duplicate department name within the same company
    existing = db.query(Department).filter(
        Department.company_id == company.id,
        Department.name.ilike(name_clean)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department '{name_clean}' already exists in your company."
        )

    dept = Department(
        company_id=company.id,
        name=name_clean
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.get(
    "/departments",
    response_model=List[DepartmentResponse],
    summary="List Departments",
    description="Returns all departments belonging to the authenticated CEO's company."
)
def list_departments(
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    return db.query(Department).filter(Department.company_id == company.id).all()

@router.put(
    "/departments/{department_id}",
    response_model=DepartmentResponse,
    summary="Update Department",
    description="Updates a department belonging to the authenticated CEO's company."
)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    dept = db.query(Department).filter(
        Department.id == department_id,
        Department.company_id == company.id
    ).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found in your company."
        )

    name_clean = payload.name.strip()
    existing = db.query(Department).filter(
        Department.company_id == company.id,
        Department.name.ilike(name_clean),
        Department.id != department_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Another department named '{name_clean}' already exists."
        )

    dept.name = name_clean
    db.commit()
    db.refresh(dept)
    return dept

@router.delete(
    "/departments/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Department",
    description="Deletes a department from the CEO's company."
)
def delete_department(
    department_id: int,
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    dept = db.query(Department).filter(
        Department.id == department_id,
        Department.company_id == company.id
    ).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found in your company."
        )

    db.delete(dept)
    db.commit()
    return None

# -------------------------------------------------------------
# HR Account Management
# -------------------------------------------------------------

@router.post(
    "/hr",
    response_model=HRResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create HR Account",
    description="Creates a new HR account assigned to a department in the CEO's company."
)
def create_hr(
    payload: HRCreateRequest,
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    email_clean = payload.email.strip().lower()

    # Verify email uniqueness
    existing_user = db.query(User).filter(User.email == email_clean).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Verify department belongs to CEO's company
    dept = db.query(Department).filter(
        Department.id == payload.department_id,
        Department.company_id == company.id
    ).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified department does not belong to your company."
        )

    # Create User account with HR role
    hr_user = User(
        email=email_clean,
        password_hash=get_password_hash(payload.password),
        role=UserRole.HR,
        is_email_verified=True,  # HR created by CEO is auto-verified
        is_active=True
    )
    db.add(hr_user)
    db.flush()

    # Create HR Profile
    hr_profile = HRProfile(
        user_id=hr_user.id,
        company_id=company.id,
        department_id=dept.id,
        name=payload.name.strip()
    )
    db.add(hr_profile)
    db.commit()
    db.refresh(hr_profile)

    return HRResponse(
        id=hr_profile.id,
        user_id=hr_user.id,
        company_id=company.id,
        department_id=dept.id,
        name=hr_profile.name,
        email=hr_user.email,
        department_name=dept.name,
        company_name=company.name,
        created_at=hr_profile.created_at
    )

@router.get(
    "/hr",
    response_model=List[HRResponse],
    summary="List HR Accounts",
    description="Returns all HR accounts belonging to the authenticated CEO's company."
)
def list_hr_accounts(
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    hrs = db.query(HRProfile).filter(HRProfile.company_id == company.id).all()
    results = []
    for h in hrs:
        results.append(HRResponse(
            id=h.id,
            user_id=h.user_id,
            company_id=h.company_id,
            department_id=h.department_id,
            name=h.name,
            email=h.user.email,
            department_name=h.department.name if h.department else None,
            company_name=company.name,
            created_at=h.created_at
        ))
    return results

@router.get(
    "/hr/{hr_id}",
    response_model=HRResponse,
    summary="Get HR Account Details",
    description="Fetches details of a specific HR user belonging to the CEO's company."
)
def get_hr_account(
    hr_id: int,
    current_ceo: User = Depends(get_current_ceo),
    db: Session = Depends(get_db)
):
    company = current_ceo.company_instance
    hr_profile = db.query(HRProfile).filter(
        HRProfile.id == hr_id,
        HRProfile.company_id == company.id
    ).first()
    if not hr_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR profile not found in your company."
        )

    return HRResponse(
        id=hr_profile.id,
        user_id=hr_profile.user_id,
        company_id=company.id,
        department_id=hr_profile.department_id,
        name=hr_profile.name,
        email=hr_profile.user.email,
        department_name=hr_profile.department.name if hr_profile.department else None,
        company_name=company.name,
        created_at=hr_profile.created_at
    )
