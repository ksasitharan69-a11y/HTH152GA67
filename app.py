import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# 1. Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("Missing GEMINI_API_KEY in .env file!")

# 2. Initialize the Gemini Client
client = genai.Client(api_key=api_key)

def create_interview_test(job_description: str, resume_details: str, identified_gaps: str):
    prompt = f"""
    You are an expert technical interviewer. Create a practical verification test for a candidate.

    Job Description:
    {job_description}

    Candidate Resume Claims:
    {resume_details}

    Missing Skills / Gaps to Check:
    {identified_gaps}

    Return a clean JSON object with these exact keys:
    1. "drill_down_questions": A list of 3 deep, specific questions asking how they implemented their resume claims (to catch fakers).
    2. "broken_code_snippet": A 15-25 line code snippet matching their tech stack that contains 2 intentional production bugs.
    3. "answer_key": The 2 bugs in the snippet and what the candidate should say.
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are an expert technical interviewer. Output valid JSON only.",
            response_mime_type="application/json",
            temperature=0.2
        )
    )

    return json.loads(response.text)

if __name__ == "__main__":
    sample_jd = "Full-Stack Developer: Node.js, Express, MongoDB, and REST APIs."
    sample_resume = "Built an e-commerce backend with Node.js and MongoDB handling 500 users."
    sample_gaps = "No mention of handling database connection errors or duplicate orders."

    print("Generating interview test via Gemini...")
    result = create_interview_test(sample_jd, sample_resume, sample_gaps)
    
    with open("interview_sheet.json", "w") as f:
        json.dump(result, f, indent=2)
        
    print("\nSUCCESS! Test generated. Saved to interview_sheet.json\n")
    print(json.dumps(result, indent=2))