# app.py - HireProof JD-Based Bulk Resume Evaluation & Audit Console

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
    page_title="HireProof: JD-Based Resume Screener",
    page_icon="🎯"
)


# ============================================================
# PAGE HEADER
# ============================================================

st.title(
    "🎯 HireProof: JD-Based Bulk Resume Evaluation"
)

st.caption(
    "Upload candidate resumes in bulk, provide a target Job Description, "
    "and evaluate candidate-role alignment using evidence-based screening."
)


# ============================================================
# TABS
# ============================================================

tab_bulk, tab_audit = st.tabs([
    "📂 Bulk JD Screening",
    "🔍 Deep Audit against JD"
])


# ============================================================
# TAB 1: BULK JD SCREENING
# ============================================================

with tab_bulk:

    st.subheader(
        "1. Target Job Description"
    )

    # --------------------------------------------------------
    # JD Selection
    # --------------------------------------------------------

    jd_choice = st.selectbox(
        "Choose a JD template or select custom:",
        ["📝 Custom / Paste Your Own JD"]
        + list(JOB_DESCRIPTIONS.keys()),
        key="bulk_jd_choice"
    )


    # --------------------------------------------------------
    # Custom JD
    # --------------------------------------------------------

    if jd_choice == "📝 Custom / Paste Your Own JD":

        jd_text = st.text_area(
            "Paste the Job Description here:",
            height=220,
            placeholder=(
                "Example:\n"
                "We are looking for a Senior Java Developer with "
                "Spring Boot, PostgreSQL optimization, Docker, "
                "Kubernetes, and Apache Kafka experience."
            ),
            key="bulk_custom_jd"
        )

    else:

        jd_text = st.text_area(
            "Job Description Requirements (Editable):",
            value=JOB_DESCRIPTIONS[jd_choice],
            height=220,
            key="bulk_template_jd"
        )


    st.divider()


    # ========================================================
    # PDF UPLOAD
    # ========================================================

    st.subheader(
        "2. Upload Candidate Resumes"
    )

    uploaded_files = st.file_uploader(
        "Drop one or multiple PDF resumes:",
        type=["pdf"],
        accept_multiple_files=True,
        key="bulk_resume_uploader"
    )


    if uploaded_files:

        st.info(
            f"📄 **{len(uploaded_files)} PDF resume(s) ready for screening.**"
        )


        # ====================================================
        # RUN BULK SCREENING
        # ====================================================

        if st.button(
            "🚀 Evaluate All Resumes Against JD",
            type="primary",
            use_container_width=True,
            key="bulk_evaluate_button"
        ):

            if not jd_text.strip():

                st.error(
                    "Please provide a Job Description before evaluating resumes."
                )

            else:

                progress_bar = st.progress(0)

                status_text = st.empty()

                evaluation_results = []

                total_files = len(uploaded_files)


                # ------------------------------------------------
                # PROCESS EACH PDF
                # ------------------------------------------------

                for idx, file in enumerate(uploaded_files):

                    status_text.text(
                        f"Evaluating {file.name} against JD "
                        f"({idx + 1}/{total_files})..."
                    )


                    # --------------------------------------------
                    # Read PDF
                    # --------------------------------------------

                    try:

                        pdf_bytes = file.read()

                    except Exception as error:

                        st.error(
                            f"Could not read {file.name}: {error}"
                        )

                        progress_bar.progress(
                            (idx + 1) / total_files
                        )

                        continue


                    # --------------------------------------------
                    # Extract PDF text
                    # --------------------------------------------

                    try:

                        raw_text = extract_text_from_pdf(
                            pdf_bytes
                        )

                    except Exception as error:

                        st.error(
                            f"Could not extract text from "
                            f"{file.name}: {error}"
                        )

                        progress_bar.progress(
                            (idx + 1) / total_files
                        )

                        continue


                    # --------------------------------------------
                    # Check extracted text
                    # --------------------------------------------

                    if not raw_text.strip():

                        st.warning(
                            f"No readable text found in {file.name}. "
                            f"This may be a scanned or image-only PDF."
                        )

                        progress_bar.progress(
                            (idx + 1) / total_files
                        )

                        continue


                    # --------------------------------------------
                    # Screen Resume Against JD
                    # --------------------------------------------

                    try:

                        result = screen_resume_against_jd(
                            raw_text,
                            jd_text
                        )

                    except Exception as error:

                        st.error(
                            f"JD screening failed for "
                            f"{file.name}: {error}"
                        )

                        progress_bar.progress(
                            (idx + 1) / total_files
                        )

                        continue


                    # --------------------------------------------
                    # Store additional local information
                    # --------------------------------------------

                    result["filename"] = file.name

                    result["raw_text"] = raw_text


                    evaluation_results.append(
                        result
                    )


                    progress_bar.progress(
                        (idx + 1) / total_files
                    )


                # ------------------------------------------------
                # SAVE RESULTS
                # ------------------------------------------------

                if evaluation_results:

                    st.session_state[
                        "evaluation_results"
                    ] = evaluation_results

                    st.session_state[
                        "bulk_screening_jd"
                    ] = jd_text

                    status_text.success(
                        "🎉 All readable resumes were evaluated "
                        "against the Job Description!"
                    )

                else:

                    status_text.error(
                        "No resumes could be evaluated."
                    )


    # ========================================================
    # DISPLAY RESULTS
    # ========================================================

    if (
        "evaluation_results" in st.session_state
        and st.session_state["evaluation_results"]
    ):

        results = st.session_state[
            "evaluation_results"
        ]


        st.divider()

        st.subheader(
            "3. Candidate Evaluation Summary"
        )


        # ====================================================
        # METRICS
        # ====================================================

        shortlisted_count = sum(
            1
            for r in results
            if r.get("verdict") == "SHORTLIST"
        )

        review_count = sum(
            1
            for r in results
            if r.get("verdict") == "REVIEW"
        )

        rejected_count = sum(
            1
            for r in results
            if r.get("verdict") == "REJECT"
        )


        c1, c2, c3 = st.columns(3)


        c1.metric(
            "Shortlisted",
            shortlisted_count
        )


        c2.metric(
            "For Review",
            review_count
        )


        c3.metric(
            "Rejected",
            rejected_count
        )


        # ====================================================
        # SCREENING TABLE
        # ====================================================

        st.write(
            "### 📊 Candidate Screening Matrix"
        )


        # Header
        header = st.columns([
            2.0,
            1.8,
            1.8,
            1.1,
            1.0,
            3.0,
            3.0
        ])


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
            "**File**"
        )

        header[5].markdown(
            "**Matched Skills**"
        )

        header[6].markdown(
            "**Missing / Gaps**"
        )


        st.divider()


        # Candidate rows
        for result in results:

            candidate_name = result.get(
                "candidate_name",
                result.get(
                    "filename",
                    "Unknown Candidate"
                )
            )


            domain_role = result.get(
                "domain_role",
                "N/A"
            )


            verdict = result.get(
                "verdict",
                "REVIEW"
            )


            score = result.get(
                "match_score_pct",
                0
            )


            matched_skills = result.get(
                "matched_skills",
                []
            )


            missing_skills = result.get(
                "missing_skills_gaps",
                []
            )


            # Verdict icon
            if verdict == "SHORTLIST":

                verdict_display = "🟢 SHORTLIST"

            elif verdict == "REVIEW":

                verdict_display = "🟡 REVIEW"

            else:

                verdict_display = "🔴 REJECT"


            cols = st.columns([
                2.0,
                1.8,
                1.8,
                1.1,
                1.0,
                3.0,
                3.0
            ])


            cols[0].write(
                candidate_name
            )


            cols[1].write(
                domain_role
            )


            cols[2].write(
                verdict_display
            )


            cols[3].write(
                f"{score}%"
            )


            cols[4].write(
                result.get(
                    "filename",
                    "N/A"
                )
            )


            cols[5].write(
                ", ".join(
                    matched_skills
                )
                if matched_skills
                else "None identified"
            )


            cols[6].write(
                ", ".join(
                    missing_skills
                )
                if missing_skills
                else "None identified"
            )


        # ====================================================
        # CSV DOWNLOAD
        # ====================================================

        st.divider()

        st.write(
            "### 📥 Export Screening Results"
        )


        csv_buffer = io.StringIO()

        csv_writer = csv.writer(
            csv_buffer
        )


        csv_headers = [
            "Filename",
            "Candidate",
            "Role / Domain",
            "Verdict",
            "Match Score %",
            "Matched Skills",
            "Missing Skills / Gaps",
            "Main Skills Extracted",
            "Evaluation Summary"
        ]


        csv_writer.writerow(
            csv_headers
        )


        for result in results:

            csv_writer.writerow([

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

                ", ".join(
                    result.get(
                        "matched_skills",
                        []
                    )
                ),

                ", ".join(
                    result.get(
                        "missing_skills_gaps",
                        []
                    )
                ),

                ", ".join(
                    result.get(
                        "main_skills_extracted",
                        []
                    )
                ),

                result.get(
                    "evaluation_summary",
                    ""
                )
            ])


        st.download_button(
            label="📥 Download JD Screening Results (CSV)",
            data=csv_buffer.getvalue(),
            file_name="hireproof_jd_screening_results.csv",
            mime="text/csv",
            use_container_width=True
        )


        # ====================================================
        # DETAILED CANDIDATE BREAKDOWN
        # ====================================================

        st.divider()

        st.write(
            "### 🔍 Detailed Candidate Evaluation"
        )


        for result in results:

            candidate_name = result.get(
                "candidate_name",
                result.get(
                    "filename",
                    "Unknown Candidate"
                )
            )


            verdict = result.get(
                "verdict",
                "REVIEW"
            )


            score = result.get(
                "match_score_pct",
                0
            )


            if verdict == "SHORTLIST":

                icon = "🟢"

            elif verdict == "REVIEW":

                icon = "🟡"

            else:

                icon = "🔴"


            with st.expander(
                f"{icon} {candidate_name} — "
                f"{verdict} ({score}%)"
            ):

                col_a, col_b = st.columns(2)


                # --------------------------------------------
                # Candidate information
                # --------------------------------------------

                with col_a:

                    st.markdown(
                        "#### Candidate Information"
                    )


                    st.markdown(
                        f"**Resume File:** "
                        f"{result.get('filename', 'N/A')}"
                    )


                    st.markdown(
                        f"**Candidate:** "
                        f"{candidate_name}"
                    )


                    st.markdown(
                        f"**Primary Role / Domain:** "
                        f"{result.get('domain_role', 'N/A')}"
                    )


                    st.markdown(
                        f"**Verdict:** "
                        f"`{verdict}`"
                    )


                    st.markdown(
                        f"**Match Score:** "
                        f"`{score}%`"
                    )


                    st.markdown(
                        "#### Evaluation Summary"
                    )


                    st.write(
                        result.get(
                            "evaluation_summary",
                            "No evaluation summary available."
                        )
                    )


                    st.markdown(
                        "#### Main Skills Extracted"
                    )


                    main_skills = result.get(
                        "main_skills_extracted",
                        []
                    )


                    if main_skills:

                        for skill in main_skills:

                            st.write(
                                f"• {skill}"
                            )

                    else:

                        st.write(
                            "No main skills identified."
                        )


                # --------------------------------------------
                # JD alignment
                # --------------------------------------------

                with col_b:

                    st.markdown(
                        "#### JD Alignment"
                    )


                    st.markdown(
                        "##### ✅ Matched Skills"
                    )


                    matched_skills = result.get(
                        "matched_skills",
                        []
                    )


                    if matched_skills:

                        for skill in matched_skills:

                            st.write(
                                f"• {skill}"
                            )

                    else:

                        st.write(
                            "No direct skill matches identified."
                        )


                    st.markdown(
                        "##### ⚠️ Missing Skills / Gaps"
                    )


                    missing_skills = result.get(
                        "missing_skills_gaps",
                        []
                    )


                    if missing_skills:

                        for skill in missing_skills:

                            st.write(
                                f"• {skill}"
                            )

                    else:

                        st.write(
                            "No major gaps identified."
                        )


                # --------------------------------------------
                # Bias Shield
                # --------------------------------------------

                st.divider()


                st.markdown(
                    "#### 🛡️ Bias Shield / Redaction Log"
                )


                redaction_log = result.get(
                    "redaction_log",
                    []
                )


                if redaction_log:

                    for item in redaction_log:

                        st.write(
                            f"• **{item.get('category', 'Unknown')}** — "
                            f"{item.get('redacted_count', 0)} item(s) "
                            f"redacted — "
                            f"{item.get('reason', '')}"
                        )

                else:

                    st.write(
                        "No PII/contact/year information "
                        "was detected for redaction."
                    )


                # --------------------------------------------
                # Sanitized Resume
                # --------------------------------------------

                with st.expander(
                    "View Sanitized Resume Text"
                ):

                    st.text(
                        result.get(
                            "sanitized_text",
                            "No sanitized text available."
                        )
                    )


                # --------------------------------------------
                # Raw PDF Text
                # --------------------------------------------

                with st.expander(
                    "View Raw Extracted PDF Text"
                ):

                    st.text(
                        result.get(
                            "raw_text",
                            "No raw text available."
                        )
                    )


