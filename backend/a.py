import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

print("\n=== Available Gemini Models ===\n")
for model in client.models.list():
    name = model.name
    methods = getattr(model, 'supported_actions', None) or getattr(model, 'supported_generation_methods', [])
    print(f"Model: {name}")
    print(f"  Methods: {methods}")
    print()