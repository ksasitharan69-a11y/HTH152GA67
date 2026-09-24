# HIREPROOF AI - BACKEND
**Tagline:** *"Don't Just Match. Prove. Verify. Explain."*

---

## 1. Project Overview
HireProof AI is a next-generation hiring intelligence engine created for a 24-hour hackathon. Traditional applicant tracking systems rely on naive keyword matching or unverified LLM summaries that hallucinate candidate credentials and fabricate qualifications.

HireProof AI enforces a rigorous **MATCH → PROVE → VERIFY → EXPLAIN → AUDIT** pipeline:
- **No Hallucinations**: Evidence must be grounded in verified candidate documentation.
- **Evidence-Based Matching**: Distinguishes between `VERIFIED`, `PARTIAL`, `UNVERIFIED`, and `GAP`. (Crucial rule: No evidence ≠ GAP; it is `UNVERIFIED`).
- **Interactive Skill Proving**: Generates targeted technical challenges and behavioral questions specifically targeting unverified requirements.
- **Explainable Knowledge Graphs**: Visualizes the decision tree: `Requirement → Evidence → Reasoning → Match Decision`.
- **Human-in-the-Loop Audit Trail**: HR can challenge and override AI conclusions with full audit preservation.

---

## 2. Architecture & Pipeline
```
[ Job Description ]
        │
        ▼ (JD Analyzer)
[ Structured Requirements: Skills, Experience, Education ]
        │
[ Candidate Uploads Resume (PDF / DOCX) ]
        │
        ▼ (Resume Parser & Analyzer)
[ Normalized Text & Factual Candidate Entities ]
        │
        ▼ (Matcher & Evidence Extractor)
[ Evidence-Based Requirement Evaluation: VERIFIED | PARTIAL | UNVERIFIED | GAP ]
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
[ Evidence Graph API ]    [ Prove This Skill API ]
(Graph: Req ➔ Evidence        (AI Challenge / Interview Question)
        ➔ Reasoning ➔ Decision)    │
                                 ▼
                         [ Candidate Answer ]
                                 │
                                 ▼ (Answer Evaluator)
                         [ STRONG_EVIDENCE? ]
                           ├── YES ➔ Status updated to VERIFIED
                           └── NO  ➔ Preserved as UNVERIFIED/PARTIAL
                                 │
                                 ▼
                         [ HR Audit & Challenge ]
                         (Human override preserved in history)
                                 │
                                 ▼
                         [ Final Explainable Report ]
```

---

## 3. Tech Stack
- **Language & Runtime**: Python 3.11+
- **Web Framework**: FastAPI (Async, ASGI)
- **ASGI Server**: Uvicorn
- **ORM & Database**: SQLAlchemy 2.0+ (supports MySQL / MariaDB via PyMySQL and SQLite default)
- **Data Validation & Settings**: Pydantic v2 & Pydantic-Settings
- **Authentication**: JWT (`PyJWT`), Bcrypt (`Passlib`), Role-based access control (CEO, HR, CANDIDATE)
- **Document Processing**: `pypdf` (PDF extraction), `python-docx` (DOCX extraction)
- **GenAI / LLM Integration**: Multi-provider client (`ai/llm_client.py`) supporting Google Gemini, OpenAI, or integrated Semantic Reasoning Engine.
- **Testing**: `pytest`, `pytest-asyncio`, `httpx` (TestClient)

---

