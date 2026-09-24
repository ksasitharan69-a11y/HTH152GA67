import re
import logging
from typing import List, Dict, Any, Optional
from app.ai.llm_client import llm_client
from app.schemas.ai import JDAnalysisResponse, ExtractedRequirement
from app.database.models import RequirementType

logger = logging.getLogger(__name__)

class JDAnalyzer:
    """Extracts structured requirements from job descriptions using LLM and semantic parsing."""

    SYSTEM_PROMPT = """
You are an expert Job Description Analyzer for HireProof AI.
Extract all explicit requirements from the provided job description into structured requirements.
Classify each into:
- type: 'SKILL', 'EXPERIENCE', 'EDUCATION', 'CERTIFICATION', 'PROJECT', or 'OTHER'
- importance: 'HIGH', 'MEDIUM', 'LOW'

Rules:
1. Do not invent requirements not mentioned in the job description.
2. Separate individual technical skills and experience levels cleanly.
3. Return pure JSON adhering strictly to:
{
  "requirements": [
    {"requirement": "Python", "type": "SKILL", "importance": "HIGH"},
    {"requirement": "3+ years experience in backend development", "type": "EXPERIENCE", "importance": "HIGH"}
  ]
}
"""

    @classmethod
    async def analyze(
        cls,
        description: str,
        title: Optional[str] = None,
        required_skills: Optional[List[str]] = None,
        preferred_skills: Optional[List[str]] = None,
        required_experience: Optional[str] = None,
        education: Optional[str] = None
    ) -> JDAnalysisResponse:
        """Analyze job description and return validated structured requirements."""
        
        # Build comprehensive input context
        prompt_content = f"Job Title: {title or 'Unspecified'}\n\nJob Description:\n{description}\n"
        if required_skills:
            prompt_content += f"\nSpecified Required Skills: {', '.join(required_skills)}"
        if preferred_skills:
            prompt_content += f"\nSpecified Preferred Skills: {', '.join(preferred_skills)}"
        if required_experience:
            prompt_content += f"\nExperience Requirement: {required_experience}"
        if education:
            prompt_content += f"\nEducation Requirement: {education}"

        # Attempt LLM extraction
        llm_response = await llm_client.generate_json(
            prompt=f"Extract structured requirements for this job vacancy:\n\n{prompt_content}",
            system_instruction=cls.SYSTEM_PROMPT
        )

        if llm_response and "requirements" in llm_response:
            try:
                validated = JDAnalysisResponse(**llm_response)
                if validated.requirements:
                    return validated
            except Exception as e:
                logger.warning(f"Failed to validate LLM JD extraction output: {e}")

        # Semantic fallback extraction
        return cls._semantic_fallback_extraction(
            description=description,
            required_skills=required_skills or [],
            preferred_skills=preferred_skills or [],
            required_experience=required_experience,
            education=education
        )

    @classmethod
    def _semantic_fallback_extraction(
        cls,
        description: str,
        required_skills: List[str],
        preferred_skills: List[str],
        required_experience: Optional[str],
        education: Optional[str]
    ) -> JDAnalysisResponse:
        """Deterministic semantic requirement extractor based on explicit inputs and text analysis."""
        reqs: List[ExtractedRequirement] = []
        seen = set()

        def add_req(text: str, req_type: RequirementType, importance: str = "HIGH"):
            clean = text.strip()
            if clean and clean.lower() not in seen:
                seen.add(clean.lower())
                reqs.append(ExtractedRequirement(
                    requirement=clean,
                    type=req_type,
                    importance=importance
                ))

        # 1. Add explicitly declared required skills
        for s in required_skills:
            add_req(s, RequirementType.SKILL, "HIGH")

        # 2. Add explicitly declared preferred skills
        for s in preferred_skills:
            add_req(s, RequirementType.SKILL, "MEDIUM")

        # 3. Add required experience
        if required_experience and required_experience.strip():
            add_req(required_experience, RequirementType.EXPERIENCE, "HIGH")

        # 4. Add education
        if education and education.strip():
            add_req(education, RequirementType.EDUCATION, "HIGH")

        # 5. Extract bullet points or common requirement phrases from description if few exist
        if len(reqs) < 3:
            lines = description.split("\n")
            for line in lines:
                line_clean = line.strip().lstrip("•-*0123456789. ")
                if len(line_clean) > 8 and len(line_clean) < 120:
                    lower = line_clean.lower()
                    if any(kw in lower for kw in ["experience", "years", "knowledge", "proficient", "familiar", "degree", "bachelor", "master"]):
                        if "degree" in lower or "bachelor" in lower or "master" in lower:
                            add_req(line_clean, RequirementType.EDUCATION, "HIGH")
                        elif "years" in lower or "experience" in lower:
                            add_req(line_clean, RequirementType.EXPERIENCE, "HIGH")
                        else:
                            add_req(line_clean, RequirementType.SKILL, "HIGH")

        return JDAnalysisResponse(requirements=reqs)

jd_analyzer = JDAnalyzer()
