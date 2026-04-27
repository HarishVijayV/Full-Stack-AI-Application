FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# 1. Copy everything from the backend folder into the container root
# This makes the container look exactly like your manual upload did!
COPY ./backend/ .

# 2. Install requirements
# Since we copied everything to '.', requirements is now in the current dir
RUN pip install --no-cache-dir -r requirements || pip install --no-cache-dir -r requirements.txt

# 3. Initialize the SQLite database
RUN python -c "from main import init_db; init_db()" 2>/dev/null || true

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]