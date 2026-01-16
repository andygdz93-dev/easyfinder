from fastapi import APIRouter, Depends
from core.deps import require_scope

router = APIRouter(tags=["Inventory"])

@router.get("/")
def get_inventory(user=Depends(require_scope("inventory"))):
    return {"items": []}

