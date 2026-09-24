def test_ceo_company_department_and_hr_flow(client):
    # 1. Register and verify CEO
    reg = client.post("/auth/ceo/register", json={
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.com",
        "password": "Password123!",
        "company_name": "Cyberdyne Systems"
    })
    otp = reg.json()["otp_preview"]
    client.post("/auth/verify-email", json={"email": "sarah@cyberdyne.com", "otp": otp})

    # Login CEO
    login_resp = client.post("/auth/login", json={"email": "sarah@cyberdyne.com", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    ceo_headers = {"Authorization": f"Bearer {token}"}

    # 2. Get CEO Company
    comp_resp = client.get("/ceo/company", headers=ceo_headers)
    assert comp_resp.status_code == 200
    assert comp_resp.json()["name"] == "Cyberdyne Systems"

    # 3. Create Department
    dept_resp = client.post("/ceo/departments", json={"name": "Engineering"}, headers=ceo_headers)
    assert dept_resp.status_code == 201
    dept_id = dept_resp.json()["id"]

    # 4. List Departments
    depts = client.get("/ceo/departments", headers=ceo_headers).json()
    assert len(depts) >= 1
    assert any(d["name"] == "Engineering" for d in depts)

    # 5. Create HR
    hr_resp = client.post("/ceo/hr", json={
        "name": "Miles Dyson",
        "email": "miles.hr@cyberdyne.com",
        "password": "HrPassword123!",
        "department_id": dept_id
    }, headers=ceo_headers)
    assert hr_resp.status_code == 201
    hr_data = hr_resp.json()
    assert hr_data["name"] == "Miles Dyson"
    assert hr_data["department_name"] == "Engineering"
    assert hr_data["company_name"] == "Cyberdyne Systems"

    # 6. List HR
    hr_list = client.get("/ceo/hr", headers=ceo_headers).json()
    assert len(hr_list) >= 1
    assert hr_list[0]["email"] == "miles.hr@cyberdyne.com"

    # 7. HR Login
    hr_login = client.post("/auth/login", json={
        "email": "miles.hr@cyberdyne.com",
        "password": "HrPassword123!"
    })
    assert hr_login.status_code == 200
    hr_token = hr_login.json()["access_token"]
    hr_headers = {"Authorization": f"Bearer {hr_token}"}

    # 8. HR Profile
    hr_profile = client.get("/hr/profile", headers=hr_headers)
    assert hr_profile.status_code == 200
    assert hr_profile.json()["company"]["name"] == "Cyberdyne Systems"
    assert hr_profile.json()["department"]["name"] == "Engineering"

    # 9. Authorization check: HR cannot access CEO endpoints
    hr_access_ceo_dept = client.post("/ceo/departments", json={"name": "Hacking"}, headers=hr_headers)
    assert hr_access_ceo_dept.status_code == 403
