# Use a slim Python 3.12 image
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for pydantic-core / Rust builds
RUN apt-get update && apt-get install -y build-essential curl git && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app
COPY . .

# Expose the port Fly provides
EXPOSE 8080

# Command Fly runs
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
