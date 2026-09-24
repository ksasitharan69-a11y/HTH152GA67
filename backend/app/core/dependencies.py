from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.core.security import decode_access_token
from app.database.models import User, UserRole, Company, HRProfile, CandidateProfile

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validate JWT token and return the current user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing subject identifier.",
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
    return user

def get_current_ceo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Enforce that the authenticated user is a verified CEO."""
    if current_user.role != UserRole.CEO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to CEO role.",
        )
    if not current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified before accessing CEO management endpoints.",
        )
    # Ensure company exists
    company = db.query(Company).filter(Company.ceo_user_id == current_user.id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company associated with this CEO account.",
        )
    # Attach company for easy reference
    current_user.company_instance = company
    return current_user

def get_current_hr(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Enforce that the authenticated user is an active HR account."""
    if current_user.role != UserRole.HR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to HR role.",
        )
    hr_profile = db.query(HRProfile).filter(HRProfile.user_id == current_user.id).first()
    if not hr_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="HR profile not found.",
        )
    current_user.hr_profile_instance = hr_profile
    return current_user

def get_current_candidate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Enforce that the authenticated user is a verified Candidate."""
    if current_user.role != UserRole.CANDIDATE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Candidate role.",
        )
    if not current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address must be verified before proceeding.",
        )
    candidate_profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not candidate_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found.",
        )
    current_user.candidate_profile_instance = candidate_profile
    return current_user
