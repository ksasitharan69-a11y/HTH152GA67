# engine.py
# ============================================================
# HireProof AI
# Enterprise Compliance & Forensic Candidate-Role Fit Engine
# ============================================================

import os
import re
import json
import io
from typing import Any, Dict, List, Tuple

import pypdf
from dotenv import load_dotenv
from openai import OpenAI


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY not found. Please check your .env file."
    )


# ============================================================
# GEMINI MODEL CONFIGURATION
# ============================================================

MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite"
)


# ============================================================
# GOOGLE GEMINI CLIENT
# ============================================================

client = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url=(
        "https://generativelanguage.googleapis.com/v1beta/openai/"
    ),
    default_headers={
        "x-goog-api-client":
            "hireproof-compliance-engine/1.0"
    }
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_VERDICTS = {
    "SHORTLIST",
    "REVIEW",
    "REJECT"
}

ALLOWED_REQUIREMENT_STATUSES = {
    "MET",
    "PARTIAL",
    "UNMET"
}

ALLOWED_CRITICALITY = {
    "CRITICAL_MUST_HAVE",
    "NICE_TO_HAVE"
}

ALLOWED_EVIDENCE_DEPTH = {
    "PRODUCTION_PROVEN",
    "SURFACE_LEVEL",
    "NONE"
}


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_whitespace(text: str) -> str:
    """
    Normalize whitespace while preserving the actual words.

    Used for deterministic citation verification.
    """

    if not text:
        return ""

    return " ".join(
        str(text).split()
    )


# ============================================================
# TEXT SANITIZATION
# ============================================================

