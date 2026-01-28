import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from mangum import Mangum

# Remove: from dotenv import load_dotenv
# Remove: load_dotenv()

app = FastAPI()

# Add CORS middleware
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

@app.get("/")
def root():
    return {"message": "Healthcare API is running on Lambda"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/consultation")
def consultation_summary(visit: Visit):
    # Get API key from environment (set in serverless.yml)
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    user_prompt = user_prompt_for(visit)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]
    
    # Non-streaming response for Lambda
    response = client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=messages,
        temperature=0.7,
    )
    
    return {"content": response.choices[0].message.content}

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

# load_dotenv()

# app = FastAPI()

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
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
#     # Initialize OpenAI client
#     client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
#     user_prompt = user_prompt_for(visit)
#     messages = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": user_prompt},
#     ]
    
#     # Note: Lambda streaming is tricky, so we'll use non-streaming for simplicity
#     response = client.chat.completions.create(
#         model="gpt-4-turbo-preview",
#         messages=messages,
#         temperature=0.7,
#     )
    
#     # Return complete response
#     return {"content": response.choices[0].message.content}

# # This is the Lambda handler
# handler = Mangum(app, lifespan="off")

# # Add this at the bottom for local testing
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)