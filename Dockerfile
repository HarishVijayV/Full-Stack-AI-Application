FROM python:3.11-slim

WORKDIR /app

# System deps for chromadb + sentence-transformers
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements from the backend folder
COPY ./backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your pre-built model, DB, and docs from the backend folder
COPY ./backend/nutriguard_embedding_model ./nutriguard_embedding_model
COPY ./backend/chroma_db ./chroma_db
COPY ./backend/medical_docs ./medical_docs

# Copy the rest of the backend source code (main.py, agents.py, etc.)
COPY ./backend/ .

# Initialize the SQLite database
# (Ensure main.py is now in the /app root inside the container)
RUN python -c "from main import init_db; init_db()" 2>/dev/null || true

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Run uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]