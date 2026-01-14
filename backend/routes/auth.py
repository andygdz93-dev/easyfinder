from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import EmailStr
from core.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email: EmailStr = form_data.username

    # DEMO LOGIN (no password check yet)
    token = create_access_token(
        {
            "sub": email,
            "tier": "demo",   # demo | nda | paid
            "nda": False
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
