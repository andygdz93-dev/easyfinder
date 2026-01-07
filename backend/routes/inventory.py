from fastapi import APIRouter, Depends
from deps import require_nda

router = APIRouter()

INVENTORY = [
    {
        "id": "excavator-001",
        "type": "Excavator",
        "brand": "CAT",
        "hours": 3120,
        "status": "Available"
    },
    {
        "id": "loader-002",
        "type": "Wheel Loader",
        "brand": "Komatsu",
        "hours": 4210,
        "status": "Leased"
    }
]

@router.get("/")
def get_inventory(_=Depends(require_nda)):
    return INVENTORY
