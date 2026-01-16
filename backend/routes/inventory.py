from fastapi import APIRouter, Security
from core.deps import get_current_user

router = APIRouter(tags=["Inventory"])


@router.get("/")
def list_inventory(
    user=Security(get_current_user, scopes=["paid", "inventory"])
):
    return {"items": ["enterprise_lead_1", "enterprise_lead_2"]}
