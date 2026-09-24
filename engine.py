import os
import re
import json
import io
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
        "GEMINI_API_KEY not found. "
        "Please check your .env file."
    )


# ============================================================
# GOOGLE GEMINI CLIENT
# ============================================================

client = OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)


# ============================================================
# GEMINI MODEL
# ============================================================

MODEL_NAME = "gemini-3.5-flash-lite"


# ============================================================
# TEXT SANITIZATION
# ============================================================

def sanitize_text(text: str) -> tuple[str, list[dict]]:
    """
    Removes potentially sensitive information from the resume
    before sending it to the LLM.

    Returns:
        sanitized_text
        audit_log
    """

    audit_log = []

    # --------------------------------------------------------
    # Redact Email Addresses
    # --------------------------------------------------------

    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'

    emails = re.findall(email_pattern, text)

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
    # Redact Phone Numbers
    # --------------------------------------------------------

    phone_pattern = (
        r'(\+?\d{1,3}[-.\s]?)?'
        r'(\(?\d{3}\)?[-.\s]?)?'
        r'\d{3}[-.\s]?\d{4}'
    )

    phones = re.findall(phone_pattern, text)

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
    # Redact Graduation / Calendar Years
    # --------------------------------------------------------

    year_pattern = r'\b(19\d{2}|20\d{2})\b'

    years = re.findall(year_pattern, text)

    if years:
        audit_log.append({
            "category": "Graduation / Calendar Year",
            "redacted_count": len(years),
            "reason": "Age Discrimination & Proxy Elimination"
        })

        text = re.sub(
            year_pattern,
            "[YEAR]",
            text
        )

    return text, audit_log


# ============================================================
# CLEAN JSON RESPONSE
# ============================================================