def sanitize_text(
    text: str
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Removes potentially sensitive information from the resume
    before sending it to Gemini.

    Redacts:
        - Email addresses
        - Phone numbers
        - Graduation/calendar years

    Returns:
        sanitized_text
        audit_log
    """

    if not text:
        return "", []

    audit_log: List[Dict[str, Any]] = []


    # --------------------------------------------------------
    # 1. Email Addresses
    # --------------------------------------------------------

    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'

    emails = re.findall(
        email_pattern,
        text
    )

    if emails:

        audit_log.append({
            "category": "Email / Contact",
            "redacted_count": len(emails),
            "reason": "PII protection"
        })

        text = re.sub(
            email_pattern,
            "[REDACTED_EMAIL]",
            text
        )


    # --------------------------------------------------------
    # 2. Phone Numbers
    # --------------------------------------------------------

    phone_pattern = (
        r'(\+?\d{1,3}[-.\s]?)?'
        r'(\(?\d{3}\)?[-.\s]?)?'
        r'\d{3}[-.\s]?\d{4}'
    )

    phones = re.findall(
        phone_pattern,
        text
    )

    if phones:

        audit_log.append({
            "category": "Phone Number",
            "redacted_count": len(phones),
            "reason": "PII elimination"
        })

        text = re.sub(
            phone_pattern,
            "[REDACTED_PHONE]",
            text
        )


    # --------------------------------------------------------
    # 3. Graduation / Calendar Years
    # --------------------------------------------------------

    year_pattern = r'\b(19\d{2}|20\d{2})\b'

    years = re.findall(
        year_pattern,
        text
    )

    if years:

        audit_log.append({
            "category": "Graduation / Calendar Year",
            "redacted_count": len(years),
            "reason":
                "Age discrimination and proxy elimination"
        })

        text = re.sub(
            year_pattern,
            "[YEAR]",
            text
        )


    return text, audit_log


# ============================================================
# JSON EXTRACTION
# ============================================================

def extract_clean_json(
    raw_text: str
) -> Dict[str, Any]:
    """
    Safely extracts a JSON object from Gemini output.

    Handles:
        - Raw JSON
        - ```json ... ```
        - Extra text before/after JSON
    """

    if raw_text is None:
        raise ValueError(
            "Gemini returned an empty response."
        )

    text = str(raw_text).strip()

    if not text:
        raise ValueError(
            "Gemini returned an empty response."
        )


    # Remove Markdown code fences

    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"\s*```$",
        "",
        text
    ).strip()


    # Find JSON object

    start = text.find("{")
    end = text.rfind("}")


    if start == -1 or end == -1 or end < start:

        raise ValueError(
            "No valid JSON object found in Gemini response."
        )


    json_text = text[
        start:end + 1
    ]


    try:

        parsed = json.loads(
            json_text
        )

    except json.JSONDecodeError as error:

        raise ValueError(
            "Gemini returned invalid JSON.\n\n"
            f"Raw response:\n{raw_text}"
        ) from error


    if not isinstance(
        parsed,
        dict
    ):

        raise ValueError(
            "Gemini JSON response must be an object."
        )


    return parsed


# ============================================================
# GEMINI API HELPER
# ============================================================

def call_gemini(
    prompt: str,
    temperature: float = 0.1
) -> str:
    """
    Centralized Gemini API call.
    """

    try:

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=temperature
        )

    except Exception as error:

        raise RuntimeError(
            "Gemini API request failed.\n"
            f"Model: {MODEL_NAME}\n"
            f"Error: {error}"
        ) from error


    try:

        content = (
            response
            .choices[0]
            .message
            .content
        )

    except (
        AttributeError,
        IndexError,
        TypeError
    ) as error:

        raise RuntimeError(
            "Gemini returned an unexpected response structure."
        ) from error


    if not content:

        raise RuntimeError(
            "Gemini returned an empty response."
        )


    return content


# ============================================================
# PDF RESUME TEXT EXTRACTION
# ============================================================

def extract_text_from_pdf(
    file_bytes: bytes
) -> str:
    """
    Extract raw text from an uploaded PDF resume.
    """

    if not file_bytes:

        raise ValueError(
            "The uploaded PDF is empty."
        )


    try:

        pdf_reader = pypdf.PdfReader(
            io.BytesIO(file_bytes)
        )

    except Exception as error:

        raise ValueError(
            "Unable to read the uploaded PDF."
        ) from error


    extracted_text: List[str] = []


    for page in pdf_reader.pages:

        try:

            page_text = page.extract_text()

        except Exception:

            page_text = None


        if page_text:

            extracted_text.append(
                page_text
            )


    final_text = "\n".join(
        extracted_text
    ).strip()


    if not final_text:

        raise ValueError(
            "No readable text was found in the PDF. "
            "The resume may be image-based or scanned."
        )


    return final_text


# ============================================================
# RESUME SKILL EXTRACTION
# ============================================================

def extract_main_skills(
    resume_text: str
) -> Dict[str, Any]:
    """
    Extract primary technical skills demonstrated
    in the resume.
    """

    if not resume_text or not resume_text.strip():

        raise ValueError(
            "Resume text cannot be empty."
        )


    sanitized_resume, _ = sanitize_text(
        resume_text
    )


    prompt = f"""
You are a Lead Technical Recruiter.

Analyze this sanitized candidate resume.

Extract ONLY the primary, concrete technical skills
demonstrated through real projects, engineering work,
internships, or professional roles.

Ignore:

- Soft skills
- Generic buzzwords
- Superficial technology mentions
- Technologies with no supporting evidence
- Technologies mentioned only in a generic skills list
  without practical evidence

Return ONLY valid raw JSON matching this exact schema:

{{
    "candidate_name":
        "Full name or Candidate ID if present",

    "primary_domain":
        "Backend Engineering | Data Engineering | Cloud DevOps | Frontend Engineering | AI/ML | Other",

    "core_languages_frameworks":
        ["Python", "FastAPI"],

    "databases_datastores":
        ["PostgreSQL", "Redis"],

    "cloud_devops":
        ["Docker", "AWS", "Kubernetes"],

    "specialized_tools":
        ["Apache Kafka", "Spark"],

    "seniority_level_inferred":
        "JUNIOR | MID | SENIOR | LEAD"
}}

Rules:

1. Use ONLY information present in the resume.
2. Do not invent skills.
3. A technology should be included only when
   the resume provides meaningful evidence of its use.
4. Ignore a technology if it is only mentioned
   as a generic buzzword.
5. Return raw JSON only.
6. Do not use Markdown.
7. Do not return ```json.

SANITIZED RESUME:

{sanitized_resume}
"""


    raw_content = call_gemini(
        prompt,
        temperature=0.1
    )


    return extract_clean_json(
        raw_content
    )


# ============================================================
# SCREEN RESUME AGAINST JOB DESCRIPTION
# ============================================================

def extract_jd_requirements(jd_text: str) -> List[str]:
    """Extract explicit numbered/bulleted requirements from a JD.

    This deterministic step prevents the model from silently dropping a JD
    requirement during screening or audit.
    """
    if not jd_text or not jd_text.strip():
        return []

    requirements = []
    for line in jd_text.splitlines():
        line = line.strip()
        if not line:
            continue
        numbered = re.match(r"^\s*\d+[.)]\s*(.+)$", line)
        if numbered:
            requirements.append(numbered.group(1).strip())
            continue
        bullet = re.match(r"^\s*[-*•]\s*(.+)$", line)
        if bullet:
            requirements.append(bullet.group(1).strip())

    # If the JD contains a single requirement without numbering, keep it.
    if not requirements:
        lines = [x.strip() for x in jd_text.splitlines() if x.strip()]
        for line in lines:
            if line.lower().startswith(("role:", "title:", "position:")):
                continue
            requirements.append(line)

    return requirements


def _norm_requirement(text: str) -> str:
    """Normalize requirement text for deterministic matching."""
    return re.sub(r"[^a-z0-9]+", " ", str(text).lower()).strip()


def _requirement_similarity(a: str, b: str) -> float:
    """Simple token-overlap similarity; used only to align AI output to JD text."""
    aa = set(_norm_requirement(a).split())
    bb = set(_norm_requirement(b).split())
    if not aa or not bb:
        return 0.0
    return len(aa & bb) / max(1, len(aa | bb))


def _reconcile_requirements(report_data: Dict[str, Any], jd_text: str) -> None:
    """Ensure every explicit JD requirement exists exactly once in the audit."""
    jd_requirements = extract_jd_requirements(jd_text)
    ai_requirements = report_data.get("requirements", [])
    if not isinstance(ai_requirements, list):
        ai_requirements = []

    reconciled = []
    used = set()

    for index, jd_req in enumerate(jd_requirements, start=1):
        best_index = None
        best_score = 0.0
        for ai_index, ai_req in enumerate(ai_requirements):
            if ai_index in used or not isinstance(ai_req, dict):
                continue
            ai_text = str(ai_req.get("requirement_text", "")).strip()
            if not ai_text:
                continue
            score = _requirement_similarity(jd_req, ai_text)
            if score > best_score:
                best_score = score
                best_index = ai_index

        if best_index is not None and best_score >= 0.25:
            req = dict(ai_requirements[best_index])
            used.add(best_index)
            # Preserve the exact JD requirement for audit traceability.
            req["requirement_text"] = jd_req
        else:
            req = {
                "requirement_id": f"REQ-{index:02d}",
                "requirement_text": jd_req,
                "criticality": "CRITICAL_MUST_HAVE",
                "status": "UNMET",
                "evidence_depth": "NONE",
                "verbatim_quote": "None",
                "gap_reasoning": "No supporting evidence was returned for this explicit JD requirement.",
                "interview_question": "What specific implementation work have you done that directly satisfies this requirement?",
                "eval_rubric_good": "Provides concrete implementation details, responsibilities, tradeoffs, and operational evidence tied to the requirement.",
                "eval_rubric_poor": "Provides only a keyword, definition, or unsupported claim without implementation evidence.",
                "citation_verified": True,
            }

        req["requirement_id"] = f"REQ-{index:02d}"
        # The current JDs list requirements under the Requirements section;
        # unless the model has explicitly identified a nice-to-have, preserve
        # the JD as mandatory for screening accuracy.
        # Explicit numbered/bulleted JD requirements are treated as mandatory
        # for the screening stage. Optional requirements should be written as
        # optional in the JD rather than inferred by the model.
        req["criticality"] = "CRITICAL_MUST_HAVE"
        reconciled.append(req)

    # Do not silently discard AI-generated requirements, but place them after
    # the explicit JD requirements and mark them as non-critical additions.
    for ai_index, ai_req in enumerate(ai_requirements):
        if ai_index not in used and isinstance(ai_req, dict):
            extra = dict(ai_req)
            extra["criticality"] = "NICE_TO_HAVE"
            extra["requirement_id"] = f"REQ-{len(reconciled) + 1:02d}"
            reconciled.append(extra)

    report_data["requirements"] = reconciled


def _derive_screening_from_audit(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """Derive the screening result deterministically from the forensic audit."""
    requirements = report_data.get("requirements", [])
    if not requirements:
        return {
            "verdict": "REVIEW",
            "match_score_pct": 0,
            "matched_skills": [],
            "missing_skills_gaps": [],
            "screening_basis": "No explicit JD requirements could be established.",
        }

    weighted_total = 0.0
    weighted_earned = 0.0
    matched = []
    gaps = []
    critical_unmet = 0
    critical_partial = 0

    for req in requirements:
        status = str(req.get("status", "UNMET")).upper()
        criticality = str(req.get("criticality", "CRITICAL_MUST_HAVE")).upper()
        weight = 2.0 if criticality == "CRITICAL_MUST_HAVE" else 1.0
        weighted_total += weight

        if status == "MET":
            weighted_earned += weight
            matched.append(req.get("requirement_text", "Requirement satisfied"))
        elif status == "PARTIAL":
            weighted_earned += weight * 0.5
            gaps.append(f"Partial: {req.get('requirement_text', 'Requirement')}")
            if criticality == "CRITICAL_MUST_HAVE":
                critical_partial += 1
        else:
            gaps.append(f"Missing: {req.get('requirement_text', 'Requirement')}")
            if criticality == "CRITICAL_MUST_HAVE":
                critical_unmet += 1

    score = round((weighted_earned / weighted_total) * 100) if weighted_total else 0

    if critical_unmet > 0:
        verdict = "REJECT"
        basis = f"{critical_unmet} mandatory requirement(s) lack sufficient evidence."
    elif critical_partial > 0:
        verdict = "REVIEW"
        basis = f"{critical_partial} mandatory requirement(s) have only partial evidence and require human verification."
    else:
        verdict = "SHORTLIST"
        basis = "All mandatory requirements have verified supporting evidence in the resume."

    return {
        "verdict": verdict,
        "match_score_pct": score,
        "matched_skills": matched,
        "missing_skills_gaps": gaps,
        "screening_basis": basis,
    }


def screen_resume_against_jd(
    resume_text: str,
    jd_text: str
) -> Dict[str, Any]:
    """Perform evidence-first screening by running the deep audit once.

    The result is derived from requirement-level evidence rather than asking
    Gemini for an unconstrained overall score. The complete forensic report is
    returned so the UI can reuse it without performing a second AI audit.
    """
    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text cannot be empty.")
    if not jd_text or not jd_text.strip():
        raise ValueError("Job description cannot be empty.")

    report_data, sanitized_resume, redaction_log = evaluate_fit(
        resume_text,
        jd_text
    )

    derived = _derive_screening_from_audit(report_data)

    candidate_name = report_data.get("candidate_name", "Unknown Candidate")
    extracted_skills = report_data.get("extracted_main_skills", [])
    if not isinstance(extracted_skills, list):
        extracted_skills = []

    # Screening status is intentionally deterministic and based on the audit,
    # not on the model's independent overall_fit_status.
    report_data["overall_fit_status"] = derived["verdict"]
    report_data["screening_match_score_pct"] = derived["match_score_pct"]
    report_data["screening_basis"] = derived["screening_basis"]

    return {
        "candidate_name": candidate_name,
        "domain_role": report_data.get("primary_domain", report_data.get("domain_role", "Unknown")),
        "verdict": derived["verdict"],
        "match_score_pct": derived["match_score_pct"],
        "matched_skills": derived["matched_skills"],
        "missing_skills_gaps": derived["missing_skills_gaps"],
        "main_skills_extracted": extracted_skills,
        "evaluation_summary": report_data.get(
            "brief_explanation",
            report_data.get("candidate_summary", "No explanation returned.")
        ),
        "brief_explanation": report_data.get(
            "brief_explanation",
            report_data.get("candidate_summary", "No explanation returned.")
        ),
        "screening_basis": derived["screening_basis"],
        "sanitized_text": sanitized_resume,
        "redaction_log": redaction_log,
        "raw_text": resume_text,
        "forensic_report": report_data,
    }


def evaluate_fit(
    resume_text: str,
    jd_text: str
) -> tuple[dict, str, list[dict]]:
    """
    Perform a deep forensic audit of one resume against one JD.

    Returns:
        report_data
        sanitized_resume
        redaction_log
    """

    # ============================================================
    # STEP 1 — SANITIZE RESUME
    # ============================================================

    sanitized_resume, redaction_log = sanitize_text(
        resume_text
    )

    jd_requirements = extract_jd_requirements(jd_text)
    if not jd_requirements:
        raise ValueError("The Job Description does not contain any explicit requirements to audit.")


    # ============================================================
    # STEP 2 — BUILD FORENSIC AUDIT PROMPT
    # ============================================================

    prompt = f"""
You are an uncompromising, skeptical Technical Compliance Auditor
inspecting candidate claims for job-related evidence and audit
defensibility.

Your job is NOT to guess whether a candidate is good.

Your job is to determine whether the resume contains sufficient
documented evidence for the requirements in the Job Description.

============================================================
AUDIT PRINCIPLES
============================================================

1. SKEPTICAL INFERENCE

NEVER assume knowledge or experience.

If a candidate lists:

"Java, Spring Boot, PostgreSQL"

in a generic skills section but nowhere describes building,
deploying, maintaining, testing, scaling, or operating systems
using those technologies, do NOT treat that as production proof.

Use:

PARTIAL + SURFACE_LEVEL

or

UNMET + NONE

depending on the requirement.

------------------------------------------------------------

2. CONCRETE EVIDENCE

"MET" requires explicit evidence of real-world implementation,
architecture, engineering responsibility, or operational usage.

Examples of stronger evidence:

- built
- developed
- implemented
- deployed
- maintained
- optimized
- designed
- integrated
- monitored
- scaled
- configured
- migrated
- debugged
- automated

A bare technology name is NOT sufficient proof of production
experience.

------------------------------------------------------------

3. PRECISE CITATION

For MET or PARTIAL:

"verbatim_quote" MUST be a direct continuous substring from
the SANITIZED RESUME.

The quote should normally contain at least 4 words and provide
actual contextual evidence.

For UNMET:

"verbatim_quote" MUST be exactly:

"None"

Do not invent, paraphrase, reconstruct, or combine separate
sentences into a quote.

------------------------------------------------------------

4. NO BENEFIT OF THE DOUBT

Example:

JD:
"PostgreSQL query profiling and indexing"

Resume:
"Worked with PostgreSQL databases."

This does NOT prove profiling or indexing.

Possible result:

PARTIAL
SURFACE_LEVEL

or:

UNMET
NONE

depending on the rest of the evidence.

------------------------------------------------------------

5. EXPERIENCE YEARS

Do not infer years of experience.

If the JD requires:

"3+ years of Python experience"

and the resume only says:

"Python developer"

do NOT assume 3 years.

Only use an explicit duration if the resume actually provides
supporting evidence.

------------------------------------------------------------

6. CERTIFICATIONS

A certification does not automatically prove production
experience.

Example:

"Certified Kubernetes Administrator"

does not automatically prove:

"3 years of production Kubernetes operations."

------------------------------------------------------------

7. PROJECT EVIDENCE

Academic, personal, internship, freelance and professional
projects may be evidence of implementation.

However, do not automatically classify them as professional
production experience unless the resume explicitly supports
that interpretation.

------------------------------------------------------------

8. REQUIREMENT PRESERVATION

Extract requirements from the JD faithfully.

Do NOT invent requirements that are not present in the JD.

Do NOT silently add technologies merely because they are common
for the role.

------------------------------------------------------------

9. PROTECTED / PERSONAL ATTRIBUTES

Do NOT use:

- age
- gender
- religion
- ethnicity
- race
- nationality
- marital status
- disability
- health information
- photograph
- home address
- personal contact information
- graduation year
- other protected or personal characteristics

The evaluation must be based only on job-related qualifications
and evidence.

------------------------------------------------------------

10. SCORE MEANING

"compliance_defensibility_score" is NOT a score of the person's
value.

It represents how well the evaluation is supported by explicit,
traceable resume evidence.

A high score means stronger evidence traceability.

A low score means more ambiguity, unsupported claims, missing
citations, or incomplete evidence.

------------------------------------------------------------

11. CANDIDATE SUMMARY

"candidate_summary" must be exactly TWO concise sentences.

Sentence 1:
Describe the strongest job-related evidence.

Sentence 2:
Describe the most important missing or insufficient evidence.

Do not use personal characteristics.

------------------------------------------------------------

12. BRIEF EXPLANATION

Also provide:

"brief_explanation"

This must be a concise 1–3 sentence explanation that can be
shown directly to a recruiter.

It must explain WHY the candidate received the verdict.

Example:

"Strong evidence of Java, Spring Boot and PostgreSQL implementation
through backend project work. Kafka production usage is not clearly
demonstrated, so the candidate requires verification for that
requirement."

Do not simply repeat the score.

Do not invent evidence.

------------------------------------------------------------

13. VERDICT

Use:

SHORTLIST
REVIEW
REJECT

based only on the documented job-related evidence.

Do not use protected or personal characteristics.

------------------------------------------------------------

14. MAIN SKILLS

"extracted_main_skills" should contain only skills supported by
actual project, work, implementation or technical responsibility
evidence.

Do NOT simply copy the resume's Skills section.

------------------------------------------------------------

15. INTERVIEW QUESTIONS

For requirements that are MET or PARTIAL, generate a technical
scenario question that can verify whether the candidate actually
understands the claimed technology.

Questions should test:

- architecture
- debugging
- tradeoffs
- scaling
- deployment
- failure handling
- performance
- security
- operational decisions

Avoid generic questions such as:

"What is Java?"

------------------------------------------------------------

16. GOOD RESPONSE RUBRIC

Describe concrete evidence expected from an experienced engineer.

Examples:

- architecture decisions
- implementation details
- debugging approach
- scaling considerations
- failure handling
- monitoring
- performance optimization
- tradeoffs

------------------------------------------------------------

17. POOR RESPONSE RUBRIC

Describe signs of:

- superficial knowledge
- memorized definitions
- generic answers
- inability to explain implementation
- inability to explain tradeoffs
- buzzword usage without technical depth

============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

No Markdown.

No ```json.

No explanation outside the JSON.

Use exactly this structure:

{{
  "candidate_name": "Inferred Name or Candidate ID",

  "candidate_summary":
    "Exactly two concise sentences describing strengths and missing evidence.",

  "brief_explanation":
    "One to three concise sentences explaining the job-related evidence behind the verdict.",

  "overall_fit_status":
    "SHORTLIST",

  "extracted_main_skills": [
    "Skill backed by concrete evidence"
  ],

  "compliance_defensibility_score": 75,

  "adverse_action_reasoning":
    "Factual statement of job-related technical gaps only.",

  "requirements": [
    {{
      "requirement_id": "REQ-01",

      "requirement_text":
        "Exact requirement stated in JD",

      "criticality":
        "CRITICAL_MUST_HAVE",

      "status":
        "MET",

      "evidence_depth":
        "PRODUCTION_PROVEN",

      "verbatim_quote":
        "Exact continuous substring copied from the sanitized resume",

      "gap_reasoning":
        "Exact explanation of what evidence is present or lacking.",

      "interview_question":
        "Technical scenario question that tests genuine experience.",

      "eval_rubric_good":
        "Concrete architectural or operational response expected.",

      "eval_rubric_poor":
        "Signs of superficial knowledge or unsupported claims."
    }}
  ]
}}

============================================================
ALLOWED VALUES
============================================================

overall_fit_status:

SHORTLIST
REVIEW
REJECT

criticality:

CRITICAL_MUST_HAVE
NICE_TO_HAVE

status:

MET
PARTIAL
UNMET

evidence_depth:

PRODUCTION_PROVEN
SURFACE_LEVEL
NONE

============================================================
JOB DESCRIPTION
============================================================

{jd_text}

============================================================
REQUIREMENT COMPLETENESS RULE
============================================================

The numbered or explicitly listed requirements in this JD are the
requirements that must be audited. Produce exactly one audit object for
every explicit JD requirement. Never omit a requirement because the
resume does not mention it. If a requirement has no supporting resume
evidence, mark it UNMET and set verbatim_quote to exactly "None".
Do not invent additional requirements.

============================================================
SANITIZED RESUME
============================================================

{sanitized_resume}
"""


    # ============================================================
    # STEP 3 — CALL GEMINI
    # ============================================================

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.0
    )


    raw_content = (
        response.choices[0].message.content
        or "{}"
    )


    # ============================================================
    # STEP 4 — PARSE JSON
    # ============================================================

    report_data = extract_clean_json(
        raw_content
    )


    # ============================================================
    # STEP 5 — SAFE DEFAULTS
    # ============================================================

    if not isinstance(
        report_data,
        dict
    ):
        report_data = {}


    if not isinstance(
        report_data.get("requirements"),
        list
    ):
        report_data["requirements"] = []


    if not isinstance(
        report_data.get("extracted_main_skills"),
        list
    ):
        report_data["extracted_main_skills"] = []


    # ============================================================
    # STEP 5B — RECONCILE EVERY JD REQUIREMENT
    # ============================================================

    _reconcile_requirements(report_data, jd_text)

    # ============================================================
    # STEP 6 — VALIDATE OVERALL STATUS
    # ============================================================

    allowed_statuses = {
        "SHORTLIST",
        "REVIEW",
        "REJECT"
    }


    overall_status = str(
        report_data.get(
            "overall_fit_status",
            "REVIEW"
        )
    ).upper()


    if overall_status not in allowed_statuses:

        overall_status = "REVIEW"


    report_data[
        "overall_fit_status"
    ] = overall_status


    # ============================================================
    # STEP 7 — VALIDATE DEFENSIBILITY SCORE
    # ============================================================

    try:

        defensibility = float(
            report_data.get(
                "compliance_defensibility_score",
                0
            )
        )

    except (
        ValueError,
        TypeError
    ):

        defensibility = 0


    defensibility = max(
        0,
        min(
            100,
            round(
                defensibility
            )
        )
    )


    report_data[
        "compliance_defensibility_score"
    ] = defensibility


    # ============================================================
    # STEP 8 — NORMALIZE RESUME FOR CITATION CHECKING
    # ============================================================

    clean_resume = " ".join(
        sanitized_resume.split()
    ).lower()


    # ============================================================
    # STEP 9 — DETERMINISTIC REQUIREMENT VERIFICATION
    # ============================================================

    allowed_requirement_statuses = {
        "MET",
        "PARTIAL",
        "UNMET"
    }


    allowed_evidence_depths = {
        "PRODUCTION_PROVEN",
        "SURFACE_LEVEL",
        "NONE"
    }


    for index, req in enumerate(
        report_data.get(
            "requirements",
            []
        )
    ):

        if not isinstance(
            req,
            dict
        ):
            continue


        # --------------------------------------------------------
        # Requirement ID
        # --------------------------------------------------------

        if not req.get(
            "requirement_id"
        ):

            req[
                "requirement_id"
            ] = f"REQ-{index + 1:02d}"


        # --------------------------------------------------------
        # Status
        # --------------------------------------------------------

        status = str(
            req.get(
                "status",
                "UNMET"
            )
        ).upper()


        if status not in allowed_requirement_statuses:

            status = "UNMET"


        req[
            "status"
        ] = status


        # --------------------------------------------------------
        # Evidence Depth
        # --------------------------------------------------------

        evidence_depth = str(
            req.get(
                "evidence_depth",
                "NONE"
            )
        ).upper()


        if evidence_depth not in allowed_evidence_depths:

            evidence_depth = "NONE"


        # UNMET can never have production evidence.
        if status == "UNMET":

            evidence_depth = "NONE"


        # PARTIAL cannot be production proven.
        elif status == "PARTIAL":

            if evidence_depth == "PRODUCTION_PROVEN":

                evidence_depth = "SURFACE_LEVEL"


        req[
            "evidence_depth"
        ] = evidence_depth


        # --------------------------------------------------------
        # Criticality
        # --------------------------------------------------------

        criticality = str(
            req.get(
                "criticality",
                "NICE_TO_HAVE"
            )
        ).upper()


        if criticality not in {
            "CRITICAL_MUST_HAVE",
            "NICE_TO_HAVE"
        }:

            criticality = "NICE_TO_HAVE"


        req[
            "criticality"
        ] = criticality


        # --------------------------------------------------------
        # Quote
        # --------------------------------------------------------

        quote = req.get(
            "verbatim_quote",
            "None"
        )


        if quote is None:

            quote = "None"


        quote = str(
            quote
        ).strip()


        # --------------------------------------------------------
        # UNMET RULE
        # --------------------------------------------------------

        if status == "UNMET":

            req[
                "verbatim_quote"
            ] = "None"

            req[
                "citation_verified"
            ] = True

            continue


        # --------------------------------------------------------
        # MET / PARTIAL REQUIREMENTS
        # --------------------------------------------------------

        if quote.lower() == "none":

            req[
                "citation_verified"
            ] = False


            original_status = status


            if original_status == "MET":

                req[
                    "status"
                ] = "PARTIAL"


            else:

                req[
                    "status"
                ] = "UNMET"


            req[
                "evidence_depth"
            ] = (
                "SURFACE_LEVEL"
                if req["status"] == "PARTIAL"
                else "NONE"
            )


            existing_reason = str(
                req.get(
                    "gap_reasoning",
                    ""
                )
            )


            req[
                "gap_reasoning"
            ] = (
                existing_reason
                + " [AUDIT FLAG: No valid verbatim evidence "
                  "citation was provided.]"
            )


            req[
                "verbatim_quote"
            ] = "None"


            continue


        # --------------------------------------------------------
        # NORMALIZE QUOTE
        # --------------------------------------------------------

        clean_quote = " ".join(
            quote.split()
        ).lower()


        # --------------------------------------------------------
        # MINIMUM EVIDENCE LENGTH
        # --------------------------------------------------------

        quote_word_count = len(
            clean_quote.split()
        )


        # Require meaningful contextual evidence.
        # We don't force exactly 4 words because a short,
        # legitimate technical phrase can still be valid.
        minimum_valid_quote_length = (
            len(clean_quote) >= 12
            and quote_word_count >= 3
        )


        # --------------------------------------------------------
        # EXACT SUBSTRING VERIFICATION
        # --------------------------------------------------------

        citation_verified = (
            minimum_valid_quote_length
            and clean_quote in clean_resume
        )


        req[
            "citation_verified"
        ] = citation_verified


        # ========================================================
        # FAILED CITATION
        # ========================================================

        if not citation_verified:

            original_status = req.get(
                "status",
                "PARTIAL"
            )


            if original_status == "MET":

                req[
                    "status"
                ] = "PARTIAL"


                req[
                    "evidence_depth"
                ] = "SURFACE_LEVEL"

            else:

                req[
                    "status"
                ] = "UNMET"


                req[
                    "evidence_depth"
                ] = "NONE"


            existing_reason = str(
                req.get(
                    "gap_reasoning",
                    ""
                )
            )


            req[
                "gap_reasoning"
            ] = (
                existing_reason
                + " [AUDIT FLAG: Cited quote could not be "
                  "verified as a sufficiently long continuous "
                  "substring in the sanitized candidate source.]"
            )


        # ========================================================
        # SUCCESSFUL CITATION
        # ========================================================

        else:

            # Keep the AI quote exactly as returned.
            req[
                "verbatim_quote"
            ] = quote


    # ============================================================
    # STEP 10 — RE-CALCULATE EVIDENCE COUNTS
    # ============================================================

    requirements = report_data.get(
        "requirements",
        []
    )


    met_count = sum(
        1
        for req in requirements
        if req.get(
            "status"
        ) == "MET"
    )


    partial_count = sum(
        1
        for req in requirements
        if req.get(
            "status"
        ) == "PARTIAL"
    )


    unmet_count = sum(
        1
        for req in requirements
        if req.get(
            "status"
        ) == "UNMET"
    )


    # ============================================================
    # STEP 11 — SAFETY CHECK FOR EMPTY AUDIT
    # ============================================================

    if not requirements:

        report_data[
            "overall_fit_status"
        ] = "REVIEW"


        report_data[
            "brief_explanation"
        ] = (
            "The AI could not establish a reliable "
            "requirement-level comparison from the supplied "
            "Job Description and resume."
        )


        report_data[
            "candidate_summary"
        ] = (
            "The available evidence could not be mapped "
            "reliably to the supplied requirements. "
            "The candidate requires human review."
        )


        report_data[
            "compliance_defensibility_score"
        ] = 0


    # ============================================================
    # STEP 12 — ENSURE BRIEF EXPLANATION EXISTS
    # ============================================================

    if not str(
        report_data.get(
            "brief_explanation",
            ""
        )
    ).strip():

        report_data[
            "brief_explanation"
        ] = (
            report_data.get(
                "candidate_summary",
                "No explanation was returned."
            )
        )


    # ============================================================
    # STEP 13 — ENSURE CANDIDATE SUMMARY EXISTS
    # ============================================================

    if not str(
        report_data.get(
            "candidate_summary",
            ""
        )
    ).strip():

        report_data[
            "candidate_summary"
        ] = (
            "The resume was evaluated against the supplied "
            "job-related requirements. See the requirement-level "
            "evidence audit for the supporting details."
        )


    # ============================================================
    # STEP 14 — ENSURE ADVERSE ACTION REASONING EXISTS
    # ============================================================

    if not str(
        report_data.get(
            "adverse_action_reasoning",
            ""
        )
    ).strip():

        if unmet_count > 0:

            report_data[
                "adverse_action_reasoning"
            ] = (
                f"{unmet_count} requirement(s) were not supported "
                "by sufficient resume evidence."
            )

        elif partial_count > 0:

            report_data[
                "adverse_action_reasoning"
            ] = (
                f"{partial_count} requirement(s) had only partial "
                "or surface-level evidence."
            )

        else:

            report_data[
                "adverse_action_reasoning"
            ] = (
                "No requirement-level technical gaps were "
                "identified in the available resume evidence."
            )


    # ============================================================
    # STEP 14B — DETERMINISTIC SCREENING VERDICT
    # ============================================================

    derived_screening = _derive_screening_from_audit(report_data)
    report_data["overall_fit_status"] = derived_screening["verdict"]
    report_data["screening_match_score_pct"] = derived_screening["match_score_pct"]
    report_data["screening_basis"] = derived_screening["screening_basis"]

    # ============================================================
    # STEP 15 — RETURN
    # ============================================================

    return (
        report_data,
        sanitized_resume,
        redaction_log
    )

# ============================================================
# AUDIT DEFENSE Q&A
# ============================================================

def interrogate_decision(
    audit_data: Dict[str, Any],
    sanitized_resume: str,
    user_question: str
) -> str:
    """
    Answer audit-defense questions using only:
        1. Audit data
        2. Sanitized resume
    """

    if not isinstance(
        audit_data,
        dict
    ):

        raise ValueError(
            "audit_data must be a dictionary."
        )


    if not sanitized_resume:

        raise ValueError(
            "sanitized_resume cannot be empty."
        )


    if not user_question or not user_question.strip():

        raise ValueError(
            "user_question cannot be empty."
        )


    prompt = f"""
You are an HR Audit Defense Officer.

Answer the auditor's question using ONLY:

1. The audit data
2. The sanitized resume

Do not invent candidate experience.

Do not introduce facts that are not present
in the supplied evidence.

Be objective.

Reference requirement IDs and requirement text
when relevant.

If the evidence does not support an answer,
explicitly say that the available audit evidence
does not establish it.

AUDIT DATA:

{json.dumps(
    audit_data,
    indent=2,
    ensure_ascii=False
)}

SANITIZED RESUME:

{sanitized_resume}

AUDITOR QUESTION:

{user_question}
"""


    return call_gemini(
        prompt,
        temperature=0.0
    )


# ============================================================
# HIGH-LEVEL ANALYSIS PIPELINE
# ============================================================

def analyze_resume(
    file_bytes: bytes,
    jd_text: str
) -> Dict[str, Any]:
    """
    Convenience pipeline.

    PDF
      ↓
    Text extraction
      ↓
    Skill extraction
      ↓
    JD screening
      ↓
    Deep compliance audit
    """

    resume_text = extract_text_from_pdf(
        file_bytes
    )


    skill_data = extract_main_skills(
        resume_text
    )


    screening_data = screen_resume_against_jd(
        resume_text,
        jd_text
    )


    audit_data, sanitized_resume, redaction_log = (
        evaluate_fit(
            resume_text,
            jd_text
        )
    )


    return {
        "skill_analysis": skill_data,
        "screening": screening_data,
        "audit": audit_data,
        "sanitized_resume": sanitized_resume,
        "redaction_log": redaction_log
    }


# ============================================================
# LOCAL TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("HireProof Compliance Engine")
    print("=" * 60)

    print(
        f"Gemini model: {MODEL_NAME}"
    )

    print(
        "Gemini API key: loaded"
    )

    print(
        "Engine import test: PASSED"
    )

    print("=" * 60)