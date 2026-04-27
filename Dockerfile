FROM python:3.11-slim

# Set up a new user 'user' with UID 1000
RUN useradd -m -u 1000 user
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install as root (to place them in system dirs)
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Switch to the non-root user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Copy the rest of the files and ensure the 'user' owns them
COPY --chown=user . .

# Initialize the SQLite database
# Since we are now 'user', we have permission to write to /app
RUN python -c "from main import init_db; init_db()" 2>/dev/null || true

# Hugging Face Spaces port
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]