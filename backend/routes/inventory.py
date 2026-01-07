from fastapi import APIRouter, Depends
from backend.deps import require_nda

router = APIRouter(prefix="/inventory", tags=["Inventory"])

INVENTORY = [
    {
        "id": "CAT-950GC",
        "type": "Wheel Loader",
        "price": 145000,
        "condition": "Used",
        "location": "TX",
    }
]

@router.get("/", dependencies=[Depends(require_nda)])
def get_inventory():
    return INVENTORY
