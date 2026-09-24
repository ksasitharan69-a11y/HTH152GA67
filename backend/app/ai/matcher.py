import logging
from typing import List, Dict, Any, Tuple
from app.ai.llm_client import llm_client
from app.database.models import MatchStatus, RequirementType
from app.ai.evidence_extractor import evidence_extractor

logger = logging.getLogger(__name__)

class Matcher:
    """Evaluates candidate qualifications against job requirements to produce explainable match results."""

    SYSTEM_PROMPT = """
You are the HireProof AI Reasoning Engine.
Evaluate whether the candidate meets a specific job requirement based SOLELY on the extracted evidence and resume text provided.

Decide exactly ONE status:
1. 'VERIFIED': Strong supporting evidence exists in the resume proving direct competence/experience.
2. 'PARTIAL': Some relevant evidence exists, but does not fully satisfy the required depth, scope, or years.
3. 'UNVERIFIED': The candidate resume does NOT provide sufficient evidence. (CRITICAL RULE: Lack of evidence MUST be marked UNVERIFIED, NEVER GAP).
4. 'GAP': There is clear, contradictory evidence that the candidate cannot satisfy this (e.g. requires US citizenship, candidate explicitly states requires visa sponsorship; or requires senior level, candidate explicitly states student).

Respond with pure JSON only:
{
  "status": "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "GAP",
  "reasoning": "Detailed, professional explanation connecting the evidence to the decision.",
  "confidence": 0.95
}
"""

    @classmethod
    async def match_requirement(
        cls,
        requirement_text: str,
        requirement_type: RequirementType,
        importance: str,
        resume_text: str,
        resume_data: Dict[str, Any]
    ) -> Tuple[MatchStatus, str, float, List[Dict[str, Any]]]:
        """
        Evaluates a requirement against candidate resume.
        Returns (status, reasoning, confidence, list_of_evidences).
        """
        # 1. Extract concrete evidence snippets from candidate's resume
        evidences = evidence_extractor.extract_evidence_snippets(
            requirement_text=requirement_text,
            resume_text=resume_text,
            structured_data=resume_data
        )

        evidence_str = "\n".join([f"- [{e['source_type'].value} in {e.get('source_location')}]: \"{e['source_text']}\"" for e in evidences]) if evidences else "No direct textual evidence found."

        prompt = f"""
Requirement to Evaluate:
- Description: {requirement_text}
- Type: {requirement_type.value if hasattr(requirement_type, 'value') else requirement_type}
- Importance: {importance}

Extracted Candidate Evidence:
{evidence_str}

Candidate Listed Skills:
{", ".join(resume_data.get("skills", []))}
"""

        # 2. Attempt LLM reasoning
        llm_response = await llm_client.generate_json(
            prompt=prompt,
            system_instruction=cls.SYSTEM_PROMPT
        )

        if llm_response and "status" in llm_response:
            try:
                status_str = llm_response["status"].upper()
                if status_str in [s.value for s in MatchStatus]:
                    reasoning = llm_response.get("reasoning", "")
                    confidence = float(llm_response.get("confidence", 0.85))
                    return MatchStatus(status_str), reasoning, confidence, evidences
            except Exception as e:
                logger.warning(f"Error parsing LLM match response: {e}")

        # 3. Deterministic Semantic Fallback Engine
        return cls._semantic_fallback_match(
            requirement_text=requirement_text,
            requirement_type=requirement_type,
            importance=importance,
            evidences=evidences,
            resume_data=resume_data
        )

    @classmethod
    def _semantic_fallback_match(
        cls,
        requirement_text: str,
        requirement_type: RequirementType,
        importance: str,
        evidences: List[Dict[str, Any]],
        resume_data: Dict[str, Any]
    ) -> Tuple[MatchStatus, str, float, List[Dict[str, Any]]]:
        """Deterministic reasoning engine enforcing HireProof core standards."""
        req_clean = requirement_text.lower()
        skills_lower = [s.lower() for s in resume_data.get("skills", [])]

        # Case 1: Strong evidence found in experience, projects, or certifications
        if evidences:
            has_experience_or_cert = any(
                e["source_type"].value in ["EXPERIENCE", "CERTIFICATION", "PROJECT"]
                for e in evidences
            )
            if has_experience_or_cert:
                status = MatchStatus.VERIFIED
                reasoning = (
                    f"Verified through verifiable {evidences[0]['source_type'].value.lower()} evidence: "
                    f"\"{evidences[0]['source_text'][:120]}...\" directly demonstrates competence for '{requirement_text}'."
                )
                confidence = 0.92
                return status, reasoning, confidence, evidences
            else:
                status = MatchStatus.PARTIAL
                reasoning = (
                    f"Mentioned in resume ({evidences[0]['source_type'].value.lower()}), "
                    f"providing partial evidence of '{requirement_text}', but lacks detailed deployment or project scope."
                )
                confidence = 0.75
                return status, reasoning, confidence, evidences

        # Case 2: Present in skills list without dedicated experience bullet
        if any(req_clean == s or req_clean in s for s in skills_lower):
            status = MatchStatus.PARTIAL
            reasoning = (
                f"Candidate lists '{requirement_text}' in technical skills, "
                f"providing preliminary evidence. Further verification recommended to assess practical depth."
            )
            confidence = 0.70
            evidences.append({
                "source_type": MatchStatus.PARTIAL,
                "source_text": f"Listed in skills section: {requirement_text}",
                "source_location": "Skills Section",
                "confidence": 0.70
            })
            return status, reasoning, confidence, evidences

        # Case 3: No evidence found at all -> UNVERIFIED (per HireProof Rule: No evidence != GAP)
        status = MatchStatus.UNVERIFIED
        reasoning = (
            f"The candidate's resume does not explicitly document experience or evidence for '{requirement_text}'. "
            f"This qualification remains UNVERIFIED and is a candidate for AI Verification or human interview."
        )
        confidence = 0.88
        return status, reasoning, confidence, []

matcher = Matcher()
