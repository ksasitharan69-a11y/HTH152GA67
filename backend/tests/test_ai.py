import io
import pytest

def test_ai_matching_and_verification_pipeline(client):
    # Setup Company & Vacancy
    reg = client.post("/auth/ceo/register", json={
        "name": "Prof X",
        "email": "charles@xcorp.com",
        "password": "Password123!",
        "company_name": "Xavier Corp"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "charles@xcorp.com", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "charles@xcorp.com", "password": "Password123!"}).json()["access_token"]
    
    dept_id = client.post("/ceo/departments", json={"name": "Genetics & Tech"}, headers={"Authorization": f"Bearer {ceo_tok}"}).json()["id"]
    
    client.post("/ceo/hr", json={
        "name": "Jean Grey",
        "email": "jean.hr@xcorp.com",
        "password": "Password123!",
        "department_id": dept_id
    }, headers={"Authorization": f"Bearer {ceo_tok}"})
    
    hr_tok = client.post("/auth/login", json={"email": "jean.hr@xcorp.com", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}

    vac_resp = client.post("/hr/vacancies", json={
        "title": "Cloud Architect",
        "department_id": dept_id,
        "description": "Looking for Cloud Architect to design distributed systems.",
        "required_experience": "3+ years",
        "education": "B.Tech in CS",
        "required_skills": ["Python", "AWS", "Kubernetes"],
        "preferred_skills": ["Terraform"],
        "other_requirements": None
    }, headers=hr_headers)
    vac_id = vac_resp.json()["id"]
    client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)

    # Candidate with Python in experience, but AWS NOT mentioned in resume
    cand_reg = client.post("/auth/candidate/register", json={
        "name": "Hank McCoy",
        "email": "hank@beast.com",
        "password": "Password123!",
    })
    cand_otp = cand_reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "hank@beast.com", "otp": cand_otp})
    cand_tok = client.post("/auth/login", json={"email": "hank@beast.com", "password": "Password123!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_tok}"}

    resume_text = b"""
    Dr. Hank McCoy
    Senior Research Engineer

    SKILLS:
    Python, C++, Docker, Algorithms, Genetic Sequencing

    EXPERIENCE:
    Senior Software Engineer at Xavier Institute (4 years)
    - Developed backend services in Python for distributed telemetry.
    - Implemented high-performance data processing pipelines.

    EDUCATION:
    B.Tech in Computer Science, 2020
    """

    files = {"resume_file": ("hank_resume.pdf", io.BytesIO(resume_text), "application/pdf")}
    apply_resp = client.post("/candidate/applications", data={"vacancy_id": str(vac_id)}, files=files, headers=cand_headers)
    assert apply_resp.status_code == 201
    app_id = apply_resp.json()["id"]

    # 1. Trigger / Verify AI Analysis API
    ai_resp = client.post(f"/ai/applications/{app_id}/analyze", headers=cand_headers)
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert ai_data["application_id"] == app_id
    reqs = ai_data["requirements"]
    assert len(reqs) >= 3

    # Verify that Python is VERIFIED and AWS is UNVERIFIED (not GAP per rule!)
    python_match = next((r for r in reqs if "python" in r["requirement"].lower()), None)
    assert python_match is not None
    assert python_match["status"] == "VERIFIED"
    assert len(python_match["evidence"]) >= 1

    aws_match = next((r for r in reqs if "aws" in r["requirement"].lower()), None)
    assert aws_match is not None
    assert aws_match["status"] == "UNVERIFIED"

    # 2. Test Evidence Graph API
    graph_resp = client.get(f"/ai/applications/{app_id}/evidence-graph", headers=cand_headers)
    assert graph_resp.status_code == 200
    graph = graph_resp.json()
    assert "nodes" in graph and "edges" in graph
    assert len(graph["nodes"]) > 0

    # 3. Test "Prove This Skill" Recommendation
    prove_resp = client.post(f"/ai/applications/{app_id}/requirements/{aws_match['requirement_id']}/prove", headers=cand_headers)
    assert prove_resp.status_code == 200
    prove_data = prove_resp.json()
    assert "verification_type" in prove_data
    assert prove_data["requirement"] == aws_match["requirement"]

    # 4. Generate AI Challenge
    chal_resp = client.post("/ai/verification/challenge", json={
        "application_id": app_id,
        "requirement_id": aws_match["requirement_id"]
    }, headers=cand_headers)
    assert chal_resp.status_code == 200
    assert "challenge" in chal_resp.json()

    # 5. Generate AI Interview Question
    iq_resp = client.post("/ai/verification/interview-question", json={
        "application_id": app_id,
        "requirement_id": aws_match["requirement_id"]
    }, headers=cand_headers)
    assert iq_resp.status_code == 200
    assert "question" in iq_resp.json()
    question_text = iq_resp.json()["question"]

    # 6. Candidate Answers Question with Strong Technical Evidence
    answer_payload = {
        "application_id": app_id,
        "requirement_id": aws_match["requirement_id"],
        "question": question_text,
        "candidate_answer": (
            "In my previous infrastructure overhaul project, I architected and deployed our microservices on AWS using ECS Fargate, "
            "Application Load Balancers, and RDS PostgreSQL with multi-AZ failover. I configured CloudWatch alarms for latency spikes, "
            "IAM least-privilege security roles, and S3 lifecycle rules for automated archival, successfully supporting 20,000 requests per second."
        )
    }
    eval_resp = client.post("/ai/verification/evaluate", json=answer_payload, headers=cand_headers)
    assert eval_resp.status_code == 200
    eval_data = eval_resp.json()
    assert eval_data["result"] == "STRONG_EVIDENCE"
    assert eval_data["updated_status"] == "VERIFIED"

    # 7. Check Final Analysis Report (shows original result + verification + audit history)
    final_rep = client.get(f"/ai/applications/{app_id}/final-analysis", headers=cand_headers)
    assert final_rep.status_code == 200
    rep_data = final_rep.json()
    assert rep_data["verified_count"] >= 2
    assert len(rep_data["verification_audit_trail"]) >= 1
    assert rep_data["verification_audit_trail"][0]["ai_result"] == "STRONG_EVIDENCE"
