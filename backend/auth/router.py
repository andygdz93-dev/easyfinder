from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from auth.jwt import create_token

router = APIRouter(prefix="/auth", tags=["auth"])


# -------------------------------------------------
# MODELS
# -------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# -------------------------------------------------
# ROUTES
# -------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    """
    TEMP login endpoint.
    Replace with real DB lookup later.
    """

    # 🔴 Replace this with DB lookup
    if not request.email:
        raise HTTPException(status_code=400, detail="Invalid email")

    user_claims = {
        "sub": "user_123",
        "email": request.email,
        "role": "user"
    }

    token = create_token(user_claims)

    return {
        "access_token": token,
        "token_type": "bearer"
    }
