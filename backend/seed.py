"""
Optional development seed script for HireProof AI.
Generates clearly labeled demonstration data for quick local testing.
NOT required for normal backend operation.
"""
from datetime import datetime, timezone
from app.database.database import SessionLocal, init_db
from app.database.models import (
    User, UserRole, Company, Department, HRProfile, CandidateProfile,
    Vacancy, VacancyStatus, JobRequirement, RequirementType
)
from app.core.security import get_password_hash

def seed_demo_data():
    print("Initializing database tables...")
    init_db()
    db = SessionLocal()

    # Check if demo CEO already exists
    existing = db.query(User).filter(User.email == "ceo@hireproof.ai").first()
    if existing:
        print("Demo data already present. Skipping seed.")
        db.close()
        return

    print("Seeding demo CEO and Company...")
    ceo_user = User(
        email="ceo@hireproof.ai",
        password_hash=get_password_hash("HireProof2026!"),
        role=UserRole.CEO,
        is_email_verified=True,
        is_active=True
    )
    db.add(ceo_user)
    db.flush()

    company = Company(
        name="NovaSphere Technologies",
        ceo_user_id=ceo_user.id,
        is_active=True
    )
    db.add(company)
    db.flush()

    print("Seeding demo Departments...")
    dept_eng = Department(company_id=company.id, name="Cloud Engineering")
    dept_ai = Department(company_id=company.id, name="AI Research")
    db.add_all([dept_eng, dept_ai])
    db.flush()

    print("Seeding demo HR Account...")
    hr_user = User(
        email="hr@hireproof.ai",
        password_hash=get_password_hash("HireProof2026!"),
        role=UserRole.HR,
        is_email_verified=True,
        is_active=True
    )
    db.add(hr_user)
    db.flush()

    hr_profile = HRProfile(
        user_id=hr_user.id,
        company_id=company.id,
        department_id=dept_eng.id,
        name="Elena Rostova"
    )
    db.add(hr_profile)
    db.flush()

    print("Seeding demo Published Vacancy...")
    vacancy = Vacancy(
        company_id=company.id,
        department_id=dept_eng.id,
        created_by_hr_id=hr_profile.id,
        title="Senior Python Backend Architect",
        description="We are seeking an experienced Backend Architect to design mission-critical API platforms, microservices, and GenAI evidence verification pipelines.",
        required_experience="4+ years",
        education="B.S. or M.S. in Computer Science or related field",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        preferred_skills=["AWS", "Redis", "Kubernetes"],
        other_requirements="High concurrency design, distributed systems, clean testing practices",
        status=VacancyStatus.PUBLISHED
    )
    db.add(vacancy)
    db.flush()

    requirements = [
        JobRequirement(vacancy_id=vacancy.id, requirement_text="Python", requirement_type=RequirementType.SKILL, importance="HIGH"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="FastAPI", requirement_type=RequirementType.SKILL, importance="HIGH"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="PostgreSQL", requirement_type=RequirementType.SKILL, importance="HIGH"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="Docker", requirement_type=RequirementType.SKILL, importance="HIGH"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="AWS", requirement_type=RequirementType.SKILL, importance="MEDIUM"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="4+ years backend engineering experience", requirement_type=RequirementType.EXPERIENCE, importance="HIGH"),
        JobRequirement(vacancy_id=vacancy.id, requirement_text="Degree in Computer Science or equivalent", requirement_type=RequirementType.EDUCATION, importance="HIGH")
    ]
    db.add_all(requirements)

    print("Seeding demo Candidate...")
    cand_user = User(
        email="candidate@hireproof.ai",
        password_hash=get_password_hash("HireProof2026!"),
        role=UserRole.CANDIDATE,
        is_email_verified=True,
        is_active=True
    )
    db.add(cand_user)
    db.flush()

    cand_profile = CandidateProfile(
        user_id=cand_user.id,
        name="Alex Rivera",
        github_url="https://github.com/alexrivera-dev",
        linkedin_url="https://linkedin.com/in/alexrivera-tech"
    )
    db.add(cand_profile)

    db.commit()
    db.close()
    print("Demo seed complete!")
    print("Demo Accounts:")
    print("  CEO:       ceo@hireproof.ai       / HireProof2026!")
    print("  HR:        hr@hireproof.ai        / HireProof2026!")
    print("  Candidate: candidate@hireproof.ai / HireProof2026!")

if __name__ == "__main__":
    seed_demo_data()
