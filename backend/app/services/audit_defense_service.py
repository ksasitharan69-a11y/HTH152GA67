import re
import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.database.models import (
    Application, Vacancy, JobRequirement, MatchResult, Evidence,
    VerificationHistory, HRChallenge, Assessment, MatchStatus
)
from app.ai.llm_client import llm_client

logger = logging.getLogger(__name__)

class AuditDefenseResponse(BaseModel):
    application_id: int
    question: str
    answer: str
    referenced_requirements: List[str] = []
    referenced_evidence_ids: List[int] = []
    referenced_overrides: List[Dict[str, Any]] = []
    assessment_finding: Optional[str] = None


class AuditDefenseService:
    """
    Explainability and Audit Defense Agent.
    Strictly answers recruiter and auditor queries using only stored,
    verified database records, match results, evidence citations, and human overrides.
    """

    SYSTEM_INSTRUCTION = """
You are the HireProof Explainable Audit Defense Agent.
Your SOLE purpose is to provide factually verifiable explanations for candidate match statuses, gap analyses, evidence findings, and assessment scores.

CRITICAL RULES:
1. Ground your answer ONLY in the structured audit records and candidate evidence provided in the context.
2. NEVER hallucinate or assume facts not present in the records.
3. Explicitly reference Requirement IDs/Names, Evidence IDs, and HR Overrides where applicable.
4. Output a clean JSON object with:
{
  "answer": "Detailed, professional explanation strictly grounded in the audit records.",
  "referenced_requirements": ["Requirement 1 name", ...],
  "referenced_evidence_ids": [1, 2, ...],
  "assessment_finding": "Summary of assessment findings if relevant"
}
"""

    @classmethod
    async def ask_audit_defense(
        cls,
        application_id: int,
        question: str,
        db: Session
    ) -> AuditDefenseResponse:
        """
        Processes an audit defense question against the candidate's application records.
        """
        if not question or not question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty.")

        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")

        # 1. Compile all grounded records
        vacancy = application.vacancy
        requirements = db.query(JobRequirement).filter(JobRequirement.vacancy_id == vacancy.id).all()
        match_results = db.query(MatchResult).filter(MatchResult.application_id == application.id).all()
        evidences = db.query(Evidence).filter(Evidence.application_id == application.id).all()
        verifications = db.query(VerificationHistory).filter(VerificationHistory.application_id == application.id).all()
        challenges = db.query(HRChallenge).filter(HRChallenge.application_id == application.id).all()
        assessment = db.query(Assessment).filter(Assessment.application_id == application.id).first()

        req_map = {r.id: r for r in requirements}
        mr_map = {mr.requirement_id: mr for mr in match_results}
        ev_by_req: Dict[int, List[Evidence]] = {}
        for ev in evidences:
            ev_by_req.setdefault(ev.requirement_id, []).append(ev)

        # 2. Build audit summary for context
        audit_records = []
        for r_id, req in req_map.items():
            mr = mr_map.get(r_id)
            req_evs = ev_by_req.get(r_id, [])
            audit_records.append({
                "requirement_id": req.id,
                "requirement_text": req.requirement_text,
                "importance": req.importance,
                "status": mr.status.value if mr else "UNVERIFIED",
                "reasoning": mr.reasoning if mr else "No evaluation recorded.",
                "evidence_count": len(req_evs),
                "evidences": [
                    {
                        "id": e.id,
                        "source_type": e.source_type.value,
                        "source_text": e.source_text[:200],
                        "confidence": e.confidence
                    } for e in req_evs
                ]
            })

        overrides_list = [
            {
                "id": c.id,
                "requirement_id": c.requirement_id,
                "original_status": c.original_status,
                "new_status": c.new_status,
                "reason": c.reason,
                "created_at": c.created_at.isoformat() if c.created_at else None
            } for c in challenges
        ]

        assessment_data = None
        if assessment:
            assessment_data = {
                "score": assessment.score,
                "verdict": assessment.verdict,
                "status": assessment.status.value,
                "audit_justification": assessment.audit_justification,
                "findings": assessment.findings_breakdown
            }

        # 3. Attempt LLM Grounded Explanation
        context_payload = {
            "candidate_id": application.candidate_id,
            "candidate_name": application.candidate.name if application.candidate else "Candidate",
            "vacancy_title": vacancy.title,
            "audit_records": audit_records,
            "human_overrides": overrides_list,
            "skill_assessment": assessment_data
        }

        prompt = f"""
        Audit Records Context:
        {json.dumps(context_payload, indent=2)}

        Auditor / Recruiter Question:
        "{question}"
        """

        llm_resp = await llm_client.generate_json(
            prompt=prompt,
            system_instruction=cls.SYSTEM_INSTRUCTION
        )

        if llm_resp and "answer" in llm_resp:
            return AuditDefenseResponse(
                application_id=application.id,
                question=question,
                answer=llm_resp.get("answer", ""),
                referenced_requirements=llm_resp.get("referenced_requirements", []),
                referenced_evidence_ids=llm_resp.get("referenced_evidence_ids", []),
                referenced_overrides=overrides_list,
                assessment_finding=llm_resp.get("assessment_finding")
            )

        # 4. Deterministic Grounded Fallback
        return cls._deterministic_audit_defense(
            question=question,
            application=application,
            audit_records=audit_records,
            overrides_list=overrides_list,
            assessment_data=assessment_data
        )

    @classmethod
    def _deterministic_audit_defense(
        cls,
        question: str,
        application: Application,
        audit_records: List[Dict[str, Any]],
        overrides_list: List[Dict[str, Any]],
        assessment_data: Optional[Dict[str, Any]]
    ) -> AuditDefenseResponse:
        """Deterministic rule-based audit explanation based on structured database records."""
        q_lower = question.lower()
        referenced_reqs = []
        referenced_evs = []
        answer_parts = []

        # Case 1: Question about assessment result
        if "assessment" in q_lower or "score" in q_lower or "test" in q_lower or "verdict" in q_lower:
            if assessment_data and assessment_data.get("verdict"):
                finding_str = f"Score: {assessment_data.get('score')}/100, Verdict: {assessment_data.get('verdict')}."
                answer_parts.append(
                    f"The candidate completed the skill assessment with a score of {assessment_data.get('score')}/100 "
                    f"resulting in a verdict of {assessment_data.get('verdict')}. "
                    f"Audit Justification: {assessment_data.get('audit_justification')}"
                )
                return AuditDefenseResponse(
                    application_id=application.id,
                    question=question,
                    answer=" ".join(answer_parts),
                    referenced_requirements=[],
                    referenced_evidence_ids=[],
                    referenced_overrides=overrides_list,
                    assessment_finding=finding_str
                )
            else:
                return AuditDefenseResponse(
                    application_id=application.id,
                    question=question,
                    answer="No completed assessment record exists for this application yet. Status is pending.",
                    referenced_requirements=[],
                    referenced_evidence_ids=[],
                    referenced_overrides=overrides_list
                )

        # Case 2: Question about largest gap / unverified requirements
        if "largest gap" in q_lower or "biggest gap" in q_lower or "missing" in q_lower or "gap" in q_lower:
            gaps = [r for r in audit_records if r["status"] in ["GAP", "UNVERIFIED"]]
            if gaps:
                primary_gap = gaps[0]
                referenced_reqs.append(primary_gap["requirement_text"])
                answer_parts.append(
                    f"The primary gap identified is '{primary_gap['requirement_text']}' marked as {primary_gap['status']}. "
                    f"Reasoning: {primary_gap['reasoning']}"
                )
            else:
                answer_parts.append("No critical gaps were identified across the candidate's evaluated requirements.")

        # Case 3: Question about a specific requirement or status (e.g. PARTIAL / VERIFIED)
        matched_specific = False
        for rec in audit_records:
            req_words = [w for w in re.findall(r"\b\w{4,}\b", rec["requirement_text"].lower()) if w not in ["with", "have", "must", "years", "plus"]]
            if any(w in q_lower for w in req_words) or (rec["status"].lower() in q_lower):
                matched_specific = True
                referenced_reqs.append(rec["requirement_text"])
                ev_ids = [e["id"] for e in rec["evidences"]]
                referenced_evs.extend(ev_ids)
                ev_summary = f"Supported by {len(ev_ids)} evidence snippet(s) [IDs: {ev_ids}]." if ev_ids else "No grounded textual evidence was found in the sanitized resume."
                answer_parts.append(
                    f"Requirement '{rec['requirement_text']}' was determined as {rec['status']}. "
                    f"Reasoning: {rec['reasoning']} {ev_summary}"
                )

        # Case 4: Human Overrides check
        if "override" in q_lower or "recruiter" in q_lower or "human" in q_lower or "challenge" in q_lower:
            if overrides_list:
                for ov in overrides_list:
                    answer_parts.append(
                        f"An HR override was logged: status updated from {ov['original_status']} to {ov.get('new_status')} with reason: '{ov['reason']}'."
                    )
            else:
                answer_parts.append("No human HR overrides or status challenges have been recorded for this application.")

        if not answer_parts:
            # General overview grounded in data
            total = len(audit_records)
            verified = len([r for r in audit_records if r["status"] == "VERIFIED"])
            partial = len([r for r in audit_records if r["status"] == "PARTIAL"])
            unverified = len([r for r in audit_records if r["status"] == "UNVERIFIED"])
            answer_parts.append(
                f"Candidate evaluation summary for {total} requirements: {verified} VERIFIED, {partial} PARTIAL, {unverified} UNVERIFIED. "
                f"All decisions are strictly derived from verified resume evidence and assessment performance."
            )

        return AuditDefenseResponse(
            application_id=application.id,
            question=question,
            answer=" ".join(answer_parts),
            referenced_requirements=list(set(referenced_reqs)),
            referenced_evidence_ids=list(set(referenced_evs)),
            referenced_overrides=overrides_list,
            assessment_finding=assessment_data.get("verdict") if assessment_data else None
        )

audit_defense_service = AuditDefenseService()