## 4. Folder Structure
```
backend/
├── app/
│   ├── main.py                    # FastAPI entrypoint, CORS, lifespan, exception handlers
│   ├── core/
│   │   ├── config.py              # Environment settings (Pydantic Settings)
│   │   ├── security.py            # Password hashing, JWT creation/decoding, OTP generator
│   │   └── dependencies.py        # RBAC dependencies (get_current_ceo, get_current_hr, etc.)
│   ├── database/
│   │   ├── database.py            # SQLAlchemy engine, session maker, init_db()
│   │   └── models.py              # Relational models (Users, Companies, Vacancies, Evidence, etc.)
│   ├── schemas/
│   │   ├── auth.py                # Auth DTOs (Register, Login, Token, OTP)
│   │   ├── company.py             # Company & Department schemas
│   │   ├── hr.py                  # HR profiles & dashboard metrics
│   │   ├── vacancy.py             # Vacancy & Structured Requirements schemas
│   │   ├── application.py         # Application submission & tracking schemas
│   │   └── ai.py                  # Match, Evidence Graph, Verification, & Audit schemas
│   ├── routers/
│   │   ├── auth.py                # Registration, Login, Email OTP
│   │   ├── ceo.py                 # CEO Company, Department, and HR account creation
│   │   ├── hr.py                  # Vacancy management, applicants, HR review & challenges
│   │   ├── candidate.py           # Public vacancies, profile, application & resume upload
│   │   └── ai.py                  # Matching, Evidence Graph, Verification, & Final Report
│   ├── services/
│   │   ├── auth_service.py        # Business logic for auth & OTP
│   │   ├── resume_service.py      # File upload handling & storage abstraction
│   │   ├── application_service.py # AI pipeline orchestration & graph generator
│   │   └── verification_service.py# Verification challenges, interviews, answer evaluation
│   └── ai/
│       ├── llm_client.py          # Unified client for Gemini / OpenAI / Semantic Engine
│       ├── resume_parser.py       # PDF & DOCX extraction & text normalization
│       ├── jd_analyzer.py         # Decomposes JDs into structured requirements
│       ├── resume_analyzer.py     # Extracts factual resume entities (no hallucinations)
│       ├── matcher.py             # Evaluates VERIFIED, PARTIAL, UNVERIFIED, GAP
│       ├── evidence_extractor.py  # Pinpoints exact text excerpts & section locations
│       ├── question_generator.py  # Generates targeted scenario challenges & interview questions
│       ├── answer_evaluator.py    # Scores candidate responses for technical depth
│       └── final_analyzer.py      # Compiles comprehensive final report & audit trail
├── uploads/
│   └── resumes/                   # Stored candidate resume documents
├── tests/
│   ├── conftest.py                # TestClient and isolated DB fixture
│   ├── test_auth.py               # Auth & registration tests
│   ├── test_ceo_hr.py             # CEO management & HR creation tests
│   ├── test_vacancies.py          # Vacancy creation & discovery tests
│   ├── test_applications.py       # Application submission & duplicate prevention tests
│   ├── test_ai.py                 # AI matching, evidence graph & verification tests
│   └── test_audit.py              # HR review, challenge override & feedback tests
├── requirements.txt               # Pinned dependencies
├── pytest.ini                     # Pytest configuration
├── seed.py                        # Optional demo data seed script
├── .env.example                   # Environment configuration template
└── README.md                      # Comprehensive backend documentation
```

---

## 5. Database Setup
The backend supports two database backends out-of-the-box via `DATABASE_URL`:
1. **SQLite (Default for portable hackathon development)**:
   ```env
   DATABASE_URL=sqlite:///./hireproof.db
   ```
2. **MySQL / MariaDB (Production & high concurrency)**:
   ```env
   DATABASE_URL=mysql+pymysql://username:password@localhost:3306/hireproof_ai
   ```
Database tables are initialized automatically on application startup via `init_db()`.

---

## 6. Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory (see `.env.example`):
```env
DATABASE_URL=sqlite:///./hireproof.db
SECRET_KEY=your_secure_jwt_secret_key_change_in_prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
OTP_EXPIRE_MINUTES=15

# LLM Provider Configuration
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-1.5-flash

# Frontend & File Uploads
FRONTEND_URL=http://localhost:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

---

## 7. Installation & Setup

1. **Activate Virtual Environment**:
   ```powershell
   cd backend
   .\.venv\Scripts\activate
   ```
2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```
3. **(Optional) Seed Development Data**:
   ```powershell
   python seed.py
   ```
   *Creates pre-populated CEO (`ceo@hireproof.ai`), HR (`hr@hireproof.ai`), and Candidate (`candidate@hireproof.ai`), with password `HireProof2026!`.*

---

## 8. Running the Backend
Run the development server using `uvicorn`:
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc Documentation: `http://127.0.0.1:8000/redoc`

---

## 9. API Endpoints Summary

