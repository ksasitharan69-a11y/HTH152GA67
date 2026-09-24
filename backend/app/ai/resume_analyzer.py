import re
import logging
from typing import Dict, Any, List
from app.ai.llm_client import llm_client
from app.schemas.ai import ResumeAnalysisResponse

logger = logging.getLogger(__name__)

class ResumeAnalyzer:
    """Extracts structured sections and verified profile details from resume text."""

    SYSTEM_PROMPT = """
You are a precise resume intelligence analyzer for HireProof AI.
Extract only explicit, factual information present in the candidate's resume text.

Rules:
1. DO NOT INVENT or HALLUCINATE any skills, companies, projects, or dates not explicitly stated.
2. Structure output strictly into categories:
   - skills: list of technical and professional skills mentioned
   - experience: list of work experience entries or role descriptions
   - projects: list of projects or contributions mentioned
   - education: list of degrees, universities, or academic qualifications
   - certifications: list of verified certificates or licenses
3. Return pure JSON adhering strictly to:
{
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "experience": ["Senior Backend Engineer at TechCorp (3 years): Built microservices in Python."],
  "projects": ["HireProof AI: Built evidence verification engine using FastAPI and LLM."],
  "education": ["B.Tech in Computer Science, State University, 2023"],
  "certifications": ["AWS Certified Solutions Architect"]
}
"""

    @classmethod
    async def analyze(cls, resume_text: str) -> ResumeAnalysisResponse:
        """Analyze normalized resume text and return structured entities."""
        if not resume_text or len(resume_text.strip()) < 10:
            return ResumeAnalysisResponse()

        # Attempt LLM extraction
        llm_response = await llm_client.generate_json(
            prompt=f"Extract structured information from this candidate resume:\n\n{resume_text[:6000]}",
            system_instruction=cls.SYSTEM_PROMPT
        )

        if llm_response:
            try:
                validated = ResumeAnalysisResponse(**llm_response)
                # Verify that at least some data was extracted
                if any([validated.skills, validated.experience, validated.projects, validated.education]):
                    return validated
            except Exception as e:
                logger.warning(f"Failed to validate LLM resume analysis output: {e}")

        # Fallback to robust heuristic section extraction
        return cls._semantic_fallback_extraction(resume_text)

    @classmethod
    def _semantic_fallback_extraction(cls, text: str) -> ResumeAnalysisResponse:
        """Deterministic section parser when LLM is unavailable."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        skills: List[str] = []
        experience: List[str] = []
        projects: List[str] = []
        education: List[str] = []
        certifications: List[str] = []

        current_section = "general"
        section_headers = {
            "skill": "skills",
            "technical skills": "skills",
            "technologies": "skills",
            "core competencies": "skills",
            "experience": "experience",
            "work experience": "experience",
            "employment": "experience",
            "projects": "projects",
            "personal projects": "projects",
            "education": "education",
            "academics": "education",
            "certifications": "certifications",
            "certificates": "certifications"
        }

        for line in lines:
            line_lower = line.lower().strip(":# -")
            if line_lower in section_headers:
                current_section = section_headers[line_lower]
                continue

            # Assign to current section
            if current_section == "skills":
                # Split comma-separated skills
                parts = re.split(r"[,|•·/]", line)
                for part in parts:
                    item = part.strip()
                    if 1 < len(item) < 40 and not any(kw in item.lower() for kw in ["languages", "frameworks", "tools:"]):
                        skills.append(item)
            elif current_section == "experience":
                if len(line) > 10:
                    experience.append(line)
            elif current_section == "projects":
                if len(line) > 10:
                    projects.append(line)
            elif current_section == "education":
                if len(line) > 5:
                    education.append(line)
            elif current_section == "certifications":
                if len(line) > 5:
                    certifications.append(line)
            else:
                # Catch inline keywords if section headers were not detected
                lower_text = line.lower()
                if any(w in lower_text for w in ["bachelor", "master", "degree", "university", "college", "b.tech", "b.s."]):
                    education.append(line)
                elif any(w in lower_text for w in ["certified", "certification", "aws certified"]):
                    certifications.append(line)

        # De-duplicate while preserving order
        def dedupe(seq):
            seen = set()
            return [x for x in seq if not (x in seen or seen.add(x))]

        return ResumeAnalysisResponse(
            skills=dedupe(skills),
            experience=dedupe(experience)[:15],
            projects=dedupe(projects)[:10],
            education=dedupe(education)[:5],
            certifications=dedupe(certifications)[:5]
        )

resume_analyzer = ResumeAnalyzer()
