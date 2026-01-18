from fastapi import APIRouter, Depends
from fastapi.responses import Response
from core.deps import require_scope
from services.csv_export import generate_inventory_csv
from repositories.inventory import get_inventory_items  # whatever you already have
from repositories.audit import log_event

router = APIRouter(tags=["Inventory"])

@router.get("/")
def get_inventory(user=Depends(require_scope("inventory"))):
    return {"items": []}


@router.get("/export")
def export_inventory(user=Depends(require_scope("export"))):
    csv = generate_csv()  # your existing logic
    return Response(
        csv,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=inventory.csv"
        }
    )
