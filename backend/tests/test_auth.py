def test_ceo_registration_and_login_flow(client):
    # 1. Register CEO
    reg_resp = client.post("/auth/ceo/register", json={
        "name": "Jane Doe",
        "email": "jane.ceo@acme.com",
        "password": "SecurePassword123!",
        "company_name": "Acme Innovations"
    })
    assert reg_resp.status_code == 201
    data = reg_resp.json()
    assert "email" in data
    assert data["email"] == "jane.ceo@acme.com"
    otp = data["otp_preview"]
    assert otp is not None

    # 2. Login before email verification should be rejected (403)
    login_fail = client.post("/auth/login", json={
        "email": "jane.ceo@acme.com",
        "password": "SecurePassword123!"
    })
    assert login_fail.status_code == 403
    assert "not verified" in login_fail.json()["detail"].lower()

    # 3. Verify Email with OTP
    verify_resp = client.post("/auth/verify-email", json={
        "email": "jane.ceo@acme.com",
        "otp": otp
    })
    assert verify_resp.status_code == 200

    # 4. Login after verification should succeed with JWT and company metadata
    login_succ = client.post("/auth/login", json={
        "email": "jane.ceo@acme.com",
        "password": "SecurePassword123!"
    })
    assert login_succ.status_code == 200
    token_data = login_succ.json()
    assert "access_token" in token_data
    assert token_data["role"] == "CEO"
    assert token_data["company_name"] == "Acme Innovations"

def test_candidate_registration_and_login_flow(client):
    # 1. Register Candidate
    reg_resp = client.post("/auth/candidate/register", json={
        "name": "John Dev",
        "email": "john.dev@example.com",
        "password": "CandidatePassword123!",
        "github_url": "https://github.com/johndev",
        "linkedin_url": "https://linkedin.com/in/johndev"
    })
    assert reg_resp.status_code == 201
    otp = reg_resp.json()["otp_preview"]

    # 2. Verify Email with OTP
    verify_resp = client.post("/auth/verify-email", json={
        "email": "john.dev@example.com",
        "otp": otp
    })
    assert verify_resp.status_code == 200

    # 3. Login
    login_resp = client.post("/auth/login", json={
        "email": "john.dev@example.com",
        "password": "CandidatePassword123!"
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["role"] == "CANDIDATE"

def test_invalid_password(client):
    client.post("/auth/ceo/register", json={
        "name": "Jane Doe",
        "email": "jane.pwd@acme.com",
        "password": "SecurePassword123!",
        "company_name": "Acme Inc"
    })
    resp = client.post("/auth/login", json={
        "email": "jane.pwd@acme.com",
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401

def test_duplicate_email_prevention(client):
    # First registration
    client.post("/auth/ceo/register", json={
        "name": "Jane Original",
        "email": "jane.dup@acme.com",
        "password": "OriginalPassword123!",
        "company_name": "Acme Inc"
    })
    # Second registration with duplicate email should return 409 Conflict
    resp = client.post("/auth/ceo/register", json={
        "name": "Another Jane",
        "email": "jane.dup@acme.com",
        "password": "AnotherPassword123!",
        "company_name": "Duplicate Inc"
    })
    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"].lower()

def test_invalid_otp(client):
    # Register first
    client.post("/auth/ceo/register", json={
        "name": "Jane OTP",
        "email": "jane.otp@acme.com",
        "password": "Password123!",
        "company_name": "Acme Inc"
    })
    # Try verifying with wrong OTP
    resp = client.post("/auth/verify-email", json={
        "email": "jane.otp@acme.com",
        "otp": "999999"
    })
    assert resp.status_code == 400
    assert "invalid otp" in resp.json()["detail"].lower()
