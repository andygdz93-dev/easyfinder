from fastapi import APIRouter

router = APIRouter(prefix="/demo", tags=["Demo"])

@router.get("/mode")
def demo_mode():
    return {"demo": True}
