# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for Fly.io
EXPOSE 8080

# Run Uvicorn in foreground (long-running process)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
