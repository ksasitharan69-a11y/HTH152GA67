# HireProof AI - Backend Engine
**Tagline:** *"Don't Just Match. Prove. Verify. Explain."*
**Problem Statement:** HTH-GA-04 — Explainable Candidate–Role Fit Engine

---

## 1. Updated Target Architecture

```
React + TypeScript + Tailwind (Frontend)
                  │
                  ▼
FastAPI Backend (Python 3.12, Uvicorn, Pydantic v2, SQLAlchemy 2)
                  │
                  ▼
Supabase PostgreSQL (Database) + Supabase Storage (Resumes)
                  ↕
AI Candidate Evaluation / Explainability (Sasitharan)
  [PII Shield ➔ JD Decomposition ➔ Atomic Requirements ➔ Requirement Matching
   ➔ Evidence Extraction ➔ Citation Grounding ➔ Audit Defense Agent]
                  ↕
Candidate Assessment / Skill Verification (Sampreeth)
  [Drill-Down Questions ➔ Broken-Code Challenge ➔ Rubric Grading ➔ Database Persistence]
```

### Team Responsibilities & Ownership
* **Tarunika**: Frontend / UI / UX (React, TypeScript, Tailwind)
* **Dharshni**: Backend / Database (FastAPI, Auth, Organizations, Vacancies, Applications, Persistence, Audit)
* **Sasitharan**: AI Candidate Evaluation / Explainability (PII & Anti-Bias Shield, Matching, Citations, Audit Defense Agent)
* **Sampreeth**: Candidate Assessment / Skill Verification (Drill-down questions, Broken-code challenge, Answer evaluation, Grading)

---

## 2. Key Architecture Pillars

1. **No Hallucinations / Strict Grounding**: Every candidate qualification match requires verifiable citations in the candidate's resume. Uncited claims are marked `UNVERIFIED`.
2. **PII & Anti-Bias Shield**: Pre-processes raw resumes before LLM evaluation to mask contact information, personal URLs, names, and explicit calendar years while preserving 100% of technical evidence (skills, tools, projects, metrics).
3. **Canonical Assessment & Skill Verification Engine**: Generates targeted drill-down questions and realistic broken-code challenges (15–25 lines with intentional concurrency and error handling bugs) grounded in the candidate's actual stack. Graded against structured rubrics (0–100) with verdicts: `STRONG HIRE`, `BORDERLINE`, `REJECT`.
4. **Audit Defense Agent**: Allows authorized HR recruiters and auditors to query the decision history (e.g. *"What evidence supported this decision?"*, *"Which requirement caused the largest gap?"*, *"Why this assessment score?"*) using strictly grounded database records.
5. **Auditable Human Overrides**: Recruiters remain the final decision-makers. Any human override preserves original AI determinations in `hr_challenges` without destructive overwrites.
6. **Supabase PostgreSQL & Storage**: Uses SQLAlchemy 2.0 ORM compatible with Supabase PostgreSQL and provides a modular storage abstraction (`SupabaseStorageService`) with an isolated local disk fallback.

---

## 3. Environment Variables (`.env`)

Create `backend/.env` based on `backend/.env.example`:

```env
# Database (SQLite default fallback or Supabase PostgreSQL)
DATABASE_URL=sqlite:///./hireproof.db
# For Supabase PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Storage Configuration (Backend-Only)
STORAGE_PROVIDER=local
# Options: 'local' (default disk fallback) or 'supabase'
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key
SUPABASE_STORAGE_BUCKET=resumes

# Security & Session Authentication
SECRET_KEY=hireproof_ai_super_secret_jwt_key_hackathon_2026_change_in_prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OTP_EXPIRE_MINUTES=15

# LLM Configuration
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=
LLM_API_KEY=

# File Storage & Limits
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10

# CORS
FRONTEND_URL=http://localhost:5173
```

---

## 4. Local Setup & Quickstart

### Prerequisites
* Python 3.12+
* Node.js v18+ (for frontend)

### Installation
1. Navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```
2. Create and activate a virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Run Database Migrations (Alembic):
   ```powershell
   alembic upgrade head
   ```

---

## 5. Running the Backend Server

Start the development server with Uvicorn:
```powershell
.\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* API Base URL: `http://127.0.0.1:8000`
* Swagger Interactive Docs: `http://127.0.0.1:8000/docs`
* ReDoc Alternative Docs: `http://127.0.0.1:8000/redoc`

---

## 6. Running Tests

