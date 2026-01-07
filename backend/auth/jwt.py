from datetime import datetime, timedelta, timezone
from typing import Dict, Any

import os
from jose import jwt, JWTError, ExpiredSignatureError

# -------------------------------------------------
# CONFIG
# -------------------------------------------------

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PROD")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# -------------------------------------------------
# TOKEN CREATION
# -------------------------------------------------

def create_token(data: Dict[str, Any]) -> str:
    if SECRET_KEY == "CHANGE_THIS_IN_PROD":
        raise RuntimeError("SECRET_KEY must be set in production")

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# -------------------------------------------------
# TOKEN DECODING
# -------------------------------------------------

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        return payload

    except ExpiredSignatureError:
        raise ValueError("Token has expired")

    except JWTError:
        raise ValueError("Invalid token")
