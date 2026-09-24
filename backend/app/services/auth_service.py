from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.database.models import User, UserRole, Company, CandidateProfile, EmailOTP
from app.core.security import verify_password, get_password_hash, create_access_token, generate_otp
from app.core.config import settings

class AuthService:
    """Service handling registration, password verification, OTP generation, and JWT issuing."""

    @classmethod
    def register_ceo(
        cls,
        name: str,
        email: str,
        password: str,
        company_name: str,
        db: Session
    ) -> Tuple[User, str]:
        """Registers a new CEO user and company, generating an email verification OTP."""
        email_clean = email.strip().lower()

        # Check existing user
        existing_user = db.query(User).filter(User.email == email_clean).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        # Hash password
        hashed_password = get_password_hash(password)

        # Create CEO User
        ceo_user = User(
            email=email_clean,
            password_hash=hashed_password,
            role=UserRole.CEO,
            is_email_verified=False,
            is_active=True
        )
        db.add(ceo_user)
        db.flush()

        # Create Company
        company = Company(
            name=company_name.strip(),
            ceo_user_id=ceo_user.id,
            is_active=True
        )
        db.add(company)
        db.flush()

        # Generate & store OTP
        otp_code = generate_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        otp_entry = EmailOTP(
            user_id=ceo_user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False
        )
        db.add(otp_entry)
        db.commit()
        db.refresh(ceo_user)

        return ceo_user, otp_code

    @classmethod
    def register_candidate(
        cls,
        email: str,
        password: str,
        name: Optional[str],
        github_url: Optional[str],
        linkedin_url: Optional[str],
        db: Session
    ) -> Tuple[User, str]:
        """Registers a new Candidate user and candidate profile, generating an email verification OTP."""
        email_clean = email.strip().lower()

        existing_user = db.query(User).filter(User.email == email_clean).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        hashed_password = get_password_hash(password)

        candidate_user = User(
            email=email_clean,
            password_hash=hashed_password,
            role=UserRole.CANDIDATE,
            is_email_verified=False,
            is_active=True
        )
        db.add(candidate_user)
        db.flush()

        candidate_profile = CandidateProfile(
            user_id=candidate_user.id,
            name=name.strip() if name else email_clean.split("@")[0].capitalize(),
            github_url=github_url.strip() if github_url else None,
            linkedin_url=linkedin_url.strip() if linkedin_url else None
        )
        db.add(candidate_profile)
        db.flush()

        # Generate & store OTP
        otp_code = generate_otp(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        otp_entry = EmailOTP(
            user_id=candidate_user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False
        )
        db.add(otp_entry)
        db.commit()
        db.refresh(candidate_user)

        return candidate_user, otp_code

    @classmethod
    def verify_email(cls, email: str, otp_code: str, db: Session) -> bool:
        """Verifies OTP code and marks user email as verified."""
        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

        # Find valid OTP
        now = datetime.now(timezone.utc)
        otp_entry = db.query(EmailOTP).filter(
            EmailOTP.user_id == user.id,
            EmailOTP.otp_code == otp_code.strip(),
            EmailOTP.is_used == False
        ).order_by(EmailOTP.created_at.desc()).first()

        if not otp_entry:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code.")

        # Check expiry (make timezone-aware if needed)
        expires_at = otp_entry.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP code has expired.")

        # Mark OTP as used and user verified
        otp_entry.is_used = True
        user.is_email_verified = True
        db.commit()
        return True

    @classmethod
    def login(cls, email: str, password: str, db: Session) -> Dict[str, Any]:
        """Validates credentials, enforces role rules, and issues JWT access token."""
        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

        # Enforce email verification for CEO and Candidate (HR is created directly by verified CEO)
        if user.role in [UserRole.CEO, UserRole.CANDIDATE] and not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email is not verified. Please verify your email with the OTP sent to your inbox."
            )

        company_id = None
        company_name = None

        if user.role == UserRole.CEO and user.company:
            company_id = user.company.id
            company_name = user.company.name
        elif user.role == UserRole.HR and user.hr_profile:
            company_id = user.hr_profile.company_id
            company_name = user.hr_profile.company.name if user.hr_profile.company else None

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        }
        if company_id:
            token_data["company_id"] = company_id

        access_token = create_access_token(token_data)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": user.role,
            "user": user,
            "company_id": company_id,
            "company_name": company_name
        }

auth_service = AuthService()
