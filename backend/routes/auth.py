from typing import Union
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from core.deps import get_current_user
from core.jwt import create_access_token

router = APIRouter(tags=["Auth"])


@router.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    token = create_access_token({
        "sub": form.username,
        "tier": "demo",
        "nda": True,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me")
def me(current_user: Union[dict, None] = Depends(get_current_user)):
    return current_user