def extract_clean_json(raw_text: str) -> dict:
    """
    Extract valid JSON from Gemini's response.

    Handles responses surrounded by Markdown code fences
    or additional text.
    """

    text = raw_text.strip()

    # Remove ```json
    text = re.sub(
        r"^```(?:json)?\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove ```
    text = re.sub(
        r"\s*```$",
        "",
        text
    )

    # Find JSON object
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:
        return json.loads(
            text[start:end + 1]
        )

    return json.loads(text)

# ============================================================
# PDF RESUME TEXT EXTRACTION
# ============================================================

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts raw text from an uploaded PDF resume.

    Args:
        file_bytes: PDF file contents as bytes.

    Returns:
        Extracted resume text.
    """

    pdf_reader = pypdf.PdfReader(
        io.BytesIO(file_bytes)
    )

    extracted_text = []

    for page in pdf_reader.pages:

        page_text = page.extract_text()

        if page_text:
            extracted_text.append(page_text)

    return "\n".join(extracted_text)


# ============================================================
# RESUME SKILL EXTRACTION
# ============================================================

def extract_main_skills(resume_text: str) -> dict:
    """
    Uses Gemini to extract primary technical skills
    demonstrated in the resume.

    The resume is sanitized before being sent to Gemini.
    """

    # Sanitize resume before LLM processing
    sanitized_resume, _ = sanitize_text(
        resume_text
    )

    prompt = f"""
You are a Lead Technical Recruiter.

Analyze this sanitized candidate resume.

Extract ONLY the primary, concrete technical skills
demonstrated through real projects or engineering roles.

Ignore:

- Soft skills
- Generic buzzwords
- Superficial technology mentions
- Skills with no supporting evidence

Return ONLY valid raw JSON matching this exact schema:

{{
    "candidate_name": "Full name or Candidate ID if present",

    "primary_domain":
        "Backend Engineering | Data Engineering | Cloud DevOps",

    "core_languages_frameworks": [
        "Java",
        "Spring Boot",
        "Python"
    ],

    "databases_datastores": [
        "PostgreSQL",
        "Redis"
    ],

    "cloud_devops": [
        "Docker",
        "AWS EKS",
        "Kubernetes"
    ],

    "specialized_tools": [
        "Apache Kafka",
        "Spark"
    ],

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

    # --------------------------------------------------------
    # Gemini API call
    # --------------------------------------------------------

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1
    )

    raw_content = (
        response.choices[0].message.content
        or "{}"
    )

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:

        return extract_clean_json(
            raw_content
        )

    except json.JSONDecodeError as error:

        raise ValueError(
            "Gemini returned invalid JSON "
            "while extracting resume skills.\n\n"
            f"Raw response:\n{raw_content}"
        ) from error

# ============================================================
# SCREEN PDF RESUME AGAINST JOB DESCRIPTION
# ============================================================

def screen_resume_against_jd(
    resume_text: str,
    jd_text: str
) -> dict:
    """
    Screens a resume against a target Job Description.

    Extracts:
    - Candidate name
    - Primary domain / role
    - Verdict
    - Match percentage
    - Matched skills
    - Missing skills / gaps
    - Main skills
    - Evaluation summary

    Also returns:
    - Sanitized resume
    - Redaction log
    """

    # --------------------------------------------------------
    # Sanitize Resume
    # --------------------------------------------------------

    sanitized_resume, redaction_log = sanitize_text(
        resume_text
    )


    # --------------------------------------------------------
    # Gemini Prompt
    # --------------------------------------------------------

    prompt = f"""
You are a Senior Technical Recruiter.

Evaluate this candidate resume strictly against
the Job Description.

Analyze:

1. Candidate's core verified technical skills
   including languages, frameworks, databases,
   cloud tools, and engineering technologies.

2. Which skills directly MATCH the JD requirements.

3. Which required skills or technologies are
   MISSING or represent clear GAPS.

4. Overall recommendation:
   SHORTLIST, REVIEW, or REJECT.

5. Calculate a match_score_pct based only on
   demonstrated evidence in the resume compared
   with the requirements in the JD.

Do NOT invent candidate experience.

Do NOT treat a generic keyword mention as strong
evidence of practical experience.

Return ONLY raw JSON matching this exact format:

{{
    "candidate_name":
        "Full name or Candidate ID if found",

    "domain_role":
        "Primary role / domain",

    "verdict":
        "SHORTLIST",

    "match_score_pct":
        85,

    "matched_skills":
        [
            "Skill 1",
            "Skill 2"
        ],

    "missing_skills_gaps":
        [
            "Missing Skill 1",
            "Missing Skill 2"
        ],

    "main_skills_extracted":
        [
            "All core skills found in resume"
        ],

    "evaluation_summary":
        "2-3 sentences explaining why the candidate "
        "matches or falls short against the JD."
}}

Allowed verdict values:

SHORTLIST
REVIEW
REJECT

Rules:

1. Use ONLY evidence present in the resume.

2. Do not invent skills or experience.

3. A skill should be considered matched only when
   there is reasonable evidence of actual use.

4. A technology appearing only as a buzzword should
   not automatically be treated as a strong match.

5. Missing skills should represent actual JD
   requirements for which the resume provides
   insufficient evidence.

6. match_score_pct must be an integer from 0 to 100.

7. Do not use the candidate's email, phone number,
   graduation year, or other redacted information
   when evaluating the candidate.

8. Return raw JSON only.

9. Do not return Markdown.

10. Do not return ```json.

JOB DESCRIPTION:

{jd_text}

SANITIZED RESUME:

{sanitized_resume}
"""


    # --------------------------------------------------------
    # Gemini API Call
    # --------------------------------------------------------

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1
    )


    raw_content = (
        response.choices[0].message.content
        or "{}"
    )


    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:

        data = extract_clean_json(
            raw_content
        )

    except json.JSONDecodeError as error:

        raise ValueError(
            "Gemini returned invalid JSON while "
            "screening the resume against the JD.\n\n"
            f"Raw response:\n{raw_content}"
        ) from error


    # --------------------------------------------------------
    # Add Deterministic Data
    # --------------------------------------------------------

    data["sanitized_text"] = sanitized_resume

    data["redaction_log"] = redaction_log


    # --------------------------------------------------------
    # Validate Match Score
    # --------------------------------------------------------

    score = data.get(
        "match_score_pct",
        0
    )

    try:

        score = int(score)

    except (ValueError, TypeError):

        score = 0


    # Keep score within valid range
    score = max(
        0,
        min(100, score)
    )

    data["match_score_pct"] = score


    # --------------------------------------------------------
    # Validate Verdict
    # --------------------------------------------------------

    allowed_verdicts = [
        "SHORTLIST",
        "REVIEW",
        "REJECT"
    ]

    verdict = data.get(
        "verdict",
        "REVIEW"
    )

    if verdict not in allowed_verdicts:

        verdict = "REVIEW"

    data["verdict"] = verdict


    return data

# ============================================================
# EVALUATE CANDIDATE FIT
# ============================================================

def evaluate_fit(resume_text: str, jd_text: str):
    """
    Evaluate a candidate resume against a job description.

    Returns THREE values:

        1. report_data
        2. sanitized_resume
        3. redaction_log
    """

    # IMPORTANT:
    # sanitize_text() returns two values.
    sanitized_resume, redaction_log = sanitize_text(
        resume_text
    )

    # --------------------------------------------------------
    # Prompt
    # --------------------------------------------------------

    prompt = f"""
You are an HR Compliance Auditor.

Evaluate this candidate against the requirements
in the job description.

Use ONLY the information contained in the
job description and sanitized resume.

Do not invent experience.

Return ONLY valid JSON using this exact structure:

{{
    "candidate_summary": "Objective high-level summary",

    "overall_fit_status": "SHORTLIST",

    "requirements": [
        {{
            "requirement_id": "REQ-01",

            "requirement_text":
                "Skill or qualification from JD",

            "status":
                "MET",

            "verbatim_quote":
                "Exact short substring from resume, or None if UNMET",

            "gap_reasoning":
                "Why this requirement is unmet, partial, or lacks depth",

            "interview_question":
                "Targeted question for the candidate",

            "eval_rubric_good":
                "Specific signals of a strong response",

            "eval_rubric_poor":
                "Red flags or bluffing signals"
        }}
    ]
}}

Allowed status values:

MET
PARTIAL
UNMET

Rules:

1. For MET or PARTIAL, verbatim_quote MUST be an
   exact word-for-word quote from the sanitized resume.

2. Never invent a quotation.

3. If the candidate demonstrates the requirement
   with practical evidence, use MET.

4. If the resume only mentions the skill without
   sufficient practical evidence, use PARTIAL.

5. If there is no evidence for the requirement,
   use UNMET.

6. For UNMET requirements, use "None" for
   verbatim_quote.

7. Do not invent candidate experience.

8. candidate_summary must be objective.

9. Return raw JSON only.

10. Do not use Markdown.

11. Do not return ```json.

JOB DESCRIPTION:

{jd_text}

SANITIZED RESUME:

{sanitized_resume}
"""

    # --------------------------------------------------------
    # GEMINI API CALL
    # --------------------------------------------------------

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.1
    )

    raw_content = (
        response.choices[0].message.content
        or "{}"
    )

    # --------------------------------------------------------
    # PARSE JSON
    # --------------------------------------------------------

    try:

        report_data = extract_clean_json(
            raw_content
        )

    except json.JSONDecodeError as error:

        raise ValueError(
            "Gemini returned invalid JSON.\n\n"
            f"Raw response:\n{raw_content}"
        ) from error

    # --------------------------------------------------------
    # VERIFY RESUME QUOTES
    # --------------------------------------------------------

    for req in report_data.get(
        "requirements",
        []
    ):

        quote = req.get(
            "verbatim_quote",
            ""
        )

        if (
            req.get("status")
            in ["MET", "PARTIAL"]
            and quote not in [
                "None",
                "",
                None
            ]
        ):

            clean_quote = " ".join(
                quote.split()
            )

            clean_resume = " ".join(
                sanitized_resume.split()
            )

            req["citation_verified"] = (
                clean_quote.lower()
                in clean_resume.lower()
            )

        else:

            req["citation_verified"] = True

    # ========================================================
    # IMPORTANT FIX
    # app.py expects THREE return values.
    # ========================================================

    return (
        report_data,
        sanitized_resume,
        redaction_log
    )


# ============================================================
# AUDIT DEFENSE Q&A
# ============================================================

def interrogate_decision(
    audit_data: dict,
    sanitized_resume: str,
    user_question: str
) -> str:
    """
    Answer audit-defense questions using only
    the audit data and sanitized resume.
    """

    prompt = f"""
You are an HR Audit Defense Officer.

Answer the auditor's question using ONLY:

1. The audit data
2. The sanitized resume

Do not invent candidate experience.

Be objective.

Reference requirement IDs and requirement text
when relevant.

AUDIT DATA:

{json.dumps(
    audit_data,
    indent=2
)}

SANITIZED RESUME:

{sanitized_resume}

AUDITOR QUESTION:

{user_question}
"""

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

    return (
        response.choices[0].message.content
        or ""
    )