from fastapi import APIRouter, Depends
from deps import get_current_user
from auth.models import User

router = APIRouter()

INVENTORY = [
    {"id": "EX-001", "type": "Excavator", "brand": "CAT", "price": 185000, "tier": "nda"},
    {"id": "BD-002", "type": "Bulldozer", "brand": "Komatsu", "price": 220000, "tier": "paid"},
    {"id": "SK-003", "type": "Skid Steer", "brand": "Bobcat", "price": 65000, "tier": "demo"},
]

@router.get("/")
def get_inventory(user: User = Depends(get_current_user)):
    if user.tier == "demo":
        return [i for i in INVENTORY if i["tier"] == "demo"]

    if user.tier == "nda":
        return [i for i in INVENTORY if i["tier"] in ["demo", "nda"]]

    return INVENTORY
