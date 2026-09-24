import logging
from typing import Dict, Any, Tuple
from app.ai.llm_client import llm_client
from app.database.models import VerificationType, RequirementType, MatchStatus

logger = logging.getLogger(__name__)

class QuestionGenerator:
    """Generates targeted verification challenges and interview questions for specific requirements."""

    CHALLENGE_PROMPT = """
You are an expert technical evaluator for HireProof AI.
The candidate needs to prove the requirement: "{requirement}".
Generate a specific, real-world, targeted technical challenge to verify practical competence in this requirement.

Rules:
1. Do not ask generic trivia questions.
2. Pose an architectural, algorithmic, or practical engineering scenario.
3. Return pure JSON adhering strictly to:
{
  "challenge": "A clear, scenario-based technical challenge...",
  "instructions": "Specific guidance on what details the candidate should explain (e.g. trade-offs, architecture, technologies)."
}
"""

    INTERVIEW_PROMPT = """
You are a senior hiring interviewer for HireProof AI.
Generate a targeted, probing interview question specifically assessing the candidate's practical experience with: "{requirement}".

Rules:
1. Focus on real-world projects, decisions made, obstacles overcome, or design considerations.
2. Return pure JSON adhering strictly to:
{
  "question": "Targeted interview question..."
}
"""

    @classmethod
    def determine_verification_method(
        cls,
        requirement_text: str,
        requirement_type: RequirementType,
        current_status: MatchStatus
    ) -> Tuple[VerificationType, str]:
        """Determine whether an AI Challenge, Interview, or Evidence Upload is best suited."""
        req_lower = requirement_text.lower()
        if requirement_type == RequirementType.EDUCATION or "degree" in req_lower or "diploma" in req_lower:
            return (
                VerificationType.EVIDENCE_UPLOAD,
                f"Formal academic credentials for '{requirement_text}' are best verified via transcript or diploma document upload."
            )
        elif requirement_type == RequirementType.CERTIFICATION or "certified" in req_lower:
            return (
                VerificationType.EVIDENCE_UPLOAD,
                f"Certification '{requirement_text}' is best verified by providing certificate ID or credential verification link."
            )
        elif requirement_type == RequirementType.SKILL:
            # High-level architecture / coding / design skills benefit from challenges
            if any(k in req_lower for k in ["aws", "cloud", "docker", "kubernetes", "system design", "architecture", "microservices"]):
                return (
                    VerificationType.AI_CHALLENGE,
                    f"'{requirement_text}' is best verified through an architectural scenario challenge."
                )
            else:
                return (
                    VerificationType.AI_INTERVIEW,
                    f"Practical experience with '{requirement_text}' can be verified through a targeted technical interview question."
                )
        else:
            return (
                VerificationType.AI_INTERVIEW,
                f"Experience regarding '{requirement_text}' can be verified through targeted behavioral and technical evaluation."
            )

    @classmethod
    async def generate_challenge(cls, requirement_text: str) -> Dict[str, str]:
        """Generate a scenario-based challenge for candidate verification."""
        instruction = cls.CHALLENGE_PROMPT.replace("{requirement}", requirement_text)
        llm_resp = await llm_client.generate_json(
            prompt=f"Generate a verification challenge for requirement: {requirement_text}",
            system_instruction=instruction
        )
        if llm_resp and "challenge" in llm_resp and "instructions" in llm_resp:
            return {
                "challenge": llm_resp["challenge"],
                "instructions": llm_resp["instructions"]
            }

        # Semantic fallback template
        return {
            "challenge": f"Design a production-grade implementation or architecture utilizing {requirement_text}. Describe how you would handle scaling, failure recovery, and performance optimization for a high-traffic system.",
            "instructions": f"Provide your architectural blueprint, key components, data flow, and trade-offs made when implementing {requirement_text}."
        }

    @classmethod
    async def generate_interview_question(cls, requirement_text: str) -> str:
        """Generate a focused technical question for candidate verification."""
        instruction = cls.INTERVIEW_PROMPT.replace("{requirement}", requirement_text)
        llm_resp = await llm_client.generate_json(
            prompt=f"Generate a targeted interview question for requirement: {requirement_text}",
            system_instruction=instruction
        )
        if llm_resp and "question" in llm_resp:
            return llm_resp["question"]

        # Semantic fallback question
        return f"Describe a notable project or production scenario where you utilized {requirement_text}. What specific problem were you solving, what challenges did you face, and how did you measure success?"

question_generator = QuestionGenerator()
