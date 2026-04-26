FROM python:3.11-slim

WORKDIR /app

# System deps for chromadb + sentence-transformers
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your pre-built model and DB — no GPU needed at runtime
COPY ./nutriguard_embedding_model ./nutriguard_embedding_model
COPY ./chroma_db ./chroma_db
COPY ./medical_docs ./medical_docs

COPY . .

# Initialize the SQLite database
RUN python -c "from main import init_db; init_db()" 2>/dev/null || true

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Update CMD to use port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]