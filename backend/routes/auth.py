from fastapi import APIRouter
from pydantic import BaseModel
from core.security import create_access_token

router = APIRouter(tags=["Auth"])


# ✅ DEFINE THE MODEL FIRST
class LoginRequest(BaseModel):
    email: str


# ✅ THEN USE IT
@router.post("/login")
async def login(request: LoginRequest):
    token = create_access_token(
        {
            "sub": request.email,
            "role": "demo",
            "nda": True,  # flip to False to test NDA blocking
        }
    )
    return {
        "access_token": token,
        "token_type": "bearer",
    }
