import re
from typing import Tuple, Dict, Optional

class PIIShield:
    """
    HireProof PII & Anti-Bias Shield.
    
    Mitigates exposure of candidate personally identifiable information (PII) 
    and chronological indicators before passing resume text to downstream LLM evaluators.
    Preserves all technical evidence (skills, tools, projects, responsibilities, achievements).
    """

    EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
    PHONE_PATTERN = re.compile(r"(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b")
    URL_PATTERN = re.compile(r"https?://(?:www\.)?(?:linkedin\.com/in/[a-zA-Z0-9_-]+|github\.com/[a-zA-Z0-9_-]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s]*)?)", re.IGNORECASE)
    YEAR_SPAN_PATTERN = re.compile(r"\b(19\d{2}|20[0-2]\d)\s*[-–—]\s*(19\d{2}|20[0-2]\d|Present|Current)\b", re.IGNORECASE)
    GRADUATION_YEAR_PATTERN = re.compile(r"\b(?:graduated|class of|batch of|passing year|degree in)\s*[:\-]?\s*(19\d{2}|20[0-2]\d)\b", re.IGNORECASE)
    ZIP_CODE_PATTERN = re.compile(r"\b(?:zip(?:\s*code)?|pin(?:\s*code)?)\s*[:\-]?\s*\d{5,6}\b", re.IGNORECASE)

    @classmethod
    def mask_pii(cls, text: str, candidate_name: Optional[str] = None) -> Tuple[str, Dict[str, int]]:
        """
        Redacts identifying contact information, names, and explicit chronological calendar years
        to safeguard against unconscious demographic bias.
        
        Returns:
            Tuple[sanitized_text, redaction_counts]
        """
        if not text:
            return "", {}

        sanitized = text
        redaction_counts: Dict[str, int] = {}

        # 1. Mask explicit Candidate Name if provided
        if candidate_name and candidate_name.strip():
            name_parts = candidate_name.strip().split()
            # Full name match
            full_name_regex = re.compile(re.escape(candidate_name.strip()), re.IGNORECASE)
            matches = len(full_name_regex.findall(sanitized))
            if matches:
                sanitized = full_name_regex.sub("[CANDIDATE_NAME_REDACTED]", sanitized)
                redaction_counts["candidate_name"] = matches
            # Individual first/last name parts if > 3 chars
            for part in name_parts:
                if len(part) > 3 and part.lower() not in ["john", "jane", "alex", "chris", "work", "developer", "engineer"]:
                    part_regex = re.compile(r"\b" + re.escape(part) + r"\b", re.IGNORECASE)
                    m = len(part_regex.findall(sanitized))
                    if m:
                        sanitized = part_regex.sub("[NAME_REDACTED]", sanitized)
                        redaction_counts["name_part"] = redaction_counts.get("name_part", 0) + m

        # 2. Mask Emails
        email_matches = len(cls.EMAIL_PATTERN.findall(sanitized))
        if email_matches:
            sanitized = cls.EMAIL_PATTERN.sub("[EMAIL_REDACTED]", sanitized)
            redaction_counts["email"] = email_matches

        # 3. Mask URLs / Social Profiles
        url_matches = len(cls.URL_PATTERN.findall(sanitized))
        if url_matches:
            sanitized = cls.URL_PATTERN.sub("[PROFILE_LINK_REDACTED]", sanitized)
            redaction_counts["profile_url"] = url_matches

        # 4. Mask Phone Numbers
        def phone_sub(match):
            val = match.group(0)
            digits = re.sub(r"\D", "", val)
            if len(digits) >= 7:
                return "[PHONE_REDACTED]"
            return val

        phone_matches = len([m for m in cls.PHONE_PATTERN.finditer(sanitized) if len(re.sub(r"\D", "", m.group(0))) >= 7])
        if phone_matches:
            sanitized = cls.PHONE_PATTERN.sub(phone_sub, sanitized)
            redaction_counts["phone"] = phone_matches

        # 5. Mask Graduation & Year Spans (Mitigating Age Bias while preserving duration phrases)
        year_matches = len(cls.YEAR_SPAN_PATTERN.findall(sanitized))
        if year_matches:
            sanitized = cls.YEAR_SPAN_PATTERN.sub("[YEARS_REDACTED]", sanitized)
            redaction_counts["year_spans"] = year_matches

        grad_matches = len(cls.GRADUATION_YEAR_PATTERN.findall(sanitized))
        if grad_matches:
            sanitized = cls.GRADUATION_YEAR_PATTERN.sub("Degree Completed [YEAR_REDACTED]", sanitized)
            redaction_counts["graduation_year"] = grad_matches

        # 6. Mask Zip / Postal Codes
        zip_matches = len(cls.ZIP_CODE_PATTERN.findall(sanitized))
        if zip_matches:
            sanitized = cls.ZIP_CODE_PATTERN.sub("[LOCATION_REDACTED]", sanitized)
            redaction_counts["postal_code"] = zip_matches

        return sanitized, redaction_counts

pii_shield = PIIShield()
