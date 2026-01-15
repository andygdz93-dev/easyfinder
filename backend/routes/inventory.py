from fastapi import APIRouter, Depends
from core.deps import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/")
def list_inventory(user=Depends(get_current_user)):
    return {
        "status": "paid access",
        "user": user,
        "items": ["item1", "item2"]
    }
