def test_vacancy_lifecycle_and_candidate_discovery(client):
    # 1. Setup CEO and HR
    reg = client.post("/auth/ceo/register", json={
        "name": "Bruce Wayne",
        "email": "bruce@waynecorp.com",
        "password": "Password123!",
        "company_name": "Wayne Enterprises"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "bruce@waynecorp.com", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "bruce@waynecorp.com", "password": "Password123!"}).json()["access_token"]
    
    dept_id = client.post("/ceo/departments", json={"name": "Applied Sciences"}, headers={"Authorization": f"Bearer {ceo_tok}"}).json()["id"]
    
    client.post("/ceo/hr", json={
        "name": "Lucius Fox",
        "email": "lucius.hr@waynecorp.com",
        "password": "Password123!",
        "department_id": dept_id
    }, headers={"Authorization": f"Bearer {ceo_tok}"})
    
    hr_tok = client.post("/auth/login", json={"email": "lucius.hr@waynecorp.com", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}
    company_id = client.get("/hr/profile", headers=hr_headers).json()["company"]["id"]

    # 2. HR creates Vacancy (initially DRAFT)
    create_resp = client.post("/hr/vacancies", json={
        "title": "Senior AI Systems Architect",
        "department_id": dept_id,
        "description": "Design resilient GenAI architectures and multi-agent coordination pipelines using Python and FastAPI.",
        "required_experience": "4+ years",
        "education": "Bachelor's or Master's in Computer Science",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "preferred_skills": ["AWS", "LangChain"],
        "other_requirements": "Clear communication and production reliability experience"
    }, headers=hr_headers)
    assert create_resp.status_code == 201
    vac_data = create_resp.json()
    assert vac_data["status"] == "DRAFT"
    vac_id = vac_data["id"]
    assert len(vac_data["requirements"]) >= 4

    # 3. Public/Candidate should NOT see DRAFT vacancies
    public_vacs_before = client.get(f"/companies/{company_id}/vacancies").json()
    assert not any(v["id"] == vac_id for v in public_vacs_before)

    # 4. HR publishes vacancy
    pub_resp = client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)
    assert pub_resp.status_code == 200
    assert pub_resp.json()["status"] == "PUBLISHED"

    # 5. Public/Candidate CAN now see PUBLISHED vacancy
    public_vacs_after = client.get(f"/companies/{company_id}/vacancies").json()
    assert any(v["id"] == vac_id for v in public_vacs_after)
    found_vac = next(v for v in public_vacs_after if v["id"] == vac_id)
    assert found_vac["title"] == "Senior AI Systems Architect"
    assert "Python" in found_vac["required_skills"]
