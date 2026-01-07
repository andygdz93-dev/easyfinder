from fastapi import APIRouter

router = APIRouter(prefix="/inventory", tags=["Inventory"])

INVENTORY = [
    {
        "id": "CAT-320",
        "name": "CAT 320 Excavator",
        "price": 95000,
        "score": 92
    },
    {
        "id": "JD-850K",
        "name": "John Deere 850K Dozer",
        "price": 120000,
        "score": 88
    }
]

@router.get("/")
def get_inventory():
    return INVENTORY
