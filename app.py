# ============================================================
# HireProof - JD-Based Bulk Resume Screening & Deep Audit
# ============================================================
#
# IMPORTANT:
# - No pandas
# - Every uploaded resume is analyzed
# - AI provides candidate-level reasoning
# - Python handles PDF extraction, UI, storage and validation
# - Deep Audit uses evaluate_fit()
#
# ============================================================

import streamlit as st
import csv
import io

from engine import (
    extract_text_from_pdf,
    screen_resume_against_jd,
    evaluate_fit,
    interrogate_decision
)

from data import JOB_DESCRIPTIONS


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    layout="wide",
    page_title="HireProof: JD-Based Resume Evaluation",
    page_icon="🎯"
)


# ============================================================
# PAGE HEADER
# ============================================================

st.title("🎯 HireProof")

st.caption(
    "AI-assisted, evidence-based resume analysis against a selected "
    "Job Description."
)


# ============================================================
# SESSION STATE
# ============================================================

if "evaluation_results" not in st.session_state:
    st.session_state["evaluation_results"] = []

if "bulk_screening_jd" not in st.session_state:
    st.session_state["bulk_screening_jd"] = ""

if "deep_audit" not in st.session_state:
    st.session_state["deep_audit"] = {}

if "audit_selected_candidate" not in st.session_state:
    st.session_state["audit_selected_candidate"] = ""

if "single_pdf_report" not in st.session_state:
    st.session_state["single_pdf_report"] = None

if "single_pdf_sanitized" not in st.session_state:
    st.session_state["single_pdf_sanitized"] = ""

if "single_pdf_redaction_log" not in st.session_state:
    st.session_state["single_pdf_redaction_log"] = []

if "single_pdf_candidate" not in st.session_state:
    st.session_state["single_pdf_candidate"] = ""


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_verdict_icon(verdict):
    """Return a visual indicator for a verdict."""

    verdict = str(verdict).upper()

    if verdict == "SHORTLIST":
        return "🟢"

    if verdict == "REVIEW":
        return "🟡"

    if verdict == "REJECT":
        return "🔴"

    return "⚪"


def get_brief_explanation(result):
    """
    Get the AI-generated candidate explanation.

    The engine may return either:
    - brief_explanation
    - evaluation_summary

    We support both so the UI remains compatible with the
    current engine.py.
    """

    explanation = result.get("brief_explanation")

    if explanation:
        return str(explanation).strip()

    explanation = result.get("evaluation_summary")

    if explanation:
        return str(explanation).strip()

    return (
        "No candidate explanation was returned by the AI analysis."
    )


def safe_list(value):
    """Convert possible values into a safe list."""

    if value is None:
        return []

    if isinstance(value, list):
        return value

    if isinstance(value, str):
        if not value.strip():
            return []

        return [value]

    return [str(value)]


def count_verdicts(results):
    """Calculate screening statistics."""

    shortlisted = 0
    review = 0
    rejected = 0
    errors = 0

    for result in results:

        verdict = str(
            result.get("verdict", "")
        ).upper()

        if result.get("evaluation_error"):
            errors += 1

        if verdict == "SHORTLIST":
            shortlisted += 1

        elif verdict == "REVIEW":
            review += 1

        elif verdict == "REJECT":
            rejected += 1

    return (
        shortlisted,
        review,
        rejected,
        errors
    )


def display_candidate_summary(result):
    """
    Display a compact candidate explanation.
    """

    candidate_name = result.get(
        "candidate_name",
        "Unknown Candidate"
    )

    filename = result.get(
        "filename",
        "Unknown File"
    )

    verdict = str(
        result.get(
            "verdict",
            "REVIEW"
        )
    ).upper()

    score = result.get(
        "match_score_pct",
        0
    )

    explanation = get_brief_explanation(result)

    matched_skills = safe_list(
        result.get(
            "matched_skills",
            []
        )
    )

    missing_skills = safe_list(
        result.get(
            "missing_skills_gaps",
            []
        )
    )

    main_skills = safe_list(
        result.get(
            "main_skills_extracted",
            []
        )
    )

    icon = get_verdict_icon(verdict)

    st.markdown(
        f"## {icon} {candidate_name}"
    )

    st.caption(
        f"Resume: {filename}"
    )

    metric1, metric2 = st.columns(2)

    with metric1:
        st.metric(
            "AI Match Score",
            f"{score}%"
        )

    with metric2:
        st.metric(
            "AI Verdict",
            verdict
        )

    st.markdown("### Brief AI Explanation")

    st.info(
        explanation
    )

    screening_basis = result.get("screening_basis")
    if screening_basis:
        st.caption(f"Screening basis: {screening_basis}")

    left, right = st.columns(2)

    with left:

        st.markdown("### Matched Requirements")

        if matched_skills:

            for skill in matched_skills:
                st.write(
                    f"• {skill}"
                )

        else:

            st.write(
                "No direct matches identified."
            )

    with right:

        st.markdown("### Missing / Gap Areas")

        if missing_skills:

            for skill in missing_skills:
                st.write(
                    f"• {skill}"
                )

        else:

            st.write(
                "No major gaps identified."
            )

    if main_skills:

        st.markdown(
            "### Main Skills Extracted"
        )

        st.write(
            ", ".join(main_skills)
        )


