import os
import tempfile
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from mangum import Mangum
from dotenv import load_dotenv
from typing import Optional
import traceback

# Load .env for local testing only
if os.path.exists(os.path.join(os.path.dirname(__file__), '..', '.env')):
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",
        "https://healthcare-saas-app-kappa.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str

system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to summarize the visit for the doctor and provide an email.

Reply with exactly three sections using these EXACT headings:

### Summary of visit for the doctor's records

Provide bullet points with the following information:
- Date of Visit: [date]
- Patient Name: [name]
- Chief Complaint: [complaint]
- Assessment/Plan: [assessment and treatment plan]
- Follow-up: [follow-up instructions]
- Additional Notes: [any other relevant notes]

### Next steps for the doctor

Provide 3-5 bullet points with clear, actionable next steps for the doctor:
- [Action item 1]
- [Action item 2]
- [Action item 3]

### Draft of email to patient in patient-friendly language

Subject: [Email subject line]

[Email body with greeting and patient-friendly explanation. Include bullet points where appropriate for instructions or key points.]

IMPORTANT: 
- Use bullet points (•) for the first two sections
- Each bullet point should be on a new line
- For the email section, write naturally with paragraphs and include bullet points for lists of instructions
"""

def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""

@app.get("/")
def root():
    return {"message": "Healthcare API is running on Lambda"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }

@app.get("/api")
def api_health():
    return {"message": "API endpoint ready. Use POST to submit consultation data."}

@app.post("/api")
def consultation_summary(visit: Visit):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"error": "OpenAI API key not configured"}

    try:
        client = OpenAI(api_key=api_key)
        user_prompt = user_prompt_for(visit)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Non-streaming for Lambda (streaming not supported well in Lambda)
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=messages,
            temperature=0.7,
        )

        return {"content": response.choices[0].message.content}

    except Exception as e:
        print(f"Error: {str(e)}\n{traceback.format_exc()}")
        return {"error": str(e)}

@app.post("/api/consultation/voice")
async def process_voice_consultation(
    audio: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    organization_id: str = Form("demo_org"),
    mode: str = Form("auto")
):
    """Process voice consultation - uses OpenAI Whisper API (no local model)"""
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {"success": False, "error": "OpenAI API key not configured"}

        # Save audio to /tmp (Lambda writable directory)
        temp_audio_path = os.path.join('/tmp', audio.filename or "recording.webm")
        content = await audio.read()

        with open(temp_audio_path, "wb") as buffer:
            buffer.write(content)

        # Use OpenAI Whisper API instead of local model (Lambda-friendly)
        client = OpenAI(api_key=api_key)
        with open(temp_audio_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )

        transcribed_text = transcript.text.strip()
        os.remove(temp_audio_path)

        if not transcribed_text:
            return {"success": False, "error": "No speech detected in audio"}

        from datetime import datetime
        return {
            "success": True,
            "transcription": transcribed_text,
            "conversation_id": conversation_id or f"conv_{datetime.now().timestamp()}",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"Voice error: {str(e)}\n{traceback.format_exc()}")
        return {"success": False, "error": str(e)}

# Lambda handler
handler = Mangum(app, lifespan="off")

# import os
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import StreamingResponse
# from pydantic import BaseModel
# from openai import OpenAI
# from mangum import Mangum

# from dotenv import load_dotenv
# # Remove: load_dotenv()

# # Load environment variables from root .env for local testing
# if os.path.exists(os.path.join(os.path.dirname(__file__), '..', '.env')):
#     load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


# app = FastAPI()

# # Add CORS middleware
# # app.add_middleware(
# #     CORSMiddleware,
# #     allow_origins=["*"],
# #     allow_credentials=True,
# #     allow_methods=["*"],
# #     allow_headers=["*"],
# # )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "*",  # Allow all origins for now
#         "https://healthcare-saas-app-kappa.vercel.app",
#         "https://*.vercel.app"
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class Visit(BaseModel):
#     patient_name: str
#     date_of_visit: str
#     notes: str

# system_prompt = """
# You are provided with notes written by a doctor from a patient's visit.
# Your job is to summarize the visit for the doctor and provide an email.

# Reply with exactly three sections using these EXACT headings:

# ### Summary of visit for the doctor's records

# Provide bullet points with the following information:
# - Date of Visit: [date]
# - Patient Name: [name]
# - Chief Complaint: [complaint]
# - Assessment/Plan: [assessment and treatment plan]
# - Follow-up: [follow-up instructions]
# - Additional Notes: [any other relevant notes]

# ### Next steps for the doctor

# Provide 3-5 bullet points with clear, actionable next steps for the doctor:
# - [Action item 1]
# - [Action item 2]
# - [Action item 3]

# ### Draft of email to patient in patient-friendly language

# Subject: [Email subject line]

# [Email body with greeting and patient-friendly explanation. Include bullet points where appropriate for instructions or key points.]

# IMPORTANT: 
# - Use bullet points (•) for the first two sections
# - Each bullet point should be on a new line
# - For the email section, write naturally with paragraphs and include bullet points for lists of instructions
# """

# def user_prompt_for(visit: Visit) -> str:
#     return f"""Create the summary, next steps and draft email for:
# Patient Name: {visit.patient_name}
# Date of Visit: {visit.date_of_visit}
# Notes:
# {visit.notes}"""

# @app.get("/")
# def root():
#     return {"message": "Healthcare API is running on Lambda"}

# @app.get("/health")
# def health_check():
#     return {"status": "healthy"}

# @app.post("/api/consultation")
# def consultation_summary(visit: Visit):
#     # Get API key from environment (set in serverless.yml)
#     client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
#     user_prompt = user_prompt_for(visit)
#     messages = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_prompt},
#     ]
    
#     # Non-streaming response for Lambda
#     response = client.chat.completions.create(
#         model="gpt-4-turbo-preview",
#         messages=messages,
#         temperature=0.7,
#     )
    
#     return {"content": response.choices[0].message.content}

# # Lambda handler
# handler = Mangum(app, lifespan="off")

# # Ensure temp directory exists for audio files
# if not os.path.exists('/tmp'):
#     os.makedirs('/tmp')