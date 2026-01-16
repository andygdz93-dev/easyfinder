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
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    # 1️⃣ Load user from Mongo (source of truth)
    user_doc = await get_user_by_email(form_data.username)

    tier = user_doc["tier"] if user_doc else "demo"

    scopes = (
        ["paid", "inventory"]
        if tier == "paid"
        else ["demo"]
    )

    # 2️⃣ Build JWT payload from DB truth
    payload = {
        "sub": form_data.username,
        "tier": tier,
        "scopes": scopes,
    }

    # 3️⃣ Issue tokens
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)

    # 4️⃣ Store refresh token securely
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict",
        max_age=60 * 60 * 24 * 7,
    )

    return {
        "access_token": access_token,
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
