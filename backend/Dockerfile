# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (if needed)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Fly.io
ENV PORT=8080
EXPOSE 8080

# Run Uvicorn in foreground (long-running process)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
