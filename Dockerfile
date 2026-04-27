FROM python:3.11-slim

WORKDIR /app

# System deps for chromadb + sentence-transformers
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend (Note: your screenshot shows 'requirements' as a Text Document)
# If the file is just named 'requirements' without .txt, this will fix it:
COPY ./backend/requirements* .
RUN pip install --no-cache-dir -r requirements || pip install --no-cache-dir -r requirements.txt

# Copy your data folders from backend
COPY ./backend/nutriguard_embedding_model ./nutriguard_embedding_model
COPY ./backend/chroma_db ./chroma_db
COPY ./backend/medical_docs ./medical_docs

# Copy the actual Python files
COPY ./backend/main.py .
COPY ./backend/agents.py .
COPY ./backend/rag.py .
COPY ./backend/nutriguard ./nutriguard

# Initialize the SQLite database
RUN python -c "from main import init_db; init_db()" 2>/dev/null || true

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Update CMD to use port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]