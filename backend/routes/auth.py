from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "email": user.get("sub"),
        "tier": user.get("tier"),
        "nda": user.get("nda"),
        "scopes": user.get("scopes"),
    }
