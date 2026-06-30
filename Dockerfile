FROM python:3.11-slim

WORKDIR /app

# Install Node.js for yt-dlp JS evaluation (bot bypass)
RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# Copy dependencies and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY backend/ .

# Run uvicorn on the port provided by the environment (Railway)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
