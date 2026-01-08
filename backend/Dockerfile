# -------------------------
# Base image
# -------------------------
FROM python:3.12-slim

# -------------------------
# Set workdir
# -------------------------
WORKDIR /app

# -------------------------
# Install system dependencies
# -------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential curl git && \
    rm -rf /var/lib/apt/lists/*

# -------------------------
# Copy requirements and install
# -------------------------
COPY requirements.txt .

# Upgrade pip first to avoid compatibility issues
RUN pip install --upgrade pip setuptools wheel

RUN pip install --no-cache-dir -r requirements.txt

# -------------------------
# Copy application code
# -------------------------
COPY . .

# -------------------------
# Expose port
# -------------------------
EXPOSE 8080

# -------------------------
# Entrypoint
# -------------------------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--reload"]
