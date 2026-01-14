from fastapi import APIRouter, Depends, HTTPException, status
from core.deps import get_current_user, require_nda

router = APIRouter(
    prefix="/api/inventory",
    tags=["inventory"]
)


@router.get("/")
def get_inventory(user: dict = Depends(require_nda)):
    """
    Inventory endpoint.
    Requires:
    - Valid JWT
    - NDA signed
    """
    tier = user.get("tier", "demo")

    if tier == "demo":
        # Demo users see limited data
        return [
            {"item": "Excavator", "price": "Contact sales"},
        ]

    # Paid / NDA users
    return [
        {"item": "Excavator", "price": "$120,000"},
        {"item": "Bulldozer", "price": "$95,000"},
    ]
