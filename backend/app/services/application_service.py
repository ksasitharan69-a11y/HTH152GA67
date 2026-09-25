import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.database.models import (
    Application, Vacancy, JobRequirement, CandidateProfile,
    MatchResult, Evidence, VerificationHistory, HRChallenge,
    ApplicationFeedback, ApplicationStatus, MatchStatus,
    VerificationEvaluationResult, VerificationType, RequirementType
)
import re
from app.ai.jd_analyzer import jd_analyzer
from app.ai.resume_analyzer import resume_analyzer
from app.ai.matcher import matcher
from app.ai.pii_shield import pii_shield
from app.schemas.ai import (
    ApplicationAnalysisResponse, RequirementMatchItem,
    EvidenceResponseItem, EvidenceGraphResponse, GraphNode, GraphEdge
)

logger = logging.getLogger(__name__)

def verify_citation_grounding(evidence_text: str, resume_text: str) -> bool:
    """Verifies that an extracted evidence citation actually exists in the resume text."""
    if not evidence_text or not resume_text:
        return False
    clean_ev = re.sub(r"\s+", " ", evidence_text.strip().lower())
    clean_res = re.sub(r"\s+", " ", resume_text.strip().lower())
    if clean_ev in clean_res:
        return True
    words = [w for w in re.findall(r"\b\w{3,}\b", clean_ev) if w not in ["with", "have", "from", "that", "this", "section"]]
    if not words:
        return True
    match_cnt = sum(1 for w in words if w in clean_res)
    return (match_cnt / len(words)) >= 0.60

