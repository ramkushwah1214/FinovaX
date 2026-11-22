FROM python:3.11-slim

WORKDIR /app

# Production-safe Python settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    ENVIRONMENT=production

# Install curl for container health check
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML and web framework dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice application source code, pre-trained model artifacts, and evaluation reports
COPY main.py .
COPY app/ ./app/
COPY models/ ./models/
COPY reports/ ./reports/
COPY data/corrections/ ./data/corrections/

# Create unprivileged application user and grant directory permissions
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Container healthcheck testing FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/health || exit 1

# Launch production Uvicorn server with 2 worker processes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

