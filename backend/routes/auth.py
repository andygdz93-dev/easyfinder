from fastapi import APIRouter, Depends, Response, Cookie, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from auth.repository import get_user_by_email
from core.deps import get_current_user
from core.jwt import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)

router = APIRouter(tags=["Auth"])

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # TEMP: accept any user for now
    email = form_data.username

    tier = "demo"
    scopes = ["demo"]

    access_token = create_access_token(
        sub=email,
        email=email,
        tier=tier,
        scopes=scopes,
    )

    refresh_token = create_refresh_token(
        {"sub": email}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }

@router.post("/refresh")
def refresh(user=Depends(get_current_user)):
    tier = user["tier"]
    scopes = ["inventory", "paid"] if tier == "paid" else ["demo"]

    token = create_access_token({
        "sub": user["sub"],
        "email": user["email"],
        "tier": tier,
        "scopes": scopes,
    })

    return {"access_token": token, "token_type": "bearer"}