### Authentication (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/ceo/register` | Register CEO and Company (triggers OTP) |
| `POST` | `/auth/candidate/register` | Register Candidate (triggers OTP) |
| `POST` | `/auth/verify-email` | Verify email with OTP |
| `POST` | `/auth/login` | Login and obtain JWT token |

### CEO Management (`/ceo`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/ceo/company` | View CEO's company details |
| `POST` | `/ceo/departments` | Create department in company |
| `GET` | `/ceo/departments` | List company departments |
| `PUT` | `/ceo/departments/{id}` | Update department name |
| `DELETE` | `/ceo/departments/{id}` | Remove department |
| `POST` | `/ceo/hr` | Create HR account assigned to department |
| `GET` | `/ceo/hr` | List HR team members in company |
| `GET` | `/ceo/hr/{id}` | Get HR profile details |

### HR Management (`/hr`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/hr/profile` | HR profile information |
| `GET` | `/hr/dashboard` | Dashboard metrics (vacancies, applicants) |
| `POST` | `/hr/vacancies` | Create job vacancy with structured requirements |
| `GET` | `/hr/vacancies` | List vacancies in company |
| `GET` | `/hr/vacancies/{id}` | Get vacancy details |
| `POST` | `/hr/vacancies/{id}/publish` | Publish vacancy |
| `GET` | `/hr/vacancies/{id}/applications` | View candidates who applied to vacancy |
| `GET` | `/hr/applications/{id}/analysis` | View AI evidence analysis & audit trail |
| `POST` | `/hr/applications/{id}/challenge` | Submit human override / challenge |
| `PUT` | `/hr/applications/{id}/status` | Update status (`SHORTLISTED`, `SELECTED`, etc.) |
| `POST` | `/hr/applications/{id}/feedback` | Attach candidate feedback |

### Public & Candidate Portal
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/companies` | Public list of registered companies |
| `GET` | `/companies/{id}/vacancies` | Published vacancies for company |
| `GET` | `/candidate/profile` | View candidate profile |
| `PUT` | `/candidate/profile` | Update GitHub, LinkedIn, or name |
| `POST` | `/candidate/applications` | Apply for job with PDF/DOCX resume upload |
| `GET` | `/candidate/applications` | Track candidate's submitted applications |
| `GET` | `/candidate/applications/{id}` | View candidate application details |
| `GET` | `/candidate/applications/{id}/feedback` | View candidate's feedback |

### AI Reasoning & Verification (`/ai`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/applications/{id}/analyze` | Run/rerun AI analysis & evidence extraction |
| `GET` | `/ai/applications/{id}/evidence-graph` | Fetch graph-friendly JSON (nodes & edges) |
| `POST` | `/ai/applications/{id}/requirements/{req_id}/prove` | Determine verification method |
| `POST` | `/ai/verification/challenge` | Generate scenario-based challenge |
| `POST` | `/ai/verification/interview-question` | Generate technical interview question |
| `POST` | `/ai/verification/evaluate` | Evaluate candidate response & update status |
| `GET` | `/ai/applications/{id}/final-analysis` | Get complete explainable audit report |

---

## 10. Core AI Innovation & Verification Rules
1. **Never Invent Credentials**: The AI only matches against text factually present in the resume.
2. **Missing Evidence ≠ Gap**: If a resume does not mention AWS, its status is `UNVERIFIED`, never `GAP`.
3. **Interactive Verification**: Candidates with `UNVERIFIED` skills can complete targeted challenges or interview questions to prove their skill.
4. **Audit Immutability**: When an `UNVERIFIED` skill transitions to `VERIFIED` via strong evidence, the original state, the question, the candidate's answer, and AI reasoning are preserved in `verification_history`.
5. **Human Override**: HR can challenge any AI decision; overrides are stored in `hr_challenges` preserving the human reviewer's identity and justification.

---

## 11. Testing Instructions
Run the automated pytest suite:
```powershell
pytest -v
```
All 10 test suites validate:
- CEO & Candidate Registration + OTP Verification
- Role-based Authorization & Cross-tenant isolation
- Vacancy creation, publishing, and public discovery
- Application submission, resume upload, duplicate prevention
- AI evidence extraction, matching states, and graph generation
- Skill verification question generation and answer evaluation
- HR challenge overrides and candidate feedback tracking
