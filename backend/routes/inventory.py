from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user

router = APIRouter(tags=["Inventory"])

INVENTORY = [
    {"id": "EX-001", "type": "Excavator", "tier": "nda"},
    {"id": "BD-002", "type": "Bulldozer", "tier": "paid"},
    {"id": "SK-003", "type": "Skid Steer", "tier": "demo"},
]


@router.get("/")
async def get_inventory(user: dict = Depends(get_current_user)):
    tier = user.get("tier", "demo")

    if tier == "demo":
        return [i for i in INVENTORY if i["tier"] == "demo"]

    if tier == "nda":
        return [i for i in INVENTORY if i["tier"] in ("demo", "nda")]

    return INVENTORY
