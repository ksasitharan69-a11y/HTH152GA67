import os
import json
import time
import re
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Literal, Tuple, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.database.models import (
    Application, Assessment, AssessmentStatus, ApplicationStatus,
    MatchStatus, JobRequirement, MatchResult
)

logger = logging.getLogger(__name__)

def utc_now():
    return datetime.now(timezone.utc)

# -------------------------------------------------------------
# 1. Pydantic Schemas for Strict Engine Validation
# -------------------------------------------------------------

class BugFinding(BaseModel):
    description: str = Field(..., min_length=10)
    impact: str = Field(..., min_length=10)
    expected_candidate_response: str = Field(..., min_length=10)

class InterviewSheet(BaseModel):
    drill_down_questions: List[str] = Field(..., min_length=2, max_length=5)
    broken_code_snippet: str = Field(..., min_length=20)
    answer_key: Dict[str, BugFinding]

class ScoreComponent(BaseModel):
    score: int = Field(..., ge=0, le=100)
    notes: str = Field(..., min_length=5)

class BugComponent(ScoreComponent):
    identified: bool

class AuditFindings(BaseModel):
    resume_authenticity: ScoreComponent
    error_handling_bug: BugComponent
    concurrency_race_condition: BugComponent

class AuditReport(BaseModel):
    total_score: int = Field(..., ge=0, le=100)
    verdict: Literal["STRONG HIRE", "BORDERLINE", "REJECT"]
    findings_breakdown: AuditFindings
    audit_justification: str = Field(..., min_length=20)


# -------------------------------------------------------------
# 2. Assessment Engine Core Service
# -------------------------------------------------------------

