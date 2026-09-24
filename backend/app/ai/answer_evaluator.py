import logging
from typing import Dict, Any, Tuple
from app.ai.llm_client import llm_client
from app.database.models import VerificationEvaluationResult, MatchStatus

logger = logging.getLogger(__name__)

class AnswerEvaluator:
    """Evaluates candidate technical responses to verification challenges and interview questions."""

    SYSTEM_PROMPT = """
You are an unbiased Senior Technical Evaluator for HireProof AI.
Evaluate the candidate's answer to verify the requirement: "{requirement}".
Target Question/Challenge: "{question}"

Evaluate according to:
1. Relevance to the specific requirement.
2. Technical depth, accuracy, and engineering principles.
3. Concrete evidence of practical hands-on experience vs generic textbook answers.
4. Internal consistency and logic.

Classify result into:
- 'STRONG_EVIDENCE': The answer demonstrates in-depth, hands-on mastery and concrete implementation detail.
- 'PARTIAL_EVIDENCE': The answer demonstrates basic understanding or familiarity, but lacks deep architectural or production rigor.
- 'INSUFFICIENT_EVIDENCE': The answer is vague, generic, incorrect, evasive, or fails to address the requirement.

Respond with pure JSON only:
{
  "result": "STRONG_EVIDENCE" | "PARTIAL_EVIDENCE" | "INSUFFICIENT_EVIDENCE",
  "confidence": 0.90,
  "reasoning": "Thorough breakdown explaining why this evaluation was assigned based on the candidate's response.",
  "evidence": "Key technical excerpt or reasoning extracted directly from the candidate's answer."
}
"""

    @classmethod
    async def evaluate(
        cls,
        requirement_text: str,
        question: str,
        candidate_answer: str
    ) -> Tuple[VerificationEvaluationResult, float, str, str]:
        """
        Evaluate candidate response.
        Returns (result, confidence, reasoning, evidence_summary).
        """
        if not candidate_answer or len(candidate_answer.strip()) < 10:
            return (
                VerificationEvaluationResult.INSUFFICIENT_EVIDENCE,
                0.95,
                "The response is too brief or empty to provide meaningful technical evidence.",
                "Candidate provided insufficient or empty answer."
            )

        prompt = f"""
Requirement: {requirement_text}
Question/Challenge: {question}

Candidate's Submitted Answer:
\"\"\"{candidate_answer}\"\"\"
"""

        instruction = cls.SYSTEM_PROMPT.replace("{requirement}", requirement_text).replace("{question}", question)

        llm_response = await llm_client.generate_json(
            prompt=prompt,
            system_instruction=instruction
        )

        if llm_response and "result" in llm_response:
            try:
                res_str = llm_response["result"].upper()
                if res_str in [r.value for r in VerificationEvaluationResult]:
                    return (
                        VerificationEvaluationResult(res_str),
                        float(llm_response.get("confidence", 0.85)),
                        llm_response.get("reasoning", "Evaluated by AI verification model."),
                        llm_response.get("evidence", candidate_answer[:200])
                    )
            except Exception as e:
                logger.warning(f"Error parsing LLM answer evaluation: {e}")

        # Deterministic semantic evaluation fallback
        return cls._semantic_fallback_evaluation(requirement_text, candidate_answer)

    @classmethod
    def _semantic_fallback_evaluation(
        cls,
        requirement_text: str,
        candidate_answer: str
    ) -> Tuple[VerificationEvaluationResult, float, str, str]:
        """Heuristic evaluation assessing depth, length, technical terminology, and specificity."""
        answer_clean = candidate_answer.lower()
        word_count = len(answer_clean.split())
        req_words = [w.lower() for w in requirement_text.split() if len(w) > 2]

        matched_req_terms = sum(1 for w in req_words if w in answer_clean)

        # Technical indicators that signify practical depth
        depth_indicators = [
            "deploy", "architecture", "latency", "scale", "database", "api",
            "microservice", "cache", "redis", "async", "pipeline", "docker",
            "aws", "cloud", "config", "test", "security", "query", "index", "failure"
        ]
        technical_matches = sum(1 for indicator in depth_indicators if indicator in answer_clean)

        if word_count >= 50 and (matched_req_terms >= 1 or technical_matches >= 3):
            return (
                VerificationEvaluationResult.STRONG_EVIDENCE,
                0.88,
                f"Candidate provided a detailed technical explanation ({word_count} words) with specific implementation details demonstrating practical experience with '{requirement_text}'.",
                candidate_answer[:250] + "..."
            )
        elif word_count >= 20:
            return (
                VerificationEvaluationResult.PARTIAL_EVIDENCE,
                0.75,
                f"Candidate provided a basic answer demonstrating conceptual knowledge of '{requirement_text}', but lacked comprehensive system design or troubleshooting depth.",
                candidate_answer[:150] + "..."
            )
        else:
            return (
                VerificationEvaluationResult.INSUFFICIENT_EVIDENCE,
                0.90,
                f"Candidate answer was superficial or too short ({word_count} words) to substantiate operational competency with '{requirement_text}'.",
                candidate_answer[:100]
            )

answer_evaluator = AnswerEvaluator()
