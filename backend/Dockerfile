# Backend Dockerfile for AI Novel Generator
# Optimized for Docker layer caching

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies first (rarely changes, cached layer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data (cached layer)
RUN python -c "import nltk; nltk.download('punkt_tab', quiet=True); nltk.download('punkt', quiet=True)"

# Copy application code (changes frequently, last layer)
COPY backend/ ./backend/
COPY config.example.json .

# Create data directory
RUN mkdir -p /app/data

# Expose port (default 8000, overridden by APP_PORT env var at runtime)
EXPOSE 8000

# Health check (uses the port from APP_PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${APP_PORT:-8000}/api/health || exit 1

# Start the FastAPI server
# Port is read from APP_PORT environment variable (default 8000)
CMD uvicorn backend.main:app --host ${APP_HOST:-0.0.0.0} --port ${APP_PORT:-8000}
