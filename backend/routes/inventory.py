from fastapi import APIRouter

router = APIRouter()

INVENTORY = [
    {
        "id": "CAT-320",
        "type": "Excavator",
        "year": 2021,
        "hours": 3100,
        "price": 185000,
        "location": "Texas"
    },
    {
        "id": "JD-650K",
        "type": "Dozer",
        "year": 2020,
        "hours": 2800,
        "price": 210000,
        "location": "Arizona"
    }
]

@router.get("/inventory")
def inventory():
    return INVENTORY
