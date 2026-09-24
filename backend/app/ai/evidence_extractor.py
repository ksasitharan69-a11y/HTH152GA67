import re
from typing import List, Dict, Any, Optional, Tuple
from app.database.models import EvidenceSourceType

class EvidenceExtractor:
    """Finds exact supporting textual evidence for a given requirement across candidate data."""

    @classmethod
    def extract_evidence_snippets(
        cls,
        requirement_text: str,
        resume_text: str,
        structured_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Locates sentences, bullets, or paragraphs that directly mention or relate to the requirement.
        Returns list of evidence dictionaries:
        [{"source_type": ..., "source_text": ..., "source_location": ..., "confidence": ...}]
        """
        evidence_list = []
        req_clean = requirement_text.strip().lower()
        req_keywords = [w for w in re.findall(r"\b[a-zA-Z0-9+#.]+\b", req_clean) if len(w) > 2 and w not in ["with", "have", "must", "years", "plus", "good", "strong"]]

        # 1. Search in structured sections if available
        if structured_data:
            # Check experience
            for exp in structured_data.get("experience", []):
                if cls._contains_requirement(exp, req_clean, req_keywords):
                    evidence_list.append({
                        "source_type": EvidenceSourceType.EXPERIENCE,
                        "source_text": exp.strip(),
                        "source_location": "Work Experience Section",
                        "confidence": 0.95
                    })

            # Check projects
            for proj in structured_data.get("projects", []):
                if cls._contains_requirement(proj, req_clean, req_keywords):
                    evidence_list.append({
                        "source_type": EvidenceSourceType.PROJECT,
                        "source_text": proj.strip(),
                        "source_location": "Projects Section",
                        "confidence": 0.90
                    })

            # Check certifications
            for cert in structured_data.get("certifications", []):
                if cls._contains_requirement(cert, req_clean, req_keywords):
                    evidence_list.append({
                        "source_type": EvidenceSourceType.CERTIFICATION,
                        "source_text": cert.strip(),
                        "source_location": "Certifications Section",
                        "confidence": 0.98
                    })

            # Check education
            for edu in structured_data.get("education", []):
                if cls._contains_requirement(edu, req_clean, req_keywords):
                    evidence_list.append({
                        "source_type": EvidenceSourceType.EDUCATION,
                        "source_text": edu.strip(),
                        "source_location": "Education Section",
                        "confidence": 0.95
                    })

        # 2. Search paragraphs / sentences in raw resume text if no structured evidence was found
        if not evidence_list and resume_text:
            sentences = re.split(r"(?<=[.!?\n])\s+", resume_text)
            for s in sentences:
                s_clean = s.strip()
                if len(s_clean) > 15 and cls._contains_requirement(s_clean, req_clean, req_keywords):
                    evidence_list.append({
                        "source_type": EvidenceSourceType.RESUME,
                        "source_text": s_clean[:300],
                        "source_location": "Resume Body",
                        "confidence": 0.85
                    })
                    if len(evidence_list) >= 3:
                        break

        # Deduplicate evidence by text snippet
        unique_evidence = []
        seen = set()
        for ev in evidence_list:
            snippet = ev["source_text"][:60].lower()
            if snippet not in seen:
                seen.add(snippet)
                unique_evidence.append(ev)

        return unique_evidence

    @staticmethod
    def _contains_requirement(text: str, req_phrase: str, keywords: List[str]) -> bool:
        """Determines if text contains the full phrase or key technical anchors."""
        text_lower = text.lower()
        # Direct phrase match
        if req_phrase in text_lower:
            return True
        # Check if primary keyword tokens match
        if keywords:
            matches = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", text_lower))
            # If 70% or more keywords matched
            if matches / len(keywords) >= 0.7:
                return True
        return False

evidence_extractor = EvidenceExtractor()
