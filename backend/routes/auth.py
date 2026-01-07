from fastapi import APIRouter
from pydantic import BaseModel
from auth.jwt import create_access_token
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth")

class LoginRequest(BaseModel):
    email: str

@router.post("/login")
def login(request: LoginRequest):
    # TEMP: replace with MongoDB lookup
    user = {
        "sub": "user_123",
        "email": request.email,
        "tier": "demo"
    }

    token = create_access_token(user, ACCESS_TOKEN_EXPIRE_MINUTES)
    return {"access_token": token}
