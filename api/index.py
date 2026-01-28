import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import traceback
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
Reply with exactly three sections with the headings:
### Summary of visit for the doctor's records
### Next steps for the doctor
### Draft of email to patient in patient-friendly language
"""


def user_prompt_for(visit: Visit) -> str:
    return f"""Create the summary, next steps and draft email for:
Patient Name: {visit.patient_name}
Date of Visit: {visit.date_of_visit}
Notes:
{visit.notes}"""


@app.get("/")
async def root():
    return {"message": "Healthcare API is running"}


@app.get("/api")
async def api_health():
    return {"message": "API endpoint ready. Use POST to submit consultation data."}


@app.post("/api")
async def consultation_summary(visit: Visit):
    print(f"Received request for patient: {visit.patient_name}")
    
    # Check if API key is set
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY not set!")
        return {"error": "OpenAI API key not configured"}
    
    print(f"API Key present: {api_key[:7]}...{api_key[-4:]}")
    
    try:
        client = OpenAI(api_key=api_key)
        user_prompt = user_prompt_for(visit)
        
        print("Creating OpenAI stream...")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        stream = client.chat.completions.create(
            # model="gpt-3.5-turbo",
            model="gpt-4-turbo-preview",
            messages=messages,
            stream=True,
            temperature=0.7,
        )

        async def event_stream():
            try:
                print("Starting stream...")
                chunk_count = 0
                for chunk in stream:
                    chunk_count += 1
                    if chunk.choices[0].delta.content:
                        text = chunk.choices[0].delta.content
                        print(f"Chunk {chunk_count}: {text[:50]}...")
                        
                        lines = text.split("\n")
                        for line in lines[:-1]:
                            yield f"data: {line}\n\n"
                            yield "data:  \n\n"
                        if lines[-1]:
                            yield f"data: {lines[-1]}\n\n"
                
                print(f"Stream completed. Total chunks: {chunk_count}")
                
            except Exception as e:
                error_msg = f"Stream error: {str(e)}\n{traceback.format_exc()}"
                print(error_msg)
                yield f"data: Error: {str(e)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )
        
    except Exception as e:
        error_msg = f"Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return {"error": str(e)}, 500