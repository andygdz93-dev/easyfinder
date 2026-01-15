from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(tags=["NDA"]
)
@router.post("/upload")
def upload_nda(user: dict = Depends(get_current_user)):
    """
    Mock NDA upload.
    In production:
    - Store file
    - Mark user.nda_signed = True
    """
    return {
        "email": user.get("sub"),
        "nda": "received",
        "status": "pending_review"
    }


@router.get("/status")
def nda_status(user: dict = Depends(get_current_user)):
    """
    Returns NDA status for authenticated user
    """
    return {
        "email": user.get("sub"),
        "nda_signed": user.get("nda", False)
    }
