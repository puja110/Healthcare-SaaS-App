import os
import sys
from dotenv import load_dotenv
import uvicorn

# Add api directory to Python path
api_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, api_dir)

# Load environment variables from root .env
parent_dir = os.path.dirname(api_dir)
load_dotenv(dotenv_path=os.path.join(parent_dir, '.env'))

if __name__ == "__main__":
    print("=" * 60)
    print("Starting FastAPI Healthcare Server (Local Dev)")
    print("=" * 60)
    print(f"OpenAI API Key configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    print(f"Server URL: http://localhost:8000")
    print("=" * 60)
    print("\nAvailable endpoints:")
    print("  POST http://localhost:8000/api")
    print("  POST http://localhost:8000/api/consultation/voice")
    print("  GET  http://localhost:8000/health")
    print("  GET  http://localhost:8000/")
    print("=" * 60)

    uvicorn.run(
        "lambda_handler:app",  # Use lambda_handler as single source of truth
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

# import os
# import sys
# from pathlib import Path
# from dotenv import load_dotenv
# import uvicorn

# # Add parent directory to Python path
# parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# sys.path.insert(0, parent_dir)

# # Load environment variables from root .env
# load_dotenv(dotenv_path=os.path.join(parent_dir, '.env'))

# if __name__ == "__main__":
#     print("=" * 60)
#     print("Starting FastAPI Healthcare Server")
#     print("=" * 60)
#     print(f"OpenAI API Key configured: {bool(os.getenv('OPENAI_API_KEY'))}")
#     print(f"Environment loaded from: {os.path.join(parent_dir, '.env')}")
#     print(f"Server URL: http://localhost:8000")
#     print("=" * 60)
#     print("\nAvailable endpoints:")
#     print("  POST http://localhost:8000/api")
#     print("  POST http://localhost:8000/api/consultation/voice")
#     print("  GET  http://localhost:8000/health")
#     print("  GET  http://localhost:8000/")
#     print("=" * 60)
#     print("\nStarting uvicorn server...")
#     print("Press CTRL+C to stop the server")
#     print("=" * 60)
#     print()
    
#     # FIXED: Use string instead of app object
#     uvicorn.run(
#         "index:app",  # <-- This is the fix
#         host="0.0.0.0",
#         port=8000,
#         reload=True,
#         log_level="info"
#     )