# ============================================================
# SIDEBAR
# ============================================================

with st.sidebar:

    st.markdown("## HireProof")

    st.caption(
        "Forensic recruitment analysis"
    )

    st.divider()

    st.markdown("### Workflow")

    st.markdown(
        """
**01 — Upload**

Upload all candidate resumes.

**02 — Analyze**

AI analyzes every resume against the same JD.

**03 — Compare**

Review selected, review and rejected candidates.

**04 — Audit**

Inspect requirement-level evidence for a candidate.
"""
    )

    st.divider()

    st.caption(
        "AI analyzes resume evidence. Python handles "
        "deterministic processing and audit verification."
    )


# ============================================================
# TABS
# ============================================================

tab_bulk, tab_audit = st.tabs(
    [
        "📂 Bulk Resume Analysis",
        "🔍 Deep Forensic Audit"
    ]
)


# ################################################################
# TAB 1
# BULK RESUME ANALYSIS
# ################################################################

with tab_bulk:

    st.header(
        "Bulk Resume Analysis"
    )

    st.write(
        "Upload all resumes for the role. HireProof will analyze "
        "every uploaded resume against the selected Job Description."
    )


    # ============================================================
    # STEP 1 - JD
    # ============================================================

    st.subheader(
        "1. Select Job Description"
    )

    jd_options = [
        "📝 Custom / Paste Your Own JD"
    ] + list(
        JOB_DESCRIPTIONS.keys()
    )

    jd_choice = st.selectbox(
        "Choose a Job Description:",
        jd_options,
        key="bulk_jd_choice"
    )


    if jd_choice == "📝 Custom / Paste Your Own JD":

        jd_text = st.text_area(
            "Paste the Job Description:",
            height=240,
            placeholder=(
                "Example:\n\n"
                "We are looking for a Senior Backend Engineer "
                "with Java, Spring Boot, PostgreSQL, Docker, "
                "Kubernetes and Kafka experience."
            ),
            key="bulk_custom_jd"
        )

    else:

        jd_text = st.text_area(
            "Job Description:",
            value=JOB_DESCRIPTIONS[jd_choice],
            height=240,
            key="bulk_template_jd"
        )


    # ============================================================
    # STEP 2 - RESUMES
    # ============================================================

    st.subheader(
        "2. Upload All Candidate Resumes"
    )

    uploaded_files = st.file_uploader(
        "Upload one or multiple PDF resumes:",
        type=["pdf"],
        accept_multiple_files=True,
        key="resume_uploader"
    )


    if uploaded_files:

        st.info(
            f"📄 {len(uploaded_files)} resume(s) uploaded."
        )


        # ========================================================
        # ANALYZE ALL
        # ========================================================

        if st.button(
            "🚀 Analyze ALL Resumes",
            type="primary",
            use_container_width=True,
            key="analyze_all"
        ):

            if not jd_text.strip():

                st.error(
                    "Please provide a Job Description first."
                )

            else:

                results = []

                total_files = len(
                    uploaded_files
                )

                progress = st.progress(
                    0
                )

                status = st.empty()

                st.session_state[
                    "bulk_screening_jd"
                ] = jd_text


                # =================================================
                # IMPORTANT:
                # EVERY RESUME GOES THROUGH THE AI
                # =================================================

                for index, uploaded_file in enumerate(
                    uploaded_files
                ):

                    filename = uploaded_file.name

                    status.info(
                        f"AI analyzing: {filename} "
                        f"({index + 1}/{total_files})"
                    )


                    # -------------------------------------------------
                    # READ FILE
                    # -------------------------------------------------

                    try:

                        pdf_bytes = uploaded_file.read()

                    except Exception as error:

                        results.append(
                            {
                                "filename": filename,
                                "candidate_name": filename,
                                "verdict": "REVIEW",
                                "match_score_pct": 0,
                                "brief_explanation": (
                                    "The resume could not be read."
                                ),
                                "evaluation_summary": (
                                    "The resume could not be read."
                                ),
                                "matched_skills": [],
                                "missing_skills_gaps": [],
                                "main_skills_extracted": [],
                                "raw_text": "",
                                "sanitized_text": "",
                                "redaction_log": [],
                                "evaluation_error": str(error)
                            }
                        )

                        progress.progress(
                            (index + 1) / total_files
                        )

                        continue


                    # -------------------------------------------------
                    # PDF TEXT EXTRACTION
                    # -------------------------------------------------

                    try:

                        raw_text = extract_text_from_pdf(
                            pdf_bytes
                        )

                    except Exception as error:

                        results.append(
                            {
                                "filename": filename,
                                "candidate_name": filename,
                                "verdict": "REVIEW",
                                "match_score_pct": 0,
                                "brief_explanation": (
                                    "The PDF text could not be extracted."
                                ),
                                "evaluation_summary": (
                                    "PDF extraction failed."
                                ),
                                "matched_skills": [],
                                "missing_skills_gaps": [],
                                "main_skills_extracted": [],
                                "raw_text": "",
                                "sanitized_text": "",
                                "redaction_log": [],
                                "evaluation_error": str(error)
                            }
                        )

                        progress.progress(
                            (index + 1) / total_files
                        )

                        continue


                    # -------------------------------------------------
                    # EMPTY PDF CHECK
                    # -------------------------------------------------

                    if not raw_text.strip():

                        results.append(
                            {
                                "filename": filename,
                                "candidate_name": filename,
                                "verdict": "REVIEW",
                                "match_score_pct": 0,
                                "brief_explanation": (
                                    "No readable text was found. "
                                    "The PDF may be scanned or image-based."
                                ),
                                "evaluation_summary": (
                                    "No readable text was found."
                                ),
                                "matched_skills": [],
                                "missing_skills_gaps": [],
                                "main_skills_extracted": [],
                                "raw_text": raw_text,
                                "sanitized_text": "",
                                "redaction_log": [],
                                "evaluation_error": (
                                    "Empty extracted PDF text"
                                )
                            }
                        )

                        progress.progress(
                            (index + 1) / total_files
                        )

                        continue


                    # -------------------------------------------------
                    # AI SCREENING
                    # -------------------------------------------------

                    try:

                        result = screen_resume_against_jd(
                            raw_text,
                            jd_text
                        )

                    except Exception as error:

                        results.append(
                            {
                                "filename": filename,
                                "candidate_name": filename,
                                "verdict": "REVIEW",
                                "match_score_pct": 0,
                                "brief_explanation": (
                                    "AI analysis failed for this resume."
                                ),
                                "evaluation_summary": (
                                    "AI analysis failed."
                                ),
                                "matched_skills": [],
                                "missing_skills_gaps": [],
                                "main_skills_extracted": [],
                                "raw_text": raw_text,
                                "sanitized_text": "",
                                "redaction_log": [],
                                "evaluation_error": str(error)
                            }
                        )

                        progress.progress(
                            (index + 1) / total_files
                        )

                        continue


                    # -------------------------------------------------
                    # ADD LOCAL METADATA
                    # -------------------------------------------------

                    result["filename"] = filename

                    result["raw_text"] = raw_text

                    # The screening engine already performed the full forensic
                    # audit. Reuse that report instead of calling Gemini twice.
                    forensic_report = result.get("forensic_report")
                    if forensic_report:
                        st.session_state["deep_audit"][filename] = {
                            "report": forensic_report,
                            "sanitized": result.get("sanitized_text", ""),
                            "redaction_log": result.get("redaction_log", [])
                        }


                    # -------------------------------------------------
                    # NORMALIZE AI EXPLANATION
                    # -------------------------------------------------

                    if not result.get(
                        "brief_explanation"
                    ):

                        result["brief_explanation"] = (
                            result.get(
                                "evaluation_summary",
                                "No explanation returned."
                            )
                        )


                    if not result.get(
                        "evaluation_summary"
                    ):

                        result["evaluation_summary"] = (
                            result.get(
                                "brief_explanation",
                                "No explanation returned."
                            )
                        )


                    # -------------------------------------------------
                    # SAVE RESULT
                    # -------------------------------------------------

                    results.append(
                        result
                    )


                    progress.progress(
                        (index + 1) / total_files
                    )


                # =================================================
                # SAVE ALL RESULTS
                # =================================================

                st.session_state[
                    "evaluation_results"
                ] = results

                st.session_state[
                    "deep_audit"
                ] = {}

                status.success(
                    f"✅ AI analysis completed for "
                    f"{len(results)} uploaded resume(s)."
                )


    # ============================================================
    # GET RESULTS
    # ============================================================

    results = st.session_state.get(
        "evaluation_results",
        []
    )


    if results:

        st.divider()

        st.header(
            "📊 Complete Resume Analysis"
        )

        st.caption(
            "Every uploaded resume is evaluated against every explicit JD requirement, and the same run produces its deep forensic audit."
        )

        audit_ready = sum(
            1 for item in results if item.get("forensic_report")
        )
        st.info(f"Deep audit coverage: {audit_ready}/{len(results)} candidate(s) have a complete forensic report.")


        # ========================================================
        # COUNTS
        # ========================================================

        (
            shortlisted,
            review,
            rejected,
            errors
        ) = count_verdicts(
            results
        )


        c1, c2, c3, c4, c5 = st.columns(5)

        c1.metric(
            "Total Analyzed",
            len(results)
        )

        c2.metric(
            "Selected",
            shortlisted
        )

        c3.metric(
            "Review",
            review
        )

        c4.metric(
            "Rejected",
            rejected
        )

        c5.metric(
            "Processing Issues",
            errors
        )


        # ========================================================
        # SELECTED
        # ========================================================

        selected_results = [
            result
            for result in results
            if str(
                result.get(
                    "verdict",
                    ""
                )
            ).upper() == "SHORTLIST"
        ]


        if selected_results:

            st.divider()

            st.header(
                "🟢 Selected Candidates"
            )

            st.caption(
                "Candidates whose resumes contain sufficient "
                "evidence for the screening criteria."
            )


            for result in selected_results:

                with st.container(
                    border=True
                ):

                    display_candidate_summary(
                        result
                    )


        # ========================================================
        # REVIEW
        # ========================================================

        review_results = [
            result
            for result in results
            if str(
                result.get(
                    "verdict",
                    ""
                )
            ).upper() == "REVIEW"
        ]


        if review_results:

            st.divider()

            st.header(
                "🟡 Candidates Requiring Review"
            )

            st.caption(
                "These resumes contain partial, unclear or "
                "insufficient evidence and should receive human review."
            )


            for result in review_results:

                with st.container(
                    border=True
                ):

                    display_candidate_summary(
                        result
                    )


        # ========================================================
        # REJECTED
        # ========================================================

        rejected_results = [
            result
            for result in results
            if str(
                result.get(
                    "verdict",
                    ""
                )
            ).upper() == "REJECT"
        ]


        if rejected_results:

            st.divider()

            st.header(
                "🔴 Rejected Candidates"
            )

            st.caption(
                "The AI identified job-related requirement gaps "
                "based on the resume evidence."
            )


            for result in rejected_results:

                with st.container(
                    border=True
                ):

                    display_candidate_summary(
                        result
                    )


        # ========================================================
        # COMPLETE MATRIX
        # ========================================================

        st.divider()

        st.header(
            "📋 Complete Candidate Matrix"
        )

        st.caption(
            "This table contains every analyzed resume."
        )


        header = st.columns(
            [
                2.2,
                1.8,
                1.3,
                1.0,
                3.0,
                3.0
            ]
        )

        header[0].markdown(
            "**Candidate**"
        )

        header[1].markdown(
            "**Role / Domain**"
        )

        header[2].markdown(
            "**Verdict**"
        )

        header[3].markdown(
            "**Match**"
        )

        header[4].markdown(
            "**Matched**"
        )

        header[5].markdown(
            "**Gaps**"
        )


        st.divider()


        for result in results:

            candidate_name = result.get(
                "candidate_name",
                "Unknown Candidate"
            )

            domain_role = result.get(
                "domain_role",
                "N/A"
            )

            verdict = str(
                result.get(
                    "verdict",
                    "REVIEW"
                )
            ).upper()

            score = result.get(
                "match_score_pct",
                0
            )

            matched = safe_list(
                result.get(
                    "matched_skills",
                    []
                )
            )

            gaps = safe_list(
                result.get(
                    "missing_skills_gaps",
                    []
                )
            )

            row = st.columns(
                [
                    2.2,
                    1.8,
                    1.3,
                    1.0,
                    3.0,
                    3.0
                ]
            )

            row[0].write(
                candidate_name
            )

            row[1].write(
                domain_role
            )

            row[2].write(
                f"{get_verdict_icon(verdict)} {verdict}"
            )

            row[3].write(
                f"{score}%"
            )

            row[4].write(
                ", ".join(matched)
                if matched
                else "None"
            )

            row[5].write(
                ", ".join(gaps)
                if gaps
                else "None"
            )


        # ========================================================
        # DETAILED EVERY-RESUME ANALYSIS
        # ========================================================

        st.divider()

        st.header(
            "🔎 Detailed AI Analysis — Every Resume"
        )


        for result in results:

            candidate_name = result.get(
                "candidate_name",
                "Unknown Candidate"
            )

            verdict = str(
                result.get(
                    "verdict",
                    "REVIEW"
                )
            ).upper()

            score = result.get(
                "match_score_pct",
                0
            )

            filename = result.get(
                "filename",
                "Unknown File"
            )

            icon = get_verdict_icon(
                verdict
            )


            with st.expander(
                f"{icon} {candidate_name} — "
                f"{verdict} — {score}%"
            ):

                st.markdown(
                    f"**Resume:** `{filename}`"
                )

                st.markdown(
                    f"**Verdict:** `{verdict}`"
                )

                st.markdown(
                    f"**AI Match Score:** `{score}%`"
                )


                st.markdown(
                    "### Brief AI Explanation"
                )

                st.info(
                    get_brief_explanation(
                        result
                    )
                )


                col_a, col_b = st.columns(2)


                with col_a:

                    st.markdown(
                        "### Matched Skills"
                    )

                    matched = safe_list(
                        result.get(
                            "matched_skills",
                            []
                        )
                    )

                    if matched:

                        for item in matched:
                            st.write(
                                f"• {item}"
                            )

                    else:

                        st.write(
                            "None"
                        )


                with col_b:

                    st.markdown(
                        "### Missing / Gaps"
                    )

                    gaps = safe_list(
                        result.get(
                            "missing_skills_gaps",
                            []
                        )
                    )

                    if gaps:

                        for item in gaps:
                            st.write(
                                f"• {item}"
                            )

                    else:

                        st.write(
                            "None"
                        )


                st.markdown(
                    "### Main Skills Extracted"
                )

                skills = safe_list(
                    result.get(
                        "main_skills_extracted",
                        []
                    )
                )

                if skills:

                    st.write(
                        ", ".join(skills)
                    )

                else:

                    st.write(
                        "None"
                    )


                # ------------------------------------------------
                # REDACTION LOG
                # ------------------------------------------------

                with st.expander(
                    "🛡️ Bias Shield / Redaction Log"
                ):

                    redactions = result.get(
                        "redaction_log",
                        []
                    )

                    if redactions:

                        for item in redactions:

                            st.write(
                                f"• "
                                f"**{item.get('category', 'Unknown')}** "
                                f"— "
                                f"{item.get('redacted_count', 0)} "
                                f"item(s) redacted — "
                                f"{item.get('reason', '')}"
                            )

                    else:

                        st.write(
                            "No redactions recorded."
                        )


                # ------------------------------------------------
                # SANITIZED RESUME
                # ------------------------------------------------

                with st.expander(
                    "View Sanitized Resume"
                ):

                    st.text(
                        result.get(
                            "sanitized_text",
                            "No sanitized resume available."
                        )
                    )


                # ------------------------------------------------
                # RAW TEXT
                # ------------------------------------------------

                with st.expander(
                    "View Raw Extracted PDF Text"
                ):

                    st.text(
                        result.get(
                            "raw_text",
                            "No raw text available."
                        )
                    )


        # ========================================================
        # CSV EXPORT
        # ========================================================

        st.divider()

        st.header(
            "📥 Export Complete Analysis"
        )


        csv_buffer = io.StringIO()

        writer = csv.writer(
            csv_buffer
        )


        writer.writerow(
            [
                "Filename",
                "Candidate",
                "Role / Domain",
                "Verdict",
                "Match Score %",
                "Brief AI Explanation",
                "Matched Skills",
                "Missing Skills / Gaps",
                "Main Skills"
            ]
        )


        for result in results:

            writer.writerow(
                [
                    result.get(
                        "filename",
                        ""
                    ),

                    result.get(
                        "candidate_name",
                        ""
                    ),

                    result.get(
                        "domain_role",
                        ""
                    ),

                    result.get(
                        "verdict",
                        ""
                    ),

                    result.get(
                        "match_score_pct",
                        0
                    ),

                    get_brief_explanation(
                        result
                    ),

                    ", ".join(
                        safe_list(
                            result.get(
                                "matched_skills",
                                []
                            )
                        )
                    ),

                    ", ".join(
                        safe_list(
                            result.get(
                                "missing_skills_gaps",
                                []
                            )
                        )
                    ),

                    ", ".join(
                        safe_list(
                            result.get(
                                "main_skills_extracted",
                                []
                            )
                        )
                    )
                ]
            )


        st.download_button(
            label="📥 Download Complete Resume Analysis",
            data=csv_buffer.getvalue(),
            file_name="hireproof_complete_resume_analysis.csv",
            mime="text/csv",
            use_container_width=True
        )


