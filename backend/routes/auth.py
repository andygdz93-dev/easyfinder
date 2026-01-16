from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from core.jwt import create_access_token
from core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # DEMO login — no password validation yet
    token = create_access_token({
        "sub": form_data.username,
        "tier": "demo",
        "nda": False,
        "scopes": ["demo"]
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
