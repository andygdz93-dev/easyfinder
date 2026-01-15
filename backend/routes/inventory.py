from fastapi import APIRouter, Depends
from core.deps import require_paid, require_nda

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("")
def get_inventory(
    user=Depends(require_paid),
    _=Depends(require_nda)
):
    return [
        {"item": "Excavator", "price": "$120,000"},
        {"item": "Bulldozer", "price": "$95,000"},
    ]
