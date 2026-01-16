from fastapi import APIRouter, Security
from core.deps import get_current_user
from db.audit import log_access

router = APIRouter(tags=["Inventory"])

@router.get("/")
async def inventory(user=Security(get_current_user, scopes=["paid"])):
    await log_access(user["sub"], "inventory_access")
    return {"data": "enterprise inventory"}