class ApplicationService:
    """Core orchestration service for job applications and AI analysis pipelines."""

    @classmethod
    async def run_ai_analysis_pipeline(
        cls,
        application_id: int,
        db: Session
    ) -> ApplicationAnalysisResponse:
        """
        Executes the end-to-end AI analysis pipeline:
        1. Loads application, vacancy, requirements, extracted resume text.
        2. Ensures structured requirements exist for the vacancy.
        3. Parses factual resume entities.
        4. Matches each requirement against resume facts.
        5. Persists Evidences and MatchResults.
        6. Updates application status to UNDER_REVIEW or VERIFICATION_REQUIRED.
        """
        application = db.query(Application).filter(Application.id == application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application not found.")

        vacancy = application.vacancy
        if not vacancy:
            raise HTTPException(status_code=404, detail="Associated vacancy not found.")

        raw_resume_text = application.extracted_resume_text or ""
        if not raw_resume_text:
            raise HTTPException(
                status_code=400,
                detail="Application does not have extracted resume text available for analysis."
            )

        # 1. Apply PII & Anti-Bias Shield before any LLM evaluation
        candidate_name = application.candidate.name if application.candidate else None
        sanitized_resume, redactions = pii_shield.mask_pii(raw_resume_text, candidate_name=candidate_name)
        application.sanitized_resume_text = sanitized_resume

        # 2. Ensure vacancy has structured requirements
        requirements = db.query(JobRequirement).filter(JobRequirement.vacancy_id == vacancy.id).all()
        if not requirements:
            logger.info(f"Extracting structured requirements for vacancy {vacancy.id} using JD Analyzer...")
            jd_analysis = await jd_analyzer.analyze(
                description=vacancy.description,
                title=vacancy.title,
                required_skills=vacancy.required_skills,
                preferred_skills=vacancy.preferred_skills,
                required_experience=vacancy.required_experience,
                education=vacancy.education
            )
            for req in jd_analysis.requirements:
                db_req = JobRequirement(
                    vacancy_id=vacancy.id,
                    requirement_text=req.requirement,
                    requirement_type=req.type,
                    importance=req.importance
                )
                db.add(db_req)
            db.commit()
            requirements = db.query(JobRequirement).filter(JobRequirement.vacancy_id == vacancy.id).all()

        # 3. Extract structured entities from sanitized candidate resume
        resume_data = await resume_analyzer.analyze(sanitized_resume)
        resume_dict = resume_data.model_dump()

        # Clean existing match results and evidences for fresh re-analysis
        db.query(Evidence).filter(Evidence.application_id == application.id).delete()
        db.query(MatchResult).filter(MatchResult.application_id == application.id).delete()
        db.commit()

        # 4. Perform matching, evidence extraction, and deterministic citation verification
        requirement_items: List[RequirementMatchItem] = []
        has_unverified = False
        verified_count = 0

        for req in requirements:
            match_status, reasoning, confidence, evidences = await matcher.match_requirement(
                requirement_text=req.requirement_text,
                requirement_type=req.requirement_type,
                importance=req.importance,
                resume_text=sanitized_resume,
                resume_data=resume_dict
            )

            # Deterministic Citation Verification: ensure extracted evidence exists in sanitized resume
            grounded_evidences = []
            for ev in evidences:
                source_txt = ev.get("source_text", "")
                if verify_citation_grounding(source_txt, sanitized_resume):
                    grounded_evidences.append(ev)
                else:
                    logger.warning(f"Ungrounded evidence rejected for req {req.id}: '{source_txt[:60]}...'")

            # If evidence could not be verified in resume text, mark status as UNVERIFIED
            if not grounded_evidences and match_status in [MatchStatus.VERIFIED, MatchStatus.PARTIAL]:
                # If skills list fallback or general, check if listed in skills
                skills_lower = [s.lower() for s in resume_dict.get("skills", [])]
                if not any(req.requirement_text.lower() in s for s in skills_lower):
                    match_status = MatchStatus.UNVERIFIED
                    reasoning = f"Unverified: Citations could not be grounded in candidate's sanitized resume text for '{req.requirement_text}'."
                    confidence = 0.50

            if match_status in [MatchStatus.UNVERIFIED, MatchStatus.PARTIAL]:
                has_unverified = True
            if match_status == MatchStatus.VERIFIED:
                verified_count += 1

            # Persist MatchResult
            db_match = MatchResult(
                application_id=application.id,
                requirement_id=req.id,
                status=match_status,
                reasoning=reasoning,
                confidence=confidence
            )
            db.add(db_match)
            db.flush()

            # Persist Verified Evidences
            db_evidence_items: List[EvidenceResponseItem] = []
            for ev in grounded_evidences:
                source_type = ev.get("source_type")
                if not hasattr(source_type, "value"):
                    source_type = "RESUME"
                db_ev = Evidence(
                    application_id=application.id,
                    requirement_id=req.id,
                    source_type=source_type,
                    source_text=ev.get("source_text", ""),
                    source_location=ev.get("source_location"),
                    confidence=ev.get("confidence", 1.0)
                )
                db.add(db_ev)
                db.flush()
                db_evidence_items.append(EvidenceResponseItem(
                    id=db_ev.id,
                    source_type=db_ev.source_type,
                    source_text=db_ev.source_text,
                    source_location=db_ev.source_location,
                    confidence=db_ev.confidence
                ))

            requirement_items.append(RequirementMatchItem(
                requirement_id=req.id,
                requirement=req.requirement_text,
                type=req.requirement_type,
                importance=req.importance,
                status=match_status,
                evidence=db_evidence_items,
                reasoning=reasoning,
                confidence=confidence
            ))

        # Update application status based on initial analysis
        if has_unverified and application.status == ApplicationStatus.APPLIED:
            application.status = ApplicationStatus.VERIFICATION_REQUIRED
        elif application.status == ApplicationStatus.APPLIED:
            application.status = ApplicationStatus.UNDER_REVIEW

        db.commit()

        # Calculate initial coverage percentage
        total_reqs = len(requirement_items)
        coverage_pct = round((verified_count / total_reqs * 100), 1) if total_reqs > 0 else 0.0

        return ApplicationAnalysisResponse(
            application_id=application.id,
            candidate_id=application.candidate_id,
            candidate_name=application.candidate.name,
            vacancy_id=vacancy.id,
            vacancy_title=vacancy.title,
            overall_coverage_pct=coverage_pct,
            requirements=requirement_items
        )

    @classmethod
    def generate_evidence_graph(cls, application: Application) -> EvidenceGraphResponse:
        """
        Builds graph-friendly JSON representing:
        Requirement Nodes -> Evidence Nodes -> Reasoning Nodes -> Decision Nodes
        """
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []

        match_results = application.match_results
        evidences = application.evidences

        # Group evidences by requirement_id
        ev_by_req: Dict[int, List[Evidence]] = {}
        for ev in evidences:
            ev_by_req.setdefault(ev.requirement_id, []).append(ev)

        for mr in match_results:
            req = mr.requirement
            req_node_id = f"req_{req.id}"
            dec_node_id = f"dec_{req.id}"
            reas_node_id = f"reas_{req.id}"

            # Requirement node
            nodes.append(GraphNode(
                id=req_node_id,
                label=f"Requirement: {req.requirement_text}",
                type="requirement",
                data={
                    "type": req.requirement_type.value,
                    "importance": req.importance
                }
            ))

            # Evidences nodes
            req_evs = ev_by_req.get(req.id, [])
            if req_evs:
                for ev in req_evs:
                    ev_node_id = f"ev_{ev.id}"
                    nodes.append(GraphNode(
                        id=ev_node_id,
                        label=f"Evidence ({ev.source_type.value})",
                        type="evidence",
                        data={
                            "text": ev.source_text,
                            "location": ev.source_location,
                            "confidence": ev.confidence
                        }
                    ))
                    # Edge from requirement to evidence
                    edges.append(GraphEdge(
                        id=f"e_{req_node_id}_{ev_node_id}",
                        source=req_node_id,
                        target=ev_node_id,
                        label="supported by"
                    ))
                    # Edge from evidence to reasoning
                    edges.append(GraphEdge(
                        id=f"e_{ev_node_id}_{reas_node_id}",
                        source=ev_node_id,
                        target=reas_node_id,
                        label="informs"
                    ))
            else:
                # Direct edge from requirement to reasoning when unverified
                edges.append(GraphEdge(
                    id=f"e_{req_node_id}_{reas_node_id}",
                    source=req_node_id,
                    target=reas_node_id,
                    label="no direct evidence"
                ))

            # Reasoning node
            nodes.append(GraphNode(
                id=reas_node_id,
                label="Analysis & Reasoning",
                type="reasoning",
                data={"reasoning": mr.reasoning}
            ))

            # Decision node
            nodes.append(GraphNode(
                id=dec_node_id,
                label=f"Match Status: {mr.status.value}",
                type="decision",
                data={
                    "status": mr.status.value,
                    "confidence": mr.confidence
                }
            ))

            # Edge from reasoning to decision
            edges.append(GraphEdge(
                id=f"e_{reas_node_id}_{dec_node_id}",
                source=reas_node_id,
                target=dec_node_id,
                label="concludes"
            ))

        return EvidenceGraphResponse(
            application_id=application.id,
            nodes=nodes,
            edges=edges
        )

application_service = ApplicationService()
