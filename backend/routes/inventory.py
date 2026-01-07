from fastapi import APIRouter, Depends
from backend.deps import require_nda

router = APIRouter()

INVENTORY = [
    {
        "id": "EX-2024-001",
        "type": "Excavator",
        "brand": "Caterpillar",
        "price": 185000
    }
]

@router.get("/")
def get_inventory(user=Depends(require_nda)):
    return INVENTORY
