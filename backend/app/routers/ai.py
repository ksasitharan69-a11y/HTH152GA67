from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.dependencies import get_current_user
from app.database.models import User, Application, JobRequirement, VerificationType
from app.schemas.ai import (
    ApplicationAnalysisResponse, EvidenceGraphResponse,
    ProveRequirementResponse, VerificationChallengeRequest,
    VerificationChallengeResponse, VerificationInterviewQuestionRequest,
    VerificationInterviewQuestionResponse, CandidateAnswerEvaluationRequest,
    CandidateAnswerEvaluationResponse, FinalAnalysisResponse
)
from app.services.application_service import application_service
from app.services.verification_service import verification_service
from app.ai.final_analyzer import final_analyzer

router = APIRouter(prefix="/ai", tags=["AI Reasoning & Verification"])

@router.post(
    "/applications/{application_id}/analyze",
    response_model=ApplicationAnalysisResponse,
    summary="Run AI Match & Evidence Analysis",
    description="Analyzes candidate resume against vacancy requirements, extracts concrete evidence snippets, and computes match statuses."
)
async def analyze_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        return await application_service.run_ai_analysis_pipeline(application_id, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "AI_ANALYSIS_FAILED",
                "message": f"Unable to complete AI analysis at this time: {str(e)}"
            }
        )

@router.get(
    "/applications/{application_id}/evidence-graph",
    response_model=EvidenceGraphResponse,
    summary="Get Evidence Graph for Application",
    description="Returns graph nodes and edges representing: Requirement -> Evidence -> Reasoning -> Decision."
)
def get_evidence_graph(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    return application_service.generate_evidence_graph(app)

@router.post(
    "/applications/{application_id}/requirements/{requirement_id}/prove",
    response_model=ProveRequirementResponse,
    summary="Determine Verification Method ('Prove This Skill')",
    description="Analyzes the requirement and current match status to suggest whether an AI Challenge, Interview, or Document Upload is required."
)
def prove_requirement(
    application_id: int,
    requirement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return verification_service.get_proof_recommendation(
        application_id=application_id,
        requirement_id=requirement_id,
        db=db
    )

@router.post(
    "/verification/challenge",
    response_model=VerificationChallengeResponse,
    summary="Generate AI Verification Challenge",
    description="Generates a targeted, scenario-based technical challenge specifically for the requirement."
)
async def generate_challenge(
    payload: VerificationChallengeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await verification_service.create_challenge(
        application_id=payload.application_id,
        requirement_id=payload.requirement_id,
        db=db
    )

@router.post(
    "/verification/interview-question",
    response_model=VerificationInterviewQuestionResponse,
    summary="Generate AI Interview Question",
    description="Generates a targeted technical interview question assessing practical experience with the requirement."
)
async def generate_interview_question(
    payload: VerificationInterviewQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await verification_service.create_interview_question(
        application_id=payload.application_id,
        requirement_id=payload.requirement_id,
        db=db
    )

@router.post(
    "/verification/evaluate",
    response_model=CandidateAnswerEvaluationResponse,
    summary="Evaluate Candidate Answer & Update Status",
    description="Evaluates technical depth and evidence. If STRONG_EVIDENCE is proven, updates status to VERIFIED while saving full audit history."
)
async def evaluate_candidate_answer(
    payload: CandidateAnswerEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await verification_service.evaluate_candidate_answer(
        application_id=payload.application_id,
        requirement_id=payload.requirement_id,
        question=payload.question,
        candidate_answer=payload.candidate_answer,
        verification_type=VerificationType.AI_INTERVIEW,
        db=db
    )

@router.get(
    "/applications/{application_id}/final-analysis",
    response_model=FinalAnalysisResponse,
    summary="Get Final Comprehensive Analysis & Audit Report",
    description="Returns detailed breakdown, overall requirement coverage, verified evidence, verification history, and human overrides."
)
def get_final_analysis(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    return final_analyzer.generate_final_report(app)
