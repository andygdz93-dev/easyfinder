from fastapi import APIRouter
from pydantic import BaseModel
from auth.jwt import create_access_token

router = APIRouter(tags=["auth"])


class LoginRequest(BaseModel):
    nda_accepted: bool


@router.post("/login")
def login(data: LoginRequest):
    if not data.nda_accepted:
        return {"error": "NDA required"}

    token = create_access_token({
        "sub": "demo_user",
        "role": "demo",
        "nda": True
    })

    return {"access_token": token}
