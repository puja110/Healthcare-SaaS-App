import requests
import os
from dotenv import load_dotenv

# Load environment variables from root .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

def test_voice_consultation():
    """Test voice consultation endpoint"""
    
    url = "http://localhost:8000/api/consultation/voice"
    
    audio_file_path = "test_audio.webm"
    
    if not os.path.exists(audio_file_path):
        print("ERROR: Create a test audio file first")
        print(f"Expected path: {audio_file_path}")
        print("\nTo create a test audio:")
        print("1. Open browser console")
        print("2. Record audio using MediaRecorder API")
        print("3. Save as test_audio.webm")
        return
    
    with open(audio_file_path, 'rb') as audio_file:
        files = {
            'audio': ('test_audio.webm', audio_file, 'audio/webm')
        }
        
        data = {
            'organization_id': 'demo_org',
            'mode': 'auto'
        }
        
        print("Sending voice consultation request...")
        print(f"File: {audio_file_path}")
        print(f"Size: {os.path.getsize(audio_file_path)} bytes")
        
        response = requests.post(url, files=files, data=data)
    
    print(f"\nStatus Code: {response.status_code}")
    result = response.json()
    
    if response.status_code == 200:
        print("\n" + "=" * 60)
        print("SUCCESS")
        print("=" * 60)
        print(f"Transcription: {result.get('transcription')}")
        print(f"Response: {result.get('response')}")
        print(f"Mode used: {result.get('mode_used')}")
        print(f"Conversation ID: {result.get('conversation_id')}")
    else:
        print("\n" + "=" * 60)
        print("FAILED")
        print("=" * 60)
        print(f"Error: {result.get('error')}")
        print(f"Details: {result.get('details')}")

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Voice Consultation Feature")
    print("=" * 60)
    print(f"OpenAI API Key configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    print("=" * 60)
    print()
    
    try:
        health = requests.get("http://localhost:8000/health")
        if health.status_code == 200:
            health_data = health.json()
            print("Backend server is running")
            print(f"Whisper loaded: {health_data.get('whisper_loaded')}")
            print(f"OpenAI configured: {health_data.get('openai_key_configured')}")
            print()
            test_voice_consultation()
        else:
            print("Backend server not responding")
    except requests.exceptions.ConnectionError:
        print("ERROR: Backend server not running")
        print("Start with: python api/server.py")