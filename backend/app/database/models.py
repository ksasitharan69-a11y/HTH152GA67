import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float,
    ForeignKey, Enum, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.database.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    CEO = "CEO"
    HR = "HR"
    CANDIDATE = "CANDIDATE"

class VacancyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"

class RequirementType(str, enum.Enum):
    SKILL = "SKILL"
    EXPERIENCE = "EXPERIENCE"
    EDUCATION = "EDUCATION"
    CERTIFICATION = "CERTIFICATION"
    PROJECT = "PROJECT"
    OTHER = "OTHER"

class RequirementImportance(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    MANDATORY = "MANDATORY"
    PREFERRED = "PREFERRED"

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
    ASSESSMENT = "ASSESSMENT"
    SHORTLISTED = "SHORTLISTED"
    SELECTED = "SELECTED"
    NOT_SELECTED = "NOT_SELECTED"

class EvidenceSourceType(str, enum.Enum):
    RESUME = "RESUME"
    PROJECT = "PROJECT"
    EXPERIENCE = "EXPERIENCE"
    EDUCATION = "EDUCATION"
    CERTIFICATION = "CERTIFICATION"
    PORTFOLIO = "PORTFOLIO"
    ASSESSMENT = "ASSESSMENT"
    AI_INTERVIEW = "AI_INTERVIEW"
    OTHER = "OTHER"

class MatchStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    PARTIAL = "PARTIAL"
    UNVERIFIED = "UNVERIFIED"
    GAP = "GAP"

class VerificationType(str, enum.Enum):
    AI_CHALLENGE = "AI_CHALLENGE"
    AI_INTERVIEW = "AI_INTERVIEW"
    EVIDENCE_UPLOAD = "EVIDENCE_UPLOAD"

class VerificationEvaluationResult(str, enum.Enum):
    STRONG_EVIDENCE = "STRONG_EVIDENCE"
    PARTIAL_EVIDENCE = "PARTIAL_EVIDENCE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"

# -------------------------------------------------------------
# User & Authentication Models
# -------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="ceo", uselist=False, cascade="all, delete-orphan")
    hr_profile = relationship("HRProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    candidate_profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    otps = relationship("EmailOTP", back_populates="user", cascade="all, delete-orphan")
    hr_challenges = relationship("HRChallenge", back_populates="hr_user")

class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="otps")

# -------------------------------------------------------------
# Company & Organization Models
# -------------------------------------------------------------

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    ceo_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    ceo = relationship("User", back_populates="company")
    departments = relationship("Department", back_populates="company", cascade="all, delete-orphan")
    hr_profiles = relationship("HRProfile", back_populates="company", cascade="all, delete-orphan")
    vacancies = relationship("Vacancy", back_populates="company", cascade="all, delete-orphan")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="departments")
    hr_profiles = relationship("HRProfile", back_populates="department")
    vacancies = relationship("Vacancy", back_populates="department")

    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_department_company_name"),
    )

class HRProfile(Base):
    __tablename__ = "hr_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="hr_profile")
    company = relationship("Company", back_populates="hr_profiles")
    department = relationship("Department", back_populates="hr_profiles")
    vacancies = relationship("Vacancy", back_populates="creator_hr")

# -------------------------------------------------------------
# Candidate Profile
# -------------------------------------------------------------

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    github_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    user = relationship("User", back_populates="candidate_profile")
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")

# -------------------------------------------------------------
# Vacancy & Job Requirements
# -------------------------------------------------------------

class Vacancy(Base):
    __tablename__ = "vacancies"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    created_by_hr_id = Column(Integer, ForeignKey("hr_profiles.id", ondelete="RESTRICT"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    required_experience = Column(String(255), nullable=False)
    education = Column(String(255), nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    preferred_skills = Column(JSON, nullable=False, default=list)
    other_requirements = Column(Text, nullable=True)
    status = Column(Enum(VacancyStatus), default=VacancyStatus.DRAFT, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="vacancies")
    department = relationship("Department", back_populates="vacancies")
    creator_hr = relationship("HRProfile", back_populates="vacancies")
    requirements = relationship("JobRequirement", back_populates="vacancy", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="vacancy", cascade="all, delete-orphan")

class JobRequirement(Base):
    __tablename__ = "job_requirements"

    id = Column(Integer, primary_key=True, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False)
    requirement_text = Column(String(500), nullable=False)
    requirement_type = Column(Enum(RequirementType), default=RequirementType.SKILL, nullable=False)
    importance = Column(String(50), default="HIGH", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    vacancy = relationship("Vacancy", back_populates="requirements")
    evidences = relationship("Evidence", back_populates="requirement", cascade="all, delete-orphan")
    match_results = relationship("MatchResult", back_populates="requirement", cascade="all, delete-orphan")
    verifications = relationship("VerificationHistory", back_populates="requirement", cascade="all, delete-orphan")
    challenges = relationship("HRChallenge", back_populates="requirement", cascade="all, delete-orphan")

# -------------------------------------------------------------
# Application & Evidence Models
# -------------------------------------------------------------

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    vacancy_id = Column(Integer, ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False)
    resume_file_path = Column(String(500), nullable=False)
    resume_filename = Column(String(255), nullable=False)
    resume_mime_type = Column(String(100), nullable=False)
    extracted_resume_text = Column(Text, nullable=True)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.APPLIED, nullable=False)
    applied_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    vacancy = relationship("Vacancy", back_populates="applications")
    candidate = relationship("CandidateProfile", back_populates="applications")
    match_results = relationship("MatchResult", back_populates="application", cascade="all, delete-orphan")
    evidences = relationship("Evidence", back_populates="application", cascade="all, delete-orphan")
    verifications = relationship("VerificationHistory", back_populates="application", cascade="all, delete-orphan")
    challenges = relationship("HRChallenge", back_populates="application", cascade="all, delete-orphan")
    feedbacks = relationship("ApplicationFeedback", back_populates="application", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("vacancy_id", "candidate_id", name="uq_application_vacancy_candidate"),
    )

class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(Enum(EvidenceSourceType), default=EvidenceSourceType.RESUME, nullable=False)
    source_text = Column(Text, nullable=False)
    source_location = Column(String(255), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="evidences")
    requirement = relationship("JobRequirement", back_populates="evidences")

class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum(MatchStatus), nullable=False)
    reasoning = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    application = relationship("Application", back_populates="match_results")
    requirement = relationship("JobRequirement", back_populates="match_results")

    __table_args__ = (
        UniqueConstraint("application_id", "requirement_id", name="uq_match_result_app_req"),
    )

class VerificationHistory(Base):
    __tablename__ = "verification_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    verification_type = Column(Enum(VerificationType), nullable=False)
    question = Column(Text, nullable=False)
    candidate_response = Column(Text, nullable=False)
    ai_result = Column(Enum(VerificationEvaluationResult), nullable=False)
    ai_reasoning = Column(Text, nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="verifications")
    requirement = relationship("JobRequirement", back_populates="verifications")

class HRChallenge(Base):
    __tablename__ = "hr_challenges"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("job_requirements.id", ondelete="CASCADE"), nullable=False)
    hr_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=True)
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="challenges")
    requirement = relationship("JobRequirement", back_populates="challenges")
    hr_user = relationship("User", back_populates="hr_challenges")

class ApplicationFeedback(Base):
    __tablename__ = "application_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    feedback_type = Column(String(50), default="HR", nullable=False)
    content = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="feedbacks")
