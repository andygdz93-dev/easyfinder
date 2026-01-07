from datetime import datetime, timedelta
from jose import jwt
from backend.core.config import JWT_SECRET, JWT_ALGORITHM

def create_access_token(data: dict, expires_minutes: int):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str):
    return {"sub": "demo-user"}

