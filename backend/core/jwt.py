from datetime import datetime, timedelta
from jose import jwt, JWTError
import os

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET not set")

JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET")
if not JWT_REFRESH_SECRET:
    raise RuntimeError("JWT_REFRESH_SECRET not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_EXPIRE_DAYS = 7

def create_access_token(
        *, 
        sub: str, 
        email: str, 
        tier: str, 
        scopes: list[str], 
        expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES,):    
    payload = {
        "sub": sub,
        "email": email,
        "tier": tier,
        "scopes": scopes,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
        }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=REFRESH_EXPIRE_DAYS)
    payload["type"] = "refresh"
    return jwt.encode(payload, JWT_REFRESH_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    return payload


def decode_refresh_token(token: str) -> dict:
    payload = jwt.decode(token, JWT_REFRESH_SECRET, algorithms=[ALGORITHM])
    if payload.get("type") != "refresh":
        raise JWTError("Invalid token type")
    return payload