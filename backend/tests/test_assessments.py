import io
import pytest
from app.database.models import Application, Assessment, AssessmentStatus

def setup_vacancy_and_application(client):
    # Register CEO & HR
    reg = client.post("/auth/ceo/register", json={
        "name": "Bruce Wayne",
        "email": "bruce@wayne-enterprises.com",
        "password": "Password123!",
        "company_name": "Wayne Enterprises"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "bruce@wayne-enterprises.com", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "bruce@wayne-enterprises.com", "password": "Password123!"}).json()["access_token"]
    
    dept_id = client.post("/ceo/departments", json={"name": "Applied Sciences"}, headers={"Authorization": f"Bearer {ceo_tok}"}).json()["id"]
    
    client.post("/ceo/hr", json={
        "name": "Lucius Fox",
        "email": "lucius@wayne-enterprises.com",
        "password": "Password123!",
        "department_id": dept_id
    }, headers={"Authorization": f"Bearer {ceo_tok}"})
    
    hr_tok = client.post("/auth/login", json={"email": "lucius@wayne-enterprises.com", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}

    vac_resp = client.post("/hr/vacancies", json={
        "title": "Senior Distributed Backend Engineer",
        "department_id": dept_id,
        "description": "High-throughput microservices in Node.js and Python with PostgreSQL.",
        "required_experience": "3+ years",
        "education": "BS in Computer Science",
        "required_skills": ["Node.js", "Python", "PostgreSQL", "Docker"],
        "preferred_skills": ["Redis", "Kubernetes"],
        "other_requirements": None
    }, headers=hr_headers)
    vac_id = vac_resp.json()["id"]
    client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)

    # Register Candidate
    cand_reg = client.post("/auth/candidate/register", json={
        "name": "Tim Drake",
        "email": "tim.drake@gotham.org",
        "password": "Password123!",
    })
    cand_otp = cand_reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "tim.drake@gotham.org", "otp": cand_otp})
    cand_tok = client.post("/auth/login", json={"email": "tim.drake@gotham.org", "password": "Password123!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_tok}"}

    resume_text = (
        b"Tim Drake\n"
        b"Contact: tim@drake.net, +1-555-0199\n"
        b"Experience: Built high-throughput payment gateways with Node.js and PostgreSQL for 4 years.\n"
        b"Skills: Node.js, Python, PostgreSQL, Docker, Microservices\n"
    )
    files = {"resume_file": ("resume.pdf", io.BytesIO(resume_text), "application/pdf")}
    app_resp = client.post("/candidate/applications", data={"vacancy_id": str(vac_id)}, files=files, headers=cand_headers)
    app_id = app_resp.json()["id"]

    return {
        "vac_id": vac_id,
        "app_id": app_id,
        "hr_headers": hr_headers,
        "cand_headers": cand_headers,
        "ceo_headers": {"Authorization": f"Bearer {ceo_tok}"}
    }


def test_assessment_generation_and_evaluation_flow(client):
    data = setup_vacancy_and_application(client)
    app_id = data["app_id"]
    cand_headers = data["cand_headers"]
    hr_headers = data["hr_headers"]

    # 1. First trigger AI analysis so requirements & gaps exist
    ai_resp = client.post(f"/ai/applications/{app_id}/analyze", headers=hr_headers)
    assert ai_resp.status_code == 200

    # 2. Candidate or HR generates assessment challenge
    gen_resp = client.post(f"/assessments/{app_id}/generate", headers=cand_headers)
    assert gen_resp.status_code == 200
    assessment_data = gen_resp.json()

    assert "id" in assessment_data
    assert len(assessment_data["drill_down_questions"]) >= 2
    assert "broken_code_snippet" in assessment_data
    assert len(assessment_data["broken_code_snippet"]) > 20
    assert assessment_data["status"] == "PENDING"
    # Internal answer_key should NOT be exposed to candidate!
    assert "answer_key" not in assessment_data

    # 3. Retrieve assessment via GET
    get_resp = client.get(f"/assessments/{app_id}", headers=cand_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == assessment_data["id"]

    # 4. Candidate submits responses
    answers_payload = {
        "drill_down_responses": {
            "q1": "I designed the payment worker using Redis locks and partitioned queues to avoid race conditions.",
            "q2": "I implemented distributed saga transactions with compensating rollbacks on partial failure."
        },
        "code_review_response": (
            "The code contains two critical bugs: First, a TOCTOU concurrency race condition where stock is checked "
            "and decremented without an atomic transaction or row locking (SELECT FOR UPDATE). Second, the payment "
            "and order creation lack a try/catch block with transactional rollback, meaning an unhandled exception "
            "leaves customer charged without an order."
        )
    }

    sub_resp = client.post(f"/assessments/{app_id}/submit", json=answers_payload, headers=cand_headers)
    assert sub_resp.status_code == 200
    eval_result = sub_resp.json()

    assert eval_result["status"] == "EVALUATED"
    assert eval_result["score"] >= 70
    assert eval_result["verdict"] in ["STRONG HIRE", "BORDERLINE"]
    assert "findings_breakdown" in eval_result
    assert eval_result["findings_breakdown"]["concurrency_race_condition"]["identified"] is True
    assert eval_result["findings_breakdown"]["error_handling_bug"]["identified"] is True
    assert len(eval_result["audit_justification"]) > 10

    # 5. Retrieve final assessment result
    res_resp = client.get(f"/assessments/{app_id}/result", headers=cand_headers)
    assert res_resp.status_code == 200
    assert res_resp.json()["score"] == eval_result["score"]

    # 6. Verify HR can view the result
    hr_res_resp = client.get(f"/assessments/{app_id}/result", headers=hr_headers)
    assert hr_res_resp.status_code == 200
    assert hr_res_resp.json()["verdict"] == eval_result["verdict"]


def test_assessment_unauthorized_access(client):
    data = setup_vacancy_and_application(client)
    app_id = data["app_id"]

    # Register an unrelated second candidate
    client.post("/auth/candidate/register", json={
        "name": "Peter Parker",
        "email": "peter.parker@dailybugle.com",
        "password": "Password123!",
    })
    client.post("/auth/verify-email", json={"email": "peter.parker@dailybugle.com", "otp": "123456"})
    # Log in
    tok = client.post("/auth/login", json={"email": "peter.parker@dailybugle.com", "password": "Password123!"}).json().get("access_token")
    if tok:
        headers = {"Authorization": f"Bearer {tok}"}
        resp = client.get(f"/assessments/{app_id}", headers=headers)
        assert resp.status_code == 403
