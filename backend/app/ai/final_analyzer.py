from typing import List, Dict, Any
from app.database.models import (
    Application, MatchResult, Evidence, VerificationHistory,
    HRChallenge, ApplicationFeedback, MatchStatus
)
from app.schemas.ai import (
    FinalAnalysisResponse, RequirementMatchItem, EvidenceResponseItem,
    VerificationHistoryItem, HRChallengeResponse, FeedbackResponse
)

class FinalAnalyzer:
    """Aggregates all multi-stage analysis, proof, verification, and human audit data into a comprehensive report."""

    @staticmethod
    def generate_final_report(application: Application) -> FinalAnalysisResponse:
        vacancy = application.vacancy
        candidate = application.candidate
        match_results = application.match_results
        evidences = application.evidences
        verifications = application.verifications
        challenges = application.challenges
        feedbacks = application.feedbacks

        # Map evidences by requirement_id
        evidence_by_req: Dict[int, List[EvidenceResponseItem]] = {}
        for ev in evidences:
            if ev.requirement_id not in evidence_by_req:
                evidence_by_req[ev.requirement_id] = []
            evidence_by_req[ev.requirement_id].append(EvidenceResponseItem(
                id=ev.id,
                source_type=ev.source_type,
                source_text=ev.source_text,
                source_location=ev.source_location,
                confidence=ev.confidence
            ))

        # Build requirement breakdown items
        req_breakdown: List[RequirementMatchItem] = []
        verified_count = 0
        partial_count = 0
        unverified_count = 0
        gap_count = 0

        for mr in match_results:
            req = mr.requirement
            if mr.status == MatchStatus.VERIFIED:
                verified_count += 1
            elif mr.status == MatchStatus.PARTIAL:
                partial_count += 1
            elif mr.status == MatchStatus.UNVERIFIED:
                unverified_count += 1
            elif mr.status == MatchStatus.GAP:
                gap_count += 1

            req_breakdown.append(RequirementMatchItem(
                requirement_id=req.id,
                requirement=req.requirement_text,
                type=req.requirement_type,
                importance=req.importance,
                status=mr.status,
                evidence=evidence_by_req.get(req.id, []),
                reasoning=mr.reasoning,
                confidence=mr.confidence
            ))

        total_reqs = len(req_breakdown)
        coverage_pct = 0.0
        if total_reqs > 0:
            # Weighted formula: Verified counts 100%, Partial counts 50%
            score = (verified_count * 1.0) + (partial_count * 0.5)
            coverage_pct = round((score / total_reqs) * 100, 1)

        # Verification audit trail items
        audit_trail: List[VerificationHistoryItem] = []
        for v in verifications:
            audit_trail.append(VerificationHistoryItem(
                id=v.id,
                requirement_id=v.requirement_id,
                requirement_text=v.requirement.requirement_text if v.requirement else "Requirement",
                verification_type=v.verification_type,
                question=v.question,
                candidate_response=v.candidate_response,
                ai_result=v.ai_result,
                ai_reasoning=v.ai_reasoning,
                confidence=v.confidence,
                created_at=v.created_at
            ))

        # Human HR Challenges / Overrides
        human_reviews: List[HRChallengeResponse] = []
        for ch in challenges:
            human_reviews.append(HRChallengeResponse.model_validate(ch))

        # Candidate feedbacks
        feedback_list: List[FeedbackResponse] = []
        for fb in feedbacks:
            feedback_list.append(FeedbackResponse.model_validate(fb))

        return FinalAnalysisResponse(
            application_id=application.id,
            candidate={
                "id": candidate.id,
                "name": candidate.name,
                "email": candidate.user.email if candidate.user else None,
                "github_url": candidate.github_url,
                "linkedin_url": candidate.linkedin_url
            },
            vacancy={
                "id": vacancy.id,
                "title": vacancy.title,
                "company_id": vacancy.company_id,
                "company_name": vacancy.company.name if vacancy.company else None,
                "department_name": vacancy.department.name if vacancy.department else None,
                "status": vacancy.status.value
            },
            overall_requirement_coverage=coverage_pct,
            total_requirements=total_reqs,
            verified_count=verified_count,
            partial_count=partial_count,
            unverified_count=unverified_count,
            gap_count=gap_count,
            requirement_breakdown=req_breakdown,
            verification_audit_trail=audit_trail,
            human_reviews=human_reviews,
            feedbacks=feedback_list
        )

final_analyzer = FinalAnalyzer()
