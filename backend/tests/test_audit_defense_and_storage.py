import io
import pytest
from app.ai.pii_shield import pii_shield
from app.services.resume_service import LocalDocumentStorage, SupabaseStorageService, ResumeService
from app.database.models import Application, MatchStatus

def setup_app_for_audit(client):
    reg = client.post("/auth/ceo/register", json={
        "name": "Tony Stark",
        "email": "tony@starkindustries.com",
        "password": "Password123!",
        "company_name": "Stark Industries"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "tony@starkindustries.com", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "tony@starkindustries.com", "password": "Password123!"}).json()["access_token"]
    ceo_headers = {"Authorization": f"Bearer {ceo_tok}"}

    dept_id = client.post("/ceo/departments", json={"name": "Arc Reactor R&D"}, headers=ceo_headers).json()["id"]

    client.post("/ceo/hr", json={
        "name": "Pepper Potts",
        "email": "pepper@starkindustries.com",
        "password": "Password123!",
        "department_id": dept_id
    }, headers=ceo_headers)
    hr_tok = client.post("/auth/login", json={"email": "pepper@starkindustries.com", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}

    # Top-level vacancy creation
    vac_resp = client.post("/vacancies", json={
        "title": "Clean Energy Systems Engineer",
        "department_id": dept_id,
        "description": "Design safe energy grids using Python and embedded systems.",
        "required_experience": "3+ years",
        "education": "BS in Engineering",
        "required_skills": ["Python", "Control Systems", "Thermodynamics"],
        "preferred_skills": ["Simulink"],
        "other_requirements": None
    }, headers=hr_headers)
    assert vac_resp.status_code == 201
    vac_id = vac_resp.json()["id"]
    client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)

    # Top-level vacancies listing
    all_vacs = client.get("/vacancies").json()
    assert any(v["id"] == vac_id for v in all_vacs)

    # Candidate registration
    cand_reg = client.post("/auth/candidate/register", json={
        "name": "Riri Williams",
        "email": "riri@mit.edu",
        "password": "Password123!",
    })
    cand_otp = cand_reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "riri@mit.edu", "otp": cand_otp})
    cand_tok = client.post("/auth/login", json={"email": "riri@mit.edu", "password": "Password123!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_tok}"}

    resume_text = (
        b"Riri Williams\n"
        b"Email: riri@ironheart.tech, Phone: (617) 555-0143\n"
        b"Graduated Class of 2022 from MIT\n"
        b"Experience: Developed autonomous propulsion control systems using Python for 3 years.\n"
        b"Skills: Python, Embedded C, Control Systems, Reverse Engineering\n"
    )
    files = {"resume": ("riri_resume.pdf", io.BytesIO(resume_text), "application/pdf")}
    
    # Top-level application submit
    app_resp = client.post("/applications", data={"vacancy_id": str(vac_id)}, files=files, headers=cand_headers)
    assert app_resp.status_code == 201
    app_id = app_resp.json()["id"]

    # Top-level applications list
    my_apps = client.get("/applications", headers=cand_headers).json()
    assert any(a["id"] == app_id for a in my_apps)

    return {
        "app_id": app_id,
        "hr_headers": hr_headers,
        "cand_headers": cand_headers
    }


def test_pii_shield_sanitization():
    raw_text = (
        "Candidate Name: John Doe\n"
        "Email: john.doe@cyberdyne.com\n"
        "Phone: +1-555-0199 or 555-234-5678\n"
        "LinkedIn: https://www.linkedin.com/in/john-doe-ai\n"
        "GitHub: https://github.com/johndoe\n"
        "Graduated: Class of 2012\n"
        "Tenure: 2015 - 2020 at Cyberdyne Systems\n"
        "Skills: Python, TensorFlow, PyTorch, Kubernetes, FastAPI\n"
        "Experience: Architected distributed machine learning models handling 20,000 requests/sec with 99.9% uptime."
    )

    sanitized, counts = pii_shield.mask_pii(raw_text, candidate_name="John Doe")

    # Identifiable contact details must be redacted
    assert "john.doe@cyberdyne.com" not in sanitized
    assert "[EMAIL_REDACTED]" in sanitized
    assert "555-0199" not in sanitized
    assert "[PHONE_REDACTED]" in sanitized
    assert "linkedin.com/in/john-doe-ai" not in sanitized
    assert "[PROFILE_LINK_REDACTED]" in sanitized
    assert "John Doe" not in sanitized

    # Technical evidence MUST be preserved
    assert "Python" in sanitized
    assert "TensorFlow" in sanitized
    assert "PyTorch" in sanitized
    assert "Kubernetes" in sanitized
    assert "FastAPI" in sanitized
    assert "20,000 requests/sec" in sanitized
    assert "99.9% uptime" in sanitized


def test_audit_defense_and_recruiter_override(client):
    data = setup_app_for_audit(client)
    app_id = data["app_id"]
    hr_headers = data["hr_headers"]

    # 1. Run AI analysis
    client.post(f"/ai/applications/{app_id}/analyze", headers=hr_headers)

    # 2. Get Audit Trail via /audit/{app_id}
    trail_resp = client.get(f"/audit/{app_id}", headers=hr_headers)
    assert trail_resp.status_code == 200
    trail_data = trail_resp.json()
    assert "requirement_breakdown" in trail_data
    assert len(trail_data["requirement_breakdown"]) > 0

    first_req = trail_data["requirement_breakdown"][0]
    req_id = first_req["requirement_id"]
    orig_status = first_req["status"]

    # 3. Recruiter Overrides status
    override_payload = {
        "requirement_id": req_id,
        "original_status": orig_status,
        "new_status": "VERIFIED",
        "reason": "Candidate demonstrated equivalent production thermodynamics knowledge during interview."
    }
    ov_resp = client.post(f"/audit/{app_id}/override", json=override_payload, headers=hr_headers)
    assert ov_resp.status_code == 200
    ov_data = ov_resp.json()
    assert ov_data["original_status"] == orig_status
    assert ov_data["new_status"] == "VERIFIED"
    assert "thermodynamics" in ov_data["reason"]

    # 4. Ask Audit Defense Agent questions
    # Question A: Why was a decision made
    q1 = client.post(f"/audit/{app_id}/ask", json={"question": "What evidence was found for Control Systems?"}, headers=hr_headers)
    assert q1.status_code == 200
    assert len(q1.json()["answer"]) > 10

    # Question B: Human overrides query
    q2 = client.post(f"/audit/{app_id}/ask", json={"question": "Were any human overrides logged for this candidate?"}, headers=hr_headers)
    assert q2.status_code == 200
    assert len(q2.json()["referenced_overrides"]) > 0
    assert "thermodynamics" in q2.json()["answer"].lower()

    # Question C: Assessment query
    q3 = client.post(f"/audit/{app_id}/ask", json={"question": "What was the candidate's skill assessment result?"}, headers=hr_headers)
    assert q3.status_code == 200
    assert "assessment" in q3.json()["answer"].lower()


def test_storage_abstraction_fallback():
    # Local Storage test
    local_storage = LocalDocumentStorage()
    assert local_storage.base_dir is not None

    # Supabase Storage unconfigured fallback test
    supabase_storage = SupabaseStorageService(supabase_url=None, service_role_key=None)
    assert supabase_storage.is_configured is False