# ################################################################
# TAB 2
# DEEP FORENSIC AUDIT
# ################################################################

with tab_audit:

    st.header(
        "🔍 Deep Forensic Audit"
    )

    st.write(
        "Select any analyzed resume and inspect the evidence "
        "behind the AI screening result."
    )


    results = st.session_state.get(
        "evaluation_results",
        []
    )


    if not results:

        st.info(
            "First upload and analyze resumes in "
            "the Bulk Resume Analysis tab."
        )

    else:

        # ========================================================
        # CANDIDATE SELECTION
        # ========================================================

        candidate_names = []

        candidate_map = {}


        for result in results:

            filename = result.get(
                "filename",
                "Unknown File"
            )

            candidate_map[
                filename
            ] = result

            candidate_names.append(
                filename
            )


        selected_filename = st.selectbox(
            "Select Resume for Deep Audit:",
            candidate_names,
            key="deep_audit_candidate"
        )


        selected_candidate = candidate_map[
            selected_filename
        ]


        # ========================================================
        # JD
        # ========================================================

        audit_jd = st.session_state.get(
            "bulk_screening_jd",
            ""
        )


        audit_jd = st.text_area(
            "Job Description Used for Audit:",
            value=audit_jd,
            height=220,
            key="audit_jd"
        )


        # ========================================================
        # CANDIDATE PREVIEW
        # ========================================================

        preview_left, preview_right = st.columns(2)


        with preview_left:

            st.markdown(
                "### Job Description"
            )

            st.text(
                audit_jd
            )


        with preview_right:

            st.markdown(
                "### Selected Resume"
            )

            st.text(
                selected_candidate.get(
                    "raw_text",
                    ""
                )
            )


        # ========================================================
        # RUN AUDIT
        # ========================================================

        if st.button(
            "🔎 Run Deep Forensic Audit",
            type="primary",
            use_container_width=True,
            key="run_forensic_audit"
        ):

            if not audit_jd.strip():

                st.error(
                    "Please provide a Job Description."
                )

            else:

                with st.spinner(
                    "AI is performing deep audit analysis for every candidate..."
                ):

                    st.session_state["deep_audit"] = {}
                    audit_progress = st.progress(0)
                    audit_status = st.empty()
                    audit_failed = 0

                    for audit_index, candidate in enumerate(results):
                        filename = candidate.get("filename", f"candidate_{audit_index + 1}")
                        audit_status.info(f"Deep auditing: {filename} ({audit_index + 1}/{len(results)})")

                        try:
                            report, sanitized, redaction_log = evaluate_fit(
                                candidate.get("raw_text", ""), audit_jd
                            )
                            st.session_state["deep_audit"][filename] = {
                                "report": report,
                                "sanitized": sanitized,
                                "redaction_log": redaction_log
                            }
                        except Exception as error:
                            audit_failed += 1
                            st.session_state["deep_audit"][filename] = {
                                "report": {
                                    "candidate_name": candidate.get("candidate_name", filename),
                                    "overall_fit_status": "REVIEW",
                                    "candidate_summary": "Deep audit could not be completed for this candidate.",
                                    "adverse_action_reasoning": f"Audit error: {error}",
                                    "requirements": []
                                },
                                "sanitized": candidate.get("sanitized_text", ""),
                                "redaction_log": candidate.get("redaction_log", []),
                                "audit_error": str(error)
                            }

                        audit_progress.progress((audit_index + 1) / len(results))

                    audit_status.empty()

                    selected_audit_data = st.session_state["deep_audit"].get(selected_filename)
                    if selected_audit_data:
                        st.session_state["single_pdf_report"] = selected_audit_data.get("report")
                        st.session_state["single_pdf_sanitized"] = selected_audit_data.get("sanitized", "")
                        st.session_state["single_pdf_redaction_log"] = selected_audit_data.get("redaction_log", [])
                        st.session_state["single_pdf_candidate"] = selected_filename

                    if audit_failed:
                        st.warning(f"Deep audit completed with {audit_failed} candidate(s) requiring review.")
                    else:
                        st.success(f"Deep audit completed for all {len(results)} candidate(s).")

        # ========================================================
        # GET REPORT
        # ========================================================

        forensic_reports = st.session_state.get(
            "deep_audit",
            {}
        )


        audit_data = forensic_reports.get(
            selected_filename
        )


        # Backward compatibility
        if not audit_data:

            if (
                st.session_state.get(
                    "single_pdf_candidate"
                )
                == selected_filename
            ):

                report = st.session_state.get(
                    "single_pdf_report"
                )

                sanitized = st.session_state.get(
                    "single_pdf_sanitized",
                    ""
                )

                redaction_log = st.session_state.get(
                    "single_pdf_redaction_log",
                    []
                )

                if report:

                    audit_data = {
                        "report": report,
                        "sanitized": sanitized,
                        "redaction_log": redaction_log
                    }


        # ========================================================
        # DISPLAY AUDIT
        # ========================================================

        if audit_data:

            report = audit_data.get(
                "report",
                {}
            )

            sanitized = audit_data.get(
                "sanitized",
                ""
            )

            redaction_log = audit_data.get(
                "redaction_log",
                []
            )


            st.divider()


            # ====================================================
            # LIVE METRICS
            # ====================================================

            requirements = report.get(
                "requirements",
                []
            )


            met_count = sum(
                1
                for req in requirements
                if str(
                    req.get(
                        "status",
                        ""
                    )
                ).upper() == "MET"
            )


            partial_count = sum(
                1
                for req in requirements
                if str(
                    req.get(
                        "status",
                        ""
                    )
                ).upper() == "PARTIAL"
            )


            unmet_count = sum(
                1
                for req in requirements
                if str(
                    req.get(
                        "status",
                        ""
                    )
                ).upper() == "UNMET"
            )


            total_requirements = len(
                requirements
            )


            if total_requirements:

                coverage_score = round(
                    (
                        (
                            met_count
                            + (partial_count * 0.5)
                        )
                        / total_requirements
                    ) * 100,
                    1
                )

            else:

                coverage_score = 0


            verified_evidence = sum(
                1
                for req in requirements
                if req.get(
                    "citation_verified",
                    False
                )
            )


            overall_status = report.get(
                "overall_fit_status",
                selected_candidate.get(
                    "verdict",
                    "REVIEW"
                )
            )


            st.subheader(
                f"{get_verdict_icon(overall_status)} "
                f"Audit Result: {overall_status}"
            )


            m1, m2, m3, m4, m5 = st.columns(5)


            m1.metric(
                "Requirements",
                total_requirements
            )

            m2.metric(
                "Met",
                met_count
            )

            m3.metric(
                "Partial",
                partial_count
            )

            m4.metric(
                "Unmet",
                unmet_count
            )

            m5.metric(
                "Evidence Verified",
                verified_evidence
            )


            # ====================================================
            # CANDIDATE SUMMARY
            # ====================================================

            st.markdown(
                "### Executive Summary"
            )

            st.info(
                report.get(
                    "candidate_summary",
                    "No executive summary returned."
                )
            )


            # ====================================================
            # DEFENSIBILITY
            # ====================================================

            defensibility = report.get(
                "compliance_defensibility_score"
            )


            if defensibility is not None:

                st.metric(
                    "Compliance Defensibility Score",
                    f"{defensibility}/100"
                )


            # ====================================================
            # CANDIDATE PROFILE
            # ====================================================

            st.subheader(
                "Candidate Profile"
            )


            skills = safe_list(
                report.get(
                    "extracted_main_skills",
                    []
                )
            )


            if skills:

                st.write(
                    ", ".join(skills)
                )

            else:

                st.write(
                    "No main skills extracted."
                )


            # ====================================================
            # BIAS SHIELD
            # ====================================================

            with st.expander(
                "🛡️ Bias Shield / Redaction Log"
            ):

                if redaction_log:

                    for item in redaction_log:

                        st.write(
                            f"• "
                            f"**{item.get('category', 'Unknown')}** "
                            f"— "
                            f"{item.get('redacted_count', 0)} "
                            f"item(s) redacted — "
                            f"{item.get('reason', '')}"
                        )

                else:

                    st.write(
                        "No PII/contact/year redactions recorded."
                    )


            # ====================================================
            # REQUIREMENT AUDIT
            # ====================================================

            st.subheader(
                "📋 Requirement-Level Evidence Audit"
            )


            if not requirements:

                st.warning(
                    "No requirement-level audit data returned."
                )

            else:

                for req in requirements:

                    req_id = req.get(
                        "requirement_id",
                        "REQ"
                    )

                    req_text = req.get(
                        "requirement_text",
                        ""
                    )

                    req_status = str(
                        req.get(
                            "status",
                            "UNMET"
                        )
                    ).upper()

                    criticality = req.get(
                        "criticality",
                        "N/A"
                    )

                    evidence_depth = req.get(
                        "evidence_depth",
                        "N/A"
                    )

                    quote = req.get(
                        "verbatim_quote",
                        "None"
                    )

                    citation_verified = req.get(
                        "citation_verified",
                        False
                    )


                    with st.expander(
                        f"{get_verdict_icon(req_status)} "
                        f"{req_id}: {req_text} "
                        f"— {req_status}"
                    ):

                        c1, c2, c3 = st.columns(3)


                        c1.markdown(
                            f"**Status:** `{req_status}`"
                        )

                        c2.markdown(
                            f"**Criticality:** `{criticality}`"
                        )

                        c3.markdown(
                            f"**Evidence:** `{evidence_depth}`"
                        )


                        st.markdown(
                            "### Verbatim Evidence"
                        )

                        st.code(
                            str(quote)
                        )


                        if citation_verified:

                            st.success(
                                "✅ Citation verified against "
                                "the sanitized source resume."
                            )

                        else:

                            st.error(
                                "🚨 Citation could not be verified "
                                "against the source resume."
                            )


                        st.markdown(
                            "### Gap Analysis"
                        )

                        st.write(
                            req.get(
                                "gap_reasoning",
                                "No gap reasoning provided."
                            )
                        )


                        st.markdown(
                            "### Targeted Interview Question"
                        )

                        st.write(
                            req.get(
                                "interview_question",
                                "No question generated."
                            )
                        )


                        st.markdown(
                            "### Good Response Signals"
                        )

                        st.write(
                            req.get(
                                "eval_rubric_good",
                                "Not provided."
                            )
                        )


                        st.markdown(
                            "### Red Flags / Weak Evidence"
                        )

                        st.write(
                            req.get(
                                "eval_rubric_poor",
                                "Not provided."
                            )
                        )


            # ====================================================
            # SANITIZED RESUME
            # ====================================================

            with st.expander(
                "View Sanitized Resume Used for Audit"
            ):

                st.text(
                    sanitized
                )


            # ====================================================
            # ADVERSE ACTION REASONING
            # ====================================================

            st.divider()

            st.subheader(
                "Adverse Action / Gap Reasoning"
            )

            st.write(
                report.get(
                    "adverse_action_reasoning",
                    "No adverse-action reasoning returned."
                )
            )


            # ====================================================
            # AUDIT DEFENSE
            # ====================================================

            st.divider()

            st.subheader(
                "⚖️ Audit Defense & Rebuttal Console"
            )


            user_question = st.text_input(
                "Ask a question about this candidate:",
                placeholder=(
                    "Example: Why was REQ-03 marked PARTIAL?"
                ),
                key=f"audit_question_{selected_filename}"
            )


            if user_question:

                with st.spinner(
                    "Generating evidence-based answer..."
                ):

                    try:

                        answer = interrogate_decision(
                            report,
                            sanitized,
                            user_question
                        )

                        st.markdown(
                            "### AI Audit Response"
                        )

                        st.write(
                            answer
                        )

                    except Exception as error:

                        st.error(
                            f"Could not generate audit response: "
                            f"{error}"
                        )


