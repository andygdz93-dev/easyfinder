from fastapi import APIRouter, Depends
from typing import Optional
from core.deps import get_current_user

router = APIRouter(
    prefix="/api/demo",
    tags=["demo"]
)


@router.get("/mode")
def demo_mode(user: Optional[dict] = Depends(get_current_user)):
    """
    Public demo flag.
    If user is authenticated, reflect tier.
    """
    if user:
        return {
            "demo": user.get("tier", "demo") == "demo",
            "tier": user.get("tier", "demo"),
        }

    return {
        "demo": True,
        "tier": "demo",
    }
