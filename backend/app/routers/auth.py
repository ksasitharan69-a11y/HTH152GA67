from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.auth import (
    CEORegisterRequest, CandidateRegisterRequest, VerifyEmailRequest,
    LoginRequest, TokenResponse, MessageResponse
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/ceo/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new CEO account and Company",
    description="Registers a CEO user along with their company. Sends OTP for email verification."
)
def register_ceo(payload: CEORegisterRequest, db: Session = Depends(get_db)):
    ceo_user, otp_code = auth_service.register_ceo(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        company_name=payload.company_name,
        db=db
    )
    return MessageResponse(
        message="CEO and Company registered successfully. Please verify your email using the OTP provided.",
        email=ceo_user.email,
        otp_preview=otp_code  # Provided for hackathon testing convenience
    )

@router.post(
    "/candidate/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new Candidate account",
    description="Registers a Candidate user and profile. Sends OTP for email verification."
)
def register_candidate(payload: CandidateRegisterRequest, db: Session = Depends(get_db)):
    candidate_user, otp_code = auth_service.register_candidate(
        email=payload.email,
        password=payload.password,
        name=payload.name,
        github_url=payload.github_url,
        linkedin_url=payload.linkedin_url,
        db=db
    )
    return MessageResponse(
        message="Candidate registered successfully. Please verify your email using the OTP provided.",
        email=candidate_user.email,
        otp_preview=otp_code  # Provided for hackathon testing convenience
    )

@router.post(
    "/verify-email",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify email using OTP",
    description="Validates OTP and marks user email as verified."
)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    auth_service.verify_email(email=payload.email, otp_code=payload.otp, db=db)
    return MessageResponse(
        message="Email successfully verified. You may now log in.",
        email=payload.email
    )

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login (CEO, HR, Candidate)",
    description="Authenticates credentials and returns a signed JWT access token with role permissions."
)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(email=payload.email, password=payload.password, db=db)
