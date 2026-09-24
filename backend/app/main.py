import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.core.config import settings
from app.database.database import init_db
from app.routers import auth, ceo, hr, candidate, ai

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("hireproof-ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    logger.info(f"Database URL configured: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    # Shutdown
    logger.info("Shutting down HireProof AI backend.")

app = FastAPI(
    title=f"{settings.PROJECT_NAME} - Backend API",
    description="""
# HireProof AI
**"Don't Just Match. Prove. Verify. Explain."**

An advanced, evidence-grounded AI hiring backend that replaces unverified keyword matching with verified proof, explainable reasoning graphs, interactive skill challenges, and auditable human overrides.

### Core Workflows:
* **Authentication**: Multi-role registration (CEO, Candidate), email OTP verification, JWT session tokens.
* **CEO Management**: Company setup, departmental hierarchy, and secure HR staff creation.
* **HR Vacancy Hub**: Structured requirement parsing, job publishing, applicant tracking, and override challenges.
* **Candidate Portal**: Profile management, public company browsing, resume upload (PDF/DOCX), and feedback tracking.
* **GenAI Engine**: Factual evidence extraction, requirement matching (VERIFIED, PARTIAL, UNVERIFIED, GAP), Evidence Knowledge Graphs, and AI Verification Challenges.
""",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error for {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": "The request body or parameters failed validation.",
            "details": exc.errors()
        }
    )

# Include Routers
app.include_router(auth.router)
app.include_router(ceo.router)
app.include_router(hr.router)
app.include_router(candidate.router)
app.include_router(ai.router)

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "docs": "/docs"
    }
