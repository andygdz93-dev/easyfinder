from fastapi import APIRouter, Depends, HTTPException
from core.security import get_current_user

router = APIRouter()

@router.get("")
def get_inventory(user=Depends(get_current_user)):
    if not user.get("nda"):
        raise HTTPException(status_code=403, detail="NDA required")

    return [
        {"item": "Excavator", "price": "$120,000"},
        {"item": "Bulldozer", "price": "$95,000"},
    ]
