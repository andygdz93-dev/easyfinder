from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from core.security import create_access_token

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr

@router.post("/login")
async def login(request: LoginRequest):
    token = create_access_token({
        "sub": request.email,
        "role": "demo",
        "nda": True
    })
    return {"access_token": token}
