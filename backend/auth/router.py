from fastapi import APIRouter
from backend.auth.jwt import create_access_token
from backend.core.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth")

@router.post("/login")
def login(email: str):
    # TEMP: replace with DB lookup
    user = {
        "sub": "user_123",
        "email": email,
        "role": "user"
    }

    token = create_access_token(user, ACCESS_TOKEN_EXPIRE_MINUTES)
    return {"access_token": token}