Run the complete automated pytest suite:
```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

All 15 automated test suites pass with 100% success:
* `test_auth.py`: CEO/Candidate registration, OTP verification, password hashing, JWT tokens
* `test_ceo_hr.py`: Company hierarchy, department management, HR creation
* `test_vacancies.py`: Vacancy publishing, requirements decomposition, public discovery
* `test_applications.py`: Resume file upload, duplicate prevention, candidate tracking
* `test_ai.py`: Evidence extraction, requirement matching, knowledge graph generation
* `test_assessments.py`: Assessment challenge generation, submission, rubric grading, scoring
* `test_audit.py`: Human HR reviews, challenge logging, candidate feedback
* `test_audit_defense_and_storage.py`: PII sanitization, Audit Defense Agent Q&A, storage fallback

---

## 7. API Groups & Endpoints

### Authentication (`/auth`)
* `POST /auth/ceo/register` - Register CEO & Company
* `POST /auth/candidate/register` - Register Candidate
* `POST /auth/verify-email` - Verify email using 6-digit OTP
* `POST /auth/login` - Authenticate and obtain JWT token

### Vacancies (`/vacancies` & `/hr/vacancies`)
* `POST /vacancies` - Create a job vacancy (HR only)
* `GET /vacancies` - List published vacancies (Public) or company vacancies (HR)
* `GET /vacancies/{id}` - Get vacancy details and requirements
* `POST /hr/vacancies/{id}/publish` - Publish a draft vacancy

### Applications (`/applications` & `/candidate/applications`)
* `POST /applications` - Submit candidate application with resume upload (PDF/DOCX)
* `GET /applications` - List applications for authenticated candidate or HR company
* `GET /applications/{id}` - View complete application details and match results

### AI Candidate Evaluation (`/ai`)
* `POST /ai/applications/{id}/analyze` - Run PII Shield, entity extraction, requirement matching, and citation grounding
* `GET /ai/applications/{id}/evidence-graph` - Retrieve graph-structured nodes and edges (`Requirement ➔ Evidence ➔ Reasoning ➔ Decision`)
* `GET /ai/applications/{id}/final-analysis` - Retrieve comprehensive explainability report
* `POST /ai/evaluate/{application_id}` - Alias endpoint for application evaluation
* `GET /ai/evaluation/{application_id}` - Alias endpoint for final analysis
* `GET /ai/requirements/{application_id}` - Structured requirements list
* `GET /ai/evidence/{application_id}` - Verified evidence citations

### Candidate Assessment & Skill Verification (`/assessments`)
* `POST /assessments/{application_id}/generate` - Generate stack-tailored drill-down questions, broken-code snippet, and answer key
* `GET /assessments/{application_id}` - Fetch assessment challenge for candidate (answer key sanitized)
* `POST /assessments/{application_id}/submit` - Submit candidate answers and trigger rubric grading
* `GET /assessments/{application_id}/result` - Retrieve evaluated score (0-100), verdict (`STRONG HIRE` / `BORDERLINE` / `REJECT`), and breakdown

### Explainability & Audit Defense (`/audit`)
* `GET /audit/{application_id}` - Retrieve complete audit trail and evidence citations
* `POST /audit/{application_id}/override` - Log recruiter status override with justification
* `POST /audit/{application_id}/ask` - Ask natural language audit questions strictly grounded in application records

---

## 8. AI & Verification Pipelines

### AI Candidate Evaluation Pipeline
1. Candidate uploads resume (PDF/DOCX).
2. Text extracted and normalized.
3. **PII Shield** redacts candidate name, email, phone, profile URLs, and graduation calendar years to prevent demographic bias.
4. **JD Analyzer** decomposes vacancy into atomic structured requirements.
5. **Resume Analyzer** extracts technical entities, skills, projects, and certifications.
6. **Matcher & Evidence Extractor** searches for grounded textual citations in the sanitized resume.
7. **Deterministic Citation Verifier** validates that extracted snippets actually exist in the candidate text. If ungrounded, the requirement is marked `UNVERIFIED`.
8. Matches categorized into: `VERIFIED`, `PARTIAL`, `UNVERIFIED`, or `GAP`.

### Candidate Assessment Pipeline
1. Application enters assessment stage.
2. **Assessment Service** reads vacancy JD, candidate resume claims, and identified gaps.
3. Generates 2–5 deep drill-down questions, a 15–25 line broken-code snippet containing intentional production bugs (e.g. TOCTOU race condition, unmanaged transaction rollback), and a grounded answer key.
4. Candidate submits responses.
5. Engine grades responses out of 100 with technical breakdown and verdict (`STRONG HIRE`, `BORDERLINE`, `REJECT`).
6. Results stored persistently in the database `assessments` table.

### Audit Defense Workflow
1. Recruiter or auditor accesses `/audit/{application_id}/ask`.
2. Asks questions such as:
   * *"Why was this candidate marked PARTIAL for Distributed Systems?"*
   * *"What evidence was found in the candidate's resume?"*
   * *"Which qualification represents the largest gap?"*
   * *"Why did the candidate receive a BORDERLINE assessment verdict?"*
3. **Audit Defense Agent** responds strictly using the stored application evidence, match records, assessment results, and HR overrides without hallucinating unrecorded facts.

---

## 9. Security & Access Control

* **Cross-Tenant Isolation**: HR users and CEOs can only view vacancies, applications, and audit records belonging to their respective company.
* **Candidate Privacy**: Candidates can only access their own profile, applications, and assessment challenges.
* **Server-Side Enforcement**: All authorization is enforced in FastAPI route dependencies; frontend role parameters are never trusted.
* **Secret Protection**: Supabase service-role keys and LLM keys are backend-only and never exposed to clients or in API responses.
