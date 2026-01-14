from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from core.jwt import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr


@router.post("/login")
async def login(request: LoginRequest):
    token = create_access_token(
        {
            "sub": request.email,
            "role": "demo",
            "nda": True,
        }
    )
    return {"access_token": token, "token_type": "bearer"}
