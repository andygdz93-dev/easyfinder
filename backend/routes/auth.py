from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from core.jwt import create_access_token
from core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    token = create_access_token({
        "sub": form_data.username,
        "tier": "demo",
        "scopes": ["demo"],
    })

    return {
        "access_token": token,
        "token_type": "bearer",
    }

@router.post("/refresh")
def refresh(user=Depends(get_current_user)):
    new_token = create_access_token({
        "sub": user["sub"],
        "tier": user.get("tier"),
        "scopes": user.get("scopes", []),
    })

    return {"access_token": new_token}
