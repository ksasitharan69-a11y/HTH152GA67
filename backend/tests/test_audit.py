import io

def test_hr_audit_challenge_and_feedback_flow(client):
    # Setup CEO & HR
    reg = client.post("/auth/ceo/register", json={
        "name": "Wanda Maximoff",
        "email": "wanda@westview.io",
        "password": "Password123!",
        "company_name": "Westview Labs"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "wanda@westview.io", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "wanda@westview.io", "password": "Password123!"}).json()["access_token"]
    
    dept_id = client.post("/ceo/departments", json={"name": "Reality Computing"}, headers={"Authorization": f"Bearer {ceo_tok}"}).json()["id"]
    
    client.post("/ceo/hr", json={
        "name": "Vision AI",
        "email": "vision.hr@westview.io",
        "password": "Password123!",
        "department_id": dept_id
    }, headers={"Authorization": f"Bearer {ceo_tok}"})
    
    hr_tok = client.post("/auth/login", json={"email": "vision.hr@westview.io", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}

    vac_resp = client.post("/hr/vacancies", json={
        "title": "Quantum Systems Engineer",
        "department_id": dept_id,
        "description": "Quantum algorithms and distributed computation.",
        "required_experience": "2+ years",
        "education": "BS in Physics or CS",
        "required_skills": ["Python", "Quantum Computing", "Docker"],
        "preferred_skills": ["C++"],
        "other_requirements": None
    }, headers=hr_headers)
    vac_id = vac_resp.json()["id"]
    client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)

    # Candidate applies
    cand_reg = client.post("/auth/candidate/register", json={
        "name": "Stephen Strange",
        "email": "stephen@kamar-taj.org",
        "password": "Password123!",
    })
    cand_otp = cand_reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "stephen@kamar-taj.org", "otp": cand_otp})
    cand_tok = client.post("/auth/login", json={"email": "stephen@kamar-taj.org", "password": "Password123!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_tok}"}

    resume_text = b"Dr. Stephen Strange\nExperience: Applied Mathematics and Neural Surgery for 5 years.\nSkills: Python, C++"
    files = {"resume_file": ("resume.pdf", io.BytesIO(resume_text), "application/pdf")}
    app_id = client.post("/candidate/applications", data={"vacancy_id": str(vac_id)}, files=files, headers=cand_headers).json()["id"]

    # 1. HR reviews AI analysis
    analysis_resp = client.get(f"/hr/applications/{app_id}/analysis", headers=hr_headers)
    assert analysis_resp.status_code == 200
    analysis = analysis_resp.json()
    req_breakdown = analysis["requirement_breakdown"]
    assert len(req_breakdown) > 0

    # Pick an unverified requirement
    target_req = next((r for r in req_breakdown if r["status"] == "UNVERIFIED"), req_breakdown[0])
    req_id = target_req["requirement_id"]

    # 2. HR submits Human Challenge / Override
    chal_payload = {
        "requirement_id": req_id,
        "reason": "Candidate demonstrated mathematical proofs and quantum algorithm designs in their published papers.",
        "new_status": "VERIFIED"
    }
    chal_resp = client.post(f"/hr/applications/{app_id}/challenge", json=chal_payload, headers=hr_headers)
    assert chal_resp.status_code == 200
    chal_data = chal_resp.json()
    assert chal_data["requirement_id"] == req_id
    assert chal_data["new_status"] == "VERIFIED"

    # Verify that history is preserved and updated in final analysis
    analysis_updated = client.get(f"/hr/applications/{app_id}/analysis", headers=hr_headers).json()
    assert len(analysis_updated["human_reviews"]) >= 1
    assert analysis_updated["human_reviews"][0]["reason"] == chal_payload["reason"]

    # 3. HR updates Application Status
    status_resp = client.put(f"/hr/applications/{app_id}/status", json={"status": "SHORTLISTED"}, headers=hr_headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "SHORTLISTED"

    # 4. HR adds feedback for Candidate
    fb_resp = client.post(f"/hr/applications/{app_id}/feedback", json={
        "feedback_type": "HR",
        "content": "Outstanding technical background. Invited to final round interview."
    }, headers=hr_headers)
    assert fb_resp.status_code == 201

    # 5. Candidate views their feedback
    cand_fb = client.get(f"/candidate/applications/{app_id}/feedback", headers=cand_headers)
    assert cand_fb.status_code == 200
    fb_items = cand_fb.json()
    assert len(fb_items) >= 1
    assert "Outstanding technical background" in fb_items[0]["content"]
