from fastapi import APIRouter, Depends
from core.deps import require_nda

router = APIRouter(tags=["Inventory"])


@router.get("/")
def get_inventory(user=Depends(require_nda)):
    return [
        {"id": 1, "name": "Excavator X1", "status": "Available"},
        {"id": 2, "name": "Bulldozer B2", "status": "Limited"},
    ]
