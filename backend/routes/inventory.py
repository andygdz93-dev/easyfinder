from fastapi import APIRouter, Depends
from core.deps import require_paid

router = APIRouter(tags=["Inventory"])

@router.get("")
def get_inventory(user=Depends(require_paid)):
    return [...]  # Return inventory items for the paid user

