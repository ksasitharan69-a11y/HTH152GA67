import io

def test_application_submission_and_tracking(client):
    # 1. Setup CEO, Company, Department, HR, and Published Vacancy
    reg = client.post("/auth/ceo/register", json={
        "name": "Tony Stark",
        "email": "tony@stark.com",
        "password": "Password123!",
        "company_name": "Stark Industries"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "tony@stark.com", "otp": otp})
    ceo_tok = client.post("/auth/login", json={"email": "tony@stark.com", "password": "Password123!"}).json()["access_token"]
    
    dept_id = client.post("/ceo/departments", json={"name": "Defense Systems"}, headers={"Authorization": f"Bearer {ceo_tok}"}).json()["id"]
    
    client.post("/ceo/hr", json={
        "name": "Pepper Potts",
        "email": "pepper.hr@stark.com",
        "password": "Password123!",
        "department_id": dept_id
    }, headers={"Authorization": f"Bearer {ceo_tok}"})
    
    hr_tok = client.post("/auth/login", json={"email": "pepper.hr@stark.com", "password": "Password123!"}).json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_tok}"}

    vac_resp = client.post("/hr/vacancies", json={
        "title": "Backend Systems Engineer",
        "department_id": dept_id,
        "description": "Building high scale backend services in Python and FastAPI.",
        "required_experience": "3+ years",
        "education": "BS in Computer Science",
        "required_skills": ["Python", "FastAPI", "SQL"],
        "preferred_skills": ["Docker"],
        "other_requirements": "Testing experience"
    }, headers=hr_headers)
    vac_id = vac_resp.json()["id"]
    client.post(f"/hr/vacancies/{vac_id}/publish", headers=hr_headers)

    # 2. Register and verify Candidate
    cand_reg = client.post("/auth/candidate/register", json={
        "name": "Peter Parker",
        "email": "peter.parker@nyu.edu",
        "password": "SpiderPassword123!",
        "github_url": "https://github.com/peterparker",
        "linkedin_url": "https://linkedin.com/in/peterparker"
    })
    cand_otp = cand_reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "peter.parker@nyu.edu", "otp": cand_otp})
    cand_tok = client.post("/auth/login", json={"email": "peter.parker@nyu.edu", "password": "SpiderPassword123!"}).json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_tok}"}

    # 3. Candidate submits application with resume file
    resume_content = b"""
    Peter Parker
    Software Engineer | Queens, NY

    SKILLS:
    Python, FastAPI, SQL, Docker, Git, REST APIs

    EXPERIENCE:
    Web Development Assistant at Daily Bugle (2 years)
    - Developed backend REST APIs using Python and FastAPI for image delivery.
    - Optimized relational SQL database queries, reducing response times by 35%.

    EDUCATION:
    B.S. in Computer Science, NYU, 2024
    """

    files = {
        "resume_file": ("resume.pdf", io.BytesIO(resume_content), "application/pdf")
    }
    data = {
        "vacancy_id": str(vac_id)
    }

    apply_resp = client.post("/candidate/applications", data=data, files=files, headers=cand_headers)
    assert apply_resp.status_code == 201
    app_data = apply_resp.json()
    assert app_data["vacancy_id"] == vac_id
    assert app_data["resume_filename"] == "resume.pdf"
    app_id = app_data["id"]

    # 4. Duplicate application prevention check
    dup_resp = client.post("/candidate/applications", data=data, files=files, headers=cand_headers)
    assert dup_resp.status_code == 409
    assert "already submitted" in dup_resp.json()["detail"].lower()

    # 5. Candidate tracks own applications
    my_apps = client.get("/candidate/applications", headers=cand_headers).json()
    assert len(my_apps) == 1
    assert my_apps[0]["id"] == app_id
    assert my_apps[0]["vacancy_title"] == "Backend Systems Engineer"

    # 6. HR views applicants for this vacancy
    hr_apps = client.get(f"/hr/vacancies/{vac_id}/applications", headers=hr_headers).json()
    assert len(hr_apps) == 1
    assert hr_apps[0]["candidate_name"] == "Peter Parker"
