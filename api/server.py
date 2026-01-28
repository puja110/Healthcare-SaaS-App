import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware (allows frontend to call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.post("/api/consultation")
def consultation_summary(visit: Visit):
    # Initialize OpenAI client
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    user_prompt = user_prompt_for(visit)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    stream = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages,
        stream=True,
        temperature=0.7,
    )
    
    def event_stream():
        for chunk in stream:
            if chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                lines = text.split("\n")
                for line in lines[:-1]:
                    yield f"data: {line}\n\n"
                    yield "data:  \n\n"
                if lines[-1]:
                    yield f"data: {lines[-1]}\n\n"
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/health")
def health_check():
    """Health check endpoint for AWS App Runner"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    """Root endpoint"""
    static_path = Path("static")
    if static_path.exists():
        return FileResponse(static_path / "index.html")
    return {"message": "Healthcare API is running"}

# Serve static files (our Next.js export) - MUST BE LAST!
static_path = Path("static")
if static_path.exists():
    app.mount("/", StaticFiles(directory="static", html=True), name="static")



# import os
# from pathlib import Path
# from fastapi import FastAPI, Depends
# from fastapi.responses import StreamingResponse, FileResponse
# from fastapi.staticfiles import StaticFiles
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
# from openai import OpenAI

# app = FastAPI()

# # Add CORS middleware (allows frontend to call backend)
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Clerk authentication setup
# clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
# clerk_guard = ClerkHTTPBearer(clerk_config)

# class Visit(BaseModel):
#     patient_name: str
#     date_of_visit: str
#     notes: str

# system_prompt = """
# You are provided with notes written by a doctor from a patient's visit.
# Your job is to summarize the visit for the doctor and provide an email.
# Reply with exactly three sections with the headings:
# ### Summary of visit for the doctor's records
# ### Next steps for the doctor
# ### Draft of email to patient in patient-friendly language
# """

# def user_prompt_for(visit: Visit) -> str:
#     return f"""Create the summary, next steps and draft email for:
# Patient Name: {visit.patient_name}
# Date of Visit: {visit.date_of_visit}
# Notes:
# {visit.notes}"""

# @app.post("/api/consultation")
# def consultation_summary(
#     visit: Visit,
#     creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
# ):
#     user_id = creds.decoded["sub"]
#     client = OpenAI()
    
#     user_prompt = user_prompt_for(visit)
#     prompt = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_prompt},
#     ]
    
#     stream = client.chat.completions.create(
#         model="gpt-5-nano",
#         messages=prompt,
#         stream=True,
#     )
    
#     def event_stream():
#         for chunk in stream:
#             text = chunk.choices[0].delta.content
#             if text:
#                 lines = text.split("\n")
#                 for line in lines[:-1]:
#                     yield f"data: {line}\n\n"
#                     yield "data:  \n"
#                 yield f"data: {lines[-1]}\n\n"
    
#     return StreamingResponse(event_stream(), media_type="text/event-stream")

# @app.get("/health")
# def health_check():
#     """Health check endpoint for AWS App Runner"""
#     return {"status": "healthy"}

# # Serve static files (our Next.js export) - MUST BE LAST!
# static_path = Path("static")
# if static_path.exists():
#     # Serve index.html for the root path
#     @app.get("/")
#     async def serve_root():
#         return FileResponse(static_path / "index.html")
    
#     # Mount static files for all other routes
#     app.mount("/", StaticFiles(directory="static", html=True), name="static")