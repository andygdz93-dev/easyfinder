from fastapi import APIRouter, Depends
from core.deps import require_scope

router = APIRouter(
    tags=["Inventory"]
)

@router.get("/", summary="Paid inventory access")
def get_inventory(user: dict = Depends(require_scope("inventory"))):
    return [
        {"item": "Excavator", "price": "$120,000"},
        {"item": "Bulldozer", "price": "$95,000"},
    ]
