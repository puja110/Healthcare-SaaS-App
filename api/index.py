import os
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import traceback
from dotenv import load_dotenv
from typing import Optional
import tempfile
import whisper

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI()

# UPDATED CORS - Allow all localhost ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading Whisper model for voice transcription...")
whisper_model = whisper.load_model("base")
print("Whisper model loaded successfully")

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
async def root():
    return {"message": "Healthcare API is running"}

@app.get("/api")
async def api_health():
    return {"message": "API endpoint ready. Use POST to submit consultation data."}

@app.post("/api")
async def consultation_summary(visit: Visit):
    print(f"Received request for patient: {visit.patient_name}")
    
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
                        # FIX: Encode newlines as \n token so SSE protocol doesn't lose them
                        encoded = text.replace("\n", "\\n")
                        yield f"data: {encoded}\n\n"
                
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
        return {"error": str(e)}

@app.post("/api/consultation/voice")
async def process_voice_consultation(
    audio: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    organization_id: str = Form("demo_org"),
    mode: str = Form("auto")
):
    """Process voice consultation recording"""
    try:
        print(f"\n{'='*60}")
        print(f"Voice consultation request received")
        print(f"Organization: {organization_id}")
        print(f"Audio filename: {audio.filename}")
        print(f"Content type: {audio.content_type}")
        print(f"{'='*60}\n")
        
        # Save uploaded file temporarily
        temp_dir = tempfile.gettempdir()
        temp_audio_path = os.path.join(temp_dir, audio.filename or "recording.webm")
        
        with open(temp_audio_path, "wb") as buffer:
            content = await audio.read()
            buffer.write(content)
        
        print(f"Audio saved to: {temp_audio_path}")
        print(f"File size: {len(content)} bytes")
        
        # Transcribe audio using Whisper
        print("Transcribing audio with Whisper...")
        try:
            result = whisper_model.transcribe(temp_audio_path)
            transcribed_text = result["text"].strip()
            print(f"Transcription successful: {transcribed_text[:100]}...")
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            os.remove(temp_audio_path)
            return {
                "success": False,
                "error": f"Failed to transcribe audio: {str(e)}"
            }
        
        # Clean up temporary file
        os.remove(temp_audio_path)
        
        if not transcribed_text:
            return {
                "success": False,
                "error": "No speech detected in audio"
            }
        
        # Process with consultation service
        ai_response = await process_consultation_text(
            transcribed_text,
            conversation_id,
            organization_id,
            mode
        )
        
        print(f"\n{'='*60}")
        print(f"Voice consultation completed successfully")
        print(f"Transcription length: {len(transcribed_text)} characters")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "transcription": transcribed_text,
            "response": ai_response.get("answer"),
            "sources": ai_response.get("sources", []),
            "mode_used": ai_response.get("mode_used"),
            "conversation_id": ai_response.get("conversation_id"),
            "timestamp": ai_response.get("timestamp")
        }
        
    except Exception as e:
        print(f"Error processing voice consultation: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "error": "Failed to process voice consultation",
            "details": str(e)
        }

async def process_consultation_text(text, conversation_id, organization_id, mode):
    """Process consultation message"""
    from datetime import datetime
    
    return {
        "answer": f"Voice consultation recorded: {text}",
        "sources": [],
        "mode_used": mode,
        "conversation_id": conversation_id or f"conv_{datetime.now().timestamp()}",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "whisper_loaded": True,
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY"))
    }