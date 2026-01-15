import os
from datetime import datetime, timedelta
from jose import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(
    *,
    sub: str,
    tier: str,
    nda: bool,
    expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES
):
    scopes = {
        "demo": ["demo:read"],
        "paid": ["inventory:read", "billing:manage"],
    }.get(tier, [])

    payload = {
        "sub": sub,
        "tier": tier,
        "nda": nda,
        "scopes": scopes,
        "exp": datetime.utcnow() + timedelta(minutes=expires_minutes),
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