class AssessmentService:
    """
    Canonical Candidate Assessment and Skill Verification Engine.
    Generates targeted drill-down questions, production broken-code challenges,
    and conducts rigorous rubric-based grading.
    """

    def __init__(self):
        self._client = None
        self._init_client()

    def _init_client(self):
        api_key = settings.get_gemini_key()
        if api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI Client: {e}")
                self._client = None
        else:
            self._client = None

    @property
    def client(self):
        if self._client is None:
            self._init_client()
        return self._client

    @staticmethod
    def clean_json_response(raw_text: str) -> str:
        """Strips Markdown wrappers, whitespace, or code blocks safely."""
        raw_text = raw_text.strip()
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw_text)
        if match:
            return match.group(1).strip()
        return raw_text

    def execute_with_resilience(
        self,
        prompt: str,
        system_instruction: str,
        expected_model: type[BaseModel],
        max_retries: int = 3
    ) -> Optional[BaseModel]:
        """Executes prompt across available Gemini models with exponential backoff."""
        if not self.client:
            return None

        from google.genai import types
        from google.genai.errors import ServerError, ClientError, APIError

        models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]

        for attempt in range(max_retries):
            for model_name in models:
                try:
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            response_mime_type="application/json",
                            temperature=0.1
                        )
                    )

                    if not response.text:
                        continue

                    cleaned_json = self.clean_json_response(response.text)
                    parsed_data = json.loads(cleaned_json)
                    return expected_model(**parsed_data)

                except (ServerError, APIError):
                    continue
                except (json.JSONDecodeError, ValidationError):
                    time.sleep(1)
                    continue
                except ClientError as e:
                    logger.warning(f"Google GenAI ClientError: {e}")
                    return None
                except Exception as e:
                    logger.warning(f"Error invoking model {model_name}: {e}")
                    continue

            time.sleep(2 ** attempt)

        return None

    # -------------------------------------------------------------
    # Deterministic Fallbacks for Offline / CI Execution
    # -------------------------------------------------------------

    @staticmethod
    def _deterministic_generate_interview(job_desc: str, resume: str, gaps: str) -> InterviewSheet:
        """High-quality deterministic fallback ensuring tests and offline runs succeed."""
        tech_indicators = ["python", "node", "javascript", "react", "fastapi", "sql", "postgresql", "docker"]
        detected = [t for t in tech_indicators if t in (job_desc + " " + resume).lower()]
        primary_tech = detected[0].capitalize() if detected else "Backend"

        questions = [
            f"Explain the concrete architectural decisions you made when implementing your {primary_tech} services and how you handled high throughput.",
            f"Regarding your experience with {gaps or 'distributed transactions'}, how do you prevent data inconsistency across microservice boundaries?",
            f"Describe an instance where a production system failed unexpectedly under your watch. What was the root cause and how did you debug it?"
        ]

        broken_code = (
            "async function processPaymentAndOrder(userId, cartItems) {\n"
            "  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);\n"
            "  // Flaw 1: No concurrency locking / race condition check on stock\n"
            "  for (const item of cartItems) {\n"
            "    const stock = await db.getStock(item.id);\n"
            "    if (stock < item.quantity) return { error: 'Out of stock' };\n"
            "    await db.updateStock(item.id, stock - item.quantity);\n"
            "  }\n"
            "  // Flaw 2: Missing try/catch and non-atomic payment transaction\n"
            "  const paymentResult = await paymentGateway.charge(userId, total);\n"
            "  await db.createOrder(userId, cartItems, paymentResult.transactionId);\n"
            "  return { success: true };\n"
            "}"
        )

        answer_key = {
            "bug_1_concurrency": BugFinding(
                description="Time-of-check to time-of-use (TOCTOU) race condition in stock decrement without atomic operations or transactions.",
                impact="Multiple concurrent buyers can purchase the same remaining inventory item, causing overselling and data corruption.",
                expected_candidate_response="Candidate should recommend database row-level locking (SELECT FOR UPDATE) or atomic conditional decrements (e.g. UPDATE stock WHERE stock >= quantity)."
            ),
            "bug_2_error_handling": BugFinding(
                description="Missing try/catch error handling and unmanaged rollback if payment succeeds but order insertion fails.",
                impact="Customer gets charged their money but no order record is committed, or vice versa on uncaught payment exception.",
                expected_candidate_response="Candidate must suggest wrapping operations in a database transaction and handling payment refund/idempotency in a catch block."
            )
        }

        return InterviewSheet(
            drill_down_questions=questions,
            broken_code_snippet=broken_code,
            answer_key=answer_key
        )

    @staticmethod
    def _deterministic_grade_candidate(sheet: InterviewSheet, candidate_answers: dict) -> AuditReport:
        """Deterministic rubric evaluation when LLM key is unconfigured."""
        drill_answers = candidate_answers.get("drill_down_responses", {})
        code_answer = str(candidate_answers.get("code_review_response", "")).lower()

        # Check answers length and technical depth
        drill_len = sum(len(str(v)) for v in drill_answers.values()) if isinstance(drill_answers, dict) else len(str(drill_answers))
        
        # Bug 1 keywords: atomic, race, toctou, lock, transaction, concurrent
        caught_race = any(k in code_answer for k in ["race", "atomic", "lock", "concurren", "oversell", "toctou", "isolation"])
        
        # Bug 2 keywords: try, catch, exception, error, rollback, refund, crash
        caught_error = any(k in code_answer for k in ["try", "catch", "rollback", "error", "exception", "refund", "crash", "acid"])

        resume_score = min(100, max(40, 50 + min(40, int(drill_len / 10))))

        bug1_score = 90 if caught_race else 30
        bug2_score = 90 if caught_error else 30

        total = int((resume_score * 0.3) + (bug1_score * 0.35) + (bug2_score * 0.35))

        if caught_race and caught_error and total >= 75:
            verdict = "STRONG HIRE"
            justification = "Candidate demonstrated exceptional production depth, catching both the concurrency race condition and transactional error vulnerability."
        elif (caught_race or caught_error) and total >= 50:
            verdict = "BORDERLINE"
            justification = "Candidate recognized core engineering flaws but missed either transactional rollback or multi-user concurrency edge cases."
        else:
            verdict = "REJECT"
            justification = "Candidate failed to identify critical production bugs in the code challenge and provided insufficient technical depth on resume claims."

        return AuditReport(
            total_score=total,
            verdict=verdict,
            findings_breakdown=AuditFindings(
                resume_authenticity=ScoreComponent(score=resume_score, notes="Evaluated based on technical specificity of claimed implementations."),
                error_handling_bug=BugComponent(score=bug2_score, identified=caught_error, notes="Checked identification of unhandled payment exceptions and rollbacks."),
                concurrency_race_condition=BugComponent(score=bug1_score, identified=caught_race, notes="Checked identification of inventory overselling TOCTOU vulnerability.")
            ),
            audit_justification=justification
        )

    # -------------------------------------------------------------
    # Public Generation & Evaluation Methods
    # -------------------------------------------------------------

    def generate_assessment_for_application(
        self,
        application_id: int,
        db: Session
    ) -> Assessment:
        """
        Generates an assessment tailored to the candidate's application,
        resume claims, and identified gaps. Persists into DB.
        """
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")

        # Check existing assessment
        existing = db.query(Assessment).filter(Assessment.application_id == application.id).first()
        if existing and existing.status in [AssessmentStatus.PENDING, AssessmentStatus.EVALUATED]:
            return existing

        vacancy = application.vacancy
        job_description = f"{vacancy.title}\n{vacancy.description}\nRequired: {', '.join(vacancy.required_skills)}"
        resume_details = application.sanitized_resume_text or application.extracted_resume_text or ""

        # Identify gaps from match results
        gaps = []
        for mr in application.match_results:
            if mr.status in [MatchStatus.UNVERIFIED, MatchStatus.PARTIAL, MatchStatus.GAP]:
                req_txt = mr.requirement.requirement_text if mr.requirement else "Specific Qualification"
                gaps.append(f"{req_txt} ({mr.status.value})")
        gaps_str = "; ".join(gaps) if gaps else "Validate architectural scaling and error handling."

        # Prompt for LLM
        prompt = f"""
        Job Description:
        {job_description[:3000]}

        Candidate Resume Claims:
        {resume_details[:3000]}

        Identified Skill Gaps to Probe:
        {gaps_str}

        Output JSON strictly matching:
        - drill_down_questions: 3 deep questions verifying implementation details of resume claims.
        - broken_code_snippet: 15-25 lines of realistic production code matching candidate stack with 2 intentional production bugs.
        - answer_key: dictionary of the 2 bugs with description, impact, and expected_candidate_response.
        """
        system_instruction = "You are an expert technical interviewer and auditor. Output valid JSON strictly adhering to schema."

        sheet = self.execute_with_resilience(prompt, system_instruction, InterviewSheet)
        if not sheet:
            sheet = self._deterministic_generate_interview(job_description, resume_details, gaps_str)

        # Persist Assessment
        if existing:
            db.delete(existing)
            db.commit()

        assessment = Assessment(
            application_id=application.id,
            drill_down_questions=sheet.drill_down_questions,
            broken_code_snippet=sheet.broken_code_snippet,
            answer_key={k: v.model_dump() for k, v in sheet.answer_key.items()},
            status=AssessmentStatus.PENDING
        )
        db.add(assessment)
        application.status = ApplicationStatus.ASSESSMENT
        db.commit()
        db.refresh(assessment)
        return assessment

    def evaluate_candidate_submission(
        self,
        application_id: int,
        candidate_answers: dict,
        db: Session
    ) -> Assessment:
        """
        Grades candidate submitted answers against the stored answer key.
        Saves scores, verdict, breakdown, and audit justification.
        """
        assessment = db.query(Assessment).filter(Assessment.application_id == application_id).first()
        if not assessment:
            raise HTTPException(status_code=404, detail="Assessment not found for this application.")

        if not candidate_answers or not isinstance(candidate_answers, dict):
            raise HTTPException(status_code=400, detail="Candidate answers must be a non-empty dictionary.")

        sheet = InterviewSheet(
            drill_down_questions=assessment.drill_down_questions,
            broken_code_snippet=assessment.broken_code_snippet,
            answer_key={k: BugFinding(**v) for k, v in assessment.answer_key.items()}
        )

        prompt = f"""
        ### Test Questions and Grounded Answer Key:
        {sheet.model_dump_json(indent=2)}

        ### Candidate's Submitted Responses:
        {json.dumps(candidate_answers, indent=2)}

        Score candidate strictly on accuracy and identify if both bugs were caught.
        Output JSON with total_score (0-100), verdict (STRONG HIRE, BORDERLINE, REJECT), findings_breakdown, and audit_justification.
        """
        system_instruction = "You are an impartial HR technical auditor. Output valid JSON adhering strictly to the schema."

        report = self.execute_with_resilience(prompt, system_instruction, AuditReport)
        if not report:
            report = self._deterministic_grade_candidate(sheet, candidate_answers)

        # Update Assessment in DB
        assessment.candidate_answers = candidate_answers
        assessment.score = report.total_score
        assessment.verdict = report.verdict
        assessment.findings_breakdown = report.findings_breakdown.model_dump()
        assessment.audit_justification = report.audit_justification
        assessment.status = AssessmentStatus.EVALUATED
        assessment.evaluated_at = utc_now()

        # Update Application status if evaluated
        application = assessment.application
        if application:
            if report.verdict == "STRONG HIRE":
                application.status = ApplicationStatus.SHORTLISTED
            elif report.verdict == "BORDERLINE":
                application.status = ApplicationStatus.UNDER_REVIEW

        db.commit()
        db.refresh(assessment)
        return assessment

assessment_service = AssessmentService()
