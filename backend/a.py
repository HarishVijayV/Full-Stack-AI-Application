import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Your actual production fallback list
LLM_MODELS = [
    "gemini-2.5-flash",        # Primary
    "gemini-2.0-flash",        # Fallback 1
    "gemini-2.5-flash-lite",   # Fallback 2
]

def check_model_health():
    client = genai.Client(api_key="AIzaSyBZTSNpMyo7L6p17SBCpWW6SY0i_4Ecjdg")
    print("--- 🩺 NutriGuard API Health Check ---")
    
    for model_name in LLM_MODELS:
        try:
            print(f"Testing {model_name}...", end=" ")
            # Small, low-token request to verify connectivity
            response = client.models.generate_content(
                model=model_name, 
                contents="ping"
            )
            if response.text:
                print("✅ ONLINE")
        except Exception as e:
            # Catching 429 (Rate Limit) or 503 (Overloaded)
            print(f"❌ OFFLINE")
            print(f"   Reason: {str(e)[:100]}...") 

if __name__ == "__main__":
    check_model_health()