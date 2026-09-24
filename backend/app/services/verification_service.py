import logging
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.database.models import (
    Application, JobRequirement, MatchResult, Evidence,
    VerificationHistory, HRChallenge, MatchStatus,
    VerificationType, VerificationEvaluationResult,
    EvidenceSourceType, User
)
from app.ai.question_generator import question_generator
from app.ai.answer_evaluator import answer_evaluator
from app.schemas.ai import (
    ProveRequirementResponse, VerificationChallengeResponse,
    VerificationInterviewQuestionResponse, CandidateAnswerEvaluationResponse
)

logger = logging.getLogger(__name__)

class VerificationService:
    """Orchestrates interactive skill verification, question generation, and candidate answer evaluation."""

    @classmethod
    def get_proof_recommendation(
        cls,
        application_id: int,
        requirement_id: int,
        db: Session
    ) -> ProveRequirementResponse:
        """Determines the appropriate verification methodology for a given requirement."""
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")

        req = db.query(JobRequirement).filter(
            JobRequirement.id == requirement_id,
            JobRequirement.vacancy_id == app.vacancy_id
        ).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found for this vacancy.")

        match_result = db.query(MatchResult).filter(
            MatchResult.application_id == application_id,
            MatchResult.requirement_id == requirement_id
        ).first()

        current_status = match_result.status if match_result else MatchStatus.UNVERIFIED
        v_type, reason = question_generator.determine_verification_method(
            requirement_text=req.requirement_text,
            requirement_type=req.requirement_type,
            current_status=current_status
        )

        return ProveRequirementResponse(
            requirement_id=req.id,
            requirement=req.requirement_text,
            current_status=current_status,
            verification_type=v_type,
            reason=reason
        )

    @classmethod
    async def create_challenge(
        cls,
        application_id: int,
        requirement_id: int,
        db: Session
    ) -> VerificationChallengeResponse:
        """Generates a targeted technical challenge for the given requirement."""
        req = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found.")

        challenge_data = await question_generator.generate_challenge(req.requirement_text)
        return VerificationChallengeResponse(
            application_id=application_id,
            requirement_id=requirement_id,
            requirement=req.requirement_text,
            verification_type=VerificationType.AI_CHALLENGE,
            challenge=challenge_data["challenge"],
            instructions=challenge_data["instructions"]
        )

    @classmethod
    async def create_interview_question(
        cls,
        application_id: int,
        requirement_id: int,
        db: Session
    ) -> VerificationInterviewQuestionResponse:
        """Generates a targeted interview question for the given requirement."""
        req = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found.")

        question = await question_generator.generate_interview_question(req.requirement_text)
        return VerificationInterviewQuestionResponse(
            application_id=application_id,
            requirement_id=requirement_id,
            requirement=req.requirement_text,
            verification_type=VerificationType.AI_INTERVIEW,
            question=question
        )

    @classmethod
    async def evaluate_candidate_answer(
        cls,
        application_id: int,
        requirement_id: int,
        question: str,
        candidate_answer: str,
        verification_type: VerificationType,
        db: Session
    ) -> CandidateAnswerEvaluationResponse:
        """
        Evaluates a candidate's response.
        If evaluation shows STRONG_EVIDENCE, transitions requirement to VERIFIED,
        adds evidence to the graph, and logs the complete audit trail.
        """
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")

        req = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found.")

        match_result = db.query(MatchResult).filter(
            MatchResult.application_id == application_id,
            MatchResult.requirement_id == requirement_id
        ).first()

        original_status = match_result.status if match_result else MatchStatus.UNVERIFIED

        # Run AI Evaluation
        eval_result, confidence, reasoning, evidence_text = await answer_evaluator.evaluate(
            requirement_text=req.requirement_text,
            question=question,
            candidate_answer=candidate_answer
        )

        # Record Verification Audit Trail
        history_entry = VerificationHistory(
            application_id=application_id,
            requirement_id=requirement_id,
            verification_type=verification_type,
            question=question,
            candidate_response=candidate_answer,
            ai_result=eval_result,
            ai_reasoning=reasoning,
            confidence=confidence
        )
        db.add(history_entry)

        # Determine updated status
        updated_status = original_status
        if eval_result == VerificationEvaluationResult.STRONG_EVIDENCE:
            updated_status = MatchStatus.VERIFIED
            # Append verified evidence
            new_evidence = Evidence(
                application_id=application_id,
                requirement_id=requirement_id,
                source_type=EvidenceSourceType.AI_INTERVIEW if verification_type == VerificationType.AI_INTERVIEW else EvidenceSourceType.ASSESSMENT,
                source_text=evidence_text,
                source_location=f"AI Verification ({verification_type.value})",
                confidence=confidence
            )
            db.add(new_evidence)

            # Update match result
            if match_result:
                match_result.status = MatchStatus.VERIFIED
                match_result.reasoning = f"Verified through {verification_type.value}: {reasoning}"
                match_result.confidence = confidence
        elif eval_result == VerificationEvaluationResult.PARTIAL_EVIDENCE and original_status == MatchStatus.UNVERIFIED:
            updated_status = MatchStatus.PARTIAL
            if match_result:
                match_result.status = MatchStatus.PARTIAL
                match_result.reasoning = f"Partial evidence confirmed via {verification_type.value}: {reasoning}"
                match_result.confidence = confidence

        db.commit()

        return CandidateAnswerEvaluationResponse(
            result=eval_result,
            confidence=confidence,
            reasoning=reasoning,
            evidence=evidence_text,
            original_status=original_status,
            updated_status=updated_status
        )

    @classmethod
    def record_hr_challenge(
        cls,
        application_id: int,
        requirement_id: int,
        reason: str,
        new_status: Optional[MatchStatus],
        hr_user: User,
        db: Session
    ) -> HRChallenge:
        """Records an HR challenge/override while preserving original AI analysis history."""
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")

        req = db.query(JobRequirement).filter(JobRequirement.id == requirement_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Requirement not found.")

        match_result = db.query(MatchResult).filter(
            MatchResult.application_id == application_id,
            MatchResult.requirement_id == requirement_id
        ).first()

        original_status_str = match_result.status.value if match_result else "UNVERIFIED"

        challenge = HRChallenge(
            application_id=application_id,
            requirement_id=requirement_id,
            hr_user_id=hr_user.id,
            original_status=original_status_str,
            new_status=new_status.value if new_status else None,
            reason=reason
        )
        db.add(challenge)

        # Update current match result if new status provided
        if new_status and match_result:
            match_result.status = new_status
            match_result.reasoning = f"[HR Review Override by {hr_user.email}]: {reason}"
            db.add(match_result)

        db.commit()
        db.refresh(challenge)
        return challenge

verification_service = VerificationService()