# ============================================================
# COMPREHENSIVE DEEP AUDIT EXPLANATIONS FOR EVERY CANDIDATE
# ============================================================

if "deep_audit" in st.session_state and st.session_state["deep_audit"]:
    deep_audit = st.session_state["deep_audit"]
    st.divider()
    st.header("📋 Comprehensive Deep Audit — Every Candidate")
    st.caption("Requirement-level evidence and explanations for every audited resume.")

    for fname, data in deep_audit.items():
        rep = data.get("report", {})
        sanitized = data.get("sanitized", "")
        redaction_log = data.get("redaction_log", [])
        status = str(rep.get("overall_fit_status", "REVIEW")).upper()
        candidate_name = rep.get("candidate_name", fname)

        with st.expander(f"{get_verdict_icon(status)} {candidate_name} — Deep Audit: [{status}]", expanded=False):
            st.markdown(f"### Overall Audit Result: `{status}`")
            st.markdown("**Executive Audit Explanation:**")
            st.info(rep.get("candidate_summary", "No executive explanation returned."))

            adverse = rep.get("adverse_action_reasoning")
            if adverse:
                st.markdown("**Compliance / Gap Reasoning:**")
                st.write(adverse)

            st.markdown("#### 🎯 Requirement-by-Requirement Evidence & Explanations")
            requirements = rep.get("requirements", [])

            if not requirements:
                st.warning("No requirement-level audit data was returned for this candidate.")
            else:
                for req in requirements:
                    req_status = str(req.get("status", "UNMET")).upper()
                    badge = "🟢 MET" if req_status == "MET" else ("🟡 PARTIAL" if req_status == "PARTIAL" else "🔴 UNMET")
                    st.markdown(f"**{req.get('requirement_id', 'REQ')}: {req.get('requirement_text', '')}**")
                    c1, c2 = st.columns(2)
                    c1.markdown(f"• **Status:** `{badge}`")
                    c2.markdown(f"• **Evidence Depth:** `{req.get('evidence_depth', 'N/A')}`")
                    st.markdown("• **Verbatim Evidence:**")
                    st.code(str(req.get("verbatim_quote") or "No verbatim evidence provided."))

                    if req.get("citation_verified"):
                        st.success("Citation verified against the sanitized source resume.")
                    else:
                        st.warning("Citation is missing or could not be verified against the source resume.")

                    st.markdown("• **Why This Rating / Gap Explanation:**")
                    st.write(req.get("gap_reasoning", "No gap reasoning provided."))

                    if req.get("interview_question"):
                        st.markdown("**Targeted Gap Probe:**")
                        st.markdown(f"**Question:** {req.get('interview_question')}")
                    if req.get("eval_rubric_good"):
                        st.markdown(f"🟢 **Pass Indicator:** {req.get('eval_rubric_good')}")
                    if req.get("eval_rubric_poor"):
                        st.markdown(f"🔴 **Fail / Weak Evidence Indicator:** {req.get('eval_rubric_poor')}")
                    st.divider()

            with st.expander("🛡️ Bias Shield / Redaction Log"):
                if redaction_log:
                    for item in redaction_log:
                        st.write(f"• **{item.get('category', 'Unknown')}** — {item.get('redacted_count', 0)} item(s) redacted — {item.get('reason', '')}")
                else:
                    st.write("No redactions recorded.")

            with st.expander("View Sanitized Resume Used for Deep Audit"):
                st.text(sanitized if sanitized else "No sanitized resume available.")

# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "HireProof — AI-assisted resume analysis with "
    "evidence-based audit controls."
)