# ============================================================
# TAB 2: DEEP AUDIT AGAINST JOB DESCRIPTION
# ============================================================

with tab_audit:

    st.subheader(
        "2. Deep Match an Uploaded Candidate Against a Job Description"
    )


    # --------------------------------------------------------
    # Make sure candidates exist
    # --------------------------------------------------------

    if (
        "evaluation_results" in st.session_state
        and st.session_state["evaluation_results"]
    ):

        results = st.session_state[
            "evaluation_results"
        ]


        # ----------------------------------------------------
        # Candidate selection
        # ----------------------------------------------------

        candidate_options = {}

        for result in results:

            filename = result.get(
                "filename",
                "Unknown File"
            )

            candidate_options[
                filename
            ] = result


        chosen_filename = st.selectbox(
            "Select a screened candidate:",
            list(candidate_options.keys()),
            key="audit_candidate"
        )


        selected_candidate = candidate_options[
            chosen_filename
        ]


        # ----------------------------------------------------
        # JD selection
        # ----------------------------------------------------

        audit_jd_options = [
            "📝 Custom / Use Current Bulk JD"
        ] + list(
            JOB_DESCRIPTIONS.keys()
        )


        audit_jd_choice = st.selectbox(
            "Select Target Job Description:",
            audit_jd_options,
            key="audit_jd_choice"
        )


        if (
            audit_jd_choice
            == "📝 Custom / Use Current Bulk JD"
        ):

            default_audit_jd = st.session_state.get(
                "bulk_screening_jd",
                ""
            )


            audit_jd_text = st.text_area(
                "Job Description:",
                value=default_audit_jd,
                height=220,
                key="audit_custom_jd"
            )

        else:

            audit_jd_text = st.text_area(
                "Job Description Requirements:",
                value=JOB_DESCRIPTIONS[
                    audit_jd_choice
                ],
                height=220,
                key="audit_template_jd"
            )


        # ----------------------------------------------------
        # Display JD + Resume
        # ----------------------------------------------------

        col1, col2 = st.columns(2)


        with col1:

            st.text_area(
                "Job Description Requirements",
                value=audit_jd_text,
                height=240,
                key="audit_jd_display"
            )


        with col2:

            st.text_area(
                f"Extracted Text from {chosen_filename}",
                value=selected_candidate.get(
                    "raw_text",
                    ""
                ),
                height=240,
                key="audit_resume_display"
            )


        # ====================================================
        # RUN DEEP COMPLIANCE AUDIT
        # ====================================================

        if st.button(
            "🔎 Run Deep Compliance Audit",
            type="primary",
            use_container_width=True,
            key="deep_audit_button"
        ):

            if not audit_jd_text.strip():

                st.error(
                    "Please provide a Job Description "
                    "before running the audit."
                )

            else:

                with st.spinner(
                    "Auditing against JD with "
                    "verified evidence citations..."
                ):

                    try:

                        report, sanitized, redaction_log = evaluate_fit(
                            selected_candidate.get(
                                "raw_text",
                                ""
                            ),
                            audit_jd_text
                        )


                        # ----------------------------------------
                        # Save report
                        # ----------------------------------------

                        st.session_state[
                            "single_pdf_report"
                        ] = report


                        st.session_state[
                            "single_pdf_sanitized"
                        ] = sanitized


                        st.session_state[
                            "single_pdf_redaction_log"
                        ] = redaction_log


                        st.session_state[
                            "single_pdf_candidate"
                        ] = chosen_filename


                    except Exception as error:

                        st.error(
                            f"Deep audit failed: {error}"
                        )


        # ====================================================
        # DISPLAY DEEP AUDIT REPORT
        # ====================================================

        if "single_pdf_report" in st.session_state:

            rep = st.session_state[
                "single_pdf_report"
            ]


            sanitized = st.session_state.get(
                "single_pdf_sanitized",
                ""
            )


            redaction_log = st.session_state.get(
                "single_pdf_redaction_log",
                []
            )


            # ------------------------------------------------
            # Overall result
            # ------------------------------------------------

            status = rep.get(
                "overall_fit_status",
                "REVIEW"
            )


            st.divider()


            st.markdown(
                f"### Audit Result: `{status}`"
            )


            st.info(
                f"**Executive Summary:** "
                f"{rep.get('candidate_summary', '')}"
            )


            # ------------------------------------------------
            # Bias Shield
            # ------------------------------------------------

            with st.expander(
                "🛡️ Protected-Attribute Bias Shield Log"
            ):

                if redaction_log:

                    for item in redaction_log:

                        st.write(
                            f"- **{item.get('category', 'Unknown')}**: "
                            f"Stripped "
                            f"{item.get('redacted_count', 0)} item(s) "
                            f"— Reason: "
                            f"{item.get('reason', '')}"
                        )

                else:

                    st.write(
                        "No sensitive contact or "
                        "graduation proxies detected."
                    )


            # ------------------------------------------------
            # Requirement-Level Audit
            # ------------------------------------------------

            st.subheader(
                "📋 Requirement-Level Audit"
            )


            requirements = rep.get(
                "requirements",
                []
            )


            if requirements:

                for req in requirements:

                    req_id = req.get(
                        "requirement_id",
                        "REQ"
                    )


                    req_text = req.get(
                        "requirement_text",
                        ""
                    )


                    req_status = req.get(
                        "status",
                        "UNMET"
                    )


                    with st.expander(
                        f"{req_id}: "
                        f"{req_text} "
                        f"— [{req_status}]"
                    ):

                        st.markdown(
                            f"**Status:** "
                            f"`{req_status}`"
                        )


                        st.markdown(
                            "**Verbatim Quote:** "
                            f"*\"{req.get('verbatim_quote', 'None')}\"*"
                        )


                        # ------------------------------------
                        # Citation verification
                        # ------------------------------------

                        if req.get(
                            "citation_verified",
                            False
                        ):

                            st.success(
                                "✅ Citation Verified Against "
                                "Source Resume"
                            )

                        else:

                            st.error(
                                "🚨 Citation Mismatch"
                            )


                        st.markdown(
                            f"**Gap Analysis:** "
                            f"{req.get('gap_reasoning', '')}"
                        )


                        st.markdown(
                            f"**Targeted Question:** "
                            f"{req.get('interview_question', '')}"
                        )


                        st.markdown(
                            f"🟢 **Good Response Signals:** "
                            f"{req.get('eval_rubric_good', '')}"
                        )


                        st.markdown(
                            f"🔴 **Red Flags / Bluffing:** "
                            f"{req.get('eval_rubric_poor', '')}"
                        )

            else:

                st.warning(
                    "No requirement-level audit data was returned."
                )


            # =================================================
            # SANITIZED RESUME
            # =================================================

            with st.expander(
                "View Sanitized Resume Used for Audit"
            ):

                st.text(
                    sanitized
                )


            # =================================================
            # AUDIT DEFENSE
            # =================================================

            st.divider()


            st.subheader(
                "⚖️ Audit Defense & Rebuttal Console"
            )


            user_query = st.text_input(
                "Ask an audit question:",
                placeholder=(
                    "Example: Why was this requirement marked PARTIAL?"
                ),
                key="pdf_audit_question"
            )


            if user_query:

                with st.spinner(
                    "Generating auditable justification..."
                ):

                    try:

                        defense = interrogate_decision(
                            rep,
                            sanitized,
                            user_query
                        )


                        st.markdown(
                            "**Defense Officer Statement:**"
                        )


                        st.write(
                            defense
                        )


                    except Exception as error:

                        st.error(
                            f"Could not generate audit defense: "
                            f"{error}"
                        )


    else:

        st.info(
            "Upload and screen PDF resumes in the "
            "Bulk JD Screening tab first."
        )