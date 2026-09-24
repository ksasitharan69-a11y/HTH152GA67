import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import ServerError

# 1. Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("Missing GEMINI_API_KEY in .env file!")

client = genai.Client(api_key=api_key)

def grade_assessment(interview_sheet_path: str, candidate_answers: dict) -> dict:
    # Read the original test and answer key
    with open(interview_sheet_path, "r") as f:
        sheet = json.load(f)

    prompt = f"""
    You are an impartial technical auditor evaluating a candidate's practical skill confirmation test.

    ### Standardized Test & Answer Key:
    {json.dumps(sheet, indent=2)}

    ### Candidate's Submitted Responses:
    {json.dumps(candidate_answers, indent=2)}

    ### Evaluation Rules:
    1. Score the candidate out of 100 based strictly on technical accuracy.
    2. Check if they identified the primary bugs (try/catch missing and race condition/atomic transactions).
    3. Evaluate if their resume explanations show authentic, first-hand implementation experience or generic surface-level theory.
    4. Provide an HR Audit Justification defensible against bias: state concrete evidence from their response.

    Return a clean JSON object with:
    - "total_score": integer (0 to 100)
    - "verdict": "STRONG HIRE" | "BORDERLINE" | "REJECT"
    - "findings_breakdown":
        - "resume_authenticity": {"score_out_of_30": int, "notes": string}
        - "error_handling_bug": {"score_out_of_35": int, "identified": bool, "notes": string}
        - "concurrency_race_condition": {"score_out_of_35": int, "identified": bool, "notes": string}
    - "audit_justification": string explaining why this decision was made using quoted evidence from their answers.
    """

    config = types.GenerateContentConfig(
        system_instruction="You are an expert HR and technical auditor. Output valid JSON only.",
        response_mime_type="application/json",
        temperature=0.1
    )

    models_to_try = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        except ServerError:
            continue

    raise RuntimeError("Gemini endpoints are temporarily busy. Please retry in a few seconds.")


if __name__ == "__main__":
    # Simulated candidate response to test the pipeline
    sample_candidate_answers = {
        "drill_down_responses": {
            "question_1": "We used an idempotency key passed from the client stored with Redis SETNX with a 10s TTL, and MongoDB unique compound index on orderId.",
            "question_2": "We had Mongoose retry logic configured, but honestly in dev we just restarted the node server manually.",
            "question_3": "We added a compound index on { userId: 1, createdAt: -1 } for the order history queries."
        },
        "code_review_response": "The first issue is that there's no try/catch block around the async database calls, so any DB timeout will crash the Node process. The second bigger issue is that stock deduction and order creation aren't atomic—if two requests hit the endpoint at once, both will read the old stock and cause overselling. You should wrap this in a MongoDB session transaction or use atomic $inc."
    }

    print("Auditing candidate responses against answer key...")
    audit_report = grade_assessment("interview_sheet.json", sample_candidate_answers)

    # Save final report
    with open("candidate_audit_report.json", "w") as f:
        json.dump(audit_report, f, indent=2)

    print("\nSUCCESS! Audit report generated. Saved to candidate_audit_report.json\n")
    print(json.dumps(audit_report, indent=2))